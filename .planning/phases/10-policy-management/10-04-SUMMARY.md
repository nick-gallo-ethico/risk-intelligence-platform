---
phase: 10-policy-management
plan: 04
status: complete
duration: 18 min
completed: 2026-02-05
subsystem: campaigns
tags: [attestation, policy, campaigns, quiz, signature, RIU]
dependency-graph:
  requires: [10-01, 10-02]
  provides: [attestation-campaign-service, attestation-response-service]
  affects: [10-05, policy-workflow]
tech-stack:
  added: []
  patterns: [attestation-types, quiz-scoring, RIU-creation]
key-files:
  created:
    - apps/backend/src/modules/campaigns/attestation/attestation-campaign.service.ts
    - apps/backend/src/modules/campaigns/attestation/attestation-response.service.ts
    - apps/backend/src/modules/campaigns/attestation/attestation.controller.ts
    - apps/backend/src/modules/campaigns/attestation/dto/attestation.dto.ts
    - apps/backend/src/modules/campaigns/attestation/dto/index.ts
    - apps/backend/src/modules/campaigns/attestation/index.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/campaigns/campaigns.module.ts
decisions:
  - decision: Three attestation types (CHECKBOX, SIGNATURE, QUIZ) with different validation requirements
    rationale: Covers simple acknowledgment, legally-binding signatures, and comprehension verification
  - decision: Attestation creates RIU record (immutable audit trail)
    rationale: Maintains audit compliance with permanent record of employee acknowledgment
  - decision: Refusal auto-creates case when autoCreateCaseOnRefusal is enabled
    rationale: Ensures compliance follow-up for employees who refuse to attest
metrics:
  tasks: 3
  commits: 3
  files-created: 6
  files-modified: 2
---

# Phase 10 Plan 04: Policy Attestation Campaigns Summary

**One-liner:** Policy attestation system with three modes (checkbox/signature/quiz), RIU audit trail, and automatic case creation on refusal.

## What Was Built

### Schema Extensions

Added attestation-specific fields to Campaign and CampaignAssignment models:

**Campaign model additions:**
- `policyId` and `policyVersionId` - Links attestation to specific policy version
- `attestationType` - CHECKBOX, SIGNATURE, or QUIZ
- `quizConfig` - JSON config for quiz questions, passing score, max attempts
- `forceScroll` - Require scrolling to bottom before attesting
- `signatureRequired` - Require electronic signature
- `autoCreateCaseOnRefusal` - Auto-create compliance case on refusal

**CampaignAssignment model additions:**
- `attestedAt` - When employee completed attestation
- `attestationType` - How they attested (may differ from campaign default)
- `quizScore` - Percentage score for QUIZ type
- `quizAttempts` - Number of quiz attempts
- `signatureData` - Base64 encoded signature image
- `refusedAt` - When employee refused
- `refusalReason` - Reason for refusal

**New enum:**
- `AttestationType` - CHECKBOX, SIGNATURE, QUIZ

### AttestationCampaignService

Creates and manages attestation campaigns from policies:

```typescript
// Key methods
createFromPolicy(dto, userId, organizationId) -> Campaign
createFromPublish(policyVersionId, dto, userId, organizationId) -> Campaign | null
getPolicyCampaigns(policyId, organizationId) -> Campaign[]
getCampaignStatistics(campaignId, organizationId) -> Statistics
launchCampaign(campaignId, userId, organizationId) -> Campaign
```

Features:
- Links to specific PolicyVersion (not just Policy)
- Validates policy is published before campaign creation
- Emits `PolicyAttestationCampaignCreatedEvent` for event-driven integrations
- Tracks completion and refusal statistics

### AttestationResponseService

Processes employee attestation submissions:

```typescript
// Key methods
submitAttestation(dto, employeeId, organizationId, userId) -> AttestationSubmissionResult
scoreQuiz(quizConfig, answers) -> QuizResult
getPendingAttestations(employeeId, organizationId) -> CampaignAssignment[]
getAttestationHistory(employeeId, organizationId, options) -> { assignments, total }
getAssignmentForAttestation(assignmentId, employeeId, organizationId) -> AssignmentDetails
```

