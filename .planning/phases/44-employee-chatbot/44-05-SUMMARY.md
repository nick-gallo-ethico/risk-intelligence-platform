---
phase: 44-employee-chatbot
plan: 05
subsystem: chatbot
tags: [case-status, rate-limiting, security, anonymous-access]
dependency-graph:
  requires: [44-02, 44-03]
  provides: [CaseStatusService, caseStatusSkill]
  affects: [44-07, 44-08, 44-10]
tech-stack:
  added: []
  patterns: [rate-limiting, ip-masking, access-code-normalization]
key-files:
  created:
    - apps/backend/src/modules/chatbot/services/case-status.service.ts
    - apps/backend/src/modules/ai/skills/chatbot/case-status.skill.ts
  modified:
    - apps/backend/src/modules/chatbot/chatbot.module.ts
    - apps/backend/src/modules/chatbot/services/index.ts
    - apps/backend/src/modules/ai/skills/chatbot/index.ts
    - apps/backend/src/modules/ai/skills/skill.registry.ts
    - apps/backend/src/modules/chatbot/services/escalation.service.ts
decisions:
  - id: case-status-rate-limit
    decision: "5 attempts per IP per 15 minutes for access code lookups"
    rationale: "Balance security against brute-force enumeration with usability for legitimate users"
  - id: ip-masking
    decision: "Mask last octet (IPv4) or segment (IPv6) in logs"
    rationale: "Privacy protection while maintaining security monitoring capability"
  - id: new-messages-check
    decision: "Check CaseMessage.OUTBOUND direction with isRead=false"
    rationale: "Outbound messages are from investigators to reporter; unread indicates new messages"
metrics:
  duration: "27 minutes"
  completed: "2026-03-03"
---

# Phase 44 Plan 05: CaseStatusSkill for Anonymous Case Status Lookup - Summary

Rate-limited case status lookup via access code for anonymous reporters with hasNewMessages indicator.

## What Changed

### CaseStatusService (apps/backend/src/modules/chatbot/services/case-status.service.ts)

Created secure case status lookup service with:

1. **Rate Limiting**: 5 attempts per IP per 15 minute window
   - In-memory Map-based rate limiter (Redis for production multi-instance)
   - Tracks attempts per IP with sliding window
   - Clears rate limit state on successful lookup

2. **Access Code Handling**:
   - Normalization: uppercase, remove dashes/spaces
   - Validation: 12 alphanumeric character format (XXX-XXXX-XXXX)
   - Case-insensitive matching

3. **Security Features**:
   - IP masking in logs (192.168.1.xxx for IPv4)
   - Failed attempt logging for security monitoring
   - Minimal data exposure (referenceNumber, status, statusLabel, lastUpdated)

4. **New Messages Check**:
   - Queries CaseMessage with OUTBOUND direction and isRead=false
   - Returns hasNewMessages boolean for UI indicator

### CaseStatusSkill (apps/backend/src/modules/ai/skills/chatbot/case-status.skill.ts)

Created chatbot skill for case status lookup:

- **Skill ID**: `case-status`
- **Scope**: PLATFORM (available everywhere)
- **Permissions**: None (available to anonymous users)
- **Entity Types**: `['chatbot', 'employee-chatbot']`

**Input Schema**:

```typescript
{
  accessCode: string,    // 10-16 chars (handles dashes)
  ipAddress?: string     // For rate limiting
}
```

**Output Schema**:

```typescript
{
  found: boolean,
  referenceNumber?: string,
  status?: string,
  statusLabel?: string,
  lastUpdated?: Date,
  hasNewMessages?: boolean,
  error?: string,
  rateLimited?: boolean,
  attemptsRemaining?: number
}
```

### Module Registration

- Exported CaseStatusService from `services/index.ts`
- Registered CaseStatusService in ChatbotModule providers/exports
- Exported caseStatusSkill from `skills/chatbot/index.ts`
- Registered caseStatusSkill in SkillRegistry with optional dependency injection
- Verified `case-status` is in EmployeeChatbotAgent's defaultSkills array

## Decisions Made

| Decision                  | Choice             | Rationale                                              |
| ------------------------- | ------------------ | ------------------------------------------------------ |
| Rate limit threshold      | 5/15min            | Prevents brute-force while allowing legitimate retries |
| Rate limit storage        | In-memory Map      | Simple for single instance; Redis for production scale |
| IP masking                | Last octet/segment | Privacy while maintaining debugging ability            |
| Success clears rate limit | Yes                | Rewards valid access codes, doesn't punish typos       |
| Access code format        | 12 alphanumeric    | Matches existing Case.anonymousAccessCode field        |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed escalation.service.ts type error**

- **Found during:** Task 3 build verification
- **Issue:** `Prisma.JsonNull` not assignable to conversationHistory field type
- **Fix:** Changed to `undefined` when conversationHistory is not present
- **Files modified:** apps/backend/src/modules/chatbot/services/escalation.service.ts
- **Commit:** 5dbc640b

## Verification Results

```bash
# Build verification
cd apps/backend && npm run build  # Passes

# Lint verification (my files only)
npx eslint src/modules/chatbot/services/case-status.service.ts \
  src/modules/ai/skills/chatbot/case-status.skill.ts  # Clean

# TypeScript
npx tsc --noEmit  # Passes
```

## Commits

| Hash     | Message                                                         |
| -------- | --------------------------------------------------------------- |
| 3202cc55 | feat(44-04): add FaqMatchSkill (includes CaseStatusService)     |
| 23da982a | feat(44-05): create CaseStatusSkill for anonymous status lookup |
| 5dbc640b | feat(44-05): register CaseStatusService and skill               |

## API Surface

### CaseStatusService

```typescript
class CaseStatusService {
  lookupByAccessCode(
    accessCode: string,
    ipAddress: string,
  ): Promise<CaseStatusResult>;
}
```

### SkillRegistry Integration

```typescript
// Skill registered in SkillRegistry.registerChatbotSkills()
if (this.caseStatusService) {
  this.registerSkill(
    caseStatusSkill(this.caseStatusService) as SkillDefinition,
  );
}
```

## Security Considerations

1. **Brute-force protection**: Rate limiting prevents enumeration attacks
2. **Privacy**: IP addresses masked in logs, minimal case data exposed
3. **Logging**: Failed attempts logged for security monitoring
4. **No sensitive data**: Only referenceNumber, status, dates - no details

## Next Phase Readiness

Plan 44-05 is complete. Ready for:

- **44-07**: Disclosure guidance skill can follow same pattern
- **44-08**: Chatbot gateway integration (uses these skills)
- **44-10**: ChatbotController API endpoints
