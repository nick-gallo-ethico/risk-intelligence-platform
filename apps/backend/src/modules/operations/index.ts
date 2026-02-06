/**
 * Operations Module Exports
 *
 * Central export point for Internal Operations Portal types and services.
 * Provides clean import paths for consumers:
 *
 * ```typescript
 * import {
 *   InternalRole,
 *   ROLE_PERMISSIONS,
 *   hasPermission,
 *   ImpersonationSession,
 *   ImpersonationAction,
 * } from '@/modules/operations';
 * ```
 */

// Module
export { OperationsModule } from "./operations.module";

// Types - Internal Roles and Permissions
export {
  InternalRole,
  InternalPermission,
  ROLE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  hasPermission,
  getPermissionsForRole,
} from "./types/internal-roles.types";

// Entities - InternalUser
export {
  InternalUser,
  CreateInternalUserDto,
  UpdateInternalUserDto,
  InternalUserWithPermissions,
} from "./entities/internal-user.entity";

// Entities - ImpersonationSession
export {
  ImpersonationSession,
  ImpersonationSessionStatus,
  StartImpersonationDto,
  ImpersonationSessionResponse,
  MAX_SESSION_DURATION_HOURS,
  IMPERSONATION_REASONS,
  getSessionStatus,
  getMinutesRemaining,
} from "./entities/impersonation-session.entity";

// Entities - ImpersonationAuditLog
export {
  ImpersonationAuditLog,
  ImpersonationAction,
  ImpersonationEntityType,
  CreateImpersonationAuditLogDto,
  ImpersonationAuditLogResponse,
  AuditLogQueryParams,
  createUpdateDetails,
} from "./entities/impersonation-audit-log.entity";

// Impersonation Module - Session management and cross-tenant access
export {
  ImpersonationModule,
  ImpersonationService,
  ImpersonationGuard,
  ImpersonationMiddleware,
  ImpersonationContext,
  RequireImpersonation,
  CurrentImpersonation,
  isImpersonating,
  getEffectiveOrganizationId,
  StartSessionDto,
  EndSessionDto,
} from "./impersonation";

// Hotline Operations Module - Directive management, QA queue, operator status
export {
  HotlineOpsModule,
  DirectiveAdminService,
  BulkQaService,
  OperatorStatusService,
  DirectiveWithRelations,
  DirectiveListResult,
  QaQueueItem,
  QaQueueResult,
  BulkActionResult,
  ReviewerMetrics,
  BulkQaActionDto,
  BulkQaActionType,
  CreateDirectiveDto,
  UpdateDirectiveDto,
  UpdateOperatorStatusDto,
  OperatorStatus,
  OperatorStatusUpdate,
  OperatorMetrics,
  StatusBoardSummary,
} from "./hotline-ops";

// Support Module - Debug tools, error logs, config inspection
export {
  SupportModule,
  SupportConsoleService,
  SupportConsoleController,
  TenantSearchDto,
  ErrorLogFiltersDto,
  TenantSearchResult,
  TenantConfigResponse,
  JobQueueStatusResponse,
  SearchIndexStatusResponse,
} from "./support";

// Implementation Module - Activity logging and escalation
export {
  ActivityLogService,
  LogActivityDto,
  ActivityLogEntry,
  EscalationProcessor,
  ESCALATION_QUEUE,
  EscalationJobData,
  EscalationResult,
} from "./implementation";
