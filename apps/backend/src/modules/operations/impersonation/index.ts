/**
 * Impersonation Module Exports
 *
 * Central export point for impersonation functionality.
 * Provides clean import paths for consumers:
 *
 * ```typescript
 * import {
 *   ImpersonationService,
 *   ImpersonationGuard,
 *   ImpersonationContext,
 *   RequireImpersonation,
 *   CurrentImpersonation,
 *   isImpersonating,
 *   getEffectiveOrganizationId,
 * } from '@/modules/operations/impersonation';
 * ```
 */

// Module
export { ImpersonationModule } from "./impersonation.module";

// Service
export {
  ImpersonationService,
  ImpersonationContext,
} from "./impersonation.service";

// Guard and decorators
export {
  ImpersonationGuard,
  RequireImpersonation,
  CurrentImpersonation,
} from "./impersonation.guard";

// Middleware and helpers
export {
  ImpersonationMiddleware,
  isImpersonating,
  getEffectiveOrganizationId,
} from "./impersonation.middleware";

// DTOs
export {
  StartSessionDto,
  EndSessionDto,
  SessionValidationResponse,
  SessionCreationResponse,
} from "./dto/impersonation.dto";
