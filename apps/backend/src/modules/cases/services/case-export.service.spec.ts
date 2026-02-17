import { Test, TestingModule } from "@nestjs/testing";
import { CaseExportService } from "./case-export.service";
import { CasesService } from "../cases.service";
import { ExcelExportService } from "../../analytics/exports/excel-export.service";
import {
  CaseStatus,
  SourceChannel,
  CaseType,
  Severity,
  ReporterType,
} from "@prisma/client";

describe("CaseExportService", () => {
  let service: CaseExportService;
  let casesService: jest.Mocked<CasesService>;
  let excelExportService: jest.Mocked<ExcelExportService>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";

  const mockCase = {
    id: "case-test-123",
    referenceNumber: "ETH-2026-00001",
    organizationId: mockOrgId,
    status: CaseStatus.OPEN,
    sourceChannel: SourceChannel.WEB_FORM,
    caseType: CaseType.REPORT,
    details: "Test case details for export test",
    summary: "Summary of the case",
    reporterType: ReporterType.ANONYMOUS,
    severity: Severity.MEDIUM,
    primaryCategoryId: "cat-001",
    primaryCategory: { id: "cat-001", name: "Harassment" },
    assignee: { firstName: "John", lastName: "Doe" },
    createdById: mockUserId,
    updatedById: mockUserId,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  };

  const mockCaseWithoutRelations = {
    ...mockCase,
    primaryCategory: null,
    assignee: null,
  };

  // Mock Setup
  const mockCasesService = {
    findAll: jest.fn(),
  };

  const mockExcelExportService = {
    generateBuffer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseExportService,
        { provide: CasesService, useValue: mockCasesService },
        { provide: ExcelExportService, useValue: mockExcelExportService },
      ],
    }).compile();

    service = module.get<CaseExportService>(CaseExportService);
    casesService = module.get(CasesService);
    excelExportService = module.get(ExcelExportService);

    jest.clearAllMocks();
  });

  describe("exportCases", () => {
    it("should fetch cases and generate Excel buffer", async () => {
      // Arrange
      const mockBuffer = Buffer.from("mock-excel-data");
      mockCasesService.findAll.mockResolvedValue({
        data: [mockCase],
        total: 1,
        limit: 20,
        offset: 0,
      });
      mockExcelExportService.generateBuffer.mockResolvedValue(mockBuffer);

      // Act
      const result = await service.exportCases({}, mockOrgId);

      // Assert
      expect(result).toEqual(mockBuffer);
      expect(casesService.findAll).toHaveBeenCalledWith({}, mockOrgId);
    });

    it("should pass query filters to cases service", async () => {
      // Arrange
      mockCasesService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
      mockExcelExportService.generateBuffer.mockResolvedValue(Buffer.from(""));
      const query = { status: CaseStatus.OPEN, severity: Severity.HIGH };

      // Act
      await service.exportCases(query, mockOrgId);

      // Assert
      expect(casesService.findAll).toHaveBeenCalledWith(query, mockOrgId);
    });

    it("should map case data to export rows", async () => {
      // Arrange
      mockCasesService.findAll.mockResolvedValue({
        data: [mockCase],
        total: 1,
        limit: 20,
        offset: 0,
      });
      mockExcelExportService.generateBuffer.mockResolvedValue(Buffer.from(""));

      // Act
      await service.exportCases({}, mockOrgId);

      // Assert
      expect(excelExportService.generateBuffer).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            referenceNumber: "ETH-2026-00001",
            status: CaseStatus.OPEN,
            severity: Severity.MEDIUM,
            category: "Harassment",
            assignee: "John Doe",
          }),
        ]),
        expect.any(Array),
        { sheetName: "Cases Export" },
      );
    });

    it("should handle cases without category", async () => {
      // Arrange
      mockCasesService.findAll.mockResolvedValue({
        data: [mockCaseWithoutRelations],
        total: 1,
        limit: 20,
        offset: 0,
      });
      mockExcelExportService.generateBuffer.mockResolvedValue(Buffer.from(""));

      // Act
      await service.exportCases({}, mockOrgId);

      // Assert
      expect(excelExportService.generateBuffer).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            category: "",
          }),
        ]),
        expect.any(Array),
        expect.any(Object),
      );
    });

    it("should handle cases without assignee", async () => {
      // Arrange
      mockCasesService.findAll.mockResolvedValue({
        data: [mockCaseWithoutRelations],
        total: 1,
        limit: 20,
        offset: 0,
      });
      mockExcelExportService.generateBuffer.mockResolvedValue(Buffer.from(""));

      // Act
      await service.exportCases({}, mockOrgId);

      // Assert
      expect(excelExportService.generateBuffer).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            assignee: "Unassigned",
          }),
        ]),
        expect.any(Array),
        expect.any(Object),
      );
    });

    it("should calculate days open correctly", async () => {
      // Arrange
      const caseCreatedTenDaysAgo = {
        ...mockCase,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      mockCasesService.findAll.mockResolvedValue({
        data: [caseCreatedTenDaysAgo],
        total: 1,
        limit: 20,
        offset: 0,
      });
      mockExcelExportService.generateBuffer.mockResolvedValue(Buffer.from(""));

      // Act
      await service.exportCases({}, mockOrgId);

      // Assert
      expect(excelExportService.generateBuffer).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            daysOpen: 10,
          }),
        ]),
        expect.any(Array),
        expect.any(Object),
      );
    });

    it("should use summary if available, otherwise truncate details", async () => {
      // Arrange
      mockCasesService.findAll.mockResolvedValue({
        data: [mockCase],
        total: 1,
        limit: 20,
        offset: 0,
      });
      mockExcelExportService.generateBuffer.mockResolvedValue(Buffer.from(""));

      // Act
      await service.exportCases({}, mockOrgId);

      // Assert
      expect(excelExportService.generateBuffer).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            summary: "Summary of the case",
          }),
        ]),
        expect.any(Array),
        expect.any(Object),
      );
    });

    it("should truncate details when no summary exists", async () => {
      // Arrange
      const caseWithoutSummary = {
        ...mockCase,
        summary: null,
        details: "A".repeat(150), // Long details
      };
      mockCasesService.findAll.mockResolvedValue({
        data: [caseWithoutSummary],
        total: 1,
        limit: 20,
        offset: 0,
      });
      mockExcelExportService.generateBuffer.mockResolvedValue(Buffer.from(""));

      // Act
      await service.exportCases({}, mockOrgId);

      // Assert
      expect(excelExportService.generateBuffer).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            summary: "A".repeat(100), // Truncated to 100 chars
          }),
        ]),
        expect.any(Array),
        expect.any(Object),
      );
    });

    it("should handle multiple cases", async () => {
      // Arrange
      const case2 = {
        ...mockCase,
        id: "case-2",
        referenceNumber: "ETH-2026-00002",
      };
      mockCasesService.findAll.mockResolvedValue({
        data: [mockCase, case2],
        total: 2,
        limit: 20,
        offset: 0,
      });
      mockExcelExportService.generateBuffer.mockResolvedValue(Buffer.from(""));

      // Act
      await service.exportCases({}, mockOrgId);

      // Assert
      expect(excelExportService.generateBuffer).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ referenceNumber: "ETH-2026-00001" }),
          expect.objectContaining({ referenceNumber: "ETH-2026-00002" }),
        ]),
        expect.any(Array),
        expect.any(Object),
      );
    });

    it("should handle empty result set", async () => {
      // Arrange
      mockCasesService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
      mockExcelExportService.generateBuffer.mockResolvedValue(Buffer.from(""));

      // Act
      await service.exportCases({}, mockOrgId);

      // Assert
      expect(excelExportService.generateBuffer).toHaveBeenCalledWith(
        [],
        expect.any(Array),
        expect.any(Object),
      );
    });

    it("should pass correct column definitions", async () => {
      // Arrange
      mockCasesService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
      mockExcelExportService.generateBuffer.mockResolvedValue(Buffer.from(""));

      // Act
      await service.exportCases({}, mockOrgId);

      // Assert
      expect(excelExportService.generateBuffer).toHaveBeenCalledWith(
        expect.any(Array),
        expect.arrayContaining([
          expect.objectContaining({ key: "referenceNumber", label: "Case #" }),
          expect.objectContaining({ key: "summary", label: "Summary" }),
          expect.objectContaining({ key: "status", label: "Status" }),
          expect.objectContaining({ key: "severity", label: "Severity" }),
          expect.objectContaining({ key: "category", label: "Category" }),
          expect.objectContaining({
            key: "createdAt",
            label: "Created Date",
            type: "date",
          }),
          expect.objectContaining({ key: "assignee", label: "Assignee" }),
          expect.objectContaining({
            key: "daysOpen",
            label: "Days Open",
            type: "number",
          }),
        ]),
        expect.any(Object),
      );
    });
  });

  describe("getFilename", () => {
    it("should return filename with current date", () => {
      // Act
      const filename = service.getFilename();

      // Assert
      expect(filename).toMatch(/^cases-export-\d{4}-\d{2}-\d{2}\.xlsx$/);
    });

    it("should include xlsx extension", () => {
      // Act
      const filename = service.getFilename();

      // Assert
      expect(filename).toContain(".xlsx");
    });
  });

  describe("getContentType", () => {
    it("should return Excel content type", () => {
      // Act
      const contentType = service.getContentType();

      // Assert
      expect(contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    });
  });
});
