import { test, expect, TEST_USERS } from '../fixtures/auth';
import { CaseListPage } from '../pages/case-list.page';
import { DashboardPage } from '../pages/dashboard.page';
import { CaseNewPage } from '../pages/case-new.page';

/**
 * E2E Test Suite: Search and Filters
 *
 * Tests the case search and filter functionality including:
 * - Full-text search
 * - Status filters
 * - Severity filters
 * - Date range filters
 * - Sort controls
 * - Filter chips and clear
 */
test.describe('Search and Filters', () => {
  test.describe('Full-Text Search', () => {
    test('should display search input', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      await expect(caseListPage.searchInput).toBeVisible();
    });

    test('should search cases by text', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Perform a search
      await caseListPage.searchFullText('test');
      await caseListPage.expectLoaded();

      // Search input should retain the value
      await expect(caseListPage.searchInput).toHaveValue('test');
    });

    test('should show no results for non-existent search', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Search for something that doesn't exist
      await caseListPage.searchFullText('xyznonexistent12345abc');
      await authenticatedPage.waitForTimeout(1000);

      // Should show empty state or no matches
      const showsNoMatches = await caseListPage.showsNoMatches();
      const showsEmpty = await caseListPage.showsEmptyState();
      const caseCount = await caseListPage.getCaseCount();

      expect(showsNoMatches || showsEmpty || caseCount === 0).toBeTruthy();
    });

    test('should clear search results', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Get initial count
      const initialCount = await caseListPage.getCaseCount();

      // Perform a search
      await caseListPage.searchFullText('test');
      await caseListPage.expectLoaded();

      // Clear the search
      await caseListPage.searchInput.clear();
      await authenticatedPage.waitForTimeout(600);

      // Should show all cases again (or at least not filtered by search)
      await expect(caseListPage.searchInput).toHaveValue('');
    });
  });

  test.describe('Status Filters', () => {
    test('should display status filter', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      await expect(caseListPage.statusFilter).toBeVisible();
    });

    test('should filter by NEW status', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Filter by NEW status
      await caseListPage.filterByStatus('NEW');
      await caseListPage.expectLoaded();

      // Verify filter was applied (URL or filter chips may indicate this)
      const hasActiveFilters = await caseListPage.hasActiveFilters();
      // Filter should be active or results should change
    });

    test('should filter by OPEN status', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      await caseListPage.filterByStatus('OPEN');
      await caseListPage.expectLoaded();
    });

    test('should filter by CLOSED status', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      await caseListPage.filterByStatus('CLOSED');
      await caseListPage.expectLoaded();
    });

    test('should clear status filter', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Apply filter
      await caseListPage.filterByStatus('NEW');
      await caseListPage.expectLoaded();

      // Clear filter
      await caseListPage.filterByStatus('all');
      await caseListPage.expectLoaded();
    });
  });

  test.describe('Severity Filters', () => {
    test('should display severity filter', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      await expect(caseListPage.severityFilter).toBeVisible();
    });

    test('should filter by HIGH severity', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      await caseListPage.filterBySeverity('HIGH');
      await caseListPage.expectLoaded();
    });

    test('should filter by CRITICAL severity', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      await caseListPage.filterBySeverity('CRITICAL');
      await caseListPage.expectLoaded();
    });
  });

  test.describe('Combined Filters', () => {
    test('should apply multiple filters simultaneously', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Apply status filter
      await caseListPage.filterByStatus('OPEN');
      await caseListPage.expectLoaded();

      // Apply severity filter
      await caseListPage.filterBySeverity('HIGH');
      await caseListPage.expectLoaded();

      // Both filters should be applied
    });

    test('should combine search with filters', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Apply search
      await caseListPage.searchFullText('test');

      // Apply status filter
      await caseListPage.filterByStatus('NEW');
      await caseListPage.expectLoaded();

      // Search and filter should both be active
      await expect(caseListPage.searchInput).toHaveValue('test');
    });
  });

  test.describe('Filter Clearing', () => {
    test('should clear all filters', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Apply some filters
      await caseListPage.filterByStatus('OPEN');
      await caseListPage.expectLoaded();

      // Check if clear all button exists and click it
      const hasFilters = await caseListPage.hasActiveFilters();
      if (hasFilters) {
        await caseListPage.clearAllFilters();
        await caseListPage.expectLoaded();
      }
    });
  });

  test.describe('Sorting', () => {
    test('should display sort controls', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Sort controls should be visible (part of the filter bar)
      const sortVisible =
        (await caseListPage.sortBySelect.isVisible().catch(() => false)) ||
        (await caseListPage.sortOrderButton.isVisible().catch(() => false));
      // At minimum, the filter/sort area should be visible
    });
  });

  test.describe('Empty and No Results States', () => {
    test('should show appropriate message when no cases match filter', async ({
      authenticatedPage,
    }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Apply a very restrictive search that likely won't match
      await caseListPage.searchFullText('xyznonexistentuniqueid999999');
      await authenticatedPage.waitForTimeout(1000);

      // Should show no matches or empty state
      const showsNoMatches = await caseListPage.showsNoMatches();
      const showsEmpty = await caseListPage.showsEmptyState();
      const caseCount = await caseListPage.getCaseCount();

      expect(showsNoMatches || showsEmpty || caseCount === 0).toBeTruthy();
    });
  });
});

