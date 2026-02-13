---
phase: 23-help-support-system
plan: 01
subsystem: help
tags: [knowledge-base, support-tickets, prisma, nestjs, backend]
status: complete

# Dependency graph
requires: []
provides: [KnowledgeBaseArticle, SupportTicket, HelpModule, backend-api-help]
affects: [23-02, 23-03, 23-04, 23-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      multi-tenant-global-articles,
      event-driven-notifications,
      auto-numbered-tickets,
    ]

# File tracking
key-files:
  created:
    - apps/backend/prisma/schema.prisma (modified - added models)
    - apps/backend/src/modules/help/help.module.ts
    - apps/backend/src/modules/help/controllers/knowledge-base.controller.ts
    - apps/backend/src/modules/help/controllers/support-tickets.controller.ts
    - apps/backend/src/modules/help/services/knowledge-base.service.ts
    - apps/backend/src/modules/help/services/support-tickets.service.ts
    - apps/backend/src/modules/help/dto/knowledge-base.dto.ts
    - apps/backend/src/modules/help/dto/support-ticket.dto.ts
    - apps/backend/src/modules/help/dto/index.ts
    - apps/backend/src/modules/help/entities/help.types.ts
    - apps/backend/src/modules/help/entities/index.ts
    - apps/backend/src/modules/help/listeners/ticket.listener.ts
  modified:
    - apps/backend/src/app.module.ts

# Decisions
decisions:
  - id: D23-01-01
    decision: Global articles use nullable organizationId (null = visible to all tenants)
    rationale: Allows Ethico to maintain system-wide help content while tenants can have custom articles
  - id: D23-01-02
    decision: Ticket numbers use TICKET-XXXX format with per-org counter
    rationale: Human-readable, unique within org, follows common support system patterns
  - id: D23-01-03
    decision: Use ASSIGNMENT notification category for ticket confirmation
    rationale: Closest match in existing NotificationCategory enum for system notifications

# Metrics
metrics:
  duration: 15m
  completed: 2026-02-12
---

# Phase 23 Plan 01: Backend Models & Module Summary

Backend infrastructure for Help & Support system with Prisma models and NestJS module providing REST API endpoints for knowledge base articles and support tickets.

## What Was Built

### 1. Prisma Schema Additions

- **TicketStatus enum**: OPEN, IN_PROGRESS, WAITING_ON_CUSTOMER, RESOLVED, CLOSED
- **TicketPriority enum**: LOW, MEDIUM, HIGH, URGENT
- **KnowledgeBaseArticle model**: Supports global articles (orgId=null) visible to all tenants plus tenant-specific articles
- **SupportTicket model**: User-submitted support requests with auto-generated TICKET-XXXX numbers
- **SUPPORT_TICKET added to AttachmentEntityType**: Enables file attachments on tickets

### 2. NestJS Help Module

- **KnowledgeBaseController**: 3 endpoints for article search, categories, and detail by slug
- **SupportTicketsController**: 3 endpoints for ticket creation, listing, and detail
- **KnowledgeBaseService**: Multi-tenant article queries using (orgId OR null) pattern
- **SupportTicketsService**: Ticket CRUD with auto-numbered tickets and event emission
- **TicketListener**: Handles support.ticket.created event for user notifications

### 3. API Endpoints Created

| Method | Endpoint                    | Purpose                                              |
| ------ | --------------------------- | ---------------------------------------------------- |
| GET    | /api/v1/help/articles       | Search published articles (global + tenant-specific) |
| GET    | /api/v1/help/articles/:slug | Get single article by slug                           |
| GET    | /api/v1/help/categories     | Get categories with article counts                   |
| POST   | /api/v1/help/tickets        | Create support ticket                                |
| GET    | /api/v1/help/tickets        | Get current user's tickets                           |
| GET    | /api/v1/help/tickets/:id    | Get single ticket by ID                              |

## Key Implementation Details

### Multi-Tenant Article Visibility

Articles are visible to a tenant if:

1. `organizationId` is null (global article), OR
2. `organizationId` matches the current tenant

This allows Ethico to maintain system-wide help documentation while letting tenants add custom articles.

### Auto-Generated Ticket Numbers

Tickets receive TICKET-XXXX format numbers based on per-org ticket count:

- First ticket: TICKET-0001
- Second ticket: TICKET-0002
- etc.

### Event-Driven Notifications

When a ticket is created:

1. `support.ticket.created` event is emitted
2. TicketListener handles the event asynchronously
3. User receives in-app/email notification confirming receipt

## Verification Results

- [x] `npx prisma validate` passes
- [x] `npx prisma generate` succeeds
- [x] `npx tsc --noEmit` compiles without errors
- [x] HelpModule registered in app.module.ts
- [x] All 6 endpoints defined

## Commits

| Hash    | Type | Description                                              |
| ------- | ---- | -------------------------------------------------------- |
| 263ac31 | feat | Add KnowledgeBaseArticle and SupportTicket Prisma models |
| cabd5e2 | feat | Add Help module with KB articles and support tickets     |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

- Database models ready for migration
- Backend API ready for frontend consumption in 23-02 (Help Center Page)
- Ticket creation working with notification integration
