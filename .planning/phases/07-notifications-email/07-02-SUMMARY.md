---
phase: 07-notifications-email
plan: 02
completed: 2026-02-04
duration: 18 min

subsystem: notifications
tags: [email, mjml, handlebars, templates, white-label]

dependencies:
  requires:
    - 01-foundation (Prisma, events infrastructure)
    - 05-ai-infrastructure (PromptService pattern reference)
  provides:
    - EmailTemplateService for rendering branded emails
    - MJML template compilation to responsive HTML
    - Organization-specific template override capability
    - Base email layout with header/footer partials
  affects:
    - 07-03 (Email delivery service will use templates)
    - 07-04 (Notification service will trigger email rendering)

tech-stack:
  added:
    - mjml@4.18.0 (MJML to HTML compiler)
    - @types/mjml (TypeScript definitions)
  patterns:
    - Template versioning with database overrides
    - Handlebars partials for component reuse
    - OnModuleInit for template pre-loading

key-files:
  created:
    - apps/backend/src/modules/notifications/services/email-template.service.ts
    - apps/backend/src/modules/notifications/templates/base/layout.mjml.hbs
    - apps/backend/src/modules/notifications/templates/base/header.mjml.hbs
    - apps/backend/src/modules/notifications/templates/base/footer.mjml.hbs
    - apps/backend/src/modules/notifications/templates/base/styles.mjml.hbs
    - apps/backend/src/modules/notifications/templates/assignment/case-assigned.mjml.hbs
    - apps/backend/src/modules/notifications/templates/deadline/sla-warning.mjml.hbs
    - apps/backend/src/modules/notifications/templates/deadline/sla-breach.mjml.hbs
    - apps/backend/src/modules/notifications/templates/_subjects.json
  modified:
    - apps/backend/package.json (added mjml dependencies)
    - apps/backend/prisma/schema.prisma (added EmailTemplate model)

decisions:
  - id: 07-02-01
    description: Follow PromptService pattern for template management
    rationale: Consistent architecture with existing AI prompt system
  - id: 07-02-02
    description: Use MJML for responsive email HTML generation
    rationale: Industry standard for email-safe responsive layouts
  - id: 07-02-03
    description: Store raw MJML in database, compile on render
    rationale: Allows template editing without redeployment
  - id: 07-02-04
    description: Register templates as Handlebars partials for composition
    rationale: Enables layout inheritance and component reuse

metrics:
  tasks_completed: 3
  tasks_total: 3
  commits: 3
  files_created: 9
  files_modified: 2
  lines_added: ~2200
---

# Phase 7 Plan 02: Email Template Service Summary

**One-liner:** MJML email template service with Handlebars integration, base layouts, and org-specific override support.

## What Was Built

### EmailTemplateService (662 lines)

A complete email template management service following the PromptService pattern from Phase 5:

- **Template Loading**: Loads all `.mjml.hbs` files from templates directory on module initialization
- **Organization Overrides**: Database storage for per-org template customization with versioning
- **MJML Compilation**: Renders Handlebars variables first, then compiles MJML to responsive HTML
- **Subject Line Templates**: Separate subject templates loaded from `_subjects.json`
- **Handlebars Helpers**: Rich set of helpers including `formatDate`, `formatDateTime`, `urgentBadge`, `severityColor`, `statusColor`

### Base Layout Templates

Shared components using Handlebars partials:

| Template | Purpose |
|----------|---------|
| `base/layout.mjml.hbs` | Main wrapper with head, body, header, content, footer |
| `base/header.mjml.hbs` | Organization logo/name branding |
| `base/footer.mjml.hbs` | Legal text, unsubscribe link (conditional on transactional flag) |
| `base/styles.mjml.hbs` | Shared MJML classes for buttons, text, alerts, badges |

### Notification Templates

Three initial templates per plan requirements:

| Template | Purpose |
|----------|---------|
| `assignment/case-assigned` | Case assigned to user notification |
| `deadline/sla-warning` | SLA approaching warning (shows time remaining) |
| `deadline/sla-breach` | SLA breached urgent alert (shows overdue time) |

### EmailTemplate Prisma Model

```prisma
model EmailTemplate {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  name            String   // e.g., 'assignment/case-assigned'
  version         Int      @default(1)
  mjmlContent     String   @db.Text
  subjectTemplate String
  description     String?
  isActive        Boolean  @default(true)
  createdAt       DateTime
  updatedAt       DateTime
}
```

## Key API Methods

```typescript
// Render email with context (checks DB override, falls back to file)
async render(templateName: string, context: EmailTemplateContext, organizationId?: string): Promise<RenderedEmail>

// Get raw template for editing
async getTemplate(templateName: string, organizationId?: string): Promise<TemplateResult>

// Save org-specific override (validates MJML, increments version)
async saveTemplate(params: SaveTemplateParams): Promise<{ id: string; version: number }>

// List available template names
listTemplates(): string[]

// Get version history for org template
async getTemplateHistory(templateName: string, organizationId: string): Promise<TemplateHistoryEntry[]>

// Revert to previous version
async revertToVersion(templateName: string, organizationId: string, version: number): Promise<void>

// Preview template without saving
async preview(mjmlContent: string, context: EmailTemplateContext): Promise<{ html: string; errors?: string[] }>
```

## Template Context Interface

Templates receive rich context for personalization:

```typescript
interface EmailTemplateContext {
  org?: {
    name: string;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
      contactEmail?: string;
    };
  };
  case?: {
    id: string;
    referenceNumber: string;
    categoryName: string;
    severity: string;
    dueDate?: Date | string;
    status?: string;
  };
  assignedBy?: { name: string };
  recipient?: { name: string; email: string; language?: string };
  appUrl?: string;
  hoursRemaining?: number;
  daysRemaining?: number;
  hoursOverdue?: number;
  isTransactional?: boolean;
}
```

## Compliance with CONTEXT.md

Per Phase 7 context requirements, templates intentionally exclude:
- Names of complainants/subjects
- Allegation details
- Sensitive findings

Templates include only:
- Case reference number
- Category (general)
- Priority/severity
- Due dates
- Assigned by name

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| `npm list mjml` | mjml@4.18.0 installed |
| `npx tsc --noEmit` | No errors |
| Template files exist | 6 MJML templates + 1 subjects.json |
| EmailTemplateService lines | 662 lines (requirement: 150+) |

## Next Phase Readiness

This plan provides the template rendering foundation. Next steps:

- **07-03**: Email delivery service will call `EmailTemplateService.render()` and send via SMTP/provider
- **07-04**: Notification service will orchestrate template selection based on event type

## Commits

| Hash | Message |
|------|---------|
| bc2a247 | feat(07-02): add EmailTemplateService with MJML integration |
| da6dce5 | feat(07-02): create base email layout templates |
| 9e386af | feat(07-02): create initial notification email templates |
