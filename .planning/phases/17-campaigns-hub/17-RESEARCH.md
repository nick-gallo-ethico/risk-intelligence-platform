# Phase 17: Campaigns Hub - Research

**Researched:** 2026-02-07
**Domain:** Frontend campaign management hub, form builder integration, navigation
**Confidence:** HIGH

## Summary

This phase is primarily a frontend integration and page-building effort. The research reveals that a significant amount of infrastructure already exists -- the campaign backend is complete (CRUD, lifecycle, targeting, scheduling, assignments, dashboard stats), and rich frontend components already exist (CampaignBuilder wizard, SegmentBuilder, ScheduleConfig, FormBuilder with drag-drop, DisclosureForm, campaigns list page with filters/table/summary cards). However, critical page-level routes are missing and the navigation does not include a "Campaigns" entry in the main sidebar.

The key gap is: individual components exist but they are not wired into complete page routes. The `/campaigns` list page exists and works. But `/campaigns/new`, `/campaigns/[id]` (detail), and `/campaigns/[id]/edit` were deleted and need to be recreated in the `(authenticated)` route group. Additionally, a "Forms" section page needs to be created, and the sidebar navigation needs updating to include Campaigns and Forms links.

**Primary recommendation:** Wire existing components into page routes (campaigns/new, campaigns/[id], forms), add sidebar navigation entries for Campaigns and Forms, add a campaign dashboard endpoint to the backend controller, and extend the campaign type system to include all required campaign types.

## Standard Stack

### Core (Already In-Place)

| Library                  | Version | Purpose                                                     | Status   |
| ------------------------ | ------- | ----------------------------------------------------------- | -------- |
| Next.js App Router       | 14+     | Page routing with `(authenticated)` group                   | EXISTING |
| React Query (TanStack)   | 5.x     | Data fetching with `useCampaigns`, `useCampaignStats` hooks | EXISTING |
| shadcn/ui components     | Latest  | Card, Table, Button, Badge, Dialog, Tabs, Select, etc.      | EXISTING |
| @dnd-kit/core + sortable | Latest  | FormBuilder drag-drop field placement                       | EXISTING |
| react-hook-form          | Latest  | DisclosureForm field management                             | EXISTING |
| Ajv + ajv-formats        | Latest  | Form schema validation                                      | EXISTING |
| date-fns                 | Latest  | Date formatting in ScheduleConfig                           | EXISTING |
| Lucide React             | Latest  | Icons throughout                                            | EXISTING |

### Supporting (Needed for Hub)

| Library                          | Version | Purpose                      | When to Use             |
| -------------------------------- | ------- | ---------------------------- | ----------------------- |
| apiClient (lib/api)              | Custom  | HTTP requests to `/api/v1/*` | All API calls           |
| campaignsApi (lib/campaigns-api) | Custom  | Typed campaign API methods   | Campaign CRUD/lifecycle |
| toast (components/ui/toaster)    | Custom  | User notifications           | Success/error feedback  |

### No Additional Libraries Needed

The existing component library and data fetching infrastructure is sufficient. This phase does not require any new library installations.

## Architecture Patterns

### Project Structure - What Exists

