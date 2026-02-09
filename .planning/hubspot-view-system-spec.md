# HubSpot-Style Saved Views System — Implementation Specification for Risk Intelligence Platform

This document describes the full functionality of the **HubSpot CRM Index Page / Saved Views** pattern. This system must be implemented as a **reusable, shared component architecture** and applied to the following pillar modules: **Cases, Investigations, Disclosures, Intake Forms, and Policies** — with the design extensible for future modules.

---

## 1. Page Layout Structure

The entire view system lives inside the main content area (below the top navbar, to the right of the left sidebar nav). The layout is composed of four stacked horizontal zones:

| Zone | Description |
|------|-------------|
| **Zone 1 — View Tabs Bar** | A horizontally scrollable row of named tabs, each representing a saved view. Includes a `+` button to create new views. |
| **Zone 2 — Toolbar Row** | Search box, view mode toggle, Edit Columns, Filter, Sort, Export, Duplicate, Save buttons. |
| **Zone 3 — Quick Filters Row** | Conditionally visible (only when Filter is active). Shows quick-filter dropdowns for common properties plus an "Advanced filters" pill/button. |
| **Zone 4 — Data Table / Board** | The main data display area. Default is a table view; optionally togglable to a board/card view grouped by a status or stage field. |

Below the data table is a **pagination bar** with: `< Prev` / page numbers / `Next >` and a "per page" dropdown (options: 25, 50, 100).

---

## 2. Zone 1 — View Tabs Bar (Saved Views)

### 2.1 Tab Behavior

- Each tab represents a **saved view** — a named combination of: selected columns, column order, sort configuration, active filters, and visibility/sharing settings.
- Tabs are displayed as horizontally arranged pill-shaped buttons with the view name as the label.
- The **currently active tab** has a visually distinct active state (e.g., underline, background highlight, or bold text).
- Some tabs may display a **record count badge** next to the name (e.g., "Needs next action 199.9K") showing how many records match that view's filters.
- Users can have **up to 50 saved view tabs** per module.
- When there are more tabs than fit the horizontal space, a **right-arrow scroll indicator (`>`)** appears at the right edge of the tab bar, allowing horizontal scrolling or revealing a dropdown of overflow tabs.

### 2.2 Tab Interactions

