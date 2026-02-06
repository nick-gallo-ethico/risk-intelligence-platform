---
phase: 12-internal-operations-portal
plan: 18
subsystem: backend-infrastructure
tags: [websocket, e2e-testing, auth, dataloader, performance, database]
requires:
  - 12-05 (NotificationGateway)
  - 12-06 (AI Gateway)
provides:
  - WebSocket E2E testing infrastructure
  - JwtWsGuard for WebSocket authentication
  - TokenRefreshService for token management
  - DataLoader pattern for N+1 resolution
  - Database indexes for query optimization
affects:
  - All WebSocket consumers
  - Services using token refresh
  - Services with N+1 query patterns
tech-stack:
  added: [dataloader, socket.io-client]
  patterns: [request-scoped-dataloader, token-rotation, graceful-ws-refresh]
key-files:
  created:
    - apps/backend/test/e2e/test-helpers.ts
    - apps/backend/test/e2e/websocket.e2e-spec.ts
    - apps/backend/test/e2e/ai-gateway.e2e-spec.ts
    - apps/backend/src/modules/auth/guards/jwt-ws.guard.ts
    - apps/backend/src/modules/auth/services/token-refresh.service.ts
    - apps/backend/src/common/dataloader/dataloader.factory.ts
    - apps/backend/src/common/interceptors/dataloader.interceptor.ts
    - apps/backend/prisma/migrations/20260206_add_indexes/migration.sql
  modified:
    - apps/backend/src/modules/auth/guards/index.ts
    - apps/backend/src/common/index.ts
    - apps/backend/package.json
decisions:
  - key: ws-token-refresh
    choice: 5-minute grace period for WebSocket token refresh
    rationale: Allows seamless reconnection without forcing immediate re-auth
  - key: dataloader-scope
    choice: Request-scoped DataLoaders via interceptor
    rationale: Ensures proper isolation between requests while enabling batching
  - key: index-strategy
    choice: CONCURRENTLY option for all index creation
    rationale: Prevents table locks during migration on production databases
metrics:
  duration: 25 min
  completed: 2026-02-06
---

# Phase 12 Plan 18: Backend Tech Debt - WebSocket E2E Testing, Token Refresh, DataLoader Pattern Summary

WebSocket E2E testing infrastructure, token refresh improvements, and DataLoader pattern for N+1 query resolution.

## One-liner

E2E tests for WebSocket/AI gateways with JwtWsGuard auth, TokenRefreshService with 5-min grace period, and DataLoader pattern eliminating N+1 queries.

## What Was Built

### Task 1: WebSocket E2E Tests (0b5e6f3)

Created comprehensive E2E testing infrastructure for WebSocket connections:

**test-helpers.ts:**
- `createTestApp()` - Full NestJS application initialization for E2E tests
- `createTestUser()` - Creates test user with organization and valid JWT token
- `generateToken()` - Custom token generation for testing edge cases
- `cleanupTestData()` - Proper cleanup to avoid test pollution
- `waitForEvent()` - Async helper for WebSocket event waiting with timeout
- `waitForConnect()` / `waitForDisconnect()` - Connection state helpers
- `delay()` - Timing helper for async tests

**websocket.e2e-spec.ts (20+ test cases):**
- Connection authentication (valid/invalid/expired tokens)
- Connection lifecycle and reconnection handling
- Room subscription and unread count events
- Poll fallback (get_recent) for background tabs
- Error handling for malformed events
- Tenant isolation between organizations
- Multiple connections from same user

### Task 2: AI Gateway E2E Tests + Auth Services (42e9f0f)

**ai-gateway.e2e-spec.ts:**
- Connection with auth context validation
- Chat streaming (message_start, stop events)
- Conversation control (pause/resume)
- Skill execution with timeout handling
- Action execution with error cases
- Tenant isolation verification

**JwtWsGuard:**
```typescript
// Key features:
- Token extraction: auth object > Authorization header > query param
- Proactive refresh notification before token expires
- Detailed error codes: UNAUTHORIZED, TOKEN_EXPIRED, INVALID_TOKEN
- User data attachment to socket.data for downstream use
- Emits auth:refresh-needed 60s before expiry
```

**TokenRefreshService:**
```typescript
// Key features:
- Standard refresh token flow with rotation
- WebSocket session refresh with 5-minute grace period
- User status validation (blocks inactive users)
- Session revocation methods
- Detailed error codes for client handling
```

### Task 3: DataLoader Pattern + Database Indexes (3bd333c)

