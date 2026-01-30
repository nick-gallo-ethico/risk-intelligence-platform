import { test as base, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

/**
 * Test credentials for different user roles.
 * These should match the seed data in the backend.
 */
export const TEST_USERS = {
  // Acme Corp users (Organization A)
  admin: {
    email: 'admin@acme.local',
    password: 'Password123!',
    role: 'SYSTEM_ADMIN',
    org: 'Acme Corp',
  },
  compliance: {
    email: 'compliance@acme.local',
    password: 'Password123!',
    role: 'COMPLIANCE_OFFICER',
    org: 'Acme Corp',
  },
  investigator: {
    email: 'investigator@acme.local',
    password: 'Password123!',
    role: 'INVESTIGATOR',
    org: 'Acme Corp',
  },
  employee: {
    email: 'employee@acme.local',
    password: 'Password123!',
    role: 'EMPLOYEE',
    org: 'Acme Corp',
  },
  // Tenant B users (for tenant isolation tests)
  tenantBAdmin: {
    email: 'admin@beta.local',
    password: 'Password123!',
    role: 'SYSTEM_ADMIN',
    org: 'Beta Corp',
  },
} as const;

/**
 * Extended fixture types
 */
type AuthFixtures = {
  /** A page authenticated as compliance officer */
  authenticatedPage: Page;
  /** Login helper function */
  loginAs: (user: keyof typeof TEST_USERS) => Promise<void>;
};

/**
 * Extended test with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
  /**
   * Provides a page that is already logged in as compliance officer
   */
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(
      TEST_USERS.compliance.email,
      TEST_USERS.compliance.password
    );
    await use(page);
  },

  /**
   * Provides a helper function to login as different users
   */
  loginAs: async ({ page }, use) => {
    const loginFn = async (userKey: keyof typeof TEST_USERS) => {
      const user = TEST_USERS[userKey];
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForDashboard(user.email, user.password);
    };
    await use(loginFn);
  },
});

export { expect } from '@playwright/test';
export type { Page } from '@playwright/test';
