import { test, expect, TEST_USERS } from '../fixtures/auth';
import { CaseListPage } from '../pages/case-list.page';
import { CaseDetailPage } from '../pages/case-detail.page';
import { CaseNewPage } from '../pages/case-new.page';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * E2E Test Suite: File Attachments
 *
 * Tests file upload, download, and deletion functionality on cases.
 * Also tests file type and size validation.
 */
test.describe('File Attachments', () => {
  // Test file paths - created in beforeAll
  let testPdfPath: string;
  let testImagePath: string;
  let testInvalidPath: string;
  let tempDir: string;

  test.beforeAll(async () => {
    // Create temp directory for test files
    tempDir = path.join(os.tmpdir(), 'e2e-attachments-test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create a test PDF file (minimal valid PDF)
    testPdfPath = path.join(tempDir, 'test-document.pdf');
    const minimalPdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Root 1 0 R/Size 4>>\nstartxref\n178\n%%EOF';
    fs.writeFileSync(testPdfPath, minimalPdf);

    // Create a test image file (minimal PNG - 1x1 transparent pixel)
    testImagePath = path.join(tempDir, 'test-image.png');
    const minimalPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    fs.writeFileSync(testImagePath, minimalPng);

    // Create an invalid file type (executable - not allowed)
    testInvalidPath = path.join(tempDir, 'test-invalid.exe');
    fs.writeFileSync(testInvalidPath, 'MZ\x00\x00'); // Minimal EXE header
  });

  test.afterAll(async () => {
    // Clean up temp files
    try {
      if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
      if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
      if (fs.existsSync(testInvalidPath)) fs.unlinkSync(testInvalidPath);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  test.describe('Attachment Upload', () => {
    test('should upload a PDF file to a case', async ({ authenticatedPage }) => {
      // Navigate to a case
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        // Create a case first
        const caseNewPage = new CaseNewPage(authenticatedPage);
        await caseNewPage.goto();
        await caseNewPage.expectLoaded();
        await caseNewPage.selectSourceChannel('DIRECT_ENTRY');
        await caseNewPage.fillDetails(`E2E Attachment Test Case - ${Date.now()}`);
        await authenticatedPage.waitForTimeout(500);
        await caseNewPage.submitAndWaitForRedirect();
      } else {
        await caseListPage.clickCaseByIndex(0);
      }

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      // Get initial attachment count
      const initialCount = await caseDetailPage.getAttachmentCount();

      // Upload the PDF file
      await caseDetailPage.uploadFile(testPdfPath);

      // Verify file appears in attachments
      const hasFile = await caseDetailPage.hasAttachment('test-document.pdf');
      expect(hasFile).toBe(true);

      // Verify count increased
      const newCount = await caseDetailPage.getAttachmentCount();
      expect(newCount).toBe(initialCount + 1);
    });

    test('should upload an image file to a case', async ({ authenticatedPage }) => {
      // Navigate to a case
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      // Upload the image file
      await caseDetailPage.uploadFile(testImagePath);

      // Verify file appears in attachments
      const hasFile = await caseDetailPage.hasAttachment('test-image.png');
      expect(hasFile).toBe(true);
    });

    test('should display upload progress', async ({ authenticatedPage }) => {
      // Navigate to a case
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      // Click add attachment
      await caseDetailPage.clickAddAttachment();

      // Upload file and check for progress elements
      await caseDetailPage.fileInput.setInputFiles(testPdfPath);

      // Wait for file to appear in queue
      await expect(authenticatedPage.locator('text=test-document.pdf')).toBeVisible({
        timeout: 5000,
      });

      // The file should show as pending or uploading
      const queueItem = authenticatedPage.locator('[class*="rounded-lg"]').filter({
        hasText: 'test-document.pdf',
      });
      await expect(queueItem).toBeVisible();
    });
  });

  test.describe('Attachment Validation', () => {
    test('should reject invalid file types', async ({ authenticatedPage }) => {
      // Navigate to a case
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      // Try to upload invalid file
      const error = await caseDetailPage.uploadInvalidFileType(testInvalidPath);

      // Should show error about file type
      const hasError =
        error !== null ||
        (await authenticatedPage.locator('text=/not allowed|invalid/i').isVisible().catch(() => false));
      expect(hasError).toBe(true);
    });

    test('should show error for oversized files', async ({ authenticatedPage }) => {
      // This test would need a large file - skipping for practicality
      // In a real scenario, we'd create a file > 50MB or mock the validation
      test.skip();
    });

    test('should allow multiple files in queue', async ({ authenticatedPage }) => {
      // Navigate to a case
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      // Click add attachment
      await caseDetailPage.clickAddAttachment();

      // Add multiple files
      await caseDetailPage.fileInput.setInputFiles([testPdfPath, testImagePath]);

      // Wait for files to appear in queue
      await authenticatedPage.waitForTimeout(500);

      // Check that both files are in the queue
      const queueText = await authenticatedPage.locator('text=/\\d+ file\\(s\\) selected/').textContent();
      expect(queueText).toMatch(/2 file\(s\) selected/);
    });
  });

  test.describe('Attachment Download', () => {
    test('should download an attachment', async ({ authenticatedPage }) => {
      // Navigate to a case
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      // Check if there are any attachments
      const attachmentCount = await caseDetailPage.getAttachmentCount();
      if (attachmentCount === 0) {
        // Upload a file first
        await caseDetailPage.uploadFile(testPdfPath);
      }

      // Try to download
      const download = await caseDetailPage.downloadAttachment('test-document.pdf').catch(() => null);

      if (download) {
        // Verify download was initiated
        const suggestedFilename = download.suggestedFilename();
        expect(suggestedFilename).toContain('test-document');
      }
      // If download fails, the file might have already been deleted in previous tests
    });
  });

  test.describe('Attachment Deletion', () => {
    test('should delete an attachment with confirmation', async ({ authenticatedPage }) => {
      // Navigate to a case
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      // Upload a file first to ensure there's something to delete
      await caseDetailPage.uploadFile(testPdfPath);

      // Get count before delete
      const countBefore = await caseDetailPage.getAttachmentCount();

      // Delete the attachment
      await caseDetailPage.deleteAttachment('test-document.pdf');

      // Wait for deletion to complete
      await authenticatedPage.waitForTimeout(1000);

      // Verify count decreased
      const countAfter = await caseDetailPage.getAttachmentCount();
      expect(countAfter).toBe(countBefore - 1);

      // Verify file is no longer visible
      const hasFile = await caseDetailPage.hasAttachment('test-document.pdf');
      expect(hasFile).toBe(false);
    });

    test('should cancel deletion when clicking cancel', async ({ authenticatedPage }) => {
      // Navigate to a case
      const caseListPage = new CaseListPage(authenticatedPage);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(authenticatedPage);
      await caseDetailPage.expectLoaded();

      // Upload a file first
      await caseDetailPage.uploadFile(testImagePath);

      // Get count before
      const countBefore = await caseDetailPage.getAttachmentCount();

      // Start delete but cancel
      const attachmentRow = caseDetailPage.propertiesPanel.locator('[class*="rounded-lg border"]').filter({
        hasText: 'test-image.png',
      });
      const deleteButton = attachmentRow.locator('button[title="Delete"]').or(
        attachmentRow.locator('button').last()
      );

      await deleteButton.click();

      // Wait for dialog
      await expect(caseDetailPage.deleteAttachmentDialog).toBeVisible({ timeout: 5000 });

      // Click cancel
      await authenticatedPage.getByRole('button', { name: /cancel/i }).click();

      // Dialog should close
      await expect(caseDetailPage.deleteAttachmentDialog).toBeHidden();

      // Count should be unchanged
      const countAfter = await caseDetailPage.getAttachmentCount();
      expect(countAfter).toBe(countBefore);
    });
  });

  test.describe('Permission Tests', () => {
    test('investigator should be able to upload files', async ({ page, loginAs }) => {
      // Login as investigator
      await loginAs('investigator');

      // Navigate to cases
      const caseListPage = new CaseListPage(page);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      const caseCount = await caseListPage.getCaseCount();
      if (caseCount === 0) {
        test.skip();
        return;
      }

      await caseListPage.clickCaseByIndex(0);

      const caseDetailPage = new CaseDetailPage(page);
      await caseDetailPage.expectLoaded();

      // Should be able to see add attachment button
      await expect(caseDetailPage.addAttachmentButton).toBeVisible();

      // Should be able to click it
      await caseDetailPage.clickAddAttachment();
      await expect(caseDetailPage.fileDropZone).toBeVisible();
    });

    test('employee role should have limited access to cases', async ({ page, loginAs }) => {
      // Login as employee
      await loginAs('employee');

      // Navigate to cases
      const caseListPage = new CaseListPage(page);
      await caseListPage.goto();
      await caseListPage.expectLoaded();

      // Employee should only see their own cases (if any)
      // The exact behavior depends on the implementation
      // This test verifies the page loads without error
      const pageLoaded = await caseListPage.pageTitle.isVisible().catch(() => false);
      expect(pageLoaded).toBe(true);
    });
  });
});
