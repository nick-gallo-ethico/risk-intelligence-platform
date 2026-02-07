# Phase 16: AI Integration Fix - Research

**Researched:** 2026-02-06
**Domain:** AI system debugging/fix -- backend API, WebSocket gateway, frontend integration
**Confidence:** HIGH (based on direct codebase inspection)

## Summary

Phase 5 built a comprehensive AI backend infrastructure (48 files across services, providers, skills, agents, actions, gateway, and controller). The code quality is high, the architecture is sound, and a real `ANTHROPIC_API_KEY` is configured in the `.env` file. However, **AI does not work because of multiple disconnects between the backend infrastructure and the frontend**.

The research identified six root causes, ranked by severity:

1. **Frontend AI panel calls a non-existent endpoint** (`/ai/skills/chat/execute` -- there is no "chat" skill)
2. **No WebSocket client exists on the frontend** (zero socket.io-client code, despite backend gateway being fully built)
3. **Auth guard is commented out** on the AI controller (`@UseGuards(JwtAuthGuard)` is commented)
4. **No REST chat endpoint exists** (chat is only available via WebSocket, but frontend uses REST)
5. **Frontend lacks entity context awareness** (AI panel has no concept of current case/investigation)
6. **Redis is disabled** in .env (rate limiter gracefully degrades, but it means no rate limit protection)

**Primary recommendation:** Create a REST chat endpoint on the AI controller (for non-streaming use) or implement a socket.io-client on the frontend (for streaming). Fix the frontend to call the correct endpoints with entity context.

## Detailed Root Cause Analysis

### Root Cause 1: Frontend Calls Non-Existent Endpoint (CRITICAL)

**File:** `apps/frontend/src/components/layout/ai-panel.tsx` line 160
**What it does:** `api.post('/ai/skills/chat/execute', { input: { message, conversationHistory } })`
**Problem:** There is no skill called "chat" registered anywhere. The registered skills are: `note-cleanup`, `summarize`, `category-suggest`, `risk-score`, `translate`. This call will return `{ success: false, error: "Skill not found: chat" }`.

**Evidence:**

- Skill registry (`skill.registry.ts`) registers exactly 5 skills at `onModuleInit()`
- Controller `executeSkill` route: `POST /ai/skills/:skillId/execute`
- No "chat" skill exists in the `skills/platform/` directory
- The "chat" functionality is designed to go through the **agent system** (CaseAgent, InvestigationAgent, ComplianceManagerAgent), not through skills

### Root Cause 2: No WebSocket Client on Frontend (CRITICAL)

**What exists backend:** Full WebSocket gateway at `/ai` namespace with streaming chat, skill execution, action execution, stop/pause/resume
**What exists frontend:** Zero socket.io-client integration. No `io()` calls. No WebSocket connection code anywhere in `apps/frontend/src/`.

**Grep results:** Searching for `socket.io|io(|useSocket|socket-client` in frontend: **no matches**

**Impact:** The primary designed path for AI chat (streaming via WebSocket) is completely disconnected on the frontend side. The frontend only uses REST calls via `apiClient`.

### Root Cause 3: Auth Guard Commented Out (MODERATE)

**File:** `apps/backend/src/modules/ai/ai.controller.ts` line 48
**Code:** `// @UseGuards(JwtAuthGuard) // Uncomment when auth module available`

**Impact:** The controller falls back to `req.user?.organizationId || "demo"` everywhere. This means:

- All AI requests run in "demo" org context
- ContextLoaderService will try to `loadOrganizationContext("demo")` and may throw "Organization not found: demo"
- Conversation persistence uses "demo" user ID
- No proper tenant isolation

### Root Cause 4: No REST Chat Endpoint (MODERATE)

The AI controller has endpoints for: skills, actions, conversations, agents, usage, context. But it has **no REST endpoint for free-form chat**. Chat is only available via WebSocket gateway's `handleChat` event.

**What's needed:** Either:

- A `POST /ai/chat` REST endpoint that uses agents for non-streaming chat, OR
- A functioning WebSocket client on the frontend

