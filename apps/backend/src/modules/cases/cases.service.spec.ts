import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CasesService } from "./cases.service";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import { CaseQueryService } from "./services/case-query.service";
import { CaseStatusService } from "./services/case-status.service";
import {
  CaseStatus,
  SourceChannel,
  CaseType,
  Severity,
  ReporterType,
  AuditEntityType,
} from "@prisma/client";
import {
  CaseCreatedEvent,
  CaseUpdatedEvent,
  CaseStatusChangedEvent,
} from "../events/events";

describe("CasesService", () => {
  let service: CasesService;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let caseQueryService: jest.Mocked<CaseQueryService>;
  let caseStatusService: jest.Mocked<CaseStatusService>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockOtherOrgId = "org-other-456";
  const mockUserId = "user-test-123";
  const mockCaseId = "case-test-123";
  const mockReferenceNumber = "ETH-2026-00001";

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
    createdBy: {
      id: mockUserId,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
    },
  };

  const mockCreateDto = {
    sourceChannel: SourceChannel.WEB_FORM,
    caseType: CaseType.REPORT,
    details: "Test case details",
    reporterType: ReporterType.ANONYMOUS,
    severity: Severity.MEDIUM,
  };

  // Mock Setup
  const mockPrismaService = {
    case: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockCaseQueryService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByReferenceNumber: jest.fn(),
    findAllWithFullTextSearch: jest.fn(),
    buildWhereClause: jest.fn(),
    applyFilterCondition: jest.fn(),
    buildOrderByClause: jest.fn(),
  };

  const mockCaseStatusService = {
    updateStatus: jest.fn(),
    close: jest.fn(),
    validateStatusTransition: jest.fn(),
  };

  // Module Setup
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: CaseQueryService, useValue: mockCaseQueryService },
        { provide: CaseStatusService, useValue: mockCaseStatusService },
      ],
    }).compile();

    service = module.get<CasesService>(CasesService);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);
    eventEmitter = module.get(EventEmitter2);
    caseQueryService = module.get(CaseQueryService);
    caseStatusService = module.get(CaseStatusService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // describe('create')
  describe("create", () => {
    it("should create case with correct organizationId", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null); // No existing cases
      mockPrismaService.case.create.mockResolvedValue(mockCase);

      // Act
      const result = await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.case.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId, // CRITICAL: Tenant isolation
          createdById: mockUserId,
          sourceChannel: mockCreateDto.sourceChannel,
          caseType: mockCreateDto.caseType,
        }),
      });
      expect(result).toEqual(mockCase);
    });

    it("should auto-generate reference number in ETH-YYYY-NNNNN format", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null); // No existing cases
      mockPrismaService.case.create.mockResolvedValue(mockCase);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.case.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referenceNumber: expect.stringMatching(/^ETH-\d{4}-\d{5}$/),
        }),
      });
    });

    it("should increment reference number based on existing cases", async () => {
      // Arrange - Existing case with number 00005
      const existingCase = {
        referenceNumber: `ETH-${new Date().getFullYear()}-00005`,
      };
      mockPrismaService.case.findFirst.mockResolvedValue(existingCase);
      mockPrismaService.case.create.mockResolvedValue(mockCase);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert - Should be 00006
      expect(prisma.case.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referenceNumber: `ETH-${new Date().getFullYear()}-00006`,
        }),
      });
    });

    it("should log activity on create", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);
      mockPrismaService.case.create.mockResolvedValue(mockCase);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.CASE,
          entityId: mockCaseId,
          action: "created",
          actionDescription: expect.stringContaining("Created case"),
          actorUserId: mockUserId,
          organizationId: mockOrgId,
        }),
      );
    });

    it("should emit case.created event with correct payload", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);
      mockPrismaService.case.create.mockResolvedValue(mockCase);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CaseCreatedEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
          caseId: mockCaseId,
          referenceNumber: mockReferenceNumber,
          sourceChannel: mockCase.sourceChannel,
          severity: mockCase.severity,
        }),
      );
    });

    it("should set status to NEW by default", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);
      mockPrismaService.case.create.mockResolvedValue(mockCase);

      // Act
      const result = await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(result.status).toBe(CaseStatus.NEW);
    });
  });

  // describe('findOne')
  describe("findOne", () => {
    it("should delegate to CaseQueryService", async () => {
      // Arrange
      mockCaseQueryService.findOne.mockResolvedValue(mockCase);

      // Act
      const result = await service.findOne(mockCaseId, mockOrgId);

      // Assert
      expect(result).toEqual(mockCase);
      expect(caseQueryService.findOne).toHaveBeenCalledWith(
        mockCaseId,
        mockOrgId,
      );
    });

    it("should throw NotFoundException when CaseQueryService throws", async () => {
      // Arrange
      mockCaseQueryService.findOne.mockRejectedValue(
        new NotFoundException(`Case with ID non-existent-id not found`),
      );

      // Act & Assert
      await expect(
        service.findOne("non-existent-id", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when case belongs to different org", async () => {
      // Arrange - CaseQueryService throws for different org
      mockCaseQueryService.findOne.mockRejectedValue(
        new NotFoundException(`Case with ID ${mockCaseId} not found`),
      );

      // Act & Assert
      await expect(service.findOne(mockCaseId, mockOtherOrgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should pass correct parameters to CaseQueryService", async () => {
      // Arrange
      mockCaseQueryService.findOne.mockResolvedValue(mockCase);

      // Act
      await service.findOne(mockCaseId, mockOrgId);

      // Assert - Verify delegation with correct params
      expect(caseQueryService.findOne).toHaveBeenCalledWith(
        mockCaseId,
        mockOrgId,
      );
    });
  });

  // describe('findByReferenceNumber')
  describe("findByReferenceNumber", () => {
    it("should delegate to CaseQueryService", async () => {
      // Arrange
      mockCaseQueryService.findByReferenceNumber.mockResolvedValue(mockCase);

      // Act
      const result = await service.findByReferenceNumber(
        mockReferenceNumber,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mockCase);
      expect(caseQueryService.findByReferenceNumber).toHaveBeenCalledWith(
        mockReferenceNumber,
        mockOrgId,
      );
    });

    it("should throw NotFoundException when CaseQueryService throws", async () => {
      // Arrange
      mockCaseQueryService.findByReferenceNumber.mockRejectedValue(
        new NotFoundException(`Case ETH-2026-99999 not found`),
      );

      // Act & Assert
      await expect(
        service.findByReferenceNumber("ETH-2026-99999", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // describe('findAll')
  describe("findAll", () => {
    it("should delegate to CaseQueryService and return paginated results", async () => {
      // Arrange
      const paginatedResult = {
        data: [mockCase],
        total: 1,
        limit: 20,
        offset: 0,
      };
      mockCaseQueryService.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await service.findAll({ limit: 20, offset: 0 }, mockOrgId);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(caseQueryService.findAll).toHaveBeenCalledWith(
        { limit: 20, offset: 0 },
        mockOrgId,
      );
    });

    it("should pass query parameters to CaseQueryService", async () => {
      // Arrange
      mockCaseQueryService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      // Act
      await service.findAll({ status: CaseStatus.OPEN }, mockOrgId);

      // Assert
      expect(caseQueryService.findAll).toHaveBeenCalledWith(
        { status: CaseStatus.OPEN },
        mockOrgId,
      );
    });

    it("should pass filter parameters to CaseQueryService", async () => {
      // Arrange
      mockCaseQueryService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
      const createdAfter = "2026-01-01";
      const createdBefore = "2026-01-31";

      // Act
      await service.findAll({ createdAfter, createdBefore }, mockOrgId);

      // Assert
      expect(caseQueryService.findAll).toHaveBeenCalledWith(
        { createdAfter, createdBefore },
        mockOrgId,
      );
    });

    it("should pass sourceChannel filter to CaseQueryService", async () => {
      // Arrange
      mockCaseQueryService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      // Act
      await service.findAll(
        { sourceChannel: SourceChannel.HOTLINE },
        mockOrgId,
      );

      // Assert
      expect(caseQueryService.findAll).toHaveBeenCalledWith(
        { sourceChannel: SourceChannel.HOTLINE },
        mockOrgId,
      );
    });

    it("should pass caseType filter to CaseQueryService", async () => {
      // Arrange
      mockCaseQueryService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      // Act
      await service.findAll({ caseType: CaseType.RFI }, mockOrgId);

      // Assert
      expect(caseQueryService.findAll).toHaveBeenCalledWith(
        { caseType: CaseType.RFI },
        mockOrgId,
      );
    });
  });

  // describe('update')
  describe("update", () => {
    it("should update case fields", async () => {
      // Arrange
      const updateDto = { details: "Updated details" };
      const updatedCase = { ...mockCase, details: "Updated details" };

      mockCaseQueryService.findOne.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue(updatedCase);

      // Act
      const result = await service.update(
        mockCaseId,
        updateDto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.details).toBe("Updated details");
    });

    it("should log activity with changes", async () => {
      // Arrange
      const updateDto = { details: "Updated details" };
      const updatedCase = { ...mockCase, details: "Updated details" };

      mockCaseQueryService.findOne.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue(updatedCase);

      // Act
      await service.update(mockCaseId, updateDto, mockUserId, mockOrgId);

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.CASE,
          entityId: mockCaseId,
          action: "updated",
          actorUserId: mockUserId,
          organizationId: mockOrgId,
          changes: expect.any(Object),
        }),
      );
    });

    it("should emit case.updated event", async () => {
      // Arrange
      const updateDto = { details: "Updated details" };
      const updatedCase = { ...mockCase, details: "Updated details" };

      mockCaseQueryService.findOne.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue(updatedCase);

      // Act
      await service.update(mockCaseId, updateDto, mockUserId, mockOrgId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CaseUpdatedEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
          caseId: mockCaseId,
          changes: expect.any(Object),
        }),
      );
    });

    it("should throw NotFoundException for case in different org", async () => {
      // Arrange
      mockCaseQueryService.findOne.mockRejectedValue(
        new NotFoundException(`Case with ID ${mockCaseId} not found`),
      );

      // Act & Assert
      await expect(
        service.update(
          mockCaseId,
          { details: "Hack attempt" },
          mockUserId,
          mockOtherOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // describe('updateStatus')
  describe("updateStatus", () => {
    it("should delegate to CaseStatusService", async () => {
      // Arrange
      const updatedCase = { ...mockCase, status: CaseStatus.OPEN };
      mockCaseStatusService.updateStatus.mockResolvedValue(updatedCase);

      // Act
      const result = await service.updateStatus(
        mockCaseId,
        CaseStatus.OPEN,
        "Starting investigation",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(CaseStatus.OPEN);
      expect(caseStatusService.updateStatus).toHaveBeenCalledWith(
        mockCaseId,
        CaseStatus.OPEN,
        "Starting investigation",
        mockUserId,
        mockOrgId,
      );
    });

    it("should pass all parameters to CaseStatusService", async () => {
      // Arrange
      const updatedCase = { ...mockCase, status: CaseStatus.OPEN };
      mockCaseStatusService.updateStatus.mockResolvedValue(updatedCase);

      // Act
      await service.updateStatus(
        mockCaseId,
        CaseStatus.OPEN,
        "Opening case",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(caseStatusService.updateStatus).toHaveBeenCalledWith(
        mockCaseId,
        CaseStatus.OPEN,
        "Opening case",
        mockUserId,
        mockOrgId,
      );
    });

    it("should propagate errors from CaseStatusService", async () => {
      // Arrange - CaseStatusService throws for invalid transition
      mockCaseStatusService.updateStatus.mockRejectedValue(
        new BadRequestException(`Case is already in NEW status`),
      );

      // Act & Assert - Transitioning to same status should fail
      await expect(
        service.updateStatus(
          mockCaseId,
          CaseStatus.NEW,
          "Invalid transition",
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // describe('close')
  describe("close", () => {
    it("should delegate to CaseStatusService", async () => {
      // Arrange
      const closedCase = { ...mockCase, status: CaseStatus.CLOSED };
      mockCaseStatusService.close.mockResolvedValue(closedCase);

      // Act
      const result = await service.close(
        mockCaseId,
        "Issue resolved",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(CaseStatus.CLOSED);
      expect(caseStatusService.close).toHaveBeenCalledWith(
        mockCaseId,
        "Issue resolved",
        mockUserId,
        mockOrgId,
      );
    });

    it("should pass rationale to CaseStatusService", async () => {
      // Arrange
      const closedCase = { ...mockCase, status: CaseStatus.CLOSED };
      mockCaseStatusService.close.mockResolvedValue(closedCase);

      // Act
      await service.close(
        mockCaseId,
        "Investigation complete - no violation found",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(caseStatusService.close).toHaveBeenCalledWith(
        mockCaseId,
        "Investigation complete - no violation found",
        mockUserId,
        mockOrgId,
      );
    });

    it("should propagate errors from CaseStatusService when already closed", async () => {
      // Arrange
      mockCaseStatusService.close.mockRejectedValue(
        new BadRequestException(`Case is already in CLOSED status`),
      );

      // Act & Assert
      await expect(
        service.close(mockCaseId, "Try to close again", mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // describe('generateReferenceNumber')
  describe("generateReferenceNumber", () => {
    it("should generate format ETH-YYYY-NNNNN", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);
      mockPrismaService.case.create.mockResolvedValue(mockCase);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.case.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referenceNumber: expect.stringMatching(/^ETH-\d{4}-\d{5}$/),
        }),
      });
    });

    it("should increment counter for organization", async () => {
      // Arrange - Existing case with number 00010
      const year = new Date().getFullYear();
      const existingCase = { referenceNumber: `ETH-${year}-00010` };
      mockPrismaService.case.findFirst.mockResolvedValue(existingCase);
      mockPrismaService.case.create.mockResolvedValue({
        ...mockCase,
        referenceNumber: `ETH-${year}-00011`,
      });

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.case.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referenceNumber: `ETH-${year}-00011`,
        }),
      });
    });

    it("should pad number with leading zeros", async () => {
      // Arrange - First case should be 00001
      mockPrismaService.case.findFirst.mockResolvedValue(null);
      mockPrismaService.case.create.mockResolvedValue(mockCase);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      const year = new Date().getFullYear();
      expect(prisma.case.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referenceNumber: `ETH-${year}-00001`,
        }),
      });
    });

    it("should scope reference number to organization", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);
      mockPrismaService.case.create.mockResolvedValue(mockCase);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert - Query for last case should include org filter
      expect(prisma.case.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        }),
      );
    });
  });

  // describe('event emission error handling')
  describe("event emission error handling", () => {
    it("should not fail request if event emission fails", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);
      mockPrismaService.case.create.mockResolvedValue(mockCase);
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error("Event emission failed");
      });

      // Act - Should not throw despite event emission failure
      const result = await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(result).toEqual(mockCase);
    });
  });
});
