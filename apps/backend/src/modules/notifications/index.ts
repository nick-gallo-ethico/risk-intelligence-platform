/**
 * Notifications Module Barrel Export
 *
 * Re-exports all public types, DTOs, services, gateways, and the module for easy importing.
 */

// Module
export { NotificationsModule } from './notifications.module';

// Types and enums
export {
  NotificationChannel,
  NotificationType,
  NotificationStatus,
  DeliveryStatus,
  NotificationCategory,
  CategoryPreference,
  PreferenceSettings,
  DEFAULT_PREFERENCES,
  REAL_TIME_CATEGORIES,
  DIGEST_CATEGORIES,
  QueueEmailParams,
  SendInAppParams,
  InAppNotification,
  PreferenceCheckResult,
  NotificationTriggerEvent,
} from './entities/notification.types';

// DTOs
export {
  CreateNotificationDto,
  UpdatePreferencesDto,
  NotificationQueryDto,
  MarkReadDto,
  ArchiveNotificationsDto,
  UpdateOrgNotificationSettingsDto,
  NotificationListResponseDto,
  NotificationResponseDto,
  PreferencesResponseDto,
} from './dto/notification.dto';

// WebSocket DTOs (07-05)
export {
  MarkReadPayload,
  GetRecentPayload,
} from './dto/websocket.dto';

export type {
  SocketContext,
  NotificationNewEvent,
  UnreadCountEvent,
  MarkedReadEvent,
  RecentNotificationsEvent,
  NotificationErrorEvent,
  NotificationWebSocketEvent,
} from './dto/websocket.dto';

// Gateway (07-05)
export { NotificationGateway } from './gateways';

// Services
export {
  EmailTemplateService,
  PreferenceService,
  OrgNotificationSettingsService,
  NotificationService,
} from './services';

// Service types
export type {
  EmailTemplateContext,
  TemplateResult,
  TemplateHistoryEntry,
  SaveTemplateParams,
  RenderedEmail,
  UserPreferences,
  EffectivePreference,
  OrgNotificationSettings,
  PaginatedNotifications,
} from './services';
