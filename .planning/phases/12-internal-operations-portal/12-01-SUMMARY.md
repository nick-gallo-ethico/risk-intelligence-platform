---
phase: 12-internal-operations-portal
plan: 01
subsystem: operations
tags:
  - internal-ops
  - impersonation
  - audit
  - prisma
  - nestjs
requires:
  - phase-01 (foundation)
provides:
  - InternalUser model
  - InternalRole enum
  - ImpersonationSession model
  - ImpersonationAuditLog model
  - OperationsModule
affects:
  - 12-02 (impersonation service)
  - 12-03 (support console)
  - 12-04+ (implementation portal)
tech-stack:
  added: []
  patterns:
    - separate-internal-user-model
    - cross-tenant-impersonation
    - session-based-audit
key-files:
  created:
    - apps/backend/src/modules/operations/operations.module.ts
    - apps/backend/src/modules/operations/index.ts
    - apps/backend/src/modules/operations/types/internal-roles.types.ts
    - apps/backend/src/modules/operations/entities/internal-user.entity.ts
    - apps/backend/src/modules/operations/entities/impersonation-session.entity.ts
    - apps/backend/src/modules/operations/entities/impersonation-audit-log.entity.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/app.module.ts
decisions:
  - "12-01: InternalUser model is separate from tenant User for SOC 2 compliance"
  - "12-01: 7 InternalRole types (SUPPORT_L1-L3, IMPLEMENTATION, HOTLINE_OPS, CLIENT_SUCCESS, ADMIN)"
  - "12-01: ImpersonationSession max 4 hours, reason required, ticket optional"
  - "12-01: ImpersonationAuditLog captures Who/What/When/Where/Why/Before-After"
  - "12-01: Operations endpoints excluded from TenantMiddleware (api/v1/operations/*)"
metrics:
  duration: 29 min
  completed: 2026-02-06
---

# Phase 12 Plan 01: Operations Portal Foundation Summary

**One-liner:** Database models and module structure for cross-tenant impersonation with full audit trail, establishing foundation for Internal Operations Portal.

## What Was Built

### Internal User Model (Separate from Tenant Users)
Created a completely separate user model for Ethico internal staff, distinct from tenant-scoped User model:

- **InternalUser** - Email, name, role, Azure AD SSO, active status, login tracking
- **InternalRole enum** - 7 permission levels:
  - SUPPORT_L1: Basic read-only access
  - SUPPORT_L2: Advanced diagnostics
  - SUPPORT_L3: Full support with config changes
  - IMPLEMENTATION: Migrations and setup
  - HOTLINE_OPS: QA and directive management
  - CLIENT_SUCCESS: Health monitoring
  - ADMIN: Full system access

### Impersonation Session Tracking
Cross-tenant access requires explicit sessions with full context:

- **ImpersonationSession**:
  - Links operator (InternalUser) to target organization
  - Reason required (audit compliance)
  - Optional ticket reference
  - 4-hour max duration (expiresAt)
  - IP address and user agent captured
  - Status derived from timestamps (ACTIVE, ENDED, EXPIRED)

### Audit Log Per Action
Every action during impersonation logged:

- **ImpersonationAuditLog**:
  - Linked to session (cascading delete)
  - Action type (VIEW_CASE, UPDATE_USER, etc.)
  - Entity type and ID affected
  - Details JSON for mutations (before/after state)
  - Timestamp for chronological ordering

### Module Structure
Created OperationsModule as aggregator for all internal ops:

- Registered in app.module.ts imports
- Operations endpoints excluded from TenantMiddleware
- Clean exports via index.ts for type imports
- Placeholder for sub-modules (Impersonation, Support, Implementation, etc.)

## Key Architecture Decisions

1. **Separate User Model**: InternalUser is NOT tenant-scoped and has no organizationId. This is critical for SOC 2 compliance - internal access is clearly distinguished from customer access.

2. **Session-Based Access**: All cross-tenant operations must occur within an ImpersonationSession. No ad-hoc tenant switching.

3. **Required Justification**: Session creation requires a reason. Optional ticket reference for support tracking.

4. **Time-Bounded Sessions**: Max 4 hours prevents forgotten sessions. UI will show countdown.

5. **Action-Level Audit**: Every read and mutation logged with ImpersonationAuditLog, not just session start/end.

## Files Created

| File | Purpose |
|------|---------|
| `operations.module.ts` | NestJS module aggregating internal ops |
| `index.ts` | Clean exports for all types |
| `internal-roles.types.ts` | InternalRole enum + ROLE_PERMISSIONS mapping |
| `internal-user.entity.ts` | InternalUser interface and DTOs |
| `impersonation-session.entity.ts` | Session interface with status helpers |
| `impersonation-audit-log.entity.ts` | Audit log interface with action constants |

## Database Changes

Added to schema.prisma:
- `enum internal_role` with 7 values
- `model internal_users` with relations
- `model impersonation_sessions` with indexes on operator, organization, startedAt
- `model impersonation_audit_logs` with indexes on session, action, createdAt
- Relation on Organization: `impersonationSessions`

## Commits

| Hash | Description |
|------|-------------|
| 10669fb | feat(12-01): add InternalRole enum and InternalUser entity types |
| 5fe5eff | feat(12-01): add ImpersonationSession and ImpersonationAuditLog models |
| 6590d2f | feat(12-01): create OperationsModule and register in AppModule |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- Prisma schema validates successfully
- TypeScript compiles without errors
- ESLint passes (0 errors, 159 warnings - all pre-existing)
- OperationsModule registered in app.module.ts
- Operations endpoints excluded from TenantMiddleware

## Next Phase Readiness

Ready for 12-02 (Impersonation Service):
- Models exist for session creation and audit logging
- Types exported for service implementation
- Module structure in place for adding services/controllers

## Open Questions for Future Plans

1. **Azure AD Integration**: How will InternalUser authenticate? Same Azure AD tenant as customers or separate Ethico IdP?
2. **Session UI**: Should session timer be prominently displayed? Auto-extend option?
3. **Audit Retention**: How long to retain ImpersonationAuditLog entries?
