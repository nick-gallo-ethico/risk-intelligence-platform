---
phase: "06-case-management"
plan: "02"
subsystem: "investigations"
tags: ["prisma", "nestjs", "interviews", "templates"]
dependency_graph:
  requires:
    - "01-foundation"
    - "04-core-entities"
  provides:
    - "InvestigationInterview model"
    - "InterviewTemplate model"
    - "InvestigationInterviewService"
    - "InvestigationInterviewController"
  affects:
    - "06-investigations"
    - "06-case-management"
tech_stack:
  added: []
  patterns:
    - "Interview lifecycle state machine"
    - "Template-based question loading"
    - "Person-linked interviewee tracking"
key_files:
  created:
    - "apps/backend/src/modules/investigations/interviews/dto/interview.dto.ts"
    - "apps/backend/src/modules/investigations/interviews/interview.service.ts"
    - "apps/backend/src/modules/investigations/interviews/interview.controller.ts"
    - "apps/backend/src/modules/investigations/interviews/index.ts"
  modified:
    - "apps/backend/prisma/schema.prisma"
    - "apps/backend/src/modules/investigations/investigations.module.ts"
decisions:
  - key: "interview-interviewee-type"
    choice: "IntervieweeType enum with PERSON, EXTERNAL, ANONYMOUS"
    rationale: "Supports Person-linked interviewees for pattern detection plus freeform external names"
  - key: "interview-status-workflow"
    choice: "SCHEDULED -> IN_PROGRESS -> COMPLETED (or CANCELLED)"
    rationale: "Standard interview lifecycle with explicit state transitions"
  - key: "template-questions-json"
    choice: "Questions stored as JSON array in both template and interview"
    rationale: "Flexible schema for question structure with copy-on-use pattern"
metrics:
  duration: "42 min"
  completed: "2026-02-03"
---

# Phase 06 Plan 02: Investigation Interviews Summary

Interview recording with template questions and Person linking for pattern detection

## What Was Built

### Prisma Models (Pre-existing, verified)

1. **InterviewStatus enum**: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
2. **IntervieweeType enum**: PERSON, EXTERNAL, ANONYMOUS
3. **InvestigationInterview model**: Full interview tracking with Person linking
4. **InterviewTemplate model**: Reusable question sets for consistent documentation

### DTOs

1. **CreateInterviewDto**: Interview creation with interviewee data
2. **UpdateInterviewDto**: All updatable interview fields
3. **InterviewQueryDto**: Filtering and pagination
4. **CreateInterviewTemplateDto**: Template creation
5. **UpdateInterviewTemplateDto**: Template updates

### Service (InvestigationInterviewService)

- Full CRUD for interviews
- Interview lifecycle methods: start(), complete(), cancel()
- Template loading when creating interview
- Template CRUD with soft delete
- Person-based interview lookup for pattern detection

### Controller (InvestigationInterviewController)

- POST /investigation-interviews - Create interview
- GET /investigation-interviews - List with filtering
- GET /investigation-interviews/:id - Get by ID
- PUT /investigation-interviews/:id - Update
- POST /investigation-interviews/:id/start - Start interview
- POST /investigation-interviews/:id/complete - Complete interview
- POST /investigation-interviews/:id/cancel - Cancel interview
- DELETE /investigation-interviews/:id - Delete
- POST /investigation-interviews/templates - Create template
- GET /investigation-interviews/templates - List templates
- GET /investigation-interviews/templates/:id - Get template
- PUT /investigation-interviews/templates/:id - Update template
- DELETE /investigation-interviews/templates/:id - Delete template
- GET /investigation-interviews/by-person/:personId - Person history

## Key Design Decisions

### Interviewee Flexibility

Interviews support three interviewee types:
- **PERSON**: Linked to Person record for pattern detection across cases
- **EXTERNAL**: Freeform name/contact for people not in system
- **ANONYMOUS**: Anonymous participants

### Template-to-Interview Question Flow

When creating an interview with a templateId:
1. Load template questions
2. Copy questions to interview (copy-on-use pattern)
3. Interview questions can be modified without affecting template

### Interview Lifecycle

State machine enforces valid transitions:
- SCHEDULED -> IN_PROGRESS (via start())
- IN_PROGRESS -> COMPLETED (via complete())
- Any -> CANCELLED (via cancel())

## Commits

| Hash | Message |
|------|---------|
| e4eca9a | feat(06-02): add Interview DTOs and Service |
| 110b62f | feat(06-02): add InvestigationInterview controller and wire module |

## Verification Results

- [x] `npx prisma validate` passes
- [x] `npm run build` in apps/backend succeeds
- [x] InvestigationInterview model has intervieweeType discriminator
- [x] InterviewTemplate model has questions JSON field
- [x] Interview service supports start/complete/cancel workflow
- [x] Interviews can link to Person records or freeform names

## Deviations from Plan

### Pre-existing Schema Issues Fixed

**[Rule 3 - Blocking]** Fixed broken SavedView and InvestigationTemplate relations in Organization model that were preventing Prisma validation.

## Next Phase Readiness

Ready for:
- Investigation checklist items (can link to interviews for evidence)
- Person-based pattern detection using interview history
- Integration with AI summarization for interview notes
