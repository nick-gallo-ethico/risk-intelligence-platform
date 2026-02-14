# HubSpot-Style View System — Complete Implementation Specification

This document is the **authoritative specification** for implementing the HubSpot CRM pattern across the Risk Intelligence Platform. It covers two distinct page types:

- **Part 1 (Sections 1–11):** The **Index / List Page** with saved views, filters, table/board views — the page users see when browsing a list of records (e.g., `/cases`).
- **Part 2 (Sections 12–23):** The **Record Detail Page** with three-column layout — the page users see when viewing a single record (e.g., `/cases/:id`).

Both parts describe **reusable, shared component architectures** applied to the pillar modules: **Cases, Investigations, Disclosures, Intake Forms, and Policies** — extensible for future modules.

---

# PART 1: INDEX PAGE / SAVED VIEWS SYSTEM

This part describes the list page pattern — where users browse, filter, sort, and manage collections of records.

---

## 1. Page Layout Structure

The index page lives inside the main content area (below the top navbar, to the right of the left sidebar nav). Four stacked horizontal zones:

| Zone                            | Description                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| **Zone 1 — View Tabs Bar**      | Horizontally scrollable row of named tabs (saved views). `+` button to create new views.     |
| **Zone 2 — Toolbar Row**        | Search box, view mode toggle, Edit Columns, Filter, Sort, Export, Duplicate, Save buttons.   |
| **Zone 3 — Quick Filters Row**  | Conditional (only when Filter is active). Quick-filter dropdowns + "Advanced filters" pill.  |
| **Zone 4 — Data Table / Board** | Main data display. Default table view; togglable to board/card view grouped by status/stage. |

Below the data table: **pagination bar** with `< Prev` / page numbers / `Next >` and "per page" dropdown (25, 50, 100).

---

## 2. Zone 1 — View Tabs Bar (Saved Views)

### 2.1 Tab Behavior

- Each tab = a **saved view**: named combination of columns, column order, sort, active filters, and visibility/sharing settings.
- Horizontally arranged pill-shaped buttons with view name as label.
- **Active tab** has distinct visual state (underline, background highlight, or bold text).
- Optional **record count badge** next to name (e.g., "Needs next action 199.9K").
- **Up to 50 saved view tabs** per module per user.
- Overflow: right-arrow scroll indicator (`>`) for horizontal scrolling or overflow dropdown.

### 2.2 Tab Interactions

| Action             | Trigger                  | Behavior                                                             |
| ------------------ | ------------------------ | -------------------------------------------------------------------- |
| **Select**         | Click tab                | Loads view's columns, filters, sort; refreshes data table            |
| **Reorder**        | Drag tab to new position | Tab slides into position; others shift. Leftmost = default.          |
| **Context menu**   | Click **⋮** on tab edge  | Dropdown: Rename, Clone, Manage sharing, Delete                      |
| **Rename**         | Context menu             | Inline text editing or small modal input                             |
| **Clone**          | Context menu             | Duplicates view with "(copy)" appended                               |
| **Manage sharing** | Context menu             | Private / My team / Everyone                                         |
| **Delete**         | Context menu             | Confirmation dialog. Does NOT delete records. Creator or admin only. |
| **Close tab**      | Click `×` on tab         | Unpins tab. View still exists in "Add view" menu.                    |

### 2.3 Add New View (`+` Button)

- Circular `+` icon at far right of tabs row.
- Dropdown/popover with:
  1. **Create new view** — name + visibility, opens with default columns.
  2. **Open existing saved view** — searchable list of accessible views. Selecting adds as pinned tab.

---

## 3. Zone 2 — Toolbar Row

Horizontal bar of action buttons below the tab bar, left to right:

| Control              | Behavior                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Search box**       | Magnifying glass icon, placeholder "Search". Client-side instant or debounced server-side. Scoped to current view's filtered dataset. |
| **View mode toggle** | "Table view" dropdown. Options: Table (default), Board (Kanban grouped by status/stage). Saved as part of view config.                |
| **Settings gear**    | Compact/comfortable row density, auto-refresh interval.                                                                               |
| **Edit columns**     | Opens Column Selection Modal (Section 5.1).                                                                                           |
| **Filter (N)**       | Badge shows active filter count. Toggles Zone 3 visibility. Dropdown arrow for quick vs. advanced filters.                            |
| **↓ Sort**           | Dropdown: select column + direction (Asc/Desc). Also available via column header clicks.                                              |
| **Export**           | Excel (.xlsx) or CSV. Respects active filters and column selection. Toast confirmation.                                               |
| **Duplicate**        | Clipboard icon. Duplicates view with "(copy)" appended.                                                                               |
| **Save**             | Disabled by default. Enabled on unsaved changes. Persists all changes. Unsaved navigation triggers confirmation prompt.               |

---

## 4. Zone 3 — Quick Filters Row (Conditional)

Visible only when Filter button is toggled on.

### 4.1 Quick Filter Dropdowns

Horizontal row of dropdown buttons for commonly-used filterable properties per module:

- **Cases**: Case Owner, Created Date, Last Activity Date, Case Status, Priority, + More
- **Investigations**: Assigned Investigator, Created Date, Investigation Type, Status, + More
- **Disclosures**: Submitter, Disclosure Date, Category, Status, + More
- **Intake Forms**: Form Type, Submitted Date, Status, Assigned To, + More
- **Policies**: Policy Owner, Created Date, Last Review Date, Policy Status, + More

Filter dropdown behavior by property type:

- **Date**: Preset ranges (Today, This week, This month, Last 30 days, Custom range)
- **User/owner**: Searchable multi-select list
- **Status/enum**: Checkboxes per value
- **Text**: Contains / Does not contain / Is / Is not

**"+ More"** button adds additional quick filter dropdowns from any property.

### 4.2 Advanced Filters Pill

- Right end of quick filters row. Labeled "Advanced filters" with `×` dismiss.
- Distinct style when active. Clicking opens Advanced Filters Slide-Out Panel (Section 5.2).

---

## 5. Modals and Panels (Index Page)

### 5.1 Column Selection Modal

Centered modal overlay. Two-panel layout:

**Left Panel — Available Columns:**

- Search box to filter by name
- Columns organized by collapsible category groups (e.g., "Case Details", "Investigation Metadata", "Compliance Fields", "Custom Properties")
- Checkbox per column — checking adds to right panel

**Right Panel — Selected Columns:**

- Header: "SELECTED COLUMNS (N)"
- "Frozen columns" dropdown (0–3 leftmost columns fixed)
- Each column: drag handle (⋮⋮) for reorder, name, `×` remove button
- First column (e.g., "Name") locked — no `×`
- Drag up/down maps to left-to-right table order

**Footer:** Apply (primary), Cancel (secondary), Remove All Columns (text link), `×` close.

### 5.2 Advanced Filters Slide-Out Panel

Right-side slide-out panel (overlays or shifts content).

**Filter Groups:**

- Groups joined by **OR** logic. Conditions within a group joined by **AND**.
- Each group: clone icon, delete icon.
- **Max 2 groups**, **up to 20 conditions per group**.

**Filter Condition Anatomy:**

1. **Property selector** — dropdown from searchable property picker
2. **Operator selector** — varies by data type:

| Data Type       | Operators                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| **Text**        | is, is not, contains, does not contain, starts with, ends with, is known, is unknown, is any of, is none of |
| **Number**      | is equal to, is not equal to, >, >=, <, <=, is between, is known, is unknown                                |
| **Date**        | is, is before, is after, is between, is less/more than N days/weeks/months ago, is known, is unknown        |
| **Boolean**     | is true, is false, is known, is unknown                                                                     |
| **Enum/Select** | is any of, is none of, is known, is unknown                                                                 |
| **User**        | is any of, is none of, is known, is unknown                                                                 |

3. **Value input** — adapts to operator (text, number, date picker, number+unit, multi-select, two inputs for "between", none for "is known/unknown")
4. **Remove (×)** per condition

**"+ Add filter"** within a group opens searchable property picker popup.
**"+ Add filter group"** below existing groups, preceded by "or".
Filters apply in **real-time** (table updates live behind the panel).

---

## 6. Zone 4 — Data Table

### 6.1 Table Structure

| Component             | Behavior                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Header row**        | Column name, sort toggle (↑↓, click to cycle), three-dot menu (⋮): Sort asc/desc, Move left/right, Hide column, Freeze column |
| **Checkbox column**   | Leftmost. Header checkbox = select/deselect all visible. Triggers bulk actions bar.                                           |
| **Data rows**         | First column = clickable link to record detail page. Others formatted by type (dates, badges, avatars, etc.).                 |
| **Empty cells**       | Display `--` placeholder                                                                                                      |
| **Row hover**         | Subtle highlight                                                                                                              |
| **Column resizing**   | Drag column borders in header                                                                                                 |
| **Horizontal scroll** | Frozen columns stay fixed on left                                                                                             |

### 6.2 Pagination Bar

`< Prev [1] 2 3 ... Next > 25 per page ▼`

- Clickable page numbers, current highlighted.
- 25, 50, 100 per page options.
- Pagination state NOT saved with view — resets on view switch.

### 6.3 Bulk Actions Bar

Appears when rows are checked:

