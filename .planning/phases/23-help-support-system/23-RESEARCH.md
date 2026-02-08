# Phase 23: Help & Support System - Research

**Researched:** 2026-02-08
**Domain:** In-app help center, knowledge base, support ticket system
**Confidence:** HIGH (codebase patterns well-understood, domain is straightforward CRUD + content)

## Summary

This phase adds a user-facing help and support system to the platform. The existing codebase has a HelpCircle button in the top nav (line 263 of `top-nav.tsx`) that currently does nothing, and no `/help` route exists in the frontend. The internal operations `support` module (`apps/backend/src/modules/operations/support/`) is for Ethico staff debugging tenant issues via impersonation -- it is completely separate from this user-facing system.

The standard approach for this type of feature in a multi-tenant SaaS platform is:

1. **Knowledge base** -- Stored as articles in the database with categories, searchable via full-text search, seeded with initial content, manageable by admins.
2. **Support tickets** -- Simple ticket model that tenant users create (subject, description, priority, optional screenshots). Tickets trigger confirmation emails and are viewable by the submitting user.
3. **Contextual help links** -- Static mapping of page routes to relevant knowledge base article slugs, surfaced as "Learn more" links on relevant pages.

**Primary recommendation:** Build all three as a single `help` backend module with two Prisma models (`KnowledgeBaseArticle`, `SupportTicket`) and a frontend `/help` route with sub-pages for the knowledge base, ticket submission, and ticket history. No external libraries or third-party services needed -- this is pure CRUD with the existing stack.

## Standard Stack

### Core

No new libraries needed. This phase uses exclusively what is already in the codebase.

| Library               | Version      | Purpose                                                    | Why Standard                         |
| --------------------- | ------------ | ---------------------------------------------------------- | ------------------------------------ |
| Prisma                | ^5.8.0       | Database models for articles + tickets                     | Already the ORM in use               |
| NestJS                | existing     | Backend module (controller, service, DTOs)                 | Already the backend framework        |
| Next.js App Router    | ^14.1.0      | `/help` route with sub-pages                               | Already the frontend framework       |
| @tanstack/react-query | ^5.90.20     | Data fetching for articles + tickets                       | Already used for all API calls       |
| shadcn/ui components  | existing     | Cards, Tabs, Input, Textarea, Select, Badge, Dialog, Sheet | Already the component library        |
| lucide-react          | ^0.312.0     | Icons (HelpCircle, Search, TicketIcon, BookOpen, etc.)     | Already the icon library             |
| react-hook-form + zod | ^7.71 / ^4.3 | Ticket submission form validation                          | Already used for forms               |
| BullMQ                | ^5.67.2      | Email queue for ticket confirmation                        | Already integrated for notifications |
| MJML + Handlebars     | existing     | Email template for ticket confirmation                     | Already the email template system    |

### Supporting

| Library       | Version | Purpose                                           | When to Use                             |
| ------------- | ------- | ------------------------------------------------- | --------------------------------------- |
| @tiptap/react | ^3.18.0 | Rich text for article content (admin editing)     | If admin article editing UI is in scope |
| sonner        | ^2.0.7  | Toast notifications for ticket submission success | Already in use for toasts               |
| date-fns      | ^4.1.0  | Date formatting for ticket timestamps             | Already in use                          |

### Alternatives Considered

| Instead of        | Could Use                        | Tradeoff                                                                                     |
| ----------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| Self-built KB     | Zendesk/Intercom embedded widget | Adds external dependency, cost per seat, less control over UX, data leaves tenant boundary   |
| Database articles | Markdown files in repo           | No admin editing, no per-tenant customization, requires deploy for content changes           |
| Database search   | Elasticsearch integration        | Overkill for knowledge base with ~50-200 articles; PostgreSQL full-text search is sufficient |

**Installation:**

```bash
# No new packages to install. All dependencies already exist in the project.
```

## Architecture Patterns

### Recommended Project Structure

#### Backend

```
apps/backend/src/modules/help/
├── help.module.ts                    # NestJS module definition
├── controllers/
│   ├── knowledge-base.controller.ts  # GET articles, search
│   └── support-tickets.controller.ts # CRUD tickets
├── services/
│   ├── knowledge-base.service.ts     # Article queries, search
│   └── support-tickets.service.ts    # Ticket creation, status, email
├── dto/
│   ├── knowledge-base.dto.ts         # Article query/filter DTOs
│   ├── support-ticket.dto.ts         # Create/update ticket DTOs
│   └── index.ts                      # Barrel export
├── entities/
│   ├── help.types.ts                 # Enums, interfaces
│   └── index.ts
└── listeners/
    └── ticket.listener.ts            # EventEmitter listener for ticket events
```

