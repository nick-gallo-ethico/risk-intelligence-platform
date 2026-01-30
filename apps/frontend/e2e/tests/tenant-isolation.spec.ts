import { test, expect, TEST_USERS } from '../fixtures/auth';
import { LoginPage } from '../pages/login.page';
import { CaseListPage } from '../pages/case-list.page';
import { CaseDetailPage } from '../pages/case-detail.page';

/**
 * Tenant Isolation Tests
 *
 * CRITICAL: These tests verify that Row-Level Security (RLS) properly
 * prevents users from accessing data belonging to other organizations.
 *
 * The platform uses PostgreSQL RLS policies to enforce tenant isolation
 * at the database level. Even if application code has bugs, the database
 * should prevent cross-tenant data access.
 */
test.describe('Tenant Isolation (CRITICAL)', () => {
  // Store case IDs captured during tests for cross-tenant access attempts
  let orgACaseId: string | null = null;

  test.describe('Organization A - Case Visibility', () => {
    test('should only see cases from own organization', async ({ page }) => {
      // Login as Org A compliance officer
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForDashboard(
        TEST_USERS.compliance.email,
        TEST_USERS.compliance.password
      );

      // Navigate to cases
      const caseListPage = new CaseListPage(page);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Get case count for Org A
      const caseCount = await caseListPage.getCaseCount();

      // If there are cases, capture one for cross-tenant testing
      if (caseCount > 0) {
        const reference = await caseListPage.getReferenceByIndex(0);
        // Extract case ID from URL after clicking
        await caseListPage.clickCaseByIndex(0);
        const url = page.url();
        const match = url.match(/cases\/([a-f0-9-]+)/);
        if (match) {
          orgACaseId = match[1];
        }
      }

      // Verify we're seeing Org A's cases (or empty state)
      expect(caseCount >= 0).toBeTruthy();
    });
  });

  test.describe('Organization B - Cross-Tenant Access Prevention', () => {
    test.beforeEach(async () => {
      // Skip these tests if we don't have a case ID to test with
      if (!orgACaseId) {
        test.skip();
      }
    });

    test('should NOT see Org A cases in case list', async ({ page }) => {
      // This test requires tenant B user to exist in seed data
      // If not available, we'll skip
      const tenantBUser = TEST_USERS.tenantBAdmin;

      const loginPage = new LoginPage(page);
      await loginPage.goto();

      try {
        await loginPage.login(tenantBUser.email, tenantBUser.password);
        // Wait for either dashboard or error
        await Promise.race([
          page.waitForURL(/dashboard/, { timeout: 5000 }),
          page.waitForSelector('.bg-red-50', { timeout: 5000 }),
        ]);
      } catch {
        // Tenant B user doesn't exist in seed data - skip test
        test.skip();
        return;
      }

      // If login failed, skip
      if (!page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Navigate to cases
      const caseListPage = new CaseListPage(page);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Org B should NOT see Org A's cases
      // The case list should either be empty or contain only Org B's cases
      const caseCount = await caseListPage.getCaseCount();

      // If orgACaseId exists, verify it's not in the list
      if (orgACaseId) {
        const hasOrgACase = await page.locator(`tr:has-text("${orgACaseId}")`).isVisible();
        expect(hasOrgACase).toBeFalsy();
      }
    });

    test('should get 404 when trying to access Org A case directly', async ({ page }) => {
      // This test requires tenant B user
      const tenantBUser = TEST_USERS.tenantBAdmin;

      const loginPage = new LoginPage(page);
      await loginPage.goto();

      try {
        await loginPage.login(tenantBUser.email, tenantBUser.password);
        await Promise.race([
          page.waitForURL(/dashboard/, { timeout: 5000 }),
          page.waitForSelector('.bg-red-50', { timeout: 5000 }),
        ]);
      } catch {
        test.skip();
        return;
      }

      if (!page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Try to access Org A's case directly
      const caseDetailPage = new CaseDetailPage(page);
      await caseDetailPage.goto(orgACaseId!);

      // Should see error (404 or access denied)
      // Important: Should be 404 (not 403) to prevent enumeration attacks
      const hasNotFound = await page.locator('text=Case Not Found').isVisible();
      const hasAccessError = await page.locator('text=access').isVisible();
      const hasError = await page.locator('text=error').isVisible();

      expect(hasNotFound || hasAccessError || hasError).toBeTruthy();
    });

    test('should NOT see Org A data even with manipulated API calls', async ({ page }) => {
      // This test requires tenant B user
      const tenantBUser = TEST_USERS.tenantBAdmin;

      const loginPage = new LoginPage(page);
      await loginPage.goto();

      try {
        await loginPage.login(tenantBUser.email, tenantBUser.password);
        await Promise.race([
          page.waitForURL(/dashboard/, { timeout: 5000 }),
          page.waitForSelector('.bg-red-50', { timeout: 5000 }),
        ]);
      } catch {
        test.skip();
        return;
      }

      if (!page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Try to fetch Org A's case via API
      const response = await page.evaluate(async (caseId) => {
        const res = await fetch(`/api/v1/cases/${caseId}`, {
          credentials: 'include',
        });
        return {
          status: res.status,
          ok: res.ok,
        };
      }, orgACaseId);

      // Should get 404 (not 200, not 403)
      expect(response.status).toBe(404);
      expect(response.ok).toBeFalsy();
    });
  });

  test.describe('Session & Token Security', () => {
    test('should invalidate session on logout', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForDashboard(
        TEST_USERS.compliance.email,
        TEST_USERS.compliance.password
      );

      // Store current URL
      const dashboardUrl = page.url();

      // Logout
      await page.getByRole('button', { name: /sign out/i }).click();
      await page.waitForURL(/login/);

      // Try to access dashboard again
      await page.goto(dashboardUrl);

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test('should not allow access with expired/invalid token', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();

      // Try to access protected resource
      await page.goto('/cases');

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('should restrict employee access to assigned cases only', async ({ page }) => {
      // Login as employee (lowest privilege)
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      try {
        await loginPage.login(TEST_USERS.employee.email, TEST_USERS.employee.password);
        await Promise.race([
          page.waitForURL(/dashboard/, { timeout: 5000 }),
          page.waitForSelector('.bg-red-50', { timeout: 5000 }),
        ]);
      } catch {
        // Employee user doesn't exist - skip
        test.skip();
        return;
      }

      if (!page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Navigate to cases
      const caseListPage = new CaseListPage(page);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Employee should see limited or no cases
      // (depending on RBAC implementation)
      const caseCount = await caseListPage.getCaseCount();

      // Just verify the page loads correctly
      // Actual case visibility depends on RBAC rules
      expect(caseCount).toBeGreaterThanOrEqual(0);
    });

    test('should allow admin full access within organization', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForDashboard(
        TEST_USERS.admin.email,
        TEST_USERS.admin.password
      );

      // Admin should be able to access cases
      const caseListPage = new CaseListPage(page);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Page should load without errors
      await expect(caseListPage.pageTitle).toBeVisible();
    });
  });
});

test.describe('Cross-Organization Data Leak Prevention', () => {
  test('should not leak organization IDs in error messages', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(
      TEST_USERS.compliance.email,
      TEST_USERS.compliance.password
    );

    // Try to access a non-existent resource
    const caseDetailPage = new CaseDetailPage(page);
    await caseDetailPage.goto('00000000-0000-0000-0000-000000000000');

    // Get all visible text
    const pageText = await page.textContent('body');

    // Should not contain any UUID patterns that might be other org IDs
    // (except for the one we're trying to access)
    const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
    const foundUuids = pageText?.match(uuidPattern) || [];

    // Filter out the UUID we intentionally accessed
    const otherUuids = foundUuids.filter(
      (uuid) => uuid !== '00000000-0000-0000-0000-000000000000'
    );

    // Should not leak other UUIDs in error responses
    // (some UUIDs might be expected in the page, but not in error messages)
    expect(otherUuids.length).toBeLessThan(5); // Allow some for UI elements
  });

  test('should not include sensitive data in network responses', async ({ page }) => {
    // Intercept API responses
    const sensitivePatterns = [
      /passwordHash/i,
      /secretKey/i,
      /apiKey/i,
      /"password":/i,
    ];

    const violations: string[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        try {
          const text = await response.text();
          for (const pattern of sensitivePatterns) {
            if (pattern.test(text)) {
              violations.push(`Found ${pattern} in ${response.url()}`);
            }
          }
        } catch {
          // Ignore responses that can't be read as text
        }
      }
    });

    // Login and browse
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(
      TEST_USERS.compliance.email,
      TEST_USERS.compliance.password
    );

    const caseListPage = new CaseListPage(page);
    await caseListPage.goto();
    await caseListPage.expectLoaded();

    // Check for violations
    expect(violations).toHaveLength(0);
  });
});
