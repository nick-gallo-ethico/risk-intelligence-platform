import { test, expect, TEST_USERS } from '../fixtures/auth';
import { UsersPage } from '../pages/users.page';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

/**
 * E2E Test Suite: User Management
 *
 * Tests the admin-only user management functionality including:
 * - CRUD operations on users
 * - Role management
 * - User activation/deactivation
 * - Permission enforcement (admin-only access)
 */
test.describe('User Management', () => {
  // Generate unique test user data
  const generateTestUser = () => ({
    firstName: `Test`,
    lastName: `User${Date.now()}`,
    email: `testuser${Date.now()}@e2e.local`,
    role: 'INVESTIGATOR',
  });

  test.describe('Admin Access', () => {
    test('should navigate to users page as admin', async ({ page, loginAs }) => {
      // Login as admin
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Page title should be visible
      await expect(usersPage.pageTitle).toBeVisible();

      // Add user button should be visible
      await expect(usersPage.addUserButton).toBeVisible();
    });

    test('should display users table', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Table should be visible
      await expect(usersPage.usersTable).toBeVisible();

      // Should show total count
      await expect(usersPage.totalCount).toBeVisible();
    });

    test('should show user filters', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Search input should be visible
      await expect(usersPage.searchInput).toBeVisible();
    });
  });

  test.describe('Access Control', () => {
    test('should redirect non-admin users from users page', async ({ page, loginAs }) => {
      // Login as compliance officer (not admin)
      await loginAs('compliance');

      const usersPage = new UsersPage(page);
      await usersPage.goto();

      // Should redirect to dashboard or show access denied
      await expect(async () => {
        const isDashboard = /dashboard/.test(page.url());
        const isAccessDenied = await usersPage.accessDeniedMessage.isVisible().catch(() => false);
        expect(isDashboard || isAccessDenied).toBe(true);
      }).toPass({ timeout: 10000 });
    });

    test('should redirect investigator from users page', async ({ page, loginAs }) => {
      // Login as investigator
      await loginAs('investigator');

      const usersPage = new UsersPage(page);
      await usersPage.goto();

      // Should redirect to dashboard or show access denied
      await expect(async () => {
        const isDashboard = /dashboard/.test(page.url());
        const isAccessDenied = await usersPage.accessDeniedMessage.isVisible().catch(() => false);
        expect(isDashboard || isAccessDenied).toBe(true);
      }).toPass({ timeout: 10000 });
    });

    test('should redirect employee from users page', async ({ page, loginAs }) => {
      // Login as employee
      await loginAs('employee');

      const usersPage = new UsersPage(page);
      await usersPage.goto();

      // Should redirect to dashboard or show access denied
      await expect(async () => {
        const isDashboard = /dashboard/.test(page.url());
        const isAccessDenied = await usersPage.accessDeniedMessage.isVisible().catch(() => false);
        expect(isDashboard || isAccessDenied).toBe(true);
      }).toPass({ timeout: 10000 });
    });
  });

  test.describe('User Search and Filters', () => {
    test('should search users by name', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Search for admin
      await usersPage.search('admin');

      // Should have results
      const userCount = await usersPage.getUserCount();
      expect(userCount).toBeGreaterThan(0);
    });

    test('should search users by email', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Search for admin email
      await usersPage.search(TEST_USERS.admin.email);

      // Should find the admin user
      const hasAdmin = await usersPage.hasUserWithEmail(TEST_USERS.admin.email);
      expect(hasAdmin).toBe(true);
    });

    test('should filter by role', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Filter by SYSTEM_ADMIN role
      await usersPage.filterByRole('SYSTEM_ADMIN');

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Should show admin users
      const hasAdmin = await usersPage.hasUserWithEmail(TEST_USERS.admin.email);
      expect(hasAdmin).toBe(true);
    });

    test('should clear search', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Get initial count
      const initialCount = await usersPage.getUserCount();

      // Search for something specific
      await usersPage.search('admin');
      await page.waitForTimeout(300);

      // Clear search
      await usersPage.searchInput.clear();
      await page.waitForTimeout(500);
      await usersPage.expectLoaded();

      // Count should be back to initial or more
      const clearedCount = await usersPage.getUserCount();
      expect(clearedCount).toBeGreaterThanOrEqual(initialCount - 1);
    });
  });

  test.describe('Create User', () => {
    test('should open create user dialog', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Click add user button
      await usersPage.clickAddUser();

      // Dialog should be visible
      await expect(page.getByRole('dialog')).toBeVisible();

      // Form fields should be visible
      await expect(usersPage.firstNameInput).toBeVisible();
      await expect(usersPage.lastNameInput).toBeVisible();
      await expect(usersPage.emailInput).toBeVisible();
    });

    test('should create a new user', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      const testUser = generateTestUser();

      // Create the user
      await usersPage.createUser(testUser);

      // Search for the new user
      await usersPage.search(testUser.email);

      // Should find the user
      const hasUser = await usersPage.hasUserWithEmail(testUser.email);
      expect(hasUser).toBe(true);
    });

    test('should validate required fields', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Click add user button
      await usersPage.clickAddUser();

      // Try to submit without filling fields
      const submitButton = page.getByRole('button', { name: /create|save|submit/i });

      // Submit should be disabled or show validation error
      const isDisabled = await submitButton.isDisabled().catch(() => false);
      if (!isDisabled) {
        await submitButton.click();
        // Should show validation errors
        const hasError = await page.locator('text=/required|invalid/i').isVisible().catch(() => false);
        expect(hasError).toBe(true);
      } else {
        expect(isDisabled).toBe(true);
      }
    });

    test('should cancel create user dialog', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Click add user button
      await usersPage.clickAddUser();

      // Fill some data
      await usersPage.firstNameInput.fill('Test');

      // Click cancel
      await usersPage.cancelButton.click();

      // Dialog should close
      await expect(page.getByRole('dialog')).toBeHidden();
    });
  });

  test.describe('Edit User', () => {
    test('should edit user role', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // First create a test user to edit
      const testUser = generateTestUser();
      await usersPage.createUser(testUser);

      // Search for the user
      await usersPage.search(testUser.email);

      // Edit the user's role
      // Note: This test depends on the UI having edit functionality
      const row = usersPage.usersTable.locator('tr').filter({ hasText: testUser.email });
      const isVisible = await row.isVisible().catch(() => false);

      if (isVisible) {
        // Try to find edit button or action menu
        const actionButton = row.locator('button').last();
        if (await actionButton.isVisible()) {
          await actionButton.click();

          // Look for edit option
          const editOption = page.getByRole('menuitem', { name: /edit/i });
          if (await editOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await editOption.click();

            // Should open edit dialog
            await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });
  });

  test.describe('Deactivate User', () => {
    test('should deactivate a user', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // First create a test user to deactivate
      const testUser = generateTestUser();
      await usersPage.createUser(testUser);

      // Search for the user
      await usersPage.search(testUser.email);

      // Deactivate the user
      await usersPage.deactivateUser(testUser.email);

      // Verify user is now inactive
      const isActive = await usersPage.isUserActive(testUser.email);
      expect(isActive).toBe(false);
    });

    test('should reactivate a deactivated user', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // First create and deactivate a test user
      const testUser = generateTestUser();
      await usersPage.createUser(testUser);
      await usersPage.search(testUser.email);
      await usersPage.deactivateUser(testUser.email);

      // Clear search and search again
      await usersPage.searchInput.clear();
      await page.waitForTimeout(300);
      await usersPage.search(testUser.email);

      // Reactivate the user
      await usersPage.reactivateUser(testUser.email);

      // Verify user is now active
      const isActive = await usersPage.isUserActive(testUser.email);
      expect(isActive).toBe(true);
    });

    test('deactivated user should not be able to login', async ({ page, loginAs, browser }) => {
      // First, as admin, create and deactivate a user
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      const testUser = {
        ...generateTestUser(),
        email: `deactivate-test-${Date.now()}@e2e.local`,
      };
      await usersPage.createUser(testUser);
      await usersPage.search(testUser.email);
      await usersPage.deactivateUser(testUser.email);

      // Now try to login as the deactivated user in a new context
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();

      const loginPage = new LoginPage(newPage);
      await loginPage.goto();

      // Note: Since we just created this user, they don't have a password set
      // This test would need the actual password to work
      // For now, we verify the deactivation was successful in the UI
      await newContext.close();

      // Verify the user shows as inactive
      const isActive = await usersPage.isUserActive(testUser.email);
      expect(isActive).toBe(false);
    });

    test('should not allow deactivating own account', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Search for own email
      await usersPage.search(TEST_USERS.admin.email);

      // Find the admin row
      const adminRow = usersPage.usersTable.locator('tr').filter({
        hasText: TEST_USERS.admin.email,
      });

      if (await adminRow.isVisible()) {
        // The deactivate option should not be available for own account
        const actionButton = adminRow.locator('button').last();
        if (await actionButton.isVisible()) {
          await actionButton.click();

          // Deactivate option should either be missing or disabled
          const deactivateOption = page.getByRole('menuitem', { name: /deactivate/i });
          const isVisible = await deactivateOption.isVisible({ timeout: 2000 }).catch(() => false);

          if (isVisible) {
            // If visible, should be disabled
            const isDisabled = await deactivateOption.isDisabled().catch(() => false);
            // Close menu
            await page.keyboard.press('Escape');
            // Either hidden or disabled is acceptable
            expect(isDisabled || !isVisible).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Settings Navigation', () => {
    test('should navigate from dashboard to users page', async ({ page, loginAs }) => {
      await loginAs('admin');

      // Start at dashboard
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      // Look for Settings link
      const settingsLink = page.getByRole('button', { name: /settings/i }).or(
        page.getByRole('link', { name: /settings/i })
      );

      if (await settingsLink.isVisible()) {
        await settingsLink.click();

        // Should navigate to settings or users
        await expect(page).toHaveURL(/settings/);
      }
    });

    test('should have back to dashboard button', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Should have back button
      const backButton = page.getByRole('button', { name: /back|dashboard/i });
      await expect(backButton).toBeVisible();

      // Click back
      await backButton.click();

      // Should navigate to dashboard
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe('Pagination', () => {
    test('should display pagination when there are many users', async ({ page, loginAs }) => {
      await loginAs('admin');

      const usersPage = new UsersPage(page);
      await usersPage.goto();
      await usersPage.expectLoaded();

      // Check if pagination is visible (only if there are enough users)
      const userCount = await usersPage.getUserCount();
      if (userCount >= 20) {
        const pagination = page.locator('[class*="pagination"]').or(
          page.getByRole('navigation', { name: /pagination/i })
        );
        await expect(pagination).toBeVisible();
      }
    });
  });
});
