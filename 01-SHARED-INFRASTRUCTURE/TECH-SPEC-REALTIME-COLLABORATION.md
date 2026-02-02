# Technical Specification: Real-time Collaboration

**Version:** 1.0
**Last Updated:** January 2026
**Status:** Draft
**Author:** Architecture Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Y.js CRDT Implementation](#3-yjs-crdt-implementation)
4. [WebSocket Infrastructure](#4-websocket-infrastructure)
5. [ProseMirror Integration](#5-prosemirror-integration)
6. [Presence System](#6-presence-system)
7. [Comments System](#7-comments-system)
8. [Track Changes](#8-track-changes)
9. [Conflict Resolution](#9-conflict-resolution)
10. [Performance Optimization](#10-performance-optimization)
11. [Offline Support](#11-offline-support)
12. [Security](#12-security)
13. [API Specifications](#13-api-specifications)
14. [Implementation Guide](#14-implementation-guide)

---

## 1. Overview

### 1.1 Purpose

This document provides detailed technical specifications for implementing real-time collaborative editing in the Ethico Policy Management Platform. It covers Y.js CRDT integration, WebSocket communication, ProseMirror editor setup, presence indicators, inline comments, and track changes functionality.

### 1.2 Scope

- Real-time collaborative document editing using Y.js CRDTs
- WebSocket server implementation with Socket.io
- ProseMirror rich text editor integration
- User presence and cursor position sharing
- Inline commenting with @mentions
- Track changes / suggestion mode
- Conflict-free offline editing

### 1.3 Key Design Principles

1. **Conflict-Free**: CRDT ensures all edits merge without conflicts
2. **Real-time**: Sub-100ms sync between collaborators
3. **Offline-First**: Full editing capabilities offline
4. **Tenant-Isolated**: Collaboration rooms are tenant-scoped
5. **Auditable**: All changes are tracked and attributable

### 1.4 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| CRDT | Y.js | Conflict-free data synchronization |
| Editor | ProseMirror | Rich text editing framework |
| Binding | y-prosemirror | Y.js to ProseMirror bridge |
| WebSocket | Socket.io | Real-time communication |
| Provider | y-websocket | Y.js WebSocket provider |
| Persistence | y-indexeddb | Local offline storage |
| Backend Store | Redis + PostgreSQL | Document state persistence |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client A                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ ProseMirror │──│ y-prosemirror│──│    Y.Doc    │──│ y-websocket │    │
│  │   Editor    │  │   Binding   │  │   (CRDT)    │  │  Provider   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────┬──────┘    │
│                                                             │           │
│                                           ┌─────────────────┤           │
│                                           │   y-indexeddb   │           │
│                                           │   (Offline)     │           │
│                                           └─────────────────┘           │
└───────────────────────────────────────────────────┬─────────────────────┘
                                                    │
                                                    │ WebSocket
                                                    │
┌───────────────────────────────────────────────────┼─────────────────────┐
│                         WebSocket Server          │                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        Socket.io Server                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │    │
│  │  │   Auth      │  │   Room      │  │  Presence   │              │    │
│  │  │  Middleware │  │  Manager    │  │  Manager    │              │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│  ┌───────────────────────────┼───────────────────────────────────┐     │
│  │              Y.js Server Provider (y-websocket)                │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │     │
│  │  │   Y.Doc     │  │  Awareness  │  │  Persistence │           │     │
│  │  │   Sync      │  │   Updates   │  │   Callback   │           │     │
│  │  └─────────────┘  └─────────────┘  └──────┬──────┘            │     │
│  └───────────────────────────────────────────┼───────────────────┘     │
│                                              │                          │
└──────────────────────────────────────────────┼──────────────────────────┘
                                               │
                 ┌─────────────────────────────┴─────────────────────────┐
                 │                                                       │
        ┌────────▼────────┐                                   ┌──────────▼──────────┐
        │      Redis      │                                   │     PostgreSQL      │
        │  (State Cache)  │                                   │  (Document Store)   │
        └─────────────────┘                                   └─────────────────────┘
```

### 2.2 Data Flow

```
1. User types in ProseMirror editor
           │
           ▼
2. ProseMirror transaction created
           │
           ▼
3. y-prosemirror converts to Y.js operation
           │
           ▼
4. Y.Doc applies operation locally (immediate)
           │
           ├───────────────────────────────────────┐
           ▼                                       ▼
5a. y-indexeddb persists locally          5b. y-websocket sends to server
           │                                       │
           │                                       ▼
           │                              6. Server broadcasts to room
           │                                       │
           │                                       ▼
           │                              7. Other clients receive update
           │                                       │
           │                                       ▼
           │                              8. Y.Doc merges operation (CRDT)
           │                                       │
           │                                       ▼
           │                              9. y-prosemirror updates editor
           │                                       │
           │                                       ▼
           │                              10. User sees change
           │
           ▼
11. Periodic server persistence to PostgreSQL
```

### 2.3 Room Naming Convention

```typescript
// Room names are tenant-scoped for security
function getRoomName(organizationId: string, policyId: string): string {
  return `org:${organizationId}:policy:${policyId}`;
}

// Example: org:abc123:policy:pol456
```

---

## 3. Y.js CRDT Implementation

### 3.1 Document Structure

```typescript
// apps/frontend/src/collaboration/document-schema.ts

import * as Y from 'yjs';

export interface PolicyYDoc {
  // Main document content (rich text)
  content: Y.XmlFragment;

  // Document metadata
  metadata: Y.Map<any>;

  // Comments stored separately
  comments: Y.Array<Comment>;

  // Track changes / suggestions
  suggestions: Y.Array<Suggestion>;

  // Version history snapshots
  snapshots: Y.Array<Snapshot>;
}

export function createPolicyYDoc(): Y.Doc {
  const ydoc = new Y.Doc();

  // Initialize shared types
  ydoc.getXmlFragment('content');
  ydoc.getMap('metadata');
  ydoc.getArray('comments');
  ydoc.getArray('suggestions');
  ydoc.getArray('snapshots');

  return ydoc;
}
```

### 3.2 Y.js Provider Setup

```typescript
// apps/frontend/src/collaboration/collaboration-provider.ts

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

export interface CollaborationConfig {
  organizationId: string;
  policyId: string;
  userId: string;
  userName: string;
  userColor: string;
  wsUrl: string;
  accessToken: string;
}

export class CollaborationProvider {
  private ydoc: Y.Doc;
  private wsProvider: WebsocketProvider | null = null;
  private idbProvider: IndexeddbPersistence | null = null;
  private config: CollaborationConfig;

  constructor(config: CollaborationConfig) {
    this.config = config;
    this.ydoc = createPolicyYDoc();
  }

  async connect(): Promise<void> {
    const roomName = `org:${this.config.organizationId}:policy:${this.config.policyId}`;

    // Setup IndexedDB persistence (offline support)
    this.idbProvider = new IndexeddbPersistence(
      `ethico:${roomName}`,
      this.ydoc
    );

    await this.idbProvider.whenSynced;

    // Setup WebSocket provider
    this.wsProvider = new WebsocketProvider(
      this.config.wsUrl,
      roomName,
      this.ydoc,
      {
        params: {
          token: this.config.accessToken,
        },
        connect: true,
        resyncInterval: 3000, // Resync every 3 seconds
        maxBackoffTime: 10000, // Max reconnect delay
      }
    );

    // Setup awareness (presence)
    this.wsProvider.awareness.setLocalStateField('user', {
      id: this.config.userId,
      name: this.config.userName,
      color: this.config.userColor,
      cursor: null,
    });

    // Handle connection status
    this.wsProvider.on('status', (event: { status: string }) => {
      console.log('WebSocket status:', event.status);
    });

    // Handle sync status
    this.wsProvider.on('sync', (isSynced: boolean) => {
      console.log('Document synced:', isSynced);
    });
  }

  disconnect(): void {
    this.wsProvider?.destroy();
    this.idbProvider?.destroy();
    this.ydoc.destroy();
  }

  getYDoc(): Y.Doc {
    return this.ydoc;
  }

  getContent(): Y.XmlFragment {
    return this.ydoc.getXmlFragment('content');
  }

  getAwareness(): Awareness {
    return this.wsProvider!.awareness;
  }

  isConnected(): boolean {
    return this.wsProvider?.wsconnected ?? false;
  }

  isSynced(): boolean {
    return this.wsProvider?.synced ?? false;
  }
}
```

### 3.3 Y.js Awareness (Presence)

```typescript
// apps/frontend/src/collaboration/awareness-types.ts

export interface AwarenessState {
  user: {
    id: string;
    name: string;
    color: string;
    cursor: CursorPosition | null;
    selection: SelectionRange | null;
  };
}

export interface CursorPosition {
  anchor: number;
  head: number;
}

export interface SelectionRange {
  from: number;
  to: number;
}

// Awareness update handling
export function setupAwarenessListeners(
  awareness: Awareness,
  onUpdate: (states: Map<number, AwarenessState>) => void
): () => void {
  const handler = () => {
    const states = awareness.getStates() as Map<number, AwarenessState>;
    onUpdate(states);
  };

  awareness.on('change', handler);

  return () => {
    awareness.off('change', handler);
  };
}
```

---

## 4. WebSocket Infrastructure

### 4.1 Socket.io Server Setup

```typescript
// apps/backend/src/modules/collaboration/collaboration.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '../auth/jwt.service';
import { AuditService } from '../audit/audit.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  organizationId: string;
  userName: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
  namespace: '/collaboration',
})
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private roomUsers: Map<string, Set<string>> = new Map();

  constructor(
    private jwtService: JwtService,
    private auditService: AuditService,
    private documentService: DocumentService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      // Authenticate via token in query params
      const token = client.handshake.auth.token ||
                    client.handshake.query.token as string;

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verifyAccessToken(token);

      // Attach user info to socket
      client.userId = payload.sub;
      client.organizationId = payload.organizationId;
      client.userName = `${payload.firstName} ${payload.lastName}`;

      console.log(`User ${client.userId} connected to collaboration`);
    } catch (error) {
      console.error('WebSocket auth failed:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    // Remove from all rooms
    for (const [roomName, users] of this.roomUsers.entries()) {
      if (users.has(client.userId)) {
        users.delete(client.userId);

        // Notify room that user left
        this.server.to(roomName).emit('user:left', {
          userId: client.userId,
          timestamp: Date.now(),
        });
      }
    }

    console.log(`User ${client.userId} disconnected`);
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { policyId: string }
  ): Promise<void> {
    // Validate tenant access
    const roomName = `org:${client.organizationId}:policy:${data.policyId}`;

    // Check user has permission to access this policy
    const hasAccess = await this.documentService.checkAccess(
      client.userId,
      client.organizationId,
      data.policyId
    );

    if (!hasAccess) {
      client.emit('error', { message: 'Access denied' });
      return;
    }

    // Join Socket.io room
    await client.join(roomName);

    // Track users in room
    if (!this.roomUsers.has(roomName)) {
      this.roomUsers.set(roomName, new Set());
    }
    this.roomUsers.get(roomName)!.add(client.userId);

    // Notify room that user joined
    this.server.to(roomName).emit('user:joined', {
      userId: client.userId,
      userName: client.userName,
      timestamp: Date.now(),
    });

    // Send current room users to joining client
    const usersInRoom = Array.from(this.roomUsers.get(roomName)!);
    client.emit('room:users', { users: usersInRoom });

    // Audit log
    await this.auditService.log({
      action: 'COLLABORATION_JOIN',
      userId: client.userId,
      organizationId: client.organizationId,
      resourceType: 'policy',
      resourceId: data.policyId,
    });
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { policyId: string }
  ): Promise<void> {
    const roomName = `org:${client.organizationId}:policy:${data.policyId}`;

    await client.leave(roomName);

    this.roomUsers.get(roomName)?.delete(client.userId);

    this.server.to(roomName).emit('user:left', {
      userId: client.userId,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('cursor:update')
  async handleCursorUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { policyId: string; cursor: CursorPosition }
  ): Promise<void> {
    const roomName = `org:${client.organizationId}:policy:${data.policyId}`;

    // Broadcast cursor position to others in room
    client.to(roomName).emit('cursor:moved', {
      userId: client.userId,
      userName: client.userName,
      cursor: data.cursor,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('comment:add')
  async handleAddComment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: AddCommentDto
  ): Promise<void> {
    const roomName = `org:${client.organizationId}:policy:${data.policyId}`;

    // Save comment to database
    const comment = await this.documentService.addComment({
      ...data,
      userId: client.userId,
      organizationId: client.organizationId,
    });

    // Broadcast to room
    this.server.to(roomName).emit('comment:added', comment);
  }

  @SubscribeMessage('comment:resolve')
  async handleResolveComment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { policyId: string; commentId: string }
  ): Promise<void> {
    const roomName = `org:${client.organizationId}:policy:${data.policyId}`;

    await this.documentService.resolveComment(
      data.commentId,
      client.userId,
      client.organizationId
    );

    this.server.to(roomName).emit('comment:resolved', {
      commentId: data.commentId,
      resolvedBy: client.userId,
      timestamp: Date.now(),
    });
  }
}
```

### 4.2 Y.js WebSocket Server

```typescript
// apps/backend/src/modules/collaboration/yjs-server.ts

import { setupWSConnection, WSSharedDoc } from 'y-websocket/bin/utils';
import { Server as HttpServer } from 'http';
import WebSocket from 'ws';
import { JwtService } from '../auth/jwt.service';
import { DocumentPersistence } from './document-persistence';

export class YjsWebSocketServer {
  private wss: WebSocket.Server;

  constructor(
    private httpServer: HttpServer,
    private jwtService: JwtService,
    private persistence: DocumentPersistence
  ) {
    this.wss = new WebSocket.Server({
      server: httpServer,
      path: '/yjs',
    });

    this.setupConnectionHandler();
  }

  private setupConnectionHandler(): void {
    this.wss.on('connection', async (ws: WebSocket, req) => {
      try {
        // Extract token from query string
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        const roomName = url.searchParams.get('room');

        if (!token || !roomName) {
          ws.close(4001, 'Missing authentication');
          return;
        }

        // Verify JWT
        const payload = this.jwtService.verifyAccessToken(token);

        // Validate room access (room format: org:xxx:policy:yyy)
        const roomParts = roomName.split(':');
        if (roomParts[0] !== 'tenant' || roomParts[1] !== payload.organizationId) {
          ws.close(4003, 'Tenant mismatch');
          return;
        }

        // Setup Y.js connection with persistence
        setupWSConnection(
          ws,
          req,
          {
            docName: roomName,
            gc: true,
          }
        );

        // Setup persistence callback
        this.setupPersistence(roomName);

      } catch (error) {
        console.error('Y.js WebSocket error:', error);
        ws.close(4002, 'Authentication failed');
      }
    });
  }

  private setupPersistence(roomName: string): void {
    // Y.js provides hooks for document updates
    // We intercept these to persist to our database

    const doc = getYDoc(roomName);
    if (!doc) return;

    // Debounced persistence (don't save on every keystroke)
    let persistTimeout: NodeJS.Timeout | null = null;

    doc.on('update', (update: Uint8Array, origin: any) => {
      // Clear existing timeout
      if (persistTimeout) {
        clearTimeout(persistTimeout);
      }

      // Persist after 2 seconds of inactivity
      persistTimeout = setTimeout(async () => {
        try {
          await this.persistence.saveDocument(roomName, doc);
        } catch (error) {
          console.error('Failed to persist document:', error);
        }
      }, 2000);
    });
  }
}

// Custom y-websocket persistence callbacks
export const persistence = {
  bindState: async (docName: string, ydoc: WSSharedDoc): Promise<void> => {
    // Load document from database on first connection
    const stored = await documentPersistence.loadDocument(docName);
    if (stored) {
      Y.applyUpdate(ydoc, stored);
    }
  },

  writeState: async (docName: string, ydoc: WSSharedDoc): Promise<void> => {
    // Save document when all connections close
    await documentPersistence.saveDocument(docName, ydoc);
  },
};
```

### 4.3 Document Persistence Service

```typescript
// apps/backend/src/modules/collaboration/document-persistence.ts

import * as Y from 'yjs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DocumentPersistence {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  async loadDocument(roomName: string): Promise<Uint8Array | null> {
    // Try Redis cache first
    const cached = await this.redis.getBuffer(`ydoc:${roomName}`);
    if (cached) {
      return cached;
    }

    // Parse room name: org:xxx:policy:yyy
    const [, organizationId, , policyId] = roomName.split(':');

    // Load from database
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { ydocState: true },
    });

    if (policy?.ydocState) {
      // Cache in Redis
      await this.redis.setBuffer(
        `ydoc:${roomName}`,
        Buffer.from(policy.ydocState),
        3600 // 1 hour TTL
      );

      return new Uint8Array(policy.ydocState);
    }

    return null;
  }

  async saveDocument(roomName: string, ydoc: Y.Doc): Promise<void> {
    const [, organizationId, , policyId] = roomName.split(':');

    // Encode Y.Doc state
    const state = Y.encodeStateAsUpdate(ydoc);

    // Save to Redis (immediate)
    await this.redis.setBuffer(
      `ydoc:${roomName}`,
      Buffer.from(state),
      3600
    );

    // Save to PostgreSQL (durable)
    await this.prisma.policy.update({
      where: { id: policyId },
      data: {
        ydocState: Buffer.from(state),
        updatedAt: new Date(),
      },
    });

    // Extract plain text for search indexing
    const content = this.extractTextContent(ydoc);
    await this.updateSearchIndex(organizationId, policyId, content);
  }

  private extractTextContent(ydoc: Y.Doc): string {
    const fragment = ydoc.getXmlFragment('content');
    return this.xmlFragmentToText(fragment);
  }

  private xmlFragmentToText(fragment: Y.XmlFragment): string {
    let text = '';
    fragment.forEach((item) => {
      if (item instanceof Y.XmlText) {
        text += item.toString();
      } else if (item instanceof Y.XmlElement) {
        text += this.xmlFragmentToText(item);
        if (['p', 'h1', 'h2', 'h3', 'li'].includes(item.nodeName)) {
          text += '\n';
        }
      }
    });
    return text;
  }

  private async updateSearchIndex(
    organizationId: string,
    policyId: string,
    content: string
  ): Promise<void> {
    // Update search index (Elasticsearch/Azure Cognitive Search)
    // Implementation depends on search provider
  }
}
```

---

## 5. ProseMirror Integration

### 5.1 Editor Schema

```typescript
// apps/frontend/src/collaboration/editor-schema.ts

import { Schema, NodeSpec, MarkSpec } from 'prosemirror-model';

const nodes: { [name: string]: NodeSpec } = {
  doc: {
    content: 'block+',
  },

  paragraph: {
    content: 'inline*',
    group: 'block',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0],
  },

  heading: {
    attrs: { level: { default: 1 } },
    content: 'inline*',
    group: 'block',
    defining: true,
    parseDOM: [
      { tag: 'h1', attrs: { level: 1 } },
      { tag: 'h2', attrs: { level: 2 } },
      { tag: 'h3', attrs: { level: 3 } },
    ],
    toDOM: (node) => ['h' + node.attrs.level, 0],
  },

  bullet_list: {
    content: 'list_item+',
    group: 'block',
    parseDOM: [{ tag: 'ul' }],
    toDOM: () => ['ul', 0],
  },

  ordered_list: {
    attrs: { order: { default: 1 } },
    content: 'list_item+',
    group: 'block',
    parseDOM: [{ tag: 'ol' }],
    toDOM: (node) => ['ol', { start: node.attrs.order }, 0],
  },

  list_item: {
    content: 'paragraph block*',
    parseDOM: [{ tag: 'li' }],
    toDOM: () => ['li', 0],
  },

  blockquote: {
    content: 'block+',
    group: 'block',
    defining: true,
    parseDOM: [{ tag: 'blockquote' }],
    toDOM: () => ['blockquote', 0],
  },

  code_block: {
    content: 'text*',
    marks: '',
    group: 'block',
    code: true,
    defining: true,
    parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
    toDOM: () => ['pre', ['code', 0]],
  },

  horizontal_rule: {
    group: 'block',
    parseDOM: [{ tag: 'hr' }],
    toDOM: () => ['hr'],
  },

  text: {
    group: 'inline',
  },

  hard_break: {
    inline: true,
    group: 'inline',
    selectable: false,
    parseDOM: [{ tag: 'br' }],
    toDOM: () => ['br'],
  },

  // For inline comments
  comment_marker: {
    inline: true,
    group: 'inline',
    atom: true,
    attrs: { commentId: {} },
    parseDOM: [
      {
        tag: 'span[data-comment-id]',
        getAttrs: (dom: HTMLElement) => ({
          commentId: dom.getAttribute('data-comment-id'),
        }),
      },
    ],
    toDOM: (node) => [
      'span',
      {
        'data-comment-id': node.attrs.commentId,
        class: 'comment-marker',
      },
    ],
  },
};

const marks: { [name: string]: MarkSpec } = {
  bold: {
    parseDOM: [
      { tag: 'strong' },
      { tag: 'b', getAttrs: (node: HTMLElement) => node.style.fontWeight !== 'normal' && null },
    ],
    toDOM: () => ['strong', 0],
  },

  italic: {
    parseDOM: [
      { tag: 'i' },
      { tag: 'em' },
      { style: 'font-style=italic' },
    ],
    toDOM: () => ['em', 0],
  },

  underline: {
    parseDOM: [
      { tag: 'u' },
      { style: 'text-decoration=underline' },
    ],
    toDOM: () => ['u', 0],
  },

  strike: {
    parseDOM: [
      { tag: 's' },
      { tag: 'del' },
      { style: 'text-decoration=line-through' },
    ],
    toDOM: () => ['s', 0],
  },

  link: {
    attrs: {
      href: {},
      title: { default: null },
    },
    inclusive: false,
    parseDOM: [
      {
        tag: 'a[href]',
        getAttrs: (dom: HTMLElement) => ({
          href: dom.getAttribute('href'),
          title: dom.getAttribute('title'),
        }),
      },
    ],
    toDOM: (node) => ['a', { href: node.attrs.href, title: node.attrs.title }, 0],
  },

  // Track changes marks
  insertion: {
    attrs: {
      userId: {},
      userName: {},
      timestamp: {},
    },
    inclusive: true,
    parseDOM: [
      {
        tag: 'ins[data-user-id]',
        getAttrs: (dom: HTMLElement) => ({
          userId: dom.getAttribute('data-user-id'),
          userName: dom.getAttribute('data-user-name'),
          timestamp: dom.getAttribute('data-timestamp'),
        }),
      },
    ],
    toDOM: (node) => [
      'ins',
      {
        'data-user-id': node.attrs.userId,
        'data-user-name': node.attrs.userName,
        'data-timestamp': node.attrs.timestamp,
        class: 'track-insertion',
      },
      0,
    ],
  },

  deletion: {
    attrs: {
      userId: {},
      userName: {},
      timestamp: {},
    },
    inclusive: false,
    parseDOM: [
      {
        tag: 'del[data-user-id]',
        getAttrs: (dom: HTMLElement) => ({
          userId: dom.getAttribute('data-user-id'),
          userName: dom.getAttribute('data-user-name'),
          timestamp: dom.getAttribute('data-timestamp'),
        }),
      },
    ],
    toDOM: (node) => [
      'del',
      {
        'data-user-id': node.attrs.userId,
        'data-user-name': node.attrs.userName,
        'data-timestamp': node.attrs.timestamp,
        class: 'track-deletion',
      },
      0,
    ],
  },

  // Comment highlight
  comment_highlight: {
    attrs: { commentId: {} },
    parseDOM: [
      {
        tag: 'span[data-comment-highlight]',
        getAttrs: (dom: HTMLElement) => ({
          commentId: dom.getAttribute('data-comment-highlight'),
        }),
      },
    ],
    toDOM: (node) => [
      'span',
      {
        'data-comment-highlight': node.attrs.commentId,
        class: 'comment-highlight',
      },
      0,
    ],
  },
};

export const policySchema = new Schema({ nodes, marks });
```

### 5.2 Y.js ProseMirror Binding

```typescript
// apps/frontend/src/collaboration/editor-setup.ts

import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import {
  ySyncPlugin,
  yCursorPlugin,
  yUndoPlugin,
  undo as yUndo,
  redo as yRedo,
} from 'y-prosemirror';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { policySchema } from './editor-schema';
import { buildMenuPlugin } from './menu-plugin';
import { commentPlugin } from './comment-plugin';
import { trackChangesPlugin } from './track-changes-plugin';

export interface EditorConfig {
  element: HTMLElement;
  ydoc: Y.Doc;
  awareness: Awareness;
  userId: string;
  userName: string;
  userColor: string;
  trackChanges: boolean;
  onComment: (position: number, text: string) => void;
}

export function createCollaborativeEditor(config: EditorConfig): EditorView {
  const {
    element,
    ydoc,
    awareness,
    userId,
    userName,
    userColor,
    trackChanges,
    onComment,
  } = config;

  // Get Y.js XML fragment for content
  const yXmlFragment = ydoc.getXmlFragment('content');

  const plugins = [
    // Y.js collaboration plugins
    ySyncPlugin(yXmlFragment),
    yCursorPlugin(awareness, {
      cursorBuilder: (user: any) => {
        const cursor = document.createElement('span');
        cursor.classList.add('collaboration-cursor');
        cursor.style.borderColor = user.color;

        const label = document.createElement('span');
        label.classList.add('collaboration-cursor-label');
        label.style.backgroundColor = user.color;
        label.textContent = user.name;
        cursor.appendChild(label);

        return cursor;
      },
      selectionBuilder: (user: any) => {
        return {
          style: `background-color: ${user.color}33;`, // 20% opacity
          class: 'collaboration-selection',
        };
      },
    }),
    yUndoPlugin(),

    // Standard ProseMirror plugins
    keymap({
      'Mod-z': yUndo,
      'Mod-y': yRedo,
      'Mod-Shift-z': yRedo,
    }),
    keymap(baseKeymap),
    dropCursor(),
    gapCursor(),

    // Custom plugins
    buildMenuPlugin(policySchema),
    commentPlugin({ onComment }),
  ];

  // Add track changes plugin if enabled
  if (trackChanges) {
    plugins.push(
      trackChangesPlugin({
        userId,
        userName,
      })
    );
  }

  const state = EditorState.create({
    schema: policySchema,
    plugins,
  });

  const view = new EditorView(element, {
    state,
    dispatchTransaction(transaction) {
      const newState = view.state.apply(transaction);
      view.updateState(newState);
    },
  });

  return view;
}
```

### 5.3 Cursor Styles

```css
/* apps/frontend/src/styles/collaboration.css */

/* Remote cursor */
.collaboration-cursor {
  position: relative;
  border-left: 2px solid;
  border-right: none;
  margin-left: -1px;
  margin-right: -1px;
  pointer-events: none;
}

.collaboration-cursor-label {
  position: absolute;
  top: -1.4em;
  left: -1px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  padding: 2px 6px;
  border-radius: 3px 3px 3px 0;
  white-space: nowrap;
  user-select: none;
  pointer-events: none;
  z-index: 1000;
}

/* Remote selection */
.collaboration-selection {
  position: relative;
}

/* Comment highlight */
.comment-highlight {
  background-color: rgba(255, 212, 0, 0.3);
  border-bottom: 2px solid #ffd400;
}

.comment-highlight.active {
  background-color: rgba(255, 212, 0, 0.5);
}

/* Track changes */
.track-insertion {
  background-color: rgba(0, 200, 0, 0.2);
  text-decoration: none;
}

.track-deletion {
  background-color: rgba(255, 0, 0, 0.2);
  text-decoration: line-through;
}

/* Auto-save indicator */
.save-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.save-indicator.saving {
  color: #f59e0b;
}

.save-indicator.saved {
  color: #10b981;
}

.save-indicator.error {
  color: #ef4444;
}
```

---

## 6. Presence System

### 6.1 Presence State Management

```typescript
// apps/frontend/src/collaboration/presence-manager.ts

import { Awareness } from 'y-protocols/awareness';
import { EventEmitter } from 'events';

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  cursor?: { anchor: number; head: number } | null;
  lastActive: number;
}

export class PresenceManager extends EventEmitter {
  private awareness: Awareness;
  private localUser: PresenceUser;
  private users: Map<number, PresenceUser> = new Map();

  constructor(awareness: Awareness, localUser: PresenceUser) {
    super();
    this.awareness = awareness;
    this.localUser = localUser;

    // Set initial local state
    this.awareness.setLocalState({
      user: {
        ...localUser,
        lastActive: Date.now(),
      },
    });

    // Listen for awareness changes
    this.awareness.on('change', this.handleAwarenessChange.bind(this));

    // Heartbeat to update last active
    setInterval(() => {
      this.awareness.setLocalStateField('user', {
        ...this.localUser,
        lastActive: Date.now(),
      });
    }, 30000); // Every 30 seconds
  }

  private handleAwarenessChange(
    changes: { added: number[]; updated: number[]; removed: number[] }
  ): void {
    const states = this.awareness.getStates();

    // Update users map
    states.forEach((state, clientId) => {
      if (state.user && clientId !== this.awareness.clientID) {
        this.users.set(clientId, state.user);
      }
    });

    // Remove disconnected users
    changes.removed.forEach((clientId) => {
      this.users.delete(clientId);
    });

    // Emit update event
    this.emit('update', {
      users: Array.from(this.users.values()),
      added: changes.added,
      removed: changes.removed,
    });
  }

  updateCursor(cursor: { anchor: number; head: number } | null): void {
    this.localUser.cursor = cursor;
    this.awareness.setLocalStateField('user', {
      ...this.localUser,
      cursor,
      lastActive: Date.now(),
    });
  }

  getActiveUsers(): PresenceUser[] {
    const now = Date.now();
    const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    return Array.from(this.users.values()).filter(
      (user) => now - user.lastActive < INACTIVE_THRESHOLD
    );
  }

  destroy(): void {
    this.awareness.setLocalState(null);
    this.removeAllListeners();
  }
}
```

### 6.2 Presence UI Component

```tsx
// apps/frontend/src/components/collaboration/PresenceAvatars.tsx

import React from 'react';
import { Avatar, AvatarGroup, Tooltip, Badge } from '@mui/material';
import { PresenceUser } from '../../collaboration/presence-manager';

interface PresenceAvatarsProps {
  users: PresenceUser[];
  maxAvatars?: number;
}

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({
  users,
  maxAvatars = 5,
}) => {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (user: PresenceUser): boolean => {
    return Date.now() - user.lastActive < 60000; // Active within 1 minute
  };

  return (
    <AvatarGroup max={maxAvatars} sx={{ '& .MuiAvatar-root': { width: 32, height: 32 } }}>
      {users.map((user) => (
        <Tooltip key={user.id} title={`${user.name} ${isActive(user) ? '' : '(idle)'}`}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: isActive(user) ? '#44b700' : '#bdbdbd',
                boxShadow: '0 0 0 2px white',
              },
            }}
          >
            <Avatar
              src={user.avatar}
              sx={{
                bgcolor: user.color,
                border: `2px solid ${user.color}`,
              }}
            >
              {getInitials(user.name)}
            </Avatar>
          </Badge>
        </Tooltip>
      ))}
    </AvatarGroup>
  );
};
```

---

## 7. Comments System

### 7.1 Comment Data Model

```typescript
// packages/types/src/comment.types.ts

export interface Comment {
  id: string;
  policyId: string;
  organizationId: string;
  parentId?: string;        // For threaded replies
  authorId: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  mentions: string[];       // User IDs mentioned
  position: {
    from: number;
    to: number;
    text: string;           // Selected text for context
  };
  status: 'open' | 'resolved';
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];
}
```

### 7.2 Comment Service

```typescript
// apps/backend/src/modules/comments/comment.service.ts

@Injectable()
export class CommentService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    @Inject(REQUEST) private request: RequestWithTenant,
  ) {}

  async create(data: CreateCommentDto): Promise<Comment> {
    this.ensureTenantContext();

    // Create comment
    const comment = await this.prisma.comment.create({
      data: {
        policyId: data.policyId,
        organizationId: this.request.organizationId,
        parentId: data.parentId,
        authorId: this.request.userId,
        content: data.content,
        positionFrom: data.position.from,
        positionTo: data.position.to,
        positionText: data.position.text,
        status: 'open',
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Process mentions
    const mentions = this.extractMentions(data.content);
    if (mentions.length > 0) {
      await this.prisma.commentMention.createMany({
        data: mentions.map((userId) => ({
          commentId: comment.id,
          userId,
        })),
      });

      // Send notifications to mentioned users
      await this.notificationService.notifyMentions(
        mentions,
        comment,
        this.request.userId
      );
    }

    return this.formatComment(comment);
  }

  async getByPolicy(policyId: string): Promise<Comment[]> {
    this.ensureTenantContext();

    const comments = await this.prisma.comment.findMany({
      where: {
        policyId,
        parentId: null, // Top-level comments only
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map(this.formatComment);
  }

  async resolve(commentId: string): Promise<Comment> {
    this.ensureTenantContext();

    const comment = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        status: 'resolved',
        resolvedBy: this.request.userId,
        resolvedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return this.formatComment(comment);
  }

  private extractMentions(content: string): string[] {
    // Extract @mentions from content
    const mentionRegex = /@\[([^\]]+)\]\(user:([a-f0-9-]+)\)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[2]); // User ID
    }

    return mentions;
  }

  private formatComment(dbComment: any): Comment {
    return {
      id: dbComment.id,
      policyId: dbComment.policyId,
      organizationId: dbComment.organizationId,
      parentId: dbComment.parentId,
      authorId: dbComment.authorId,
      author: {
        id: dbComment.author.id,
        name: `${dbComment.author.firstName} ${dbComment.author.lastName}`,
        avatar: dbComment.author.avatarUrl,
      },
      content: dbComment.content,
      mentions: [], // Loaded separately if needed
      position: {
        from: dbComment.positionFrom,
        to: dbComment.positionTo,
        text: dbComment.positionText,
      },
      status: dbComment.status,
      resolvedBy: dbComment.resolvedBy,
      resolvedAt: dbComment.resolvedAt,
      createdAt: dbComment.createdAt,
      updatedAt: dbComment.updatedAt,
      replies: dbComment.replies?.map(this.formatComment),
    };
  }

  private ensureTenantContext(): void {
    if (!this.request.organizationId) {
      throw new UnauthorizedException('Tenant context not established');
    }
  }
}
```

### 7.3 Comment UI Component

```tsx
// apps/frontend/src/components/collaboration/CommentThread.tsx

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  TextField,
  Button,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Check as ResolveIcon,
  Reply as ReplyIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { MentionsInput, Mention } from 'react-mentions';
import { formatDistanceToNow } from 'date-fns';
import { Comment } from '../../types/comment.types';
import { useUsers } from '../../hooks/useUsers';

interface CommentThreadProps {
  comment: Comment;
  onReply: (commentId: string, content: string) => void;
  onResolve: (commentId: string) => void;
  onNavigateToPosition: (position: { from: number; to: number }) => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  onReply,
  onResolve,
  onNavigateToPosition,
}) => {
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const { users } = useUsers();

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(comment.id, replyText);
      setReplyText('');
      setShowReply(false);
    }
  };

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        mb: 2,
        borderLeft: `3px solid ${comment.status === 'resolved' ? '#10b981' : '#3b82f6'}`,
      }}
    >
      {/* Selected text context */}
      {comment.position.text && (
        <Box
          onClick={() => onNavigateToPosition(comment.position)}
          sx={{
            p: 1,
            mb: 1,
            backgroundColor: '#fef3c7',
            borderRadius: 1,
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontStyle: 'italic',
            '&:hover': { backgroundColor: '#fde68a' },
          }}
        >
          "{comment.position.text}"
        </Box>
      )}

      {/* Comment header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Avatar
          src={comment.author.avatar}
          sx={{ width: 32, height: 32, mr: 1 }}
        >
          {comment.author.name[0]}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2">{comment.author.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </Typography>
        </Box>
        {comment.status === 'resolved' && (
          <Chip label="Resolved" size="small" color="success" />
        )}
      </Box>

      {/* Comment content */}
      <Typography variant="body2" sx={{ mb: 1 }}>
        {comment.content}
      </Typography>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {comment.status !== 'resolved' && (
          <>
            <Button
              size="small"
              startIcon={<ReplyIcon />}
              onClick={() => setShowReply(!showReply)}
            >
              Reply
            </Button>
            <Button
              size="small"
              startIcon={<ResolveIcon />}
              onClick={() => onResolve(comment.id)}
            >
              Resolve
            </Button>
          </>
        )}
      </Box>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <Box sx={{ ml: 4, mt: 2 }}>
          {comment.replies.map((reply) => (
            <Box key={reply.id} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Avatar
                  src={reply.author.avatar}
                  sx={{ width: 24, height: 24, mr: 1 }}
                >
                  {reply.author.name[0]}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontSize: '0.875rem' }}>
                  {reply.author.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  {formatDistanceToNow(new Date(reply.createdAt), {
                    addSuffix: true,
                  })}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ ml: 4 }}>
                {reply.content}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Reply input */}
      {showReply && (
        <Box sx={{ mt: 2 }}>
          <MentionsInput
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply... Use @ to mention"
            style={{
              input: {
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
              },
            }}
          >
            <Mention
              trigger="@"
              data={users.map((u) => ({ id: u.id, display: u.name }))}
              markup="@[__display__](user:__id__)"
            />
          </MentionsInput>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button size="small" variant="contained" onClick={handleReply}>
              Reply
            </Button>
            <Button size="small" onClick={() => setShowReply(false)}>
              Cancel
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};
```

---

## 8. Track Changes

### 8.1 Track Changes Plugin

```typescript
// apps/frontend/src/collaboration/track-changes-plugin.ts

import { Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { policySchema } from './editor-schema';

interface TrackChangesConfig {
  userId: string;
  userName: string;
}

export const trackChangesPluginKey = new PluginKey('trackChanges');

export function trackChangesPlugin(config: TrackChangesConfig): Plugin {
  return new Plugin({
    key: trackChangesPluginKey,

    state: {
      init() {
        return { enabled: true };
      },
      apply(tr, state) {
        const meta = tr.getMeta(trackChangesPluginKey);
        if (meta?.toggle !== undefined) {
          return { ...state, enabled: meta.toggle };
        }
        return state;
      },
    },

    appendTransaction(transactions, oldState, newState) {
      const pluginState = trackChangesPluginKey.getState(newState);
      if (!pluginState?.enabled) return null;

      let tr: Transaction | null = null;

      transactions.forEach((transaction) => {
        if (!transaction.docChanged) return;

        transaction.steps.forEach((step, i) => {
          const stepMap = step.getMap();
          const doc = transaction.docs[i];

          stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
            // Detect insertions
            if (newEnd > newStart && oldStart === oldEnd) {
              if (!tr) tr = newState.tr;

              const insertionMark = policySchema.marks.insertion.create({
                userId: config.userId,
                userName: config.userName,
                timestamp: new Date().toISOString(),
              });

              tr.addMark(newStart, newEnd, insertionMark);
            }

            // Detect deletions - mark instead of actually deleting
            if (oldEnd > oldStart && newStart === newEnd) {
              if (!tr) tr = newState.tr;

              const deletionMark = policySchema.marks.deletion.create({
                userId: config.userId,
                userName: config.userName,
                timestamp: new Date().toISOString(),
              });

              // Re-insert the deleted content with deletion mark
              const deletedContent = doc.slice(oldStart, oldEnd);
              tr.insert(newStart, deletedContent.content);
              tr.addMark(
                newStart,
                newStart + deletedContent.size,
                deletionMark
              );
            }
          });
        });
      });

      return tr;
    },

    props: {
      decorations(state) {
        const pluginState = trackChangesPluginKey.getState(state);
        if (!pluginState?.enabled) return DecorationSet.empty;

        const decorations: Decoration[] = [];

        state.doc.descendants((node, pos) => {
          node.marks.forEach((mark) => {
            if (mark.type.name === 'insertion') {
              decorations.push(
                Decoration.inline(pos, pos + node.nodeSize, {
                  class: 'track-insertion',
                  'data-author': mark.attrs.userName,
                })
              );
            } else if (mark.type.name === 'deletion') {
              decorations.push(
                Decoration.inline(pos, pos + node.nodeSize, {
                  class: 'track-deletion',
                  'data-author': mark.attrs.userName,
                })
              );
            }
          });
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
}

// Toggle track changes
export function toggleTrackChanges(view: EditorView, enabled: boolean): void {
  view.dispatch(
    view.state.tr.setMeta(trackChangesPluginKey, { toggle: enabled })
  );
}

// Accept a change
export function acceptChange(view: EditorView, from: number, to: number): void {
  const tr = view.state.tr;

  // Find and remove track change marks in range
  const { doc } = view.state;
  doc.nodesBetween(from, to, (node, pos) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === 'insertion') {
        // Keep the content, remove the mark
        tr.removeMark(pos, pos + node.nodeSize, mark.type);
      } else if (mark.type.name === 'deletion') {
        // Actually delete the content
        tr.delete(pos, pos + node.nodeSize);
      }
    });
  });

  view.dispatch(tr);
}

// Reject a change
export function rejectChange(view: EditorView, from: number, to: number): void {
  const tr = view.state.tr;

  const { doc } = view.state;
  doc.nodesBetween(from, to, (node, pos) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === 'insertion') {
        // Delete the inserted content
        tr.delete(pos, pos + node.nodeSize);
      } else if (mark.type.name === 'deletion') {
        // Keep the content, remove the mark
        tr.removeMark(pos, pos + node.nodeSize, mark.type);
      }
    });
  });

  view.dispatch(tr);
}
```

### 8.2 Track Changes UI

```tsx
// apps/frontend/src/components/collaboration/TrackChangesToolbar.tsx

