---
phase: 08-portals
plan: 13
subsystem: employee-portal-frontend
tags: [employee-portal, dashboard, role-aware-tabs, tasks, team-management]
dependency-graph:
  requires: ["08-06"]
  provides: ["EmployeeDashboard", "MyTasksTab", "MyTeamTab", "TaskCard", "useEmployeeProfile"]
  affects: ["09-attestation-ui", "09-disclosure-ui"]
tech-stack:
  added: []
  patterns: ["role-conditional-rendering", "tab-navigation-via-url", "csv-export", "compliance-scoring"]
key-files:
  created:
    - apps/frontend/src/app/employee/layout.tsx
    - apps/frontend/src/app/employee/page.tsx
    - apps/frontend/src/components/employee/employee-header.tsx
    - apps/frontend/src/components/employee/employee-dashboard.tsx
    - apps/frontend/src/components/employee/dashboard-tabs.tsx
    - apps/frontend/src/components/employee/task-card.tsx
    - apps/frontend/src/components/employee/my-tasks-tab.tsx
    - apps/frontend/src/components/employee/team-member-row.tsx
    - apps/frontend/src/components/employee/my-team-tab.tsx
    - apps/frontend/src/hooks/useEmployeeProfile.ts
    - apps/frontend/src/contexts/employee-context.tsx
    - apps/frontend/src/hooks/useAuthenticatedCategories.ts
  modified:
    - apps/frontend/src/components/employee/team-member-selector.tsx
    - apps/frontend/src/components/employee/proxy-report-form.tsx
decisions: ["context-extraction-for-nextjs", "auth-categories-hook"]
metrics:
  duration: "35 min"
  completed: "2026-02-04"
---

# Phase 8 Plan 13: Employee Portal Dashboard Summary

**One-liner:** Employee self-service dashboard with role-aware tabs, task cards with due dates/overdue indicators, and manager team compliance view with bulk reminders.

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create Employee Portal layout with authentication | debc2df | layout.tsx, employee-header.tsx, useEmployeeProfile.ts, employee-context.tsx |
| 2 | Create dashboard with role-aware tabs | 4d12785* | page.tsx, employee-dashboard.tsx, dashboard-tabs.tsx, my-tasks-tab.tsx (stub), my-team-tab.tsx (stub) |
| 3 | Create My Tasks and My Team tab content | 75a6086 | task-card.tsx, my-tasks-tab.tsx, team-member-row.tsx, my-team-tab.tsx |

*Note: Task 2 files were committed in parallel with plan 09-07

## What Was Built

### Employee Portal Layout (layout.tsx)

- **Authentication guard** - Redirects unauthenticated users to `/login?returnUrl=/employee`
- **EmployeeProvider** - Context for sharing employee profile data
- **SidebarNav** (desktop) - Fixed sidebar with Dashboard, Tasks, History, Policies links
- **BottomNav** (mobile) - Fixed bottom navigation bar with icons
- **Badge counts** - Pending task count displayed on Tasks nav item

### Employee Header (employee-header.tsx)

- User avatar with initials fallback
- Department/role display
- Notification bell (placeholder for future notifications)
- Quick action dropdown: Report Issue, Settings, Logout
- Mobile hamburger menu toggle

### Employee Dashboard (employee-dashboard.tsx)

- Personalized welcome message with time-of-day greeting
- **Stats cards row:**
  - Pending Tasks count
  - Overdue Tasks (red styling if > 0)
  - Due This Week
  - Compliance Score with progress bar
- DashboardTabs component for role-aware navigation
- Tab content area renders selected tab component

### Dashboard Tabs (dashboard-tabs.tsx)

- **My Tasks** - Always shown, default tab, badge with pending count
- **My Team** - Only visible if `isManager = true`, badge with needs-attention count
- **My History** - Placeholder for future history views
- **Policies** - Placeholder for policy acknowledgment

### Task Card (task-card.tsx)

- Task type icon (attestation, disclosure, approval, follow-up, remediation)
- Title and description
- Due date with relative time ("Due in 2 days", "Overdue by 3 days")
- Status badge (PENDING, OVERDUE, IN_PROGRESS, COMPLETED)
- Action button (Complete, View, Respond, etc.)
- Overdue styling: red border, warning icon, destructive button variant
- Click navigates to task action URL (Phase 9 completion UIs)

### My Tasks Tab (my-tasks-tab.tsx)

- **Sub-tabs:** Pending, Overdue, Completed with badge counts
- **Filter dropdown:** Attestations, Disclosures, Approvals, Follow-ups, Remediation
- **Sort options:** Due Date, Type, Date Created
- Active filter chips with click-to-remove
- Empty states for each sub-tab
- Pagination with "Load more" button

### Team Member Row (team-member-row.tsx)