| Action | Trigger | Behavior |
|--------|---------|----------|
| **Select a tab** | Click on any tab | Loads that view's columns, filters, sort, and refreshes the data table |
| **Reorder tabs** | Click-and-drag a tab to a new horizontal position | Tab slides into the new position; other tabs shift accordingly. The leftmost tab becomes the default view for that user. |
| **Tab context menu** | Click the **three-dot icon (⋮)** on the right edge of a tab | Opens a dropdown menu with: Rename, Clone, Manage sharing, Delete |
| **Rename** | Select from context menu | Inline text editing of the tab name or a small modal input |
| **Clone** | Select from context menu | Creates a duplicate view with " (copy)" appended to the name, identical columns/filters/sort |
| **Manage sharing** | Select from context menu | Opens sharing settings: **Private** (only the creator can see it), **My team** (visible to the creator's team), **Everyone** (visible to all users in the account) |
| **Delete** | Select from context menu | Confirmation dialog, then removes the tab. Does NOT delete any underlying records. Only the view creator or an admin can delete. |
| **Close tab** | Click an `×` on the tab (if shown) | Unpins the tab from the tab bar. The view still exists and can be re-opened from the "Add view" menu. |

### 2.3 Add New View (`+` Button)

- A **circular `+` icon** sits at the far right of the tabs row (before the scroll indicator if present).
- Clicking it opens a dropdown/popover with two sections:
  1. **Create new view** — prompts for a name and visibility setting, then opens the view with default columns for that module.
  2. **Open an existing saved view** — shows a searchable list of all saved views the user has access to (their own private views + team-shared + everyone-shared). Selecting one adds it as a new pinned tab.

---

## 3. Zone 2 — Toolbar Row

This is a horizontal bar of action buttons sitting directly below the tab bar. From left to right:

### 3.1 Search Box
- A text input with a magnifying glass icon and placeholder text like "Search".
- Searches across all visible text columns in the current view (name, description, ID, etc.).
- Performs **client-side instant filtering** for small datasets or **debounced server-side search** for large datasets.
- Search is scoped to the current view's filtered dataset.

### 3.2 View Mode Toggle
- A segmented button or dropdown labeled **"Table view"** with a dropdown arrow.
- Options:
  - **Table view** (default) — standard data table with rows and columns
  - **Board view** — Kanban-style card layout grouped by a status/stage field (e.g., Case Status, Investigation Stage)
- The selected view mode is saved as part of the view configuration.

### 3.3 Settings Gear Icon
- A small gear/cog icon next to the view mode toggle.
- Opens view-level settings (e.g., compact vs. comfortable row density, auto-refresh interval).

### 3.4 Edit Columns Button
- Labeled **"Edit columns"**.
- Opens the **Column Selection Modal** (see Section 5 below).
- Allows adding, removing, and reordering columns for the current view.

### 3.5 Filter Button
- Labeled **"Filter (N)"** where N is the count of currently active filters.
- Has a visually distinct state when filters are active (e.g., colored background or badge).
- **Toggle behavior**: Clicking this button shows or hides **Zone 3 — the Quick Filters Row** below the toolbar.
- The filter button also has a small dropdown arrow that lets users choose between quick filters and jumping directly to advanced filters.

### 3.6 Sort Button
- Labeled **"↓ Sort"**.
- Opens a dropdown or popover where the user can:
  - Select a column to sort by (from the columns currently in the view)
  - Choose sort direction: Ascending (A→Z, oldest first, smallest first) or Descending (Z→A, newest first, largest first)
- Users can also sort by clicking column headers directly in the table (see Section 6).

### 3.7 Export Button
- Labeled **"Export"**.
- Exports the current view's data (respecting active filters and column selection) as an **Excel (.xlsx) or CSV file**.
- Should show a brief confirmation toast or modal indicating the export has started / is ready for download.

### 3.8 Duplicate/Copy Button
- An icon button (clipboard/copy icon).
- Duplicates the entire current view (columns, filters, sort) into a new view tab with "(copy)" appended.

### 3.9 Save Button
- Labeled **"Save"**.
- **Disabled by default**. Becomes **enabled** whenever the user makes any unsaved change to the view (adds/removes a column, changes a filter, reorders columns, changes sort, etc.).
- Clicking "Save" persists all changes to the saved view.
- If the user navigates away from an unsaved view, a confirmation prompt should appear: "You have unsaved changes. Save before leaving?"

---

## 4. Zone 3 — Quick Filters Row (Conditional)

This row appears **only when the Filter button in Zone 2 is active/toggled on**. It sits between the toolbar and the data table.

### 4.1 Quick Filter Dropdowns

A horizontal row of dropdown buttons, each representing a commonly-used filterable property for that module. Examples:

- For **Cases**: Case Owner, Created Date, Last Activity Date, Case Status, Priority, + More
- For **Investigations**: Assigned Investigator, Created Date, Investigation Type, Status, + More
- For **Disclosures**: Submitter, Disclosure Date, Category, Status, + More
- For **Intake Forms**: Form Type, Submitted Date, Status, Assigned To, + More
- For **Policies**: Policy Owner, Created Date, Last Review Date, Policy Status, + More

Each dropdown button:
- Shows the property name as the label.
- Has a small dropdown caret.
- When clicked, opens a dropdown with filter options specific to that property type:
  - **Date properties**: Preset ranges (Today, Yesterday, This week, This month, This quarter, Last 30 days, Custom range)
  - **User/owner properties**: Searchable list of users with checkboxes for multi-select
  - **Status/enum properties**: Checkboxes for each status value
  - **Text properties**: Contains / Does not contain / Is / Is not text inputs

The **"+ More"** button lets users add additional quick filter dropdowns from any property in the dataset.

### 4.2 Advanced Filters Pill

- At the right end of the quick filters row is a pill/button labeled **"Advanced filters"** with an `×` to dismiss.
- It has a visually distinct style (e.g., a colored border or background) when advanced filters are active.
- Clicking this opens the **Advanced Filters Slide-Out Panel** (see Section 5.2).

---

## 5. Modals and Panels

### 5.1 Column Selection Modal ("Edit Columns" / "Add View" Column Picker)

This is a **centered modal overlay** that appears when the user clicks "Edit columns" or creates a new view.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Choose which columns you see                                   X  │
├────────────────────────────────┬────────────────────────────────────┤
│  [Search columns...]     🔍    │  SELECTED COLUMNS (N)   Frozen: 0 │
│                                │                                    │
│  ▼ ASSOCIATIONS                │  ┌──────────────────────────┐      │
│  ☐ Contact → Companies         │  │ ⋮⋮ Name                  │ (*)  │
│  ☐ Contact → Deals             │  │ ⋮⋮ Status             ×  │      │
│  ☐ Contact → Tickets           │  │ ⋮⋮ Priority           ×  │      │
│                                │  │ ⋮⋮ Created Date       ×  │      │
│  ▼ PROPERTY GROUP A            │  │ ⋮⋮ Assigned To        ×  │      │
│  ☐ Property 1                  │  │ ⋮⋮ Last Activity      ×  │      │
│  ☐ Property 2                  │  │ ⋮⋮ Description        ×  │      │
│  ☐ Property 3                  │  └──────────────────────────┘      │
│  ...                           │                                    │
├────────────────────────────────┴────────────────────────────────────┤
│  [Apply]  [Cancel]  Remove All Columns                              │
└─────────────────────────────────────────────────────────────────────┘
```

**Left Panel — Available Columns:**
- A **search box** at the top to filter the column list by name.
- All available columns/properties for the current module's data source, organized by **category groups** (collapsible sections).
  - Example groups: "Associations", "Contact Information", "Order Information", "Calculated Fields", custom property groups, etc.
  - For the Risk Intelligence Platform, groups would be module-specific: e.g., "Case Details", "Investigation Metadata", "Compliance Fields", "Custom Properties", etc.
- Each column has a **checkbox**. Checking it adds the column to the Selected Columns panel on the right. Unchecking it removes it.

**Right Panel — Selected Columns:**
- Header shows **"SELECTED COLUMNS (N)"** where N is the count.
- A **"Frozen columns"** dropdown in the top-right corner lets users set how many leftmost columns remain fixed/frozen when scrolling horizontally (options: 0, 1, 2, 3).
- Each selected column is displayed as a row with:
  - A **drag handle** (⋮⋮ dots icon) on the left for reordering via drag-and-drop.
  - The **column name** in the center.
  - An **× remove button** on the right to deselect/remove the column.
  - The **first column (e.g., "Name")** is typically locked and cannot be removed (shown without an ×).
- Columns can be **dragged up or down** to reorder. The order in this list directly maps to the left-to-right column order in the table.

**Footer Actions:**
- **Apply** (primary button, colored) — applies the column selection and closes the modal.
- **Cancel** (secondary button) — discards changes and closes the modal.
- **Remove All Columns** (text link) — clears all selected columns (except the locked primary column).
- **× close button** in the top-right corner of the modal header — same as Cancel.

### 5.2 Advanced Filters Slide-Out Panel

This is a **right-side slide-out panel** (not a modal — the main page content shifts left or the panel overlays on the right).

**Layout:**

```
┌─────────────────────────────────────────┐
│  All filters                         X  │
│  Advanced Filters                       │
│                                         │
│  ┌─ Group 1 ──────────────── 📋 🗑 ──┐ │
│  │                                    │ │
│  │  [Last Activity Date ▼]         ×  │ │
│  │  [is less than         ▼]          │ │
│  │  [ 1 ] [day ago ▼]                │ │
│  │  ℹ Includes records timestamped    │ │
│  │    Feb 5, 2026 - Feb 6, 2026      │ │
│  │                                    │ │
│  │  and                               │ │
│  │                                    │ │
│  │  [Next activity date ▼]         ×  │ │
│  │  is unknown                        │ │
│  │                                    │ │
│  │  and                               │ │
│  │                                    │ │
│  │  [+ Add filter]                    │ │
│  └────────────────────────────────────┘ │
│                                         │
│     or                                  │
│                                         │
│  [+ Add filter group]                   │
│                                         │
└─────────────────────────────────────────┘
```

**Filter Groups:**
- Each group is a bordered card/section labeled "Group 1", "Group 2", etc.
- Filters **within a group** are joined by **AND** logic (all conditions must be true).
- Filter **groups** are joined by **OR** logic (records matching ANY group are included).
- Each group has:
  - A **clone/duplicate icon** (📋) to copy the entire group.
  - A **delete/trash icon** (🗑) to remove the entire group.
- **Maximum of 2 filter groups** with **up to 20 conditions per group**.

**Individual Filter Anatomy:**

Each filter condition consists of:

1. **Property selector** — a dropdown to choose which column/property to filter on. Clicking "+ Add filter" opens a **searchable property picker popup** (see below).
2. **Operator selector** — a dropdown with condition operators. Available operators vary by property data type:

| Data Type | Available Operators |
|-----------|-------------------|
| **Text/String** | is, is not, contains, does not contain, starts with, ends with, is known, is unknown, is any of, is none of |
| **Number** | is equal to, is not equal to, is greater than, is greater than or equal to, is less than, is less than or equal to, is between, is known, is unknown |
| **Date** | is, is before, is after, is between, is less than [N] days/weeks/months ago, is more than [N] days/weeks/months ago, is known, is unknown |
| **Boolean** | is true, is false, is known, is unknown |
| **Enum/Select** | is any of, is none of, is known, is unknown |
| **User/Owner** | is any of, is none of, is known, is unknown |

3. **Value input** — Appears below the operator when a value is required. The input type changes based on the operator:
   - **Text input** for string comparisons
   - **Number input** for numeric comparisons
   - **Date picker** for date comparisons
   - **Number + unit dropdown** (e.g., `[1] [day ago ▼]`) for relative date comparisons like "is less than N days ago" — unit options: days, weeks, months
   - **Multi-select dropdown** for "is any of" / "is none of"
   - **Two inputs** (min and max) for "is between"
   - **No value input** for "is known" / "is unknown"

4. **Remove button (×)** — removes this individual filter condition.

**Helpful info hints**: For relative date filters, a small info line appears below showing the actual date range the filter resolves to (e.g., "Includes records timestamped Feb 5, 2026 - Feb 6, 2026").

**"+ Add filter" Behavior:**
- Clicking "+ Add filter" within a group opens a **popover/dropdown** with:
  - A **search box** at the top ("Search in [module] properties")
  - Properties listed by **category group** (same grouping as in the Column Selection Modal)
  - Clicking a property adds it as a new filter condition in that group

**"+ Add filter group" Button:**
- Appears below all existing groups, preceded by the word "or".
- Creates a new empty filter group card.

**Panel Close:**
- **× button** in the top-right closes the panel.
- Filters are applied in real-time as conditions are set (the table behind the panel updates live).

---

## 6. Zone 4 — Data Table

### 6.1 Table Structure

| Component | Behavior |
|-----------|----------|
| **Header row** | Displays column names. Each header has: the column name, a **sort toggle** (↑↓ arrows — click to cycle: unsorted → ascending → descending), and a **three-dot menu (⋮)** for column-level actions (Sort ascending, Sort descending, Move left, Move right, Hide column, Freeze column). |
| **Checkbox column** | Leftmost column is a checkbox for row selection. Header checkbox selects/deselects all visible rows. When rows are selected, a bulk actions bar appears above the table. |
| **Data rows** | Each row represents a record. The first column (typically Name/Title) is rendered as a **clickable link** (colored text) that navigates to the record's detail page. Other columns display formatted data based on their type (dates formatted, numbers with commas, status as colored badges, etc.). |
| **Empty state (`--`)** | Cells with no data display `--` as a placeholder. |
| **Row hover** | Rows have a subtle hover highlight for visual feedback. |
| **Column resizing** | Users can drag column borders in the header to resize column widths. |
| **Horizontal scrolling** | When columns extend beyond the viewport, the table scrolls horizontally. Frozen columns (set in Edit Columns) remain fixed on the left. |

### 6.2 Pagination Bar

Below the table:

```
< Prev  [1]  2  3  4  5  6  7  8  9  10  11  Next >    25 per page ▼
```

- **Page numbers** are clickable. The current page is highlighted.
- **Prev / Next** arrows navigate one page. Prev is disabled on page 1; Next is disabled on the last page.
- **"N per page" dropdown** allows: 25, 50, 100 records per page.
- The pagination state is NOT saved as part of the view — it resets when switching views.

### 6.3 Bulk Actions Bar

When one or more rows are checked via the checkbox column:
- A **bulk actions bar** appears above or overlaying the top of the table.
- Shows the count of selected records (e.g., "3 selected").
- Provides bulk action buttons relevant to the module:
  - **Cases**: Assign, Change Status, Export Selected, Delete
  - **Investigations**: Assign, Change Status, Merge, Export Selected, Delete
  - **Disclosures**: Assign, Change Category, Export Selected, Delete
  - **Intake Forms**: Assign, Change Status, Export Selected, Delete
  - **Policies**: Assign, Change Status, Publish, Archive, Export Selected, Delete

---

## 7. Board View (Alternative to Table View)

When the user toggles from "Table view" to "Board view":

- Records are displayed as **cards** arranged in **vertical columns/lanes**.
- Each lane represents a value of a configurable grouping property (typically Status or Stage).
- Cards show a summary of key fields (e.g., Name, Owner avatar, Priority badge, Date).
- Cards can be **dragged between lanes** to change their status/stage.
- The board respects the same filters applied in the current view.
- Column selection does not apply to board view (it uses a fixed card layout), but filters and sort do.

---

## 8. Data Persistence and API Requirements

### 8.1 Saved View Data Model

Each saved view should persist:

```typescript
interface SavedView {
  id: string;                          // UUID
  moduleType: string;                  // 'cases' | 'investigations' | 'disclosures' | 'intake_forms' | 'policies' | ...
  name: string;                        // User-provided view name
  createdBy: string;                   // User ID of creator
  visibility: 'private' | 'team' | 'everyone';  // Sharing scope
  teamId?: string;                     // If visibility is 'team', which team
  columns: SavedViewColumn[];          // Ordered list of selected columns
  frozenColumnCount: number;           // Number of left-frozen columns (0-3)
  filters: FilterGroup[];              // Advanced filter configuration
  quickFilters: QuickFilterConfig[];   // Active quick filters
  sort: { column: string; direction: 'asc' | 'desc' } | null;
  viewMode: 'table' | 'board';
  boardGroupBy?: string;              // Property to group by in board view
  tabOrder: number;                    // Position in tab bar for this user
  recordCount?: number;                // Cached count of matching records (for badge)
  createdAt: Date;
  updatedAt: Date;
}

interface SavedViewColumn {
  propertyId: string;                  // ID of the column/property
  width?: number;                      // Optional custom width in px
}

interface FilterGroup {
  id: string;
  conditions: FilterCondition[];       // AND-joined conditions within this group
}
// Groups are OR-joined with each other

interface FilterCondition {
  propertyId: string;
  operator: FilterOperator;
  value?: any;                         // Type depends on property type and operator
  secondaryValue?: any;               // For 'is between' operator
  unit?: 'day' | 'week' | 'month';   // For relative date operators
}

type FilterOperator =
  | 'is' | 'is_not'
  | 'contains' | 'does_not_contain'
  | 'starts_with' | 'ends_with'
  | 'is_equal_to' | 'is_not_equal_to'
  | 'is_greater_than' | 'is_greater_than_or_equal_to'
  | 'is_less_than' | 'is_less_than_or_equal_to'
  | 'is_between'
  | 'is_before' | 'is_after'
  | 'is_less_than_n_ago' | 'is_more_than_n_ago'
  | 'is_known' | 'is_unknown'
  | 'is_any_of' | 'is_none_of'
  | 'is_true' | 'is_false';
```

### 8.2 User Tab Configuration

Each user has a per-module configuration of which view tabs are pinned/open and in what order:

```typescript
interface UserViewTabs {
  userId: string;
  moduleType: string;
  pinnedViewIds: string[];  // Ordered list of view IDs shown as tabs
}
```

### 8.3 API Endpoints Needed

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/views` | GET | List views for a module (filtered by visibility/access) |
| `/api/views` | POST | Create a new saved view |
| `/api/views/:id` | GET | Get a single view configuration |
| `/api/views/:id` | PUT | Update a saved view |
| `/api/views/:id` | DELETE | Delete a saved view |
| `/api/views/:id/clone` | POST | Clone a saved view |
| `/api/views/tabs` | GET | Get user's pinned tab configuration for a module |
| `/api/views/tabs` | PUT | Update user's tab order/pinned tabs |
| `/api/[module]` | GET | Fetch records with filter/sort/pagination params |
| `/api/[module]/export` | POST | Export filtered records as Excel/CSV |
| `/api/[module]/bulk` | POST | Bulk actions on selected records |

---

## 9. Reusable Component Architecture

This system must be built as a **shared, reusable component library** — NOT duplicated per module. The architecture should follow this pattern:

```
components/
  views/
    ViewTabsBar.tsx           // Zone 1 — Tab management
    ViewToolbar.tsx            // Zone 2 — Search, buttons, actions
    QuickFiltersRow.tsx        // Zone 3 — Quick filter dropdowns
    ColumnSelectionModal.tsx   // Edit Columns popup
    AdvancedFiltersPanel.tsx   // Right slide-out filter panel
    FilterConditionRow.tsx     // Single filter condition within the panel
    PropertyPicker.tsx         // Searchable property selector (used in both column modal and filter panel)
    DataTable.tsx              // Zone 4 — Table with headers, sorting, selection, pagination
    BoardView.tsx              // Alternative board/kanban view
    BulkActionsBar.tsx         // Appears when rows are selected
    PaginationBar.tsx          // Page navigation
    SavedViewProvider.tsx      // React context for view state management

hooks/
  useSavedViews.ts            // CRUD operations for saved views
  useViewFilters.ts           // Filter state management
  useViewColumns.ts           // Column selection state
  useDataFetch.ts             // Data fetching with filter/sort/pagination
  useExport.ts                // Export functionality
```

Each module page (Cases, Investigations, etc.) should:
1. Define its **available properties/columns** (name, type, group) as a configuration object.
2. Define its **default views** (e.g., "All Cases", "My Cases", "Open Cases") as seed data.
3. Define its **quick filter defaults** (which properties appear in the quick filter row).
4. Define its **bulk actions** (what operations are available for selected records).
5. Define its **board view grouping options** (which status/stage fields can be used for board view lanes).
6. Render the shared view components, passing this configuration.

Example module usage:

```tsx
// pages/CasesPage.tsx
<SavedViewProvider moduleType="cases" config={casesViewConfig}>
  <ViewTabsBar />
  <ViewToolbar />
  <QuickFiltersRow />
  <DataTable />    {/* or <BoardView /> depending on viewMode */}
  <PaginationBar />
</SavedViewProvider>
```

---

## 10. Key UX Details and Edge Cases

1. **Unsaved changes indicator**: When a view has unsaved modifications, the tab name should show a visual indicator (e.g., a dot, italicized text, or subtle color change) and the Save button becomes enabled.

2. **Default views**: Each module should ship with pre-built default views (e.g., "All [Records]", "My [Records]", "Recently Created") that cannot be deleted but can be customized per user.

3. **Permission-based visibility**: Users should only see views they created (private), views shared with their team, or views shared with everyone. Admins can manage all views.

4. **Real-time filter application**: Advanced filters should apply to the data table in real-time as conditions are set (no separate "Apply" button needed in the filter panel — the table updates live behind the slide-out).

5. **Empty states**: When no records match the current filters, show a helpful empty state message: "No [records] match the current filters. Try adjusting your filters or clearing them."

6. **Column type formatting**: Each column type should have appropriate formatting:
   - Dates → localized date/time strings
   - Users → Avatar + name
   - Status/Enum → Colored badge/pill
   - Numbers → Formatted with commas/decimals as appropriate
   - Boolean → Check/cross icon or Yes/No text
   - Links/URLs → Clickable links
   - Long text → Truncated with tooltip on hover

7. **Responsive behavior**: On smaller screens, fewer columns should be visible (horizontal scroll), and the quick filters row may collapse into a "Filters" dropdown.

8. **Loading states**: Show skeleton rows while data is loading. Show a subtle loading indicator in the toolbar when filters are being applied.

9. **URL state**: The current view ID and any active filters should be reflected in the URL query parameters so views can be bookmarked and shared via link.

---

## 11. Reference Sources

This specification is modeled after HubSpot's CRM index page and saved views system. For additional reference:

- [HubSpot: Create and manage saved views](https://knowledge.hubspot.com/records/create-and-manage-saved-views)
- [HubSpot: View and filter records](https://knowledge.hubspot.com/records/view-and-filter-records)
- [HubSpot: Manage index page types and tabs](https://knowledge.hubspot.com/records/manage-index-page-types-and-tabs)
- [HubSpot: Set default index page views](https://knowledge.hubspot.com/object-settings/set-default-index-page-views)