```
apps/frontend/src/
├── app/(authenticated)/
│   ├── campaigns/
│   │   └── page.tsx              # EXISTS - campaigns list page
│   │   (MISSING: new/page.tsx)   # NEED - campaign creation page
│   │   (MISSING: [id]/page.tsx)  # NEED - campaign detail/edit page
│   ├── disclosures/
│   │   └── page.tsx              # EXISTS - disclosures list
│   ├── intake-forms/
│   │   └── page.tsx              # EXISTS - intake forms list
│   (MISSING: forms/page.tsx)     # NEED - forms management page
├── components/
│   ├── campaigns/
│   │   ├── CampaignBuilder.tsx   # EXISTS - 4-step wizard (basic, audience, schedule, review)
│   │   ├── SegmentBuilder.tsx    # EXISTS - simple/advanced audience targeting
│   │   ├── ScheduleConfig.tsx    # EXISTS - launch timing, deadlines, reminders
│   │   ├── campaigns-table.tsx   # EXISTS - sortable campaigns data table
│   │   ├── campaigns-filters.tsx # EXISTS - type/status/date/search filters
│   │   └── campaigns-summary-cards.tsx # EXISTS - active/pending/completed/reach stats
│   ├── disclosures/
│   │   ├── DisclosureForm.tsx    # EXISTS - multi-step disclosure form wizard
│   │   ├── DraftIndicator.tsx    # EXISTS - auto-save status indicator
│   │   └── form-builder/
│   │       ├── FormBuilder.tsx   # EXISTS - drag-drop form designer with sections
│   │       ├── FieldPalette.tsx  # EXISTS - 15 field types (basic + compliance + advanced)
│   │       └── FormPreview.tsx   # EXISTS - desktop/tablet/mobile preview
├── hooks/
│   └── use-campaigns.ts          # EXISTS - React Query hooks for all campaign operations
├── lib/
│   ├── campaigns-api.ts          # EXISTS - typed API client
│   └── navigation.ts            # EXISTS but MISSING campaigns entry
├── types/
│   └── campaign.ts              # EXISTS - Campaign, CampaignType, CampaignStatus types
```

### Project Structure - What Needs Creation

```
apps/frontend/src/
├── app/(authenticated)/
│   ├── campaigns/
│   │   ├── page.tsx              # ENHANCE - add "Forms" link, improve hub feel
│   │   ├── new/
│   │   │   └── page.tsx          # CREATE - wraps CampaignBuilder
│   │   └── [id]/
│   │       └── page.tsx          # CREATE - campaign detail with dashboard + edit
│   ├── forms/
│   │   └── page.tsx              # CREATE - forms management page (RIU types hub)
│   │   └── new/
│   │       └── page.tsx          # CREATE - wraps FormBuilder for new form
│   │   └── [id]/
│   │       └── page.tsx          # CREATE - form edit with FormBuilder
├── components/
│   ├── campaigns/
│   │   └── campaign-detail.tsx   # CREATE - campaign detail view with stats/actions
│   ├── forms/
│   │   └── forms-list.tsx        # CREATE - forms list with type filtering
├── lib/
│   └── navigation.ts            # MODIFY - add Campaigns and Forms nav items
```

### Pattern 1: Page Wraps Existing Components

**What:** New pages should compose existing components rather than building new UI
**When to use:** For campaigns/new, campaigns/[id], forms pages
**Example:**

```typescript
// apps/frontend/src/app/(authenticated)/campaigns/new/page.tsx
'use client';

import { CampaignBuilder } from '@/components/campaigns';

export default function NewCampaignPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Create Campaign</h1>
      <CampaignBuilder
        onSave={async (draft) => {
          // Save via campaignsApi
        }}
        onLaunch={async (draft) => {
          // Launch via campaignsApi
        }}
      />
    </div>
  );
}
```

### Pattern 2: Campaign Detail Page with Tabs

**What:** Campaign detail page shows campaign info, statistics, and assignment tracking
**When to use:** For /campaigns/[id] route
**Example structure:**

- Tab 1: Overview (summary cards, completion progress, timeline)
- Tab 2: Assignments (list of employee assignments with status)
- Tab 3: Settings (campaign config, editable for DRAFT status)
- Action buttons: Launch/Pause/Resume/Cancel based on status

### Pattern 3: Navigation Update

**What:** Add Campaigns to main sidebar navigation items
**When to use:** Navigation config update

```typescript
// In lib/navigation.ts, add to navigationItems array:
{
  title: 'Campaigns',
  url: '/campaigns',
  icon: Megaphone,  // from lucide-react
},
```

### Pattern 4: Forms Hub Page

**What:** A page listing all form definitions with their types and status
**When to use:** For /forms route, accessible from campaigns hub
**Content:** Show all FormType values (INTAKE, DISCLOSURE, ATTESTATION, SURVEY, WORKFLOW_TASK, CUSTOM) with create/edit/clone/publish actions

### Anti-Patterns to Avoid

