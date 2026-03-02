---
phase: 42-anonymous-communication-relay
plan: 02
subsystem: notifications
tags: [mjml, handlebars, email-templates, anonymous-communication, reporter]

# Dependency graph
requires:
  - phase: 07-notifications-email
    provides: Email template infrastructure (MJML, Handlebars, base templates)
  - phase: 42-01
    provides: DelayedNotificationService for timing attack prevention
provides:
  - Access code email template for reporter authentication
  - Message notification email template (privacy-safe, no content)
  - Template ID constants for programmatic use
  - Subject line templates for both reporter emails
affects: [42-03, 42-04, 42-05, ethics-portal, anonymous-relay]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Reporter template subdirectory pattern (templates/reporter/)
    - Template ID constants in templates/index.ts

key-files:
  created:
    - apps/backend/src/modules/notifications/templates/reporter/access-code.mjml.hbs
    - apps/backend/src/modules/notifications/templates/reporter/message-notification.mjml.hbs
    - apps/backend/src/modules/notifications/templates/index.ts
  modified:
    - apps/backend/src/modules/notifications/templates/_subjects.json

key-decisions:
  - "Reporter templates use existing MJML partial pattern (card sections, mj-class styles)"
  - "Message notification intentionally excludes all content for privacy"
  - "Template constants exported via index.ts for type-safe usage"

patterns-established:
  - "Reporter email templates in dedicated subdirectory"
  - "Template ID constants with JSDoc security notes"

# Metrics
duration: 15min
completed: 2026-03-02
---

# Phase 42 Plan 02: Reporter Email Templates Summary

**MJML email templates for access code delivery and message notifications with privacy-safe design**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-02T21:06:04Z
- **Completed:** 2026-03-02T21:21:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Created access code email template with prominent code display and security notice
- Created message notification template that intentionally excludes message content
- Registered both templates with subject lines in \_subjects.json
- Added type-safe template ID constants with security documentation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create reporter directory and access code email template** - `1e83ae9f` (feat)
2. **Task 2: Create message notification email template** - `54d5d04f` (feat)
3. **Task 3: Register templates in template index** - `7edda34f` (feat)

## Files Created/Modified

- `apps/backend/src/modules/notifications/templates/reporter/access-code.mjml.hbs` - Access code delivery email with reference number and 12-char code display
- `apps/backend/src/modules/notifications/templates/reporter/message-notification.mjml.hbs` - Message notification email (privacy-safe, no content exposed)
- `apps/backend/src/modules/notifications/templates/index.ts` - Template ID constants with EMAIL_TEMPLATES registry
- `apps/backend/src/modules/notifications/templates/_subjects.json` - Subject line templates for reporter emails

## Decisions Made

1. **Use existing partial pattern** - Templates are MJML sections that get wrapped by base/layout, not full MJML documents
2. **No message content in notifications** - Critical security requirement documented in template comments
3. **Conditional hasAccessCode rendering** - Message notification shows different CTA based on whether reporter has access code
4. **Template constants with JSDoc** - Added security notes about timing delays directly in constant documentation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - existing template patterns were clear and well-established.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Reporter email templates ready for use by DelayedNotificationService (42-01)
- Next plan (42-03) can implement RIU created event listener to trigger access code emails
- Message notification template ready for investigator-to-reporter messaging feature

---

_Phase: 42-anonymous-communication-relay_
_Completed: 2026-03-02_
