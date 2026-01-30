import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Case Creation page (/cases/new)
 */
export class CaseNewPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly backButton: Locator;

  // Basic Info Section
  readonly sourceChannelSelect: Locator;
  readonly caseTypeSelect: Locator;
  readonly severitySelect: Locator;

  // Details Section
  readonly summaryInput: Locator;
  readonly detailsEditor: Locator;

  // Reporter Section
  readonly reporterTypeSelect: Locator;
  readonly reporterNameInput: Locator;
  readonly reporterEmailInput: Locator;
  readonly reporterPhoneInput: Locator;

  // Location Section
  readonly countryInput: Locator;
  readonly stateInput: Locator;
  readonly cityInput: Locator;

  // Form Actions
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly saveDraftButton: Locator;

  // Validation
  readonly validationErrors: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /create new case/i });
    this.backButton = page.getByRole('link', { name: /back to cases/i }).or(
      page.locator('a[href="/cases"]').filter({ has: page.locator('svg') })
    );

    // Basic Info Section - using shadcn/ui Select components
    this.sourceChannelSelect = page.getByRole('combobox', { name: /source channel/i }).or(
      page.locator('[id="sourceChannel"]').locator('..')
    );
    this.caseTypeSelect = page.getByRole('combobox', { name: /case type/i }).or(
      page.locator('[id="caseType"]').locator('..')
    );
    this.severitySelect = page.getByRole('combobox', { name: /severity/i }).or(
      page.locator('[id="severity"]').locator('..')
    );

    // Details Section
    this.summaryInput = page.getByLabel(/summary/i).or(
      page.locator('input[name="summary"]')
    );
    this.detailsEditor = page.locator('[contenteditable="true"]').first().or(
      page.locator('textarea[name="details"]')
    );

    // Reporter Section
    this.reporterTypeSelect = page.getByRole('combobox', { name: /reporter type/i }).or(
      page.locator('[id="reporterType"]').locator('..')
    );
    this.reporterNameInput = page.getByLabel(/reporter name/i).or(
      page.locator('input[name="reporterName"]')
    );
    this.reporterEmailInput = page.getByLabel(/reporter email/i).or(
      page.locator('input[name="reporterEmail"]')
    );
    this.reporterPhoneInput = page.getByLabel(/reporter phone/i).or(
      page.locator('input[name="reporterPhone"]')
    );

    // Location Section
    this.countryInput = page.getByLabel(/country/i).or(
      page.locator('input[name="locationCountry"]')
    );
    this.stateInput = page.getByLabel(/state\/province/i).or(
      page.locator('input[name="locationState"]')
    );
    this.cityInput = page.getByLabel(/city/i).or(
      page.locator('input[name="locationCity"]')
    );

    // Form Actions
    this.submitButton = page.getByRole('button', { name: /create case/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.saveDraftButton = page.getByRole('button', { name: /save draft/i });

    // Validation
    this.validationErrors = page.locator('.text-destructive, [role="alert"]');
    this.loadingIndicator = page.locator('text=Creating...');
  }

  /**
   * Navigate to the case creation page
   */
  async goto() {
    await this.page.goto('/cases/new');
  }

  /**
   * Wait for page to be fully loaded
   */
  async expectLoaded() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Select a source channel
   */
  async selectSourceChannel(channel: 'HOTLINE' | 'WEB_FORM' | 'PROXY' | 'DIRECT_ENTRY' | 'CHATBOT') {
    const trigger = this.page.locator('[data-testid="source-channel-select"]').or(
      this.page.locator('button').filter({ hasText: /select.*source/i })
    );
    await trigger.click();

    const optionText = channel.replace(/_/g, ' ').toLowerCase();
    await this.page.getByRole('option', { name: new RegExp(optionText, 'i') }).click();
  }

  /**
   * Select a case type
   */
  async selectCaseType(caseType: 'REPORT' | 'INQUIRY' | 'FOLLOW_UP') {
    const trigger = this.page.locator('[data-testid="case-type-select"]').or(
      this.page.locator('button').filter({ hasText: /select.*type/i })
    );
    await trigger.click();

    const optionText = caseType.replace(/_/g, ' ').toLowerCase();
    await this.page.getByRole('option', { name: new RegExp(optionText, 'i') }).click();
  }

  /**
   * Select a severity level
   */
  async selectSeverity(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') {
    const trigger = this.page.locator('[data-testid="severity-select"]').or(
      this.page.locator('button').filter({ hasText: /select.*severity/i })
    );
    await trigger.click();

    await this.page.getByRole('option', { name: new RegExp(severity, 'i') }).click();
  }

  /**
   * Fill the summary field
   */
  async fillSummary(summary: string) {
    const input = this.page.locator('input[name="summary"]').or(
      this.page.getByPlaceholder(/brief summary/i)
    );
    await input.fill(summary);
  }

  /**
   * Fill the details field (rich text editor or textarea)
   */
  async fillDetails(details: string) {
    // Try to find the contenteditable first, then fallback to textarea
    const contentEditable = this.page.locator('[contenteditable="true"]').first();
    const isContentEditable = await contentEditable.isVisible().catch(() => false);

    if (isContentEditable) {
      await contentEditable.click();
      await contentEditable.fill(details);
    } else {
      const textarea = this.page.locator('textarea[name="details"]');
      await textarea.fill(details);
    }
  }

  /**
   * Fill the basic case information
   */
  async fillBasicInfo(data: {
    sourceChannel?: 'HOTLINE' | 'WEB_FORM' | 'PROXY' | 'DIRECT_ENTRY' | 'CHATBOT';
    caseType?: 'REPORT' | 'INQUIRY' | 'FOLLOW_UP';
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    summary?: string;
    details: string;
  }) {
    if (data.sourceChannel) {
      await this.selectSourceChannel(data.sourceChannel);
    }
    if (data.caseType) {
      await this.selectCaseType(data.caseType);
    }
    if (data.severity) {
      await this.selectSeverity(data.severity);
    }
    if (data.summary) {
      await this.fillSummary(data.summary);
    }
    await this.fillDetails(data.details);
  }

  /**
   * Submit the form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Submit form and wait for navigation to case detail
   */
  async submitAndWaitForRedirect() {
    await this.submit();
    await this.page.waitForURL(/cases\/[a-f0-9-]+/, { timeout: 30000 });
  }

  /**
   * Click cancel and go back
   */
  async cancel() {
    await this.cancelButton.click();
    await this.page.waitForURL(/cases/);
  }

  /**
   * Check if form has validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    const errors = await this.validationErrors.count();
    return errors > 0;
  }

  /**
   * Get validation error messages
   */
  async getValidationErrors(): Promise<string[]> {
    const errors = await this.validationErrors.allTextContents();
    return errors.filter((e) => e.trim().length > 0);
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }
}