- **Rebuilding existing components:** CampaignBuilder, SegmentBuilder, ScheduleConfig, FormBuilder are fully functional. Do NOT rebuild; wrap them in pages.
- **Duplicating API logic:** Use existing `campaignsApi` client and `use-campaigns.ts` hooks. Do not create parallel fetch logic.
- **Mixing page logic with component logic:** Pages should be thin wrappers. Complex state lives in components.
- **Ignoring campaign status restrictions:** Backend enforces that only DRAFT/SCHEDULED campaigns can be fully edited. Frontend should disable editing for ACTIVE/COMPLETED campaigns.

## Existing Component Inventory (CRITICAL)

### Fully Built Components - Use As-Is

| Component               | Location                                             | What It Does                                                                      | Status   |
| ----------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- | -------- |
| `CampaignBuilder`       | components/campaigns/CampaignBuilder.tsx             | 4-step campaign creation wizard (Basic Info, Audience, Schedule, Review + Launch) | COMPLETE |
| `SegmentBuilder`        | components/campaigns/SegmentBuilder.tsx              | Simple/Advanced audience targeting with live preview                              | COMPLETE |
| `ScheduleConfig`        | components/campaigns/ScheduleConfig.tsx              | Launch timing (immediate/scheduled/staggered), deadlines, reminders with presets  | COMPLETE |
| `CampaignsTable`        | components/campaigns/campaigns-table.tsx             | Sortable data table with status/type badges and completion progress               | COMPLETE |
| `CampaignsFilters`      | components/campaigns/campaigns-filters.tsx           | Type, status, date range, search filters                                          | COMPLETE |
| `CampaignsSummaryCards` | components/campaigns/campaigns-summary-cards.tsx     | Active/Pending/Completed/Total Reach stat cards                                   | COMPLETE |
| `FormBuilder`           | components/disclosures/form-builder/FormBuilder.tsx  | Full drag-drop form designer with sections, fields, config panel                  | COMPLETE |
| `FieldPalette`          | components/disclosures/form-builder/FieldPalette.tsx | 15 draggable field types (basic + compliance + advanced)                          | COMPLETE |
| `FormPreview`           | components/disclosures/form-builder/FormPreview.tsx  | Desktop/tablet/mobile preview with field rendering                                | COMPLETE |
| `DisclosureForm`        | components/disclosures/DisclosureForm.tsx            | Multi-step form wizard with auto-save, validation, attestation                    | COMPLETE |
| `DraftIndicator`        | components/disclosures/DraftIndicator.tsx            | Saving/saved/error status indicator                                               | COMPLETE |

### Fully Built Data Layer

| Item               | Location               | What It Does                                                                                                                                                                                                           |
| ------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `use-campaigns.ts` | hooks/use-campaigns.ts | React Query hooks: `useCampaigns`, `useCampaignStats`, `useCampaign`, `useCreateCampaign`, `useUpdateCampaign`, `useLaunchCampaign`, `usePauseCampaign`, `useResumeCampaign`, `useCancelCampaign`, `useDeleteCampaign` |
| `campaigns-api.ts` | lib/campaigns-api.ts   | Typed API client: `list`, `getById`, `getStats`, `getCampaignStats`, `create`, `update`, `launch`, `pause`, `resume`, `cancel`, `delete`                                                                               |
| `campaign.ts`      | types/campaign.ts      | Types: `Campaign`, `CampaignType`, `CampaignStatus`, `CampaignQueryParams`, `CampaignDashboardStats`, labels and color maps                                                                                            |

### Existing Pages

| Page           | Route           | Status                                                                  |
| -------------- | --------------- | ----------------------------------------------------------------------- |
| Campaigns List | `/campaigns`    | EXISTS - full page with summary cards, tabs, filters, table, pagination |
| Disclosures    | `/disclosures`  | EXISTS - HubSpot-style saved views                                      |
| Intake Forms   | `/intake-forms` | EXISTS - HubSpot-style saved views with channel links                   |

## Don't Hand-Roll

