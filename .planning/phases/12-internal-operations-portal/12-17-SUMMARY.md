---
phase: 12
plan: 17
subsystem: training-portal
tags: [training, certification, quiz, exam, ops-console]
requires:
  - 12-04 # Certification System Database Models
  - 12-11 # Peer Benchmarks & Certification Service
  - 12-13 # Implementation Portal UI (layout patterns)
provides:
  - training-portal-ui
  - course-catalog-component
  - exam-interface-component
  - certification-progress-component
affects:
  - 12-18 # May need tech debt cleanup for build issues
  - ops-console-build # Pre-existing build infrastructure issue
tech-stack:
  added: []
  patterns:
    - tab-navigation # Course catalog with catalog/progress/certificates tabs
    - sequential-completion # Courses locked until previous complete
    - timed-exam # Countdown timer with auto-submit
    - question-navigator # Visual grid for answered/unanswered
key-files:
  created:
    - apps/ops-console/src/app/training/layout.tsx
    - apps/ops-console/src/app/training/page.tsx
    - apps/ops-console/src/app/training/[trackId]/page.tsx
    - apps/ops-console/src/app/training/exam/[trackId]/page.tsx
    - apps/ops-console/src/components/training/CourseCatalog.tsx
    - apps/ops-console/src/components/training/CertificationProgress.tsx
    - apps/ops-console/src/components/training/CourseCard.tsx
    - apps/ops-console/src/components/training/ExamInterface.tsx
  modified:
    - apps/ops-console/src/components/InternalLayout.tsx
decisions:
  - id: 12-17-01
    summary: 80% pass threshold enforced in ExamInterface per CONTEXT.md
  - id: 12-17-02
    summary: Track types grouped as Required (Platform Fundamentals), Specialty, and Advanced
  - id: 12-17-03
    summary: Sequential course completion enforced via isLocked prop
  - id: 12-17-04
    summary: Expiration warnings shown for major version changes
metrics:
  duration: 18 min
  completed: 2026-02-06
---

# Phase 12 Plan 17: Training/Certification Portal UI Summary

**One-liner:** Training Portal with course catalog, exam interface (80% pass threshold), certification progress tracking, and expiration warnings for major version changes.

## Objective Achieved

Created a complete Training Portal UI for the Internal Operations Console that enables:
- Course catalog browsing with track type grouping (Required, Specialty, Advanced)
- Track enrollment and progress tracking
- Sequential course completion with locking
- Timed exam interface with 80% pass threshold per CONTEXT.md
- Certificate viewing and PDF download
- Expiration tracking for major version changes

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Training Portal Layout and Course Catalog | 6ab1546 | layout.tsx, page.tsx, CourseCatalog.tsx |
| 2 | Track Detail and Certification Progress | ccc9d84 | [trackId]/page.tsx, CertificationProgress.tsx, CourseCard.tsx |
| 3 | Exam Interface | 87856b8 | exam/[trackId]/page.tsx, ExamInterface.tsx |

## Key Features Implemented

### Training Portal Main Page (`/training`)

- **Stats dashboard:** In Progress, Completed, Certificates, Learning Time
- **Tab navigation:** Course Catalog, My Progress, Certificates
- **Expiration warnings:** Alert banner when certificates have expired

### Course Catalog

- **Track type grouping:** Required (red badge), Specialty (blue), Advanced (purple)
- **Track cards:** Name, description, course count, estimated hours, exam indicator
- **Prerequisite enforcement:** Locked tracks with "Complete X first" message
- **Enrollment flow:** Enroll button for new tracks, Continue button for enrolled
- **Version display:** Shows track version for re-certification tracking

### Track Detail Page (`/training/[trackId]`)

- **CertificationProgress component:** Step indicators (Courses → Exam → Certified)
- **Stats row:** Courses completed, Progress %, Time spent, Exam score
- **Course list:** Sequential completion with locked courses
- **CourseCard component:** Content type icons, completion actions, time tracking
- **Exam CTA:** Shows when all courses complete, displays attempts remaining
- **Certificate download:** Available after passing exam

