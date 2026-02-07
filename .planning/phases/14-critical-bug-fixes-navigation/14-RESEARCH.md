# Phase 14: Critical Bug Fixes & Navigation - Research

**Researched:** 2026-02-06
**Domain:** Next.js App Router navigation, UI bug fixes, frontend styling
**Confidence:** HIGH (direct codebase inspection)

## Summary

This phase addresses 11 specific bugs that make the application appear unfinished: broken routes (404s), non-functional UI elements, runtime errors, styling inconsistencies, and auth/session issues. All issues were verified through direct codebase inspection.

The application uses Next.js 14 App Router with a `(authenticated)` route group containing the main layout (sidebar + top nav). Most "broken route" issues fall into two categories: (1) links pointing to routes that don't have corresponding `page.tsx` files, and (2) the top nav using hardcoded mock data instead of auth context. The "Create Case" runtime error is a known Radix UI Select anti-pattern (empty string values). The styling issue (top nav color mismatch) is a straightforward CSS change.

**Primary recommendation:** Fix each issue individually. Most are 5-30 minute fixes. No new libraries needed -- all fixes use existing patterns already in the codebase.

## Standard Stack

No new libraries are needed. This phase uses existing stack:

### Core
| Library | Version | Purpose | Already Used |
|---------|---------|---------|--------------|
| Next.js 14 | App Router | Page routing, navigation | Yes |
| shadcn/ui | Radix-based | UI components (Select, DropdownMenu, etc.) | Yes |
| Tailwind CSS | 3.x | Styling | Yes |
| @tanstack/react-query | 5.x | Data fetching for notifications, tasks | Yes |
| react-hook-form + zod | Current | Form validation | Yes |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| lucide-react | Icons | Already used for all icons |
| date-fns | Date formatting | Already used in my-tasks |
| sonner | Toast notifications | Already used for form feedback |

## Architecture Patterns

### Routing Architecture (CRITICAL)

The app uses **Next.js 14 App Router** with route groups:

```
apps/frontend/src/app/
  (authenticated)/       # Route group -- applies sidebar + top nav layout
    layout.tsx           # AppSidebar + TopNav + MobileBottomNav + AiPanel
    dashboard/page.tsx   # /dashboard
    cases/page.tsx       # /cases
    cases/[id]/page.tsx  # /cases/:id
    cases/new/page.tsx   # /cases/new
    settings/page.tsx    # /settings
    settings/audit/page.tsx  # /settings/audit  <-- AUDIT LOG EXISTS HERE
    settings/users/page.tsx  # /settings/users
    ...
  login/page.tsx         # /login (no sidebar)
  ethics/[tenant]/...    # Public portal (no auth layout)
```

**Key Finding:** Routes are defined by `page.tsx` file placement. If a link points to `/foo` but there is no `app/(authenticated)/foo/page.tsx`, it will 404.

### Navigation Config Pattern

Navigation links are defined in `src/lib/navigation.ts`:
- `navigationItems[]` - Main sidebar links
- `adminItems[]` - Admin section (filtered by role)
- Links use `url` property that maps to App Router paths

### Auth Context Pattern

Auth state is provided via `AuthProvider` wrapping the entire app:
- `useAuth()` hook returns `{ user, login, logout, isAuthenticated }`
- User data stored in localStorage via `authStorage`
- `AuthUser` type: `{ id, email, firstName, lastName, role, organizationId }`

## Issue-by-Issue Analysis

### Issue 14.1: Audit Log 404

**Root Cause:** NOT a missing route. The audit log page exists at `app/(authenticated)/settings/audit/page.tsx`. The sidebar link in `navigation.ts` already points to `/settings/audit` (line 117).

**Actual Problem Investigation:** The sidebar `Audit Log` link is in the `adminItems` array with `url: '/settings/audit'` and `requiredRoles: ['SYSTEM_ADMIN', 'COMPLIANCE_OFFICER']`. The page EXISTS. Possible issues:
1. The `NavAdmin` component uses `useAuth()` to check `user.role` -- if demo user doesn't have correct role, the link won't appear
2. If the user navigates to `/audit-log` or `/audit` directly (not via sidebar), those routes don't exist