#### Frontend

```
apps/frontend/src/
├── app/(authenticated)/help/
│   ├── page.tsx                      # Help center landing (search + categories)
│   ├── articles/
│   │   └── [slug]/
│   │       └── page.tsx              # Individual article view
│   ├── tickets/
│   │   ├── page.tsx                  # My tickets list
│   │   └── new/
│   │       └── page.tsx              # Submit new ticket form
│   └── layout.tsx                    # Help section layout (optional breadcrumbs)
├── services/
│   └── help.service.ts               # API client for help endpoints
├── hooks/
│   └── useHelp.ts                    # React Query hooks for help data (optional)
└── components/
    └── help/
        ├── article-card.tsx           # Article preview card
        ├── category-grid.tsx          # Category navigation grid
        ├── article-search.tsx         # Search input with results
        ├── ticket-form.tsx            # Ticket submission form
        ├── ticket-list.tsx            # User's ticket list
        └── contextual-help-link.tsx   # Reusable "Learn more" link component
```

### Pattern 1: Knowledge Base Article Model

**What:** Prisma model for knowledge base articles with categories, full-text search, and slug-based URLs.
**When to use:** For all article storage and retrieval.

```prisma
// Source: Follows existing codebase Prisma patterns (e.g., Policy model)
model KnowledgeBaseArticle {
  id              String   @id @default(uuid())
  organizationId  String?  // null = global (available to all tenants)
  slug            String   // URL-friendly identifier
  title           String
  content         String   @db.Text  // HTML or Markdown content
  excerpt         String?  // Short summary for search results
  category        String   // e.g., "getting-started", "cases", "campaigns"
  sortOrder       Int      @default(0)
  isPublished     Boolean  @default(true)
  tags            String[] @default([])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization    Organization? @relation(fields: [organizationId], references: [id])

  @@unique([slug])
  @@index([organizationId])
  @@index([category])
  @@index([isPublished])
  @@map("knowledge_base_articles")
}
```

**Key design decision:** `organizationId` is nullable. Global articles (null org) are available to all tenants. Tenant-specific articles override or supplement globals. This is similar to how `EmailTemplate` works (file-system defaults + database overrides per org).

### Pattern 2: Support Ticket Model

**What:** Prisma model for support tickets filed by tenant users.
**When to use:** For all ticket CRUD operations.

```prisma
// Source: Follows existing codebase patterns (organizationId on every tenant model)
enum TicketStatus {
  OPEN
  IN_PROGRESS
  WAITING_ON_CUSTOMER
  RESOLVED
  CLOSED

  @@map("ticket_status")
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT

  @@map("ticket_priority")
}

model SupportTicket {
  id              String         @id @default(uuid())
  organizationId  String
  userId          String         // submitting user
  ticketNumber    String         @unique  // human-readable: TICKET-XXXX
  subject         String
  description     String         @db.Text
  priority        TicketPriority @default(MEDIUM)
  status          TicketStatus   @default(OPEN)
  category        String?        // optional category tag
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  resolvedAt      DateTime?
  closedAt        DateTime?

  organization    Organization   @relation(fields: [organizationId], references: [id])
  user            User           @relation(fields: [userId], references: [id])

  @@index([organizationId])
  @@index([organizationId, userId])
  @@index([organizationId, status])
  @@map("support_tickets")
}
```

**Ticket numbering:** Auto-generate sequential `TICKET-0001` numbers per organization, similar to how Cases use reference numbers. Use a database sequence or `count + 1` approach.

**Screenshots:** Reuse the existing `Attachment` model and `StorageService`. Add `SUPPORT_TICKET` to the `AttachmentEntityType` enum. Files attach to `entityType: SUPPORT_TICKET, entityId: ticketId`.

### Pattern 3: API Service Pattern (Frontend)

**What:** Frontend API service following the existing `policies.ts` pattern.
**When to use:** For all help-related API calls.

