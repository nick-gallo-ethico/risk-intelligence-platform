/**
 * Notification DTOs
 *
 * Data Transfer Objects for notification API endpoints.
 */

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsInt,
  IsArray,
  IsDateString,
  IsObject,
  IsIn,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationChannel,
  NotificationType,
  PreferenceSettings,
} from '../entities/notification.types';

// Enum values for validation
const NOTIFICATION_CHANNELS = Object.values(NotificationChannel);
const NOTIFICATION_TYPES = Object.values(NotificationType);

/**
 * DTO for creating a notification record.
 */
export class CreateNotificationDto {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  userId: string;

  @IsIn(NOTIFICATION_CHANNELS)
  channel: NotificationChannel;

  @IsIn(NOTIFICATION_TYPES)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  templateId?: string;
}

/**
 * DTO for updating user notification preferences.
 */
export class UpdatePreferencesDto {
  @IsObject()
  @IsOptional()
  preferences?: PreferenceSettings;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'quietHoursStart must be in HH:MM format (24-hour)',
  })
  quietHoursStart?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'quietHoursEnd must be in HH:MM format (24-hour)',
  })
  quietHoursEnd?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsUUID()
  @IsOptional()
  backupUserId?: string;

  @IsDateString()
  @IsOptional()
  oooUntil?: string;
}

/**
 * DTO for querying notifications.
 */
export class NotificationQueryDto {
  @IsIn(NOTIFICATION_CHANNELS)
  @IsOptional()
  channel?: NotificationChannel;

  @IsIn(NOTIFICATION_TYPES)
  @IsOptional()
  type?: NotificationType;

  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;
}

/**
 * DTO for marking notifications as read.
 */
export class MarkReadDto {
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds: string[];
}

/**
 * DTO for archiving notifications.
 */
export class ArchiveNotificationsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds: string[];
}

/**
 * DTO for updating organization notification settings.
 */
export class UpdateOrgNotificationSettingsDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enforcedCategories?: string[];

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'defaultQuietHoursStart must be in HH:MM format (24-hour)',
  })
  defaultQuietHoursStart?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'defaultQuietHoursEnd must be in HH:MM format (24-hour)',
  })
  defaultQuietHoursEnd?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'digestTime must be in HH:MM format (24-hour)',
  })
  digestTime?: string;
}

/**
 * Response DTO for notification list.
 */
export class NotificationListResponseDto {
  notifications: NotificationResponseDto[];
  total: number;
  unreadCount: number;
}

/**
 * Response DTO for a single notification.
 */
export class NotificationResponseDto {
  id: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

/**
 * Response DTO for user preferences.
 */
export class PreferencesResponseDto {
  preferences: PreferenceSettings;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
  backupUserId?: string;
  oooUntil?: Date;
  /** Effective quiet hours (merged with org defaults) */
  effectiveQuietHours?: {
    start: string;
    end: string;
  };
}