**Fix:** Verify the demo user has `SYSTEM_ADMIN` or `COMPLIANCE_OFFICER` role. The page and route ARE correctly wired. If users are navigating to a wrong URL (e.g., `/audit-log`), add a redirect or ensure all links point to `/settings/audit`.

**Confidence:** HIGH -- directly inspected `navigation.ts` line 117 and `settings/audit/page.tsx`

**Backend:** Audit API exists at `GET /api/v1/audit` (audit.controller.ts)

### Issue 14.2: Notifications "View All" 404

**Root Cause:** The "View all" link in top-nav.tsx (line 207) points to `/notifications`:
```tsx
<Link href="/notifications" className="text-xs text-primary hover:underline">
  View all
</Link>
```

**Problem:** There is NO `app/(authenticated)/notifications/page.tsx` file. This route does not exist.

**Fix:** Create `app/(authenticated)/notifications/page.tsx` that lists all notifications. Backend API exists: `GET /api/v1/notifications` (notifications.controller.ts).

**Confidence:** HIGH -- verified no notifications page exists via file listing

### Issue 14.3: Dashboard "View All Tasks" 404

**Root Cause:** In `my-tasks.tsx` (line 154), "View All" button navigates to `/my-work`:
```tsx
<Button variant="ghost" size="sm" onClick={() => router.push('/my-work')}>
  View All
</Button>
```

**Problem:** There is NO `app/(authenticated)/my-work/page.tsx` file. This route does not exist.

**Fix:** Create `app/(authenticated)/my-work/page.tsx` that shows the full task queue. Backend API exists: `GET /api/v1/my-work` (my-work.controller.ts in analytics module).

**Confidence:** HIGH -- verified no my-work page exists

### Issue 14.4: Dashboard "My Tasks" -- clicking a case goes to 404

**Root Cause:** In `my-tasks.tsx` (line 178), each task item navigates to `task.url`:
```tsx
onClick={() => router.push(task.url || '#')}
```

The `task.url` comes from the backend `GET /api/v1/my-work` response. The `UnifiedTask` entity builds URLs.

**Problem:** The `task.url` field in the API response may contain routes like `/cases/{id}` which DO exist, but if the backend returns incorrect/malformed URLs, they will 404. Need to inspect `task-aggregator.service.ts` to verify URL generation.

**Also applies to:** "My Active Cases" (`my-assignments.tsx` line 79) navigates to `/cases/${caseItem.id}` which DOES exist.

**Fix:** Verify backend generates correct URLs. The case detail route `/cases/[id]` exists. The issue may be that task URLs point to routes like `/investigations/:id` which also exist. The "clicking a case" in My Tasks might navigate to a non-case entity URL. Likely fine -- need to verify backend URL generation.

**Confidence:** MEDIUM -- need to check backend task-aggregator URL generation

### Issue 14.5: User menu links don't work

**Root Cause:** In `top-nav.tsx` (lines 275-291), the user dropdown has these links:
```tsx
<Link href="/profile">My Profile</Link>      // /profile -- NO PAGE EXISTS
<Link href="/my-work">My Tasks</Link>         // /my-work -- NO PAGE EXISTS
<Link href="/settings">Settings</Link>        // /settings -- PAGE EXISTS
```

The "Log out" button (line 294) has NO `onClick` handler -- it's just a `DropdownMenuItem` with no action:
```tsx
<DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
  <LogOut className="mr-2 h-4 w-4" />
  <span>Log out</span>
</DropdownMenuItem>
```

**Problem:**
1. `/profile` page does NOT exist
2. `/my-work` page does NOT exist (same as issue 14.3)
3. Log out button has no logout handler

**Fix:**
1. Create `/profile` page OR redirect to `/settings` (simpler)
2. Create `/my-work` page (same fix as 14.3)
3. Wire logout button to `useAuth().logout()` and redirect to `/login`

**Confidence:** HIGH -- directly inspected top-nav.tsx

### Issue 14.6: Search bar doesn't work

**Root Cause:** In `top-nav.tsx` (lines 84-91), search submits navigate to `/search`:
```tsx
const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  if (searchQuery.trim()) {
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    setSearchOpen(false);
    setSearchQuery('');
  }
};
```

**Problem:** There is NO `app/(authenticated)/search/page.tsx` file.

