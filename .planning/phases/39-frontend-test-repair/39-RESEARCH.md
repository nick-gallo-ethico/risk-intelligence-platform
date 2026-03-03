# Phase 39: Frontend Test Repair - Research

**Researched:** 2026-02-19
**Domain:** Frontend testing - React Testing Library + Vitest - test repair after component refactoring
**Confidence:** HIGH (tests executed, component code examined, failure patterns catalogued)

## Summary

Phase 39 addresses **56 frontend test failures** (not 50 as originally estimated) across **8 test files** in `apps/frontend/src/components/cases/__tests__/`. These failures are caused by Phase 25.1's HubSpot-style case detail page refactoring, which changed:

1. **Component architecture** - New `useActivities` hook uses React Query, requiring `QueryClientProvider` wrapper in tests
2. **CSS class names** - Migration from hardcoded Tailwind classes (`text-gray-500`, `bg-gray-100`, `hover:bg-gray-50`) to semantic tokens (`text-muted-foreground`, `bg-muted`, `hover:bg-muted/50`)
3. **Component structure** - Changed icon rotation classes (`rotate-180` -> `rotate-90`), skeleton element counts, and DOM selectors
4. **Mock patterns** - Tests mock `@/components/ui/toaster` but component imports from `sonner`

The failures break down into **4 distinct categories** with well-defined fix patterns. Most fixes are mechanical - update selectors and class assertions, wrap renders in QueryClientProvider.

**Primary recommendation:** Create a test utility wrapper (`renderWithProviders`) for QueryClient + other providers, then systematically update each test file following the failure category patterns.

---

## Failure Analysis

### Test Execution Results

| File                                 | Tests | Passed | Failed | Primary Failure Category                 |
| ------------------------------------ | ----- | ------ | ------ | ---------------------------------------- |
| case-activity-timeline.test.tsx      | 27    | 4      | 23     | Missing QueryClientProvider              |
| case-properties-panel.test.tsx       | 20    | 5      | 15     | Missing QueryClientProvider + CSS tokens |
| case-investigations-panel.test.tsx   | 18    | 3      | 15     | Missing QueryClientProvider + mock path  |
| create-investigation-dialog.test.tsx | 17    | 14     | 3      | Mock path mismatch                       |
| case-header.test.tsx                 | 17    | 16     | 1      | CSS token migration                      |
| activity-filters.test.tsx            | 14    | 12     | 2      | CSS token migration                      |
| property-section.test.tsx            | 10    | 8      | 2      | CSS token + icon rotation                |
| editable-field.test.tsx              | 18    | 18     | 0      | N/A                                      |
| activity-entry.test.tsx              | 23    | 23     | 0      | N/A                                      |
| investigation-card.test.tsx          | 21    | 21     | 0      | N/A                                      |

**Total: 56 failures across 8 files**

---

## Failure Categories

### Category 1: Missing QueryClientProvider (38 failures)

**Affected files:**

- `case-activity-timeline.test.tsx` (23 failures)
- `case-properties-panel.test.tsx` (10 failures)
- `case-investigations-panel.test.tsx` (5 failures)

**What changed:**
Phase 25.1 introduced `useActivities` hook that uses `@tanstack/react-query`. The component now requires a `QueryClient` context.

**Error message:**

```
Error: No QueryClient set, use QueryClientProvider to set one
```

**Fix pattern:**
Create a test utility wrapper:

```typescript
// src/test/renderWithProviders.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement, ReactNode } from 'react';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

interface WrapperProps {
  children: ReactNode;
}

function AllTheProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}
```

Then replace `render()` with `renderWithProviders()` in affected tests.

### Category 2: CSS Token Migration (9 failures)

**Affected files:**

- `activity-filters.test.tsx` (2 failures)
- `property-section.test.tsx` (1 failure)
- `case-header.test.tsx` (1 failure)
- `case-properties-panel.test.tsx` (5 failures - partial)

**What changed:**
Phase 25.1 migrated hardcoded Tailwind color classes to semantic CSS tokens for dark mode support.

**Mapping:**

| Old Class          | New Class               |
| ------------------ | ----------------------- |
| `text-gray-500`    | `text-muted-foreground` |
| `bg-gray-100`      | `bg-muted`              |
| `text-gray-600`    | `text-muted-foreground` |
| `hover:bg-gray-50` | `hover:bg-muted/50`     |
| `bg-white`         | `bg-card`               |
| `border-gray-200`  | `border-border`         |

