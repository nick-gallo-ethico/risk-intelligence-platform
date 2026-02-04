/**
 * NotificationsController - Notification CRUD Operations
 *
 * REST API for notification management including:
 * - Listing notifications with pagination and filtering
 * - Getting unread count for badge display
 * - Marking notifications as read (single or batch)
 * - Mark all as read
 * - Archiving notifications
 * - Getting recent notifications (polling fallback)
 *
 * All endpoints enforce tenant isolation via organizationId from JWT.
 *
 * @see NotificationService for business logic
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard, TenantGuard } from '../../../common/guards';
import { CurrentUser, TenantId } from '../../../common/decorators';
import { NotificationService } from '../services/notification.service';
import {
  NotificationQueryDto,
  MarkReadDto,
  NotificationListResponseDto,
  NotificationResponseDto,
} from '../dto/notification.dto';
import { NotificationChannel } from '../entities/notification.types';

/**
 * Response DTO for unread count.
 */
class UnreadCountResponseDto {
  unreadCount: number;
}

/**
 * Response DTO for mark-read operation.
 */
class MarkReadResponseDto {
  success: boolean;
  markedCount: number;
}

/**
 * Response DTO for archive operation.
 */
class ArchiveResponseDto {
  success: boolean;
}

/**
 * User object from JWT token.
 */
interface JwtUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
}

@Controller('api/v1/notifications')
@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * List user notifications with pagination and filtering.
   *
   * GET /api/v1/notifications
   *
   * Query params:
   * - channel: Filter by channel (EMAIL, IN_APP)
   * - type: Filter by notification type
   * - isRead: Filter by read status
   * - limit: Page size (default 20, max 100)
   * - offset: Pagination offset
   */
  @Get()
  @ApiOperation({ summary: 'List user notifications' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of notifications',
    type: NotificationListResponseDto,
  })
  async listNotifications(
    @CurrentUser() user: JwtUser,
    @TenantId() organizationId: string,
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    this.logger.debug(
      `Listing notifications for user ${user.id}, query: ${JSON.stringify(query)}`,
    );

    const result = await this.notificationService.getNotifications(
      organizationId,
      user.id,
      query,
    );

    return {
      notifications: result.notifications as NotificationResponseDto[],
      total: result.total,
      unreadCount: result.unreadCount,
    };
  }

  /**
   * Get unread notification count for badge display.
   *
   * GET /api/v1/notifications/unread-count
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count',
    type: UnreadCountResponseDto,
  })
  async getUnreadCount(
    @CurrentUser() user: JwtUser,
    @TenantId() organizationId: string,
  ): Promise<UnreadCountResponseDto> {
    const unreadCount = await this.notificationService.getUnreadCount(
      organizationId,
      user.id,
    );

    return { unreadCount };
  }

  /**
   * Get recent notifications for polling fallback.
   * Used when WebSocket connection is unavailable (background tabs).
   *
   * GET /api/v1/notifications/recent
   *
   * Query params:
   * - limit: Max notifications to return (default 20)
   * - since: ISO date string to filter notifications created after this time
   */
  @Get('recent')
  @ApiOperation({ summary: 'Get recent notifications (polling fallback)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'since', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Recent notifications',
    type: [NotificationResponseDto],
  })
  async getRecentNotifications(
    @CurrentUser() user: JwtUser,
    @TenantId() organizationId: string,
    @Query('limit') limit?: number,
    @Query('since') since?: string,
  ): Promise<NotificationResponseDto[]> {
    const sinceDate = since ? new Date(since) : undefined;
    const notifications = await this.notificationService.getRecentNotifications(
      organizationId,
      user.id,
      limit || 20,
      sinceDate,
    );

    return notifications.map((n) => ({
      id: n.id,
      channel: NotificationChannel.IN_APP,
      type: n.type,
      title: n.title,
      body: n.body,
      entityType: n.entityType,
      entityId: n.entityId,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));
  }

  /**
   * Mark specific notifications as read.
   *
   * POST /api/v1/notifications/mark-read
   */
  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'Notifications marked as read',
    type: MarkReadResponseDto,
  })
  async markAsRead(
    @CurrentUser() user: JwtUser,
    @TenantId() organizationId: string,
    @Body() dto: MarkReadDto,
  ): Promise<MarkReadResponseDto> {
    await this.notificationService.markAsRead(
      organizationId,
      user.id,
      dto.notificationIds,
    );

    this.logger.debug(
      `Marked ${dto.notificationIds.length} notifications as read for user ${user.id}`,
    );

    return {
      success: true,
      markedCount: dto.notificationIds.length,
    };
  }

  /**
   * Mark all notifications as read.
   *
   * POST /api/v1/notifications/mark-all-read
   */
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    type: MarkReadResponseDto,
  })
  async markAllAsRead(
    @CurrentUser() user: JwtUser,
    @TenantId() organizationId: string,
  ): Promise<MarkReadResponseDto> {
    const count = await this.notificationService.markAllAsRead(
      organizationId,
      user.id,
    );

    this.logger.debug(
      `Marked ${count} notifications as read for user ${user.id}`,
    );

    return {
      success: true,
      markedCount: count,
    };
  }

  /**
   * Archive a notification.
   * Archived notifications are hidden from the main list.
   *
   * POST /api/v1/notifications/:id/archive
   */
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification archived',
    type: ArchiveResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async archiveNotification(
    @CurrentUser() user: JwtUser,
    @TenantId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ArchiveResponseDto> {
    await this.notificationService.archiveNotification(
      organizationId,
      user.id,
      id,
    );

    this.logger.debug(`Archived notification ${id} for user ${user.id}`);

    return { success: true };
  }

  /**
   * Get a specific notification by ID.
   *
   * GET /api/v1/notifications/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification details',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async getNotification(
    @CurrentUser() user: JwtUser,
    @TenantId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationService.getNotification(
      organizationId,
      user.id,
      id,
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }
}
