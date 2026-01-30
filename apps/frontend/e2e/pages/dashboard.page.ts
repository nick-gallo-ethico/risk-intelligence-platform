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

  // Quick Actions
  readonly quickActionsCard: Locator;
  readonly createCaseButton: Locator;
  readonly myOpenCasesButton: Locator;
  readonly recentActivityButton: Locator;

  // Stats Cards
  readonly statsSection: Locator;
  readonly totalCasesCard: Locator;
  readonly openCasesStatCard: Locator;
  readonly newCasesCard: Locator;
  readonly closedCasesCard: Locator;

  // Recent Cases
  readonly recentCasesCard: Locator;
  readonly recentCasesTable: Locator;
  readonly recentCasesRows: Locator;
  readonly viewAllCasesLink: Locator;

  // My Assignments
  readonly myAssignmentsCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: 'Dashboard' });
    this.welcomeMessage = page.locator('text=Welcome back');
    this.userName = page.locator('header').locator('text=/[A-Z][a-z]+ [A-Z][a-z]+/');
    this.casesButton = page.getByRole('button', { name: 'Cases' });
    this.signOutButton = page.getByRole('button', { name: /sign out/i });
    this.openCasesCard = page.locator('text=Open Cases').locator('..');
    this.profileSection = page.locator('text=Your Profile').locator('..');

    // Quick Actions
    this.quickActionsCard = page.locator('text=Quick Actions').locator('..');
    this.createCaseButton = page.getByRole('button', { name: 'Create Case' });
    this.myOpenCasesButton = page.getByRole('button', { name: /my open cases/i });
    this.recentActivityButton = page.getByRole('button', { name: /recent activity/i });

    // Stats Cards
    this.statsSection = page.locator('.grid').first();
    this.totalCasesCard = page.locator('text=Total Cases').locator('..').locator('..');
    this.openCasesStatCard = page.locator('h3:has-text("Open Cases")').locator('..');
    this.newCasesCard = page.locator('text=New').locator('..').locator('..');
    this.closedCasesCard = page.locator('text=Closed').locator('..').locator('..');

    // Recent Cases
    this.recentCasesCard = page.locator('text=Recent Cases').locator('..').locator('..');
    this.recentCasesTable = this.recentCasesCard.locator('table');
    this.recentCasesRows = this.recentCasesCard.locator('tbody tr');
    this.viewAllCasesLink = page.locator('text=View all').or(
      page.getByRole('link', { name: /view all/i })
    );

    // My Assignments
    this.myAssignmentsCard = page.locator('text=My Assignments').locator('..').locator('..');
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

  /**
   * Click Create Case quick action and navigate to case creation
   */
  async clickCreateCase() {
    await this.createCaseButton.click();
    await this.page.waitForURL(/cases\/new/);
  }

  /**
   * Click My Open Cases quick action
   */
  async clickMyOpenCases() {
    await this.myOpenCasesButton.click();
    await this.page.waitForURL(/cases.*status=OPEN/);
  }

  /**
   * Click Recent Activity quick action
   */
  async clickRecentActivity() {
    await this.recentActivityButton.click();
    await this.page.waitForURL(/cases.*sortBy=updatedAt/);
  }

  /**
   * Check if quick actions section is visible
   */
  async hasQuickActions(): Promise<boolean> {
    return await this.quickActionsCard.isVisible();
  }

  /**
   * Check if stats cards are visible
   */
  async hasStatsCards(): Promise<boolean> {
    const totalCases = await this.totalCasesCard.isVisible().catch(() => false);
    const openCases = await this.openCasesStatCard.isVisible().catch(() => false);
    return totalCases || openCases;
  }

  /**
   * Get the recent cases count
   */
  async getRecentCasesCount(): Promise<number> {
    return await this.recentCasesRows.count();
  }

  /**
   * Click on a recent case by index
   */
  async clickRecentCase(index: number = 0) {
    const row = this.recentCasesRows.nth(index);
    await row.click();
    await this.page.waitForURL(/cases\/[a-f0-9-]+/);
  }

  /**
   * Get reference number from recent case by index
   */
  async getRecentCaseReference(index: number = 0): Promise<string> {
    const row = this.recentCasesRows.nth(index);
    const reference = await row.locator('td').first().textContent();
    return reference?.trim() || '';
  }

  /**
   * Click View All link in recent cases
   */
  async clickViewAllCases() {
    await this.viewAllCasesLink.click();
    await this.page.waitForURL(/cases/);
  }

  /**
   * Get a stat value from the stats cards
   */
  async getStatValue(statName: 'Total Cases' | 'Open Cases' | 'New' | 'Closed'): Promise<number> {
    const card = this.page.locator(`text=${statName}`).locator('..').locator('..');
    const valueText = await card.locator('.text-2xl, .text-3xl, .font-bold').first().textContent();
    return parseInt(valueText || '0', 10);
  }

  /**
   * Check if My Assignments section is visible
   */
  async hasMyAssignments(): Promise<boolean> {
    return await this.myAssignmentsCard.isVisible();
  }
}