**Fix:** Create a search results page at `app/(authenticated)/search/page.tsx` that calls the backend search API (`GET /api/v1/search` or `GET /api/v1/search/unified`). Both endpoints exist in search.controller.ts.

**Confidence:** HIGH -- verified no search page exists

### Issue 14.7: Dashboard "Create Case" Select.Item error

**Root Cause:** In `basic-info-section.tsx` (lines 185, 212), there are two `SelectItem` components with empty string values:
```tsx
<SelectItem value="">None</SelectItem>
```

**Problem:** Radix UI Select does NOT allow empty string (`""`) as a value for `SelectItem`. This is a known Radix limitation -- `value` must be a non-empty string. When the component renders, it throws a runtime error.

**Affected locations:**
- Line 185: Primary Category `<SelectItem value="">None</SelectItem>`
- Line 212: Secondary Category `<SelectItem value="">None</SelectItem>`

**Fix:** Replace empty string values with a sentinel value like `"__none__"` or `"none"`, then handle the conversion in the form logic:
```tsx
<SelectItem value="__none__">None</SelectItem>
```
And in `onValueChange`:
```tsx
onValueChange={(value) => setValue('primaryCategoryId', value === '__none__' ? '' : value)}
```

**Confidence:** HIGH -- directly observed the code at basic-info-section.tsx:185 and :212

**NOTE:** The Quick Actions "Create Case" button (quick-actions.tsx line 20) navigates to `/cases/new` which EXISTS. The issue is in the form component, not in the navigation.

### Issue 14.8: Dashboard "My Active Cases" slow loading

**Root Cause:** In `dashboard/page.tsx` (lines 37-41), the dashboard fetches ALL cases with limit=100:
```tsx
const response = await casesApi.list({
  limit: 100,
  sortBy: 'createdAt',
  sortOrder: 'desc',
});
```

The `MyAssignments` component then filters these client-side (my-assignments.tsx lines 22-31). The `StatsCards` component also uses all 100 cases for calculations.

**Problem:** Loading 100 cases is slow, especially with the full case payload. The `MyAssignments` component only shows 5 items but requires loading all 100 first.

**Fix:** Either:
1. Reduce limit to 25 and adjust UI accordingly
2. Split into separate API calls -- one for stats (dedicated endpoint), one for recent (limit 5), one for assignments
3. Add a dedicated dashboard summary endpoint on the backend

The simplest fix: reduce `limit` to 25, which still provides enough data for stats while loading faster.

**Confidence:** HIGH -- directly inspected the fetch logic

### Issue 14.9: User name doesn't change with different logins

**Root Cause:** In `top-nav.tsx` (lines 59-65), the user data is HARDCODED as mock data:
```tsx
// Mock user data - in real app, this would come from auth context
const user = {
  name: 'Sarah Chen',
  email: 'sarah.chen@acmecorp.com',
  role: 'Chief Compliance Officer',
  avatar: null,
};
```

This never reads from the actual auth context. The comment even says "in real app, this would come from auth context."

**Fix:** Replace the hardcoded mock with `useAuth()`:
```tsx
const { user } = useAuth();
```
Then update references from `user.name` to `${user.firstName} ${user.lastName}`, from `user.email` to `user.email`, and from `user.role` to a display-friendly format.

**Confidence:** HIGH -- directly observed the mock data at top-nav.tsx:59-65

### Issue 14.10: Logo "E" should be the Ethico E

**Root Cause:** The sidebar logo in `app-sidebar.tsx` (lines 35-37) is a plain text "E" in a blue box:
```tsx
<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
  <span className="font-bold text-sm">E</span>
</div>
```

And the top nav brand in `top-nav.tsx` (line 113) is just text:
```tsx
<span className="text-primary">Ethico</span>
```

**Available Assets:** The `/public` directory has proper Ethico SVG files:
- `ethico-icon.svg` -- An "E" icon with gradient (purple-to-teal triangle with white cutout bars)
- `ethico-logo-dark.svg` -- Full logo for dark backgrounds
- `ethico-logo-light.svg` -- Full logo for light backgrounds

**Fix:** Replace the hardcoded text "E" div with an `<img>` or `<Image>` component using `/ethico-icon.svg`. Use `ethico-logo-dark.svg` or `ethico-logo-light.svg` for the full logo where appropriate.

