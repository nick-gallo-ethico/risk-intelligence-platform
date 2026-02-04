/**
 * NotificationGateway - WebSocket Gateway for Real-Time Notifications
 *
 * Provides WebSocket connectivity for instant in-app notification delivery.
 * Handles connection authentication, room management, and notification push.
 *
 * Key features:
 * - JWT authentication on WebSocket handshake
 * - Tenant-isolated room naming: org:{organizationId}:user:{userId}
 * - Unread count sent on connection and after each notification
 * - Poll fallback for background tabs (get_recent)
 * - Event-driven: listens to NotificationService events
 *
 * Client connection requires auth handshake with JWT token:
 * ```javascript
 * const socket = io('/notifications', {
 *   auth: { token: 'jwt-token-here' }
 * });
 * ```
 *
 * Events emitted to client:
 * - notification:new - New notification received
 * - notification:unread_count - Updated unread count
 * - notification:marked_read - Notifications marked as read
 * - error - Error occurred
 *
 * Events received from client:
 * - mark_read - Mark notifications as read
 * - get_unread_count - Request current unread count
 * - get_recent - Poll for recent notifications (background tab fallback)
 */

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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { InAppNotification, NotificationChannel } from '../entities/notification.types';
import {
  MarkReadPayload,
  GetRecentPayload,
  SocketContext,
  NotificationNewEvent,
  UnreadCountEvent,
} from '../dto/websocket.dto';

/**
 * Event payload emitted by NotificationService when in-app notification is created.
 */
interface InAppCreatedEvent {
  organizationId: string;
  userId: string;
  notification: InAppNotification;
}

/**
 * Event payload emitted when unread count is updated.
 */
