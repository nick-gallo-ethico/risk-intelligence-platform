---
phase: 07-notifications-email
plan: 03
subsystem: notifications
tags: [preferences, caching, ooo, quiet-hours, enforcement]

dependency-graph:
  requires:
    - 07-01 (notification types and Prisma schema)
  provides:
    - PreferenceService with cached preference retrieval
    - OrgNotificationSettingsService for org-level config
    - Organization enforcement for mandatory categories
    - OOO backup delegation support
    - Quiet hours timezone-aware checking
  affects:
    - 07-04 (NotificationService will use preference checking)
    - 07-05 (InAppNotificationService will check preferences)
    - 07-06 (DigestService will use digest time config)

tech-stack:
  added:
    - cache-manager integration for preference caching
  patterns:
    - 5-minute cache TTL for user preferences
    - Upsert pattern for preference create/update
    - Timezone-aware quiet hours checking
    - Organization enforcement overrides user preferences

key-files:
  created:
    - apps/backend/src/modules/notifications/services/preference.service.ts
    - apps/backend/src/modules/notifications/services/org-settings.service.ts
    - apps/backend/src/modules/notifications/services/index.ts
  modified:
    - apps/backend/src/modules/notifications/notifications.module.ts
    - apps/backend/src/modules/notifications/index.ts

decisions:
  - id: cache-ttl
    choice: 5-minute TTL for preference caching
    rationale: Balance between performance and freshness per RESEARCH.md
  - id: default-enforced
    choice: ASSIGNMENT and DEADLINE as default enforced categories
    rationale: Critical notifications per CONTEXT.md
  - id: quiet-hours-logic
    choice: Overnight quiet hours handled with wraparound logic
    rationale: Support schedules like 22:00-06:00 across midnight

metrics:
  duration: 11 min
  completed: 2026-02-04
---

# Phase 07 Plan 03: Notification Preference Service Summary

**One-liner:** User preference management with 5-minute caching, organization enforcement, OOO backup delegation, and timezone-aware quiet hours.

## What Was Built

### PreferenceService (`preference.service.ts`)

Core service for managing user notification preferences with the following methods:

| Method | Purpose |
|--------|---------|
| `getPreferences(userId, orgId)` | Retrieve preferences with 5-minute caching |
| `getEffectivePreferences(userId, orgId, category)` | Get effective settings with org enforcement applied |
| `updatePreferences(userId, orgId, dto)` | Update preferences with backup user validation |
| `setOOO(userId, orgId, backupId, until)` | Enable out-of-office with backup delegation |
| `clearOOO(userId, orgId)` | Disable out-of-office status |
| `isQuietHours(userId, orgId)` | Check if currently in quiet hours |
| `getOrgSettings(orgId)` | Get organization notification settings |

**Default Preferences (per CONTEXT.md):**
- Urgent events (ASSIGNMENT, DEADLINE, APPROVAL, MENTION, INTERVIEW): email=true, inApp=true
- FYI events (STATUS_UPDATE, COMMENT, COMPLETION): email=false, inApp=true

### OrgNotificationSettingsService (`org-settings.service.ts`)

Organization-level notification configuration:

| Method | Purpose |
|--------|---------|
| `getSettings(orgId)` | Get org settings with 5-minute caching |
| `updateSettings(orgId, dto)` | Update org settings (SYSTEM_ADMIN only) |
| `isEnforcedCategory(orgId, category)` | Check if category is mandatory |
| `getDigestTime(orgId)` | Get daily digest send time |
| `getDefaultQuietHours(orgId)` | Get org-wide quiet hours defaults |
| `getEnforcedCategories(orgId)` | List all enforced categories |

**Default Organization Settings:**
- Enforced categories: ASSIGNMENT, DEADLINE
- Digest time: 17:00 (5 PM)
- No default quiet hours

### Key Features

1. **Caching Strategy**
   - User preferences cached for 5 minutes
   - Org settings cached for 5 minutes
   - Cache keys: `prefs:${orgId}:${userId}`, `org-notification-settings:${orgId}`
   - Cache invalidated on any update

2. **Organization Enforcement**
   - Enforced categories override user preferences
   - Users cannot disable mandatory notifications
   - Default: ASSIGNMENT and DEADLINE are enforced

3. **OOO Backup Delegation**
   - Users can set backup user to receive urgent notifications
   - Backup user validated (exists, active, different from self)
   - OOO status has expiration date

4. **Quiet Hours**
   - Timezone-aware checking using Intl.DateTimeFormat
   - Supports overnight quiet hours (e.g., 22:00-06:00)
   - User settings override org defaults
   - Falls back to org defaults if user hasn't configured

## Commits

| Hash | Description |
|------|-------------|
| df6eee0 | feat(07-03): add PreferenceService with caching and OOO handling |
| fab4c35 | feat(07-03): add OrgNotificationSettingsService for org-level config |
| 619714a | feat(07-03): register preference services in NotificationsModule |

## Verification Results

- TypeScript compilation: PASSED
- PreferenceService has all required methods: VERIFIED
- Line count: 588 lines (exceeds 150 minimum)
- Services exported from NotificationsModule: VERIFIED

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Cache TTL (5 minutes):** Balances performance with freshness. Per RESEARCH.md pitfall recommendations, avoids over-aggressive caching that could cause stale preference issues.

2. **Default enforced categories (ASSIGNMENT, DEADLINE):** These are critical per CONTEXT.md. ESCALATION is not in the NotificationCategory enum, so excluded from defaults.

3. **Quiet hours wraparound logic:** Implemented support for overnight quiet hours (start > end) by checking if current time is >= start OR < end.

4. **Cache key format:** Uses `prefs:${orgId}:${userId}` pattern consistent with tenant isolation requirements.

## Next Phase Readiness

**Ready for 07-04 (NotificationService):** The preference services provide all the methods needed for the core notification service to check user preferences before sending notifications.

Dependencies satisfied:
- `getEffectivePreferences()` provides email/inApp flags with enforcement
- `isQuietHours()` can suppress non-urgent notifications
- OOO backup user available for delegation
- Org settings accessible for digest scheduling
