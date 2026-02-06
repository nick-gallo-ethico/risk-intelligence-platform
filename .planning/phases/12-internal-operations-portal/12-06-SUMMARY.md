---
phase: 12-internal-operations-portal
plan: 06
subsystem: operations
tags:
  - impersonation
  - cross-tenant
  - audit
  - middleware
  - nestjs
requires:
  - 12-01 (internal operations schema)
provides:
  - ImpersonationService
  - ImpersonationGuard
  - ImpersonationMiddleware
  - ImpersonationController
  - ImpersonationModule
affects:
  - 12-07 (support console)
  - All internal operations endpoints requiring impersonation
tech-stack:
  added: []
  patterns:
    - express-request-context
    - rls-context-override
    - session-based-audit
    - decorator-based-guards
key-files:
  created:
    - apps/backend/src/modules/operations/impersonation/impersonation.service.ts
    - apps/backend/src/modules/operations/impersonation/impersonation.guard.ts
    - apps/backend/src/modules/operations/impersonation/impersonation.middleware.ts
    - apps/backend/src/modules/operations/impersonation/impersonation.controller.ts
    - apps/backend/src/modules/operations/impersonation/impersonation.module.ts
    - apps/backend/src/modules/operations/impersonation/index.ts
    - apps/backend/src/modules/operations/impersonation/dto/impersonation.dto.ts
  modified:
    - apps/backend/src/modules/operations/operations.module.ts
    - apps/backend/src/modules/operations/index.ts
decisions:
  - "12-06: Uses Express request context (req.impersonation) instead of nestjs-cls since cls not installed"
  - "12-06: RLS override via SET LOCAL app.current_organization with parameterized query"
  - "12-06: Response headers X-Impersonation-Remaining and X-Impersonation-Org for client UI timer"
  - "12-06: Temporary X-Internal-User-Id header for development until InternalAuthGuard implemented"
  - "12-06: ImpersonationMiddleware applied globally to all routes via forRoutes('*')"
metrics:
  duration: 18 min
  completed: 2026-02-06
---

# Phase 12 Plan 06: Impersonation Service Summary

**One-liner:** Cross-tenant impersonation service with session management, RLS context override, and full audit logging for Internal Operations Portal.

## What Was Built

### ImpersonationService (Core Session Management)
Complete session lifecycle management for cross-tenant access:

- **startSession()** - Create session with operator validation, reason requirement, 4-hour max duration
- **endSession()** - Terminate session with optional notes
- **validateSession()** - Check session validity (exists, not ended, not expired)
- **logAction()** - Audit log entries during impersonation
- **getSessionAuditLogs()** - Retrieve action history for a session
- **getOrganizationAuditLogs()** - SOC 2 compliance queries for tenant access history
- **getActiveSessions()** - List operator's current active sessions

### ImpersonationMiddleware (Context Setup)
Express middleware that detects and sets impersonation context:

- Reads `X-Impersonation-Session` header
- Validates session with ImpersonationService
- Sets `req.impersonation` context on Express request
- Overrides RLS tenant context via `SET LOCAL app.current_organization`
- Adds response headers for client UI:
  - `X-Impersonation-Remaining`: Seconds until expiration
  - `X-Impersonation-Org`: Target organization ID
  - `X-Impersonation-Invalid`: Set if session invalid/expired

### ImpersonationGuard (Route Protection)
Guard for routes requiring active impersonation:

- Throws ForbiddenException if no session or invalid session
- Ensures `req.impersonation` context is set
- Works with middleware (validates if already set, sets if not)

### Decorators and Helpers
Developer ergonomics for controller authors:

- `@RequireImpersonation()` - Decorator combining UseGuards with ImpersonationGuard
- `@CurrentImpersonation()` - Parameter decorator to inject ImpersonationContext
- `isImpersonating(req)` - Helper to check if request has active impersonation
- `getEffectiveOrganizationId(req)` - Get impersonated org or original org

