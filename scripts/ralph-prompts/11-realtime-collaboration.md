# Ralph Prompt: Real-time Collaboration Module

You are implementing real-time collaboration with WebSocket and Y.js CRDT.

## Context
- Reference: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-REALTIME-COLLABORATION.md`
- WebSocket server using Socket.io
- Y.js CRDT for conflict-free collaborative editing
- Used in: Policy editor, case comments, investigation notes

## Current State
```bash
cd apps/backend && ls -la src/
cd apps/backend && cat package.json | grep -i socket
```

## Requirements

### 1. WebSocket Gateway

```typescript
// apps/backend/src/gateways/collaboration.gateway.ts

@WebSocketGateway({
  namespace: '/collaboration',
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class CollaborationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms: Map<string, Set<string>> = new Map();
  private userSockets: Map<string, Socket> = new Map();

  constructor(
    private authService: AuthService,
    private presenceService: PresenceService,
    private yjsService: YjsService,
  ) {}

  afterInit(server: Server) {
    // Authenticate on connection
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const user = await this.authService.validateToken(token);
        socket.data.user = user;
        socket.data.organizationId = user.organizationId;
        next();
      } catch (err) {
        next(new Error('Unauthorized'));
      }
    });
  }

  async handleConnection(socket: Socket) {
    const userId = socket.data.user.id;
    this.userSockets.set(userId, socket);

    // Update presence
    await this.presenceService.setOnline(userId);
  }

  async handleDisconnect(socket: Socket) {
    const userId = socket.data.user?.id;
    if (userId) {
      this.userSockets.delete(userId);
      await this.presenceService.setOffline(userId);

      // Leave all rooms
      for (const [roomId, users] of this.rooms) {
        if (users.has(userId)) {
          users.delete(userId);
          this.broadcastToRoom(roomId, 'user:left', { userId });
        }
      }
    }
  }

  // Room management
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; entityType: string; entityId: string },
  ) {
    const { roomId, entityType, entityId } = data;
    const user = socket.data.user;
    const orgId = socket.data.organizationId;

    // Validate access to entity
    const hasAccess = await this.validateAccess(orgId, entityType, entityId, user.id);
    if (!hasAccess) {
      return { error: 'Access denied' };
    }

    // Tenant-scoped room name
    const fullRoomId = `org:${orgId}:${roomId}`;

    // Join socket room
    socket.join(fullRoomId);

    // Track room membership
    if (!this.rooms.has(fullRoomId)) {
      this.rooms.set(fullRoomId, new Set());
    }
    this.rooms.get(fullRoomId).add(user.id);

    // Get Y.js document state
    const docState = await this.yjsService.getDocument(fullRoomId);

    // Broadcast user joined
    this.broadcastToRoom(fullRoomId, 'user:joined', {
      userId: user.id,
      userName: user.displayName,
      avatarUrl: user.avatarUrl,
    });

    // Return current room state
    return {
      success: true,
      users: await this.getRoomUsers(fullRoomId),
      docState: docState ? Buffer.from(docState).toString('base64') : null,
    };
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const fullRoomId = `org:${socket.data.organizationId}:${data.roomId}`;
    const userId = socket.data.user.id;

    socket.leave(fullRoomId);
    this.rooms.get(fullRoomId)?.delete(userId);

    this.broadcastToRoom(fullRoomId, 'user:left', { userId });

    return { success: true };
  }

  // Y.js sync
  @SubscribeMessage('yjs:sync')
  async handleYjsSync(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; update: string },
  ) {
    const fullRoomId = `org:${socket.data.organizationId}:${data.roomId}`;

    // Apply update to server document
    const updateBuffer = Buffer.from(data.update, 'base64');
    await this.yjsService.applyUpdate(fullRoomId, updateBuffer);

    // Broadcast to other clients in room
    socket.to(fullRoomId).emit('yjs:update', {
      update: data.update,
      userId: socket.data.user.id,
    });

    return { success: true };
  }

  // Awareness (cursor positions, selections)
  @SubscribeMessage('awareness:update')
  async handleAwarenessUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; state: any },
  ) {
    const fullRoomId = `org:${socket.data.organizationId}:${data.roomId}`;

    socket.to(fullRoomId).emit('awareness:update', {
      userId: socket.data.user.id,
      state: data.state,
    });
  }

  // Comments
  @SubscribeMessage('comment:add')
  async handleAddComment(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: AddCommentDto,
  ) {
    const user = socket.data.user;
    const orgId = socket.data.organizationId;
    const fullRoomId = `org:${orgId}:${data.roomId}`;

    // Save comment to database
    const comment = await this.commentService.create({
      organizationId: orgId,
      entityType: data.entityType,
      entityId: data.entityId,
      content: data.content,
      position: data.position, // { start, end } for inline comments
      parentId: data.parentId, // For replies
      createdById: user.id,
    });

    // Broadcast to room
    this.broadcastToRoom(fullRoomId, 'comment:added', {
      comment,
      user: { id: user.id, name: user.displayName },
    });

    return { success: true, comment };
  }

  @SubscribeMessage('comment:resolve')
  async handleResolveComment(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; commentId: string },
  ) {
    const fullRoomId = `org:${socket.data.organizationId}:${data.roomId}`;

    await this.commentService.resolve(data.commentId, socket.data.user.id);

    this.broadcastToRoom(fullRoomId, 'comment:resolved', {
      commentId: data.commentId,
      resolvedBy: socket.data.user.id,
    });

    return { success: true };
  }

  // Helpers
  private broadcastToRoom(roomId: string, event: string, data: any) {
    this.server.to(roomId).emit(event, data);
  }

  private async getRoomUsers(roomId: string): Promise<RoomUser[]> {
    const userIds = Array.from(this.rooms.get(roomId) || []);
    // Fetch user details...
    return userIds.map(id => ({ userId: id }));
  }

  private async validateAccess(orgId: string, entityType: string, entityId: string, userId: string): Promise<boolean> {
    // Implement access validation based on entity type
    return true; // Simplified
  }
}
```

### 2. Y.js Service

```typescript
// apps/backend/src/services/yjs.service.ts

