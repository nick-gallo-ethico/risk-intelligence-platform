---
status: resolved
trigger: "Investigate why typing in the search box causes all table contents to disappear instead of filtering."
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Seeded cases have null search_vector because createMany bypasses triggers
test: Verify this is the root cause
expecting: All seeded cases have null search_vector, so ANY search returns 0 results
next_action: Confirm root cause and provide fix

## Symptoms

expected: Typing in search box should filter table rows to show only matching results
actual: Typing in search box causes all table contents to disappear
errors: None reported yet
reproduction:
1. Navigate to a view with a data table (e.g., Cases page)
2. Type text into the search box
3. All table rows disappear instead of filtering
started: Unknown - existing issue

## Eliminated

## Evidence

- timestamp: 2026-02-08T00:05:00Z
  checked: DataTable.tsx
  found: DataTable component does NOT contain search input - only renders table, bulk actions, pagination
  implication: Search input must be in parent component or ViewTabsBar

- timestamp: 2026-02-08T00:06:00Z
  checked: useCasesView.ts (lines 120-146)
  found: Query params correctly built with searchQuery: `if (searchQuery) { params.search = searchQuery; }`
  implication: Search parameter IS being sent to API correctly

- timestamp: 2026-02-08T00:07:00Z
  checked: SavedViewProvider.tsx (line 249)
  found: Search reducer action resets page to 1: `case "SET_SEARCH": return { ...state, searchQuery: action.query, page: 1 };`
  implication: Search changes are being tracked in state correctly

- timestamp: 2026-02-08T00:10:00Z
  checked: ViewToolbar.tsx (lines 53-63)
  found: Search input uses local state with 300ms debounce, then calls setSearchQuery
  implication: Search flow is correct: input -> debounce -> state update -> API call

- timestamp: 2026-02-08T00:12:00Z
  checked: cases.controller.ts (line 104)
  found: Controller accepts CaseQueryDto with optional search parameter
  implication: Backend endpoint correctly accepts search parameter

- timestamp: 2026-02-08T00:15:00Z
  checked: cases.service.ts (lines 136-138, 194-308)
  found: Backend has full-text search implementation using PostgreSQL tsvector. When search query provided, uses `findAllWithFullTextSearch()` method
  implication: Backend code looks correct - searches on search_vector column

- timestamp: 2026-02-08T00:18:00Z
  checked: migration 20260130150000_add_case_search_vector/migration.sql
  found: Migration creates search_vector column, GIN index, trigger function, and populates existing rows
  implication: Database schema is correct, BUT seed data created AFTER migration should auto-populate via trigger

- timestamp: 2026-02-08T00:22:00Z
  checked: case.seeder.ts (line 653)
  found: Seeder uses `prisma.case.createMany()` to insert case records
  implication: CRITICAL BUG - `createMany` bypasses PostgreSQL triggers, so search_vector is never populated!

- timestamp: 2026-02-08T00:23:00Z
  checked: PostgreSQL documentation
  found: Bulk insert operations (INSERT with multiple rows, COPY) do NOT fire row-level triggers in PostgreSQL
  implication: This is the root cause - all seeded cases have null search_vector, causing search to return 0 results

## Resolution

root_cause: Seeded cases have null `search_vector` because `prisma.case.createMany()` bypasses PostgreSQL row-level triggers. The migration created a trigger `cases_search_trigger` that auto-populates `search_vector` on INSERT/UPDATE, but Prisma's `createMany` uses bulk INSERT which skips triggers. When frontend sends search query, backend's full-text search returns 0 results (WHERE search_vector @@ tsquery returns no rows when search_vector is null), causing empty table.

fix: Two-part fix required:
1. IMMEDIATE: Run UPDATE query to populate search_vector for all existing seeded cases
2. LONG-TERM: Modify case.seeder.ts to either:
   - Option A: Use individual `create()` calls instead of `createMany()` (slower but triggers work)
   - Option B: Add explicit UPDATE statement after `createMany()` to populate search_vector
   - Option C: Compute search_vector in seeder and include in createMany data (best performance)

verification: After applying fix, search should return matching cases instead of empty results
files_changed: []