### Root Cause 5: Frontend Lacks Entity Context (MODERATE)

**File:** `apps/frontend/src/components/layout/ai-panel.tsx`

The AI panel is a global slide-out sheet. It has no awareness of:

- What case the user is viewing
- What investigation is open
- The entity type or entity ID

The `AiPanelContext` only tracks `isOpen: boolean`. It passes no entity context to the AI API calls.

**What's needed:** The AI panel context needs to include `entityType`, `entityId`, and `agentType` so the AI can provide contextual responses.

### Root Cause 6: Redis Disabled (LOW)

**File:** `apps/backend/.env` line 17
**Code:** `REDIS_URL=` (empty)

**Impact:** The `AiRateLimiterService` detects empty REDIS_URL and logs a warning, then allows all requests (no rate limiting). This is actually fine for development but means there's no rate limit protection against runaway API calls.

## Standard Stack

### Core (Already Installed)

| Library              | Purpose                       | Status                              |
| -------------------- | ----------------------------- | ----------------------------------- |
| `@anthropic-ai/sdk`  | Claude API client             | Installed and configured            |
| `socket.io`          | WebSocket server (backend)    | Installed and used by AiGateway     |
| `handlebars`         | Prompt templating             | Installed and used by PromptService |
| `zod`                | Input validation for skills   | Installed and used                  |
| `ioredis`            | Rate limiting via sorted sets | Installed but Redis disabled        |
| `@nestjs/websockets` | NestJS WebSocket support      | Installed                           |

### Missing (Need to Install)

| Library            | Purpose                     | Where           |
| ------------------ | --------------------------- | --------------- |
| `socket.io-client` | WebSocket client (frontend) | `apps/frontend` |

**Installation:**

```bash
cd apps/frontend && npm install socket.io-client
```

## Architecture Patterns

### Existing Backend Architecture (Keep As-Is)

```
apps/backend/src/modules/ai/
  ai.module.ts              # Module registration
  ai.controller.ts          # REST API at /api/v1/ai/*
  ai.gateway.ts             # WebSocket at /ai namespace
  services/
    ai-client.service.ts    # Raw Claude SDK wrapper (non-streaming + streaming)
    provider-registry.service.ts  # Multi-provider abstraction
    conversation.service.ts # Conversation CRUD (Prisma)
    context-loader.service.ts     # Context hierarchy loading
    prompt.service.ts       # Handlebars template rendering
    rate-limiter.service.ts # Redis sorted set rate limiting
  providers/
    claude.provider.ts      # ClaudeProvider (implements AIProvider interface)
  agents/
    base.agent.ts           # Abstract base with streaming chat()
    agent.registry.ts       # Agent type registration + caching
    case.agent.ts           # Case context agent
    investigation.agent.ts  # Investigation context agent
    compliance-manager.agent.ts   # Org-wide agent
  skills/
    skill.registry.ts       # Skill registration + execution
    skill.types.ts          # SkillDefinition, SkillContext, etc.
    platform/
      note-cleanup.skill.ts # Bullet-to-narrative cleanup
      summarize.skill.ts    # Content summarization
      category-suggest.skill.ts   # Category suggestion
      risk-score.skill.ts   # Risk scoring
      translate.skill.ts    # Content translation
  actions/
    action.catalog.ts       # Action registration
    action-executor.service.ts    # Execute/preview/undo
    action.types.ts         # ActionDefinition, ActionCategory
    actions/
      add-note.action.ts    # Add investigation note
      change-status.action.ts     # Change case/investigation status
  prompts/templates/
    system/base.hbs         # Base system prompt
    system/investigation-agent.hbs
    system/case-agent.hbs
    skills/summarize.hbs
    skills/note-cleanup.hbs
    skills/category-suggest.hbs
    skills/risk-score.hbs
    skills/translate.hbs
  dto/                      # Data transfer objects
  interfaces/               # AIProvider interface definition
```

### Frontend Architecture (Needs Significant Work)

