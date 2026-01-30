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
  readonly sourceFilter: Locator;
  readonly typeFilter: Locator;
  readonly dateRangeButton: Locator;
  readonly sortBySelect: Locator;
  readonly sortOrderButton: Locator;
  readonly casesTable: Locator;
  readonly tableRows: Locator;
  readonly loadingIndicator: Locator;
  readonly emptyState: Locator;
  readonly noMatchesState: Locator;
  readonly totalCasesText: Locator;
  readonly filterChips: Locator;
  readonly clearAllFiltersButton: Locator;
  readonly paginationInfo: Locator;
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;
  readonly pageSizeSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: 'Cases' });
    this.newCaseButton = page.getByRole('button', { name: /new case/i });
    this.searchInput = page.getByPlaceholder(/search by reference/i);
    this.searchButton = page.getByRole('button', { name: 'Search' }).or(
      page.locator('button[type="submit"]')
    );
    this.statusFilter = page.getByRole('combobox').filter({ hasText: /status/i }).or(
      page.locator('button').filter({ hasText: /status/i })
    );
    this.severityFilter = page.getByRole('combobox').filter({ hasText: /severity/i }).or(
      page.locator('button').filter({ hasText: /severity/i })
    );
    this.sourceFilter = page.locator('button[role="combobox"]').filter({ hasText: /source/i });
    this.typeFilter = page.locator('button[role="combobox"]').filter({ hasText: /type/i });
    this.dateRangeButton = page.getByRole('button', { name: /date range/i }).or(
      page.locator('button').filter({ has: page.locator('svg.lucide-calendar') })
    );
    this.sortBySelect = page.locator('button[role="combobox"]').filter({ has: page.locator('.lucide-arrow-up-down') });
    this.sortOrderButton = page.locator('button').filter({ has: page.locator('.lucide-arrow-up, .lucide-arrow-down') });
    this.casesTable = page.locator('table');
    this.tableRows = page.locator('tbody tr');
    this.loadingIndicator = page.locator('text=Loading cases...');
    this.emptyState = page.locator('text=No cases found');
    this.noMatchesState = page.locator('text=No cases match your filters');
    this.totalCasesText = page.locator('text=/\\d+ total/i');
    this.filterChips = page.locator('[data-filter-chip]').or(
      page.locator('button').filter({ hasText: /×|✕/ })
    );
    this.clearAllFiltersButton = page.getByRole('button', { name: /clear all/i });
    this.paginationInfo = page.locator('text=/page \\d+ of \\d+/i').or(
      page.locator('text=/\\d+-\\d+ of \\d+/i')
    );
    this.nextPageButton = page.getByRole('button', { name: /next/i });
    this.prevPageButton = page.getByRole('button', { name: /previous/i });
    this.pageSizeSelect = page.locator('button[role="combobox"]').filter({ hasText: /\\d+ per page/i });
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

  /**
   * Filter by source channel
   */
  async filterBySource(source: 'HOTLINE' | 'WEB_FORM' | 'PROXY' | 'DIRECT_ENTRY' | 'CHATBOT' | 'all') {
    await this.sourceFilter.click();
    const optionText = source === 'all' ? 'All Sources' : source.replace(/_/g, ' ');
    const option = this.page.getByRole('option', { name: new RegExp(optionText, 'i') });
    await option.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter by case type
   */
  async filterByType(caseType: 'REPORT' | 'INQUIRY' | 'FOLLOW_UP' | 'all') {
    await this.typeFilter.click();
    const optionText = caseType === 'all' ? 'All Types' : caseType.replace(/_/g, ' ');
    const option = this.page.getByRole('option', { name: new RegExp(optionText, 'i') });
    await option.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Set date range filter
   */
  async filterByDateRange(fromDate: Date | null, toDate: Date | null) {
    await this.dateRangeButton.click();

    // Wait for popover to open
    await expect(this.page.locator('[role="dialog"], .popover-content')).toBeVisible();

    if (fromDate) {
      // Navigate to correct month and select from date
      const fromDateBtn = this.page.locator(`button[name="day"]`).filter({ hasText: fromDate.getDate().toString() }).first();
      await fromDateBtn.click();
    }

    if (toDate) {
      const toDateBtn = this.page.locator(`button[name="day"]`).filter({ hasText: toDate.getDate().toString() }).last();
      await toDateBtn.click();
    }

    // Apply the filter
    const applyBtn = this.page.getByRole('button', { name: /apply/i });
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
    }

    await this.page.waitForTimeout(500);
  }

  /**
   * Clear date range filter
   */
  async clearDateRange() {
    await this.dateRangeButton.click();
    await expect(this.page.locator('[role="dialog"], .popover-content')).toBeVisible();
    const clearBtn = this.page.getByRole('button', { name: /clear/i });
    await clearBtn.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Change sort order
   */
  async sortBy(field: 'createdAt' | 'updatedAt' | 'referenceNumber' | 'severity') {
    await this.sortBySelect.click();
    const fieldLabels: Record<string, string> = {
      createdAt: 'Created Date',
      updatedAt: 'Updated Date',
      referenceNumber: 'Reference',
      severity: 'Severity',
    };
    const option = this.page.getByRole('option', { name: fieldLabels[field] });
    await option.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Toggle sort direction (asc/desc)
   */
  async toggleSortOrder() {
    await this.sortOrderButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear all active filters
   */
  async clearAllFilters() {
    const isVisible = await this.clearAllFiltersButton.isVisible().catch(() => false);
    if (isVisible) {
      await this.clearAllFiltersButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Check if there are active filter chips
   */
  async hasActiveFilters(): Promise<boolean> {
    const clearBtn = await this.clearAllFiltersButton.isVisible().catch(() => false);
    return clearBtn;
  }

  /**
   * Get the count of filter chips
   */
  async getFilterChipCount(): Promise<number> {
    return await this.filterChips.count();
  }

  /**
   * Clear specific filter by chip text
   */
  async clearFilterChip(text: string) {
    const chip = this.page.locator('button').filter({ hasText: text }).filter({ has: this.page.locator('svg') });
    await chip.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Go to next page
   */
  async goToNextPage() {
    await this.nextPageButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Go to previous page
   */
  async goToPreviousPage() {
    await this.prevPageButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if next page button is enabled
   */
  async hasNextPage(): Promise<boolean> {
    const isDisabled = await this.nextPageButton.isDisabled();
    return !isDisabled;
  }

  /**
   * Check if previous page button is enabled
   */
  async hasPreviousPage(): Promise<boolean> {
    const isDisabled = await this.prevPageButton.isDisabled();
    return !isDisabled;
  }

  /**
   * Get displayed total count
   */
  async getTotalCount(): Promise<number> {
    const text = await this.totalCasesText.textContent();
    const match = text?.match(/(\d+)\s*total/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Perform a full-text search
   */
  async searchFullText(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounced search to trigger
    await this.page.waitForTimeout(600);
  }

  /**
   * Check if showing "no matches" state
   */
  async showsNoMatches(): Promise<boolean> {
    return await this.noMatchesState.isVisible().catch(() => false);
  }

  /**
   * Check if showing empty state
   */
  async showsEmptyState(): Promise<boolean> {
    return await this.emptyState.isVisible().catch(() => false);
  }
}