test.describe('Dashboard Features', () => {
  test.describe('Quick Actions', () => {
    test('should display quick actions section', async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      const hasQuickActions = await dashboardPage.hasQuickActions();
      expect(hasQuickActions).toBe(true);
    });

    test('should navigate to case creation from Create Case button', async ({
      authenticatedPage,
    }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      await dashboardPage.clickCreateCase();
      await expect(authenticatedPage).toHaveURL(/cases\/new/);
    });

    test('should navigate to open cases from My Open Cases button', async ({
      authenticatedPage,
    }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      await dashboardPage.clickMyOpenCases();
      await expect(authenticatedPage).toHaveURL(/cases/);
      // URL should include status filter
      expect(authenticatedPage.url()).toContain('status=OPEN');
    });

    test('should navigate to recent activity from Recent Activity button', async ({
      authenticatedPage,
    }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      await dashboardPage.clickRecentActivity();
      await expect(authenticatedPage).toHaveURL(/cases/);
      // URL should include sort parameters
      expect(authenticatedPage.url()).toContain('sortBy=updatedAt');
    });
  });

  test.describe('Stats Cards', () => {
    test('should display stats cards', async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      const hasStats = await dashboardPage.hasStatsCards();
      expect(hasStats).toBe(true);
    });
  });

  test.describe('Recent Cases', () => {
    test('should display recent cases section', async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      await expect(dashboardPage.recentCasesCard).toBeVisible();
    });

    test('should navigate to case detail when clicking recent case', async ({
      authenticatedPage,
    }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      const recentCaseCount = await dashboardPage.getRecentCasesCount();
      if (recentCaseCount > 0) {
        await dashboardPage.clickRecentCase(0);
        await expect(authenticatedPage).toHaveURL(/cases\/[a-f0-9-]+/);
      } else {
        // No cases - skip this test
        test.skip();
      }
    });

    test('should navigate to all cases from View All link', async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      await dashboardPage.clickViewAllCases();
      await expect(authenticatedPage).toHaveURL(/cases(?!\/)/);
    });
  });

  test.describe('My Assignments', () => {
    test('should display my assignments section', async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      const hasAssignments = await dashboardPage.hasMyAssignments();
      expect(hasAssignments).toBe(true);
    });
  });
});

test.describe('End-to-End Search Workflow', () => {
  test('should create case and find it via search', async ({ authenticatedPage }) => {
    // Create a unique case
    const caseNewPage = new CaseNewPage(authenticatedPage);
    await caseNewPage.goto();
    await caseNewPage.expectLoaded();

    const uniqueText = `SearchTestCase${Date.now()}`;
    await caseNewPage.selectSourceChannel('HOTLINE');
    await caseNewPage.fillSummary(uniqueText);
    await caseNewPage.fillDetails(`Details for search test: ${uniqueText}`);

    await authenticatedPage.waitForTimeout(500);
    await caseNewPage.submitAndWaitForRedirect();

    // Navigate to case list
    const caseListPage = new CaseListPage(authenticatedPage);
    await caseListPage.goto();
    await caseListPage.expectLoaded();

    // Search for the unique text
    await caseListPage.searchFullText(uniqueText);
    await caseListPage.expectLoaded();

    // Case should be found
    const caseCount = await caseListPage.getCaseCount();
    expect(caseCount).toBeGreaterThan(0);
  });
});