```typescript
// Source: Matches apps/frontend/src/services/policies.ts pattern
import { apiClient } from "@/lib/api";

export interface KnowledgeBaseArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status:
    | "OPEN"
    | "IN_PROGRESS"
    | "WAITING_ON_CUSTOMER"
    | "RESOLVED"
    | "CLOSED";
  createdAt: string;
  updatedAt: string;
}

// Knowledge Base
export async function searchArticles(query: string, category?: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  return apiClient.get<KnowledgeBaseArticle[]>(`/help/articles?${params}`);
}

export async function getArticle(slug: string) {
  return apiClient.get<KnowledgeBaseArticle>(`/help/articles/${slug}`);
}

export async function getCategories() {
  return apiClient.get<Array<{ key: string; label: string; count: number }>>(
    "/help/categories",
  );
}

// Support Tickets
export async function createTicket(data: {
  subject: string;
  description: string;
  priority: string;
}) {
  return apiClient.post<SupportTicket>("/help/tickets", data);
}

export async function getMyTickets(status?: string) {
  const params = status ? `?status=${status}` : "";
  return apiClient.get<{ tickets: SupportTicket[]; total: number }>(
    `/help/tickets${params}`,
  );
}

export const helpApi = {
  searchArticles,
  getArticle,
  getCategories,
  createTicket,
  getMyTickets,
};
```

### Pattern 4: NestJS Controller Pattern

**What:** REST API endpoints following the existing controller conventions.
**When to use:** For all help module endpoints.

```typescript
// Source: Follows apps/backend/src/modules/storage/storage.controller.ts pattern
@Controller("api/v1/help")
@UseGuards(JwtAuthGuard, TenantGuard)
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get("articles")
  async searchArticles(
    @TenantId() orgId: string,
    @Query("q") query?: string,
    @Query("category") category?: string,
  ) {
    return this.kbService.searchArticles(orgId, query, category);
  }

  @Get("articles/:slug")
  async getArticle(@TenantId() orgId: string, @Param("slug") slug: string) {
    return this.kbService.getArticleBySlug(orgId, slug);
  }

  @Get("categories")
  async getCategories(@TenantId() orgId: string) {
    return this.kbService.getCategories(orgId);
  }
}
```

### Pattern 5: Contextual Help Link Component

**What:** A reusable component that maps page context to relevant KB articles.
**When to use:** On feature pages to provide quick access to relevant help.

```typescript
// Source: Custom pattern following existing codebase conventions
// Static mapping of routes to article slugs
const CONTEXTUAL_HELP_MAP: Record<string, { slug: string; label: string }[]> = {
  "/cases": [
    { slug: "working-with-cases", label: "Working with Cases" },
    { slug: "case-lifecycle", label: "Case Lifecycle Guide" },
  ],
  "/campaigns": [{ slug: "campaign-overview", label: "Campaign Overview" }],
  "/policies": [{ slug: "policy-management", label: "Managing Policies" }],
  "/analytics": [
    { slug: "understanding-analytics", label: "Understanding Analytics" },
  ],
  // ... more mappings
};

// Component usage: <ContextualHelpLink pathname="/cases" />
```

### Pattern 6: Ticket Confirmation Email

**What:** Email notification when a support ticket is submitted, using the existing notification system.
**When to use:** Every time a ticket is created.