import React from 'react';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  TrackChanges as TrackChangesIcon,
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';
import { EditorView } from 'prosemirror-view';
import {
  toggleTrackChanges,
  acceptChange,
  rejectChange,
  trackChangesPluginKey,
} from '../../collaboration/track-changes-plugin';

interface TrackChangesToolbarProps {
  view: EditorView;
}

export const TrackChangesToolbar: React.FC<TrackChangesToolbarProps> = ({
  view,
}) => {
  const pluginState = trackChangesPluginKey.getState(view.state);
  const isEnabled = pluginState?.enabled ?? false;

  const handleToggle = () => {
    toggleTrackChanges(view, !isEnabled);
  };

  const handleAcceptSelected = () => {
    const { from, to } = view.state.selection;
    acceptChange(view, from, to);
  };

  const handleRejectSelected = () => {
    const { from, to } = view.state.selection;
    rejectChange(view, from, to);
  };

  const handleAcceptAll = () => {
    acceptChange(view, 0, view.state.doc.content.size);
  };

  const handleRejectAll = () => {
    rejectChange(view, 0, view.state.doc.content.size);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1,
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <Tooltip title={isEnabled ? 'Disable Track Changes' : 'Enable Track Changes'}>
        <ToggleButton
          value="track-changes"
          selected={isEnabled}
          onChange={handleToggle}
          size="small"
        >
          <TrackChangesIcon />
        </ToggleButton>
      </Tooltip>

      {isEnabled && (
        <>
          <Box sx={{ borderLeft: '1px solid #e5e7eb', height: 24 }} />

          <Tooltip title="Accept Selected Change">
            <Button
              size="small"
              startIcon={<AcceptIcon />}
              onClick={handleAcceptSelected}
              color="success"
            >
              Accept
            </Button>
          </Tooltip>

          <Tooltip title="Reject Selected Change">
            <Button
              size="small"
              startIcon={<RejectIcon />}
              onClick={handleRejectSelected}
              color="error"
            >
              Reject
            </Button>
          </Tooltip>

          <Box sx={{ borderLeft: '1px solid #e5e7eb', height: 24 }} />

          <Button size="small" onClick={handleAcceptAll}>
            Accept All
          </Button>
          <Button size="small" onClick={handleRejectAll}>
            Reject All
          </Button>
        </>
      )}
    </Box>
  );
};
```

---

## 9. Conflict Resolution

### 9.1 CRDT Conflict-Free Guarantees

Y.js uses CRDTs (Conflict-free Replicated Data Types) which mathematically guarantee that:

1. **Commutativity**: Operations can be applied in any order
2. **Idempotency**: Applying the same operation multiple times has no additional effect
3. **Associativity**: Grouping of operations doesn't matter

This means **no conflicts occur** at the document level - all concurrent edits merge automatically.

### 9.2 Handling Edge Cases

```typescript
// apps/frontend/src/collaboration/conflict-handler.ts

