---
phase: 08-portals
plan: 11
subsystem: ethics-portal-status
tags: [status-check, messaging, access-code, react, frontend]
requires:
  - 08-08: PWA and i18n infrastructure
  - 06-09: MessageRelayService for anonymous messaging
provides:
  - Status check page with access code input
  - Two-way message thread display
  - Message composer with attachments
affects:
  - 08-12: May need integration with theming
  - 08-13: Anonymous relay messaging verification
tech-stack:
  added: []
  patterns:
    - Segmented access code input
    - Auto-refresh with visibility API
    - Rate limiting with lockout countdown
key-files:
  created:
    - apps/frontend/src/types/ethics-portal.types.ts
    - apps/frontend/src/components/ethics/access-code-input.tsx
    - apps/frontend/src/hooks/useReportStatus.ts
    - apps/frontend/src/components/ethics/status-badge.tsx
    - apps/frontend/src/components/ethics/status-view.tsx
    - apps/frontend/src/components/ethics/message-thread.tsx
    - apps/frontend/src/components/ethics/message-composer.tsx
    - apps/frontend/src/app/ethics/[tenant]/status/page.tsx
    - apps/frontend/src/app/ethics/[tenant]/status/[code]/page.tsx
  modified: []
decisions:
  - pattern: "Access code split into 3 segments of 4 characters"
    rationale: "Improves readability and reduces entry errors"
  - pattern: "Auto-refresh status every 60s, messages every 30s"
    rationale: "Balance between responsiveness and server load"
  - pattern: "Messages marked read after 1 second delay"
    rationale: "Ensures user has time to see the message"
metrics:
  duration: 30 min
  completed: 2026-02-04
---

# Phase 8 Plan 11: Status Check & Messaging UI Summary

**One-liner:** Segmented access code input with rate limiting, minimal status display, and two-way message thread for anonymous reporter communication.

## What Was Built

### Types & Interfaces
- `ethics-portal.types.ts`: ReportStatus, ReporterMessage, MessageAttachment, StructuredQuestionField, AccessCodeValidation, RateLimitError

### Components
1. **AccessCodeInput** (`access-code-input.tsx`)
   - 3 segments x 4 characters (12 total)
   - Auto-advance on fill, backspace navigation
   - Paste support distributes across segments
   - Error state with shake animation
   - Mobile-friendly with large touch targets

2. **StatusBadge** (`status-badge.tsx`)
   - Colored badges: RECEIVED (blue), UNDER_REVIEW (amber), ADDITIONAL_INFO_NEEDED (orange + pulse), CLOSED (gray)
   - Status descriptions for each state

3. **StatusView** (`status-view.tsx`)
   - Minimal display per CONTEXT.md requirements
   - Shows: reference number, status badge, description, last updated
   - Unread messages indicator
   - NO internal process visibility

4. **MessageThread** (`message-thread.tsx`)
   - Chronological display (oldest first)
   - Inbound (investigator): left-aligned, neutral color
   - Outbound (reporter): right-aligned, primary color
   - Read receipts, date separators, attachment previews
   - Auto-scroll to newest message
   - Structured question form display

5. **MessageComposer** (`message-composer.tsx`)
   - Textarea with character counter
   - Attachment button (file input ready)
   - Enter to send, Shift+Enter for newline
   - Loading/error states with retry
   - Disabled when case closed

### Routes
1. **Status Entry Page** (`/ethics/[tenant]/status`)
   - AccessCodeInput for entering code
   - "Check Status" button with loading state
   - Rate limit lockout display with countdown
   - Help text and navigation links

2. **Status Detail Page** (`/ethics/[tenant]/status/[code]`)
   - Full status view with messages
   - Message composer for replies
   - New message notification toast
   - Links to home and "Report a New Issue"

### Hook
- **useReportStatus** (`useReportStatus.ts`)
   - State: status, messages, isLoading, error, isLocked, lockoutRemaining
   - Methods: checkStatus, sendMessage, markMessagesRead, refreshMessages, clear
   - Auto-refresh with visibility API (pauses when tab hidden)
   - Rate limit handling with lockout countdown

## API Integration Points

Frontend integrates with Phase 6 backend (MessageRelayService):
- `GET /api/v1/public/access/:code/status` - Get report status
- `GET /api/v1/public/access/:code/messages` - Get message thread
- `POST /api/v1/public/access/:code/messages` - Send message
- `POST /api/v1/public/access/:code/messages/read` - Mark messages read

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b574640 | Access code input and status lookup types/hook |
| 2 | faed6da | Status view and message thread components |
| 3 | 8236993 | Message composer and status page routes |

## Deviations from Plan

### Auto-fixed Issues
1. **[Rule 3 - Blocking] Fixed type issue in report-form.tsx**
   - Pre-existing type incompatibility with `saveDraft` function
   - Fixed with type assertion to unblock build

## Verification

- [x] Access code input is segmented with auto-advance
- [x] Invalid codes show error (via API response)
- [x] Rate limiting shows lockout time countdown
- [x] Status view shows only: status, reference number, last updated
- [x] Message thread shows two-way communication chronologically
- [x] New messages are highlighted and marked read on view
- [x] Composer disabled when case is closed
- [x] `npm run build -- --filter=frontend` passes

## Next Phase Readiness

**Status:** Ready for verification with backend

The frontend components are complete. To fully test:
1. Backend endpoints from Phase 6 (MessageRelayService) must be available
2. Demo data with access codes and messages would help verification
3. Rate limiting behavior requires backend enforcement
