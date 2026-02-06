---
phase: 12
plan: 11
subsystem: operations
tags: [peer-benchmarks, certification, quiz, training, health-metrics]
requires:
  - 12-03 # Health Metrics Models
  - 12-04 # Certification Schema
provides:
  - PeerBenchmarkService
  - CertificationService
  - TrainingModule
affects:
  - 12-12 # May use benchmark data for dashboard
  - 12-14 # CSM dashboard may display certifications
tech-stack:
  added: []
  patterns:
    - nightly-aggregation # PeerBenchmark nightly calculation
    - percentile-calculation # Piecewise linear interpolation
    - quiz-grading # 80% pass threshold
    - certificate-numbering # CERT-YYYY-NNNNN format
key-files:
  created:
    - apps/backend/src/modules/operations/client-health/peer-benchmark.service.ts
    - apps/backend/src/modules/operations/client-health/peer-benchmark.processor.ts
    - apps/backend/src/modules/operations/training/certification.service.ts
    - apps/backend/src/modules/operations/training/training.controller.ts
    - apps/backend/src/modules/operations/training/training.module.ts
    - apps/backend/src/modules/operations/training/dto/training.dto.ts
    - apps/backend/src/modules/operations/training/index.ts
  modified:
    - apps/backend/src/modules/operations/operations.module.ts
decisions:
  - id: settings-json-filtering
    summary: Industry/size data extracted from Organization.settings JSON since Organization model lacks those columns
  - id: findFirst-upsert-pattern
    summary: Used findFirst + update/create instead of upsert due to nullable fields in unique constraint
metrics:
  duration: 18 min
  completed: 2026-02-06
---

# Phase 12 Plan 11: Peer Benchmarks & Certification Service Summary

**One-liner:** PeerBenchmarkService with MIN_PEER_COUNT=5 privacy protection and nightly aggregation, plus CertificationService with 80% quiz pass threshold and CERT-YYYY-NNNNN certificate numbering.

## Objective Achieved

Created two major services for the Operations Portal:

1. **PeerBenchmarkService** - Enables tenant comparison against peer groups with privacy protection
2. **CertificationService** - Manages the full certification lifecycle (courses, quizzes, certificates)

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Peer Benchmark Service + Processor | fe1752c | peer-benchmark.service.ts, peer-benchmark.processor.ts |
| 2 | Certification Service + DTOs | 0e154a9 | certification.service.ts, training.dto.ts |
| 3 | Training Controller + Module | 06393be | training.controller.ts, training.module.ts |

## PeerBenchmarkService Features

### Privacy Protection
- **MIN_PEER_COUNT = 5** - Benchmarks only displayed when 5+ peers in cohort
- Prevents identification in small industry/size segments

### Filtering Support
- **No filter** - Compare against all customers (default)
- **Industry filter** - Compare against same industry (from settings.industrySector)
- **Size filter** - Compare against similar company size (from settings.employeeCount)

### Nightly Aggregation
- `calculateBenchmarks()` - Called by PeerBenchmarkProcessor
- Calculates p25, median, p75, mean, min, max for each metric
- Filters: 5 metrics x (1 + N industries + 4 size ranges)

### Percentile Calculation
- Piecewise linear interpolation between quartiles
- Handles edge cases (value at min/max)
- Returns integer percentile 0-100

## CertificationService Features

### Quiz Management
- `startQuizAttempt()` - Creates attempt, returns questions without answers
- `submitQuizAttempt()` - Grades answers, calculates score
- **QUIZ_PASS_THRESHOLD = 0.80** (80% required to pass)

### Track Completion
- Automatically checks when quiz is passed
- Marks track complete when all course quizzes passed
- Logs completion for audit

### Certificate Issuance
- **Format:** CERT-YYYY-NNNNN (e.g., CERT-2026-00001)
- Sequential numbering within year
- 2-year expiration by default
- Links to UserCertification record

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /training/tracks | List tracks with user progress |
| GET | /training/tracks/:id | Get single track details |
| POST | /training/quizzes/:id/start | Start quiz attempt |
| POST | /training/attempts/:id/submit | Submit quiz answers |
| POST | /training/tracks/:id/certificate | Issue certificate |
| GET | /training/certificates | Get user's certificates |
| GET | /training/certificates/verify/:number | Verify certificate |

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Industry/size filtering | From settings JSON | Organization model lacks industrySector/employeeCount columns |
| Upsert pattern | findFirst + update/create | Nullable fields in unique constraint cause type issues with upsert |
| User name | firstName + lastName | User model has split name fields, not single 'name' |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Schema field mismatch**
- **Found during:** Task 1
- **Issue:** Organization model lacks industrySector, employeeCount, and status fields
- **Fix:** Extract industry/size from settings JSON, use isActive instead of status
- **Files modified:** peer-benchmark.service.ts

**2. [Rule 3 - Blocking] Prisma upsert type error**
- **Found during:** Task 1
- **Issue:** Nullable fields in unique constraint cause TS errors with upsert
- **Fix:** Use findFirst + update/create pattern instead
- **Files modified:** peer-benchmark.service.ts

**3. [Rule 3 - Blocking] Course and User model differences**
- **Found during:** Task 2
- **Issue:** Course lacks 'slug', User has firstName/lastName not 'name'
- **Fix:** Removed slug from CourseResponse, combined firstName+lastName
- **Files modified:** certification.service.ts, training.dto.ts

## Verification Results

```bash
# TypeScript compilation
npx tsc --noEmit --skipLibCheck  # No errors

# Linting
npm run lint --max-warnings=500  # 0 errors, 161 warnings (pre-existing)
```

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| peer-benchmark.service.ts | 453 | Benchmark calculation and comparison |
| peer-benchmark.processor.ts | 85 | BullMQ nightly job processor |
| certification.service.ts | 540 | Quiz grading and certificate issuance |
| training.controller.ts | 143 | REST API endpoints |
| training.module.ts | 24 | NestJS module registration |
| training.dto.ts | 168 | Request/response types |

## Next Phase Readiness

**Ready for:**
- 12-12: CSM dashboard can query PeerBenchmarkService for client comparisons
- 12-14: Training dashboard can show certification progress

**Dependencies satisfied:**
- [x] PeerBenchmarkService with nightly aggregation
- [x] MIN_PEER_COUNT=5 privacy protection
- [x] Industry and size filtering
- [x] CertificationService with 80% pass threshold
- [x] CERT-YYYY-NNNNN certificate numbering
- [x] Track completion detection