- Count display (e.g., "3 selected")
- Module-specific actions:
  - **Cases**: Assign, Change Status, Export Selected, Delete
  - **Investigations**: Assign, Change Status, Merge, Export Selected, Delete
  - **Disclosures**: Assign, Change Category, Export Selected, Delete
  - **Intake Forms**: Assign, Change Status, Export Selected, Delete
  - **Policies**: Assign, Change Status, Publish, Archive, Export Selected, Delete

---

## 7. Board View (Alternative to Table View)

- Records as **cards** in **vertical lanes** grouped by status/stage.
- Cards show key fields: Name, Owner avatar, Priority badge, Date.
- **Drag between lanes** to change status/stage.
- Respects current view's filters.
- Column selection does not apply (fixed card layout); filters and sort do.

---

## 8. Index Page Data Models

### 8.1 Saved View

```typescript
interface SavedView {
  id: string;
  moduleType:
    | "cases"
    | "investigations"
    | "disclosures"
    | "intake_forms"
    | "policies";
  name: string;
  createdBy: string;
  visibility: "private" | "team" | "everyone";
  teamId?: string;
  columns: SavedViewColumn[];
  frozenColumnCount: number; // 0–3
  filters: FilterGroup[];
  quickFilters: QuickFilterConfig[];
  sort: { column: string; direction: "asc" | "desc" } | null;
  viewMode: "table" | "board";
  boardGroupBy?: string;
  tabOrder: number;
  recordCount?: number; // Cached badge count
  createdAt: Date;
  updatedAt: Date;
}

interface SavedViewColumn {
  propertyId: string;
  width?: number;
}

interface FilterGroup {
  id: string;
  conditions: FilterCondition[]; // AND-joined
}
// Groups are OR-joined

interface FilterCondition {
  propertyId: string;
  operator: FilterOperator;
  value?: any;
  secondaryValue?: any; // For 'is between'
  unit?: "day" | "week" | "month"; // For relative date
}

type FilterOperator =
  | "is"
  | "is_not"
  | "contains"
  | "does_not_contain"
  | "starts_with"
  | "ends_with"
  | "is_equal_to"
  | "is_not_equal_to"
  | "is_greater_than"
  | "is_greater_than_or_equal_to"
  | "is_less_than"
  | "is_less_than_or_equal_to"
  | "is_between"
  | "is_before"
  | "is_after"
  | "is_less_than_n_ago"
  | "is_more_than_n_ago"
  | "is_known"
  | "is_unknown"
  | "is_any_of"
  | "is_none_of"
  | "is_true"
  | "is_false";
```

### 8.2 User Tab Configuration

```typescript
interface UserViewTabs {
  userId: string;
  moduleType: string;
  pinnedViewIds: string[]; // Ordered view IDs shown as tabs
}
```

### 8.3 Index Page API Endpoints

| Endpoint               | Method | Description                                             |
| ---------------------- | ------ | ------------------------------------------------------- |
| `/api/views`           | GET    | List views for a module (filtered by visibility/access) |
| `/api/views`           | POST   | Create a new saved view                                 |
| `/api/views/:id`       | GET    | Get a single view configuration                         |
| `/api/views/:id`       | PUT    | Update a saved view                                     |
| `/api/views/:id`       | DELETE | Delete a saved view                                     |
| `/api/views/:id/clone` | POST   | Clone a saved view                                      |
| `/api/views/tabs`      | GET    | Get user's pinned tab configuration                     |
| `/api/views/tabs`      | PUT    | Update user's tab order/pinned tabs                     |
| `/api/[module]`        | GET    | Fetch records with filter/sort/pagination params        |
| `/api/[module]/export` | POST   | Export filtered records as Excel/CSV                    |
| `/api/[module]/bulk`   | POST   | Bulk actions on selected records                        |

---

## 9. Index Page Component Architecture

Shared, reusable component library — NOT duplicated per module:

```
components/views/
  ViewTabsBar.tsx            // Zone 1 — Tab management
  ViewToolbar.tsx            // Zone 2 — Search, buttons, actions
  QuickFiltersRow.tsx        // Zone 3 — Quick filter dropdowns
  ColumnSelectionModal.tsx   // Edit Columns modal
  AdvancedFiltersPanel.tsx   // Right slide-out filter panel
  FilterConditionRow.tsx     // Single filter condition
  PropertyPicker.tsx         // Searchable property selector (shared with column modal + filter panel)
  DataTable.tsx              // Zone 4 — Table with headers, sorting, selection, pagination
  BoardView.tsx              // Kanban board alternative
  BulkActionsBar.tsx         // Bulk action overlay
  PaginationBar.tsx          // Page navigation
  SavedViewProvider.tsx      // React context for view state

hooks/
  useSavedViews.ts           // CRUD for saved views
  useViewFilters.ts          // Filter state management
  useViewColumns.ts          // Column selection state
  useDataFetch.ts            // Data fetching with filter/sort/pagination
  useExport.ts               // Export functionality
```

Each module page provides configuration:

1. **Available properties/columns** (name, type, group)
2. **Default views** (seed data: "All Cases", "My Cases", "Open Cases")
3. **Quick filter defaults** (which properties appear in quick filter row)
4. **Bulk actions** (module-specific operations)
5. **Board view grouping options** (status/stage fields)

```tsx
// Example: pages/CasesIndexPage.tsx
<SavedViewProvider moduleType="cases" config={casesViewConfig}>
  <ViewTabsBar />
  <ViewToolbar />
  <QuickFiltersRow />
  <DataTable /> {/* or <BoardView /> depending on viewMode */}
  <PaginationBar />
</SavedViewProvider>
```

---

## 10. Index Page UX Details

1. **Unsaved changes indicator**: Tab name shows dot/italic/color change; Save button becomes enabled.
2. **Default views**: Pre-built per module ("All [Records]", "My [Records]", "Recently Created"). Cannot be deleted, can be customized.
3. **Permission-based visibility**: Users see own private + team-shared + everyone-shared views. Admins manage all.
4. **Real-time filter application**: Table updates live as filter conditions are set (no separate "Apply" button in filter panel).
5. **Empty states**: "No [records] match the current filters. Try adjusting your filters or clearing them."
6. **Column type formatting**: Dates → localized strings, Users → avatar + name, Status → colored badge, Numbers → formatted, Boolean → check/cross, Long text → truncated with tooltip.
7. **Responsive**: Fewer columns visible on small screens (horizontal scroll). Quick filters collapse into dropdown.
8. **Loading**: Skeleton rows while loading. Subtle toolbar indicator during filter application.
9. **URL state**: Current view ID and active filters reflected in URL query parameters for bookmarking/sharing.

---

## 11. Index Page Reference Sources

