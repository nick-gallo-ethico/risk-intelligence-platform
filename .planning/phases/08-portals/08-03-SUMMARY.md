---
phase: 08
plan: 03
subsystem: operator-console
tags: [operator, phone-lookup, qa-config, client-profile]
status: complete

dependency-graph:
  requires: []
  provides: [ClientProfileService, phone-lookup, qa-review-check]
  affects: [08-05, 08-06, 08-07]

tech-stack:
  added: []
  patterns: [cross-tenant-access, E164-normalization, QA-mode-evaluation]

key-files:
  created:
    - apps/backend/src/modules/portals/operator/client-profile.service.ts
    - apps/backend/src/modules/portals/operator/client-profile.controller.ts
    - apps/backend/src/modules/portals/operator/dto/client-profile.dto.ts
  modified:
    - apps/backend/src/modules/portals/operator/operator-portal.module.ts

decisions:
  - key: bypassRLS-for-operators
    choice: Use prisma.withBypassRLS() for all operator phone lookup operations
    rationale: Operators need cross-tenant access to identify clients by phone number

  - key: phone-normalization
    choice: Normalize all phone numbers to E.164 format (+1XXXXXXXXXX)
    rationale: E.164 is the international standard for phone number storage

  - key: qa-mode-evaluation-order
    choice: Category overrides -> Keyword triggers -> Default mode
    rationale: More specific rules should take precedence over general defaults

  - key: sample-mode-implementation
    choice: Use Math.random() for QA sampling
    rationale: Simple and statistically valid for percentage-based sampling

metrics:
  duration: 13 min
  completed: 2026-02-04
---

# Phase 8 Plan 03: Client Profile Service Summary

**One-liner:** Phone-to-client lookup with QA mode evaluation for hotline operators

## What Was Built

### ClientProfileService
Service enabling operators to identify clients and load their full configuration:

1. **findByPhoneNumber(phone: string)** - Look up client by incoming phone number
   - Normalizes phone to E.164 format
   - Uses bypassRLS for cross-tenant access
   - Returns full ClientProfile or null

2. **getClientProfile(organizationId: string)** - Load complete client configuration
   - Organization details
   - QA configuration
   - Active hotline numbers
   - Active categories (CASE and ALL modules)
   - Tenant branding

3. **requiresQaReview(orgId, categoryId, content)** - Determine if report needs QA
   - Evaluates QA mode (ALL, RISK_BASED, SAMPLE, NONE)
   - Checks category overrides
   - Scans for keyword triggers
   - Returns QaCheckResult with reason

4. **normalizePhoneNumber(phone: string)** - Convert various formats to E.164
   - Handles: (800) 555-1234, 800-555-1234, 8005551234, +18005551234

### ClientProfileController
Two controllers with role-based access:

**ClientLookupController** (OPERATOR role):
- `GET /api/v1/operator/lookup/phone/:phoneNumber` - Phone lookup
- `GET /api/v1/operator/clients/:clientId/profile` - Full profile
- `GET /api/v1/operator/clients` - Paginated client list

**ClientAdminController** (SYSTEM_ADMIN role):
- `POST /api/v1/admin/clients/:clientId/hotline-numbers` - Add number
- `DELETE /api/v1/admin/clients/:clientId/hotline-numbers/:numberId` - Remove number
- `PUT /api/v1/admin/clients/:clientId/qa-config` - Update QA config

### DTOs
- **CreateHotlineNumberDto** - E.164 format validation
- **UpdateQaConfigDto** - QA mode, sample percentage, keywords, overrides
- **ListClientsQueryDto** - Search and pagination parameters

## Key Patterns

### QA Mode Evaluation
```typescript
// Evaluation order:
// 1. Category override (if exists)
// 2. Keyword triggers (any mode except NONE)
// 3. Default mode evaluation

switch (mode) {
  case QaMode.ALL: return { requiresQa: true, reason: "mode_all" };
  case QaMode.NONE: return { requiresQa: false, reason: "mode_none" };
  case QaMode.RISK_BASED:
    return { requiresQa: highRiskCategories.includes(categoryId), ... };
  case QaMode.SAMPLE:
    return { requiresQa: Math.random() * 100 < samplePercentage, ... };
}
```

### Phone Number Normalization
```typescript
normalizePhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.length === 10) return `+1${digitsOnly}`;  // US without code
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1"))
    return `+${digitsOnly}`;  // US with code
  return `+${digitsOnly}`;  // International
}
```

### Cross-Tenant Access Pattern
```typescript
// Operators need to look up ANY client organization
const hotlineNumber = await this.prisma.withBypassRLS(async () => {
  return this.prisma.hotlineNumber.findFirst({
    where: { phoneNumber: normalized, isActive: true },
    include: { organization: true },
  });
});
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| d63deb9 | feat | HotlineNumber and ClientQaConfig Prisma models |
| b116fc8 | feat | ClientProfileService with phone lookup |
| dc60e4d | feat | ClientProfileController and module update |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. Prisma schema validated successfully
2. TypeScript compilation passes for all client-profile files
3. Phone normalization handles all common US formats
4. QA check logic covers all modes and override scenarios

## Next Phase Readiness

**Ready for:**
- 08-05: Call Intake Form - will use ClientProfileService to load categories
- 08-06: QA Review Queue - will use requiresQaReview() for routing
- 08-07: Report Submission - will use ClientProfileService for client context

**Dependencies satisfied:**
- Phone lookup endpoint available for operator console
- QA configuration queryable per client
- Category list with high-risk flags ready for intake forms