@Injectable()
export class YjsService {
  private documents: Map<string, Y.Doc> = new Map();

  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  async getDocument(roomId: string): Promise<Uint8Array | null> {
    // Check memory cache
    if (this.documents.has(roomId)) {
      return Y.encodeStateAsUpdate(this.documents.get(roomId));
    }

    // Check Redis
    const cached = await this.redis.get(`yjs:${roomId}`);
    if (cached) {
      const doc = new Y.Doc();
      Y.applyUpdate(doc, Buffer.from(cached, 'base64'));
      this.documents.set(roomId, doc);
      return Y.encodeStateAsUpdate(doc);
    }

    // Check database
    const stored = await this.prisma.collaborationDocument.findUnique({
      where: { roomId },
    });
    if (stored) {
      const doc = new Y.Doc();
      Y.applyUpdate(doc, stored.content);
      this.documents.set(roomId, doc);
      await this.cacheToRedis(roomId, doc);
      return Y.encodeStateAsUpdate(doc);
    }

    // Create new document
    const doc = new Y.Doc();
    this.documents.set(roomId, doc);
    return null;
  }

  async applyUpdate(roomId: string, update: Uint8Array): Promise<void> {
    let doc = this.documents.get(roomId);
    if (!doc) {
      doc = new Y.Doc();
      this.documents.set(roomId, doc);
    }

    Y.applyUpdate(doc, update);

    // Cache to Redis
    await this.cacheToRedis(roomId, doc);

    // Debounced save to database
    this.debouncedSave(roomId, doc);
  }

  private async cacheToRedis(roomId: string, doc: Y.Doc): Promise<void> {
    const state = Y.encodeStateAsUpdate(doc);
    await this.redis.set(
      `yjs:${roomId}`,
      Buffer.from(state).toString('base64'),
      'EX',
      3600, // 1 hour TTL
    );
  }

  private debouncedSave = debounce(async (roomId: string, doc: Y.Doc) => {
    const state = Y.encodeStateAsUpdate(doc);
    await this.prisma.collaborationDocument.upsert({
      where: { roomId },
      create: {
        roomId,
        content: Buffer.from(state),
        updatedAt: new Date(),
      },
      update: {
        content: Buffer.from(state),
        updatedAt: new Date(),
      },
    });
  }, 5000);
}
```

### 3. Presence Service

```typescript
@Injectable()
export class PresenceService {
  constructor(private redis: RedisService) {}