- [HubSpot: Create and manage saved views](https://knowledge.hubspot.com/records/create-and-manage-saved-views)
- [HubSpot: View and filter records](https://knowledge.hubspot.com/records/view-and-filter-records)
- [HubSpot: Manage index page types and tabs](https://knowledge.hubspot.com/records/manage-index-page-types-and-tabs)
- [HubSpot: Set default index page views](https://knowledge.hubspot.com/object-settings/set-default-index-page-views)

---

---

# PART 2: RECORD DETAIL PAGE

This part describes the **three-column record detail layout** — the page users see when they click into a specific record from the index page (e.g., clicking a case in the cases list). This mirrors HubSpot's Contact/Deal/Ticket detail page pattern, adapted for compliance case management.

**This is the primary page where compliance officers, investigators, and case managers spend their time.** It must be information-dense without being overwhelming, with a clear visual hierarchy that puts the most important information front and center.

---

## 12. Record Detail Page — Layout Overview

The page occupies the full content area (below top navbar, right of left sidebar nav). Three-column layout:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Cases  /  CASE-2026-00142                                                │
│                                                                              │
│  LEFT SIDEBAR        │  CENTER COLUMN                    │  RIGHT SIDEBAR    │
│  (~300px, fixed)     │  (flexible, fills remaining)      │  (~300px, fixed)  │
│                      │                                    │                   │
│  ┌────────────────┐  │  ┌──────────────────────────────┐  │  ┌─────────────┐ │
│  │ Case Header    │  │  │ Pipeline/Lifecycle Stage Bar  │  │  │ Workflow    │ │
│  │ Reference #    │  │  │ (FIXED — does not scroll)     │  │  │ Panel      │ │
│  │ Status Badge   │  │  ├──────────────────────────────┤  │  ├─────────────┤ │
│  │ Actions ▼      │  │  │ [Overview] [Activities]       │  │  │ Connected  │ │
│  ├────────────────┤  │  │ [Investigations] [Messages]   │  │  │ People     │ │
│  │ Quick Actions  │  │  │ [Files] [Remediation]         │  │  ├─────────────┤ │
│  │ 📝 Note        │  │  ├──────────────────────────────┤  │  │ Linked     │ │
│  │ ✉ Email        │  │  │                               │  │  │ RIUs       │ │
│  │ ✓ Task         │  │  │  Tab Content Area             │  │  ├─────────────┤ │
│  │ 📎 Document    │  │  │  (scrollable)                 │  │  │ Related    │ │
│  │ 🎤 Interview   │  │  │                               │  │  │ Cases      │ │
│  │ ··· More       │  │  │                               │  │  ├─────────────┤ │
│  ├────────────────┤  │  │                               │  │  │ Policies   │ │
│  │ About This     │  │  │                               │  │  ├─────────────┤ │
│  │ Case (▼)       │  │  │                               │  │  │ Documents  │ │
│  ├────────────────┤  │  │                               │  │  ├─────────────┤ │
│  │ Intake Info (▼)│  │  │                               │  │  │ Tasks      │ │
│  ├────────────────┤  │  │                               │  │  ├─────────────┤ │
│  │ Classification │  │  │                               │  │  │ Remediation│ │
│  │ (▼)            │  │  │                               │  │  │ Status     │ │
│  └────────────────┘  │  └──────────────────────────────┘  │  ├─────────────┤ │
│                      │                                    │  │ 🤖 AI Asst  │ │
│                      │                                    │  └─────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Column widths:**

- Left sidebar: **300px fixed**
- Center column: **flexible** (fills remaining space)
- Right sidebar: **300px fixed**

**Scrolling:** Each column scrolls independently. The Pipeline/Lifecycle Stage Bar at the top of the center column is **position: sticky** — it remains fixed at the top of the center column as the user scrolls tab content below it.

**Responsive behavior:**

- **Desktop (≥1280px):** Full three-column layout
- **Tablet (768–1279px):** Center column full width; left and right sidebars become slide-over drawers with toggle buttons
- **Mobile (<768px):** Single column; toggle between panels

---

## 13. Breadcrumb and Navigation

Above the three-column layout, a thin breadcrumb/navigation bar:

```
← Cases  /  CASE-2026-00142
```

- **← Cases**: Clickable link back to the Cases index page (list view).
- **CASE-2026-00142**: The current record's reference number. Non-clickable (current page).
- A **copy icon** next to the reference number copies it to clipboard.

---

## 14. Left Sidebar

The left sidebar is the **identity, quick-action, and properties panel**. It scrolls independently of the center column.

### 14.1 Case Header (Top of Left Sidebar)

The topmost section of the left sidebar. Displays:

| Element              | Description                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **Reference Number** | Large, bold text: "CASE-2026-00142". Copy icon next to it.                                            |
| **Status Badge**     | Colored pill/badge showing current status (e.g., "NEW" in blue, "ACTIVE" in green, "CLOSED" in gray). |
| **Severity Badge**   | Colored pill showing severity: LOW (green), MEDIUM (yellow), HIGH (orange), CRITICAL (red).           |
| **Category**         | Text showing the primary category (e.g., "HIPAA Violation").                                          |
| **Open Date**        | "Opened: Jan 15, 2026" — the date the case was created.                                               |
| **Case Age**         | Dynamic text: "Open for 29 days" or "Closed after 14 days".                                           |
| **Assigned To**      | Avatar(s) + name(s) of assigned investigator(s). If multiple, show avatar stack with "+N" overflow.   |

### 14.2 Actions Dropdown

Immediately below the case header, an **"Actions ▼"** link/button that opens a dropdown menu:

| Action                    | Description                                                           |
| ------------------------- | --------------------------------------------------------------------- |
| **Assign**                | Opens Assign Modal — select investigator(s) to assign to this case    |
| **Change Status**         | Opens Status Change Modal — select new status with required rationale |
| **Merge**                 | Opens Merge Modal — search for and merge with another case            |
| **Follow / Unfollow**     | Subscribe to notifications about changes to this case                 |
| **View All Properties**   | Opens a full-page or large modal view of every property on the case   |
| **View Property History** | Shows historical changes to property values (who changed what, when)  |
| **Export Case**           | Downloads a PDF or Excel summary of the case                          |
| **Delete**                | Confirmation dialog, then soft-deletes the case. Admin only.          |

**CRITICAL:** Assign, Change Status, and Merge are the **primary actions** and must be fully functional. These are the most-used actions for compliance officers.

### 14.3 Quick Action Buttons

Below the Actions dropdown, a row of icon buttons for creating activities. Each button opens a modal; the created activity appears in the Activities tab in the center column.

| Button         | Icon | Modal                                    | Activity Created                                                         |
| -------------- | ---- | ---------------------------------------- | ------------------------------------------------------------------------ |
| **Note**       | 📝   | Add Note Modal                           | Note logged in activity timeline                                         |
| **Email**      | ✉    | Email Log Modal                          | Email logged in activity timeline + Messages tab                         |
| **Task**       | ✓    | Create Task Modal                        | Task created, appears in activity timeline + Tasks card (right sidebar)  |
| **Document**   | 📎   | Attach Document Modal                    | Document uploaded, appears in Files tab + Documents card (right sidebar) |
| **Interview**  | 🎤   | Log Interview Modal                      | Interview logged in activity timeline                                    |
| **More (···)** | ···  | Dropdown with: Log Call, Reorder buttons | Additional activity types                                                |

**Reorder activity buttons:** Via the "More" menu, users can reorder which 5 icons appear prominently. This preference is saved per user.

**IMPORTANT:** When any activity is created via these buttons, the center column's Activities tab must refresh to show the new activity at the top of the timeline. If the user is on the Overview tab, the "Recent Activities" section should also update.

### 14.4 About This Case (Collapsible Card)

A collapsible card labeled **"About This Case"** with a chevron (▼/▶) to expand/collapse.

**Purpose:** Displays the core case metadata — the most important properties that define the case.

**Default fields (admin-configurable):**

| Field             | Type                                           | Editable                                         |
| ----------------- | ---------------------------------------------- | ------------------------------------------------ |
| Status            | Enum dropdown                                  | Yes (also available via Actions > Change Status) |
| Severity          | Enum dropdown                                  | Yes                                              |
| Priority          | Enum dropdown                                  | Yes                                              |
| Case Type         | Text/Enum                                      | Yes                                              |
| Source Channel    | Enum (Hotline, Web Form, Email, Walk-in, etc.) | Read-only (set at intake)                        |
| Open Date         | Date                                           | Read-only                                        |
| Target Close Date | Date picker                                    | Yes                                              |
| SLA Due Date      | Date                                           | Read-only (calculated)                           |
| Case Owner        | User selector                                  | Yes                                              |
| Department        | Enum/Selector                                  | Yes                                              |

**Inline editing:** Hover over any editable field to reveal an edit icon. Click the value or icon to edit in-place. Field type determines the input (dropdown, date picker, text, etc.). Non-editable fields show a lock icon on hover.

**Settings gear icon (⚙):** Visible to admins only. Opens a configuration panel where admins can:

- Add/remove fields from this card
- Reorder fields via drag-and-drop
- Lock fields so users cannot hide them
- Set field visibility by role

**"View all properties"** link at the bottom opens a full property list for the case.

### 14.5 Intake Information (Collapsible Card)

A collapsible card labeled **"Intake Information"** with chevron.

**Purpose:** Displays all information captured from the original RIU (Risk Intelligence Unit) intake — the report, form submission, or disclosure that created this case. This is the **complete intake record** — every field from the intake form.

**Default fields:**

| Field                 | Type                                      | Editable                 |
| --------------------- | ----------------------------------------- | ------------------------ |
| Reporter Type         | Enum (Anonymous, Identified, Third-Party) | Read-only                |
| Reporter Name         | Text                                      | Editable (if identified) |
| Reporter Email        | Email                                     | Editable (if identified) |
| Reporter Phone        | Phone                                     | Editable (if identified) |
| Anonymous Access Code | Text                                      | Read-only                |
| Incident Date         | Date                                      | Editable                 |
| Incident Location     | Text                                      | Editable                 |
| Location City         | Text                                      | Editable                 |
| Location State        | Text                                      | Editable                 |
| Location Country      | Text                                      | Editable                 |
| Incident Description  | Long text                                 | Editable                 |
| Persons Involved      | Text/List                                 | Editable                 |
| Witnesses             | Text/List                                 | Editable                 |
| Supporting Details    | Long text                                 | Editable                 |
| Addendum              | Long text                                 | Editable                 |

**Admin customization (⚙):** Same pattern as "About This Case" — admins configure which fields appear and in what order.

**Long text fields:** Displayed truncated (3 lines) with "Show more" link to expand inline.

### 14.6 Classification (Collapsible Card)

A collapsible card labeled **"Classification"** with chevron.

**Purpose:** Manages the case's category and subcategory assignments. This is where compliance officers classify what type of issue the case represents.

**Fields:**

| Field                    | Type                   | Behavior                                                                                                                                                                                                                                                                   |
| ------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary Category**     | Dropdown               | Select from tenant-configured category list (e.g., "HIPAA Violation", "Fraud", "Conflict of Interest", "Harassment", "Regulatory Non-Compliance"). When changed, the subcategory dropdown resets and reloads with subcategories filtered to the selected primary category. |
| **Subcategory**          | Dropdown (dependent)   | Options filtered by the selected Primary Category. (e.g., under "HIPAA Violation": "PHI Breach", "Unauthorized Access", "Improper Disclosure"). Only appears after a primary category is selected.                                                                         |
| **Tags**                 | Multi-select tag input | Free-form tags or select from predefined tag list. Chips/pills with `×` to remove.                                                                                                                                                                                         |
| **Risk Level**           | Enum dropdown          | Auto-suggested by AI based on case details, but manually overridable: Low, Medium, High, Critical.                                                                                                                                                                         |
| **Regulatory Framework** | Multi-select           | Applicable regulations: HIPAA, SOX, GDPR, OSHA, State-specific, etc.                                                                                                                                                                                                       |

**Category configuration:** Categories and subcategories are **tenant-configurable** in the admin Settings area. Each tenant defines their own taxonomy. The platform ships with a default set for healthcare compliance.

---

## 15. Center Column

The center column is the **primary content area**. It has two fixed elements at the top and tabbed content below.

### 15.1 Pipeline / Lifecycle Stage Bar (FIXED)

This bar is **position: sticky** at the top of the center column — it does not scroll away. It shows the case's progression through its lifecycle.

**Visual design:** A horizontal progress bar with stage names as labeled steps. The current stage is highlighted (colored/filled), completed stages are filled with a muted color, and future stages are outlined/empty.

```
┌──────────────────────────────────────────────────────────────────┐
│  ● New  →  ● Assigned  →  ● Active  →  ○ Review  →  ○ Closed  →  ○ Remediation  →  ○ Archived  │
│  In stage for: 3 days                                            │
└──────────────────────────────────────────────────────────────────┘
```

**Default pipeline stages (out-of-the-box):**

| Stage           | Description                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **New**         | Case just created from intake. Not yet assigned.                                                                                                                                            |
| **Assigned**    | Case assigned to an investigator or team.                                                                                                                                                   |
| **Active**      | Investigation or review actively in progress.                                                                                                                                               |
| **Review**      | Findings under review. Pending decision on outcome.                                                                                                                                         |
| **Closed**      | Case closed with a resolution.                                                                                                                                                              |
| **Remediation** | Corrective actions being implemented post-closure. **NOTE:** This stage occurs AFTER Closed — cases can move forward from Closed to Remediation. This is critical for compliance reporting. |
| **Archived**    | Case fully resolved and archived. Read-only.                                                                                                                                                |

**IMPORTANT:** Pipeline stages are **configurable per tenant**. The above is the default set. Tenants can add, remove, rename, and reorder stages in Settings. The stage bar component must be dynamic.

**Stage bar interactions:**

- **Click a stage** to advance the case to that stage (forward only, except Remediation after Closed). Opens a confirmation dialog with optional rationale field.
- **"In stage for: N days"** chip displayed below the current stage.
- **Hover** on any stage shows a tooltip with: stage description, date entered (if completed), time spent in stage.

### 15.2 Tab Bar

Directly below the sticky pipeline bar. Horizontal tab navigation:

```
[Overview]  [Activities]  [Investigations]  [Messages]  [Files]  [Remediation]
```

**Tab behavior:**

- **Overview** is the **default tab** — the page always opens to Overview.
- Clicking a tab loads its content in the scrollable area below.
- Active tab has underline/bold/color indicator.
- Tab state is **NOT persisted in the URL** — always opens to Overview on fresh load.

**Tab content area** below the tab bar is scrollable (independent of left and right sidebars).

---

## 16. Center Column — Tab Content

### 16.1 Overview Tab (DEFAULT)

The Overview tab is the **landing page** for the case detail view. It provides a high-level summary with progressive disclosure — key information visible immediately, details available via expansion.

**Layout (top to bottom):**

#### A. Data Highlights Card

A prominent card at the top showing **4–6 key property values**:

```
┌──────────────────────────────────────────────────────────────────┐
│  Severity        Status         Case Age       SLA Status       │
│  ██ HIGH         ● ACTIVE       29 days        ⚠ 3 days left   │
│                                                                  │
│  Assigned To              Source Channel                         │
│  👤 Jane Smith            Hotline                                │
└──────────────────────────────────────────────────────────────────┘
```

- Values displayed in a grid (2–3 columns, 2 rows).
- Each value: property label (small, muted) above the value (large, bold).
- Status values use colored badges. SLA uses color-coded urgency (green = on track, yellow = approaching, red = overdue).
- **Admin-configurable:** Which 4–6 properties appear here.

#### B. Editable Case Summary

A card labeled **"Case Summary"** with an edit icon:

```
┌──────────────────────────────────────────────────────────────────┐
│  Case Summary                                              ✏ AI │
│                                                                  │
│  An anonymous reporter contacted the ethics hotline on Jan 15    │
│  to report potential HIPAA violations in the billing department.  │
│  The reporter alleges that patient records were accessed by       │
│  unauthorized personnel on multiple occasions in December 2025.  │
│  Initial triage assessment indicates HIGH severity due to the    │
│  scope of potential PHI exposure.                                │
└──────────────────────────────────────────────────────────────────┘
```

- **Editable:** Click the edit icon (✏) to enter inline edit mode. Rich text (basic formatting: bold, italic, bullet lists).
- **AI button:** Generates/regenerates an AI summary based on case data, intake details, and recent activities. User can accept, edit, or discard the AI-generated text.
- The summary is a **user-editable field** — it persists as `case.summary` in the database.

#### C. Case Details (Collapsible)

A section labeled **"Case Details"** with a chevron (▶) for expand/collapse. **Collapsed by default.**

```
┌──────────────────────────────────────────────────────────────────┐
│  ▶ Case Details                                                  │
└──────────────────────────────────────────────────────────────────┘
```

When expanded (▼):

```
┌──────────────────────────────────────────────────────────────────┐
│  ▼ Case Details                                                  │
│                                                                  │
│  Reference Number     CASE-2026-00142                            │
│  Status               ● ACTIVE                                   │
│  Severity             ██ HIGH                                    │
│  Priority             Urgent                                     │
│  Category             HIPAA Violation > PHI Breach               │
│  Source Channel        Hotline                                    │
│  Reporter Type         Anonymous                                  │
│  Incident Date         Dec 28, 2025                               │
│  Incident Location     Main Campus, Building A, 3rd Floor        │
│  Opened                Jan 15, 2026                               │
│  Last Activity         Feb 12, 2026 (1 day ago)                  │
│  Assigned To           Jane Smith, Michael Chen                   │
│  Department            Billing                                    │
│  SLA Due               Feb 28, 2026 (16 days remaining)          │
│  Risk Level            High (AI-assessed)                        │
│  Regulatory Framework  HIPAA, State Privacy Law                  │
│                                                                  │
│  [View All Properties]                                           │
└──────────────────────────────────────────────────────────────────┘
```

- Shows a comprehensive list of case properties in a two-column label:value layout.
- **Read-only in this view** — editing happens in the left sidebar cards.
- "View All Properties" link opens the full property list.

#### D. Status Change Timeline

A card labeled **"Status History"** showing the progression of status changes:

```
┌──────────────────────────────────────────────────────────────────┐
│  Status History                                                  │
│                                                                  │
│  ● ACTIVE    Feb 1, 2026    by Jane Smith                       │
│  │           "Assigned to investigation team, initial review     │
│  │            complete."                                         │
│  ● ASSIGNED  Jan 18, 2026   by System                           │
│  │           "Auto-assigned based on category routing rules."    │
│  ● NEW       Jan 15, 2026   by System                           │
│              "Case created from hotline intake INTAKE-2026-0089" │
└──────────────────────────────────────────────────────────────────┘
```

- Vertical timeline with colored dots per status.
- Shows: status name, date, who made the change, and the rationale text.
- Most recent at top.

#### E. Recent Activities

A card labeled **"Recent Activities"** showing the **3 most recent** activities:

```
┌──────────────────────────────────────────────────────────────────┐
│  Recent Activities                                    View all → │
│                                                                  │
│  📝 Note by Jane Smith                         Feb 12, 2026     │
│     "Interviewed department manager. Confirmed access logs..."   │
│                                                                  │
│  ✉ Email to reporter                           Feb 10, 2026     │
│     "Follow-up questions sent regarding the timeline of..."      │
│                                                                  │
│  📎 Document uploaded by Michael Chen           Feb 8, 2026      │
│     "Access_Logs_Dec2025.xlsx"                                   │
└──────────────────────────────────────────────────────────────────┘
```

- Shows activity type icon, description/preview, author, and date.
- **"View all →"** link switches to the Activities tab.
- Configurable time period (e.g., last 30 days).

#### F. Upcoming Tasks

A card labeled **"Upcoming Tasks"** showing the **3 nearest upcoming** tasks:

```
┌──────────────────────────────────────────────────────────────────┐
│  Upcoming Tasks                                       View all → │
│                                                                  │
│  ☐ Interview witness (Patient Records Clerk)    Due: Feb 15     │
│    Assigned to: Jane Smith                                       │
│                                                                  │
│  ☐ Request access log audit from IT             Due: Feb 18     │
│    Assigned to: Michael Chen                                     │
│                                                                  │
│  ☐ Draft preliminary findings report            Due: Feb 22     │
│    Assigned to: Jane Smith                                       │
└──────────────────────────────────────────────────────────────────┘
```

- Checkbox to mark complete inline.
- Shows task title, due date, assignee.
- **"View all →"** navigates to Tasks card in right sidebar or a dedicated view.
- Tasks sorted by due date (nearest first).

---

### 16.2 Activities Tab

The Activities tab displays a **chronological activity timeline** for the case. This follows the **exact HubSpot activity timeline pattern**.

#### Activity Filter Bar (Top of Tab)

```
┌──────────────────────────────────────────────────────────────────┐
│  Filter activity (17/28) ▼    All users ▼    All teams ▼       │
│                                                                  │
│  [Search activities...]                                          │
│                                                                  │
│  ☑ Notes  ☑ Emails  ☑ Calls  ☑ Tasks  ☑ Interviews             │
│  ☑ Documents  ☑ Status Changes  ☑ System Events                 │
└──────────────────────────────────────────────────────────────────┘
```

**Filter controls:**

- **"Filter activity (N/M)"** dropdown: N = visible activities, M = total. Opens advanced filter options.
- **"All users" dropdown**: Filter by specific user or "All users".
- **"All teams" dropdown**: Filter by team or "All teams".
- **Search bar**: Text search across activity content.
- **Activity type checkboxes**: Toggle visibility per type. All checked by default.

#### Activity Timeline

Activities displayed in **reverse chronological order** (newest first), grouped by date:

```
  Upcoming
  ┌────────────────────────────────────────────────────────────────┐
  │  ▶ Task assigned to Jane Smith          Due: Feb 15, 2026     │
  │    ☐ Interview witness (Patient Records Clerk)                │
  └────────────────────────────────────────────────────────────────┘

  February 2026
  ┌────────────────────────────────────────────────────────────────┐
  │  📝 Note by Jane Smith              Feb 12, 2026 3:42 PM     │
  │                                                                │
  │  Interviewed department manager Tom Wilson. He confirmed that  │
  │  access logs show 3 unauthorized access events on Dec 15, 18, │
  │  and 22. The records accessed belonged to patients in the      │
  │  orthopedics department. Wilson stated he was unaware of the   │
  │  access until notified by IT security on Jan 10.              │
  │                                                                │
  │  [📌 Pin] [💬 Comment] [✏ Edit] [🔗 Copy link] [🗑 Delete]   │
  └────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────┐
  │  ✉ Email to reporter                 Feb 10, 2026 10:15 AM   │
  │                                                                │
  │  Subject: Follow-up Questions - Case CASE-2026-00142          │
  │  To: anonymous-reporter@secure.ethico.com                      │
  │  "We have received your report and have begun our review.     │
  │   We have a few follow-up questions regarding the timeline..." │
  │                                                [Show full ▼]   │
  └────────────────────────────────────────────────────────────────┘
```

**Activity types on the timeline:**

| Type          | Icon | Content Shown                                                                                       |
| ------------- | ---- | --------------------------------------------------------------------------------------------------- |
| Note          | 📝   | Note text (truncated with "Show more" if long)                                                      |
| Email         | ✉    | Subject, To/From, preview of body. Auto-logged if sent from platform; manually logged if forwarded. |
| Call          | 📞   | Call outcome (Connected, Left voicemail, No answer), duration, notes                                |
| Task          | ✓    | Task title, due date, completion status (checkbox)                                                  |
| Interview     | 🎤   | Interviewee name, date, summary of interview notes                                                  |
| Document      | 📎   | File name, size, uploaded by. Clickable to download/preview.                                        |
| Status Change | 🔄   | Previous status → New status, changed by, rationale                                                 |
| System Event  | ⚙    | Auto-generated events: case created, assigned, SLA warning, AI analysis completed, etc.             |

**Per-activity actions** (hover to reveal action bar):

- **Pin (📌)**: Pin activity to top of timeline for quick reference
- **Comment (💬)**: Add a comment/reply to the activity
- **Edit (✏)**: Edit the activity content (creator or admin only)
- **Copy link (🔗)**: Copy a direct link to this activity
- **Delete (🗑)**: Delete the activity (creator or admin only, with confirmation)

**Pinned activities**: Appear in a "Pinned" section above the chronological timeline.

**Expand/collapse**: Long activity content is truncated with "Show full ▼" link. Click to expand inline.

---

### 16.3 Investigations Tab

The Investigations tab provides **full investigation management** without leaving the case page.

#### Top Bar

```
┌──────────────────────────────────────────────────────────────────┐
│  Investigations (2)           [+ Create Investigation]  [🔗 Link Existing]  │
└──────────────────────────────────────────────────────────────────┘
```

- **Count badge**: Shows number of linked investigations.
- **"+ Create Investigation"** button: Opens investigation creation flow (modal or inline form). Pre-populates with case context.
- **"Link Existing"** button: Opens a searchable picker to associate an existing investigation with this case.

#### Investigation Cards

Each linked investigation is displayed as an expandable card:

**Collapsed state:**

```
┌──────────────────────────────────────────────────────────────────┐
│  ▶ INV-2026-0037 — Unauthorized PHI Access Investigation        │
│    Status: ● IN PROGRESS    Assigned: Jane Smith    Started: Feb 1│
└──────────────────────────────────────────────────────────────────┘
```

**Expanded state (▼):**

```
┌──────────────────────────────────────────────────────────────────┐
│  ▼ INV-2026-0037 — Unauthorized PHI Access Investigation        │
│    Status: ● IN PROGRESS    Assigned: Jane Smith    Started: Feb 1│
│                                                                  │
│  ┌─ Details ──────────────────────────────────────────────────┐  │
│  │  Type:           Compliance Investigation                  │  │
│  │  Priority:       High                                      │  │
│  │  Target Date:    Mar 15, 2026                              │  │
│  │  Description:    Investigation into unauthorized access     │  │
│  │                  of patient records in billing department.  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Findings ─────────────────────────────────────────────────┐  │
│  │  3 unauthorized access events confirmed (Dec 15, 18, 22)  │  │
│  │  1 employee identified as primary accessor                 │  │
│  │  IT security logs corroborate timeline                     │  │
│  │                                                     [Edit] │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Notes (4) ────────────────────────────────────────────────┐  │
│  │  Feb 12 — Jane Smith: "Manager interview completed..."     │  │
│  │  Feb 8  — Michael Chen: "Access logs obtained from IT..."  │  │
│  │  [+ Add Note]                               [View all →]   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Open Full Investigation →]  [Unlink from Case]                 │
└──────────────────────────────────────────────────────────────────┘
```

**Inline editing:** Fields within the expanded investigation card (Description, Findings, Notes) are editable inline. Changes save to the investigation record.

**"Open Full Investigation →"** link navigates to the full Investigation detail page (which follows the same three-column layout pattern).

---

### 16.4 Messages Tab

The Messages tab shows **all official communications** related to the case. This is NOT internal team chat — it's the record of formal case correspondence.

**Message types:**

| Type                  | Source                                                       | How It Appears                                                                                              |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Reporter Messages** | Two-way anonymous/identified communication via access code   | Shown as a chat-like thread. Reporter messages on left, team responses on right.                            |
| **Platform Emails**   | Emails sent FROM the platform (via Email action button)      | Auto-logged. Shows subject, recipients, body, timestamp.                                                    |
| **Forwarded Emails**  | Emails forwarded TO the case from a user's inbox             | User forwards email to a case-specific email address (e.g., `case-00142@intake.ethico.com`). Auto-attached. |
| **Attached Emails**   | Emails manually attached to the case via the email log modal | User logs an email that happened outside the platform.                                                      |

**Layout:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Messages (8)                              [Compose Message]     │
│                                                                  │
│  ┌─ Reporter Communication ───────────────────────────────────┐  │
│  │  Anonymous Reporter (via Hotline Access Code)              │  │
│  │                                                            │  │
│  │  ← "I have additional information about the December       │  │
│  │     incidents. There was also an access on Jan 2 that      │  │
│  │     I forgot to mention."          Feb 11, 2026 9:30 AM  │  │
│  │                                                            │  │
│  │  → "Thank you for the additional information. We will      │  │
│  │     include the Jan 2 incident in our review."             │  │
│  │                                    Feb 11, 2026 2:15 PM   │  │
│  │                                                            │  │
│  │  [Reply to Reporter]                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Email Correspondence ─────────────────────────────────────┐  │
│  │                                                            │  │
│  │  ✉ To: tom.wilson@company.com       Feb 10, 2026 10:15   │  │
│  │    Subject: Interview Request - Compliance Case            │  │
│  │    "Dear Mr. Wilson, We are conducting a compliance..."    │  │
│  │                                           [Show full ▼]   │  │
│  │                                                            │  │
│  │  ✉ Forwarded by jane.smith@company.com  Feb 8, 2026       │  │
│  │    Subject: RE: Access Log Request                         │  │
│  │    "Attached are the December access logs you requested."  │  │
│  │                                           [Show full ▼]   │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**"Compose Message"** button opens a message composer appropriate to the context (email to case contacts, or reply to reporter).

---

### 16.5 Files Tab

The Files tab manages all documents associated with the case.

```
┌──────────────────────────────────────────────────────────────────┐
│  Files (7)                    [Upload]  [🔍 Search]  [Sort ▼]   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  📄 Access_Logs_Dec2025.xlsx              45 KB            │  │
│  │     Uploaded by Michael Chen    Feb 8, 2026                │  │
│  │     Tags: evidence, IT-security                            │  │
│  │     [Download] [Preview] [Delete]                          │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  📄 Interview_Notes_TomWilson.docx        12 KB            │  │
│  │     Uploaded by Jane Smith      Feb 12, 2026               │  │
│  │     Tags: interview, witness                               │  │
│  │     [Download] [Preview] [Delete]                          │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  📄 HIPAA_Breach_Policy_v3.pdf            230 KB           │  │
│  │     Uploaded by System          Jan 15, 2026               │  │
│  │     Tags: policy, reference                                │  │
│  │     [Download] [Preview] [Delete]                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Drag and drop files here to upload                              │
└──────────────────────────────────────────────────────────────────┘
```

**Features:**

- **Upload**: Button + drag-and-drop zone.
- **Search**: Filter files by name or tag.
- **Sort**: By date (newest/oldest), name (A-Z/Z-A), size.
- **File cards**: Name, size, uploader, date, tags.
- **Actions per file**: Download, Preview (in-browser for PDFs/images), Delete (with confirmation).
- **Tagging**: Each file can have tags (evidence, interview, policy, report, etc.).
- **Virus scanning**: Files are scanned on upload. Status indicator shown while scanning.

---

### 16.6 Remediation Tab

The Remediation tab tracks corrective actions and their implementation.

**IMPORTANT:** Remediation can occur **after a case is closed**. This tab must remain fully functional even when the case status is "Closed" or "Remediation" or "Archived".

```
┌──────────────────────────────────────────────────────────────────┐
│  Remediation Plan                    [+ Create Plan]  [Export]   │
│  Overall Progress: ████████░░ 75%    3 of 4 actions complete    │
│                                                                  │
│  ┌─ Corrective Actions ──────────────────────────────────────┐   │
│  │                                                           │   │
│  │  ☑ Revoke unauthorized access credentials                 │   │
│  │    Assigned: IT Security    Due: Feb 5    ✓ Completed Feb 4│   │
│  │                                                           │   │
│  │  ☑ Implement additional access controls for PHI records   │   │
│  │    Assigned: IT Security    Due: Feb 15   ✓ Completed Feb 12│  │
│  │                                                           │   │
│  │  ☑ Conduct HIPAA refresher training for billing dept      │   │
│  │    Assigned: HR / Training  Due: Feb 28   ✓ Completed Feb 20│  │
│  │                                                           │   │
│  │  ☐ Submit breach notification to OCR (if required)        │   │
│  │    Assigned: Compliance     Due: Mar 15   ○ In Progress    │   │
│  │                                                           │   │
│  │  [+ Add Corrective Action]                                │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Monitoring Period ───────────────────────────────────────┐   │
│  │  Start: Mar 1, 2026    End: Jun 1, 2026    Status: ○ Not Started│
│  │  Description: Monitor billing department access patterns   │   │
│  │  for 90 days post-remediation.                            │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**Features:**

- **Progress bar**: Visual completion percentage.
- **Corrective actions**: Checklist with assignee, due date, completion date, status.
- **Inline editing**: Click to edit any action item.
- **"+ Add Corrective Action"**: Inline form to add a new action.
- **Monitoring period**: Optional post-remediation monitoring window with start/end dates.
- **Export**: Generate a remediation summary report (PDF/Excel).

---

## 17. Right Sidebar

The right sidebar displays **association cards** — records and entities connected to this case. Each card is independently collapsible. The sidebar scrolls independently.

### 17.1 Card Ordering (Default)

Cards appear in this order by default. Order is configurable by admins.

| #   | Card                    | Description                                                                         |
| --- | ----------------------- | ----------------------------------------------------------------------------------- |
| 1   | **Case Workflow Panel** | Pipeline stage visualization with transition controls                               |
| 2   | **Connected People**    | People associated with the case (subjects, witnesses, reporters, investigators)     |
| 3   | **Linked RIUs**         | Risk Intelligence Units (intake records) that originated or are linked to this case |
| 4   | **Related Cases**       | Other cases with similar characteristics or explicit links                          |
| 5   | **Related Policies**    | Policies that are relevant to or violated by this case                              |
| 6   | **Connected Documents** | Quick-access document list (mirrors Files tab in a compact form)                    |
| 7   | **Tasks**               | Open and recently completed tasks for this case                                     |
| 8   | **Remediation Status**  | Summary of remediation plan progress                                                |
| 9   | **AI Assistant**        | Button to open AI chat panel (slide-over drawer)                                    |

### 17.2 Card Design Pattern

Each card follows a consistent pattern:

```
┌────────────────────────────────────────┐
│  Card Title (N)            [+ Add] [⚙] │
│  ────────────────────────────────────  │
│  🔍 [Search...]                        │
│                                        │
│  • Item 1                              │
│    Subtitle / secondary info           │
│                                        │
│  • Item 2                              │
│    Subtitle / secondary info           │
│                                        │
│  View all [Record Type] →              │
└────────────────────────────────────────┘
```

- **Title (N)**: Card name + count of associated records.
- **[+ Add]**: Button to create a new association (opens modal or inline form).
- **[⚙]**: Settings/configure (admin only) — choose which properties to show per item.
- **Search**: For cards with 5+ items, a search bar appears.
- **Items**: Up to 6 properties shown per item. Click item to preview or navigate.
- **"View all →"**: Link to full list view or dedicated page.
- **Collapse**: Click card title to collapse/expand. State persisted per user.

### 17.3 Tasks Card (NEW)

```
┌────────────────────────────────────────┐
│  Tasks (5)                    [+ Add]  │
│  ────────────────────────────────────  │
│                                        │
│  ☐ Interview witness             Feb 15│
│    Jane Smith                          │
│                                        │
│  ☐ Request access logs           Feb 18│
│    Michael Chen                        │
│                                        │
│  ☑ Review intake report     ✓ Feb 10  │
│    Jane Smith                          │
│                                        │
│  View all tasks →                      │
└────────────────────────────────────────┘
```

- Shows open tasks first, then recently completed.
- Checkbox to complete inline.
- Click task to expand details or navigate to task.

### 17.4 Remediation Status Card (NEW)

```
┌────────────────────────────────────────┐
│  Remediation Status                    │
│  ────────────────────────────────────  │
│                                        │
│  ████████░░ 75%                        │
│  3 of 4 actions complete               │
│                                        │
│  Next due: Submit OCR notification     │
│  Due: Mar 15, 2026                     │
│  Assigned: Compliance                  │
│                                        │
│  View remediation plan →               │
└────────────────────────────────────────┘
```

- Progress bar mirroring the Remediation tab.
- Shows next upcoming action.
- "View remediation plan →" switches to the Remediation tab.

### 17.5 AI Assistant Button

At the bottom of the right sidebar:

```
┌────────────────────────────────────────┐
│  🤖 Ask AI Assistant                   │
└────────────────────────────────────────┘
```

- Clicking opens a **slide-over drawer** from the right edge of the screen.
- AI panel provides: case summarization, risk assessment, similar case search, recommended actions, draft communications.
- Chat-style interface with the AI.

---

## 18. Modals and Interactions (Detail Page)

All modals are triggered from the left sidebar action buttons or the Actions dropdown. Each modal creates an activity that appears in the center column's timeline.

### 18.1 Assign Modal

- **Trigger:** Actions dropdown → Assign, or left sidebar Assign button
- **Content:** Searchable user list with role filters. Multi-select for assigning multiple investigators.
- **Fields:** Investigator(s), Assignment reason (optional text), Notify assignee (checkbox, default true).
- **On save:** Updates case `assigned_to`, logs assignment activity, sends notification.

### 18.2 Status Change Modal

- **Trigger:** Actions dropdown → Change Status, or clicking a stage in the pipeline bar
- **Content:** Status/stage selector with available transitions (not all stages are valid from current).
- **Fields:** New status (dropdown), Rationale (required text), Effective date (defaults to now).
- **On save:** Updates status, logs status change activity, updates pipeline bar.

### 18.3 Merge Modal

- **Trigger:** Actions dropdown → Merge
- **Content:** Search bar to find the target case. Shows preview of target case details.
- **Fields:** Target case (search/select), Merge direction (which case survives), Merge rationale.
- **On save:** Merges cases (moves all activities, associations, files to target), redirects to target case.
- **WARNING:** This is a destructive action. Requires confirmation dialog: "This will merge CASE-2026-00142 into CASE-2026-00089. This cannot be undone."

### 18.4 Add Note Modal

- **Trigger:** Left sidebar Note button
- **Fields:** Note text (rich text editor), Visibility (internal only / shared with reporter), Attachments (optional file upload).
- **On save:** Creates note, appears in Activities timeline.

### 18.5 Email Log Modal

- **Trigger:** Left sidebar Email button
- **Content:** Two modes:
  1. **Compose**: Send a new email from the platform. Fields: To, CC, Subject, Body (rich text), Attachments.
  2. **Log**: Record an email that happened outside the platform. Fields: Direction (sent/received), From, To, Subject, Body, Date, Attachments.
- **On save:** Logs email activity. If composed, actually sends the email via platform email service. Appears in Activities timeline AND Messages tab.

### 18.6 Create Task Modal

- **Trigger:** Left sidebar Task button
- **Fields:** Task title, Description, Assigned to (user selector), Due date, Priority, Reminder.
- **On save:** Creates task. Appears in Activities timeline, Tasks card (right sidebar), and Upcoming Tasks on Overview tab.

### 18.7 Attach Document Modal

- **Trigger:** Left sidebar Document button
- **Content:** File upload area (drag-and-drop + browse). Multiple file support.
- **Fields:** File(s), Tags (multi-select), Description (optional).
- **On save:** Uploads files to tenant-scoped Azure Blob Storage. Appears in Activities timeline, Files tab, and Documents card (right sidebar).

### 18.8 Log Interview Modal

- **Trigger:** Left sidebar Interview button
- **Fields:** Interviewee name, Interviewee role/relationship, Interview date, Duration, Location (in-person/phone/video), Interview notes (rich text), Outcome/Key findings (text), Attachments.
- **On save:** Creates interview record. Appears in Activities timeline.

### 18.9 Log Call Modal

- **Trigger:** Left sidebar More → Log Call
- **Fields:** Contact name, Phone number, Direction (inbound/outbound), Outcome (Connected, Left voicemail, No answer, Busy, Wrong number), Duration, Call notes.
- **On save:** Creates call record. Appears in Activities timeline.

---

## 19. Detail Page Data Models

### 19.1 Pipeline Configuration

```typescript
interface PipelineConfig {
  id: string;
  tenantId: string;
  moduleType: "cases" | "investigations" | "disclosures";
  name: string; // e.g., "Default Case Pipeline"
  stages: PipelineStage[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PipelineStage {
  id: string;
  name: string; // e.g., "New", "Active", "Closed"
  order: number; // Display order (0-indexed)
  color: string; // Hex color for the stage indicator
  description?: string;
  isClosed: boolean; // Whether this stage represents a "closed" state
  allowedTransitions: string[]; // IDs of stages this stage can transition to
}
```

**Default pipeline stages (shipped out-of-the-box):**

```typescript
const DEFAULT_CASE_PIPELINE: PipelineStage[] = [
  {
    id: "new",
    name: "New",
    order: 0,
    color: "#6B7280",
    isClosed: false,
    allowedTransitions: ["assigned"],
  },
  {
    id: "assigned",
    name: "Assigned",
    order: 1,
    color: "#3B82F6",
    isClosed: false,
    allowedTransitions: ["active", "new"],
  },
  {
    id: "active",
    name: "Active",
    order: 2,
    color: "#8B5CF6",
    isClosed: false,
    allowedTransitions: ["review", "assigned"],
  },
  {
    id: "review",
    name: "Review",
    order: 3,
    color: "#F59E0B",
    isClosed: false,
    allowedTransitions: ["active", "closed"],
  },
  {
    id: "closed",
    name: "Closed",
    order: 4,
    color: "#10B981",
    isClosed: true,
    allowedTransitions: ["remediation", "active"],
  },
  {
    id: "remediation",
    name: "Remediation",
    order: 5,
    color: "#EF4444",
    isClosed: false,
    allowedTransitions: ["archived", "closed"],
  },
  {
    id: "archived",
    name: "Archived",
    order: 6,
    color: "#9CA3AF",
    isClosed: true,
    allowedTransitions: [],
  },
];
```

**NOTE:** The `Closed → Remediation` transition is critical. Cases can move from Closed to Remediation when corrective actions are required post-closure. This must be reportable.

### 19.2 Activity Model

```typescript
interface CaseActivity {
  id: string;
  caseId: string;
  tenantId: string;
  type: ActivityType;
  createdBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  content: string; // Main text content
  metadata: Record<string, any>; // Type-specific metadata (email headers, call duration, etc.)
  attachments: Attachment[];
  comments: ActivityComment[];
  visibility: "internal" | "shared"; // Internal-only or shared with reporter
}

type ActivityType =
  | "note"
  | "email"
  | "call"
  | "task"
  | "interview"
  | "document_upload"
  | "status_change"
  | "assignment_change"
  | "system_event";

interface ActivityComment {
  id: string;
  activityId: string;
  createdBy: string;
  content: string;
  createdAt: Date;
}
```

### 19.3 Left Sidebar Card Configuration

```typescript
interface RecordCardConfig {
  id: string;
  tenantId: string;
  moduleType: string;
  cardType: "about" | "intake" | "classification" | "custom";
  name: string; // Display name
  fields: CardField[]; // Ordered list of fields
  collapsedByDefault: boolean;
  lockedByAdmin: boolean; // If true, users cannot hide this card
  roleVisibility: string[]; // Which roles can see this card (empty = all)
}

interface CardField {
  propertyId: string;
  order: number;
  isEditable: boolean;
  isLocked: boolean; // Admin-locked: cannot be removed by users
  isVisible: boolean;
}
```

### 19.4 Category Configuration

```typescript
interface CaseCategory {
  id: string;
  tenantId: string;
  name: string; // e.g., "HIPAA Violation"
  description?: string;
  isActive: boolean;
  order: number;
  subcategories: CaseSubcategory[];
}

interface CaseSubcategory {
  id: string;
  categoryId: string;
  name: string; // e.g., "PHI Breach"
  description?: string;
  isActive: boolean;
  order: number;
}
```

---

## 20. Detail Page API Endpoints

| Endpoint                                         | Method   | Description                                               |
| ------------------------------------------------ | -------- | --------------------------------------------------------- |
| **Case CRUD**                                    |          |                                                           |
| `/api/cases/:id`                                 | GET      | Get full case record with associations                    |
| `/api/cases/:id`                                 | PUT      | Update case properties                                    |
| `/api/cases/:id/status`                          | PUT      | Change case status/pipeline stage                         |
| `/api/cases/:id/assign`                          | PUT      | Assign investigators                                      |
| `/api/cases/:id/merge`                           | POST     | Merge with another case                                   |
| **Activities**                                   |          |                                                           |
| `/api/cases/:id/activities`                      | GET      | List activities (with type/user/date filters, pagination) |
| `/api/cases/:id/activities`                      | POST     | Create activity (note, email, call, interview, etc.)      |
| `/api/cases/:id/activities/:activityId`          | PUT      | Update activity                                           |
| `/api/cases/:id/activities/:activityId`          | DELETE   | Delete activity                                           |
| `/api/cases/:id/activities/:activityId/pin`      | PUT      | Pin/unpin activity                                        |
| `/api/cases/:id/activities/:activityId/comments` | POST     | Add comment to activity                                   |
| **Investigations**                               |          |                                                           |
| `/api/cases/:id/investigations`                  | GET      | List linked investigations                                |
| `/api/cases/:id/investigations`                  | POST     | Create investigation linked to case                       |
| `/api/cases/:id/investigations/:invId/link`      | POST     | Link existing investigation                               |
| `/api/cases/:id/investigations/:invId/unlink`    | DELETE   | Unlink investigation                                      |
| `/api/investigations/:id`                        | GET      | Get full investigation (for inline editing)               |
| `/api/investigations/:id`                        | PUT      | Update investigation (inline edits)                       |
| `/api/investigations/:id/notes`                  | GET/POST | Investigation notes CRUD                                  |
| **Messages**                                     |          |                                                           |
| `/api/cases/:id/messages`                        | GET      | List official communications                              |
| `/api/cases/:id/messages`                        | POST     | Send message (email or reporter reply)                    |
| `/api/cases/:id/messages/forward`                | POST     | Process forwarded email                                   |
| **Files**                                        |          |                                                           |
| `/api/cases/:id/files`                           | GET      | List files                                                |
| `/api/cases/:id/files`                           | POST     | Upload file(s)                                            |
| `/api/cases/:id/files/:fileId`                   | DELETE   | Delete file                                               |
| `/api/cases/:id/files/:fileId/download`          | GET      | Download file                                             |
| **Remediation**                                  |          |                                                           |
| `/api/cases/:id/remediation`                     | GET      | Get remediation plan                                      |
| `/api/cases/:id/remediation`                     | POST     | Create remediation plan                                   |
| `/api/cases/:id/remediation/actions`             | POST     | Add corrective action                                     |
| `/api/cases/:id/remediation/actions/:actionId`   | PUT      | Update corrective action                                  |
| **Configuration**                                |          |                                                           |
| `/api/pipelines`                                 | GET      | List pipeline configurations for tenant                   |
| `/api/pipelines`                                 | POST     | Create pipeline (admin)                                   |
| `/api/pipelines/:id`                             | PUT      | Update pipeline stages (admin)                            |
| `/api/categories`                                | GET      | List categories and subcategories                         |
| `/api/categories`                                | POST     | Create category (admin)                                   |
| `/api/categories/:id/subcategories`              | POST     | Create subcategory (admin)                                |
| `/api/record-cards`                              | GET      | Get card configuration for a module                       |
| `/api/record-cards`                              | PUT      | Update card configuration (admin)                         |

---

## 21. Detail Page Component Architecture

Shared, reusable components — adapted per module via configuration:

```
components/record-detail/
  RecordDetailLayout.tsx          // Three-column layout wrapper
  RecordBreadcrumb.tsx            // ← Cases / CASE-2026-00142
  PipelineStageBar.tsx            // Sticky pipeline visualization (configurable stages)
  TabBar.tsx                      // Tab navigation component
  ActionsDropdown.tsx             // "Actions ▼" menu

  // Left Sidebar
  RecordHeader.tsx                // Reference #, status, severity badges
  QuickActionButtons.tsx          // Note, Email, Task, Document, Interview, More
  CollapsiblePropertyCard.tsx     // Reusable collapsible card with inline-editable fields
  CategorySelector.tsx            // Primary + dependent subcategory dropdowns
  PropertyField.tsx               // Single inline-editable field (text, dropdown, date, etc.)

  // Center Column - Tabs
  OverviewTab.tsx                 // Data highlights, summary, case details, status history, recent/upcoming
  ActivitiesTab.tsx               // Activity timeline with filters
  ActivityFilterBar.tsx           // Type checkboxes, user/team filter, search
  ActivityTimelineItem.tsx        // Single activity card with actions (pin, comment, edit, delete)
  InvestigationsTab.tsx           // Investigation list, create, link, inline edit
  InvestigationCard.tsx           // Expandable investigation card
  MessagesTab.tsx                 // Reporter messages + email correspondence
  FilesTab.tsx                    // File management with upload, search, sort
  RemediationTab.tsx              // Remediation plan, corrective actions, monitoring

  // Right Sidebar
  AssociationCard.tsx             // Reusable card for any association type
  WorkflowPanel.tsx               // Pipeline visualization card
  ConnectedPeopleCard.tsx         // People associated with record
  LinkedRiusCard.tsx              // Linked RIU intake records
  RelatedRecordsCard.tsx          // Related cases, policies (reusable)
  TasksCard.tsx                   // Open/completed tasks summary
  RemediationStatusCard.tsx       // Remediation progress summary
  AiAssistantButton.tsx           // AI chat trigger

  // Shared
  DataHighlightsCard.tsx          // 4-6 key property values grid
  EditableSummary.tsx             // Rich text editable summary with AI generation
  CollapsibleSection.tsx          // Chevron expand/collapse for any section
  StatusHistoryTimeline.tsx       // Vertical status change timeline
  InlineEditor.tsx                // Generic inline edit component (text, dropdown, date, multiselect)

hooks/
  useCaseDetail.ts                // Case data fetching and mutation
  useActivities.ts                // Activity CRUD, filtering, pinning
  usePipeline.ts                  // Pipeline stage management
  useInvestigations.ts            // Investigation CRUD and linking
  useMessages.ts                  // Message fetching and sending
  useFiles.ts                     // File upload, download, management
  useRemediation.ts               // Remediation plan management
  useRecordCards.ts               // Left sidebar card configuration
  useCategories.ts                // Category/subcategory fetching
```

**Module configuration pattern:** Each module provides a configuration object defining which tabs, cards, and fields to display:

```tsx
// config/casesDetailConfig.ts
export const CASES_DETAIL_CONFIG: RecordDetailConfig = {
  moduleType: "cases",
  primaryDisplayProperty: "referenceNumber",
  statusProperty: "status",
  severityProperty: "severity",

  pipeline: {
    enabled: true,
    configEndpoint: "/api/pipelines",
  },

  tabs: [
    {
      id: "overview",
      label: "Overview",
      component: OverviewTab,
      isDefault: true,
    },
    { id: "activities", label: "Activities", component: ActivitiesTab },
    {
      id: "investigations",
      label: "Investigations",
      component: InvestigationsTab,
    },
    { id: "messages", label: "Messages", component: MessagesTab },
    { id: "files", label: "Files", component: FilesTab },
    { id: "remediation", label: "Remediation", component: RemediationTab },
  ],

  leftSidebar: {
    cards: [
      {
        id: "about",
        type: "about",
        label: "About This Case",
        collapsedByDefault: false,
      },
      {
        id: "intake",
        type: "intake",
        label: "Intake Information",
        collapsedByDefault: true,
      },
      {
        id: "classification",
        type: "classification",
        label: "Classification",
        collapsedByDefault: false,
      },
    ],
  },

  rightSidebar: {
    cards: [
      { id: "workflow", component: WorkflowPanel },
      { id: "people", component: ConnectedPeopleCard },
      { id: "rius", component: LinkedRiusCard },
      {
        id: "related-cases",
        component: RelatedRecordsCard,
        props: { recordType: "cases" },
      },
      {
        id: "policies",
        component: RelatedRecordsCard,
        props: { recordType: "policies" },
      },
      { id: "documents", component: ConnectedDocumentsCard },
      { id: "tasks", component: TasksCard },
      { id: "remediation-status", component: RemediationStatusCard },
      { id: "ai", component: AiAssistantButton },
    ],
  },

  quickActions: ["note", "email", "task", "document", "interview"],
  actionsMenu: [
    "assign",
    "change_status",
    "merge",
    "follow",
    "view_properties",
    "view_history",
    "export",
    "delete",
  ],

  activityTypes: [
    "note",
    "email",
    "call",
    "task",
    "interview",
    "document_upload",
    "status_change",
    "assignment_change",
    "system_event",
  ],

  dataHighlights: [
    "severity",
    "status",
    "caseAge",
    "slaStatus",
    "assignedTo",
    "sourceChannel",
  ],
};
```

**Usage in page component:**

```tsx
// app/(authenticated)/cases/[id]/page.tsx
import { RecordDetailLayout } from "@/components/record-detail/RecordDetailLayout";
import { CASES_DETAIL_CONFIG } from "@/config/casesDetailConfig";

export default function CaseDetailPage() {
  const params = useParams();
  return (
    <RecordDetailLayout
      config={CASES_DETAIL_CONFIG}
      recordId={params.id as string}
    />
  );
}
```

---

## 22. Detail Page UX Details and Edge Cases

1. **Loading states**: Full-page skeleton loader for the three-column layout. Each card has its own skeleton. Tabs show skeleton content while loading.

2. **Error states**: If the record is not found (404), show centered "Case Not Found" message with back button. If a specific card fails to load, show an error state within just that card (not the whole page).

3. **Optimistic updates**: When editing fields inline (left sidebar), apply the change immediately in the UI and save in the background. Show a subtle "Saving..." indicator, then "Saved" confirmation. If save fails, revert with error toast.

4. **Activity refresh**: When any activity is created (via quick action buttons), the Activities tab timeline must refresh. If on the Overview tab, the "Recent Activities" card must also update. Use WebSocket events or polling with short interval.

5. **Concurrent editing**: If multiple users are viewing the same case, changes by one user should be reflected for others within a reasonable time (polling every 30 seconds, or WebSocket push).

6. **Sticky pipeline bar**: The pipeline stage bar must remain visible at the top of the center column as the user scrolls through tab content. Use `position: sticky; top: 0; z-index: 10;`.

7. **Collapsible cards persistence**: The expand/collapse state of left sidebar cards should be saved per user (localStorage or user preferences API) so they persist across page loads.

8. **Long lists in right sidebar cards**: If an association card has more than 5 items, show the first 5 with a "View all (N) →" link. The link either scrolls to the relevant tab or opens a full list.

9. **Keyboard shortcuts**: Support keyboard navigation: `Esc` to close modals, tab-specific shortcuts (e.g., `N` for new note when on Activities tab).

10. **Print/Export**: The page should have a print-friendly layout that collapses into a single-column report format. The "Export Case" action in the Actions dropdown generates a comprehensive PDF.

11. **Audit trail**: Every change to the case (status, properties, assignments) is logged in the AuditLog. The "View Property History" action in the Actions dropdown shows a complete change history.

12. **Role-based field visibility**: Some fields may be hidden based on user role (e.g., reporter identity hidden from non-investigators). The RecordCardConfig handles this via `roleVisibility`.

13. **SLA indicators**: When SLA due date is approaching (within 48 hours), show a yellow warning badge. When overdue, show a red alert badge. These appear in the Data Highlights card and the Case Header.

14. **Empty states per tab**:
    - Activities: "No activities yet. Use the action buttons in the left sidebar to add the first activity."
    - Investigations: "No investigations linked to this case. Create a new investigation or link an existing one."
    - Messages: "No messages yet. Use the Email button to send the first message."
    - Files: "No files attached. Upload files or attach documents from the action buttons."
    - Remediation: "No remediation plan created. Click '+ Create Plan' to start tracking corrective actions."

---

## 23. Detail Page Reference Sources

This specification is modeled after HubSpot's CRM record detail page pattern. For additional reference:

- [HubSpot: Record page layout overview](https://knowledge.hubspot.com/records/work-with-records)
- [HubSpot: Customize records](https://knowledge.hubspot.com/object-settings/customize-records)
- [HubSpot: Customize the left sidebar](https://knowledge.hubspot.com/object-settings/customize-record-sidebars)
- [HubSpot: Customize the middle column](https://knowledge.hubspot.com/object-settings/customize-the-middle-column-of-records)
- [HubSpot: Customize the right sidebar](https://knowledge.hubspot.com/object-settings/customize-record-right-sidebar)
- [HubSpot: View and customize record overviews](https://knowledge.hubspot.com/crm-setup/view-and-customize-record-overviews)
- [HubSpot: Create or log activities on a record](https://knowledge.hubspot.com/records/manually-log-activities-on-records)
- [HubSpot: Filter activity timelines](https://knowledge.hubspot.com/crm-setup/customize-activities-on-a-contact-company-deal-ticket-record-timeline)
- [HubSpot: Use cards on records](https://knowledge.hubspot.com/records/use-cards-on-records)
- [HubSpot: Select properties for About section](https://knowledge.hubspot.com/contacts/select-properties-to-show-under-the-about-section-in-a-record)
- [HubSpot: Use lifecycle stages](https://knowledge.hubspot.com/records/use-lifecycle-stages)