interface UnreadCountUpdatedEvent {
  organizationId: string;
  userId: string;
  unreadCount: number;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  /**
   * Track connected sockets per user room.
   * Key: room key (org:{orgId}:user:{userId})
   * Value: Set of socket IDs
   */
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Handle new WebSocket connection.
   * Extracts JWT from handshake, verifies, and joins user to their room.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const context = await this.extractContext(client);
      if (!context) {
        this.logger.warn(
          `Connection rejected: missing or invalid auth context (socket: ${client.id})`,
        );
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      // Store context on client for later use
      client.data.context = context;

      // Build room key with tenant isolation
      const roomKey = this.getUserRoomKey(
        context.organizationId,
        context.userId,
      );

      // Join user-specific room
      await client.join(roomKey);

      // Track socket in userSockets map
      if (!this.userSockets.has(roomKey)) {
        this.userSockets.set(roomKey, new Set());
      }
      this.userSockets.get(roomKey)!.add(client.id);

      this.logger.debug(
        `Client connected: ${client.id} (org: ${context.organizationId}, user: ${context.userId}, room: ${roomKey})`,
      );

      // Send initial unread count
      await this.sendUnreadCount(client, context);
    } catch (error) {
      this.logger.error(
        `Connection error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      client.emit('error', { message: 'Connection failed' });
      client.disconnect(true);
    }
  }

  /**
   * Handle WebSocket disconnection.
   * Removes socket from tracking map.
   */
  handleDisconnect(client: Socket): void {
    const context: SocketContext | undefined = client.data.context;

    if (context) {
      const roomKey = this.getUserRoomKey(
        context.organizationId,
        context.userId,
      );
      const sockets = this.userSockets.get(roomKey);

      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(roomKey);
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
   * Handle mark_read message from client.
   * Marks specified notifications as read and sends updated unread count.
   */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MarkReadPayload,
  ): Promise<void> {
    const context: SocketContext | undefined = client.data.context;
    if (!context) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const { notificationIds } = payload;

      if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        client.emit('error', { message: 'notificationIds array required' });
        return;
      }

      // Mark notifications as read via service
      await this.notificationService.markAsRead(
        context.organizationId,
        context.userId,
        notificationIds,
      );

      // Emit confirmation
      client.emit('notification:marked_read', {
        notificationIds,
        readAt: new Date().toISOString(),
      });

      this.logger.debug(
        `Marked ${notificationIds.length} notifications as read for user ${context.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Mark read error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      client.emit('error', { message: 'Failed to mark notifications as read' });
    }
  }

  /**
   * Handle get_unread_count message from client.
   * Returns current unread count.
   */
  @SubscribeMessage('get_unread_count')
  async handleGetUnreadCount(@ConnectedSocket() client: Socket): Promise<void> {
    const context: SocketContext | undefined = client.data.context;
    if (!context) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    await this.sendUnreadCount(client, context);
  }

  /**
   * Handle get_recent message from client.
   * Poll fallback for background tabs - returns recent notifications.
   *
   * Per CONTEXT.md: Clients in background tabs poll every 60 seconds.
   */
  @SubscribeMessage('get_recent')
  async handleGetRecent(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GetRecentPayload,
  ): Promise<void> {
    const context: SocketContext | undefined = client.data.context;
    if (!context) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const { limit = 20, since } = payload || {};

      // Get recent notifications from service
      const result = await this.notificationService.getNotifications(
        context.organizationId,
        context.userId,
        {
          channel: NotificationChannel.IN_APP,
          limit: Math.min(limit, 50), // Cap at 50
          offset: 0,
        },
      );

      // Filter by since date if provided
      let notifications = result.notifications;
      if (since) {
        const sinceDate = new Date(since);
        notifications = notifications.filter(
          (n) => new Date(n.createdAt) > sinceDate,
        );
      }

      client.emit('notification:recent', {
        notifications,
        unreadCount: result.unreadCount,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Sent ${notifications.length} recent notifications to user ${context.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Get recent error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      client.emit('error', { message: 'Failed to get recent notifications' });
    }
  }

  /**
   * Listen for in-app notification creation events from NotificationService.
   * Delivers notification to connected user via WebSocket.
   */
  @OnEvent('notification.in_app.created', { async: true })
  async handleInAppCreated(event: InAppCreatedEvent): Promise<void> {
    const { organizationId, userId, notification } = event;
    const roomKey = this.getUserRoomKey(organizationId, userId);

    // Emit to user's room
    this.server.to(roomKey).emit('notification:new', {
      notification,
      timestamp: new Date().toISOString(),
    } as NotificationNewEvent);

    this.logger.debug(
      `Delivered notification ${notification.id} to room ${roomKey}`,
    );

    // Also send updated unread count
    try {
      const unreadCount = await this.notificationService.getUnreadCount(
        organizationId,
        userId,
      );

      this.server.to(roomKey).emit('notification:unread_count', {
        unreadCount,
        timestamp: new Date().toISOString(),
      } as UnreadCountEvent);
    } catch (error) {
      this.logger.error(
        `Failed to send unread count after notification: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Listen for unread count update events.
   * Delivers updated count to connected user.
   */
  @OnEvent('notification.unread_count.updated', { async: true })
  async handleUnreadCountUpdated(event: UnreadCountUpdatedEvent): Promise<void> {
    const { organizationId, userId, unreadCount } = event;
    const roomKey = this.getUserRoomKey(organizationId, userId);

    this.server.to(roomKey).emit('notification:unread_count', {
      unreadCount,
      timestamp: new Date().toISOString(),
    } as UnreadCountEvent);

    this.logger.debug(
      `Sent updated unread count (${unreadCount}) to room ${roomKey}`,
    );
  }

  /**
   * Send a notification directly to a specific user.
   * Helper method for use by NotificationService.
   *
   * @param userId - User ID
   * @param organizationId - Organization ID for tenant scoping
   * @param notification - The notification to send
   */
  sendToUser(
    userId: string,
    organizationId: string,
    notification: InAppNotification,
  ): void {
    const roomKey = this.getUserRoomKey(organizationId, userId);

    this.server.to(roomKey).emit('notification:new', {
      notification,
      timestamp: new Date().toISOString(),
    } as NotificationNewEvent);

    this.logger.debug(
      `Sent notification ${notification.id} directly to user ${userId}`,
    );
  }

  /**
   * Build tenant-isolated room key for a user.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns Room key string
   */
  private getUserRoomKey(organizationId: string, userId: string): string {
    return `org:${organizationId}:user:${userId}`;
  }

  /**
   * Send current unread count to a client.
   */
  private async sendUnreadCount(
    client: Socket,
    context: SocketContext,
  ): Promise<void> {
    try {
      const unreadCount = await this.notificationService.getUnreadCount(
        context.organizationId,
        context.userId,
      );

      client.emit('notification:unread_count', {
        unreadCount,
        timestamp: new Date().toISOString(),
      } as UnreadCountEvent);

      this.logger.debug(
        `Sent unread count (${unreadCount}) to user ${context.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send unread count: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Extract authentication context from WebSocket handshake.
   * Verifies JWT token and extracts user/org information.
   *
   * @param client - Socket client
   * @returns SocketContext or null if invalid
   */
  private async extractContext(client: Socket): Promise<SocketContext | null> {
    const auth = client.handshake.auth;
    const token = auth?.token;

    if (!token) {
      this.logger.warn('No token provided in handshake auth');
      return null;
    }

    try {
      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Extract required fields
      const organizationId = payload.organizationId || payload.org_id || payload.orgId;
      const userId = payload.userId || payload.user_id || payload.sub;
      const userRole = payload.role || payload.userRole || 'EMPLOYEE';
      const permissions = payload.permissions || [];

      if (!organizationId || !userId) {
        this.logger.warn('Token missing organizationId or userId');
        return null;
      }

      return {
        organizationId,
        userId,
        userRole,
        permissions,
      };
    } catch (error) {
      this.logger.warn(`Token verification failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Check if a user has any connected sockets.
   * Useful for determining if real-time delivery is possible.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns true if user has at least one connected socket
   */
  isUserConnected(organizationId: string, userId: string): boolean {
    const roomKey = this.getUserRoomKey(organizationId, userId);
    const sockets = this.userSockets.get(roomKey);
    return sockets !== undefined && sockets.size > 0;
  }

  /**
   * Get count of connected sockets for a user.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns Number of connected sockets
   */
  getConnectionCount(organizationId: string, userId: string): number {
    const roomKey = this.getUserRoomKey(organizationId, userId);
    const sockets = this.userSockets.get(roomKey);
    return sockets?.size ?? 0;
  }
}
