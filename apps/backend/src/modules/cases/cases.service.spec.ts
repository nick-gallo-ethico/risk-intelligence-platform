import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CasesService } from "./cases.service";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import { CaseStatus, SourceChannel, CaseType, Severity, ReporterType, AuditEntityType } from "@prisma/client";
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

  // -------------------------------------------------------------------------
  // Test Data Fixtures
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Mock Setup
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Module Setup
  // -------------------------------------------------------------------------
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<CasesService>(CasesService);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);
    eventEmitter = module.get(EventEmitter2);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // describe('create')
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // describe('findOne')
  // -------------------------------------------------------------------------
  describe("findOne", () => {
    it("should return case when found in organization", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);

      // Act
      const result = await service.findOne(mockCaseId, mockOrgId);

      // Assert
      expect(result).toEqual(mockCase);
      expect(prisma.case.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockCaseId,
          organizationId: mockOrgId, // CRITICAL: Tenant isolation
        },
        include: expect.any(Object),
      });
    });

    it("should throw NotFoundException when case does not exist", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne("non-existent-id", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when case belongs to different org", async () => {
      // Arrange - Case exists but query returns null due to org filter
      mockPrismaService.case.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne(mockCaseId, mockOtherOrgId),
      ).rejects.toThrow(NotFoundException);

      // Verify query included the different org filter
      expect(prisma.case.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOtherOrgId,
          }),
        }),
      );
    });

    it("should verify query includes organizationId filter", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);

      // Act
      await service.findOne(mockCaseId, mockOrgId);

      // Assert - CRITICAL: Must always include org filter
      expect(prisma.case.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockCaseId,
            organizationId: mockOrgId,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('findByReferenceNumber')
  // -------------------------------------------------------------------------
  describe("findByReferenceNumber", () => {
    it("should return case when found by reference number", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);

      // Act
      const result = await service.findByReferenceNumber(
        mockReferenceNumber,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mockCase);
      expect(prisma.case.findFirst).toHaveBeenCalledWith({
        where: {
          referenceNumber: mockReferenceNumber,
          organizationId: mockOrgId,
        },
      });
    });

    it("should throw NotFoundException when reference number not found", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findByReferenceNumber("ETH-2026-99999", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // describe('findAll')
  // -------------------------------------------------------------------------
  describe("findAll", () => {
    it("should return paginated results", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([mockCase]);
      mockPrismaService.case.count.mockResolvedValue(1);

      // Act
      const result = await service.findAll({ limit: 20, offset: 0 }, mockOrgId);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("should always filter by organizationId", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({}, mockOrgId);

      // Assert - CRITICAL: Must always include org filter
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        }),
      );
    });

    it("should filter by status when provided", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({ status: CaseStatus.OPEN }, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
            status: CaseStatus.OPEN,
          }),
        }),
      );
    });

    it("should filter by severity when provided", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({ severity: Severity.HIGH }, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
            severity: Severity.HIGH,
          }),
        }),
      );
    });

    it("should filter by dateRange when provided", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);
      const createdAfter = "2026-01-01";
      const createdBefore = "2026-01-31";

      // Act
      await service.findAll({ createdAfter, createdBefore }, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it("should filter by sourceChannel when provided", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({ sourceChannel: SourceChannel.HOTLINE }, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
            sourceChannel: SourceChannel.HOTLINE,
          }),
        }),
      );
    });

    it("should filter by caseType when provided", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({ caseType: CaseType.RFI }, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
            caseType: CaseType.RFI,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('update')
  // -------------------------------------------------------------------------
  describe("update", () => {
    it("should update case fields", async () => {
      // Arrange
      const updateDto = { details: "Updated details" };
      const updatedCase = { ...mockCase, details: "Updated details" };

      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
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

      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
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

      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
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
      mockPrismaService.case.findFirst.mockResolvedValue(null);

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

  // -------------------------------------------------------------------------
  // describe('updateStatus')
  // -------------------------------------------------------------------------
  describe("updateStatus", () => {
    it("should update status with rationale", async () => {
      // Arrange
      const updatedCase = { ...mockCase, status: CaseStatus.OPEN };
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue(updatedCase);

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
      expect(prisma.case.update).toHaveBeenCalledWith({
        where: { id: mockCaseId },
        data: expect.objectContaining({
          status: CaseStatus.OPEN,
          statusRationale: "Starting investigation",
        }),
      });
    });

    it("should emit case.status_changed event", async () => {
      // Arrange
      const updatedCase = { ...mockCase, status: CaseStatus.OPEN };
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue(updatedCase);

      // Act
      await service.updateStatus(
        mockCaseId,
        CaseStatus.OPEN,
        "Opening case",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CaseStatusChangedEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
          caseId: mockCaseId,
          previousStatus: CaseStatus.NEW,
          newStatus: CaseStatus.OPEN,
          rationale: "Opening case",
        }),
      );
    });

    it("should log status change activity", async () => {
      // Arrange
      const updatedCase = { ...mockCase, status: CaseStatus.OPEN };
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue(updatedCase);

      // Act
      await service.updateStatus(
        mockCaseId,
        CaseStatus.OPEN,
        "Opening case",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "status_changed",
          actionDescription: expect.stringContaining("NEW"),
          changes: expect.objectContaining({
            oldValue: { status: CaseStatus.NEW },
            newValue: expect.objectContaining({ status: CaseStatus.OPEN }),
          }),
        }),
      );
    });

    it("should reject invalid status transition when status is same", async () => {
      // Arrange - Case already in NEW status
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);

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

  // -------------------------------------------------------------------------
  // describe('close')
  // -------------------------------------------------------------------------
  describe("close", () => {
    it("should set status to CLOSED", async () => {
      // Arrange
      const openCase = { ...mockCase, status: CaseStatus.OPEN };
      const closedCase = { ...mockCase, status: CaseStatus.CLOSED };
      mockPrismaService.case.findFirst.mockResolvedValue(openCase);
      mockPrismaService.case.update.mockResolvedValue(closedCase);

      // Act
      const result = await service.close(
        mockCaseId,
        "Issue resolved",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(CaseStatus.CLOSED);
    });

    it("should update with rationale", async () => {
      // Arrange
      const openCase = { ...mockCase, status: CaseStatus.OPEN };
      const closedCase = { ...mockCase, status: CaseStatus.CLOSED };
      mockPrismaService.case.findFirst.mockResolvedValue(openCase);
      mockPrismaService.case.update.mockResolvedValue(closedCase);

      // Act
      await service.close(
        mockCaseId,
        "Investigation complete - no violation found",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(prisma.case.update).toHaveBeenCalledWith({
        where: { id: mockCaseId },
        data: expect.objectContaining({
          status: CaseStatus.CLOSED,
          statusRationale: "Investigation complete - no violation found",
        }),
      });
    });

    it("should emit case.status_changed event on close", async () => {
      // Arrange
      const openCase = { ...mockCase, status: CaseStatus.OPEN };
      const closedCase = { ...mockCase, status: CaseStatus.CLOSED };
      mockPrismaService.case.findFirst.mockResolvedValue(openCase);
      mockPrismaService.case.update.mockResolvedValue(closedCase);

      // Act
      await service.close(
        mockCaseId,
        "Issue resolved",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CaseStatusChangedEvent.eventName,
        expect.objectContaining({
          previousStatus: CaseStatus.OPEN,
          newStatus: CaseStatus.CLOSED,
        }),
      );
    });

    it("should throw if case already closed", async () => {
      // Arrange
      const closedCase = { ...mockCase, status: CaseStatus.CLOSED };
      mockPrismaService.case.findFirst.mockResolvedValue(closedCase);

      // Act & Assert
      await expect(
        service.close(mockCaseId, "Try to close again", mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should log close activity", async () => {
      // Arrange
      const openCase = { ...mockCase, status: CaseStatus.OPEN };
      const closedCase = { ...mockCase, status: CaseStatus.CLOSED };
      mockPrismaService.case.findFirst.mockResolvedValue(openCase);
      mockPrismaService.case.update.mockResolvedValue(closedCase);

      // Act
      await service.close(
        mockCaseId,
        "Issue resolved",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "closed",
          actionDescription: expect.stringContaining("Closed case"),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('generateReferenceNumber')
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // describe('event emission error handling')
  // -------------------------------------------------------------------------
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
