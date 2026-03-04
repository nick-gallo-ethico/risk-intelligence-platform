---
phase: 44-employee-chatbot
verified: 2026-03-04T14:30:00Z
status: gaps_found
score: 9/10 must-haves verified
gaps:
  - truth: Suggested prompts displayed in chatbot UI (CHAT-09)
    status: partial
    reason: Backend getSuggestedPrompts() exists but frontend does not surface them
    artifacts:
      - path: apps/backend/src/modules/ai/agents/employee-chatbot.agent.ts
        issue: getSuggestedPrompts() defined but never called by gateway
      - path: apps/frontend/src/components/chatbot/chatbot-panel.tsx
        issue: No suggested prompts UI - only static welcome text
    missing:
      - Gateway event to send suggested prompts to client on connection
      - Frontend ChatbotPanel rendering clickable suggested prompt buttons
      - useChatbot hook handling a suggested_prompts event from server
---

# Phase 44: Employee Chatbot Verification Report

**Phase Goal:** Deploy an AI chatbot that answers policy questions with citations, handles case status checks, and escalates appropriately.
**Verified:** 2026-03-04T14:30:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                               | Status   | Evidence                                                                                                                      |
| --- | --------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Floating chatbot on Ethics Portal (no login)        | VERIFIED | Ethics layout.tsx line 84-86: ChatbotWidget with tenantSlug, conditional on chatbotEnabled. Anonymous WebSocket.              |
| 2   | Floating chatbot on Employee Portal (authenticated) | VERIFIED | Employee layout.tsx lines 135-141: EmployeeChatbotWrapper passes accessToken.                                                 |
| 3   | Policy questions answered with citations            | VERIFIED | policy-search.skill.ts: FAQ-first then RAG via Phase 43 VectorStoreService. Citations with policyId, title, section, excerpt. |
| 4   | High confidence (>85%) direct answer with source    | VERIFIED | faq-match.skill.ts deriveConfidenceTier() HIGH >= 85%. policy-search.skill.ts FAQ match >= 0.85 returns source=faq.           |
| 5   | Medium confidence (50-85%) clarifying questions     | VERIFIED | policy-search.skill.ts MEDIUM tier generates clarifying questions via generateClarifyingQuestions().                          |
| 6   | Low confidence (<50%) offers escalation             | VERIFIED | faq-match.skill.ts suggestEscalation for LOW. escalate.skill.ts creates ChatbotInquiry with full workflow.                    |
| 7   | Case status via access code                         | VERIFIED | case-status.service.ts: rate-limited 5/15min/IP, code normalization, findFirst by anonymousAccessCode.                        |
| 8   | Consent capture before first interaction            | VERIFIED | chatbot.gateway.ts checks consent, emits consent_required. consent-dialog.tsx GDPR dialog. Append-only 24h.                   |
| 9   | Conversation transcript stored for audit            | VERIFIED | chatbot.gateway.ts conversationService.getOrCreate() for session-linked transcript.                                           |
| 10  | FAQ database before RAG fallback                    | VERIFIED | faq.service.ts PG full-text search. policy-search.skill.ts FAQ first, RAG if < 0.85. 6 seed entries.                          |

**CHAT-09 (Suggested Prompts):** PARTIAL -- Backend getSuggestedPrompts() exists but frontend does not display them.

**Score:** 9/10 truths verified (1 partial)

### Required Artifacts

| Artifact                  | Status   | Details                                                            |
| ------------------------- | -------- | ------------------------------------------------------------------ |
| chatbot.module.ts         | VERIFIED | 34 lines, 4 services + controller, exports all                     |
| chatbot.controller.ts     | VERIFIED | 330 lines, 10 endpoints, Swagger, role-guarded                     |
| faq.service.ts            | VERIFIED | 369 lines, raw SQL full-text search, priority boost                |
| consent.service.ts        | VERIFIED | 218 lines, append-only, 24h validity                               |
| case-status.service.ts    | VERIFIED | 272 lines, rate limiting 5/15min/IP, IP masking                    |
| escalation.service.ts     | VERIFIED | 383 lines, full workflow, priority/category detection              |
| employee-chatbot.agent.ts | VERIFIED | 123 lines, extends BaseAgent, confidence tiers                     |
| chatbot.gateway.ts        | VERIFIED | 466 lines, /chatbot namespace, anonymous + JWT, consent, streaming |
| faq-match.skill.ts        | VERIFIED | 173 lines, confidence tiers HIGH/MEDIUM/LOW, alternates            |
| policy-search.skill.ts    | VERIFIED | 454 lines, FAQ-first + RAG, citations, clarifying Qs               |
| case-status.skill.ts      | VERIFIED | 135 lines, delegates to CaseStatusService                          |
| escalate.skill.ts         | VERIFIED | 120 lines, creates ChatbotInquiry                                  |
| chatbot-widget.tsx        | VERIFIED | 219 lines, anonymous/auth modes, consent flow                      |
| chatbot-panel.tsx         | VERIFIED | 244 lines, messages, streaming, input                              |
| chatbot-launcher.tsx      | VERIFIED | 83 lines, fixed bottom-right FAB                                   |
| consent-dialog.tsx        | VERIFIED | 147 lines, GDPR privacy sections                                   |
| use-chatbot.ts            | VERIFIED | 403 lines, socket.io, streaming, consent                           |
| ethics layout.tsx         | VERIFIED | ChatbotWidget with tenantSlug                                      |
| employee layout.tsx       | VERIFIED | ChatbotWidget with token via wrapper                               |
| Prisma models (3)         | VERIFIED | FaqEntry, ChatbotConsentLog, ChatbotInquiry                        |
| acme-phase-44.ts          | VERIFIED | 306 lines, 6 FAQ entries, 4 categories                             |