```typescript
// Source: Follows NotificationService.notify() pattern from notification.service.ts
async onTicketCreated(ticket: SupportTicket, user: User, orgId: string) {
  await this.notificationService.notify({
    organizationId: orgId,
    recipientUserId: user.id,
    category: NotificationCategory.SYSTEM,
    type: NotificationType.SYSTEM,
    templateId: 'support/ticket-confirmation',
    context: {
      user: { name: `${user.firstName} ${user.lastName}`, email: user.email },
      ticket: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        priority: ticket.priority,
      },
    },
    title: `Support ticket ${ticket.ticketNumber} received`,
    body: `We've received your support request: "${ticket.subject}". Our team will respond shortly.`,
    entityType: 'SUPPORT_TICKET',
    entityId: ticket.id,
  });
}
```

### Anti-Patterns to Avoid

- **Embedding external help widgets (Zendesk, Intercom):** Adds third-party JS, breaks tenant isolation for analytics, adds cost. Build natively.
- **Storing articles as markdown files in the repo:** Cannot be edited by admins, requires deploys for content changes.
- **Building a full ticketing workflow engine:** This is user-facing ticket _submission_, not a full helpdesk. Ethico staff manage tickets through the existing operations/support console (Phase 12). Don't duplicate that.
- **Using Elasticsearch for KB search:** PostgreSQL `ILIKE` or `to_tsvector/to_tsquery` full-text search is sufficient for ~50-200 articles. Don't over-engineer.
- **Putting ticket reply/conversation on the user side:** Phase 23 scope is submit + view status. Ticket responses come from Ethico support staff via the operations portal. Don't build a full chat system.

## Don't Hand-Roll

| Problem                             | Don't Build             | Use Instead                                                                | Why                                                                                    |
| ----------------------------------- | ----------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| File uploads for ticket screenshots | Custom file handling    | Existing `StorageService` + `AttachmentEntityType.SUPPORT_TICKET`          | Already handles Azure Blob, signed URLs, tenant isolation                              |
| Email sending                       | Custom SMTP integration | Existing `NotificationService.notify()` + `EmailTemplateService`           | Already handles preferences, queuing, rendering, delivery tracking                     |
| Form validation (ticket form)       | Custom validation       | `react-hook-form` + `zod` (frontend), `class-validator` (backend DTOs)     | Already in use throughout the app                                                      |
| Article search                      | Custom search logic     | PostgreSQL `ILIKE` for simple search or `to_tsvector` for full-text        | Already available in Postgres 15+, no new infrastructure needed                        |
| Article content rendering           | Custom HTML parser      | `dangerouslySetInnerHTML` with DOMPurify, or render Markdown with `remark` | Articles are admin-authored, not user-generated -- XSS risk is low but sanitize anyway |
| Toast notifications                 | Custom notification UI  | `sonner` (already installed)                                               | Already the toast library in use                                                       |
| Audit logging                       | Custom logging          | Existing `AuditService`                                                    | Already tracks all entity changes                                                      |

**Key insight:** This phase is almost entirely composition of existing systems. The knowledge base is a simple CRUD module. The ticket system is a CRUD module that dispatches to the existing notification pipeline. No new infrastructure, no new dependencies.

## Common Pitfalls

### Pitfall 1: Forgetting Multi-Tenancy on Knowledge Base Articles

**What goes wrong:** Articles visible to wrong tenants, or global articles not appearing for any tenant.
**Why it happens:** The `organizationId` nullable pattern (null = global) requires careful query logic.
**How to avoid:** Article queries must use `WHERE organizationId = $orgId OR organizationId IS NULL` pattern. Test both global and tenant-specific article retrieval.
**Warning signs:** Articles disappear when switching tenants, or tenant-specific articles leak to other orgs.

### Pitfall 2: Missing SUPPORT_TICKET in AttachmentEntityType Enum

**What goes wrong:** Cannot upload screenshots for support tickets because Prisma validation rejects the entity type.
**Why it happens:** The `AttachmentEntityType` enum in `schema.prisma` currently only has `CASE`, `INVESTIGATION`, `INVESTIGATION_NOTE`.
**How to avoid:** Add `SUPPORT_TICKET` to the enum in the Prisma migration. Remember to run `npx prisma migrate dev` and `npx prisma generate`.
**Warning signs:** File upload returns 400 error with "Invalid enum value" message.

### Pitfall 3: Ticket Number Collision Under Concurrency

**What goes wrong:** Two tickets created simultaneously get the same number.
**Why it happens:** `COUNT(*) + 1` approach has a race condition without database-level locking.
**How to avoid:** Use a PostgreSQL sequence per organization, or use `SELECT ... FOR UPDATE` locking pattern when generating ticket numbers. Alternatively, use a UUID-based approach and generate display numbers asynchronously.
**Warning signs:** Duplicate ticket numbers in production.

### Pitfall 4: Not Connecting Help Button in Top Nav

**What goes wrong:** The existing HelpCircle button in `top-nav.tsx` (line 263) still does nothing after the phase is "complete."
**Why it happens:** Developer focuses on building the `/help` page but forgets to wire up the existing button.
**How to avoid:** Wire the existing `<Button>` on line 263 of `top-nav.tsx` to navigate to `/help`, or open a dropdown with "Knowledge Base" and "Submit Ticket" options. Also add Help to the sidebar navigation.
**Warning signs:** QA testing reveals the top nav button still does nothing.

### Pitfall 5: Not Seeding Initial Knowledge Base Content

**What goes wrong:** The help section launches with zero articles -- users see an empty page.
**Why it happens:** Developer builds the infrastructure but doesn't create seed articles.
**How to avoid:** Create a Prisma seed script or migration that inserts initial global articles covering: Getting Started, Cases, Campaigns, Reports, Settings, Policies, Investigations, and FAQs. At least 2-3 articles per category.
**Warning signs:** Help center looks empty on first deploy.

### Pitfall 6: Heavy Article Content Breaking Page Performance

**What goes wrong:** Listing endpoint returns full article content, causing slow page loads.
**Why it happens:** Not distinguishing between list/search (needs excerpt only) and detail (needs full content) views.
**How to avoid:** List/search endpoints return `id, slug, title, excerpt, category, tags, updatedAt` only. Detail endpoint returns full `content`. Use Prisma `select` to control returned fields.
**Warning signs:** Help center landing page takes >2 seconds to load.

## Code Examples

### Backend Service: Search Articles with PostgreSQL

```typescript
// Source: Standard Prisma pattern, verified against existing codebase
async searchArticles(organizationId: string, query?: string, category?: string) {
  const where: Prisma.KnowledgeBaseArticleWhereInput = {
    isPublished: true,
    OR: [
      { organizationId },       // Tenant-specific articles
      { organizationId: null }, // Global articles
    ],
  };

  if (category) {
    where.category = category;
  }

  if (query) {
    where.AND = [
      where.AND || {},
      {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } },
        ],
      },
    ];
  }

  return this.prisma.knowledgeBaseArticle.findMany({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      tags: true,
      updatedAt: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
}
```

### Backend Service: Create Support Ticket

```typescript
// Source: Standard pattern following existing codebase conventions
async createTicket(
  organizationId: string,
  userId: string,
  dto: CreateSupportTicketDto,
): Promise<SupportTicket> {
  // Generate ticket number
  const count = await this.prisma.supportTicket.count({
    where: { organizationId },
  });
  const ticketNumber = `TICKET-${String(count + 1).padStart(4, '0')}`;

  const ticket = await this.prisma.supportTicket.create({
    data: {
      organizationId,
      userId,
      ticketNumber,
      subject: dto.subject,
      description: dto.description,
      priority: dto.priority || 'MEDIUM',
      category: dto.category,
    },
  });

  // Emit event for notification listener
  this.eventEmitter.emit('support.ticket.created', {
    ticket,
    organizationId,
    userId,
  });

  return ticket;
}
```

### Frontend: Help Center Landing Page Structure

```tsx
// Source: Follows existing page patterns (policies/page.tsx)
export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Hero with search */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">How can we help?</h1>
        <div className="max-w-xl mx-auto">
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Category grid */}
      <CategoryGrid />

      {/* Quick links */}
      <div className="mt-8 text-center">
        <Button asChild variant="outline">
          <Link href="/help/tickets/new">Submit a Support Ticket</Link>
        </Button>
      </div>
    </div>
  );
}
```

### Frontend: Ticket Submission Form

```tsx
// Source: Follows react-hook-form + zod pattern used throughout codebase
const ticketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(20, "Please provide more detail"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  category: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;
```

### Navigation Wiring: Help in Sidebar Footer

```typescript
// Source: Follows apps/frontend/src/components/layout/app-sidebar.tsx pattern
// Add to SidebarFooter alongside AI Assistant button
<SidebarMenuItem>
  <SidebarMenuButton tooltip="Help & Support" asChild>
    <Link href="/help">
      <HelpCircle />
      <span>Help & Support</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

### Navigation Wiring: Top Nav Help Button

```typescript
// Source: apps/frontend/src/components/layout/top-nav.tsx line 263
// Change from no-op button to navigation or dropdown
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" title="Help & Support"
      className="text-white/80 hover:text-white hover:bg-white/10">
      <HelpCircle className="h-5 w-5" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    <DropdownMenuItem asChild>
      <Link href="/help">Knowledge Base</Link>
    </DropdownMenuItem>
    <DropdownMenuItem asChild>
      <Link href="/help/tickets/new">Submit a Ticket</Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild>
      <Link href="/help/tickets">My Tickets</Link>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## State of the Art

| Old Approach                        | Current Approach                                            | When Changed           | Impact                                                             |
| ----------------------------------- | ----------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------ |
| Embed Zendesk/Intercom widget       | Build native in-app help center                             | 2023+                  | Better control, no third-party JS, tenant isolation preserved      |
| Static FAQ page                     | Searchable, categorized knowledge base                      | Standard practice      | Users find answers faster, reduces support ticket volume           |
| Email-only support                  | In-app ticket filing + email confirmation                   | Standard practice      | Users don't leave the app, tickets have structured data            |
| Full ticketing system on both sides | Submit + view status (user) + manage (staff via ops portal) | Practical SaaS pattern | Users submit, staff manage separately -- don't build two admin UIs |

**Deprecated/outdated:**

- Embedding third-party chat widgets: Privacy concerns, blocks ad-blockers, inconsistent UX
- Static HTML help pages: No search, no structure, poor discoverability

## Open Questions

1. **Article content format: HTML or Markdown?**
   - What we know: Tiptap is already installed for rich text editing. Storing as HTML is simpler for rendering. Storing as Markdown is simpler for seeding.
   - What's unclear: Whether admins will need a WYSIWYG editor for articles in-app, or if initial content is developer-seeded only.
   - Recommendation: Store as HTML. Seed initial content as HTML strings in a migration. If admin editing is needed later, use Tiptap (already installed). This is LOW priority for v1 -- seed content first, add editing later.

2. **Should tickets integrate with an external system (Jira, Zendesk)?**
   - What we know: The requirements say "creates ticket in support system" -- ambiguous whether this means our database or an external tool.
   - What's unclear: Whether Ethico staff use an external ticketing tool.
   - Recommendation: Build self-contained first (tickets in our database, viewable in the operations portal). Add webhook/integration for external systems as a future enhancement. This keeps phase scope manageable.

3. **Per-tenant article customization scope?**
   - What we know: The nullable `organizationId` pattern supports both global and tenant-specific articles.
   - What's unclear: Whether any tenant actually needs custom articles in v1.
   - Recommendation: Build the schema to support it (nullable org ID), but seed only global articles for v1. Don't build tenant article management UI yet.

4. **Knowledge base article categories -- fixed enum or free-form?**
   - What we know: Success criteria list specific categories: Getting Started, Cases, Campaigns, Reports, Settings.
   - What's unclear: Whether categories should be extensible.
   - Recommendation: Use free-form string categories with a predefined set of standard category keys. This allows flexibility without over-engineering an enum. Define the standard categories as constants.

## Sources

### Primary (HIGH confidence)

- Existing codebase: `apps/backend/src/modules/operations/support/` -- Internal support console pattern (verified by reading source)
- Existing codebase: `apps/backend/src/modules/notifications/services/notification.service.ts` -- Notification dispatch pattern (verified by reading source)
- Existing codebase: `apps/backend/src/modules/storage/storage.controller.ts` -- File upload with AttachmentEntityType pattern (verified by reading source)
- Existing codebase: `apps/frontend/src/services/policies.ts` -- Frontend API service pattern (verified by reading source)
- Existing codebase: `apps/frontend/src/lib/api.ts` -- apiClient pattern (verified by reading source)
- Existing codebase: `apps/frontend/src/lib/navigation.ts` -- NavItem interface and navigation structure (verified by reading source)
- Existing codebase: `apps/frontend/src/components/layout/top-nav.tsx` -- HelpCircle button at line 263 (verified by reading source)
- Existing codebase: `apps/frontend/src/components/layout/app-sidebar.tsx` -- SidebarFooter pattern (verified by reading source)
- Existing codebase: `apps/backend/prisma/schema.prisma` -- All model patterns with organizationId (verified by reading source)

### Secondary (MEDIUM confidence)

- SaaS knowledge base best practices: [Help Scout](https://www.helpscout.com/blog/saas-knowledge-base/), [Userpilot](https://userpilot.com/blog/how-to-build-a-knowledge-base/) -- Category organization, search, in-app resource center patterns
- Multi-tenant architecture: [Microsoft Azure](https://learn.microsoft.com/en-us/azure/architecture/guide/saas-multitenant-solution-architecture/) -- Tenant isolation patterns for shared database

### Tertiary (LOW confidence)

- None. All findings verified against codebase or multiple sources.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- No new libraries needed; everything already in the codebase
- Architecture: HIGH -- Follows established NestJS module + Next.js page patterns exactly
- Pitfalls: HIGH -- Based on direct code inspection of existing patterns (AttachmentEntityType enum, top-nav button, multi-tenancy)
- Code examples: HIGH -- All examples derived from actual codebase patterns

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable domain, no fast-moving dependencies)