**Fix pattern:**
Update assertions to use semantic token classes:

```typescript
// Before
expect(inactiveTab).toHaveClass("text-gray-500");

// After
expect(inactiveTab).toHaveClass("text-muted-foreground");
```

### Category 3: Component Structure Changes (4 failures)

**Affected files:**

- `property-section.test.tsx` (1 failure - chevron rotation)
- `case-activity-timeline.test.tsx` (2 failures - skeleton structure)
- `case-header.test.tsx` (1 failure - skeleton structure)

**What changed:**

1. **Chevron icon rotation:** Changed from `rotate-180` (expanded) to `rotate-90` (expanded).

2. **Skeleton element structure:** Phase 25.1 refactored skeleton components:
   - `CaseActivityTimelineSkeleton` no longer has `.bg-gray-50.border-b` action bar
   - Action bar skeleton count changed
   - Filter tab skeleton structure changed

**Fix pattern - Chevron:**

```typescript
// Before
expect(chevron).toHaveClass("rotate-180");

// After
expect(chevron).toHaveClass("rotate-90");
```

**Fix pattern - Skeletons:**
Update selectors to match new DOM structure, or update expected element counts.

### Category 4: Mock Path Mismatch (3 failures)

**Affected files:**

- `create-investigation-dialog.test.tsx` (3 failures)
- `case-investigations-panel.test.tsx` (partial)

**What changed:**
Tests mock `@/components/ui/toaster` but components import from `sonner`.

**Fix pattern:**

```typescript
// Before
vi.mock("@/components/ui/toaster", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// After
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
```

---

## Standard Stack

### Core Testing Libraries (Already in Place)

| Library                     | Version | Purpose                     | Notes               |
| --------------------------- | ------- | --------------------------- | ------------------- |
| vitest                      | 1.6.1   | Test runner                 | Already configured  |
| @testing-library/react      | 14.x    | React component testing     | Already configured  |
| @testing-library/user-event | 14.x    | User interaction simulation | Already configured  |
| @testing-library/jest-dom   | 6.x     | DOM matchers                | Already in setup.ts |
| msw                         | 2.x     | API mocking                 | Already configured  |

### New Test Utilities Needed

| Utility                  | Purpose                              | Location                           |
| ------------------------ | ------------------------------------ | ---------------------------------- |
| `renderWithProviders`    | Wrap renders with QueryClient        | `src/test/renderWithProviders.tsx` |
| Test QueryClient factory | Create isolated QueryClient per test | Same file                          |

**No new dependencies required.** All fixes use existing libraries.

---

## Architecture Patterns

### Test File Structure

Each test file follows this pattern:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from '../component-name';

// Mocks
vi.mock('@/lib/api', () => ({ ... }));
vi.mock('sonner', () => ({ ... }));  // Note: sonner, not @/components/ui/toaster

// Mock data
const mockData = { ... };

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test case', () => {
    // For components using React Query:
    renderWithProviders(<ComponentName />);
    // For simple components:
    render(<ComponentName />);
  });
});
```

### Provider Wrapper Pattern

For components requiring context providers:

```typescript
import { renderWithProviders } from '@/test/renderWithProviders';

