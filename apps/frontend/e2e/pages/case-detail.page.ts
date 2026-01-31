import { Page, Locator, expect } from '@playwright/test';
import * as path from 'path';

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

  // Attachment elements
  readonly attachmentsSection: Locator;
  readonly addAttachmentButton: Locator;
  readonly attachmentsList: Locator;
  readonly fileDropZone: Locator;
  readonly fileInput: Locator;
  readonly uploadButton: Locator;
  readonly deleteAttachmentDialog: Locator;

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

    // Attachment elements
    this.attachmentsSection = page.locator('text=Attachments').locator('..');
    this.addAttachmentButton = page.locator('button').filter({ hasText: /add attachment/i });
    this.attachmentsList = page.locator('[class*="space-y-2"]').filter({
      has: page.locator('[class*="rounded-lg border"]'),
    });
    this.fileDropZone = page.locator('[class*="border-dashed"]');
    this.fileInput = page.locator('input[type="file"]');
    this.uploadButton = page.getByRole('button', { name: /upload/i });
    this.deleteAttachmentDialog = page.getByRole('dialog').filter({
      has: page.locator('text=Delete Attachment'),
    });
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

  // ==================== ATTACHMENT METHODS ====================

  /**
   * Click the Add Attachment button to show upload zone
   */
  async clickAddAttachment() {
    await this.addAttachmentButton.click();
    await expect(this.fileDropZone).toBeVisible({ timeout: 5000 });
  }

  /**
   * Upload a file to the case
   */
  async uploadFile(filePath: string) {
    // Ensure upload zone is visible
    if (!(await this.fileDropZone.isVisible().catch(() => false))) {
      await this.clickAddAttachment();
    }

    // Upload file
    await this.fileInput.setInputFiles(filePath);

    // Wait for file to appear in queue
    await this.page.waitForTimeout(500);

    // Click upload button
    await this.uploadButton.click();

    // Wait for upload to complete (toast or file in list)
    await expect(async () => {
      const uploadSuccess = await this.page.locator('text=Uploaded').isVisible().catch(() => false);
      const fileName = path.basename(filePath);
      const fileInList = await this.page.locator(`text=${fileName}`).isVisible().catch(() => false);
      expect(uploadSuccess || fileInList).toBe(true);
    }).toPass({ timeout: 15000 });
  }

  /**
   * Upload a file using drag and drop simulation
   */
  async uploadFileDragDrop(filePath: string) {
    // Ensure upload zone is visible
    if (!(await this.fileDropZone.isVisible().catch(() => false))) {
      await this.clickAddAttachment();
    }

    // Use Playwright's file chooser for drag simulation
    await this.fileInput.setInputFiles(filePath);

    // Wait for file to appear in queue
    await this.page.waitForTimeout(500);

    // Click upload button
    await this.uploadButton.click();

    // Wait for upload to complete
    await this.page.waitForTimeout(3000);
  }

  /**
   * Get the count of attachments
   */
  async getAttachmentCount(): Promise<number> {
    // Look for the count in the section header
    const header = this.page.locator('text=/Attachments \\(\\d+\\)/');
    const text = await header.textContent().catch(() => 'Attachments (0)');
    const match = text?.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if a file with the given name exists in attachments
   */
  async hasAttachment(fileName: string): Promise<boolean> {
    const attachment = this.propertiesPanel.locator(`text=${fileName}`);
    return await attachment.isVisible().catch(() => false);
  }

  /**
   * Download an attachment by name
   */
  async downloadAttachment(fileName: string) {
    const attachmentRow = this.propertiesPanel.locator('[class*="rounded-lg border"]').filter({
      hasText: fileName,
    });
    const downloadButton = attachmentRow.locator('button[title="Download"]').or(
      attachmentRow.locator('button').filter({ has: this.page.locator('svg') }).first()
    );

    // Set up download listener
    const downloadPromise = this.page.waitForEvent('download');
    await downloadButton.click();

    const download = await downloadPromise;
    return download;
  }

  /**
   * Delete an attachment by name
   */
  async deleteAttachment(fileName: string) {
    const attachmentRow = this.propertiesPanel.locator('[class*="rounded-lg border"]').filter({
      hasText: fileName,
    });
    const deleteButton = attachmentRow.locator('button[title="Delete"]').or(
      attachmentRow.locator('button').last()
    );

    await deleteButton.click();

    // Confirm deletion in dialog
    await expect(this.deleteAttachmentDialog).toBeVisible({ timeout: 5000 });
    await this.page.getByRole('button', { name: /delete/i }).click();

    // Wait for dialog to close
    await expect(this.deleteAttachmentDialog).toBeHidden({ timeout: 10000 });
  }

  /**
   * Try to upload an invalid file type and expect an error
   */
  async uploadInvalidFileType(filePath: string): Promise<string | null> {
    // Ensure upload zone is visible
    if (!(await this.fileDropZone.isVisible().catch(() => false))) {
      await this.clickAddAttachment();
    }

    // Upload file
    await this.fileInput.setInputFiles(filePath);

    // Wait for error to appear
    await this.page.waitForTimeout(500);

    // Check for error message in the queue
    const errorMessage = this.page.locator('text=/not allowed|invalid|error/i');
    if (await errorMessage.isVisible().catch(() => false)) {
      return await errorMessage.textContent();
    }

    return null;
  }

  /**
   * Cancel the file upload (close the upload zone)
   */
  async cancelUpload() {
    const cancelButton = this.page.locator('button').filter({ hasText: /cancel/i }).or(
      this.page.locator('text=Cancel')
    );
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
    await expect(this.fileDropZone).toBeHidden();
  }
}
