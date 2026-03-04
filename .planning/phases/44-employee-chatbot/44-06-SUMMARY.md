---
phase: 44-employee-chatbot
plan: 06
subsystem: chatbot
tags: [escalation, inquiry, compliance-team, chatbot-skills, prisma]

# Dependency graph
requires:
  - phase: 44-02
    provides: FAQ and Consent services for chatbot
  - phase: 44-03
    provides: EmployeeChatbotAgent for skill integration
provides:
  - ChatbotInquiry Prisma model for escalation tracking
  - EscalationService for inquiry lifecycle management
  - EscalateSkill for chatbot integration
affects: ["44-07", "44-08", "44-09", "44-10"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optional dependency injection for cross-module skills
    - Category/priority auto-detection from question keywords
    - Conversation context capture for compliance review

key-files:
  created:
    - apps/backend/prisma/schema.prisma (ChatbotInquiry model, InquiryPriority, InquiryStatus enums)
    - apps/backend/src/modules/chatbot/entities/chatbot-inquiry.entity.ts
    - apps/backend/src/modules/chatbot/services/escalation.service.ts
    - apps/backend/src/modules/ai/skills/chatbot/escalate.skill.ts
  modified:
    - apps/backend/src/modules/chatbot/entities/index.ts
    - apps/backend/src/modules/chatbot/services/index.ts
    - apps/backend/src/modules/chatbot/chatbot.module.ts
    - apps/backend/src/modules/ai/skills/chatbot/index.ts
    - apps/backend/src/modules/ai/skills/skill.registry.ts

key-decisions:
  - "ConversationHistory passed via skill input (not fetched) to avoid circular dependency with ConversationService"
  - "Category auto-detection uses simple keyword matching (gift, conflict, harassment, etc.)"
  - "Priority auto-detection uses urgency signals (urgent, immediate, harassment, threat)"
  - "Anonymous users identified by userId prefix 'anonymous:'"
  - "EscalationService registered in SkillRegistry via @Optional() pattern"

patterns-established:
  - "Inquiry lifecycle workflow: PENDING -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> ARCHIVED"
  - "Conversation context capture via conversationHistory JSON field"
  - "Optional service injection in SkillRegistry for cross-module dependencies"

# Metrics
duration: 30min
completed: 2026-03-03
---

# Phase 44 Plan 06: Escalation Service Summary

**EscalationService and EscalateSkill for one-click compliance team escalation with conversation context capture**

## Performance

- **Duration:** 30 min
- **Started:** 2026-03-03T22:29:43Z
- **Completed:** 2026-03-03T23:00:05Z
- **Tasks:** 4
- **Files modified:** 9

## Accomplishments

- ChatbotInquiry Prisma model with InquiryPriority and InquiryStatus enums for tracking escalated conversations
- EscalationService with full inquiry lifecycle management (create, assign, resolve, archive)
- EscalateSkill available to chatbot agent for one-click escalation with conversation context
- Auto-detection of category (gift, conflict, harassment, etc.) and priority (URGENT, HIGH, NORMAL, LOW) from question keywords

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ChatbotInquiry Prisma model** - `9db3da1b` (feat)
2. **Task 2: Create ChatbotInquiry entity interface** - (included in prior commit via lint-staged)
3. **Task 3: Create EscalationService** - `72de656c` (feat)
4. **Task 4: Create EscalateSkill and register** - `f121f5a2` (feat)

## Files Created/Modified

- `apps/backend/prisma/schema.prisma` - Added ChatbotInquiry model with status workflow, priority levels, and conversation context
- `apps/backend/src/modules/chatbot/entities/chatbot-inquiry.entity.ts` - TypeScript interface for ChatbotInquiry with ConversationMessage type
- `apps/backend/src/modules/chatbot/services/escalation.service.ts` - Full lifecycle management: create, assign, start, resolve, archive inquiries
- `apps/backend/src/modules/ai/skills/chatbot/escalate.skill.ts` - Chatbot skill for one-click escalation with conversation history capture
- `apps/backend/src/modules/chatbot/chatbot.module.ts` - Added EscalationService to providers and exports
- `apps/backend/src/modules/ai/skills/skill.registry.ts` - Registered escalate skill with optional dependency injection

## Decisions Made

1. **ConversationHistory passed via input**: To avoid circular dependency with ConversationService in AiModule, conversation history is passed in the skill input rather than fetched by EscalationService

2. **Simple keyword-based category detection**: Used straightforward keyword matching for auto-categorization (gift, conflict, harassment, disclosure, policy, ethics, retaliation, privacy, anti-corruption)

3. **Priority auto-detection from urgency signals**: URGENT for explicit urgency words, HIGH for serious topics (harassment, retaliation), NORMAL as default

4. **Anonymous user identification**: Users with userId starting with "anonymous:" are treated as anonymous for inquiry creation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Entity interface committed in prior phase**

- **Found during:** Task 2
- **Issue:** The chatbot-inquiry.entity.ts file was added to a prior commit (0ab96ff0 - 44-04 PolicySearchSkill) due to lint-staged stash operation
- **Impact:** Minor - file is in repo, just committed with different task
- **Resolution:** Noted in summary, continued with remaining tasks

---

**Total deviations:** 1 (documentation only, no impact on functionality)
**Impact on plan:** None - all artifacts delivered correctly

## Issues Encountered

- **Prisma JSON null handling**: Had to use `Prisma.JsonNull` for nullable JSON fields instead of `null` literal
- **Lint-staged stash conflicts**: Some files were committed in different order due to pre-commit hook stash/unstash operations

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EscalationService ready for integration with compliance team queue UI
- EscalateSkill available to EmployeeChatbotAgent for automatic low-confidence escalation
- ChatbotInquiry model ready for API endpoints (44-10)
- Inquiry assignment and resolution workflow ready for compliance dashboard

---

_Phase: 44-employee-chatbot_
_Completed: 2026-03-03_