// In tests
renderWithProviders(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);
```

### Anti-Patterns to Avoid

- **Testing CSS classes directly:** Prefer testing behavior/accessibility over class names when possible
- **Hardcoded color assertions:** Use semantic tokens in assertions
- **Tightly coupled selectors:** Use `data-testid` or accessible roles instead of CSS class selectors

---

## Don't Hand-Roll

| Problem                  | Don't Build                           | Use Instead                      | Why                      |
| ------------------------ | ------------------------------------- | -------------------------------- | ------------------------ |
| QueryClient test wrapper | Custom QueryClient per test           | Factory function + wrapper       | Ensures proper isolation |
| Provider hierarchy       | Multiple wrapper components           | Single `AllTheProviders` wrapper | Consistent, maintainable |
| Mock patterns            | Different mocking approaches per file | Standardized mock utilities      | Reduces test flakiness   |

---

## Common Pitfalls

### Pitfall 1: QueryClient Cache Pollution

**What goes wrong:** Tests pass individually but fail when run together because QueryClient caches responses.
**Why it happens:** Reusing the same QueryClient instance across tests.
**How to avoid:** Create a new QueryClient for each test:

```typescript
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
```

**Warning signs:** Tests pass with `--run` flag but fail in watch mode.

### Pitfall 2: Async State Not Settled

**What goes wrong:** Tests fail intermittently because component state hasn't settled.
**Why it happens:** Not waiting for async operations to complete.
**How to avoid:** Always use `waitFor` for async assertions:

```typescript
await waitFor(() => {
  expect(screen.getByText("Expected text")).toBeInTheDocument();
});
```

### Pitfall 3: Deleting Test Functionality

**What goes wrong:** Tests pass because assertions were removed rather than updated.
**Why it happens:** Taking shortcuts during repair.
**How to avoid:** Each test must maintain its original intent. Update selectors/assertions to match new component APIs, don't remove them.

---

## Code Examples

### Example 1: Wrapping Render with QueryClient

```typescript
// src/test/renderWithProviders.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement, ReactNode } from 'react';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

function AllTheProviders({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export everything from RTL for convenience
export * from '@testing-library/react';
```

### Example 2: Updating CSS Token Assertions

```typescript
// Before - hardcoded colors
expect(badge).toHaveClass("bg-gray-100", "text-gray-600");

// After - semantic tokens
expect(badge).toHaveClass("bg-muted", "text-muted-foreground");
```

### Example 3: Correcting Mock Path

```typescript
// Before - wrong import path
vi.mock("@/components/ui/toaster", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// After - correct import path (matches component import)
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
```

---

## Task Breakdown Recommendation

Based on the failure categories, the phase should be split into 4-5 plans:

### Plan 1: Test Infrastructure (30 min)

- Create `src/test/renderWithProviders.tsx`
- Add QueryClient wrapper and factory
- Export utility for use in test files

### Plan 2: Fix CaseActivityTimeline Tests (2 hours)

- 23 failures to fix
- Replace `render` with `renderWithProviders`
- Update skeleton structure assertions
- Update mock imports

### Plan 3: Fix CasePropertiesPanel + CaseInvestigationsPanel Tests (1.5 hours)

- 25 failures combined
- Replace `render` with `renderWithProviders`
- Update mock import paths
- Update CSS token assertions

### Plan 4: Fix Remaining Test Files (1 hour)

- activity-filters.test.tsx (2 failures)
- property-section.test.tsx (2 failures)
- case-header.test.tsx (1 failure)
- create-investigation-dialog.test.tsx (3 failures)
- CSS token updates
- Chevron rotation fix
- Mock path corrections

### Plan 5: Verification + Cleanup (30 min)

- Run full test suite
- Verify all 56 failures are fixed
- Ensure no test functionality was removed
- Update any test snapshots if applicable

**Total estimated: 5-6 hours**

---

## Open Questions

1. **Should tests use semantic tokens or skip class assertions entirely?**
   - What we know: Theme system uses semantic tokens; hardcoded colors are deprecated
   - Recommendation: Update to semantic tokens. Testing for `text-muted-foreground` is still valid as it verifies correct styling is applied.

2. **Should skeleton tests be updated or removed?**
   - What we know: Skeleton structure changed significantly in Phase 25.1
   - Recommendation: Update skeleton tests to match new structure. Skeleton tests verify loading states work correctly - don't remove.

---

## Sources

### Primary (HIGH confidence)

- Test execution output (actual failure messages and stack traces)
- Current component implementations (examined `activity-filters.tsx`, `case-header.tsx`, `property-section.tsx`)
- Phase 25.1 RESEARCH.md and VERIFICATION.md (detailed component changes documented)
- `src/test/setup.ts` (test infrastructure configuration)

### Secondary (MEDIUM confidence)

- v1.2 Milestone Audit (failure count estimate of 50, actual is 56)

## Metadata

**Confidence breakdown:**

- Failure analysis: HIGH - Tests executed, errors catalogued
- Fix patterns: HIGH - Standard React Testing Library + React Query patterns
- Task estimates: MEDIUM - Depends on additional hidden issues

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable domain, no framework changes expected)