  async setOnline(userId: string): Promise<void> {
    await this.redis.hset('presence', userId, JSON.stringify({
      status: 'online',
      lastSeen: new Date().toISOString(),
    }));
  }

  async setOffline(userId: string): Promise<void> {
    await this.redis.hset('presence', userId, JSON.stringify({
      status: 'offline',
      lastSeen: new Date().toISOString(),
    }));
  }

  async getPresence(userIds: string[]): Promise<Map<string, PresenceState>> {
    const result = new Map();
    for (const userId of userIds) {
      const data = await this.redis.hget('presence', userId);
      result.set(userId, data ? JSON.parse(data) : { status: 'offline' });
    }
    return result;
  }
}
```

### 4. Comment Schema

```prisma
model Comment {
  id                String   @id @default(uuid())
  organizationId    String

  // Target entity
  entityType        String   // 'POLICY', 'CASE', 'INVESTIGATION'
  entityId          String

  // Content
  content           String
  contentHtml       String?  // Rendered HTML with @mentions

  // Position (for inline comments)
  position          Json?    // { start, end, text }

  // Threading
  parentId          String?
  parent            Comment? @relation("CommentThread", fields: [parentId], references: [id])
  replies           Comment[] @relation("CommentThread")

  // Status
  isResolved        Boolean  @default(false)
  resolvedById      String?
  resolvedAt        DateTime?

  // Mentions
  mentions          String[] // User IDs mentioned

  // Audit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdById       String

  @@index([organizationId, entityType, entityId])
  @@index([parentId])
}

model CollaborationDocument {
  id                String   @id @default(uuid())
  roomId            String   @unique

  // Y.js document state
  content           Bytes

  // Metadata
  entityType        String?
  entityId          String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([roomId])
}
```

### 5. Module Configuration

```typescript
// apps/backend/src/modules/collaboration/collaboration.module.ts

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    RedisModule,
  ],
  providers: [
    CollaborationGateway,
    YjsService,
    PresenceService,
    CommentService,
  ],
  exports: [
    YjsService,
    PresenceService,
    CommentService,
  ],
})
export class CollaborationModule {}
```

### 6. Frontend Integration (Reference)

```typescript
// apps/frontend/src/hooks/useCollaboration.ts

export function useCollaboration(entityType: string, entityId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [users, setUsers] = useState<RoomUser[]>([]);

  useEffect(() => {
    const newSocket = io('/collaboration', {
      auth: { token: getAuthToken() },
    });

    const newDoc = new Y.Doc();

    newSocket.on('connect', async () => {
      const { docState, users } = await newSocket.emitWithAck('room:join', {
        roomId: `${entityType}:${entityId}`,
        entityType,
        entityId,
      });

      if (docState) {
        Y.applyUpdate(newDoc, Buffer.from(docState, 'base64'));
      }
      setUsers(users);
    });

    newSocket.on('yjs:update', ({ update }) => {
      Y.applyUpdate(newDoc, Buffer.from(update, 'base64'));
    });

    newSocket.on('user:joined', (user) => {
      setUsers(prev => [...prev, user]);
    });

    newSocket.on('user:left', ({ userId }) => {
      setUsers(prev => prev.filter(u => u.userId !== userId));
    });

    // Sync local changes
    newDoc.on('update', (update) => {
      newSocket.emit('yjs:sync', {
        roomId: `${entityType}:${entityId}`,
        update: Buffer.from(update).toString('base64'),
      });
    });

    setSocket(newSocket);
    setDoc(newDoc);

    return () => {
      newSocket.emit('room:leave', { roomId: `${entityType}:${entityId}` });
      newSocket.disconnect();
      newDoc.destroy();
    };
  }, [entityType, entityId]);

  return { doc, users, socket };
}
```

### 7. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="collaboration|yjs|presence"
cd apps/backend && npm run typecheck
```

## Verification Checklist
- [ ] WebSocket gateway with auth
- [ ] Room management (join/leave)
- [ ] Y.js document sync
- [ ] Awareness updates (cursors)
- [ ] Comment system
- [ ] Presence tracking
- [ ] Redis caching
- [ ] Database persistence
- [ ] Tenant isolation in rooms
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
When real-time collaboration is functional:
<promise>REALTIME COLLABORATION COMPLETE</promise>