| Problem                  | Don't Build          | Use Instead                                                  | Why                                                                 |
| ------------------------ | -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Campaign creation wizard | New wizard component | `CampaignBuilder` component                                  | Already has 4-step flow, validation, save/launch                    |
| Audience targeting       | Custom targeting UI  | `SegmentBuilder` component                                   | Has simple + advanced modes, live preview, CSV export               |
| Schedule configuration   | Custom scheduler     | `ScheduleConfig` component                                   | Has immediate/scheduled/staggered, blackout dates, reminder presets |
| Form building            | New form designer    | `FormBuilder` from disclosures                               | Has drag-drop, 15 field types, section config, auto-save            |
| Campaign data fetching   | Custom fetch logic   | `use-campaigns.ts` hooks                                     | React Query with cache invalidation, optimistic updates             |
| Campaign API calls       | Raw fetch/axios      | `campaignsApi` client                                        | Typed methods for all campaign operations                           |
| Campaign type display    | Hard-coded labels    | `CAMPAIGN_TYPE_LABELS`, `CAMPAIGN_STATUS_LABELS`, color maps | Centralized in types/campaign.ts                                    |

**Key insight:** This phase is 80% page composition and 20% gap-filling. The components, hooks, API client, and types are all built. The work is creating page routes that compose them, adding navigation entries, and filling small backend gaps (dashboard endpoint).

## Common Pitfalls

### Pitfall 1: Rebuilding What Exists

**What goes wrong:** Creating new campaign UI components when perfectly good ones exist
**Why it happens:** Not fully understanding the existing component inventory
**How to avoid:** Read the component inventory above. Use `CampaignBuilder` for creation, `CampaignsTable` + filters for listing, `FormBuilder` for form design.
**Warning signs:** Creating any file in `components/campaigns/` that overlaps with existing files

### Pitfall 2: Missing Campaign Types

**What goes wrong:** Frontend `CampaignType` only has `DISCLOSURE | ATTESTATION | SURVEY` but the phase requires "stay interviews" and other types
**Why it happens:** Backend Prisma enum only defines 3 types currently
**How to avoid:** The CampaignBuilder already supports `ACKNOWLEDGMENT` type in its UI. Decide if new types need schema changes or can work through existing types. Stay interviews could be a SURVEY type.
**Warning signs:** Users not seeing expected campaign type options

### Pitfall 3: Dashboard Stats Endpoint Not Wired

**What goes wrong:** `campaignsApi.getStats()` calls `/campaigns/dashboard/stats` but no controller endpoint exists for this
**Why it happens:** `CampaignDashboardService` exists as a service but no controller route maps to it
**How to avoid:** Add dashboard controller endpoints to campaigns controller or create a separate dashboard controller
**Warning signs:** Stats cards showing 0s or loading endlessly

### Pitfall 4: Navigation Not Updated

**What goes wrong:** Users can't find the campaigns hub because it's not in the sidebar
**Why it happens:** `lib/navigation.ts` doesn't have a Campaigns entry; it's only in the mobile "more" drawer
**How to avoid:** Add Campaigns and Forms to the `navigationItems` array in `lib/navigation.ts`
**Warning signs:** Campaign pages accessible only by direct URL

### Pitfall 5: Deleted Route Pages

**What goes wrong:** `/campaigns/new` returns 404
**Why it happens:** Pages at `app/campaigns/new/page.tsx` and `app/campaigns/[id]/edit/page.tsx` were deleted (git status shows this). They need to be recreated under `app/(authenticated)/campaigns/`
**How to avoid:** Create pages in the `(authenticated)` route group, not the root `app/` directory
**Warning signs:** "Create Campaign" button navigates to 404

### Pitfall 6: Form Builder is Under Disclosures

**What goes wrong:** The FormBuilder component is in `components/disclosures/form-builder/` which implies it's disclosure-specific
**Why it happens:** It was originally built for disclosures but is actually generic
**How to avoid:** Import it from its current location; it's already exported. Consider if it needs to be moved to a shared location, but for now importing works fine.
**Warning signs:** Confusion about where FormBuilder lives vs where it's used

## Backend API Gap Analysis

### Existing Backend Endpoints (All Working)

