---
phase: 44-employee-chatbot
plan: 04
subsystem: ai
tags:
  [chatbot, skills, faq, rag, vector-search, policy-search, confidence-tiers]

# Dependency graph
requires:
  - phase: 44-02
    provides: FaqService for FAQ matching
  - phase: 44-03
    provides: EmployeeChatbotAgent agent definition
  - phase: 43
    provides: VectorStoreService, EmbeddingService for RAG search
provides:
  - FaqMatchSkill for FAQ-first policy Q&A
  - PolicySearchSkill for RAG-based policy search
  - ConfidenceTier enum (HIGH/MEDIUM/LOW)
  - Chatbot skills registered in SkillRegistry
affects: [44-chatbot-ui, chatbot-api, employee-portal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FAQ-first search strategy before RAG fallback
    - Optional dependency injection for cross-module skills
    - forwardRef for circular dependency avoidance

key-files:
  created:
    - apps/backend/src/modules/ai/skills/chatbot/faq-match.skill.ts
    - apps/backend/src/modules/ai/skills/chatbot/policy-search.skill.ts
    - apps/backend/src/modules/ai/skills/chatbot/index.ts
  modified:
    - apps/backend/src/modules/ai/skills/index.ts
    - apps/backend/src/modules/ai/skills/skill.registry.ts
    - apps/backend/src/modules/ai/ai.module.ts

key-decisions:
  - "ConfidenceTier enum: HIGH >85%, MEDIUM 50-85%, LOW <50%"
  - "FAQ-first strategy: check curated answers before RAG search"
  - "@Optional() injection to avoid circular dependencies between AiModule and ChatbotModule/EmbeddingsModule"
  - "forwardRef() for module imports to break circular dependency chains"

patterns-established:
  - "Chatbot skill pattern: FAQ-first with RAG fallback"
  - "Confidence tier response formatting for chatbot UI"
  - "Cross-module skill dependencies via optional injection"

# Metrics
duration: 19min
completed: 2026-03-03
---

# Phase 44 Plan 04: Chatbot Skills Summary

**FaqMatchSkill and PolicySearchSkill with FAQ-first search strategy and confidence-tiered responses for chatbot policy Q&A**

## Performance

- **Duration:** 19 min
- **Started:** 2026-03-03T22:27:06Z
- **Completed:** 2026-03-03T22:46:14Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Created FaqMatchSkill with PostgreSQL full-text search for curated FAQ answers
- Created PolicySearchSkill with FAQ-first strategy and RAG fallback using VectorStoreService
- Implemented ConfidenceTier enum (HIGH/MEDIUM/LOW) for response confidence classification
- Registered chatbot skills in SkillRegistry with optional dependency injection
- Integrated AiModule with ChatbotModule and EmbeddingsModule using forwardRef

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FaqMatchSkill for FAQ-first search** - `3202cc55` (feat)
2. **Task 2: Create PolicySearchSkill for RAG-based search** - `0ab96ff0` (feat)
3. **Task 3: Create barrel export and register skills** - `8d9d3093` (feat)

## Files Created/Modified

- `apps/backend/src/modules/ai/skills/chatbot/faq-match.skill.ts` - FAQ matching skill with confidence tiers
- `apps/backend/src/modules/ai/skills/chatbot/policy-search.skill.ts` - RAG-based policy search with AI answer generation
- `apps/backend/src/modules/ai/skills/chatbot/index.ts` - Barrel export for chatbot skills
- `apps/backend/src/modules/ai/skills/index.ts` - Added chatbot skills export
- `apps/backend/src/modules/ai/skills/skill.registry.ts` - Registered chatbot skills with optional dependencies
- `apps/backend/src/modules/ai/ai.module.ts` - Imported ChatbotModule and EmbeddingsModule

## Decisions Made

1. **ConfidenceTier thresholds** - HIGH (>=85%), MEDIUM (>=50%), LOW (<50%) per PRD requirements
2. **FAQ-first search strategy** - Check FaqService before RAG search to prioritize curated answers
3. **Optional dependency injection** - Use @Optional() decorator for chatbot skill dependencies to avoid hard circular dependencies between AiModule and ChatbotModule/EmbeddingsModule
4. **forwardRef for module imports** - Use forwardRef(() => ChatbotModule) and forwardRef(() => EmbeddingsModule) to break circular dependency chains
5. **Fire-and-forget helpful tracking** - Mark FAQ as helpful on high-confidence match without blocking response
6. **RAG confidence calculation** - Weight-averaged similarity scores from semantic search results

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all skills compiled and registered successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FaqMatchSkill and PolicySearchSkill available in SkillRegistry
- Skills can be invoked by EmployeeChatbotAgent via skill IDs: `faq-match`, `policy-search`
- Ready for chatbot API controller integration (44-10)
- Ready for chatbot UI implementation

---

_Phase: 44-employee-chatbot_
_Completed: 2026-03-03_
