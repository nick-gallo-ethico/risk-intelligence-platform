# Phase 16 Execution Notes

> **Created:** 2026-02-11
> **Purpose:** Clarify overlap between Phase 15 and Phase 16 plans

## Critical: Phase 15 Overlap

Phase 15 (Case Detail Page Overhaul) was completed AFTER plans 16-01 through 16-06 were created. This means several plans contain instructions that overlap with or duplicate work already done in Phase 15.

**Phase 15 Built:**

1. `apps/frontend/src/components/cases/ai-chat-panel.tsx` (637 lines) - Complete WebSocket streaming chat
2. `socket.io-client` v4.8.3 installed in `apps/frontend/package.json`
3. Case detail page (`apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx`) has:
   - AI button in action row that opens Sheet overlay
   - `<AiChatPanel entityType="case" entityId={caseData.id} />`
   - `onActionComplete={fetchCase}` for refreshing after AI actions
4. WebSocket events working: text_delta, message_complete, tool_use, action_executed, error, stop
5. AI actions verified: change-status and add-case-note work with Zod 4.x compatibility fix
6. `apps/frontend/src/contexts/ai-panel-context.tsx` - Minimal open/close state context

---

## Dependency Chain Guidance

**IMPORTANT: When a plan is SKIPPED, its downstream dependencies are AUTO-SATISFIED.**

Plans 16-02 and 16-03 describe creating artifacts that Phase 15 already built (using a different architecture). Since Phase 15 is complete:

- Plan 16-04 has `depends_on: [16-02]` in its frontmatter
- Plan 16-02 is SKIPPED (Phase 15 built the equivalent)
- Therefore, 16-04's dependency is **satisfied by Phase 15**, not by executing 16-02

This means:

- Plan 16-04 can execute immediately (Wave 1)
- Plan 16-05 can execute immediately (Wave 1)
- Plan 16-08 depends only on **actually-executed plans**: [16-01, 16-04, 16-06]

The frontmatter in 16-04, 16-05, 16-06 was written before Phase 15. Treat their `depends_on` as satisfied if the referenced plan is SKIPPED.

---

## Plan-by-Plan Execution Guidance

### 16-01: Backend REST chat endpoint + auth guard + context-loader fallback

**Status: EXECUTE AS-IS**

This plan adds backend robustness that Phase 15 did not cover:

- REST fallback endpoint (POST /ai/chat)
- OptionalJwtAuthGuard for graceful auth handling
- ContextLoaderService fallback for missing org/user

Execute all tasks as written.

---

### 16-02: AI panel context + useAiChat hook + rewrite ai-panel.tsx

**Status: SKIPPED** (Summary file created: 16-02-SUMMARY.md)

Phase 15 already built `ai-chat-panel.tsx` with:

- WebSocket streaming chat (more advanced than the REST-based useAiChat this plan creates)
- Entity context passed as props (entityType, entityId)
- Conversation history loading
- Connection status indicators
- Suggested prompts

DO NOT execute this plan. The Phase 15 implementation is superior and already integrated.

---

### 16-03: Install socket.io-client + useAiSocket + AiSocketProvider + useAiStreamingChat

**Status: SKIPPED** (Summary file created: 16-03-SUMMARY.md)

Phase 15 already:

- Installed `socket.io-client` v4.8.3
- Implemented WebSocket connection directly in `ai-chat-panel.tsx` with a module-level singleton pattern
- Handles text_delta, message_complete, tool_use, action_executed, error events

DO NOT execute this plan. The Phase 15 implementation is complete.

---

### 16-04: AI skill components (summarize, category-suggest, risk-score)

**Status: EXECUTE AS-IS**

This plan creates frontend components for AI skills that Phase 15 did not build:

- `useAiSkills` generic hook
- `AiSummaryButton` component
- `AiCategorySuggest` component
- `AiRiskScore` component

These are additive and do not conflict with Phase 15 work. Execute all tasks.

**Dependency note:** Plan lists `depends_on: [16-02]`, but 16-02 is SKIPPED. The dependency is satisfied by Phase 15's equivalent work. Execute this plan in Wave 1.

---

### 16-05: AI action preview components + useAiActions hook

**Status: PARTIAL EXECUTION**

Phase 15 built action execution but not the preview-then-execute pattern UI.

**Execute:**

- Task 1: Create useAiActions hook (preview, execute, undo, listActions)
- Task 2: Create AiActionPreview dialog component

**Skip:**

- Task 3: "Integrate action capabilities into AI panel" - ai-chat-panel.tsx has a different architecture. Actions are executed via WebSocket events, not via REST preview/execute flow. Integration would require refactoring the existing component.

---

### 16-06: Health check + case detail wiring + graceful degradation + AiSocketProvider

**Status: PARTIAL EXECUTION**

**Execute:**

- Task 1: Add AI health check endpoint (GET /api/v1/ai/health) - still needed

**Skip:**

- Task 2: Wire AI button on case detail page - ALREADY DONE in Phase 15
- Task 3: Add graceful degradation to AI panel - ai-chat-panel.tsx already handles connection errors
- Task 4: Add AiSocketProvider to app layout - Phase 15 uses a different pattern (module-level singleton)

---

### 16-07: Execution Notes (THIS PLAN)

**Status: EXECUTED**

This plan creates the execution notes document you are reading.

---

### 16-08: Verification Checkpoint

**Status: EXECUTE**

Execute this plan to verify Phase 16 work, adjusting for what was actually built vs. skipped.

---

## Summary Table

| Plan  | Status  | Reason                                                        |
| ----- | ------- | ------------------------------------------------------------- |
| 16-01 | EXECUTE | Backend robustness not covered by Phase 15                    |
| 16-02 | SKIPPED | Phase 15 built ai-chat-panel.tsx                              |
| 16-03 | SKIPPED | Phase 15 installed socket.io-client and implemented WebSocket |
| 16-04 | EXECUTE | Skill components are additive                                 |
| 16-05 | PARTIAL | Create hook/dialog, skip integration task                     |
| 16-06 | PARTIAL | Only health check endpoint needed                             |
| 16-07 | EXECUTE | This document                                                 |
| 16-08 | EXECUTE | Verification checkpoint                                       |

---

## Recommended Execution Order

1. Execute 16-01 (Wave 1 - backend)
2. Execute 16-04 (Wave 1 - skill components, dependency satisfied by Phase 15)
3. Execute 16-05 Tasks 1-2 only (Wave 1 - action components)
4. Execute 16-06 Task 1 only (Wave 1 - health check)
5. Execute 16-08 (verification - see Plan 16-08)

---

## Verification Performed (2026-02-11)

| Check                                                            | Result                                    |
| ---------------------------------------------------------------- | ----------------------------------------- |
| ai-chat-panel.tsx exists                                         | YES - 637 lines                           |
| socket.io-client installed                                       | YES - version 4.8.3                       |
| Case page imports AiChatPanel                                    | YES - lines 21 and 324                    |
| WebSocket events (text_delta, message_complete, action_executed) | YES - all present                         |
| useAiChat.ts exists                                              | NO - Phase 15 used different approach     |
| ai-panel-context.tsx exists                                      | YES - minimal open/close state only       |
| useAiSocket.ts exists                                            | NO - Phase 15 embedded socket directly    |
| ai-socket-provider.tsx exists                                    | NO - Phase 15 used module-level singleton |

All verifications confirm Phase 15 overlap claims are accurate.
