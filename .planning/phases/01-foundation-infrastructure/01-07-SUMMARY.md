---
phase: 01-foundation-infrastructure
plan: 07
subsystem: forms
tags: [ajv, json-schema, forms, validation, nestjs, prisma]

# Dependency graph
requires:
  - phase: 01-01
    provides: EventsModule for form.submitted events
provides:
  - FormDefinition model for JSON Schema storage
  - FormSubmission model with versioning
  - FormValidationService with Ajv validation
  - FormSchemaService for definition CRUD and publishing
  - FormSubmissionService for submission handling
  - FormsController with 15 API endpoints
  - Anonymous submission support with access codes
affects:
  - 02-demo-tenant (seed form definitions)
  - 03-ethics-portal (public form submission)
  - 04-web-form-configuration (form builder UI)
  - 05-disclosures (disclosure forms)
  - 06-attestations (attestation forms)

# Tech tracking
tech-stack:
  added: [ajv, ajv-formats, ajv-errors, @types/json-schema]
  patterns: [json-schema-validation, form-versioning, anonymous-access-codes]

key-files:
  created:
    - apps/backend/prisma/schema.prisma (FormDefinition, FormSubmission models)
    - apps/backend/src/modules/forms/form-validation.service.ts
    - apps/backend/src/modules/forms/form-schema.service.ts
    - apps/backend/src/modules/forms/form-submission.service.ts
    - apps/backend/src/modules/forms/forms.controller.ts
    - apps/backend/src/modules/forms/forms.module.ts
    - apps/backend/src/modules/forms/types/form.types.ts
    - apps/backend/src/modules/forms/dto/submit-form.dto.ts
    - apps/backend/src/modules/forms/dto/create-form-definition.dto.ts
  modified:
    - apps/backend/src/app.module.ts

key-decisions:
  - "Ajv with allErrors, coerceTypes, removeAdditional, useDefaults for flexible validation"
  - "Custom formats for compliance: phone, currency, ssn, employee-id"
  - "Form versioning creates new version on publish if submissions exist"
  - "Anonymous access codes generated with nanoid (12 chars)"
  - "Conditional rules support show/hide/require/unrequire with multiple operators"

patterns-established:
  - "JSON Schema for form definitions (standard draft-07)"
  - "UiSchema separate from validation schema for rendering hints"
  - "Form versioning: new version on publish if existing submissions"
  - "form.submitted event for downstream processing (RIU creation, notifications)"

# Metrics
duration: 18min
completed: 2026-02-03
---

# Phase 01 Plan 07: Form Engine Summary

**Dynamic form engine with Ajv JSON Schema validation, form versioning, anonymous submission support, and 15 API endpoints**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-03T02:05:20Z
- **Completed:** 2026-02-03T02:23:06Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- FormDefinition and FormSubmission Prisma models with versioning
- Ajv-based JSON Schema validation with custom formats (phone, currency, ssn, employee-id)
- Conditional field requirements (if/then rules)
- Form publishing with auto-versioning when submissions exist
- Anonymous submission with nanoid access codes
- form.submitted event for downstream processing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Form Prisma models and install Ajv** - `fd8baa6` (feat)
2. **Task 2: Create form validation and schema services** - `825ca33` (feat)
3. **Task 3: Create form submission service and controller** - `a0de1e4` (feat)

## Files Created/Modified

**Created:**
- `apps/backend/prisma/schema.prisma` - Added FormDefinition, FormSubmission models, FormType and FormSubmissionStatus enums
- `apps/backend/src/modules/forms/types/form.types.ts` - TypeScript interfaces: FormSchema, UiSchema, ConditionalRule, ValidationResult
- `apps/backend/src/modules/forms/form-validation.service.ts` - Ajv validation with custom formats and conditionals
- `apps/backend/src/modules/forms/form-schema.service.ts` - Form definition CRUD with versioning and publishing
- `apps/backend/src/modules/forms/form-submission.service.ts` - Submission handling with validation and events
- `apps/backend/src/modules/forms/forms.controller.ts` - 15 API endpoints for form management
- `apps/backend/src/modules/forms/forms.module.ts` - NestJS module exporting all services
- `apps/backend/src/modules/forms/dto/*.ts` - DTOs for create/update/submit operations

**Modified:**
- `apps/backend/src/app.module.ts` - Import FormsModule
- `apps/backend/package.json` - Added ajv, ajv-formats, ajv-errors dependencies

## Decisions Made

1. **Ajv configuration**: Using allErrors (report all), coerceTypes (string "123" to 123), removeAdditional (strip extra props), useDefaults (apply defaults) for flexible validation
2. **Custom formats**: Added phone, currency, ssn, employee-id formats specific to compliance forms
3. **Versioning strategy**: When publishing a form that already has submissions, create new version and deactivate old - preserves historical form definitions
4. **Anonymous access codes**: Using nanoid (12 chars) for balance of uniqueness and usability
5. **Conditional operators**: Supporting eq, neq, gt, lt, gte, lte, contains, in for flexible conditional logic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Form engine complete and ready for use by:
  - Web Form Configuration (Phase 4) - form builder UI
  - Ethics Portal (Phase 3) - public form submission
  - Disclosures (Phase 5) - COI and gift forms
  - Demo Tenant (Phase 2) - seed sample form definitions
- FormsModule exported services available for import by other modules

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-02-03*