| Endpoint                                     | Method | Purpose                                        |
| -------------------------------------------- | ------ | ---------------------------------------------- |
| `POST /api/v1/campaigns`                     | POST   | Create campaign                                |
| `GET /api/v1/campaigns`                      | GET    | List campaigns (with status, type, pagination) |
| `GET /api/v1/campaigns/:id`                  | GET    | Get single campaign                            |
| `PUT /api/v1/campaigns/:id`                  | PUT    | Update campaign                                |
| `POST /api/v1/campaigns/:id/launch`          | POST   | Launch campaign                                |
| `POST /api/v1/campaigns/:id/pause`           | POST   | Pause campaign                                 |
| `POST /api/v1/campaigns/:id/resume`          | POST   | Resume campaign                                |
| `POST /api/v1/campaigns/:id/cancel`          | POST   | Cancel campaign                                |
| `DELETE /api/v1/campaigns/:id`               | DELETE | Delete draft campaign                          |
| `GET /api/v1/campaigns/:id/statistics`       | GET    | Campaign statistics                            |
| `GET /api/v1/campaigns/:id/assignments`      | GET    | Campaign assignments                           |
| `POST /api/v1/campaigns/segments/preview`    | POST   | Preview audience                               |
| `POST /api/v1/forms/definitions`             | POST   | Create form definition                         |
| `GET /api/v1/forms/definitions`              | GET    | List form definitions                          |
| `GET /api/v1/forms/definitions/:id`          | GET    | Get form definition                            |
| `PATCH /api/v1/forms/definitions/:id`        | PATCH  | Update form definition                         |
| `POST /api/v1/forms/definitions/:id/publish` | POST   | Publish form                                   |
| `POST /api/v1/forms/definitions/:id/clone`   | POST   | Clone form                                     |

### Missing Backend Endpoints (Need to Create)

| Endpoint                                   | Method | Purpose            | Service Exists?                                         |
| ------------------------------------------ | ------ | ------------------ | ------------------------------------------------------- |
| `GET /api/v1/campaigns/dashboard/stats`    | GET    | Dashboard stats    | YES - `CampaignDashboardService.getDashboardStats()`    |
| `GET /api/v1/campaigns/dashboard/overdue`  | GET    | Overdue campaigns  | YES - `CampaignDashboardService.getOverdueCampaigns()`  |
| `GET /api/v1/campaigns/dashboard/upcoming` | GET    | Upcoming deadlines | YES - `CampaignDashboardService.getUpcomingDeadlines()` |
| `POST /api/v1/campaigns/:id/remind`        | POST   | Send reminders     | Partial - `CampaignReminderService` exists              |

## Code Examples

### Creating the Campaign Detail Page

```typescript
// Source: Existing patterns from campaigns list page
// apps/frontend/src/app/(authenticated)/campaigns/[id]/page.tsx

"use client";

import { useParams, useRouter } from "next/navigation";
import {
  useCampaign,
  useLaunchCampaign,
  usePauseCampaign,
} from "@/hooks/use-campaigns";
import { campaignsApi } from "@/lib/campaigns-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
} from "@/types/campaign";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: campaign, isLoading } = useCampaign(id);
  const launch = useLaunchCampaign();
  const pause = usePauseCampaign();

  // Render campaign detail with tabs: Overview, Assignments, Settings
  // Use existing Badge, Progress, Card components
}
```

### Adding Dashboard Stats Controller Endpoint

```typescript
// Source: Existing CampaignDashboardService
// Add to campaigns.controller.ts or create new dashboard controller

@Get('dashboard/stats')
@ApiOperation({ summary: 'Get campaign dashboard statistics' })
async getDashboardStats() {
  return this.dashboardService.getDashboardStats(TEMP_ORG_ID);
}
```

### Creating Forms Hub Page