Key behaviors:
- **CHECKBOX:** Validates `acknowledged === true`
- **SIGNATURE:** Validates `signatureData` is present
- **QUIZ:** Scores answers, enforces passing threshold, tracks attempts
- Creates RIU record on every submission (immutable audit trail)
- Auto-creates Case on refusal when `autoCreateCaseOnRefusal` is enabled
- Updates campaign statistics after each submission

### AttestationController

REST endpoints for attestation functionality:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/attestations/campaigns` | POST | Create attestation campaign from policy |
| `/attestations/campaigns/policy/:policyId` | GET | Get all campaigns for a policy |
| `/attestations/campaigns/:id` | GET | Get campaign details |
| `/attestations/campaigns/:id/statistics` | GET | Get completion statistics |
| `/attestations/campaigns/:id/launch` | POST | Launch campaign |
| `/attestations/submit` | POST | Submit attestation response |
| `/attestations/my-pending` | GET | Get user's pending attestations |
| `/attestations/my-history` | GET | Get user's attestation history |
| `/attestations/assignment/:id` | GET | Get assignment for attestation UI |

### DTOs

- `CreateAttestationCampaignDto` - Campaign creation with quiz config, audience targeting
- `SubmitAttestationDto` - Attestation submission with all three types
- `QuizConfigDto` - Quiz questions, passing score, max attempts, randomization
- `QuizQuestionDto` / `QuizOptionDto` - Individual question structure

## Implementation Details

### Quiz Scoring Algorithm

```typescript
scoreQuiz(config, answers): QuizResult {
  for (question of config.questions) {
    const answer = answers.find(a => a.questionId === question.id)
    isCorrect = answer?.answerId === question.correctOptionId
    if (isCorrect) correctCount++
  }
  score = Math.round((correctCount / totalQuestions) * 100)
  passed = score >= config.passingScore
  return { score, passed, totalQuestions, correctAnswers, results }
}
```

### RIU Creation on Attestation

Every attestation creates an immutable RIU record:
- Type: `ATTESTATION_RESPONSE`
- Source Channel: `CAMPAIGN`
- Contains: Employee details, attestation type, quiz results, timestamp
- Linked to: Campaign and CampaignAssignment via foreign keys

### Case Creation on Refusal

When `autoCreateCaseOnRefusal` is true and employee refuses:
1. Create RIU with `MEDIUM` severity
2. Create Case with:
   - Source: `DIRECT_ENTRY`
   - Type: `REPORT`
   - Tags: `["attestation-refusal", "policy-compliance"]`
3. Link RIU to Case for audit trail

## Verification Criteria Met

- [x] `npm run build` succeeds
- [x] Campaign model has policyVersionId, attestationType, quizConfig fields
- [x] CampaignAssignment has attestedAt, quizScore, refusalReason fields
- [x] createFromPolicy() creates campaign linked to specific PolicyVersion
- [x] submitAttestation() creates RIU record (immutable attestation)
- [x] Refusal with autoCreateCaseOnRefusal creates Case
- [x] Quiz scoring calculates pass/fail correctly

## Commits

| Hash | Message |
|------|---------|
| 191ca38 | feat(10-04): add attestation fields to Campaign and CampaignAssignment |
| c99df75 | feat(10-04): add AttestationCampaignService and AttestationResponseService |
| 14cc31f | feat(10-04): add AttestationController and update CampaignsModule |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

### Required for 10-05 (Policy Distribution)

- AttestationCampaignService can be called from PolicyPublishService
- createFromPublish() convenience method available for publish-triggered attestation
- Campaign statistics available for distribution tracking

### Integration Points

- `PolicyAttestationCampaignCreatedEvent` can trigger notifications
- `AttestationSubmittedEvent` can update dashboards
- Quiz results available for compliance reporting
