import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { InvestigationsService } from "./investigations.service";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import {
  InvestigationStatus,
  InvestigationType,
  InvestigationOutcome,
  InvestigationDepartment,
} from "@prisma/client";

describe("InvestigationsService", () => {
  let service: InvestigationsService;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;

  // -------------------------------------------------------------------------
  // Test Data Fixtures
  // -------------------------------------------------------------------------
  const mockOrgId = "org-test-123";
  const mockOtherOrgId = "org-other-456";
  const mockUserId = "user-test-123";
  const mockCaseId = "case-test-123";
  const mockInvestigationId = "inv-test-123";

  const mockCase = {
    id: mockCaseId,
    referenceNumber: "ETH-2026-00001",
    organizationId: mockOrgId,
  };

  const mockInvestigation = {
    id: mockInvestigationId,
    caseId: mockCaseId,
    organizationId: mockOrgId,
    investigationNumber: 1,
    investigationType: InvestigationType.FULL,
    department: InvestigationDepartment.HR,
    status: InvestigationStatus.NEW,
    assignedTo: [],
    primaryInvestigatorId: null,
    assignedAt: null,
    assignedById: null,
    assignmentHistory: null,
    statusRationale: null,
    statusChangedAt: null,
    dueDate: null,
    slaStatus: "ON_TRACK",
    findingsSummary: null,
    findingsDetail: null,
    outcome: null,
    rootCause: null,
    lessonsLearned: null,
    findingsDate: null,
    closedAt: null,
    closedById: null,
    closureApprovedById: null,
    closureApprovedAt: null,
    closureNotes: null,
    categoryId: null,
    templateId: null,
    templateResponses: null,
    templateCompleted: false,
    sourceSystem: null,
    sourceRecordId: null,
    migratedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: mockUserId,
    updatedById: mockUserId,
  };

  const mockCreateDto = {
    investigationType: InvestigationType.FULL,
    department: InvestigationDepartment.HR,
  };

  // -------------------------------------------------------------------------
  // Mock Setup
  // -------------------------------------------------------------------------
  const mockPrismaService = {
    case: {
      findFirst: jest.fn(),
    },
    investigation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  // -------------------------------------------------------------------------
  // Module Setup
  // -------------------------------------------------------------------------
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestigationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    service = module.get<InvestigationsService>(InvestigationsService);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // describe('create')
  // -------------------------------------------------------------------------
  describe("create", () => {
    it("should create investigation with correct organization", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.investigation.count.mockResolvedValue(0);
      mockPrismaService.investigation.create.mockResolvedValue(
        mockInvestigation,
      );

      // Act
      const result = await service.create(
        mockCreateDto,
        mockCaseId,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(prisma.investigation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caseId: mockCaseId,
          organizationId: mockOrgId, // CRITICAL: Org from case
          investigationType: mockCreateDto.investigationType,
          status: InvestigationStatus.NEW,
          createdById: mockUserId,
        }),
      });
      expect(result).toEqual(mockInvestigation);
    });

    it("should auto-generate investigation number", async () => {
      // Arrange - 2 existing investigations
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.investigation.count.mockResolvedValue(2);
      mockPrismaService.investigation.create.mockResolvedValue({
        ...mockInvestigation,
        investigationNumber: 3,
      });

      // Act
      await service.create(mockCreateDto, mockCaseId, mockUserId, mockOrgId);

      // Assert - Should be investigation number 3
      expect(prisma.investigation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          investigationNumber: 3,
        }),
      });
    });

    it("should throw NotFoundException when case does not exist", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.create(mockCreateDto, mockCaseId, mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should verify case belongs to organization", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null); // Case exists but wrong org

      // Act & Assert
      await expect(
        service.create(mockCreateDto, mockCaseId, mockUserId, mockOtherOrgId),
      ).rejects.toThrow(NotFoundException);

      // Verify query included org filter
      expect(prisma.case.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockCaseId,
          organizationId: mockOtherOrgId,
        },
        select: expect.any(Object),
      });
    });

    it("should log activity on create", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.investigation.count.mockResolvedValue(0);
      mockPrismaService.investigation.create.mockResolvedValue(
        mockInvestigation,
      );

      // Act
      await service.create(mockCreateDto, mockCaseId, mockUserId, mockOrgId);

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "INVESTIGATION",
          entityId: mockInvestigationId,
          action: "created",
          actorUserId: mockUserId,
          organizationId: mockOrgId,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('findOne')
  // -------------------------------------------------------------------------
  describe("findOne", () => {
    it("should return investigation when found in organization", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation,
      );

      // Act
      const result = await service.findOne(mockInvestigationId, mockOrgId);

      // Assert
      expect(result).toEqual(mockInvestigation);
      expect(prisma.investigation.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockInvestigationId,
          organizationId: mockOrgId, // CRITICAL: Must filter by org
        },
        include: expect.any(Object),
      });
    });

    it("should throw NotFoundException when investigation does not exist", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne("non-existent-id", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should not find investigation from different org", async () => {
      // Arrange - Investigation exists but query returns null due to org filter
      mockPrismaService.investigation.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne(mockInvestigationId, mockOtherOrgId),
      ).rejects.toThrow(NotFoundException);

      // Verify query included the different org filter
      expect(prisma.investigation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOtherOrgId,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('findAllForCase')
  // -------------------------------------------------------------------------
  describe("findAllForCase", () => {
    it("should return paginated results filtered by case and org", async () => {
      // Arrange
      mockPrismaService.investigation.findMany.mockResolvedValue([
        mockInvestigation,
      ]);
      mockPrismaService.investigation.count.mockResolvedValue(1);

      // Act
      const result = await service.findAllForCase(
        mockCaseId,
        { limit: 20, page: 1 },
        mockOrgId,
      );

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.investigation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            caseId: mockCaseId,
            organizationId: mockOrgId, // CRITICAL: Tenant isolation
          }),
        }),
      );
    });

    it("should filter by status when provided", async () => {
      // Arrange
      mockPrismaService.investigation.findMany.mockResolvedValue([]);
      mockPrismaService.investigation.count.mockResolvedValue(0);

      // Act
      await service.findAllForCase(
        mockCaseId,
        { status: InvestigationStatus.INVESTIGATING },
        mockOrgId,
      );

      // Assert
      expect(prisma.investigation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: InvestigationStatus.INVESTIGATING,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('assign')
  // -------------------------------------------------------------------------
  describe("assign", () => {
    it("should update assignment history on assign", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation,
      );
      mockPrismaService.investigation.update.mockResolvedValue({
        ...mockInvestigation,
        assignedTo: ["user-1", "user-2"],
        primaryInvestigatorId: "user-1",
        status: InvestigationStatus.ASSIGNED,
      });

      const assignDto = {
        assignedTo: ["user-1", "user-2"],
        primaryInvestigatorId: "user-1",
      };

      // Act
      await service.assign(
        mockInvestigationId,
        assignDto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(prisma.investigation.update).toHaveBeenCalledWith({
        where: { id: mockInvestigationId },
        data: expect.objectContaining({
          assignedTo: assignDto.assignedTo,
          primaryInvestigatorId: assignDto.primaryInvestigatorId,
          assignmentHistory: expect.arrayContaining([
            expect.objectContaining({
              assignedTo: assignDto.assignedTo,
              primaryInvestigatorId: assignDto.primaryInvestigatorId,
              assignedById: mockUserId,
            }),
          ]),
        }),
      });
    });

    it("should transition from NEW to ASSIGNED on first assignment", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.NEW,
      });
      mockPrismaService.investigation.update.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.ASSIGNED,
      });

      // Act
      await service.assign(
        mockInvestigationId,
        { assignedTo: ["user-1"], primaryInvestigatorId: "user-1" },
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(prisma.investigation.update).toHaveBeenCalledWith({
        where: { id: mockInvestigationId },
        data: expect.objectContaining({
          status: InvestigationStatus.ASSIGNED,
        }),
      });
    });

    it("should not change status if already past NEW", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.INVESTIGATING,
      });
      mockPrismaService.investigation.update.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.INVESTIGATING,
      });

      // Act
      await service.assign(
        mockInvestigationId,
        { assignedTo: ["user-1"], primaryInvestigatorId: "user-1" },
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(prisma.investigation.update).toHaveBeenCalledWith({
        where: { id: mockInvestigationId },
        data: expect.objectContaining({
          status: InvestigationStatus.INVESTIGATING, // Unchanged
        }),
      });
    });

    it("should reject if primary investigator not in assignedTo list", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation,
      );

      // Act & Assert
      await expect(
        service.assign(
          mockInvestigationId,
          { assignedTo: ["user-1"], primaryInvestigatorId: "user-other" },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // describe('transition')
  // -------------------------------------------------------------------------
  describe("transition", () => {
    it("should validate status transitions", async () => {
      // Arrange - Investigation in NEW status
      mockPrismaService.investigation.findFirst.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.NEW,
      });
      mockPrismaService.investigation.update.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.ASSIGNED,
      });

      // Act - Valid transition NEW -> ASSIGNED
      const result = await service.transition(
        mockInvestigationId,
        { status: InvestigationStatus.ASSIGNED, rationale: "Test transition" },
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(InvestigationStatus.ASSIGNED);
    });

    it("should reject invalid transition NEW -> CLOSED", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.NEW,
      });

      // Act & Assert - Invalid transition
      await expect(
        service.transition(
          mockInvestigationId,
          {
            status: InvestigationStatus.CLOSED,
            rationale: "Invalid transition",
          },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject transition from CLOSED", async () => {
      // Arrange - CLOSED is terminal
      mockPrismaService.investigation.findFirst.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.CLOSED,
      });

      // Act & Assert
      await expect(
        service.transition(
          mockInvestigationId,
          { status: InvestigationStatus.INVESTIGATING, rationale: "Reopen" },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow ON_HOLD from any non-terminal status", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.INVESTIGATING,
      });
      mockPrismaService.investigation.update.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.ON_HOLD,
      });

      // Act
      const result = await service.transition(
        mockInvestigationId,
        { status: InvestigationStatus.ON_HOLD, rationale: "Awaiting info" },
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(InvestigationStatus.ON_HOLD);
    });

    it("should log status change with rationale", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.ASSIGNED,
      });
      mockPrismaService.investigation.update.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.INVESTIGATING,
      });

      // Act
      await service.transition(
        mockInvestigationId,
        {
          status: InvestigationStatus.INVESTIGATING,
          rationale: "Starting work",
        },
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "status_changed",
          actionDescription: expect.stringContaining("Starting work"),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('close')
  // -------------------------------------------------------------------------
  describe("close", () => {
    it("should require findings before closing", async () => {
      // Arrange - Investigation in PENDING_REVIEW but no findings
      mockPrismaService.investigation.findFirst.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.PENDING_REVIEW,
        findingsSummary: null,
        outcome: null,
      });

      // Act - Try to close via transition (should fail)
      await expect(
        service.transition(
          mockInvestigationId,
          {
            status: InvestigationStatus.CLOSED,
            rationale: "Close without findings",
          },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should close investigation with findings", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.PENDING_REVIEW,
      });
      mockPrismaService.investigation.update.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.CLOSED,
        outcome: InvestigationOutcome.SUBSTANTIATED,
      });

      // Act
      const result = await service.close(
        mockInvestigationId,
        {
          findingsSummary: "Issue confirmed",
          outcome: InvestigationOutcome.SUBSTANTIATED,
        },
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(InvestigationStatus.CLOSED);
      expect(prisma.investigation.update).toHaveBeenCalledWith({
        where: { id: mockInvestigationId },
        data: expect.objectContaining({
          status: InvestigationStatus.CLOSED,
          findingsSummary: "Issue confirmed",
          outcome: InvestigationOutcome.SUBSTANTIATED,
          closedById: mockUserId,
        }),
      });
    });

    it("should reject close from invalid status", async () => {
      // Arrange - Can't close from NEW
      mockPrismaService.investigation.findFirst.mockResolvedValue({
        ...mockInvestigation,
        status: InvestigationStatus.NEW,
      });

      // Act & Assert
      await expect(
        service.close(
          mockInvestigationId,
          {
            findingsSummary: "Findings",
            outcome: InvestigationOutcome.SUBSTANTIATED,
          },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // describe('recordFindings')
  // -------------------------------------------------------------------------
  describe("recordFindings", () => {
    it("should record findings and log activity", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation,
      );
      mockPrismaService.investigation.update.mockResolvedValue({
        ...mockInvestigation,
        findingsSummary: "Confirmed harassment",
        outcome: InvestigationOutcome.SUBSTANTIATED,
      });

      // Act
      await service.recordFindings(
        mockInvestigationId,
        {
          findingsSummary: "Confirmed harassment",
          outcome: InvestigationOutcome.SUBSTANTIATED,
          rootCause: "Management failure",
        },
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(prisma.investigation.update).toHaveBeenCalledWith({
        where: { id: mockInvestigationId },
        data: expect.objectContaining({
          findingsSummary: "Confirmed harassment",
          outcome: InvestigationOutcome.SUBSTANTIATED,
          rootCause: "Management failure",
        }),
      });

      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "findings_recorded",
          actionDescription: expect.stringContaining("SUBSTANTIATED"),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('getNextInvestigationNumber')
  // -------------------------------------------------------------------------
  describe("getNextInvestigationNumber", () => {
    it("should return 1 for first investigation", async () => {
      // Arrange
      mockPrismaService.investigation.count.mockResolvedValue(0);

      // Act
      const result = await service.getNextInvestigationNumber(
        mockCaseId,
        mockOrgId,
      );

      // Assert
      expect(result).toBe(1);
    });

    it("should increment based on existing count", async () => {
      // Arrange
      mockPrismaService.investigation.count.mockResolvedValue(5);

      // Act
      const result = await service.getNextInvestigationNumber(
        mockCaseId,
        mockOrgId,
      );

      // Assert
      expect(result).toBe(6);
    });

    it("should filter count by organization", async () => {
      // Arrange
      mockPrismaService.investigation.count.mockResolvedValue(2);

      // Act
      await service.getNextInvestigationNumber(mockCaseId, mockOrgId);

      // Assert
      expect(prisma.investigation.count).toHaveBeenCalledWith({
        where: {
          caseId: mockCaseId,
          organizationId: mockOrgId, // CRITICAL: Tenant isolation
        },
      });
    });
  });
});