import * as Y from 'yjs';

export class ConflictHandler {
  private ydoc: Y.Doc;

  constructor(ydoc: Y.Doc) {
    this.ydoc = ydoc;
  }

  // Handle network partition reconnection
  handleReconnection(): void {
    // Y.js automatically syncs all pending changes
    // No manual conflict resolution needed
    console.log('Reconnected - Y.js syncing pending changes');
  }

  // Create a snapshot before major operations
  createSnapshot(label: string): void {
    const snapshot = Y.snapshot(this.ydoc);
    const snapshots = this.ydoc.getArray<any>('snapshots');

    snapshots.push([{
      label,
      snapshot: Y.encodeSnapshot(snapshot),
      timestamp: new Date().toISOString(),
    }]);
  }

  // Restore from snapshot
  restoreFromSnapshot(snapshotIndex: number): void {
    const snapshots = this.ydoc.getArray<any>('snapshots');
    const snapshotData = snapshots.get(snapshotIndex);

    if (!snapshotData) {
      throw new Error('Snapshot not found');
    }

    const snapshot = Y.decodeSnapshot(snapshotData.snapshot);
    const restoredDoc = Y.createDocFromSnapshot(this.ydoc, snapshot);

    // Clear current content and copy from restored
    this.ydoc.transact(() => {
      const currentContent = this.ydoc.getXmlFragment('content');
      // Y.js handles the merge appropriately
    });
  }