### Key Link Verification

| From                   | To                   | Via                    | Status |
| ---------------------- | -------------------- | ---------------------- | ------ |
| Ethics Portal layout   | ChatbotWidget        | JSX tenantSlug         | WIRED  |
| Employee Portal layout | ChatbotWidget        | EmployeeChatbotWrapper | WIRED  |
| ChatbotWidget          | useChatbot           | React hook             | WIRED  |
| useChatbot             | ChatbotGateway       | socket.io /chatbot     | WIRED  |
| ChatbotGateway         | AgentRegistry        | getAgent               | WIRED  |
| AgentRegistry          | EmployeeChatbotAgent | registerAgentType      | WIRED  |
| ChatbotGateway         | ConversationService  | getOrCreate            | WIRED  |
| ChatbotGateway         | ConsentService       | checkConsent           | WIRED  |
| SkillRegistry          | All 4 chatbot skills | registerChatbotSkills  | WIRED  |
| ChatbotModule          | app.module.ts        | Module import          | WIRED  |
| AiModule               | ChatbotGateway       | Module provider        | WIRED  |

### Requirements Coverage

| Requirement                           | Status       |
| ------------------------------------- | ------------ |
| CHAT-01: Ethics Portal chatbot        | SATISFIED    |
| CHAT-02: Policy QA with citation      | SATISFIED    |
| CHAT-03: Case status with access code | SATISFIED    |
| CHAT-04: Escalation to compliance     | SATISFIED    |
| CHAT-05: GDPR consent capture         | SATISFIED    |
| CHAT-06: FAQ management interface     | SATISFIED    |
| CHAT-07: Multi-language               | N/A (future) |
| CHAT-08: Conversation history         | SATISFIED    |
| CHAT-09: Suggested prompts            | PARTIAL      |
| CHAT-10: Rate limiting anonymous      | SATISFIED    |

### Anti-Patterns Found

| File                  | Line    | Pattern                 | Severity | Impact             |
| --------------------- | ------- | ----------------------- | -------- | ------------------ |
| consent.service.ts    | 167,176 | TODO: tenant config     | Info     | Default works      |
| escalation.service.ts | 89      | TODO: notification      | Warning  | Manual queue check |
| escalation.service.ts | 257     | TODO: user notification | Warning  | Future integration |

No blocker anti-patterns.

### Human Verification Required

### 1. Ethics Portal Chatbot Opens Without Login

**Test:** Navigate to /ethics/tenant-slug and click chatbot FAB
**Expected:** Consent dialog first, then chat panel after accepting
**Why human:** Requires running app + anonymous WebSocket

### 2. Employee Portal Chatbot Opens Authenticated

**Test:** Log in, navigate to /employee, click chatbot FAB
**Expected:** Panel opens directly, green connection indicator
**Why human:** Auth flow + WebSocket verification

### 3. Policy QA With Citations

**Test:** Ask about gift policy limit
**Expected:** Response with policy details and citations
**Why human:** End-to-end AI + FAQ matching

### 4. Case Status Via Access Code

**Test:** Provide access code to check report status
**Expected:** Reference number, status label, messages indicator
**Why human:** Requires DB with test data

### 5. Streaming Response

**Test:** Ask question, observe incremental response
**Expected:** Token-by-token text, blinking cursor, stop button
**Why human:** Real-time WebSocket behavior

### Gaps Summary

One gap identified: **CHAT-09 (Suggested Prompts)** is partially implemented.

The backend EmployeeChatbotAgent.getSuggestedPrompts() method (lines 76-100) returns context-aware prompts differentiated for anonymous vs authenticated users, but:

1. The ChatbotGateway never calls getSuggestedPrompts() or emits suggested prompts to the client.
2. The useChatbot hook has no handler for a suggested_prompts event.
3. The ChatbotPanel shows only a static welcome message with no clickable suggested prompt buttons.

This is a minor gap -- all 10 ROADMAP success criteria are fully satisfied. The suggested prompts backend logic exists and would require wiring the gateway to emit prompts on connection and the frontend to render them as clickable buttons.

---

_Verified: 2026-03-04T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
