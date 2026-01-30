import { test, expect, TEST_USERS } from '../fixtures/auth';
import { CaseNewPage } from '../pages/case-new.page';
import { CaseListPage } from '../pages/case-list.page';
import { CaseDetailPage } from '../pages/case-detail.page';
import { DashboardPage } from '../pages/dashboard.page';

/**
 * E2E Test Suite: Case Creation Form
 *
 * Tests the complete case creation workflow including:
 * - Form validation
 * - Required field handling
 * - Successful submission
 * - Navigation from dashboard
 */
test.describe('Case Creation Form', () => {
  test.describe('Navigation', () => {
    test('should navigate to case creation from cases list', async ({ authenticatedPage }) => {
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      await caseListPage.clickNewCase();
      await expect(authenticatedPage).toHaveURL(/cases\/new/);

      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.expectLoaded();
    });

    test('should navigate to case creation from dashboard quick actions', async ({
      authenticatedPage,
    }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      await dashboardPage.clickCreateCase();
      await expect(authenticatedPage).toHaveURL(/cases\/new/);

      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.expectLoaded();
    });

    test('should navigate back to cases list on cancel', async ({ authenticatedPage }) => {
      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.goto();
      await caseNewPage.expectLoaded();

      await caseNewPage.cancel();
      await expect(authenticatedPage).toHaveURL(/cases(?!\/new)/);
    });
  });

  test.describe('Form Display', () => {
    test('should display case creation form with all sections', async ({ authenticatedPage }) => {
      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.goto();
      await caseNewPage.expectLoaded();

      // Check page title
      await expect(caseNewPage.pageTitle).toBeVisible();

      // Check submit and cancel buttons
      await expect(caseNewPage.submitButton).toBeVisible();
      await expect(caseNewPage.cancelButton).toBeVisible();
    });

    test('should have submit button disabled initially', async ({ authenticatedPage }) => {
      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.goto();
      await caseNewPage.expectLoaded();

      // Submit should be disabled when form is not valid
      const isDisabled = await caseNewPage.isSubmitDisabled();
      expect(isDisabled).toBe(true);
    });
  });

  test.describe('Form Validation', () => {
    test('should require source channel', async ({ authenticatedPage }) => {
      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.goto();
      await caseNewPage.expectLoaded();

      // Fill only details without source channel
      await caseNewPage.fillDetails('Test case details without source channel');

      // Submit should be disabled
      const isDisabled = await caseNewPage.isSubmitDisabled();
      expect(isDisabled).toBe(true);
    });

    test('should require details field', async ({ authenticatedPage }) => {
      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.goto();
      await caseNewPage.expectLoaded();

      // Fill only source without details
      await caseNewPage.selectSourceChannel('HOTLINE');

      // Submit should be disabled
      const isDisabled = await caseNewPage.isSubmitDisabled();
      expect(isDisabled).toBe(true);
    });

    test('should enable submit when required fields are filled', async ({ authenticatedPage }) => {
      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.goto();
      await caseNewPage.expectLoaded();

      // Fill minimum required fields
      await caseNewPage.selectSourceChannel('HOTLINE');
      await caseNewPage.fillDetails('This is a test case with sufficient details for validation');

      // Wait for form validation to complete
      await authenticatedPage.waitForTimeout(500);

      // Submit should now be enabled
      const isDisabled = await caseNewPage.isSubmitDisabled();
      expect(isDisabled).toBe(false);
    });
  });

  test.describe('Successful Case Creation', () => {
    test('should create case with minimum required fields', async ({ authenticatedPage }) => {
      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.goto();
      await caseNewPage.expectLoaded();

      const uniqueDetails = `E2E Test Case - Minimum Fields - ${Date.now()}`;

      // Fill minimum required fields
      await caseNewPage.selectSourceChannel('WEB_FORM');
      await caseNewPage.fillDetails(uniqueDetails);

      // Wait for validation
      await authenticatedPage.waitForTimeout(500);

      // Submit the form
      await caseNewPage.submitAndWaitForRedirect();

      // Should navigate to case detail page
      await expect(authenticatedPage).toHaveURL(/cases\/[a-f0-9-]+/);

      // Case detail should load
      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      // Reference number should be generated
      const refNumber = await caseDetailPage.getReferenceNumber();
      expect(refNumber).toMatch(/ETH-\d{4}-\d{5}/);
    });

    test('should create case with all optional fields', async ({ authenticatedPage }) => {
      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.goto();
      await caseNewPage.expectLoaded();

      const uniqueDetails = `E2E Test Case - Full Details - ${Date.now()}`;

      // Fill all fields
      await caseNewPage.selectSourceChannel('HOTLINE');
      await caseNewPage.selectCaseType('REPORT');
      await caseNewPage.selectSeverity('HIGH');
      await caseNewPage.fillSummary('Test case with all fields');
      await caseNewPage.fillDetails(uniqueDetails);

      // Wait for validation
      await authenticatedPage.waitForTimeout(500);

      // Submit the form
      await caseNewPage.submitAndWaitForRedirect();

      // Should navigate to case detail page
      await expect(authenticatedPage).toHaveURL(/cases\/[a-f0-9-]+/);

      // Case detail should load
      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      // Reference number should be generated
      const refNumber = await caseDetailPage.getReferenceNumber();
      expect(refNumber).toMatch(/ETH-\d{4}-\d{5}/);
    });

    test('should show success toast after creating case', async ({ authenticatedPage }) => {
      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.goto();
      await caseNewPage.expectLoaded();

      const uniqueDetails = `E2E Test Case - Success Toast - ${Date.now()}`;

      await caseNewPage.selectSourceChannel('DIRECT_ENTRY');
      await caseNewPage.fillDetails(uniqueDetails);

      // Wait for validation
      await authenticatedPage.waitForTimeout(500);

      // Submit
      await caseNewPage.submit();

      // Should show success toast (checking for toast or redirect)
      await expect(async () => {
        const successToast = authenticatedPage.locator('text=Case created successfully');
        const hasToast = await successToast.isVisible().catch(() => false);
        const urlMatches = /cases\/[a-f0-9-]+/.test(authenticatedPage.url());
        expect(hasToast || urlMatches).toBeTruthy();
      }).toPass({ timeout: 10000 });
    });
  });

  test.describe('Draft Functionality', () => {
    test('should have save draft button', async ({ authenticatedPage }) => {
      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.goto();
      await caseNewPage.expectLoaded();

      await expect(caseNewPage.saveDraftButton).toBeVisible();
    });
  });

  test.describe('Created Case Verification', () => {
    test('should find newly created case in case list', async ({ authenticatedPage }) => {
      const caseNewPage = new CaseNewPage(authenticatedPage);
      await caseNewPage.goto();
      await caseNewPage.expectLoaded();

      const uniqueDetails = `E2E Verification Test - ${Date.now()}`;
      const uniqueSummary = `Verification Summary ${Date.now()}`;

      // Create case
      await caseNewPage.selectSourceChannel('WEB_FORM');
      await caseNewPage.fillSummary(uniqueSummary);
      await caseNewPage.fillDetails(uniqueDetails);

      await authenticatedPage.waitForTimeout(500);
      await caseNewPage.submitAndWaitForRedirect();

      // Get the reference number from detail page
      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();
      const refNumber = await caseDetailPage.getReferenceNumber();

      // Navigate to case list
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Search for the case
      await caseListPage.search(refNumber);
      await caseListPage.expectLoaded();

      // Case should be found
      const hasCaseInList = await caseListPage.hasCaseWithReference(refNumber);
      expect(hasCaseInList).toBe(true);
    });
  });
});