  // Compare two versions
  compareVersions(snapshot1: Uint8Array, snapshot2: Uint8Array): any {
    const snap1 = Y.decodeSnapshot(snapshot1);
    const snap2 = Y.decodeSnapshot(snapshot2);

    // Get state vectors for comparison
    const sv1 = Y.decodeStateVector(Y.encodeStateVector(snap1));
    const sv2 = Y.decodeStateVector(Y.encodeStateVector(snap2));

    return {
      snapshot1Time: snap1,
      snapshot2Time: snap2,
      // Additional diff logic if needed
    };
  }
}
```

### 9.3 Undo/Redo with Collaboration

```typescript
// apps/frontend/src/collaboration/undo-manager.ts

import * as Y from 'yjs';
import { UndoManager } from 'yjs';

export function setupUndoManager(
  ydoc: Y.Doc,
  userId: string
): UndoManager {
  const content = ydoc.getXmlFragment('content');

  const undoManager = new UndoManager(content, {
    // Only track changes from this user
    trackedOrigins: new Set([userId]),

    // Capture time for grouping edits
    captureTimeout: 500,
  });

  return undoManager;
}

// Track changes with origin
export function makeChangeWithOrigin(
  ydoc: Y.Doc,
  userId: string,
  callback: () => void
): void {
  ydoc.transact(callback, userId);
}