### ImpersonationController (REST API)
Full REST endpoints for session management:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/internal/impersonation/sessions` | POST | Start session |
| `/api/v1/internal/impersonation/sessions/:id` | DELETE | End session |
| `/api/v1/internal/impersonation/sessions/:id` | GET | Get session details |
| `/api/v1/internal/impersonation/sessions/:id/validate` | POST | Validate session |
| `/api/v1/internal/impersonation/sessions/:id/audit` | GET | Get audit logs |
| `/api/v1/internal/impersonation/my-sessions` | GET | Get operator's sessions |

## Key Architecture Decisions

1. **Express Request Context**: Uses `req.impersonation` instead of nestjs-cls since the library wasn't installed. This aligns with existing TenantMiddleware pattern.

2. **RLS Override**: Uses `SET LOCAL app.current_organization` to override tenant context during impersonation. Uses parameterized query via `$executeRawUnsafe` for security.

3. **Response Headers**: Adds impersonation status headers (`X-Impersonation-Remaining`, `X-Impersonation-Org`) so frontend can display session timer without polling.

4. **Development Auth**: Temporary `X-Internal-User-Id` header for testing until InternalAuthGuard is implemented. Controller checks `req.internalUser?.id` first (future), then falls back to header.

5. **Global Middleware**: ImpersonationMiddleware runs on all routes (`forRoutes('*')`) but only activates when header is present. No-op for normal requests.

## Files Created

| File | Purpose |
|------|---------|
| `dto/impersonation.dto.ts` | StartSessionDto, EndSessionDto with class-validator |
| `impersonation.service.ts` | Session lifecycle, audit logging, permission checks |
| `impersonation.middleware.ts` | Context setup, RLS override, response headers |
| `impersonation.guard.ts` | Route protection, decorators |
| `impersonation.controller.ts` | REST API endpoints |
| `impersonation.module.ts` | NestJS module registration |
| `index.ts` | Clean exports for consumers |

## Usage Example

```typescript
// Controller requiring impersonation
@Controller('api/v1/internal/support')
export class SupportController {
  @Get('cases')
  @RequireImpersonation()
  async getCases(
    @CurrentImpersonation() ctx: ImpersonationContext,
    @Req() req: Request,
  ) {
    // ctx.targetOrganizationId is the impersonated tenant
    // RLS is already set to this tenant
    const cases = await this.casesService.findAll();

    // Log the action
    await this.impersonationService.logAction(
      ctx.sessionId,
      'VIEW_CASES',
      'CASE',
      null,
      { count: cases.length }
    );

    return cases;
  }
}
```

## Commits

| Hash | Description |
|------|-------------|
| d7ccecd | feat(12-06): add ImpersonationService with session lifecycle |
| 487e1b1 | feat(12-06): add ImpersonationMiddleware and ImpersonationGuard |
| dcc2388 | feat(12-06): add ImpersonationController and ImpersonationModule |

## Deviations from Plan

### Adaptation: Express Request Context Instead of nestjs-cls

**Found during:** Task 1 implementation

**Issue:** Plan referenced nestjs-cls for continuation-local storage, but it's not installed in the project. The existing codebase uses Express request object for context (see TenantMiddleware).

**Fix:** Implemented using Express request context pattern:
- Extended Express.Request interface with `impersonation?: ImpersonationContext`
- Middleware sets `req.impersonation` instead of `cls.set('impersonation', ...)`
- Guard reads from `req.impersonation` instead of `cls.get('impersonation')`

**Files affected:** All impersonation module files

**Rationale:** Consistent with existing TenantMiddleware pattern, avoids adding new dependency.

## Verification Results

- TypeScript compiles without errors in impersonation module
- ESLint passes (0 errors, pre-existing warnings only)
- ImpersonationModule registered in OperationsModule
- Exports available from `@/modules/operations/impersonation`

## Next Phase Readiness

Ready for 12-07 (Support Console):
- ImpersonationService provides session context for cross-tenant operations
- ImpersonationGuard protects routes requiring impersonation
- Middleware automatically handles context setup from headers
- Audit logging infrastructure ready for action tracking

## Security Considerations

1. **4-hour max duration**: Sessions automatically expire after 4 hours regardless of activity
2. **Reason required**: Session creation enforces minimum 10-character reason
3. **Permission validation**: Only roles with IMPERSONATE permission can create sessions
4. **Full audit trail**: Every session start, end, and action is logged
5. **RLS enforcement**: Tenant context is set at database level, not just application level
