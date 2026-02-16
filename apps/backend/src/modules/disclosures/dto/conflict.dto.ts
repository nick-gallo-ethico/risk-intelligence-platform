/**
 * Conflict DTOs barrel export file.
 *
 * This file re-exports all conflict-related DTOs from focused files.
 * Each focused file is under 200 lines (SLOP-11 compliance).
 */

// Context types and interfaces
export {
  DismissalCategory,
  VendorContext,
  EmployeeContext,
  DisclosureContext,
  CaseContext,
  MatchDetails,
  SeverityFactors,
} from "./conflict-context.dto";

// Alert DTOs
export { ConflictAlertDto, ConflictCheckResult } from "./conflict-alert.dto";

// Dismissal and escalation DTOs
export {
  DismissConflictDto,
  EscalateConflictDto,
} from "./conflict-dismissal.dto";

// Timeline DTOs
export {
  EntityTimelineEventType,
  EntityTimelineItem,
  EntityTimelineDto,
} from "./conflict-timeline.dto";

// Query and pagination DTOs
export { ConflictQueryDto, ConflictAlertPageDto } from "./conflict-query.dto";

// Exclusion DTOs
export {
  ConflictExclusionDto,
  CreateExclusionDto,
} from "./conflict-exclusion.dto";