**Confidence:** HIGH -- verified SVG assets exist in public directory

### Issue 14.11: Top nav bar should be same color as side nav (both dark)

**Root Cause:** The top nav in `top-nav.tsx` (line 103) has a light/transparent background:
```tsx
<header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
```

The sidebar uses CSS variables `--sidebar-background: 0 0% 98%` (light mode) which is a light gray. In dark mode, it's `--sidebar-background: 240 5.9% 10%` (very dark).

**Problem:** The top nav uses `bg-background` (white in light mode) while the sidebar uses `bg-sidebar` (light gray in light mode). They need to match with "both dark" styling.

**Fix:** Change the top nav `<header>` to use a dark background matching the Ethico navy color (`--ethico-navy: 227 36% 13%`). This means:
1. Update the top nav background class to use a dark color (e.g., `bg-[hsl(var(--ethico-navy))]` or the primary color)
2. Update all text/icon colors within the top nav to use light colors (white/light gray)
3. Ensure the sidebar background also matches (update `--sidebar-background` if needed)

Alternatively, if both should use the dark navy theme: set both sidebar and top nav to use `hsl(var(--primary))` or the ethico-navy variable.

**Confidence:** HIGH -- directly inspected styling values

## Missing Routes Summary

Routes that are linked-to but don't have `page.tsx` files:

| Linked Route | Linked From | Fix |
|---|---|---|
| `/notifications` | Top nav "View All" | Create page using `GET /api/v1/notifications` |
| `/my-work` | Dashboard "View All Tasks", User dropdown "My Tasks", Top nav "Go to My Tasks" | Create page using `GET /api/v1/my-work` |
| `/search` | Top nav search form submit | Create page using `GET /api/v1/search/unified` |
| `/profile` | User dropdown "My Profile" | Create page OR redirect to `/settings` |

Routes that DO exist and are correctly wired:
- `/settings/audit` -- Audit log page EXISTS
- `/cases/new` -- Case creation page EXISTS
- `/cases/[id]` -- Case detail page EXISTS
- `/settings` -- Settings page EXISTS
- `/cases` -- Cases list page EXISTS

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Select with "None" option | Custom uncontrolled Select | Radix Select with sentinel value `"__none__"` | Radix doesn't allow empty string values -- use a marker value |
| Notifications list | Custom fetch logic | `useQuery` + `api.get('/notifications')` | Follows existing patterns (see my-tasks.tsx) |
| Search results page | Build from scratch | Copy pattern from `cases/page.tsx` for list display | Consistent UX, reuse existing table/card components |
| User display name | New state management | `useAuth()` hook already provides `user.firstName` + `user.lastName` | AuthProvider already wired in providers.tsx |

## Common Pitfalls

### Pitfall 1: Radix Select Empty String Values
**What goes wrong:** `<SelectItem value="">` throws a runtime error in Radix UI Select
**Why it happens:** Radix requires non-empty string values for Select items
**How to avoid:** Use a sentinel value like `"__none__"` and convert back to empty string in the handler
**Warning signs:** Console error about "A <Select.Item /> must have a value prop that is not an empty string"

### Pitfall 2: Hardcoded Mock Data in Production Components
**What goes wrong:** UI shows static data regardless of actual state (e.g., user name "Sarah Chen")
**Why it happens:** Mock data was added during development and never replaced with real data sources
**How to avoid:** Search for `// Mock` or `// TODO` comments and replace with actual data sources
**Warning signs:** Comments like "in real app, this would come from..." or "Mock data"

### Pitfall 3: Creating Pages Outside the Route Group
**What goes wrong:** New page renders without the sidebar/top nav layout
**Why it happens:** Page file placed in `app/` instead of `app/(authenticated)/`
**How to avoid:** ALL authenticated pages must go in `app/(authenticated)/` to get the layout
**Warning signs:** Page loads but shows no navigation chrome

### Pitfall 4: User Dropdown Logout Without Auth Context
**What goes wrong:** Logout button doesn't actually log the user out
**Why it happens:** DropdownMenuItem doesn't have onClick handler wired to auth context
**How to avoid:** Import `useAuth()` and call `logout()` in onClick
**Warning signs:** Clicking "Log out" does nothing or just closes the dropdown

