/**
 * Hotline Operations Module Exports
 *
 * Provides internal tooling for Ethico hotline operations:
 * - Directive management across tenants
 * - Bulk QA operations
 * - Real-time operator status tracking
 */

// Module
export { HotlineOpsModule } from "./hotline-ops.module";

// Services
export {
  DirectiveAdminService,
  DirectiveWithRelations,
  DirectiveListResult,
} from "./directive-admin.service";
export {
  BulkQaService,
  QaQueueItem,
  QaQueueResult,
  BulkActionResult,
  ReviewerMetrics,
} from "./bulk-qa.service";
export { OperatorStatusService } from "./operator-status.service";

// DTOs
export {
  BulkQaActionDto,
  BulkQaActionType,
  CreateDirectiveDto,
  UpdateDirectiveDto,
  UpdateOperatorStatusDto,
  DirectiveStage,
  ListDirectivesQueryDto,
  QaQueueQueryDto,
  BulkQaActionResponseDto,
  ReviewerMetricsDto,
} from "./dto/hotline-ops.dto";

// Types
export {
  OperatorStatus,
  OperatorStatusUpdate,
  OperatorMetrics,
  StatusBoardSummary,
} from "./types/operator-status.types";
