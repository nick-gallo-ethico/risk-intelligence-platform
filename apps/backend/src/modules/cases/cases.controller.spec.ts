import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Response } from "express";
import { CasesController } from "./cases.controller";
import { CasesService } from "./cases.service";
import { CaseMergeService } from "./case-merge.service";
import { CaseExportService } from "./services/case-export.service";
import { ActivityService } from "../../common/services/activity.service";
import {
  CaseStatus,
  SourceChannel,
  CaseType,
  Severity,
  ReporterType,
  AuditEntityType,
  UserRole,
} from "@prisma/client";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";

describe("CasesController", () => {
  let controller: CasesController;
  let casesService: jest.Mocked<CasesService>;
  let caseMergeService: jest.Mocked<CaseMergeService>;
  let caseExportService: jest.Mocked<CaseExportService>;
  let activityService: jest.Mocked<ActivityService>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockCaseId = "case-test-123";
  const mockReferenceNumber = "ETH-2026-00001";

  const mockUser: RequestUser = {
    id: mockUserId,
    email: "test@example.com",
    organizationId: mockOrgId,
    role: UserRole.COMPLIANCE_OFFICER,
    sessionId: "session-123",
    firstName: "Test",
    lastName: "User",
    mfaVerified: true,
  };

  const mockCase = {
    id: mockCaseId,
    referenceNumber: mockReferenceNumber,
    organizationId: mockOrgId,
    status: CaseStatus.NEW,
    sourceChannel: SourceChannel.WEB_FORM,
    caseType: CaseType.REPORT,
    details: "Test case details",
    reporterType: ReporterType.ANONYMOUS,
    severity: Severity.MEDIUM,
    primaryCategoryId: null,
    secondaryCategoryId: null,
    createdById: mockUserId,
    updatedById: mockUserId,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  };

  const mockCreateDto = {
    sourceChannel: SourceChannel.WEB_FORM,
    caseType: CaseType.REPORT,
    details: "Test case details",
    reporterType: ReporterType.ANONYMOUS,
    severity: Severity.MEDIUM,
  };

  // Mock Setup
  const mockCasesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByReferenceNumber: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    close: jest.fn(),
  };

  const mockCaseMergeService = {
    merge: jest.fn(),
    getMergeHistory: jest.fn(),
    canMerge: jest.fn(),
  };

  const mockCaseExportService = {
    exportCases: jest.fn(),
    getFilename: jest.fn(),
    getContentType: jest.fn(),
  };

  const mockActivityService = {
    getEntityTimeline: jest.fn(),
    pinActivity: jest.fn(),
    getStatusHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CasesController],
      providers: [
        { provide: CasesService, useValue: mockCasesService },
        { provide: CaseMergeService, useValue: mockCaseMergeService },
        { provide: CaseExportService, useValue: mockCaseExportService },
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    controller = module.get<CasesController>(CasesController);
    casesService = module.get(CasesService);
    caseMergeService = module.get(CaseMergeService);
    caseExportService = module.get(CaseExportService);
    activityService = module.get(ActivityService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a case and return it", async () => {
      // Arrange
      mockCasesService.create.mockResolvedValue(mockCase);

      // Act
      const result = await controller.create(
        mockCreateDto,
        mockUser,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mockCase);
      expect(casesService.create).toHaveBeenCalledWith(
        mockCreateDto,
        mockUserId,
        mockOrgId,
      );
    });

    it("should pass user id and org id to service", async () => {
      // Arrange
      mockCasesService.create.mockResolvedValue(mockCase);

      // Act
      await controller.create(mockCreateDto, mockUser, mockOrgId);

      // Assert
      expect(casesService.create).toHaveBeenCalledWith(
        mockCreateDto,
        mockUser.id,
        mockOrgId,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated list of cases", async () => {
      // Arrange
      const paginatedResult = {
        data: [mockCase],
        total: 1,
        limit: 20,
        offset: 0,
      };
      mockCasesService.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await controller.findAll(
        { limit: 20, offset: 0 },
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(paginatedResult);
    });

    it("should pass query parameters to service", async () => {
      // Arrange
      mockCasesService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
      const query = { status: CaseStatus.OPEN, limit: 10, offset: 5 };

      // Act
      await controller.findAll(query, mockOrgId);

      // Assert
      expect(casesService.findAll).toHaveBeenCalledWith(query, mockOrgId);
    });
  });

  describe("findOne", () => {
    it("should return case by id", async () => {
      // Arrange
      mockCasesService.findOne.mockResolvedValue(mockCase);

      // Act
      const result = await controller.findOne(mockCaseId, mockOrgId);

      // Assert
      expect(result).toEqual(mockCase);
    });

    it("should throw NotFoundException when case not found", async () => {
      // Arrange
      mockCasesService.findOne.mockRejectedValue(
        new NotFoundException(`Case with ID non-existent not found`),
      );

      // Act & Assert
      await expect(
        controller.findOne("non-existent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByReference", () => {
    it("should return case by reference number", async () => {
      // Arrange
      mockCasesService.findByReferenceNumber.mockResolvedValue(mockCase);

      // Act
      const result = await controller.findByReference(
        mockReferenceNumber,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mockCase);
      expect(casesService.findByReferenceNumber).toHaveBeenCalledWith(
        mockReferenceNumber,
        mockOrgId,
      );
    });

    it("should throw NotFoundException when case not found", async () => {
      // Arrange
      mockCasesService.findByReferenceNumber.mockRejectedValue(
        new NotFoundException("Case ETH-2026-99999 not found"),
      );

      // Act & Assert
      await expect(
        controller.findByReference("ETH-2026-99999", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update and return case", async () => {
      // Arrange
      const updateDto = { details: "Updated details" };
      const updatedCase = { ...mockCase, details: "Updated details" };
      mockCasesService.update.mockResolvedValue(updatedCase);

      // Act
      const result = await controller.update(
        mockCaseId,
        updateDto,
        mockUser,
        mockOrgId,
      );

      // Assert
      expect(result.details).toBe("Updated details");
    });

    it("should pass correct parameters to service", async () => {
      // Arrange
      const updateDto = { severity: Severity.HIGH };
      mockCasesService.update.mockResolvedValue(mockCase);

      // Act
      await controller.update(mockCaseId, updateDto, mockUser, mockOrgId);

      // Assert
      expect(casesService.update).toHaveBeenCalledWith(
        mockCaseId,
        updateDto,
        mockUser.id,
        mockOrgId,
      );
    });
  });

  describe("partialUpdate", () => {
    it("should call update with partial data", async () => {
      // Arrange
      const updateDto = { summary: "New summary" };
      mockCasesService.update.mockResolvedValue(mockCase);

      // Act
      await controller.partialUpdate(
        mockCaseId,
        updateDto,
        mockUser,
        mockOrgId,
      );

      // Assert
      expect(casesService.update).toHaveBeenCalledWith(
        mockCaseId,
        updateDto,
        mockUser.id,
        mockOrgId,
      );
    });
  });

  describe("updateStatus", () => {
    it("should update case status", async () => {
      // Arrange
      const statusDto = {
        status: CaseStatus.OPEN,
        rationale: "Starting investigation",
      };
      const updatedCase = { ...mockCase, status: CaseStatus.OPEN };
      mockCasesService.updateStatus.mockResolvedValue(updatedCase);

      // Act
      const result = await controller.updateStatus(
        mockCaseId,
        statusDto,
        mockUser,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(CaseStatus.OPEN);
    });

    it("should pass all parameters to service", async () => {
      // Arrange
      const statusDto = {
        status: CaseStatus.OPEN,
        rationale: "Investigation started",
      };
      mockCasesService.updateStatus.mockResolvedValue(mockCase);

      // Act
      await controller.updateStatus(mockCaseId, statusDto, mockUser, mockOrgId);

      // Assert
      expect(casesService.updateStatus).toHaveBeenCalledWith(
        mockCaseId,
        CaseStatus.OPEN,
        "Investigation started",
        mockUser.id,
        mockOrgId,
      );
    });

    it("should throw BadRequestException for invalid transition", async () => {
      // Arrange
      mockCasesService.updateStatus.mockRejectedValue(
        new BadRequestException("Case is already in NEW status"),
      );

      // Act & Assert
      await expect(
        controller.updateStatus(
          mockCaseId,
          { status: CaseStatus.NEW, rationale: "Test" },
          mockUser,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("close", () => {
    it("should close case", async () => {
      // Arrange
      const closedCase = { ...mockCase, status: CaseStatus.CLOSED };
      mockCasesService.close.mockResolvedValue(closedCase);

      // Act
      const result = await controller.close(
        mockCaseId,
        { rationale: "Investigation complete" },
        mockUser,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(CaseStatus.CLOSED);
    });

    it("should pass rationale to service", async () => {
      // Arrange
      mockCasesService.close.mockResolvedValue(mockCase);

      // Act
      await controller.close(
        mockCaseId,
        { rationale: "No violation found" },
        mockUser,
        mockOrgId,
      );

      // Assert
      expect(casesService.close).toHaveBeenCalledWith(
        mockCaseId,
        "No violation found",
        mockUser.id,
        mockOrgId,
      );
    });
  });

  describe("mergeCases", () => {
    it("should merge cases and return result", async () => {
      // Arrange
      const mergeResult = {
        sourceCaseId: "source-123",
        targetCaseId: mockCaseId,
        sourceReferenceNumber: "ETH-2026-00001",
        targetReferenceNumber: "ETH-2026-00002",
        riuAssociationsMoved: 2,
        subjectsMoved: 3,
        investigationsMoved: 1,
        mergedAt: new Date(),
      };
      mockCaseMergeService.merge.mockResolvedValue(mergeResult);

      // Act
      const result = await controller.mergeCases(
        mockCaseId,
        { sourceCaseId: "source-123", reason: "Related reports" },
        mockUser,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mergeResult);
    });

    it("should pass correct parameters to merge service", async () => {
      // Arrange
      mockCaseMergeService.merge.mockResolvedValue({
        sourceCaseId: "source-123",
        targetCaseId: mockCaseId,
      });

      // Act
      await controller.mergeCases(
        mockCaseId,
        { sourceCaseId: "source-123", reason: "Duplicate report" },
        mockUser,
        mockOrgId,
      );

      // Assert
      expect(caseMergeService.merge).toHaveBeenCalledWith(
        {
          sourceCaseId: "source-123",
          targetCaseId: mockCaseId,
          reason: "Duplicate report",
        },
        mockUser.id,
        mockOrgId,
      );
    });
  });

  describe("getMergeHistory", () => {
    it("should return merge history for case", async () => {
      // Arrange
      const history = [
        {
          mergedCaseId: "merged-case-123",
          mergedCaseReferenceNumber: "ETH-2026-00003",
          reason: "Duplicate report",
          mergedAt: new Date(),
          mergedBy: { id: mockUserId, firstName: "John", lastName: "Doe" },
        },
      ];
      mockCaseMergeService.getMergeHistory.mockResolvedValue(history);

      // Act
      const result = await controller.getMergeHistory(mockCaseId, mockOrgId);

      // Assert
      expect(result).toEqual(history);
      expect(caseMergeService.getMergeHistory).toHaveBeenCalledWith(
        mockCaseId,
        mockOrgId,
      );
    });
  });

  describe("canMerge", () => {
    it("should return merge feasibility check result", async () => {
      // Arrange
      mockCaseMergeService.canMerge.mockResolvedValue({ canMerge: true });

      // Act
      const result = await controller.canMerge(
        "source-123",
        mockCaseId,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual({ canMerge: true });
    });

    it("should return reason when merge not allowed", async () => {
      // Arrange
      mockCaseMergeService.canMerge.mockResolvedValue({
        canMerge: false,
        reason: "Source case already merged",
      });

      // Act
      const result = await controller.canMerge(
        "source-123",
        mockCaseId,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual({
        canMerge: false,
        reason: "Source case already merged",
      });
    });
  });

  describe("getActivity", () => {
    it("should return activity timeline", async () => {
      // Arrange
      mockCasesService.findOne.mockResolvedValue(mockCase);
      const timeline = {
        data: [
          {
            id: "activity-1",
            action: "created",
            actionDescription: "Case created",
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockActivityService.getEntityTimeline.mockResolvedValue(timeline);

      // Act
      const result = await controller.getActivity(mockCaseId, 1, 20, mockOrgId);

      // Assert
      expect(result).toEqual(timeline);
    });

    it("should verify case exists before getting activity", async () => {
      // Arrange
      mockCasesService.findOne.mockResolvedValue(mockCase);
      mockActivityService.getEntityTimeline.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      // Act
      await controller.getActivity(mockCaseId, 1, 20, mockOrgId);

      // Assert
      expect(casesService.findOne).toHaveBeenCalledWith(mockCaseId, mockOrgId);
    });

    it("should call activity service with correct parameters", async () => {
      // Arrange
      mockCasesService.findOne.mockResolvedValue(mockCase);
      mockActivityService.getEntityTimeline.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      // Act
      await controller.getActivity(mockCaseId, 2, 50, mockOrgId);

      // Assert
      expect(activityService.getEntityTimeline).toHaveBeenCalledWith(
        AuditEntityType.CASE,
        mockCaseId,
        mockOrgId,
        { page: 2, limit: 50 },
      );
    });
  });

  describe("pinActivity", () => {
    it("should pin activity and return success", async () => {
      // Arrange
      mockCasesService.findOne.mockResolvedValue(mockCase);
      mockActivityService.pinActivity.mockResolvedValue({
        id: "activity-1",
        context: { isPinned: true },
      });

      // Act
      const result = await controller.pinActivity(
        mockCaseId,
        "activity-1",
        { isPinned: true },
        mockOrgId,
      );

      // Assert
      expect(result).toEqual({ success: true, isPinned: true });
    });

    it("should unpin activity", async () => {
      // Arrange
      mockCasesService.findOne.mockResolvedValue(mockCase);
      mockActivityService.pinActivity.mockResolvedValue({
        id: "activity-1",
        context: { isPinned: false },
      });

      // Act
      const result = await controller.pinActivity(
        mockCaseId,
        "activity-1",
        { isPinned: false },
        mockOrgId,
      );

      // Assert
      expect(result).toEqual({ success: true, isPinned: false });
    });

    it("should return failure when activity not found", async () => {
      // Arrange
      mockCasesService.findOne.mockResolvedValue(mockCase);
      mockActivityService.pinActivity.mockResolvedValue(null);

      // Act
      const result = await controller.pinActivity(
        mockCaseId,
        "non-existent",
        { isPinned: true },
        mockOrgId,
      );

      // Assert
      expect(result).toEqual({ success: false, isPinned: false });
    });
  });

  describe("getStatusHistory", () => {
    it("should return status history", async () => {
      // Arrange
      mockCasesService.findOne.mockResolvedValue(mockCase);
      const statusHistory = [
        {
          id: "1",
          fromStatus: CaseStatus.NEW,
          toStatus: CaseStatus.OPEN,
          changedAt: new Date(),
        },
      ];
      mockActivityService.getStatusHistory.mockResolvedValue(statusHistory);

      // Act
      const result = await controller.getStatusHistory(mockCaseId, mockOrgId);

      // Assert
      expect(result).toEqual(statusHistory);
    });

    it("should verify case exists before getting status history", async () => {
      // Arrange
      mockCasesService.findOne.mockResolvedValue(mockCase);
      mockActivityService.getStatusHistory.mockResolvedValue([]);

      // Act
      await controller.getStatusHistory(mockCaseId, mockOrgId);

      // Assert
      expect(casesService.findOne).toHaveBeenCalledWith(mockCaseId, mockOrgId);
    });
  });

  describe("exportCases", () => {
    it("should export cases to Excel", async () => {
      // Arrange
      const mockBuffer = Buffer.from("excel-data");
      mockCaseExportService.exportCases.mockResolvedValue(mockBuffer);
      mockCaseExportService.getContentType.mockReturnValue(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      mockCaseExportService.getFilename.mockReturnValue(
        "cases-export-2026-01-15.xlsx",
      );

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      // Act
      await controller.exportCases(
        { format: "excel" },
        { status: CaseStatus.OPEN },
        mockOrgId,
        mockResponse,
      );

      // Assert
      expect(caseExportService.exportCases).toHaveBeenCalledWith(
        { status: CaseStatus.OPEN },
        mockOrgId,
        { format: "excel" },
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockBuffer);
    });

    it("should set Content-Disposition header with filename", async () => {
      // Arrange
      mockCaseExportService.exportCases.mockResolvedValue(Buffer.from("data"));
      mockCaseExportService.getContentType.mockReturnValue("text/csv");
      mockCaseExportService.getFilename.mockReturnValue("cases-export.csv");

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      // Act
      await controller.exportCases({}, {}, mockOrgId, mockResponse);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="cases-export.csv"',
      );
    });
  });
});