### Pitfall 5: TopNav Theme Transition Inconsistency
**What goes wrong:** Changing top nav to dark background breaks text readability
**Why it happens:** Child components (search, notifications) use foreground colors that assume light bg
**How to avoid:** When changing the nav background, also update all text/icon colors to light variants
**Warning signs:** Dark text on dark background, invisible icons

## Code Examples

### Pattern 1: Creating a New Authenticated Page
```typescript
// Source: Verified from existing app/(authenticated)/cases/page.tsx pattern
// File: app/(authenticated)/notifications/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
// ... component imports

export default function NotificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications', {
        params: { limit: 50 },
      });
      return response.data;
    },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      {/* Notification list */}
    </div>
  );
}
```

### Pattern 2: Fixing SelectItem Empty String
```typescript
// Source: Radix UI Select documentation - value must be non-empty string
// File: components/cases/form-sections/basic-info-section.tsx

// BEFORE (broken):
<SelectItem value="">None</SelectItem>

// AFTER (fixed):
<SelectItem value="__none__">None</SelectItem>

// And in the handler:
onValueChange={(value) => setValue('primaryCategoryId', value === '__none__' ? '' : value)}

// And for displaying:
value={primaryCategoryId === '' ? '__none__' : (primaryCategoryId ?? '__none__')}
```

### Pattern 3: Replacing Mock User Data with Auth Context
```typescript
// Source: Verified from existing auth-context.tsx and nav-admin.tsx patterns
// File: components/layout/top-nav.tsx

// BEFORE (broken):
const user = {
  name: 'Sarah Chen',
  email: 'sarah.chen@acmecorp.com',
  role: 'Chief Compliance Officer',
  avatar: null,
};

// AFTER (fixed):
import { useAuth } from '@/contexts/auth-context';

const { user, logout } = useAuth();

// Display name:
const displayName = user ? `${user.firstName} ${user.lastName}` : '';
const displayRole = user?.role?.replace(/_/g, ' ') ?? '';
const displayEmail = user?.email ?? '';
```

### Pattern 4: Wiring Logout Button
```typescript
// Source: Verified from existing auth-context.tsx
// File: components/layout/top-nav.tsx

// BEFORE (broken):
<DropdownMenuItem className="cursor-pointer text-destructive">
  <LogOut className="mr-2 h-4 w-4" />
  <span>Log out</span>
</DropdownMenuItem>

// AFTER (fixed):
<DropdownMenuItem
  className="cursor-pointer text-destructive"
  onClick={async () => {
    await logout();
    router.push('/login');
  }}
>
  <LogOut className="mr-2 h-4 w-4" />
  <span>Log out</span>
</DropdownMenuItem>
```

### Pattern 5: Using Ethico Logo SVG
```typescript
// Source: Verified assets exist in public/ directory
// File: components/layout/app-sidebar.tsx

// BEFORE:
<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
  <span className="font-bold text-sm">E</span>
</div>

// AFTER:
import Image from 'next/image';

<Image
  src="/ethico-icon.svg"
  alt="Ethico"
  width={32}
  height={32}
  className="rounded-lg"
/>
```

### Pattern 6: Dark Top Nav Styling
```typescript
// Source: globals.css CSS variables
// File: components/layout/top-nav.tsx

// BEFORE (light background):
<header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">

// AFTER (dark background matching sidebar):
<header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[hsl(227,36%,13%)] text-white">
// Then update all child elements to use light-colored text/icons
```

## State of the Art

| Old Approach | Current Approach | Impact |
|---|---|---|
| Mock data in components | Auth context for user info | User data reflects actual logged-in user |
| `<SelectItem value="">` | Sentinel value pattern | Prevents Radix UI runtime errors |
| Separate light/dark nav bars | Unified dark nav theme | Professional, cohesive look |
| Loading 100 cases on dashboard | Paginated/limited queries | Faster dashboard load |

## Open Questions

1. **Issue 14.1 Clarification:**
   - What we know: `/settings/audit` page and link both exist correctly
   - What's unclear: Is the actual bug that users are clicking a DIFFERENT link that goes to `/audit-log` or `/audit` (not `/settings/audit`)? Or is the demo user missing the required role?
   - Recommendation: Test with demo user credentials to verify. Check if there's another link to audit outside the admin sidebar. May need to verify demo seed data assigns correct role.

