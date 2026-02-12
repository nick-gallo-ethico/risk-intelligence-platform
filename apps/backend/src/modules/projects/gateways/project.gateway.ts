/**
 * ProjectGateway - WebSocket Gateway for Real-Time Project Collaboration
 *
 * Provides WebSocket connectivity for instant project board updates.
 * Handles connection authentication, room management, and change broadcasts.
 *
 * Key features:
 * - JWT authentication on WebSocket handshake
 * - Tenant-isolated room naming: project:{organizationId}:{projectId}
 * - Presence tracking (who's viewing the project board)
 * - Real-time task updates (create, update, delete, move)
 * - Event-driven broadcasts for service integration
 *
 * Client connection requires auth handshake with JWT token:
 * ```javascript
 * const socket = io('/projects', {
 *   auth: { token: 'jwt-token-here' }
 * });
 * ```
 *
 * Events emitted to client:
 * - user-joined - User joined the project room
 * - user-left - User left the project room
 * - task-created - New task created
 * - task-updated - Task details updated
 * - task-deleted - Task removed
 * - task-moved - Task status/position changed
 * - update-created - New task update/comment posted
 * - error - Error occurred
 *
 * Events received from client:
 * - join-project - Join a project room
 * - leave-project - Leave a project room
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Socket context stored on authenticated clients.
 */
interface SocketContext {
  userId: string;
  organizationId: string;
  userRole: string;
  permissions: string[];
}

/**
 * Payload for user presence events.
 */
interface UserPresencePayload {
  userId: string;
  projectId: string;
  timestamp: string;
}

/**
 * Task data for broadcasts.
 */
interface TaskBroadcastData {
  id: string;
  title: string;
  status?: string;
  assigneeId?: string | null;
  groupId?: string | null;
  sortOrder?: number;
  [key: string]: unknown;
}

/**
 * Task move data for drag-drop operations.
 */
interface TaskMovedData {
  taskId: string;
  oldStatus: string;
  newStatus: string;
  oldGroupId?: string | null;
  newGroupId?: string | null;
  sortOrder: number;
}

/**
 * Update/comment data for broadcasts.
 */
interface UpdateBroadcastData {
  id: string;
  taskId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  [key: string]: unknown;
}

