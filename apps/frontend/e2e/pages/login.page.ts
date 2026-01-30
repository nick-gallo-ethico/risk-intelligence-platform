import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Login page (/login)
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.errorMessage = page.locator('.bg-red-50');
    this.pageTitle = page.getByRole('heading', { name: 'Sign in' });
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/login');
    await expect(this.pageTitle).toBeVisible();
  }

  /**
   * Fill in login credentials and submit
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Perform login and wait for redirect to dashboard
   */
  async loginAndWaitForDashboard(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL(/dashboard/);
  }

  /**
   * Check if error message is visible
   */
  async expectError(message?: string) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }
}