- Avatar, name, job title, department
- Compliance score with color-coded progress bar (green/amber/red)
- Status icon and badge (Compliant, Pending, Overdue)
- Expandable section showing pending items
- Send Reminder button for members needing attention

### My Team Tab (my-team-tab.tsx)

- **Summary stats cards:** Total Members, Compliant, Pending, Overdue
- Search input for filtering by name, email, department
- "Remind All" bulk action for members needing attention
- "Export CSV" button for team compliance report
- Team member list using TeamMemberRow component

### useEmployeeProfile Hook

- Combines data from `/api/v1/employee/overview`, `/api/v1/employee/tasks/counts`, `/api/v1/employee/team`
- Returns: profile (name, email, isManager, pendingTaskCount, overdueTaskCount, complianceScore)
- 5-minute stale time for caching
- Determines isManager from team endpoint (has direct reports)

## Decisions Made

### Context Extraction for Next.js (context-extraction-for-nextjs)

**Decision:** Extract EmployeeContext to separate file `@/contexts/employee-context.tsx`

**Rationale:** Next.js App Router performs strict type checking on layout exports. Exporting `useEmployee` hook from layout.tsx caused type errors: "Property 'useEmployee' is incompatible with index signature."

**Implementation:** Created dedicated EmployeeProvider component, imported in layout.tsx and child pages use `useEmployee()` from the context file.

### Authenticated Categories Hook (auth-categories-hook)

**Decision:** Create separate `useAuthenticatedCategories` hook distinct from `useTenantCategories`

**Rationale:** `useTenantCategories` requires a tenantSlug parameter for public API access. Employee Portal uses authenticated endpoints that don't need tenant slug.

**Implementation:** New hook fetches from `/api/v1/categories` using authenticated apiClient.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed lint error in team-member-selector.tsx**
- **Found during:** Task 1 verification
- **Issue:** Unescaped quotes in JSX ("don't" and `"searchQuery"`)
- **Fix:** Replaced with `&apos;` and `&quot;` entities
- **Commit:** debc2df

**2. [Rule 3 - Blocking] Fixed useTenantCategories import error**
- **Found during:** Task 2 verification
- **Issue:** proxy-report-form.tsx called `useTenantCategories()` without required tenantSlug argument
- **Fix:** Created `useAuthenticatedCategories` hook for Employee Portal
- **Files created:** apps/frontend/src/hooks/useAuthenticatedCategories.ts
- **Commit:** Part of Task 2 parallel commit

**3. [Rule 3 - Blocking] Fixed Next.js layout export type error**
- **Found during:** Task 2 verification
- **Issue:** Exporting `useEmployee` from layout.tsx violated Next.js App Router type constraints
- **Fix:** Extracted EmployeeContext to separate contexts file
- **Files created:** apps/frontend/src/contexts/employee-context.tsx
- **Commit:** Part of Task 2 parallel commit

## Technical Patterns Established

1. **Role-conditional rendering** - `isManager` flag determines My Team tab visibility
2. **Tab navigation via URL** - `?tab=tasks` query param synced with tab state
3. **Compliance scoring UI** - Color-coded progress bars (green >= 80%, amber >= 50%, red < 50%)
4. **CSV export pattern** - Client-side Blob generation for team compliance export
5. **Task type iconography** - Consistent icon mapping for all task types

## Files Summary

```
apps/frontend/src/
  app/employee/
    layout.tsx              # 229 lines - auth guard, nav, context provider
    page.tsx                # 211 lines - dashboard page with tab routing
  components/employee/
    employee-header.tsx     # 195 lines - header with dropdown
    employee-dashboard.tsx  # 189 lines - stats cards, tabs container
    dashboard-tabs.tsx      # 100 lines - role-aware tab list
    task-card.tsx           # 230 lines - single task display
    my-tasks-tab.tsx        # 363 lines - tasks list with filters
    team-member-row.tsx     # 200 lines - team member with compliance
    my-team-tab.tsx         # 365 lines - team management tab
  contexts/
    employee-context.tsx    # 45 lines - employee profile context
  hooks/
    useEmployeeProfile.ts   # 170 lines - profile data hook
    useAuthenticatedCategories.ts # 100 lines - authenticated categories
```

## Next Phase Readiness

Ready for:
- Phase 9 Attestation UI - TaskCard action buttons will link to attestation completion flow
- Phase 9 Disclosure UI - TaskCard action buttons will link to disclosure completion flow
- History tab implementation - uses existing /api/v1/employee/reports, /disclosures, /attestations endpoints
- Policies tab implementation - requires policy list and acknowledgment endpoints

## Testing Notes

- Employee Portal requires authentication - redirects to /login if not authenticated
- My Team tab only renders for users where `/api/v1/employee/team` returns non-empty array
- Task counts come from `/api/v1/employee/tasks/counts` endpoint (implemented in 08-06)
- CSV export generates client-side, no backend endpoint needed