```
apps/frontend/src/
  contexts/
    ai-panel-context.tsx    # Only tracks isOpen (needs entity context)
  components/layout/
    ai-panel.tsx            # Slide-out sheet (calls wrong endpoint)
  components/operator/
    ai-note-cleanup.tsx     # Note cleanup UI (correctly calls /ai/skills/note-cleanup/execute)
  hooks/
    useAiNoteCleanup.ts     # Note cleanup hook (correctly wired to REST skill endpoint)
```

### Pattern 1: REST Chat Endpoint (Recommended for Phase 16)

The simplest fix is adding a non-streaming REST chat endpoint to `AiController`. This avoids the need for WebSocket client integration in Phase 16 (which can be added later for streaming).

```typescript
// In ai.controller.ts - new endpoint
@Post('chat')
async chat(
  @Body() body: {
    message: string;
    entityType?: string;
    entityId?: string;
    agentType?: string;
    conversationId?: string;
  },
  @Request() req: AuthenticatedRequest,
) {
  const context = {
    organizationId: req.user?.organizationId || 'demo',
    userId: req.user?.id || 'demo',
    userRole: req.user?.role || 'EMPLOYEE',
    permissions: req.user?.permissions || [],
    entityType: body.entityType,
    entityId: body.entityId,
  };

  const agentType = body.agentType
    || this.agentRegistry.getAgentTypeForEntity(body.entityType || '')
    || 'compliance-manager';

  const agent = this.agentRegistry.getAgent(agentType, context);
  await agent.initialize(context);

  // Collect streamed response into single response
  let fullContent = '';
  for await (const event of agent.chat(body.message, context)) {
    if (event.type === 'text_delta' && event.text) {
      fullContent += event.text;
    }
  }

  return {
    response: fullContent,
    agentType,
    entityType: body.entityType,
    entityId: body.entityId,
  };
}
```

### Pattern 2: Entity Context in AI Panel

```typescript
// Enhanced AI Panel Context
interface AiPanelContextType {
  isOpen: boolean;
  entityType?: string;
  entityId?: string;
  agentType?: string;
  openPanel: (options?: { entityType?: string; entityId?: string }) => void;
  closePanel: () => void;
  togglePanel: () => void;
  setIsOpen: (open: boolean) => void;
  setEntityContext: (entityType: string, entityId: string) => void;
}
```

### Pattern 3: WebSocket Client (For Streaming - Future or Phase 16)

```typescript
// hooks/useAiSocket.ts
import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useState } from "react";
import { authStorage } from "@/lib/auth-storage";

export function useAiSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    const socket = io("/ai", {
      auth: { token },
      autoConnect: false,
    });

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, isConnected };
}
```

### Anti-Patterns to Avoid

- **Calling skills as chat endpoints:** Skills are single-purpose functions (note-cleanup, summarize), not conversational chat. Chat goes through agents.
- **Hardcoding "demo" org context:** The controller currently falls back to "demo" everywhere. Real auth context is needed.
- **Building WebSocket from scratch:** socket.io is already the backend framework; use socket.io-client on frontend. Don't hand-roll WebSocket.
- **Skipping entity context:** The entire AI value proposition depends on knowing what entity the user is working on. Don't make the AI panel context-free.

## Don't Hand-Roll

| Problem          | Don't Build      | Use Instead                                | Why                                                               |
| ---------------- | ---------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| WebSocket client | Raw WebSocket    | `socket.io-client`                         | Matches backend socket.io server, handles reconnection/namespaces |
| Chat streaming   | Custom SSE       | `socket.io-client` events                  | Backend already emits `text_delta`, `message_complete` events     |
| Rate limiting UI | Custom countdown | Use error response `retryAfterMs` field    | Backend already calculates and returns retry timing               |
| Context loading  | Custom loaders   | Use backend ContextLoaderService via agent | Backend already loads case/investigation/campaign context         |

## Common Pitfalls

### Pitfall 1: API Key Exposure

