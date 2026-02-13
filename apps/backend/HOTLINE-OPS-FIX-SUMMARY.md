# Hotline Operations Module Registration Fix

## Problem Summary

The Hotline Operations module was implemented but all API endpoints returned 404 errors. Frontend was attempting to call:

- `GET /api/v1/internal/hotline-ops/qa-queue?status=PENDING`
- `GET /api/v1/internal/hotline-ops/directives?includeInactive=true`
- `GET /api/v1/internal/hotline-ops/operator-status`

Backend services existed but routes were not accessible.

## Root Causes Identified

### Issue 1: Double Route Prefix

**Problem:** Controller had full path including global prefix

```typescript
// WRONG - resulted in /api/v1/api/v1/internal/hotline-ops
@Controller("api/v1/internal/hotline-ops")
```

**Root Cause:** The `main.ts` file sets a global prefix `"api/v1"` for all routes (line 58-60). Controllers should NOT include this prefix in their decorator.

**Fix Applied:**

```typescript
// CORRECT - global prefix "api/v1" is automatically added
@Controller("internal/hotline-ops")
```

**File Modified:** `apps/backend/src/modules/operations/hotline-ops/hotline-ops.controller.ts`

### Issue 2: Missing TenantMiddleware Exclusion

**Problem:** Internal routes were not excluded from tenant middleware

**Root Cause:** TenantMiddleware exclusion pattern in `app.module.ts` only excluded `"api/v1/operations/(.*)"` but the actual route path is `"api/v1/internal/hotline-ops"`.

**Fix Applied:** Added exclusion pattern for all internal routes

```typescript
// Before
.exclude(
  "health",
  "api/v1/auth/(.*)",
  "api/v1/public/(.*)",
  "api/v1/operations/(.*)",  // ← Missing "api/v1/internal/(.*)"
  "admin/(.*)",
)

// After
.exclude(
  "health",
  "api/v1/auth/(.*)",
  "api/v1/public/(.*)",
  "api/v1/internal/(.*)",     // ← Added for internal operations
  "api/v1/operations/(.*)",   // ← Legacy pattern (kept for compatibility)
  "admin/(.*)",
)
```

**File Modified:** `apps/backend/src/app.module.ts`

## Module Registration Verification

### ✓ Module Structure Confirmed

1. **HotlineOpsModule** exists and exports:
   - `HotlineOpsController` (registered in controllers array)
   - `DirectiveAdminService`
   - `BulkQaService`
   - `OperatorStatusService`

2. **OperationsModule** correctly imports HotlineOpsModule:

   ```typescript
   imports: [
     // ... other modules
     HotlineOpsModule, // ← Properly imported
   ];
   ```

3. **AppModule** correctly imports OperationsModule:

   ```typescript
   imports: [
     // ... other modules
     OperationsModule, // ← Properly imported (line 115)
   ];
   ```

4. **TenantMiddleware** now excludes internal routes

## Expected Endpoint Paths (After Fix)

All endpoints now accessible at:

### Directive Management

- `GET    /api/v1/internal/hotline-ops/directives`
- `GET    /api/v1/internal/hotline-ops/directives/pending-drafts`
- `GET    /api/v1/internal/hotline-ops/directives/:id`
- `POST   /api/v1/internal/hotline-ops/directives`
- `PATCH  /api/v1/internal/hotline-ops/directives/:id`
- `DELETE /api/v1/internal/hotline-ops/directives/:id`

### QA Queue

- `GET    /api/v1/internal/hotline-ops/qa-queue`
- `GET    /api/v1/internal/hotline-ops/qa-queue/stats`
- `GET    /api/v1/internal/hotline-ops/qa-queue/reviewer-metrics`
- `POST   /api/v1/internal/hotline-ops/qa-queue/bulk-action`
- `POST   /api/v1/internal/hotline-ops/qa-queue/:riuId/assign`

### Operator Status

- `GET    /api/v1/internal/hotline-ops/operator-status`
- `GET    /api/v1/internal/hotline-ops/operator-status/by-language/:language`
- `GET    /api/v1/internal/hotline-ops/operator-status/available`
- `GET    /api/v1/internal/hotline-ops/operator-status/:operatorId`
- `PATCH  /api/v1/internal/hotline-ops/operator-status/:operatorId`
- `DELETE /api/v1/internal/hotline-ops/operator-status/:operatorId`

## Verification Steps Performed

1. ✓ Type checking passes (`npx tsc --noEmit`)
2. ✓ Module imports verified (HotlineOpsModule → OperationsModule → AppModule)
3. ✓ Controller registration verified
4. ✓ Route prefix corrected (removed double prefix)
5. ✓ Middleware exclusion pattern added
6. ✓ Module structure verification script created and executed

## Files Modified

1. `apps/backend/src/modules/operations/hotline-ops/hotline-ops.controller.ts`
   - Changed: `@Controller("api/v1/internal/hotline-ops")` → `@Controller("internal/hotline-ops")`

2. `apps/backend/src/app.module.ts`
   - Added: `"api/v1/internal/(.*)"` to TenantMiddleware exclusion patterns

## Verification Script Created

Created `apps/backend/verify-hotline-ops-routes.js` to verify:

- Module file existence
- Controller registration in HotlineOpsModule
- HotlineOpsModule import in OperationsModule
- OperationsModule import in AppModule
- Correct route prefix pattern
- TenantMiddleware exclusion pattern

Run with: `node verify-hotline-ops-routes.js`

## Next Steps for Testing

To fully verify the fix:

1. Start the backend server:

   ```bash
   cd apps/backend
   npm run start:dev
   ```

2. Test endpoint access (once auth is implemented):

   ```bash
   curl http://localhost:3000/api/v1/internal/hotline-ops/qa-queue
   curl http://localhost:3000/api/v1/internal/hotline-ops/directives
   curl http://localhost:3000/api/v1/internal/hotline-ops/operator-status
   ```

3. Expected response: 401 Unauthorized (auth required) or 200 OK with data
4. NOT expected: 404 Not Found

## Lessons Learned

1. **Always check global prefix settings** - When using `app.setGlobalPrefix()`, controllers should NOT include that prefix in their `@Controller()` decorator.

2. **Middleware exclusion patterns must match actual routes** - The exclusion pattern must match the final route path (after global prefix is applied).

3. **Module structure verification is critical** - Even if TypeScript compiles, runtime module registration can fail silently if imports are missing.

4. **Route naming conventions matter** - Using consistent prefixes (e.g., `/internal/` for all internal operations) makes middleware configuration easier.

## Architecture Notes

The Hotline Operations module is part of the Internal Operations Portal (Phase 12) and operates **cross-tenant** with elevated permissions:

- **Authentication:** InternalUser (Azure AD SSO) - NOT tenant User
- **Tenant Isolation:** NOT enforced (cross-tenant access required)
- **Security Model:** Impersonation session + audit logging
- **Middleware:** Excluded from TenantMiddleware (handled by InternalAuthGuard instead)

This is why the `api/v1/internal/*` exclusion pattern is critical - these endpoints must NOT have tenant context injected.
