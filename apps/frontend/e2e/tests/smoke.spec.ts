import { test, expect, TEST_USERS } from '../fixtures/auth';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { CaseListPage } from '../pages/case-list.page';
import { CaseDetailPage } from '../pages/case-detail.page';

/**
 * E2E Smoke Test Suite
 *
 * Tests the complete user journey:
 * Login -> Dashboard -> Case List -> View Case -> Investigation -> Notes
 */
test.describe('Smoke Test: Full User Journey', () => {
  test.describe('Scenario 1: Login Flow', () => {
    test('should display login page correctly', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(loginPage.pageTitle).toBeVisible();
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('invalid@example.com', 'wrongpassword');

      await loginPage.expectError();
    });

    test('should login successfully and redirect to dashboard', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForDashboard(
        TEST_USERS.compliance.email,
        TEST_USERS.compliance.password
      );

      await expect(page).toHaveURL(/dashboard/);
    });

    test('should display user name in dashboard header', async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.expectLoaded();

      // User profile should show the logged in user's info
      const email = await dashboardPage.getUserEmail();
      expect(email).toBe(TEST_USERS.compliance.email);
    });
  });

  test.describe('Scenario 2: Dashboard Navigation', () => {
    test('should display dashboard with key metrics', async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.expectLoaded();

      // Check for metric cards
      await expect(dashboardPage.openCasesCard).toBeVisible();
      await expect(dashboardPage.profileSection).toBeVisible();
    });

    test('should navigate to cases from dashboard', async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.expectLoaded();
      await dashboardPage.navigateToCases();

      await expect(authenticatedPage).toHaveURL(/cases/);
    });

    test('should sign out successfully', async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.expectLoaded();
      await dashboardPage.signOut();

      await expect(authenticatedPage).toHaveURL(/login/);
    });
  });

  test.describe('Scenario 3: Case List & Navigation', () => {
    test('should display cases list page', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      await expect(caseListPage.pageTitle).toBeVisible();
      await expect(caseListPage.newCaseButton).toBeVisible();
      await expect(caseListPage.searchInput).toBeVisible();
    });

    test('should show total cases count', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Either shows cases or empty state
      const hasCases = await caseListPage.casesTable.isVisible();
      const isEmpty = await caseListPage.emptyState.isVisible();
      expect(hasCases || isEmpty).toBeTruthy();
    });

    test('should navigate to case detail when clicking a case', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount > 0) {
        await caseListPage.clickCaseByIndex(0);
        await expect(authenticatedPage).toHaveURL(/cases\/[a-f0-9-]+/);
      } else {
        // Skip test if no cases exist
        test.skip();
      }
    });

    test('should filter cases by status', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Filter by NEW status
      await caseListPage.filterByStatus('NEW');
      await caseListPage.expectLoaded();

      // Verify filter is applied (page should reload with filtered data)
      await expect(caseListPage.statusFilter).toBeVisible();
    });

    test('should search cases', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Perform a search
      await caseListPage.search('test');
      await caseListPage.expectLoaded();

      // Search input should contain the query
      await expect(caseListPage.searchInput).toHaveValue('test');
    });
  });

  test.describe('Scenario 4: Case Detail View', () => {
    test('should display case detail page with 3-column layout', async ({
      authenticatedPage,
    }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      // Check for key elements
      await expect(caseDetailPage.propertiesPanel).toBeVisible();
      await expect(caseDetailPage.activityTimeline).toBeVisible();
      await expect(caseDetailPage.investigationsPanel).toBeVisible();
    });

    test('should display reference number in ETH-YYYY-XXXXX format', async ({
      authenticatedPage,
    }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      const refNumber = await caseDetailPage.getReferenceNumber();
      expect(refNumber).toMatch(/ETH-\d{4}-\d{5}/);
    });
  });

  test.describe('Scenario 5: Investigation Management', () => {
    test('should display Create Investigation button', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      await expect(caseDetailPage.createInvestigationButton).toBeVisible();
    });

    test('should open Create Investigation dialog', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();
      await caseDetailPage.clickCreateInvestigation();

      // Dialog should be visible
      await expect(authenticatedPage.getByRole('dialog')).toBeVisible();
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Create Investigation' })
      ).toBeVisible();
    });
  });

  test.describe('Scenario 6: Complete Workflow', () => {
    test('should complete full case workflow: view case, open investigation panel', async ({
      authenticatedPage,
    }) => {
      // Step 1: Navigate to cases
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      // Step 2: Open first case
      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      // Step 3: Verify reference number format
      const refNumber = await caseDetailPage.getReferenceNumber();
      expect(refNumber).toMatch(/ETH-\d{4}-\d{5}/);

      // Step 4: Check for investigations panel
      await expect(caseDetailPage.investigationsPanel).toBeVisible();

      // Step 5: If there are investigations, open one
      const investigationCount = await caseDetailPage.getInvestigationCount();
      if (investigationCount > 0) {
        await caseDetailPage.openInvestigation(0);

        // Step 6: Switch to Notes tab
        await caseDetailPage.switchToTab('Notes');
        await expect(authenticatedPage.getByRole('tab', { name: 'Notes' })).toHaveAttribute(
          'data-state',
          'active'
        );

        // Step 7: Close the panel
        await caseDetailPage.closeInvestigationPanel();
      }

      // Workflow complete
    });
  });
});

test.describe('Error Handling', () => {
  test('should handle non-existent case gracefully', async ({ authenticatedPage }) => {
    const caseDetailPage = new CaseDetailPage(authenticatedPage);
    await caseDetailPage.goto('non-existent-uuid-1234');

    // Should show error or redirect
    const hasError = await authenticatedPage.locator('text=Case Not Found').isVisible();
    const hasAccessDenied = await authenticatedPage.locator('text=access').isVisible();

    expect(hasError || hasAccessDenied).toBeTruthy();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect from protected case page to login', async ({ page }) => {
    await page.goto('/cases');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});
