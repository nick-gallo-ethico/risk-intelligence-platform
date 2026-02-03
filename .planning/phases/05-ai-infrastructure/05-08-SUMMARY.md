---
phase: 05-ai-infrastructure
plan: 08
subsystem: ai-skills
tags: [ai, skills, categorization, risk-scoring, translation, claude]

dependency-graph:
  requires: ["05-04", "05-07"]
  provides: ["category-suggest-skill", "risk-score-skill", "translate-skill"]
  affects: ["05-09", "05-10"]

tech-stack:
  added: []
  patterns: ["skill-factory", "json-response-parsing", "language-detection"]

key-files:
  created:
    - apps/backend/src/modules/ai/skills/platform/category-suggest.skill.ts
    - apps/backend/src/modules/ai/skills/platform/risk-score.skill.ts
    - apps/backend/src/modules/ai/skills/platform/translate.skill.ts
    - apps/backend/src/modules/ai/prompts/templates/skills/category-suggest.hbs
    - apps/backend/src/modules/ai/prompts/templates/skills/risk-score.hbs
    - apps/backend/src/modules/ai/prompts/templates/skills/translate.hbs
  modified:
    - apps/backend/src/modules/ai/skills/skill.registry.ts
    - apps/backend/src/modules/ai/skills/index.ts

decisions:
  - id: "05-08-01"
    title: "JSON response parsing pattern"
    choice: "Regex extraction of JSON from AI response"
    rationale: "AI may include explanatory text before/after JSON; regex reliably extracts structured data"
  - id: "05-08-02"
    title: "Confidence score for risk assessment"
    choice: "Derive from evidence factor score"
    rationale: "Lower evidence quality correlates with lower confidence in overall assessment"
  - id: "05-08-03"
    title: "Translation language detection"
    choice: "Separate AI call with first 500 chars"
    rationale: "Minimizes token usage while providing accurate detection"

metrics:
  duration: "16 min"
  completed: "2026-02-03"
---

# Phase 05 Plan 08: Additional Platform Skills Summary

**One-liner:** Three platform skills for category suggestion with confidence scores, risk scoring with 7-factor breakdown, and translation with auto-detection.

## What Was Built

### Category Suggestion Skill (category-suggest)

AI-powered categorization for compliance reports with:
- Ranked suggestions with confidence scores (0.0-1.0)
- Reasoning explanation for each suggestion
- Key indicator phrase extraction
- Support for organization-specific category lists

```typescript
// Usage example
const result = await registry.executeSkill('category-suggest', {
  content: 'Employee reports manager making unwelcome comments...',
  categories: [{ id: 'harassment', name: 'Harassment', description: '...' }]
}, context);

// Returns: { suggestions: [...], indicators: [...], topSuggestion: {...} }
```

### Risk Scoring Skill (risk-score)

Comprehensive risk assessment with:
- Overall score (1-10 scale)
- 7 factor breakdown:
  - Severity: Seriousness of alleged behavior
  - Scope: Number of affected people/departments
  - Legal Exposure: Regulatory and legal consequences
  - Reputation Risk: Organization reputation impact
  - Recurrence: Pattern vs isolated incident
  - Evidence: Quality and clarity of evidence
  - Urgency: Time sensitivity of response
- Priority recommendation (LOW/MEDIUM/HIGH/CRITICAL)
- Key concerns summary
- Confidence indicator when evidence is limited

### Translation Skill (translate)

Multi-language support with:
- Automatic source language detection
- Original content preserved alongside translation
- Formatting preservation option
- Technical/legal terminology handling
- Proper noun retention

## Technical Decisions

1. **JSON Response Parsing:** Using regex to extract JSON from AI responses accommodates explanatory text that Claude sometimes includes

2. **Evidence-Based Confidence:** Risk assessment confidence derived from evidence quality factor - lower evidence scores indicate less reliable assessments

3. **Efficient Language Detection:** Using first 500 characters for detection minimizes token usage while maintaining accuracy

## Integration Points

All skills integrate with:
- `ProviderRegistryService` for AI provider selection
- `AiRateLimiterService` for quota management
- `PromptService` for Handlebars templates
- Organization-specific template overrides

Skills are registered in `SkillRegistry` at module initialization.

## Files Created/Modified

| File | Purpose |
|------|---------|
| `skills/platform/category-suggest.skill.ts` | Category suggestion skill implementation |
| `skills/platform/risk-score.skill.ts` | Risk scoring skill implementation |
| `skills/platform/translate.skill.ts` | Translation skill implementation |
| `prompts/templates/skills/category-suggest.hbs` | Category suggestion prompt |
| `prompts/templates/skills/risk-score.hbs` | Risk scoring prompt (7 factors) |
| `prompts/templates/skills/translate.hbs` | Translation prompt |
| `skills/skill.registry.ts` | Updated with 3 new skill registrations |
| `skills/index.ts` | Updated exports |

## Verification Results

- TypeScript compiles without errors
- All 5 skills registered: note-cleanup, summarize, category-suggest, risk-score, translate
- All skills validate input with Zod schemas
- All skills integrate with rate limiting
- All prompt templates exist and are loaded

## Deviations from Plan

None - plan executed exactly as written. The plan depended on 05-07 (Skills Registry) which was executing in parallel; both completed without conflicts.

## Commits

| Hash | Message |
|------|---------|
| `2998ab0` | feat(05-08): add category suggestion AI skill |
| `64489f1` | feat(05-08): add risk scoring AI skill |
| `2442085` | feat(05-08): add translation skill and register all skills |

## Next Phase Readiness

Skills are ready for use by:
- **05-09 (Scoped Agents):** Agents can invoke these skills via the registry
- **05-10 (Action Catalog):** Actions can trigger skill execution
- **Domain modules:** Can use category-suggest for intake, risk-score for triage
