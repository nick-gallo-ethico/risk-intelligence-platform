---
phase: 05-ai-infrastructure
plan: 09
subsystem: ai-agents
tags: [ai, agents, context, streaming, skills]
depends:
  requires: [05-06-context-loader, 05-07-skills-registry]
  provides: [scoped-agents, agent-registry, agent-streaming]
  affects: [06-operator-console, 07-client-portal]
tech-stack:
  added: []
  patterns: [abstract-factory, context-hierarchy, streaming-async-generators]
key-files:
  created:
    - apps/backend/src/modules/ai/agents/base.agent.ts
    - apps/backend/src/modules/ai/agents/agent.registry.ts
    - apps/backend/src/modules/ai/agents/investigation.agent.ts
    - apps/backend/src/modules/ai/agents/case.agent.ts
    - apps/backend/src/modules/ai/agents/compliance-manager.agent.ts
    - apps/backend/src/modules/ai/agents/index.ts
  modified:
    - apps/backend/src/modules/ai/ai.module.ts
    - apps/backend/src/modules/ai/index.ts
decisions:
  - id: 05-09-01
    decision: "Agents are both entity-scoped AND role-scoped"
    rationale: "Per CONTEXT.md, different agents have different capabilities based on entity type and user role"
  - id: 05-09-02
    decision: "Agent instances cached by context key (agent:org:user:entityType:entityId)"
    rationale: "Allows conversation continuity while ensuring tenant isolation"
  - id: 05-09-03
    decision: "BaseAgent uses async generators for streaming"
    rationale: "Enables real-time chat responses with tool execution"
metrics:
  duration: 11 min
  completed: 2026-02-03
---

# Phase 05 Plan 09: Scoped Agent System Summary

**One-liner:** BaseAgent abstract class with three specialized agents (Investigation, Case, ComplianceManager) using context hierarchy and skill filtering for entity-scoped AI chat.

## What Was Built

### Task 1-2: Base Agent and Specialized Agents
Created the scoped agent system with:

**BaseAgent (abstract class)**
- Context hierarchy loading via ContextLoaderService
- Conversation management with persistence
- Skill access filtered by agent type and permissions
- Streaming chat with rate limiting
- Tool/skill execution during conversations

**InvestigationAgent**
- Specialized for investigation workflows
- Skills: note-cleanup, summarize, risk-score, translate
- Suggested prompts: summarize, clean notes, interview questions, risk assessment

**CaseAgent**
- Specialized for case management
- Skills: note-cleanup, summarize, category-suggest, risk-score, translate
- Suggested prompts: summarize, categorize, find related, risk level

**ComplianceManagerAgent**
- Organization-wide compliance assistant
- Skills: note-cleanup, summarize, category-suggest, risk-score, translate
- Suggested prompts: trends, board reports, department analysis

**AgentRegistry**
- Registers agent types on module init
- Caches agent instances by context key
- Maps entity types to agent types
- Provides metadata about registered agents

### Task 3: Module Integration
Wired AgentRegistry and SkillRegistry into AiModule:
- Both providers registered and exported
- Barrel exports for skills and agents

## Technical Details

### Agent Architecture
```
AgentRegistry (manages agent types)
    │
    ├── InvestigationAgent
    ├── CaseAgent
    └── ComplianceManagerAgent
         │
         └── BaseAgent (abstract)
              ├── ContextLoaderService (context hierarchy)
              ├── ConversationService (persistence)
              ├── SkillRegistry (available skills)
              ├── ProviderRegistryService (AI provider)
              └── AiRateLimiterService (rate limits)
```

### Context Key Format
Agent instances are cached with key:
`{agentType}:{organizationId}:{userId}:{entityType}:{entityId}`

### Streaming Flow
1. Agent.chat() checks rate limit
2. Saves user message to conversation
3. Loads conversation history (last 20 messages)
4. Builds system prompt from context hierarchy
5. Gets available skills as Claude tools
6. Streams from AI provider
7. Handles tool calls inline
8. Records usage
9. Saves assistant response

## Commits

| Hash | Description |
|------|-------------|
| 1cee990 | feat(05-09): add scoped agent system with BaseAgent and specialized agents |
| 259b7c7 | feat(05-09): wire up AgentRegistry and SkillRegistry in AI module |

## Files Summary

**Created (7 files):**
- `apps/backend/src/modules/ai/agents/base.agent.ts` - Abstract base class (351 lines)
- `apps/backend/src/modules/ai/agents/agent.registry.ts` - Agent type registry
- `apps/backend/src/modules/ai/agents/investigation.agent.ts` - Investigation agent
- `apps/backend/src/modules/ai/agents/case.agent.ts` - Case agent
- `apps/backend/src/modules/ai/agents/compliance-manager.agent.ts` - Org-wide agent
- `apps/backend/src/modules/ai/agents/index.ts` - Barrel exports

**Modified (2 files):**
- `apps/backend/src/modules/ai/ai.module.ts` - Added SkillRegistry, AgentRegistry
- `apps/backend/src/modules/ai/index.ts` - Added skills, agents exports

## Decisions Made

1. **Entity + Role scoping**: Agents specialize by both entity type (investigation, case) AND user role (investigator, compliance officer). This follows CONTEXT.md guidance.

2. **Instance caching**: Agent instances are cached by a composite key to maintain conversation context while isolating tenants.

3. **Streaming with tools**: Using async generators allows real-time streaming while still supporting tool/skill execution inline.

4. **Default skills per agent**: Each agent type has a curated default skill set appropriate for its domain.

## Deviations from Plan

None - plan executed exactly as written. Skills infrastructure from 05-07 was already in place.

## Verification Results

- [x] `npm run build` passes
- [x] AgentRegistry has 3 agent types registered (investigation, case, compliance-manager)
- [x] Each agent has unique suggested prompts
- [x] Agents initialize with context and create conversations
- [x] Agent chat streams responses with tool support

## Next Phase Readiness

Plan 05-09 is complete. Ready for:
- **05-10**: AI panel controller/gateway (will use AgentRegistry to get agents)
- **05-11**: AI panel frontend (will consume agent chat API)

No blockers or concerns identified.
