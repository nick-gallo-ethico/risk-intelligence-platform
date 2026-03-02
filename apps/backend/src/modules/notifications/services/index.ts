/**
 * Notifications Services Barrel Export
 *
 * Re-exports all notification services for easy importing.
 */

// Template management (07-02)
export { EmailTemplateService } from "./email-template.service";
export type {
  EmailTemplateContext,
  TemplateResult,
  TemplateHistoryEntry,
  SaveTemplateParams,
  RenderedEmail,
} from "./email-template.service";

// User preferences (07-03)
export { PreferenceService } from "./preference.service";
export type {
  UserPreferences,
  EffectivePreference,
} from "./preference.service";

// Organization settings (07-03)
export { OrgNotificationSettingsService } from "./org-settings.service";
export type { OrgNotificationSettings } from "./org-settings.service";

// Notification types (35-04)
export type {
  QueueEmailParams,
  SendInAppParams,
  QueueForDigestParams,
  NotifyParams,
  PaginatedNotifications,
  NotificationItem,
} from "./notification.types";

// Notification routing (35-04)
export { NotificationRouterService } from "./notification-router.service";
export type {
  RoutingDecision,
  RecipientInfo,
  OrgInfo,
  RoutingParams,
} from "./notification-router.service";

// Delivery dispatch (35-04)
export { DeliveryDispatcherService } from "./delivery-dispatcher.service";
export type {
  DispatchEmailParams,
  DispatchInAppParams,
  DispatchDigestParams,
} from "./delivery-dispatcher.service";

// Core notification dispatch (07-04)
export { NotificationService } from "./notification.service";

// Daily digest (07-06)
export { DigestService } from "./digest.service";
export type {
  QueueForDigestParams as DigestQueueParams,
  GroupedDigestItem,
  CompiledDigest,
} from "./digest.service";

// Delayed notifications for anonymous reporters (42-01)
export { DelayedNotificationService } from "./delayed-notification.service";
export type { ReporterNotificationData } from "../dto/reporter-notification.dto";
