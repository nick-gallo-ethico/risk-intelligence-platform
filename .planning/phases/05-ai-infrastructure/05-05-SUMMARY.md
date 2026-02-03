---
phase: 05-ai-infrastructure
plan: 05
subsystem: ai
tags: [conversation, persistence, prisma, nestjs, chat-history]

# Dependency graph
requires:
  - phase: 05-ai-infrastructure
    plan: 01
    provides: AiModule structure and AiClientService patterns
provides:
  - AiConversation and AiMessage Prisma models
  - ConversationService with CRUD operations
  - Conversation lifecycle (ACTIVE, PAUSED, ARCHIVED)
  - Message persistence with token tracking
  - Full-text search across conversation history
affects: [05-06, 05-07, 05-08, 05-09, 05-10, 05-11]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Conversation persistence per entity context", "Token aggregation tracking"]

key-files:
  created:
    - apps/backend/prisma/migrations/20260203191000_add_ai_conversation/migration.sql
    - apps/backend/src/modules/ai/dto/conversation.dto.ts
    - apps/backend/src/modules/ai/services/conversation.service.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/ai/ai.module.ts
    - apps/backend/src/modules/ai/dto/index.ts
    - apps/backend/src/modules/ai/index.ts

key-decisions:
  - "Conversations scoped to organization + user + optional entity (case, investigation, etc.)"
  - "Status enum ACTIVE/PAUSED/ARCHIVED for lifecycle management"
  - "Token counts tracked at both message and conversation level for cost monitoring"
  - "Title auto-generated from first user message (truncated to 60 chars)"
  - "Search uses Prisma contains with case-insensitive mode"

patterns-established:
  - "getOrCreate pattern: Return existing active or create new conversation"
  - "Token aggregation: Message tokens increment conversation totals on addMessage"
  - "Pause/resume: pausedAt timestamp tracks when conversation was paused"

# Metrics
duration: 12min
completed: 2026-02-03
---

# Phase 5 Plan 5: AI Conversation Persistence Summary

**Conversation and message persistence layer with AiConversation/AiMessage models enabling context continuity, pause/resume support, and searchable conversation history**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-03T19:09:20Z
- **Completed:** 2026-02-03T19:20:48Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added AiConversation model with organization/user/entity context scoping
- Added AiMessage model with role, content, tool calls, and token tracking
- Created ConversationService with comprehensive CRUD operations (439 lines)
- Implemented conversation lifecycle management (pause, resume, archive)
- Added full-text search across message content
- Integrated ConversationService into AiModule

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AiConversation and AiMessage models** - `2a61fb2` (feat)
2. **Task 2: Create ConversationService** - `b9e8bf8` (feat)
3. **Task 3: Wire ConversationService into AI module** - `27c31e9` (feat)

## Files Created/Modified

**Created:**
- `apps/backend/prisma/migrations/20260203191000_add_ai_conversation/migration.sql` - Migration for conversation tables
- `apps/backend/src/modules/ai/dto/conversation.dto.ts` - DTOs for conversation operations (128 lines)
- `apps/backend/src/modules/ai/services/conversation.service.ts` - Conversation CRUD service (439 lines)

**Modified:**
- `apps/backend/prisma/schema.prisma` - Added AiConversation and AiMessage models
- `apps/backend/src/modules/ai/ai.module.ts` - Registered ConversationService
- `apps/backend/src/modules/ai/dto/index.ts` - Export conversation DTOs
- `apps/backend/src/modules/ai/index.ts` - Export ConversationService

## Schema Models Added

```prisma
enum AiConversationStatus {
  ACTIVE
  PAUSED
  ARCHIVED
}

model AiConversation {
  id             String               @id @default(uuid())
  organizationId String
  userId         String
  entityType     String?  // 'case', 'investigation', 'campaign'
  entityId       String?
  title          String?
  status         AiConversationStatus @default(ACTIVE)
  agentType      String?  // 'investigation', 'case', 'compliance-manager'
  // Token tracking
  totalInputTokens  Int @default(0)
  totalOutputTokens Int @default(0)
  // Lifecycle timestamps
  pausedAt       DateTime?
  archivedAt     DateTime?
  lastMessageAt  DateTime?
  messages       AiMessage[]
}

model AiMessage {
  id             String @id @default(uuid())
  conversationId String
  role           String // 'user', 'assistant'
  content        String @db.Text
  toolCalls      Json?  // Array of {id, name, input}
  toolResults    Json?  // Array of {toolUseId, result}
  inputTokens    Int?
  outputTokens   Int?
  model          String?
  conversation   AiConversation @relation(...)
}
```

## ConversationService Methods

| Method | Purpose |
|--------|---------|
| `getOrCreate()` | Get existing active or create new conversation |
| `get()` | Get conversation by ID |
| `getWithMessages()` | Get conversation with paginated messages |
| `addMessage()` | Add message with token tracking |
| `getMessages()` | Get messages with pagination |
| `pause()` | Pause an active conversation |
| `resume()` | Resume a paused conversation |
| `archive()` | Archive (soft delete) a conversation |
| `list()` | List conversations with filtering and pagination |
| `search()` | Full-text search across message content |
| `generateTitle()` | Auto-generate title from first user message |
| `updateTitle()` | Update conversation title |
| `getStats()` | Get usage statistics for user |

## Decisions Made

1. **Entity context is optional**: Conversations can be org-wide or scoped to specific entity (case, investigation)
2. **Token tracking at two levels**: Individual messages track their tokens, conversations aggregate totals
3. **Search uses Prisma**: Full-text search via `contains` mode rather than Elasticsearch (simpler for conversation data)
4. **Title generation is simple**: First user message truncated to 60 chars (AI-based title generation deferred to agent implementation)
5. **Soft delete via archive**: Archived conversations preserved for audit/search, not hard deleted

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Migration shadow database issue**: Previous migration ordering caused shadow database validation failure. Resolved by using `prisma db push` to sync state and manually creating migration file.

## Next Phase Readiness

- ConversationService ready for agent implementations (Plans 05-06 through 05-11)
- Agent chat, note cleanup, summarization can all persist conversation history
- Token tracking enables cost monitoring per user/organization
- No blockers

---
*Phase: 05-ai-infrastructure*
*Completed: 2026-02-03*
