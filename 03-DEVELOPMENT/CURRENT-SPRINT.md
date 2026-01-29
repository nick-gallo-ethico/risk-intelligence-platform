# Current Sprint

**Focus:** Tier 1 - Foundation
**Slice:** 1.1 Authentication & Multi-Tenancy
**Started:** 2026-01-29

---

## Completed
- [x] Create Prisma schema for User, Organization, Session
  - **Context:** `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
  - **Verified:** `npx prisma validate` + migration applied
- [x] Run database migration (`20260129213317_init`)
- [x] Seed test data (Acme Corp org + 4 test users)
- [x] Verify backend health endpoint works
- [x] Create AuthModule with JWT strategy
  - **Files created:**
    - `src/modules/prisma/prisma.service.ts` - Database access with RLS support
    - `src/modules/prisma/prisma.module.ts` - Global Prisma module
    - `src/modules/auth/auth.module.ts` - Auth module wiring
    - `src/modules/auth/auth.service.ts` - Login, refresh, logout logic
    - `src/modules/auth/auth.controller.ts` - REST endpoints
    - `src/modules/auth/strategies/jwt.strategy.ts` - Passport JWT validation
    - `src/modules/auth/dto/*.ts` - Request/response DTOs
    - `src/modules/auth/interfaces/jwt-payload.interface.ts` - Token types
  - **Verified:** All endpoints tested and working

## In Progress
- [ ] Add RLS policies to PostgreSQL
- [ ] Update TenantMiddleware to set RLS context from JWT

## Up Next
- [ ] Create protected test endpoint to verify RLS
- [ ] Add frontend login page with API integration
- [ ] Implement logout functionality on frontend

---

## Blocked
(none)

---

## Context for This Sprint

**Reference files:**
- Entity pattern: `CLAUDE.md` → Development Patterns section
- Auth spec: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md`
- Core data model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`

**Notes:**
- Building auth first - all other slices depend on this
- RLS policies ensure tenant isolation at database level
- JWT must include organizationId for tenant context

**Test credentials:**
- `admin@acme.local` / `Password123!` / SYSTEM_ADMIN
- `compliance@acme.local` / `Password123!` / COMPLIANCE_OFFICER
- `investigator@acme.local` / `Password123!` / INVESTIGATOR
- `employee@acme.local` / `Password123!` / EMPLOYEE

---

## History

| Date | What | Commit |
|------|------|--------|
| 2026-01-29 | Sprint initialized with Slice 1.1 | — |
| 2026-01-29 | Infrastructure verified: Docker, DB migration, seed, backend/frontend running | — |
| 2026-01-29 | AuthModule complete: login, refresh, logout, JWT validation | — |
