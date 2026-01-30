import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Case Detail page (/cases/[id])
 */
export class CaseDetailPage {
  readonly page: Page;
  readonly referenceNumber: Locator;
  readonly statusBadge: Locator;
  readonly severityBadge: Locator;
  readonly propertiesPanel: Locator;
  readonly activityTimeline: Locator;
  readonly investigationsPanel: Locator;
  readonly createInvestigationButton: Locator;
  readonly investigationsList: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.referenceNumber = page.locator('[data-testid="case-reference"]').or(
      page.locator('h1').filter({ hasText: /ETH-\d{4}-\d{5}/ })
    );
    this.statusBadge = page.locator('[data-testid="case-status"]').or(
      page.locator('.bg-blue-100, .bg-yellow-100, .bg-gray-100').first()
    );
    this.severityBadge = page.locator('[data-testid="case-severity"]').or(
      page.locator('.bg-green-100, .bg-orange-100, .bg-red-100').first()
    );
    this.propertiesPanel = page.locator('aside').first();
    this.activityTimeline = page.locator('main');
    this.investigationsPanel = page.locator('aside').last();
    this.createInvestigationButton = page.getByTestId('create-investigation-button').or(
      page.getByRole('button', { name: /create/i }).filter({ hasText: /create/i })
    );
    this.investigationsList = page.getByTestId('investigations-list');
    this.loadingIndicator = page.locator('text=Loading...');
    this.errorMessage = page.locator('text=Case Not Found');
    this.backButton = page.getByRole('button', { name: /back/i });
  }

  /**
   * Navigate to a specific case by ID
   */
  async goto(caseId: string) {
    await this.page.goto(`/cases/${caseId}`);
  }

  /**
   * Wait for case detail to be fully loaded
   */
  async expectLoaded() {
    await expect(this.loadingIndicator).toBeHidden({ timeout: 10000 });
    await expect(this.errorMessage).toBeHidden();
  }

  /**
   * Get the reference number text
   */
  async getReferenceNumber(): Promise<string> {
    // Try multiple selectors since the reference number might be in different places
    const header = this.page.locator('h1, h2').first();
    const text = await header.textContent();
    // Extract ETH-YYYY-XXXXX pattern
    const match = text?.match(/ETH-\d{4}-\d{5}/);
    return match ? match[0] : '';
  }

  /**
   * Get the current case status
   */
  async getStatus(): Promise<string> {
    const badges = this.page.locator('.bg-blue-100, .bg-yellow-100, .bg-gray-100').first();
    return await badges.textContent() || '';
  }

  /**
   * Click the Create Investigation button
   */
  async clickCreateInvestigation() {
    await this.createInvestigationButton.click();
    // Wait for dialog to open
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  /**
   * Create an investigation with specified type and department
   */
  async createInvestigation(type: string = 'FULL', department?: string) {
    await this.clickCreateInvestigation();

    // Select investigation type
    const typeSelect = this.page.getByTestId('investigation-type-select');
    await typeSelect.click();
    await this.page.getByRole('option', { name: new RegExp(type, 'i') }).click();

    // Select department if specified
    if (department) {
      const deptSelect = this.page.getByTestId('department-select');
      await deptSelect.click();
      await this.page.getByRole('option', { name: new RegExp(department, 'i') }).click();
    }

    // Submit
    await this.page.getByTestId('submit-button').click();

    // Wait for dialog to close
    await expect(this.page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
  }

  /**
   * Get the count of investigations
   */
  async getInvestigationCount(): Promise<number> {
    const list = this.page.getByTestId('investigations-list');
    const isVisible = await list.isVisible();
    if (!isVisible) return 0;

    const cards = list.locator('[data-testid="investigation-card"]');
    return await cards.count();
  }

  /**
   * Click on an investigation card to open the detail panel
   */
  async openInvestigation(index: number = 0) {
    const list = this.page.getByTestId('investigations-list');
    const cards = list.locator('[data-testid="investigation-card"]');
    await cards.nth(index).click();

    // Wait for slide-over panel to open
    await expect(this.page.locator('[role="dialog"]')).toBeVisible();
  }

  /**
   * Switch to a tab in the investigation detail panel
   */
  async switchToTab(tabName: 'Overview' | 'Notes' | 'Findings') {
    const tab = this.page.getByRole('tab', { name: tabName });
    await tab.click();
    await expect(tab).toHaveAttribute('data-state', 'active');
  }

  /**
   * Add a note to the current investigation
   */
  async addNote(content: string, noteType: string = 'GENERAL') {
    // Click Add Note button
    await this.page.getByRole('button', { name: /add note/i }).click();

    // Wait for modal
    await expect(this.page.getByRole('dialog')).toBeVisible();

    // Fill content (the rich text editor has a contenteditable div)
    const editor = this.page.locator('[contenteditable="true"]');
    await editor.fill(content);

    // Select note type
    const noteTypeSelect = this.page.locator('#noteType');
    await noteTypeSelect.click();
    await this.page.getByRole('option', { name: new RegExp(noteType, 'i') }).click();

    // Save
    await this.page.getByRole('button', { name: /save/i }).click();

    // Wait for modal to close
    await expect(this.page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
  }

  /**
   * Close the investigation detail panel
   */
  async closeInvestigationPanel() {
    // Click the X button or outside the panel
    const closeButton = this.page.locator('[data-radix-dialog-close]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await expect(this.page.locator('[role="dialog"]')).toBeHidden();
  }
}
