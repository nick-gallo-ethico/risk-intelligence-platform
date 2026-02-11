---
phase: 17
plan: 03
subsystem: forms-management
tags: [forms, frontend, react-query, formbuilder]
dependency-graph:
  requires:
    - "Phase 17-01: Campaign hub infrastructure"
    - "Phase 17-02: Campaign API extensions"
  provides:
    - "Forms hub page at /forms"
    - "Form creation workflow at /forms/new"
    - "Form editing workflow at /forms/[id]"
    - "Forms API client (forms-api.ts)"
    - "Forms React Query hooks (use-forms.ts)"
  affects:
    - "Phase 18+: Form templates for campaigns"
    - "Disclosures module: FormBuilder reuse"
tech-stack:
  added:
    - "None - uses existing dependencies"
  patterns:
    - "React Query for forms data management"
    - "URL search params for filter state"
    - "FormBuilder integration for visual editing"
key-files:
  created:
    - "apps/frontend/src/lib/forms-api.ts"
    - "apps/frontend/src/hooks/use-forms.ts"
    - "apps/frontend/src/app/(authenticated)/forms/page.tsx"
    - "apps/frontend/src/app/(authenticated)/forms/new/page.tsx"
    - "apps/frontend/src/app/(authenticated)/forms/[id]/page.tsx"
    - "apps/frontend/src/components/forms/forms-list.tsx"
  modified: []
decisions:
  - key: "forms-api-endpoint-prefix"
    choice: "/forms/definitions"
    rationale: "Follows existing backend API pattern for form definitions"
  - key: "formbuilder-reuse"
    choice: "Import from disclosures/form-builder"
    rationale: "Reuse existing FormBuilder component rather than duplicate"
  - key: "type-filter-via-url"
    choice: "URL search params for type filter"
    rationale: "Enables shareable filtered views and browser history support"
metrics:
  duration: "~25 minutes"
  completed: "2026-02-11"
---

# Phase 17 Plan 03: Forms Hub Summary

Forms management hub with API client, React Query hooks, and three pages for listing, creating, and editing form definitions.

## One-Liner

Forms hub with type-filterable list, creation/edit pages using FormBuilder, and quick links to disclosures/intake-forms hubs.

## What Was Built

### Task 1: Forms API Client and React Query Hooks

**Files created:**

- `apps/frontend/src/lib/forms-api.ts` - Typed API client for form definitions
- `apps/frontend/src/hooks/use-forms.ts` - React Query hooks with cache management

**API methods:**

- `formsApi.list(params?)` - GET /forms/definitions with type filtering
- `formsApi.getById(id)` - GET /forms/definitions/:id
- `formsApi.create(dto)` - POST /forms/definitions
- `formsApi.update(id, dto)` - PATCH /forms/definitions/:id
- `formsApi.publish(id)` - POST /forms/definitions/:id/publish
- `formsApi.clone(id)` - POST /forms/definitions/:id/clone

**React Query hooks:**

- `useForms(params?)` - Fetch form list with 30s stale time
- `useForm(id)` - Fetch single form by ID
- `useCreateForm()` - Create mutation with list invalidation
- `useUpdateForm()` - Update mutation with cache update and list invalidation
- `usePublishForm()` - Publish mutation with cache update
- `useCloneForm()` - Clone mutation with list invalidation

**Commit:** 4733750 (committed as part of parallel plan 17-02)

### Task 2: Forms Hub Pages and FormsList Component

**Files created:**

- `apps/frontend/src/app/(authenticated)/forms/page.tsx` - Forms hub page
- `apps/frontend/src/app/(authenticated)/forms/new/page.tsx` - New form creation page
- `apps/frontend/src/app/(authenticated)/forms/[id]/page.tsx` - Form edit page
- `apps/frontend/src/components/forms/forms-list.tsx` - Forms list with filtering

**Forms hub page (/forms):**

- Type filtering via tabs (All, Disclosures, Attestations, Surveys, Intake, Custom)
- Quick links to /disclosures and /intake-forms hubs
- FormsList component with table display
- Create Form button linking to /forms/new

**New form page (/forms/new):**

- Two-step flow: metadata entry (name, type, description) then FormBuilder
- Type selector with all form types
- Save button creates form via useCreateForm hook
- Redirects to edit page on successful creation

**Form edit page (/forms/[id]):**

- Loads existing form schema into FormBuilder
- Auto-save via FormBuilder's onSave callback
- Manual save button with unsaved changes tracking
- Publish button (for DRAFT forms only)
- Clone button to duplicate form
- Status badge and version display

**FormsList component:**

- Type filtering tabs
- Table with columns: Name, Type (badge), Status (badge), Version, Updated
- Clickable rows navigate to edit page
- Empty state message
- Loading skeleton

**Commit:** 58ba8ad

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### Type Definitions

```typescript
type FormType =
  | "INTAKE"
  | "DISCLOSURE"
  | "ATTESTATION"
  | "SURVEY"
  | "WORKFLOW_TASK"
  | "CUSTOM";
type FormStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface FormDefinition {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: FormType;
  status: FormStatus;
  version: number;
  schema?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdById?: string;
}
```

### FormBuilder Integration

The FormBuilder component is imported from the existing disclosures module:

```typescript
import {
  FormBuilder,
  type FormBuilderState,
} from "@/components/disclosures/form-builder";
```

Schema is stored in the `schema` field of FormDefinition with structure:

```typescript
{
  sections: FormBuilderState["sections"];
}
```

### URL State Management

Type filter is persisted in URL search params:

- `/forms` - All forms
- `/forms?type=DISCLOSURE` - Disclosures only
- `/forms?type=ATTESTATION` - Attestations only

## Verification

- [x] Frontend TypeScript compiles without errors
- [x] All 6 files created (2 data layer + 3 pages + 1 component)
- [x] forms-api.ts has typed methods for all CRUD operations
- [x] use-forms.ts has React Query hooks with proper cache management
- [x] Forms list page filters by type via tabs
- [x] FormBuilder imported from existing disclosures location
- [x] Quick links to /disclosures and /intake-forms present on forms page

## Next Steps

- Wire up to backend /forms/definitions endpoints when available
- Add form template preview functionality
- Consider form versioning UI in edit page
