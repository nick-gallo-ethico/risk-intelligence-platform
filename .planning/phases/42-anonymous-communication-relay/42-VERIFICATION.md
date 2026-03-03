---
phase: 42-anonymous-communication-relay
verified: 2026-03-03T10:18:00Z
status: passed
score: 7/7 must-haves verified
---

# Phase 42: Anonymous Communication Relay Verification Report

**Phase Goal:** Enable two-way communication between investigators and anonymous reporters via a Chinese Wall relay that protects reporter identity.

**Verified:** 2026-03-03T10:18:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                     | Status     | Evidence                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Investigator can send message to anonymous reporter via relay (PII stripped)              | ✓ VERIFIED | InvestigatorComposer component exists with PII detection, relay.service.ts sendToReporter() method with PII stripping                   |
| 2   | Anonymous reporter can reply to investigator messages via ethics portal using access code | ✓ VERIFIED | Ethics portal status page ([code]/page.tsx) has MessageComposer, relay.service.ts receiveFromReporter() method                          |
| 3   | System sends email notification to reporter (if email provided) with random 1-6hr delay   | ✓ VERIFIED | DelayedNotificationService uses crypto.randomInt, CaseMessageSentListener triggers on case.message.sent event                           |
| 4   | Access code is emailed to reporter on RIU creation (if email provided)                    | ✓ VERIFIED | RiuCreatedListener responds to riu.created event, queues access code email via DelayedNotificationService                               |
| 5   | Admin can configure reporter visibility levels per tenant                                 | ✓ VERIFIED | RelaySettingsSection component at /settings/organization (Anonymous Relay tab), GET/PATCH /api/v1/organization/relay-settings endpoints |
| 6   | Message thread displays in ethics portal status page with read receipts                   | ✓ VERIFIED | MessageThread component displays messages with readAt timestamps, status page shows thread + composer                                   |
| 7   | All relay messages logged to audit trail with sender/receiver roles                       | ✓ VERIFIED | relay.service.ts calls auditService.log() for all message operations (sendToReporter, receiveFromReporter, markMessagesRead)            |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact                                                                          | Expected                                  | Status     | Details                                                                                                         |
| --------------------------------------------------------------------------------- | ----------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/modules/notifications/services/delayed-notification.service.ts` | Random delay notification queueing        | ✓ VERIFIED | 160 lines, exports DelayedNotificationService, uses crypto.randomInt for secure delay generation                |
| `apps/backend/src/modules/organization/dto/relay-settings.dto.ts`                 | ReporterVisibilityLevel enum + DTOs       | ✓ VERIFIED | 115 lines, exports ReporterVisibilityLevel enum (MINIMAL, STANDARD, DETAILED, TRANSPARENT) and RelaySettingsDto |
| `apps/backend/src/modules/messaging/relay.service.ts`                             | Message relay with PII stripping          | ✓ VERIFIED | 700+ lines, sendToReporter() and receiveFromReporter() methods, integrates PiiDetectionService                  |
| `apps/backend/src/modules/notifications/listeners/riu.listener.ts`                | Access code email on RIU creation         | ✓ VERIFIED | 122 lines, @OnEvent("riu.created"), queues access code email with delay                                         |
| `apps/backend/src/modules/notifications/listeners/case-message.listener.ts`       | Message notification on investigator send | ✓ VERIFIED | 105 lines, @OnEvent("case.message.sent"), queues delayed notification                                           |
| `apps/frontend/src/components/cases/case-messaging/investigator-composer.tsx`     | Investigator message UI with PII check    | ✓ VERIFIED | 200+ lines, PII warning dialog integration, message thread display                                              |
| `apps/frontend/src/app/ethics/[tenant]/status/[code]/page.tsx`                    | Reporter message thread UI                | ✓ VERIFIED | 226 lines, MessageThread + MessageComposer components, access code auth                                         |
| `apps/frontend/src/app/(authenticated)/settings/organization/relay-settings.tsx`  | Admin visibility level config UI          | ✓ VERIFIED | 200+ lines, visibility level dropdown, delay range inputs, messaging toggles                                    |
| `apps/backend/prisma/schema.prisma` (CaseMessage model)                           | Message storage with direction/readAt     | ✓ VERIFIED | CaseMessage model exists with direction, senderType, isRead, readAt, deliveryStatus fields                      |

### Key Link Verification

| From                       | To                         | Via                                  | Status  | Details                                                                          |
| -------------------------- | -------------------------- | ------------------------------------ | ------- | -------------------------------------------------------------------------------- |
| DelayedNotificationService | BullMQ email queue         | @InjectQueue(EMAIL_QUEUE_NAME)       | ✓ WIRED | emailQueue.add() called with delay option using crypto.randomInt                 |
| RiuCreatedListener         | DelayedNotificationService | queueDelayedNotification()           | ✓ WIRED | Listener calls service with tenant relay settings for delay range                |
| CaseMessageSentListener    | DelayedNotificationService | queueDelayedNotification()           | ✓ WIRED | Listener responds to case.message.sent event, checks autoNotifyOnMessage setting |
| MessageRelayService        | EventEmitter2              | emitEvent("case.message.sent")       | ✓ WIRED | sendToReporter() emits event after message creation                              |
| InvestigatorComposer       | useCheckPii hook           | PII detection API call               | ✓ WIRED | Component calls checkPiiMutation.mutateAsync() before sending                    |
| relay.service.ts           | AuditService               | auditService.log()                   | ✓ WIRED | All message operations logged with CASE_MESSAGE entity type                      |
| OrganizationController     | OrganizationService        | getRelaySettings/updateRelaySettings | ✓ WIRED | GET/PATCH /relay-settings endpoints call service methods                         |

### Requirements Coverage

| Requirement                                                      | Status      | Blocking Issue                                                      |
| ---------------------------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| RELAY-01: Investigator can send message via relay (PII stripped) | ✓ SATISFIED | None - InvestigatorComposer + MessageRelayService fully implemented |
| RELAY-02: Reporter can reply via ethics portal using access code | ✓ SATISFIED | None - Ethics portal status page has message composer               |
| RELAY-03: Email notification with random 1-6hr delay             | ✓ SATISFIED | None - DelayedNotificationService + CaseMessageSentListener wired   |
| RELAY-04: Access code emailed on RIU creation                    | ✓ SATISFIED | None - RiuCreatedListener triggers on riu.created event             |
| RELAY-05: Admin can configure visibility levels                  | ✓ SATISFIED | None - RelaySettingsSection UI + backend endpoints exist            |
| RELAY-06: Message thread in ethics portal with read receipts     | ✓ SATISFIED | None - MessageThread displays readAt timestamps                     |
| RELAY-07: Relay messages logged to audit trail                   | ✓ SATISFIED | None - auditService.log() called for all message operations         |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact                             |
| ---- | ---- | ------- | -------- | ---------------------------------- |
| None | -    | -       | -        | No blocking anti-patterns detected |

### Human Verification Required

#### 1. Access Code Email Delivery

**Test:** Create a new RIU with reporter email provided, wait 1-6 hours  
**Expected:** Reporter receives email with 12-character access code and portal URL  
**Why human:** Email delivery timing requires waiting for random delay, cannot be verified programmatically without mocking time

#### 2. Message Notification Email Delivery

**Test:** Investigator sends message to reporter, wait 1-6 hours  
**Expected:** Reporter receives email notification (without message content) with link to status portal  
**Why human:** Requires waiting for random delay and verifying email content excludes PII

#### 3. PII Warning Dialog Interaction

**Test:** Investigator types message with PII (email, phone, SSN), clicks send  
**Expected:** PII warning dialog shows with checkboxes for each warning, "Send Anyway" disabled until all checked  
**Why human:** UI interaction flow requires human verification of dialog behavior

#### 4. Visibility Level Filtering

**Test:** Admin sets visibility to MINIMAL, reporter views status page  
**Expected:** Reporter sees only status, no messages or investigator info  
**Why human:** Visual verification of what reporter can see at each visibility level

#### 5. Reporter Message Reply Flow

**Test:** Reporter enters access code, views message thread, types reply, sends  
**Expected:** Message appears in investigator view as inbound, audit log records sender as "reporter" (not identity)  
**Why human:** End-to-end flow verification across portals

---

## Summary

**All 7 must-haves VERIFIED.** Phase 42 goal achieved.

### Strengths

1. **Cryptographically secure delays:** Uses crypto.randomInt (not Math.random) for timing attack prevention
2. **Comprehensive PII detection:** PiiDetectionService integrated at multiple layers with warning dialog
3. **Event-driven architecture:** Clean separation via NestJS event-emitter, listeners decoupled from services
4. **Audit trail complete:** All message operations logged with sender/receiver roles (anonymous reporters show role, not identity)
5. **Tenant isolation:** Organization settings stored in JSON, relay settings scoped per tenant
6. **Full UI implementation:** Both investigator and reporter message interfaces exist and are wired

### Test Coverage

- **E2E tests:** relay-tenant-isolation.e2e-spec.ts verifies cross-tenant access prevention
- **Demo data:** acme-phase-42.ts seeds sample relay messages across 3 Acme cases

### Next Phase Readiness

Phase 42 is complete. All anonymous communication relay infrastructure is in place and ready for production use.

**Human verification recommended** for email delivery timing and PII warning flow before deploying to production.

---

_Verified: 2026-03-03T10:18:00Z_  
_Verifier: Claude (gsd-verifier)_