2. **Issue 14.4 Backend URL Generation:**
   - What we know: Frontend navigates to `task.url` from API response
   - What's unclear: Exact URLs the backend generates for each task type
   - Recommendation: Inspect `task-aggregator.service.ts` entity URL building, or run the app and check network responses

3. **Issue 14.8 Root Cause Verification:**
   - What we know: Dashboard fetches 100 cases at once
   - What's unclear: Whether the slowness is from the API call size or frontend rendering
   - Recommendation: Check if the backend cases list endpoint has slow queries. May need both frontend limit reduction AND backend query optimization.

4. **Issue 14.11 Scope of Dark Nav:**
   - What we know: Top nav needs to match sidebar color
   - What's unclear: Should this be the Ethico navy (`hsl(227, 36%, 13%)`) or the current sidebar color (`--sidebar-background: 0 0% 98%`)? The requirement says "both dark"
   - Recommendation: Make BOTH dark using the Ethico navy color. This requires updating both `--sidebar-background` CSS variable and the top nav background class.

## File Location Map

Key files for each fix:

| Issue | Primary File(s) | Backend |
|---|---|---|
| 14.1 | `lib/navigation.ts`, `settings/audit/page.tsx` (both already correct) | `audit.controller.ts` |
| 14.2 | **CREATE** `(authenticated)/notifications/page.tsx` | `notifications.controller.ts` |
| 14.3 | **CREATE** `(authenticated)/my-work/page.tsx` | `my-work.controller.ts` |
| 14.4 | `components/dashboard/my-tasks.tsx`, backend `task-aggregator.service.ts` | `my-work.controller.ts` |
| 14.5 | `components/layout/top-nav.tsx` (lines 275-297) | N/A |
| 14.6 | **CREATE** `(authenticated)/search/page.tsx` | `search.controller.ts` |
| 14.7 | `components/cases/form-sections/basic-info-section.tsx` (lines 185, 212) | N/A |
| 14.8 | `(authenticated)/dashboard/page.tsx` (line 38) | Possibly `cases.controller.ts` |
| 14.9 | `components/layout/top-nav.tsx` (lines 59-65) | N/A |
| 14.10 | `components/layout/app-sidebar.tsx` (lines 35-37), `top-nav.tsx` (line 113) | N/A |
| 14.11 | `components/layout/top-nav.tsx` (line 103), `app/globals.css` | N/A |

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all files listed above
- `apps/frontend/src/app/(authenticated)/` -- route structure verified via file system listing
- `apps/frontend/src/components/layout/top-nav.tsx` -- full file read, all links and mock data inspected
- `apps/frontend/src/components/layout/app-sidebar.tsx` -- logo implementation confirmed
- `apps/frontend/src/lib/navigation.ts` -- all navigation URLs verified
- `apps/frontend/src/contexts/auth-context.tsx` -- auth flow verified
- `apps/frontend/src/components/cases/form-sections/basic-info-section.tsx` -- SelectItem empty string confirmed at lines 185, 212
- `apps/frontend/src/components/dashboard/my-tasks.tsx` -- View All link and task click handler verified
- `apps/frontend/src/components/dashboard/my-assignments.tsx` -- case navigation pattern verified
- `apps/backend/src/modules/audit/audit.controller.ts` -- API endpoint confirmed
- `apps/backend/src/modules/notifications/controllers/notifications.controller.ts` -- API endpoint confirmed
- `apps/backend/src/modules/search/search.controller.ts` -- API endpoint confirmed
- `apps/backend/src/modules/analytics/my-work/my-work.controller.ts` -- API endpoint confirmed

### Secondary (MEDIUM confidence)
- Radix UI Select empty string restriction -- well-known behavior, verified by observing the component is `@radix-ui/react-select` in select.tsx

## Metadata

**Confidence breakdown:**
- Route analysis: HIGH -- direct file system inspection
- Component bugs: HIGH -- direct source code reading
- Styling fixes: HIGH -- CSS variables and class names verified
- Backend API availability: HIGH -- controllers directly inspected
- Performance issues: MEDIUM -- root cause hypothesis, needs runtime verification

**Research date:** 2026-02-06
**Valid until:** 2026-03-08 (stable -- codebase-specific findings, no external dependencies)