**What goes wrong:** ANTHROPIC_API_KEY is in `.env` which could be committed to git
**Why it happens:** Developer convenience puts real keys in .env
**How to avoid:** Verify `.gitignore` includes `.env`. The `.env.example` correctly uses placeholder `your-anthropic-api-key-here`
**Warning signs:** API key starting with `sk-ant-` in version control

### Pitfall 2: Auth Guard Bypass Creates Demo Data

**What goes wrong:** Without JwtAuthGuard, all requests use `organizationId: "demo"`, `userId: "demo"`. ConversationService creates conversations for "demo" user, ContextLoaderService tries to load org/user from DB and throws "Organization not found: demo"
**Why it happens:** Guard was commented out during development, but ContextLoaderService does real DB queries
**How to avoid:** Either uncomment the guard OR create fallback handling in ContextLoaderService for missing orgs
**Warning signs:** Console errors about "Organization not found" or "User not found"

### Pitfall 3: WebSocket Auth Requires JWT

**What goes wrong:** WebSocket gateway `extractContext` validates JWT tokens. If frontend sends raw auth data instead of JWT, connection is rejected silently
**Why it happens:** Gateway uses `jwtService.verify(token, { secret })` -- needs a real signed JWT
**How to avoid:** Frontend must send the same JWT access token used for REST API calls, via `auth.token` in socket.io handshake
**Warning signs:** WebSocket connects then immediately disconnects, backend logs "Connection rejected: missing auth context"

### Pitfall 4: Agent Instance Caching Creates Stale Context

**What goes wrong:** `AgentRegistry.getAgent()` caches agent instances by context key. If entity data changes, cached agent still has old context
**Why it happens:** Cache key is `{agentType}:{orgId}:{userId}:{entityType}:{entityId}` -- doesn't include data freshness
**How to avoid:** Call `agent.reset()` or `agentRegistry.clearInstance()` when navigating to a new entity
**Warning signs:** AI responses reference old case data after navigating to a different case

### Pitfall 5: Conversation Status Misalignment

**What goes wrong:** ConversationService `getOrCreate` finds an existing ACTIVE conversation for the same user+entity. If user opens AI panel on a case, gets a conversation, navigates away, comes back -- the old conversation is resumed automatically
**Why it happens:** Design decision for conversation persistence, but without clear UI for "new conversation" vs "resume"
**How to avoid:** Add a "New Conversation" button in the AI panel, show conversation list for an entity
**Warning signs:** AI seems to have context from a previous session that confuses the user

### Pitfall 6: ContextLoaderService Throws on Missing Data

**What goes wrong:** `loadOrganizationContext` throws `Error("Organization not found: ${orgId}")` if org doesn't exist. `loadUserContext` throws similarly for missing users.
**Why it happens:** These are guard rails for data integrity, but in demo/development mode with commented-out auth, orgId="demo" will always fail
**How to avoid:** Add fallback/demo context when DB lookup returns null, or ensure auth guard populates real IDs
**Warning signs:** 500 errors on AI endpoints, stack traces mentioning "Organization not found"

## Code Examples

### Working Note Cleanup Flow (Already Correct)

The note cleanup flow is the one AI feature that is wired correctly end-to-end (minus auth):

```
Frontend: useAiNoteCleanup.ts
  -> apiClient.post('/ai/skills/note-cleanup/execute', { input: { content, style } })
  -> Backend: AiController.executeSkill('note-cleanup', input, context)
  -> SkillRegistry.executeSkill('note-cleanup', input, context)
  -> noteCleanupSkill.execute(input, context)
  -> ClaudeProvider.createMessage({ messages: [{ role: 'user', content: renderedPrompt }] })
  -> Anthropic API call
  -> Returns { success: true, data: { cleanedContent, changes } }
```

This flow works IF auth is either set up or the fallback "demo" org actually exists in the database.

### Broken Chat Flow (Needs Fixing)

```
Frontend: ai-panel.tsx
  -> api.post('/ai/skills/chat/execute', { input: { message } })
  -> Backend: AiController.executeSkill('chat', input, context)
  -> SkillRegistry.executeSkill('chat', ...)
  -> FAILS: "Skill not found: chat"
```

### Intended Chat Flow (Via WebSocket)

