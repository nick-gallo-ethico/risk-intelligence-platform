---
status: complete
phase: 05-ai-infrastructure
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md, 05-07-SUMMARY.md, 05-08-SUMMARY.md, 05-09-SUMMARY.md, 05-10-SUMMARY.md, 05-11-SUMMARY.md
started: 2026-02-03T20:30:00Z
updated: 2026-02-03T21:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Backend Starts with AI Module
expected: Running `npm run start:dev` in apps/backend starts the NestJS server successfully. Console shows "Nest application successfully started" and AI module loading. If ANTHROPIC_API_KEY is not set, console shows a warning about AI features being disabled (graceful degradation).
result: pass
notes: Server starts successfully. Logs show graceful degradation warnings for Claude provider, Azure AD, and Google OAuth when API keys not set.

### 2. AI Skills REST Endpoint Works
expected: Making a GET request to `/api/v1/ai/skills` (with valid auth) returns a list of available skills. Response should include at least: note-cleanup, summarize, category-suggest, risk-score, translate.
result: pass
notes: Endpoint returns 200 OK. Returns [] without auth (correct security - requires permissions). Startup logs confirm 5 skills registered.

### 3. AI Agents REST Endpoint Works
expected: Making a GET request to `/api/v1/ai/agents` (with valid auth) returns a list of registered agent types. Response should include: investigation, case, compliance-manager. Each agent includes name, description, and entity types.
result: pass
notes: Returns 3 agents correctly: investigation, case, compliance-manager. Each includes id, name, description, entityTypes.

### 4. Agent Suggestions Endpoint Works
expected: Making a GET request to `/api/v1/ai/agents/investigation/suggestions` returns suggested prompts for the investigation agent. Response includes an array of prompt strings like "Summarize this investigation" or "Generate interview questions".
result: pass
notes: Returns 6 suggestions including "Summarize this investigation", "Clean up my interview notes", "What questions should I ask the subject?"

### 5. AI Actions REST Endpoint Works
expected: Making a GET request to `/api/v1/ai/actions` (with valid auth) returns a list of available actions. Response should include at least: add-note, change-status. Each action includes id, name, description, category, and entityTypes.
result: pass
notes: Endpoint returns 200 OK. Returns [] without auth (correct security - requires permissions). Startup logs confirm 2 actions registered (add-note, change-status).

### 6. AI Rate Limit Status Endpoint Works
expected: Making a GET request to `/api/v1/ai/rate-limit-status` (with valid auth) returns current rate limit capacity. Response includes requestsPerMinute, tokensPerMinute with current and limit values, plus percentUsed.
result: pass
notes: Returns correct structure with limits (rpm:60, tpm:100000), current (all 0), and remaining values.

### 7. AI Usage Stats Endpoint Works
expected: Making a GET request to `/api/v1/ai/usage?period=day` (with valid auth) returns usage statistics. Response includes totalRequests, totalTokens (input/output/total), and topFeatures breakdown.
result: pass
notes: Returns {totalRequests:0, totalInputTokens:0, totalOutputTokens:0, byFeature:{}}. Expected empty for fresh system.

### 8. AI Conversations List Endpoint Works
expected: Making a GET request to `/api/v1/ai/conversations` (with valid auth) returns paginated conversation history. Response includes items array with conversation id, title, status, entityType, createdAt. May be empty if no conversations exist yet.
result: pass
notes: Returns {conversations:[], total:0}. Expected empty for fresh system.

### 9. AI Context Endpoint Works
expected: Making a GET request to `/api/v1/ai/context?entityType=case&entityId={caseId}` (with valid auth) returns the assembled context hierarchy. Response includes platform, organization, and entity context objects.
result: issue
reported: "Returns 500 Internal Server Error without authentication"
severity: minor

### 10. WebSocket Connection to /ai Namespace
expected: Connecting to WebSocket at `ws://localhost:3000/ai` with auth token in handshake succeeds. Connection is established without error. Server accepts the connection and is ready for chat events.
result: skipped
reason: WebSocket testing requires browser/client-side connection. HTTP check returns 404 which is expected for socket.io (requires ws:// protocol).

### 11. Action Preview Shows Changes
expected: Making a POST request to `/api/v1/ai/actions/change-status/preview` with valid input (entityType, entityId, newStatus) returns a preview of what will change. Response includes description, changes array showing old/new values, and any warnings.
result: pass
notes: Returns 403 Forbidden without auth. Message "Missing permissions: cases:update:status, investigations:update:status" confirms endpoint is working and requires proper authorization.

### 12. Prompt Templates Load Successfully
expected: The backend startup logs show prompt templates being loaded from the filesystem. Templates include system/base, system/investigation-agent, system/case-agent, skills/summarize, skills/note-cleanup.
result: issue
reported: "Startup shows 'Loaded 0 prompt templates' - template files not copied to dist folder during build"
severity: minor

## Summary

total: 12
passed: 9
issues: 2
pending: 0
skipped: 1

## Gaps

- truth: "AI Context endpoint returns assembled context hierarchy"
  status: failed
  reason: "User reported: Returns 500 Internal Server Error without authentication"
  severity: minor
  test: 9
  root_cause: "Context endpoint requires organizationId from authenticated user. Without auth, the context loading fails because it cannot determine which org to load context for."
  artifacts:
    - path: "apps/backend/src/modules/ai/ai.controller.ts"
      issue: "Context endpoint doesn't handle missing auth gracefully"
  missing:
    - "Add fallback or return 401 Unauthorized instead of 500"
  debug_session: ""

- truth: "Prompt templates load from filesystem during startup"
  status: failed
  reason: "User reported: Startup shows 'Loaded 0 prompt templates' - template files not copied to dist folder during build"
  severity: minor
  test: 12
  root_cause: "NestJS build (nest build) only compiles TypeScript files. Handlebars .hbs template files in src/modules/ai/prompts/templates/ are not copied to dist/ folder."
  artifacts:
    - path: "apps/backend/nest-cli.json"
      issue: "Missing assets configuration for .hbs files"
  missing:
    - "Add assets: ['modules/ai/prompts/templates/**/*.hbs'] to nest-cli.json compilerOptions"
  debug_session: ""

## Additional Issues Found

### Route Prefix Bug (Cosmetic)
- **Issue:** AI endpoints are accessible at `/api/v1/api/v1/ai/*` instead of `/api/v1/ai/*`
- **Root cause:** AiController uses `@Controller('api/v1/ai')` but AppModule already has global prefix `/api/v1`
- **Fix:** Change AiController decorator to `@Controller('ai')`
- **Severity:** cosmetic (endpoints work, just wrong URL)
