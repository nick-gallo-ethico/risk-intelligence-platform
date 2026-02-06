---
phase: 12
plan: 04
subsystem: certification
tags: [prisma, certification, training, quiz, courses]
requires:
  - 12-01 # OperationsModule foundation
provides:
  - certification-track-model
  - course-model
  - quiz-model
  - user-certification-model
  - certificate-model
affects:
  - 12-05 # Certification services
  - 12-06 # Certification API
tech-stack:
  added: []
  patterns:
    - json-questions # Quiz questions as JSON for flexibility
    - version-expiration # Major version changes trigger re-certification
    - dual-user-support # Both tenant users and internal users
key-files:
  created:
    - apps/backend/src/modules/operations/types/certification.types.ts
    - apps/backend/src/modules/operations/entities/certification-track.entity.ts
    - apps/backend/src/modules/operations/entities/course.entity.ts
    - apps/backend/src/modules/operations/entities/quiz.entity.ts
    - apps/backend/src/modules/operations/entities/user-certification.entity.ts
    - apps/backend/src/modules/operations/entities/certificate.entity.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/operations/types/index.ts
    - apps/backend/src/modules/operations/entities/index.ts
decisions:
  - 12-04-01: Quiz pass threshold 80% per CONTEXT.md
  - 12-04-02: Questions stored as JSON array for flexibility
  - 12-04-03: Both tenant users and internal users supported via separate FK fields
  - 12-04-04: Certificate numbers use CERT-YYYY-NNNNN format
  - 12-04-05: Major version changes trigger certificate expiration
metrics:
  duration: 24 min
  completed: 2026-02-06
---

# Phase 12 Plan 04: Certification System Database Models Summary

**One-liner:** Prisma models for modular certification system with tracks, courses, quizzes (80% pass), and PDF certificates with version expiration.

## Objective Achieved

Created complete database models for the certification system that enables:
- Modular training with Platform Fundamentals (required) and specialty tracks (optional)
- Short courses with VIDEO/TEXT/INTERACTIVE content types
- Quizzes with 80% pass threshold per CONTEXT.md
- PDF certificates with unique numbers and expiration tracking

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Certification Types and Enums | ea9d63c | certification.types.ts |
| 2 | Track, Course, Quiz Models | 509bb48 | schema.prisma, entity files |
| 3 | UserCertification, Certificate Models | 211b32f | entity files, index.ts |

## Schema Models Added

### Enums
- **CertificationLevel**: FOUNDATION, INTERMEDIATE, ADVANCED
- **TrackType**: PLATFORM_FUNDAMENTALS, CASE_MANAGEMENT, CAMPAIGNS_DISCLOSURES, POLICY_MANAGEMENT, ANALYTICS_REPORTING, ADMIN_CONFIGURATION
- **CourseType**: VIDEO, TEXT, INTERACTIVE
- **QuizStatus**: NOT_STARTED, IN_PROGRESS, PASSED, FAILED
- **CertificateStatus**: ACTIVE, EXPIRED, REVOKED

### Models
- **CertificationTrack**: Modular tracks with type, level, versioning
- **Course**: Learning units with content type and timing
- **Quiz**: Assessments with JSON questions and 80% pass threshold
- **QuizAttempt**: User progress tracking with score and answers
- **UserCertification**: Per-user-per-track completion status
- **Certificate**: Issued documents with unique numbers

## Key Design Decisions

1. **Pass Threshold**: 80% (0.80) per CONTEXT.md - `Quiz.passingScore`
2. **JSON Questions**: Questions stored as JSON array for flexibility without additional tables
3. **Dual User Support**: Both `userId` (tenant) and `internalUserId` (Ethico staff) supported
4. **Certificate Numbers**: CERT-YYYY-NNNNN format (e.g., CERT-2026-00001)
5. **Version Expiration**: `completedVersion` and `expiresAt` track when re-certification needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing schema validation errors**
- **Found during:** Task 2
- **Issue:** Organization model referenced TenantHealthScore, UsageMetric, FeatureAdoption which didn't exist
- **Fix:** Added FeatureAdoption model to complete the schema validation
- **Files modified:** apps/backend/prisma/schema.prisma
- **Commit:** 509bb48

## Verification Results

```bash
# Schema validation
npx prisma validate  # Valid

# TypeScript compilation
npx tsc --noEmit --skipLibCheck  # No errors

# Lint check
npm run lint  # 0 errors, 159 warnings (pre-existing)
```

## TypeScript Interfaces Created

- `QuizQuestion`: Question structure with options and correct answers
- `QuizAnswers`: User's answer format for storage
- `CertificateData`: PDF template data
- `TrackProgress`: Progress summary per track
- `CourseWithProgress`: Course with user's quiz status
- `CertificationSummary`: Dashboard statistics

## Next Phase Readiness

**Ready for:**
- 12-05: Certification services (CertificationTrackService, QuizService, etc.)
- 12-06: Certification API endpoints

**Dependencies satisfied:**
- [x] Prisma models for all certification entities
- [x] TypeScript types for service layer
- [x] Version tracking for expiration logic

## Files Changed Summary

| File | Change |
|------|--------|
| schema.prisma | +240 lines (6 models, 5 enums) |
| certification.types.ts | +255 lines (new) |
| certification-track.entity.ts | +95 lines (new) |
| course.entity.ts | +93 lines (new) |
| quiz.entity.ts | +131 lines (new) |
| user-certification.entity.ts | +110 lines (new) |
| certificate.entity.ts | +130 lines (new) |
| types/index.ts | +2 lines |
| entities/index.ts | +6 lines |