// Usage in editor
const undoManager = setupUndoManager(ydoc, currentUserId);

// Undo only current user's changes
function handleUndo() {
  undoManager.undo();
}

// Redo only current user's changes
function handleRedo() {
  undoManager.redo();
}
```

---

## 10. Performance Optimization

### 10.1 Update Debouncing

```typescript
// apps/frontend/src/collaboration/performance-utils.ts

import * as Y from 'yjs';

// Debounce awareness updates
export function createDebouncedAwarenessUpdate(
  awareness: Awareness,
  delay: number = 100
): (state: any) => void {
  let timeout: NodeJS.Timeout | null = null;
  let pendingState: any = null;

  return (state: any) => {
    pendingState = state;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      awareness.setLocalState(pendingState);
      pendingState = null;
    }, delay);
  };
}

// Batch Y.js transactions
export function batchTransactions(
  ydoc: Y.Doc,
  operations: (() => void)[]
): void {
  ydoc.transact(() => {
    operations.forEach((op) => op());
  });
}

// Lazy load large documents
export async function loadDocumentLazily(
  ydoc: Y.Doc,
  chunks: Uint8Array[]
): Promise<void> {
  for (const chunk of chunks) {
    await new Promise((resolve) => setTimeout(resolve, 0)); // Yield to event loop
    Y.applyUpdate(ydoc, chunk);
  }
}
```

### 10.2 Memory Management

```typescript
// apps/frontend/src/collaboration/memory-management.ts

