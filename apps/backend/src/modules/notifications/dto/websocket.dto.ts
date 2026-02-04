/**
 * WebSocket DTOs for Notification Gateway
 *
 * Defines the structure of messages between the client and
 * the Notification WebSocket gateway for real-time notifications.
 */

import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { InAppNotification } from '../entities/notification.types';

/**
 * Context extracted from WebSocket authentication handshake.
 */
export interface SocketContext {
  /** Organization ID for tenant isolation */
  organizationId: string;
  /** Authenticated user ID */
  userId: string;
  /** User's role */
  userRole: string;
  /** User's permissions array */
  permissions: string[];
}

// ============ Inbound Payloads (Client -> Server) ============

/**
 * Payload for marking notifications as read.
 */
export class MarkReadPayload {
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}

/**
 * Payload for getting recent notifications (poll fallback).
 * Per CONTEXT.md: Clients in background tabs poll every 60 seconds.
 */
export class GetRecentPayload {
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsDateString()
  @IsOptional()
  since?: string;
}

// ============ Outbound Events (Server -> Client) ============

/**
 * Event emitted when a new notification is received.
 */
export interface NotificationNewEvent {
  notification: InAppNotification;
  timestamp: string;
}

/**
 * Event emitted with updated unread count.
 */
export interface UnreadCountEvent {
  unreadCount: number;
  timestamp: string;
}

/**
 * Event emitted when notifications are marked as read.
 */
export interface MarkedReadEvent {
  notificationIds: string[];
  readAt: string;
}

/**
 * Event emitted in response to get_recent request.
 */
export interface RecentNotificationsEvent {
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    body?: string;
    entityType?: string;
    entityId?: string;
    isRead: boolean;
    createdAt: Date;
  }>;
  unreadCount: number;
  timestamp: string;
}

/**
 * Error event emitted when an operation fails.
 */
export interface NotificationErrorEvent {
  message: string;
}

/**
 * Union of all outbound event types.
 */
export type NotificationWebSocketEvent =
  | NotificationNewEvent
  | UnreadCountEvent
  | MarkedReadEvent
  | RecentNotificationsEvent
  | NotificationErrorEvent;