```
Frontend (doesn't exist yet):
  -> socket.emit('chat', { message, entityType: 'case', entityId: 'case-123' })
  -> Backend: AiGateway.handleChat(client, payload)
  -> AgentRegistry.getAgent('case', context)
  -> CaseAgent.initialize(context) // loads context hierarchy
  -> CaseAgent.chat(message, context) // streaming generator
  -> ClaudeProvider.streamMessage(params)
  -> Client receives: text_delta, text_delta, ..., message_complete
```

## State of the Art

| Old Approach (What's Built)            | Needed Approach                           | Impact                                                      |
| -------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| WebSocket-only chat                    | REST + WebSocket                          | REST for simple chat, WebSocket for streaming (both needed) |
| No entity context in panel             | Entity-aware panel                        | AI panel must know current case/investigation               |
| Auth guard commented out               | Auth guard enabled or demo fallback       | Without auth, all lookups fail on "demo" org                |
| Frontend calls skill endpoint for chat | Frontend calls chat endpoint or WebSocket | Chat is an agent feature, not a skill                       |

## Open Questions

1. **Should Phase 16 implement WebSocket streaming or just REST chat?**
   - REST chat is simpler and faster to implement (1 new endpoint + frontend fix)
   - WebSocket streaming provides better UX (real-time typing effect) but requires socket.io-client integration
   - Recommendation: Implement REST chat first, then add WebSocket streaming as enhancement

2. **How should auth work for demos?**
   - Currently JwtAuthGuard is commented out
   - Options: (a) Uncomment and require real auth, (b) Create demo mode with pre-seeded demo org, (c) Use seed data org/user as fallback
   - Recommendation: Use the seeded demo organization/user from DemoModule as fallback context

3. **Does the API key in .env actually work?**
   - `.env` contains what appears to be a real key: `sk-ant-api03-M3cl-...`
   - Model is set to `claude-3-5-haiku-latest` (fast, cheap -- good for dev)
   - Cannot verify without making an API call
   - Recommendation: First plan task should test API connectivity with a simple health check

4. **What about the "triage" skill?**
   - File exists: `skills/triage.skill.ts` but it's NOT registered in `SkillRegistry.onModuleInit()`
   - Likely a late addition that wasn't wired up
   - Recommendation: Review and register if complete

5. **What Prisma models might be missing for "demo" mode?**
   - ConversationService does direct Prisma queries against AiConversation, AiMessage tables
   - ContextLoaderService queries Organization, User, Case, Investigation, Campaign, Category, AiContextFile
   - If "demo" org/user doesn't exist in seed data, all context loading fails
   - Recommendation: Verify seed data includes demo org, or add fallback context

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection of all 48 files in `apps/backend/src/modules/ai/`
- Direct codebase inspection of all 3 frontend AI files
- `.env` file examination for configuration
- `app.module.ts` for module registration verification
- Prisma schema for database model verification

### Evidence for Findings

| Finding                       | Evidence Files                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| Frontend calls wrong endpoint | `apps/frontend/src/components/layout/ai-panel.tsx` line 160                           |
| No WebSocket client           | `grep socket.io apps/frontend/src` returns 0 matches                                  |
| Auth guard commented out      | `apps/backend/src/modules/ai/ai.controller.ts` line 48                                |
| No REST chat endpoint         | Full read of `ai.controller.ts` -- no `@Post('chat')` handler                         |
| No entity context in panel    | `apps/frontend/src/contexts/ai-panel-context.tsx` -- only `isOpen` state              |
| Redis disabled                | `apps/backend/.env` line 17: `REDIS_URL=`                                             |
| API key present               | `apps/backend/.env` line 43                                                           |
| Note cleanup flow is correct  | `apps/frontend/src/hooks/useAiNoteCleanup.ts` calls `/ai/skills/note-cleanup/execute` |

## Metadata

**Confidence breakdown:**

- Root cause analysis: HIGH -- based on direct code reading of every relevant file
- Architecture: HIGH -- existing code is well-structured and documented
- Pitfalls: HIGH -- identified from real code behavior analysis
- Fix patterns: MEDIUM -- patterns are standard but implementation details will vary

**Research date:** 2026-02-06
**Valid until:** N/A (based on current codebase state, not library versions)

---

## Appendix: File-by-File Status Summary

### Backend AI Module (48 files)

| File                                      | Status     | Notes                                                |
| ----------------------------------------- | ---------- | ---------------------------------------------------- |
| `ai.module.ts`                            | COMPLETE   | All services properly registered                     |
| `ai.controller.ts`                        | NEEDS FIX  | Auth guard commented out; no chat endpoint           |
| `ai.gateway.ts`                           | COMPLETE   | Full WebSocket implementation, needs frontend client |
| `services/ai-client.service.ts`           | COMPLETE   | Claude SDK wrapper with streaming                    |
| `services/provider-registry.service.ts`   | COMPLETE   | Multi-provider abstraction                           |
| `services/conversation.service.ts`        | COMPLETE   | Full CRUD with pause/resume/archive                  |
| `services/context-loader.service.ts`      | COMPLETE   | Hierarchy loading, may throw on missing orgs         |
| `services/prompt.service.ts`              | COMPLETE   | Handlebars templates with versioning                 |
| `services/rate-limiter.service.ts`        | COMPLETE   | Gracefully degrades without Redis                    |
| `providers/claude.provider.ts`            | COMPLETE   | Streaming + tool calling support                     |
| `agents/base.agent.ts`                    | COMPLETE   | Streaming chat with skill integration                |
| `agents/agent.registry.ts`                | COMPLETE   | 3 agent types registered                             |
| `agents/case.agent.ts`                    | COMPLETE   | Case-specialized agent                               |
| `agents/investigation.agent.ts`           | COMPLETE   | Investigation-specialized agent                      |
| `agents/compliance-manager.agent.ts`      | COMPLETE   | Org-wide agent                                       |
| `skills/skill.registry.ts`                | COMPLETE   | 5 skills registered                                  |
| `skills/platform/*.skill.ts` (5 files)    | COMPLETE   | All implement full execute()                         |
| `skills/triage.skill.ts`                  | INCOMPLETE | Exists but not registered in registry                |
| `actions/action.catalog.ts`               | COMPLETE   | 2 actions registered                                 |
| `actions/actions/add-note.action.ts`      | COMPLETE   | With undo support                                    |
| `actions/actions/change-status.action.ts` | COMPLETE   | With state machine validation                        |
| `prompts/templates/*.hbs` (8 files)       | COMPLETE   | Handlebars templates                                 |
| `dto/*.ts` (6 files)                      | COMPLETE   | Typed DTOs                                           |
| `interfaces/*.ts` (2 files)               | COMPLETE   | AIProvider interface                                 |
| `schema-introspection.service.ts`         | EXISTS     | Utility for schema inspection                        |

### Frontend AI Components (3 files + 1 hook)

| File                                      | Status     | Notes                                          |
| ----------------------------------------- | ---------- | ---------------------------------------------- |
| `components/layout/ai-panel.tsx`          | BROKEN     | Calls non-existent endpoint, no entity context |
| `contexts/ai-panel-context.tsx`           | INCOMPLETE | Only tracks isOpen, no entity context          |
| `components/operator/ai-note-cleanup.tsx` | COMPLETE   | Properly wired to skill endpoint               |
| `hooks/useAiNoteCleanup.ts`               | COMPLETE   | Correct API integration                        |

### Configuration

| Item              | Status | Value                                         |
| ----------------- | ------ | --------------------------------------------- |
| ANTHROPIC_API_KEY | SET    | `sk-ant-api03-M3cl-...` (appears real)        |
| AI_DEFAULT_MODEL  | SET    | `claude-3-5-haiku-latest`                     |
| REDIS_URL         | EMPTY  | Rate limiting disabled                        |
| CORS_ORIGIN       | SET    | `http://localhost:3000,http://localhost:5173` |
| JWT_SECRET        | SET    | Dev secret present                            |