import * as Y from 'yjs';

export class DocumentMemoryManager {
  private ydoc: Y.Doc;
  private maxHistoryLength: number = 100;

  constructor(ydoc: Y.Doc) {
    this.ydoc = ydoc;
    this.setupGarbageCollection();
  }

  private setupGarbageCollection(): void {
    // Periodically clean up deleted items
    setInterval(() => {
      // Y.js garbage collection is automatic when items are no longer referenced
      // This is handled by the CRDT algorithm
    }, 60000); // Every minute
  }

  // Compact document state
  compactDocument(): Uint8Array {
    return Y.encodeStateAsUpdate(this.ydoc);
  }

  // Get document size metrics
  getMetrics(): DocumentMetrics {
    const state = Y.encodeStateAsUpdate(this.ydoc);
    const content = this.ydoc.getXmlFragment('content');

    return {
      stateSize: state.byteLength,
      nodeCount: this.countNodes(content),
      clientCount: this.ydoc.store.clients.size,
    };
  }

  private countNodes(fragment: Y.XmlFragment): number {
    let count = 0;
    fragment.forEach(() => {
      count++;
    });
    return count;
  }
}

interface DocumentMetrics {
  stateSize: number;
  nodeCount: number;
  clientCount: number;
}
```

### 10.3 WebSocket Optimization

```typescript
// apps/backend/src/modules/collaboration/websocket-optimizer.ts

