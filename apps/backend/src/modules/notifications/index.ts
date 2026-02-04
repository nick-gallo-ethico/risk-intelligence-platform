/**
 * Notifications Module Barrel Export
 *
 * Re-exports all public types, DTOs, services, and the module for easy importing.
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

// Services
export {
  EmailTemplateService,
  PreferenceService,
  OrgNotificationSettingsService,
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
} from './services';
