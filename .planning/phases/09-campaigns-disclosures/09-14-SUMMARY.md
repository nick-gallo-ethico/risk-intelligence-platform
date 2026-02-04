---
phase: 09-campaigns-disclosures
plan: 14
subsystem: disclosures-ui
tags: [form-builder, drag-drop, dnd-kit, disclosure-forms, visual-editor]
dependency-graph:
  requires: [09-02]
  provides: [visual-form-builder, field-palette, form-preview]
  affects: [09-15, 09-16]
tech-stack:
  added: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"]
  patterns: [drag-drop-context, sortable-lists, reducer-state-management]
key-files:
  created:
    - apps/frontend/src/components/disclosures/form-builder/FieldPalette.tsx
    - apps/frontend/src/components/disclosures/form-builder/FormBuilder.tsx
    - apps/frontend/src/components/disclosures/form-builder/FormPreview.tsx
    - apps/frontend/src/components/disclosures/form-builder/index.ts
    - apps/frontend/src/app/disclosures/forms/builder/page.tsx
  modified:
    - apps/frontend/package.json
decisions:
  - id: 09-14-D1
    title: dnd-kit for drag-and-drop
    choice: "@dnd-kit/core + @dnd-kit/sortable"
    rationale: "Modern, accessible, tree-shakeable DnD library with excellent React integration"
  - id: 09-14-D2
    title: State management pattern
    choice: "useReducer with typed actions"
    rationale: "Complex form builder state with sections, fields, selection requires structured mutations"
  - id: 09-14-D3
    title: Auto-save interval
    choice: "30 seconds"
    rationale: "Balance between preventing data loss and not overwhelming API"
metrics:
  duration: 14 min
  completed: 2026-02-04
---

# Phase 09 Plan 14: Visual Form Builder UI Summary

Visual form builder enabling compliance officers to create disclosure form templates without technical knowledge.

## One-liner

Drag-and-drop form builder with 15 field types (Basic/Compliance/Advanced), section management, nested repeaters, live preview, and auto-save.

## What Was Built

### 1. FieldPalette Component (`FieldPalette.tsx`)

Draggable field type palette organized into three groups:

**Basic Fields (8 types):**
- Text, Textarea, Number, Date
- Dropdown, Multi-select, Checkbox, Radio

**Compliance Fields (5 types per RS.22):**
- Relationship Mapper - Map party relationships (family, vendor, government, etc.)
- Dollar Threshold - Currency input with threshold alerting
- Recurring Date - Date with ongoing/recurring options
- Entity Lookup - Search/link to existing entities with fuzzy matching
- Signature - Digital signature capture with legal text

**Advanced Fields (2 types):**
- File Upload - Multi-file upload with type/size constraints
- Calculated Field - Auto-calculated based on formulas

Features:
- Search/filter functionality
- Collapsible groups with expand/collapse state
- Icon and description for each field type
- Uses `@dnd-kit/core` for drag functionality

### 2. FormBuilder Component (`FormBuilder.tsx`)

Main canvas for building forms:

**Layout:**
- Left: Collapsible FieldPalette
- Center: Form canvas with sections
- Right: Field/Section configuration panel

**Section Features:**
- Add, rename, delete, reorder sections
- Collapse/expand sections
- Drag to reorder sections
- Repeater toggle with min/max items
- Nested repeater config (max 2 levels per RS.23)

**Field Features:**
- Drag from palette to canvas
- Drag to reorder within/between sections
- Click to select and configure
- Delete individual fields

**Configuration Panel (when field selected):**
- Label, description, placeholder
- Required toggle
- Validation: min/max length, min/max value, regex pattern
- Conditional logic: show/hide based on other fields
- Type-specific settings

**State Management:**
- useReducer with typed actions for complex state
- Auto-save every 30 seconds
- Dirty tracking with save status indicators

### 3. FormPreview Component (`FormPreview.tsx`)

Live preview showing form as employee will see it:

**Viewport Modes:**
- Desktop (100% width)
- Tablet (768px)
- Mobile (375px)

**Renders all field types:**
- Text/Textarea/Number inputs
- Date pickers
- Dropdown/Multi-select
- Checkbox/Radio groups
- Relationship Mapper with party/type/description
- Dollar Threshold with currency
- Recurring Date with ongoing toggle
- Entity Lookup with search
- Signature with legal text and typed name
- File Upload zone
- Calculated field placeholder

### 4. Form Builder Page (`/disclosures/forms/builder`)

Full page for creating/editing templates:

**Route:** `/disclosures/forms/builder` (new) or `/disclosures/forms/builder?id=xxx` (edit)

**Header:**
- Back navigation to forms list
- Editable form name
- Version badge (v1, v2, etc.)
- Status badge (Draft/Published)
- Last saved indicator
- Preview toggle button
- Save Draft button
- Publish button

**API Integration:**
- `GET /api/v1/disclosure-forms/:id` - Load template
- `POST /api/v1/disclosure-forms` - Create new
- `PUT /api/v1/disclosure-forms/:id` - Update draft
- `POST /api/v1/disclosure-forms/:id/publish` - Publish

**Publish Flow:**
- Confirmation dialog with template stats
- Warning: "Once published, the form structure cannot be changed"
- Redirects to forms list after publish

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| DnD library | @dnd-kit | Modern, accessible, tree-shakeable, excellent React integration |
| State pattern | useReducer | Complex state with sections/fields/selection needs structured mutations |
| Auto-save | 30 second interval | Balance data loss prevention vs API load |
| Preview modes | 3 viewports | desktop/tablet/mobile covers main responsive breakpoints |

## Commits

| Hash | Description |
|------|-------------|
| 2475c5e | feat(09-14): add FieldPalette component with draggable field types |
| 7924e02 | feat(09-14): add FormBuilder canvas with drag-drop sections and fields |
| a8c358d | feat(09-14): add FormPreview component and form builder page |

## Verification

- [x] TypeScript compiles without errors (form-builder specific)
- [x] All 15 compliance field types in palette
- [x] Fields drag from palette to canvas
- [x] Field configuration panel updates selected field
- [x] Preview shows accurate form rendering across viewports
- [x] Nested repeaters configurable (max 2 levels)
- [x] Auto-save with status indicators

## Dependencies Satisfied

- **Depends on:** 09-02 (Form Template CRUD Service) - provides API endpoints
- **Required by:**
  - 09-15 (Disclosure Submission Form) - uses same field rendering
  - 09-16 (Campaign Assignment) - templates created here

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Frontend form builder complete. Ready for:
1. 09-15: Disclosure submission form (employee-facing)
2. Integration testing with backend 09-02 endpoints