import { Server } from 'socket.io';

export function optimizeSocketIO(io: Server): void {
  // Enable binary parser for Y.js updates
  io.engine.use((req, res, next) => {
    // Enable per-message deflate compression
    next();
  });

  // Configure for real-time performance
  io.engine.opts.pingTimeout = 60000;
  io.engine.opts.pingInterval = 25000;
  io.engine.opts.upgradeTimeout = 30000;
  io.engine.opts.maxHttpBufferSize = 1e6; // 1MB max message

  // Use Redis adapter for horizontal scaling
  // io.adapter(createAdapter(pubClient, subClient));
}

// Batch awareness updates on server
export class AwarenessBatcher {
  private pending: Map<string, any> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private io: Server;
  private room: string;

  constructor(io: Server, room: string) {
    this.io = io;
    this.room = room;
  }

  queue(userId: string, state: any): void {
    this.pending.set(userId, state);

    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flush();
      }, 50); // Batch every 50ms
    }
  }

  private flush(): void {
    if (this.pending.size === 0) return;

    this.io.to(this.room).emit('awareness:batch', {
      states: Object.fromEntries(this.pending),
    });

    this.pending.clear();
    this.batchTimeout = null;
  }
}
```

---

## 11. Offline Support

### 11.1 IndexedDB Persistence

```typescript
// apps/frontend/src/collaboration/offline-persistence.ts

import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

export class OfflinePersistence {
  private idbProvider: IndexeddbPersistence;
  private ydoc: Y.Doc;
  private docName: string;

  constructor(ydoc: Y.Doc, docName: string) {
    this.ydoc = ydoc;
    this.docName = docName;

    this.idbProvider = new IndexeddbPersistence(docName, ydoc);
  }

  async waitForSync(): Promise<void> {
    return this.idbProvider.whenSynced;
  }

  async clearLocal(): Promise<void> {
    await this.idbProvider.clearData();
  }

  getSyncedStatus(): boolean {
    return this.idbProvider.synced;
  }

  onSynced(callback: () => void): void {
    this.idbProvider.on('synced', callback);
  }

  destroy(): void {
    this.idbProvider.destroy();
  }
}
```

### 11.2 Offline Queue

```typescript
// apps/frontend/src/collaboration/offline-queue.ts

interface QueuedOperation {
  id: string;
  type: 'comment' | 'resolve' | 'mention';
  data: any;
  timestamp: number;
}

export class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private storageKey: string;

  constructor(docName: string) {
    this.storageKey = `offline-queue:${docName}`;
    this.loadFromStorage();
  }

  add(operation: Omit<QueuedOperation, 'id' | 'timestamp'>): void {
    this.queue.push({
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    });
    this.saveToStorage();
  }

  async flush(apiClient: any): Promise<void> {
    const operations = [...this.queue];

    for (const op of operations) {
      try {
        switch (op.type) {
          case 'comment':
            await apiClient.createComment(op.data);
            break;
          case 'resolve':
            await apiClient.resolveComment(op.data.commentId);
            break;
          // ... other operations
        }

        // Remove from queue on success
        this.queue = this.queue.filter((q) => q.id !== op.id);
        this.saveToStorage();
      } catch (error) {
        // Keep in queue for retry
        console.error('Failed to sync offline operation:', error);
      }
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
  }
}
```

### 11.3 Online/Offline Detection

```typescript
// apps/frontend/src/hooks/useOnlineStatus.ts

import { useState, useEffect } from 'react';