```typescript
// Source: Existing forms controller patterns
// apps/frontend/src/app/(authenticated)/forms/page.tsx

"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Form types from Prisma schema:
// INTAKE, DISCLOSURE, ATTESTATION, SURVEY, WORKFLOW_TASK, CUSTOM
const FORM_TYPES = [
  {
    value: "DISCLOSURE",
    label: "Disclosures",
    description: "COI, gifts, outside employment",
  },
  {
    value: "ATTESTATION",
    label: "Attestations",
    description: "Policy acknowledgments",
  },
  { value: "SURVEY", label: "Surveys", description: "Compliance surveys" },
  {
    value: "INTAKE",
    label: "Intake Forms",
    description: "Ethics portal, web forms",
  },
  {
    value: "CUSTOM",
    label: "Custom Forms",
    description: "General purpose forms",
  },
];
```

### Updating Navigation

```typescript
// Source: Existing navigation.ts pattern
// Add to navigationItems array in lib/navigation.ts

import { Megaphone, FormInput } from 'lucide-react';

// Add after 'Projects' entry:
{
  title: 'Campaigns',
  url: '/campaigns',
  icon: Megaphone,
},
// Or add Forms as a sub-item or separate entry
```

## State of the Art

| Old Approach                      | Current Approach                                   | When Changed               | Impact                                                                   |
| --------------------------------- | -------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| Pages at `/app/campaigns/` (root) | Pages at `/app/(authenticated)/campaigns/`         | Phase 14 routing migration | Old route pages were deleted, need recreation in authenticated group     |
| No sidebar entry for Campaigns    | Campaigns accessible via mobile "more" drawer only | Phase 11.1                 | Need to add to main sidebar navigation                                   |
| FormBuilder in disclosures only   | FormBuilder is generic, usable for any form type   | Phase 9                    | Can import from `components/disclosures/form-builder/` for the Forms hub |

## Open Questions

1. **Campaign Type Expansion**
   - What we know: Backend has DISCLOSURE, ATTESTATION, SURVEY. CampaignBuilder UI also includes ACKNOWLEDGMENT.
   - What's unclear: The phase mentions "stay interviews" as a campaign type. Is this a new Prisma enum value or a SURVEY subtype?
   - Recommendation: Map "stay interviews" to SURVEY type with a category tag. Avoid schema migration if possible.

2. **RIU Types in Forms Section**
   - What we know: The phase mentions showing "disclosures, hotline intake, surveys, proxy forms, web intake" in a Forms section
   - What's unclear: These map to different backend models (RIU types, FormType enum, disclosure forms). Is this a unified view or links to different pages?
   - Recommendation: Create a Forms hub page that groups by FormType enum and links to the appropriate management pages (disclosures page, intake forms page, etc.)

3. **Dashboard Stats Endpoint**
   - What we know: `CampaignDashboardService` has complete implementations for stats, overdue, upcoming, weekly trends, non-responder reports
   - What's unclear: No controller routes exist to expose these endpoints
   - Recommendation: Add 3-4 controller routes to wire up the existing service methods. This is a small backend task.

4. **Demo Data for Campaigns**
   - What we know: Demo data checkpoint requires active/completed campaigns visible
   - What's unclear: Whether campaign demo data seeder exists
   - Recommendation: Check/create campaign seeder data in Phase 17 plans

## Sources

### Primary (HIGH confidence)

- Direct codebase analysis of all files listed in component inventory
- `apps/frontend/src/components/campaigns/` - All 7 files read
- `apps/frontend/src/components/disclosures/` - All 5 files read
- `apps/backend/src/modules/campaigns/` - Controller, service, dashboard service read
- `apps/backend/src/modules/forms/` - Controller read
- `apps/frontend/src/app/(authenticated)/campaigns/page.tsx` - Existing page read
- `apps/frontend/src/lib/navigation.ts` - Navigation config read
- `apps/backend/prisma/schema.prisma` - Enum definitions verified

### Secondary (MEDIUM confidence)

- Git status showing deleted route pages (`app/campaigns/new`, `app/campaigns/[id]/edit`)
- RIU types from `apps/backend/src/modules/rius/types/riu.types.ts`

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - directly verified from codebase
- Architecture: HIGH - all existing components and pages read in full
- Pitfalls: HIGH - identified from actual gaps in codebase (missing routes, missing controller endpoints, navigation gaps)
- Component inventory: HIGH - every file read and analyzed

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable -- mostly existing code composition)