### Exam Interface (`/training/exam/[trackId]`)

- **Pre-exam screen:** Question count, time limit, 80% pass requirement, attempts remaining
- **Timer:** Countdown with low-time warning (< 1 min), auto-submit on expiry
- **Question display:** Options A-D, current selection highlighted
- **Navigation:** Previous/Next buttons, question number grid
- **Question navigator:** Visual grid showing answered (green) vs unanswered (white)
- **Submit confirmation:** Warning dialog for unanswered questions
- **Result screen:** Pass/Fail with score, feedback on incorrect answers
- **Redirect:** To track page with `?certified=true` on pass

## API Endpoints Expected

The UI expects these backend endpoints (from 12-11 CertificationService):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/v1/internal/training/tracks | List all tracks with enrollment status |
| GET | /api/v1/internal/training/tracks/:id | Get track details with courses |
| GET | /api/v1/internal/training/tracks/:id/progress | Get user progress on track |
| POST | /api/v1/internal/training/tracks/:id/enroll | Enroll in track |
| POST | /api/v1/internal/training/courses/:id/complete | Mark course complete |
| GET | /api/v1/internal/training/tracks/:id/exam | Get exam info (pre-start) |
| POST | /api/v1/internal/training/tracks/:id/exam/start | Start exam attempt |
| POST | /api/v1/internal/training/tracks/:id/exam/submit | Submit exam answers |
| GET | /api/v1/internal/training/progress/me | Get all my track progress |
| GET | /api/v1/internal/training/certificates/me | Get my certificates |

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pass threshold | 80% | Per CONTEXT.md specification |
| Track grouping | Required/Specialty/Advanced | Per CONTEXT.md modular tracks |
| Course completion | Sequential | Prevent skipping foundational content |
| Exam timer | Auto-submit on expiry | Prevent indefinite exam sessions |
| Question navigator | Grid with colors | Quick visual of progress |
| Expiration tracking | Major version check | Per CONTEXT.md version expiration |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] InternalLayout already updated by linter**
- **Found during:** Task 1
- **Issue:** InternalLayout had been modified by a linter with additional features (ImpersonationBar, useImpersonation)
- **Fix:** Incorporated the linter changes and ensured Training nav item was included
- **Files modified:** apps/ops-console/src/components/InternalLayout.tsx

### Pre-existing Issues

**Build infrastructure issue (not from this plan):**
- `pages-manifest.json` not being created during build
- TypeScript compilation passes; build static generation has pre-existing errors
- This is tracked as tech debt for 12-18

## Verification Results

```bash
# TypeScript compilation - PASS
npm run typecheck
# No errors related to training files

# Build compilation - PARTIAL
npm run build
# "Compiled successfully" ✓
# "Linting and checking validity of types" ✓
# Static generation fails due to pre-existing /client-success/benchmarks issue
```

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| training/layout.tsx | 5 | Layout wrapper with InternalLayout |
| training/page.tsx | 195 | Main portal with tabs and stats |
| training/[trackId]/page.tsx | 234 | Track detail with courses and exam CTA |
| training/exam/[trackId]/page.tsx | 33 | Exam page entry point |
| CourseCatalog.tsx | 243 | Track cards grouped by type |
| CertificationProgress.tsx | 155 | Step indicators and stats |
| CourseCard.tsx | 151 | Individual course with actions |
| ExamInterface.tsx | 392 | Full exam experience with timer |

## Next Phase Readiness

**Ready for:**
- User acceptance testing of training portal
- Integration with backend training endpoints (12-11)

**Dependencies satisfied:**
- [x] Course catalog shows tracks with progress indicators
- [x] Quiz interface enforces 80% pass threshold per CONTEXT.md
- [x] Certificate display (PDF generation handled by backend)
- [x] Expiration tracking for major version changes

**Known Issues:**
- Pre-existing build infrastructure issue needs addressing in tech debt phase