export function useOnlineStatus(): {
  isOnline: boolean;
  wasOffline: boolean;
} {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Trigger sync
        window.dispatchEvent(new CustomEvent('app:sync'));
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}
```

---

## 12. Security

### 12.1 Room Access Control

```typescript
// apps/backend/src/modules/collaboration/access-control.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CollaborationAccessControl {
  constructor(private prisma: PrismaService) {}

  async canAccessRoom(
    userId: string,
    organizationId: string,
    policyId: string
  ): Promise<boolean> {
    // Verify policy belongs to tenant
    const policy = await this.prisma.policy.findFirst({
      where: {
        id: policyId,
        organizationId,
      },
      include: {
        owner: true,
      },
    });

    if (!policy) {
      return false;
    }

    // Get user role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    });

    if (!user || user.organizationId !== organizationId) {
      return false;
    }

    // Check role-based access
    switch (user.role) {
      case 'SYSTEM_ADMIN':
      case 'COMPLIANCE_OFFICER':
        return true;

      case 'POLICY_AUTHOR':
        // Can edit own policies or policies they're assigned to
        return policy.ownerId === userId ||
               await this.isAssignedToPolicy(userId, policyId);

      case 'POLICY_REVIEWER':
        // Can view policies in review
        return policy.status === 'IN_REVIEW';

      case 'READ_ONLY':
      case 'EMPLOYEE':
        // Can only view published policies
        return policy.status === 'PUBLISHED';

      default:
        return false;
    }
  }

  private async isAssignedToPolicy(
    userId: string,
    policyId: string
  ): Promise<boolean> {
    const assignment = await this.prisma.policyWorkflow.findFirst({
      where: {
        policyId,
        OR: [
          { currentAssigneeId: userId },
          {
            steps: {
              path: ['$[*].assigneeId'],
              array_contains: userId,
            },
          },
        ],
      },
    });

    return !!assignment;
  }

  async canComment(userId: string, policyId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Only certain roles can comment
    return ['SYSTEM_ADMIN', 'COMPLIANCE_OFFICER', 'POLICY_AUTHOR', 'POLICY_REVIEWER']
      .includes(user?.role || '');
  }

  async canResolveComment(
    userId: string,
    commentId: string
  ): Promise<boolean> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, policy: { select: { ownerId: true } } },
    });

    if (!comment) return false;

    // Comment author or policy owner can resolve
    return comment.authorId === userId || comment.policy.ownerId === userId;
  }
}
```

### 12.2 WebSocket Security

```typescript
// apps/backend/src/modules/collaboration/websocket-security.ts

import { Socket } from 'socket.io';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiting for WebSocket messages
const rateLimiter = new RateLimiterMemory({
  points: 100, // 100 messages
  duration: 1, // per second
});

export async function rateLimitWebSocket(
  socket: Socket,
  eventName: string
): Promise<boolean> {
  try {
    await rateLimiter.consume(`${socket.id}:${eventName}`);
    return true;
  } catch {
    socket.emit('error', { message: 'Rate limit exceeded' });
    return false;
  }
}

// Message size validation
export function validateMessageSize(
  data: any,
  maxSize: number = 50000 // 50KB
): boolean {
  const size = JSON.stringify(data).length;
  return size <= maxSize;
}

// Sanitize content for XSS
export function sanitizeContent(content: string): string {
  // Basic XSS prevention - use a proper library in production
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

---

## 13. API Specifications

### 13.1 WebSocket Events

```yaml
# Client → Server Events

room:join:
  description: Join a collaboration room
  payload:
    type: object
    properties:
      policyId:
        type: string
        format: uuid

room:leave:
  description: Leave a collaboration room
  payload:
    type: object
    properties:
      policyId:
        type: string
        format: uuid

cursor:update:
  description: Update cursor position
  payload:
    type: object
    properties:
      policyId:
        type: string
      cursor:
        type: object
        properties:
          anchor:
            type: number
          head:
            type: number

comment:add:
  description: Add a new comment
  payload:
    type: object
    properties:
      policyId:
        type: string
      content:
        type: string
      position:
        type: object
        properties:
          from:
            type: number
          to:
            type: number
          text:
            type: string

comment:resolve:
  description: Resolve a comment
  payload:
    type: object
    properties:
      policyId:
        type: string
      commentId:
        type: string

# Server → Client Events

user:joined:
  description: User joined the room
  payload:
    type: object
    properties:
      userId:
        type: string
      userName:
        type: string
      timestamp:
        type: number

user:left:
  description: User left the room
  payload:
    type: object
    properties:
      userId:
        type: string
      timestamp:
        type: number

room:users:
  description: Current users in room
  payload:
    type: object
    properties:
      users:
        type: array
        items:
          type: string

cursor:moved:
  description: Another user's cursor moved
  payload:
    type: object
    properties:
      userId:
        type: string
      userName:
        type: string
      cursor:
        type: object
      timestamp:
        type: number

comment:added:
  description: Comment was added
  payload:
    $ref: '#/components/schemas/Comment'

comment:resolved:
  description: Comment was resolved
  payload:
    type: object
    properties:
      commentId:
        type: string
      resolvedBy:
        type: string
      timestamp:
        type: number

error:
  description: Error occurred
  payload:
    type: object
    properties:
      message:
        type: string
```

### 13.2 REST API Endpoints

```yaml
# Comments API

/api/policies/{policyId}/comments:
  get:
    summary: Get comments for a policy
    parameters:
      - name: policyId
        in: path
        required: true
        schema:
          type: string
      - name: status
        in: query
        schema:
          enum: [open, resolved, all]
    responses:
      200:
        description: List of comments
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/Comment'

  post:
    summary: Create a comment
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [content, position]
            properties:
              content:
                type: string
              parentId:
                type: string
              position:
                type: object
                properties:
                  from:
                    type: number
                  to:
                    type: number
                  text:
                    type: string
    responses:
      201:
        description: Comment created

/api/policies/{policyId}/comments/{commentId}:
  patch:
    summary: Update a comment
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              content:
                type: string
    responses:
      200:
        description: Comment updated

  delete:
    summary: Delete a comment
    responses:
      200:
        description: Comment deleted

/api/policies/{policyId}/comments/{commentId}/resolve:
  post:
    summary: Resolve a comment
    responses:
      200:
        description: Comment resolved

/api/policies/{policyId}/comments/{commentId}/reopen:
  post:
    summary: Reopen a resolved comment
    responses:
      200:
        description: Comment reopened
```

---

## 14. Implementation Guide

### 14.1 Phase 1: Basic Collaboration (Week 6-7)

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Y.js setup, ProseMirror integration | Basic editor with Y.js binding |
| 2 | WebSocket server setup | Socket.io server with auth |
| 3 | Y.js WebSocket provider | Real-time sync working |
| 4 | Presence system | User avatars and cursors |
| 5 | IndexedDB persistence | Offline editing |

### 14.2 Phase 2: Comments & Track Changes (Week 8)

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Comment system backend | Comment CRUD API |
| 3 | Comment UI components | Comment threads, @mentions |
| 4 | Track changes plugin | Insertion/deletion marks |
| 5 | Track changes UI | Accept/reject changes |

### 14.3 Dependencies

```json
// apps/frontend/package.json
{
  "dependencies": {
    "yjs": "^13.6.0",
    "y-websocket": "^1.5.0",
    "y-indexeddb": "^9.0.0",
    "y-prosemirror": "^1.2.0",
    "prosemirror-state": "^1.4.0",
    "prosemirror-view": "^1.32.0",
    "prosemirror-model": "^1.19.0",
    "prosemirror-keymap": "^1.2.0",
    "prosemirror-commands": "^1.5.0",
    "prosemirror-history": "^1.3.0",
    "prosemirror-dropcursor": "^1.8.0",
    "prosemirror-gapcursor": "^1.3.0",
    "react-mentions": "^4.4.0",
    "socket.io-client": "^4.6.0"
  }
}

// apps/backend/package.json
{
  "dependencies": {
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "socket.io": "^4.6.0",
    "y-websocket": "^1.5.0",
    "yjs": "^13.6.0",
    "ws": "^8.14.0"
  }
}
```

### 14.4 Testing Strategy

1. **Unit Tests**: Y.js operations, CRDT merge behavior
2. **Integration Tests**: WebSocket connection, room management
3. **E2E Tests**: Multiple users editing simultaneously
4. **Load Tests**: 50+ concurrent users per document

---

*End of Technical Specification*
