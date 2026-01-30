import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Dashboard page (/dashboard)
 */
export class DashboardPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly welcomeMessage: Locator;
  readonly userName: Locator;
  readonly casesButton: Locator;
  readonly signOutButton: Locator;
  readonly openCasesCard: Locator;
  readonly profileSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: 'Dashboard' });
    this.welcomeMessage = page.locator('text=Welcome back');
    this.userName = page.locator('header').locator('text=/[A-Z][a-z]+ [A-Z][a-z]+/');
    this.casesButton = page.getByRole('button', { name: 'Cases' });
    this.signOutButton = page.getByRole('button', { name: /sign out/i });
    this.openCasesCard = page.locator('text=Open Cases').locator('..');
    this.profileSection = page.locator('text=Your Profile').locator('..');
  }

  /**
   * Navigate to the dashboard page
   */
  async goto() {
    await this.page.goto('/dashboard');
  }

  /**
   * Wait for dashboard to be fully loaded
   */
  async expectLoaded() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.welcomeMessage).toBeVisible();
  }

  /**
   * Navigate to cases page via header button
   */
  async navigateToCases() {
    await this.casesButton.click();
    await this.page.waitForURL(/cases/);
  }

  /**
   * Sign out from the dashboard
   */
  async signOut() {
    await this.signOutButton.click();
    await this.page.waitForURL(/login/);
  }

  /**
   * Get the displayed user email from profile
   */
  async getUserEmail(): Promise<string> {
    const emailLocator = this.profileSection.locator('dd').first();
    return await emailLocator.textContent() || '';
  }

  /**
   * Get the displayed user role from profile
   */
  async getUserRole(): Promise<string> {
    const roleLocator = this.profileSection.locator('dt:has-text("Role") + dd');
    return await roleLocator.textContent() || '';
  }
}