**DataLoader Factory:**
- `userLoader` - Batch user lookups
- `organizationLoader` - Batch organization lookups
- `caseRiuAssociationsLoader` - Load RIU associations by case ID
- `caseCreatorLoader` - Load case creator users
- `investigationNotesLoader` - Load investigation notes
- `investigationPrimaryInvestigatorLoader` - Load lead investigators
- `categoryLoader` - Batch category lookups
- `caseLoader` / `investigationLoader` - Entity lookups

**DataLoaderInterceptor:**
- Creates request-scoped DataLoaders automatically
- Supports both HTTP and WebSocket contexts
- `GetDataLoaders()` decorator for controller injection

**Database Indexes (40+ indexes):**
- **Cases:** org+status, org+created_at DESC, org+priority+status, org+category
- **RIUs:** org+status, org+created_at DESC, case_id
- **Investigations:** case_id, org+status, org+primary_investigator
- **AuditLog:** org+created_at DESC, entity lookup, actor+created_at
- **Notifications:** user+read+created_at DESC for unread queries
- **Sessions:** expires_at (for cleanup), user+created_at (active sessions)
- **Campaigns:** org+status, user+status (assignments)
- **Internal Ops:** impersonation sessions, implementation projects, health scores

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Schema Mismatch] Fixed DataLoader field references**
- **Found during:** Task 3 type check
- **Issue:** Original plan assumed `caseId` on RIU and `assigneeId` on Case
- **Fix:** Changed to use `riuCaseAssociations` join table and `createdById`
- **Files modified:** dataloader.factory.ts
- **Commit:** 3bd333c (amended)

## Technical Details

### WebSocket Testing Pattern
```typescript
// Test helper usage
const { user, tenant } = await createTestUser(prisma, jwtService, {
  role: 'INVESTIGATOR'
});

socket = io(`${WS_URL}/notifications`, {
  auth: { token: user.token },
  transports: ['websocket'],
});

const result = await waitForEvent<{ unreadCount: number }>(
  socket,
  'notification:unread_count',
  5000
);
```

### Token Refresh Grace Period
```typescript
// WebSocket tokens can be refreshed up to 5 minutes after expiry
// This prevents disconnection during brief network issues
const wsGracePeriodMs = 5 * 60 * 1000;

if (Date.now() > expiredAt + wsGracePeriodMs) {
  return { success: false, error: 'Token too old for WebSocket refresh' };
}
```

### DataLoader Usage
```typescript
@Controller('cases')
@UseInterceptors(DataLoaderInterceptor)
export class CasesController {
  @Get()
  async findAll(@GetDataLoaders() loaders: DataLoaders) {
    const cases = await this.service.findAll();
    // N+1 resolved: single query for all creators
    const creators = await Promise.all(
      cases.map(c => loaders.caseCreatorLoader.load(c.createdById))
    );
  }
}
```

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| socket.io-client | ^4.x | WebSocket E2E testing |
| dataloader | ^2.x | N+1 query resolution |

## Files Created/Modified

| File | Lines | Purpose |
|------|-------|---------|
| test/e2e/test-helpers.ts | ~310 | E2E testing utilities |
| test/e2e/websocket.e2e-spec.ts | ~630 | WebSocket gateway tests |
| test/e2e/ai-gateway.e2e-spec.ts | ~520 | AI gateway tests |
| auth/guards/jwt-ws.guard.ts | ~195 | WebSocket JWT authentication |
| auth/services/token-refresh.service.ts | ~290 | Token refresh management |
| common/dataloader/dataloader.factory.ts | ~345 | DataLoader factory |
| common/interceptors/dataloader.interceptor.ts | ~115 | Request-scoped injection |
| prisma/migrations/20260206_add_indexes/migration.sql | ~165 | Database indexes |

## Verification

- [x] Backend TypeScript compilation passes
- [x] WebSocket E2E test file recognized by Jest
- [x] AI Gateway E2E test file recognized by Jest
- [x] JwtWsGuard exports correctly
- [x] TokenRefreshService exports correctly
- [x] DataLoader factory compiles with correct schema references
- [x] Database migration SQL is valid PostgreSQL

## Next Phase Readiness

This plan provides testing and optimization infrastructure for:
- All WebSocket gateways now have E2E testing patterns
- Token refresh can be integrated into existing auth flows
- DataLoader can be applied to any service with N+1 patterns
- Database indexes ready for migration on production

## Integration Notes

### To use DataLoader in a service:
1. Apply `@UseInterceptors(DataLoaderInterceptor)` to controller
2. Add `@GetDataLoaders() loaders: DataLoaders` parameter
3. Use `loaders.userLoader.load(userId)` instead of direct queries

### To run WebSocket E2E tests:
```bash
npm run test:e2e -- websocket.e2e-spec.ts
npm run test:e2e -- ai-gateway.e2e-spec.ts
```

### To apply database indexes:
```bash
npx prisma migrate deploy
```