@Injectable()
@WebSocketGateway({
  namespace: "/projects",
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },
})
export class ProjectGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ProjectGateway.name);

  /**
   * Track connected sockets per project room.
   * Key: room key (project:{orgId}:{projectId})
   * Value: Map of userId -> Set of socket IDs
   */
  private readonly roomUsers = new Map<string, Map<string, Set<string>>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Handle new WebSocket connection.
   * Extracts JWT from handshake, verifies, and stores context.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const context = await this.extractContext(client);
      if (!context) {
        this.logger.warn(
          `Connection rejected: missing or invalid auth context (socket: ${client.id})`,
        );
        client.emit("error", { message: "Authentication required" });
        client.disconnect(true);
        return;
      }

      // Store context on client for later use
      client.data.context = context;

      this.logger.debug(
        `Client connected: ${client.id} (org: ${context.organizationId}, user: ${context.userId})`,
      );
    } catch (error) {
      this.logger.error(
        `Connection error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      client.emit("error", { message: "Connection failed" });
      client.disconnect(true);
    }
  }

  /**
   * Handle WebSocket disconnection.
   * Removes socket from all project rooms and notifies remaining users.
   */
  handleDisconnect(client: Socket): void {
    const context: SocketContext | undefined = client.data.context;

    if (context) {
      // Remove from all project rooms
      for (const [roomKey, userMap] of this.roomUsers.entries()) {
        if (roomKey.startsWith(`project:${context.organizationId}:`)) {
          const userSockets = userMap.get(context.userId);
          if (userSockets) {
            userSockets.delete(client.id);

            // If user has no more sockets in this room, notify others
            if (userSockets.size === 0) {
              userMap.delete(context.userId);
              const projectId = roomKey.split(":")[2];

              // Broadcast user left
              this.server.to(roomKey).emit("user-left", {
                userId: context.userId,
                projectId,
                timestamp: new Date().toISOString(),
              } as UserPresencePayload);
            }

            // Clean up empty room
            if (userMap.size === 0) {
              this.roomUsers.delete(roomKey);
            }
          }
        }
      }

      this.logger.debug(
        `Client disconnected: ${client.id} (org: ${context.organizationId}, user: ${context.userId})`,
      );
    } else {
      this.logger.debug(`Client disconnected: ${client.id} (no context)`);
    }
  }

  /**
   * Handle join-project message from client.
   * Verifies user has access to the project and joins them to the room.
   */
  @SubscribeMessage("join-project")
  async handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() projectId: string,
  ): Promise<void> {
    const context: SocketContext | undefined = client.data.context;
    if (!context) {
      client.emit("error", { message: "Not authenticated" });
      return;
    }

    try {
      // Verify project exists and belongs to user's organization
      const project = await this.prisma.milestone.findFirst({
        where: {
          id: projectId,
          organizationId: context.organizationId,
        },
        select: { id: true, name: true },
      });

      if (!project) {
        client.emit("error", { message: "Project not found" });
        return;
      }

      // Build room key with tenant isolation
      const roomKey = this.getProjectRoomKey(context.organizationId, projectId);

      // Join Socket.io room
      await client.join(roomKey);

      // Track user presence in room
      if (!this.roomUsers.has(roomKey)) {
        this.roomUsers.set(roomKey, new Map());
      }
      const userMap = this.roomUsers.get(roomKey)!;

      if (!userMap.has(context.userId)) {
        userMap.set(context.userId, new Set());

        // Broadcast user joined (only for first socket from this user)
        this.server.to(roomKey).emit("user-joined", {
          userId: context.userId,
          projectId,
          timestamp: new Date().toISOString(),
        } as UserPresencePayload);
      }

      userMap.get(context.userId)!.add(client.id);

      // Send current room users to the joining client
      const activeUsers = Array.from(userMap.keys());
      client.emit("room-users", {
        projectId,
        users: activeUsers,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `User ${context.userId} joined project room ${projectId} (socket: ${client.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Join project error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      client.emit("error", { message: "Failed to join project room" });
    }
  }

  /**
   * Handle leave-project message from client.
   * Removes user from the project room.
   */
  @SubscribeMessage("leave-project")
  async handleLeaveProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() projectId: string,
  ): Promise<void> {
    const context: SocketContext | undefined = client.data.context;
    if (!context) {
      return;
    }

    const roomKey = this.getProjectRoomKey(context.organizationId, projectId);

    // Leave Socket.io room
    await client.leave(roomKey);

    // Update presence tracking
    const userMap = this.roomUsers.get(roomKey);
    if (userMap) {
      const userSockets = userMap.get(context.userId);
      if (userSockets) {
        userSockets.delete(client.id);

        // If user has no more sockets in this room, notify others
        if (userSockets.size === 0) {
          userMap.delete(context.userId);

          this.server.to(roomKey).emit("user-left", {
            userId: context.userId,
            projectId,
            timestamp: new Date().toISOString(),
          } as UserPresencePayload);
        }

        // Clean up empty room
        if (userMap.size === 0) {
          this.roomUsers.delete(roomKey);
        }
      }
    }

    this.logger.debug(
      `User ${context.userId} left project room ${projectId} (socket: ${client.id})`,
    );
  }

  /**
   * Get list of users currently viewing a project.
   */
  @SubscribeMessage("get-room-users")
  handleGetRoomUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() projectId: string,
  ): void {
    const context: SocketContext | undefined = client.data.context;
    if (!context) {
      client.emit("error", { message: "Not authenticated" });
      return;
    }

    const roomKey = this.getProjectRoomKey(context.organizationId, projectId);
    const userMap = this.roomUsers.get(roomKey);
    const activeUsers = userMap ? Array.from(userMap.keys()) : [];

    client.emit("room-users", {
      projectId,
      users: activeUsers,
      timestamp: new Date().toISOString(),
    });
  }

  // ===== Broadcast Methods (called by services) =====

  /**
   * Broadcast a task update to all users in the project room.
   *
   * @param organizationId - Organization ID for tenant scoping
   * @param projectId - Project ID
   * @param event - Event name to emit
   * @param data - Event data payload
   */
  broadcastTaskUpdate(
    organizationId: string,
    projectId: string,
    event: string,
    data: unknown,
  ): void {
    const roomKey = this.getProjectRoomKey(organizationId, projectId);
    this.server.to(roomKey).emit(event, {
      ...(data as object),
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Broadcast ${event} to project room ${projectId}`);
  }

  /**
   * Broadcast task created event.
   */
  broadcastTaskCreated(
    organizationId: string,
    projectId: string,
    task: TaskBroadcastData,
  ): void {
    this.broadcastTaskUpdate(organizationId, projectId, "task-created", {
      task,
    });
  }

  /**
   * Broadcast task updated event.
   */
  broadcastTaskUpdated(
    organizationId: string,
    projectId: string,
    task: TaskBroadcastData,
  ): void {
    this.broadcastTaskUpdate(organizationId, projectId, "task-updated", {
      task,
    });
  }

  /**
   * Broadcast task deleted event.
   */
  broadcastTaskDeleted(
    organizationId: string,
    projectId: string,
    taskId: string,
  ): void {
    this.broadcastTaskUpdate(organizationId, projectId, "task-deleted", {
      taskId,
    });
  }

  /**
   * Broadcast task moved event (status/group change).
   */
  broadcastTaskMoved(
    organizationId: string,
    projectId: string,
    data: TaskMovedData,
  ): void {
    this.broadcastTaskUpdate(organizationId, projectId, "task-moved", data);
  }

  /**
   * Broadcast new update/comment event.
   */
  broadcastUpdateCreated(
    organizationId: string,
    projectId: string,
    update: UpdateBroadcastData,
  ): void {
    this.broadcastTaskUpdate(organizationId, projectId, "update-created", {
      update,
    });
  }

  /**
   * Broadcast group created event.
   */
  broadcastGroupCreated(
    organizationId: string,
    projectId: string,
    group: { id: string; name: string; color: string; sortOrder: number },
  ): void {
    this.broadcastTaskUpdate(organizationId, projectId, "group-created", {
      group,
    });
  }

  /**
   * Broadcast group updated event.
   */
  broadcastGroupUpdated(
    organizationId: string,
    projectId: string,
    group: { id: string; name: string; color: string; sortOrder: number },
  ): void {
    this.broadcastTaskUpdate(organizationId, projectId, "group-updated", {
      group,
    });
  }

  /**
   * Broadcast group deleted event.
   */
  broadcastGroupDeleted(
    organizationId: string,
    projectId: string,
    groupId: string,
  ): void {
    this.broadcastTaskUpdate(organizationId, projectId, "group-deleted", {
      groupId,
    });
  }

  // ===== Helper Methods =====

  /**
   * Build tenant-isolated room key for a project.
   *
   * @param organizationId - Organization ID
   * @param projectId - Project ID
   * @returns Room key string
   */
  private getProjectRoomKey(organizationId: string, projectId: string): string {
    return `project:${organizationId}:${projectId}`;
  }

  /**
   * Extract authentication context from WebSocket handshake.
   * Verifies JWT token and extracts user/org information.
   *
   * @param client - Socket client
   * @returns SocketContext or null if invalid
   */
  private async extractContext(client: Socket): Promise<SocketContext | null> {
    // Try auth object first, then authorization header
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      this.logger.warn("No token provided in handshake auth");
      return null;
    }

    try {
      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Extract required fields (support multiple claim formats)
      const organizationId =
        payload.organizationId || payload.org_id || payload.orgId;
      const userId = payload.userId || payload.user_id || payload.sub;
      const userRole = payload.role || payload.userRole || "EMPLOYEE";
      const permissions = payload.permissions || [];

      if (!organizationId || !userId) {
        this.logger.warn("Token missing organizationId or userId");
        return null;
      }

      return {
        organizationId,
        userId,
        userRole,
        permissions,
      };
    } catch (error) {
      this.logger.warn(
        `Token verification failed: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Check if any users are currently viewing a project.
   *
   * @param organizationId - Organization ID
   * @param projectId - Project ID
   * @returns true if at least one user is in the room
   */
  hasActiveUsers(organizationId: string, projectId: string): boolean {
    const roomKey = this.getProjectRoomKey(organizationId, projectId);
    const userMap = this.roomUsers.get(roomKey);
    return userMap !== undefined && userMap.size > 0;
  }

  /**
   * Get count of users currently viewing a project.
   *
   * @param organizationId - Organization ID
   * @param projectId - Project ID
   * @returns Number of unique users
   */
  getActiveUserCount(organizationId: string, projectId: string): number {
    const roomKey = this.getProjectRoomKey(organizationId, projectId);
    const userMap = this.roomUsers.get(roomKey);
    return userMap?.size ?? 0;
  }

  /**
   * Get list of user IDs currently viewing a project.
   *
   * @param organizationId - Organization ID
   * @param projectId - Project ID
   * @returns Array of user IDs
   */
  getActiveUserIds(organizationId: string, projectId: string): string[] {
    const roomKey = this.getProjectRoomKey(organizationId, projectId);
    const userMap = this.roomUsers.get(roomKey);
    return userMap ? Array.from(userMap.keys()) : [];
  }
}
