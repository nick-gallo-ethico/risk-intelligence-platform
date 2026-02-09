---
status: testing
phase: 07-notifications-email
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md, 07-04-SUMMARY.md, 07-05-SUMMARY.md, 07-06-SUMMARY.md, 07-07-SUMMARY.md, 07-08-SUMMARY.md]
started: 2026-02-04T03:15:00Z
updated: 2026-02-04T03:15:00Z
---

## Current Test

number: 1
name: TypeScript Compiles Without Errors
expected: |
  Running `cd apps/backend && npx tsc --noEmit` completes with no TypeScript errors.
  All notification module files compile successfully.
awaiting: user response

## Tests

### 1. TypeScript Compiles Without Errors
expected: Running `cd apps/backend && npx tsc --noEmit` completes with no TypeScript errors. All notification module files compile successfully.
result: [pending]

### 2. Notification REST API - List Notifications
expected: GET /api/v1/notifications returns paginated list of user's notifications with filtering support. Response includes notification type, channel, read status, and timestamps.
result: [pending]

### 3. Notification REST API - Unread Count
expected: GET /api/v1/notifications/unread-count returns { count: number } with accurate unread notification count for the authenticated user.
result: [pending]

### 4. Notification REST API - Mark as Read
expected: POST /api/v1/notifications/mark-read with notificationIds array marks those notifications as read. Returns { marked: number } with count of marked notifications.
result: [pending]

### 5. Notification REST API - Mark All Read
expected: POST /api/v1/notifications/mark-all-read marks all user's unread notifications as read. Returns { marked: number } with count.
result: [pending]

### 6. Preferences REST API - Get Preferences
expected: GET /api/v1/notifications/preferences returns user's notification preferences including per-category email/inApp settings, quiet hours, and enforcedCategories from org settings.
result: [pending]

### 7. Preferences REST API - Update Preferences
expected: PUT /api/v1/notifications/preferences updates user's notification preferences. Enforced categories cannot be disabled (server ignores attempts).
result: [pending]

### 8. Preferences REST API - Set Out-of-Office
expected: POST /api/v1/notifications/preferences/ooo with backupUserId and oooUntil date enables OOO mode. Urgent notifications route to backup user.
result: [pending]

### 9. Org Settings REST API - Get Org Settings
expected: GET /api/v1/notifications/preferences/org-settings returns organization notification settings including enforcedCategories, digestTime, and defaultQuietHours.
result: [pending]

### 10. Org Settings REST API - Update Org Settings (Admin Only)
expected: PUT /api/v1/notifications/preferences/org-settings updates org settings. Returns 403 for non-SYSTEM_ADMIN users. SYSTEM_ADMIN can update enforcedCategories and digestTime.
result: [pending]

### 11. WebSocket Connection and Authentication
expected: Client connects to /notifications WebSocket namespace with JWT token in handshake.auth.token. On successful connection, receives initial unread count via notification:unread_count event.
result: [pending]

### 12. WebSocket Real-time Notification Delivery
expected: When a new in-app notification is created, connected clients receive notification:new event with notification details and updated notification:unread_count.
result: [pending]

### 13. WebSocket Mark Read
expected: Client sends mark_read message with notificationIds. Server marks notifications as read and emits notification:marked_read and notification:unread_count events.
result: [pending]

### 14. Email Template Rendering
expected: EmailTemplateService.render() compiles MJML templates with Handlebars variables, producing responsive HTML emails. Templates include case-assigned, sla-warning, sla-breach.
result: [pending]

### 15. Email Delivery via SMTP
expected: Email jobs in the queue are processed by EmailProcessor which sends real emails via configured SMTP (nodemailer). Sent emails tracked in NotificationDelivery.
result: [pending]

### 16. Email Delivery Tracking
expected: NotificationDelivery records track email status: PENDING → SENT → DELIVERED (or BOUNCED/FAILED). Status updates via webhook callbacks or send result.
result: [pending]

### 17. Webhook Endpoints for Email Providers
expected: POST /webhooks/email-events (SendGrid) and POST /webhooks/ses-events (AWS SES) accept delivery event callbacks. Events normalize to common format and update NotificationDelivery.
result: [pending]

### 18. Daily Digest Scheduling
expected: DigestService runs hourly cron, checks each org's configured digest time, and sends digest emails only at the matching hour. Users with digest preference receive batched notifications.
result: [pending]

### 19. Digest Smart Aggregation
expected: Multiple notifications for same entity (e.g., 5 comments on same case) aggregate into single digest item like "3 new comments on Case #CASE-2026-00123".
result: [pending]

### 20. Tenant Isolation
expected: All notification queries filter by organizationId from JWT. User A from Org 1 cannot see User B's notifications from Org 2. WebSocket rooms use org:userId pattern.
result: [pending]

## Summary

total: 20
passed: 0
issues: 0
pending: 20
skipped: 0

## Gaps

[none yet]
