import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Cases List page (/cases)
 */
export class CaseListPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly newCaseButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly statusFilter: Locator;
  readonly severityFilter: Locator;
  readonly casesTable: Locator;
  readonly tableRows: Locator;
  readonly loadingIndicator: Locator;
  readonly emptyState: Locator;
  readonly totalCasesText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: 'Cases' });
    this.newCaseButton = page.getByRole('button', { name: /new case/i });
    this.searchInput = page.getByPlaceholder(/search by reference/i);
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.statusFilter = page.locator('[role="combobox"]').first();
    this.severityFilter = page.locator('[role="combobox"]').nth(1);
    this.casesTable = page.locator('table');
    this.tableRows = page.locator('tbody tr');
    this.loadingIndicator = page.locator('text=Loading cases...');
    this.emptyState = page.locator('text=No cases found');
    this.totalCasesText = page.locator('text=/\\d+ total cases/');
  }

  /**
   * Navigate to the cases list page
   */
  async goto() {
    await this.page.goto('/cases');
  }

  /**
   * Wait for page to be fully loaded
   */
  async expectLoaded() {
    await expect(this.pageTitle).toBeVisible();
    // Wait for loading to complete
    await expect(this.loadingIndicator).toBeHidden({ timeout: 10000 });
  }

  /**
   * Click the New Case button
   */
  async clickNewCase() {
    await this.newCaseButton.click();
  }

  /**
   * Search for cases by query
   */
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    // Wait for search to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the count of cases in the table
   */
  async getCaseCount(): Promise<number> {
    const rows = await this.tableRows.count();
    return rows;
  }

  /**
   * Click on a case row by reference number
   */
  async clickCaseByReference(reference: string) {
    const row = this.page.locator(`tr:has-text("${reference}")`);
    await row.click();
    await this.page.waitForURL(/cases\/[a-f0-9-]+/);
  }

  /**
   * Click on a case row by index (0-based)
   */
  async clickCaseByIndex(index: number) {
    const row = this.tableRows.nth(index);
    await row.click();
    await this.page.waitForURL(/cases\/[a-f0-9-]+/);
  }

  /**
   * Get reference number from a row by index
   */
  async getReferenceByIndex(index: number): Promise<string> {
    const row = this.tableRows.nth(index);
    const reference = await row.locator('td').first().textContent();
    return reference?.trim() || '';
  }

  /**
   * Check if a case with reference exists in the list
   */
  async hasCaseWithReference(reference: string): Promise<boolean> {
    const row = this.page.locator(`tr:has-text("${reference}")`);
    return await row.isVisible();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: 'NEW' | 'OPEN' | 'CLOSED' | 'all') {
    await this.statusFilter.click();
    const option = this.page.getByRole('option', {
      name: status === 'all' ? 'All Statuses' : status
    });
    await option.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter by severity
   */
  async filterBySeverity(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'all') {
    await this.severityFilter.click();
    const option = this.page.getByRole('option', {
      name: severity === 'all' ? 'All Severities' : severity.charAt(0) + severity.slice(1).toLowerCase()
    });
    await option.click();
    await this.page.waitForTimeout(500);
  }
}
