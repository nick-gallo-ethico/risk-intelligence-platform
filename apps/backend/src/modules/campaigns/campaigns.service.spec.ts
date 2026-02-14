import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { CampaignsService } from "./campaigns.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { SegmentService } from "./targeting/segment.service";
import { CampaignAssignmentService } from "./assignments/campaign-assignment.service";
import { CampaignStatus, CampaignType, AudienceMode } from "@prisma/client";

describe("CampaignsService", () => {
  let service: CampaignsService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;
  let segmentService: jest.Mocked<SegmentService>;
  let assignmentService: jest.Mocked<CampaignAssignmentService>;

  // -------------------------------------------------------------------------
  // Test Data Fixtures
  // -------------------------------------------------------------------------
  const mockOrgId = "org-test-123";
  const mockOtherOrgId = "org-other-456";
  const mockUserId = "user-test-123";
  const mockCampaignId = "campaign-test-123";
  const mockSegmentId = "segment-test-123";
  const mockFormDefId = "form-def-123";

  const mockCampaign = {
    id: mockCampaignId,
    organizationId: mockOrgId,
    name: "Q1 2026 COI Disclosure",
    description: "Annual conflict of interest disclosure",
    type: CampaignType.DISCLOSURE,
    status: CampaignStatus.DRAFT,
    audienceMode: AudienceMode.SEGMENT,
    segmentId: mockSegmentId,
    manualIds: [],
    dueDate: new Date("2026-03-31"),
    launchAt: null,
    launchedAt: null,
    launchedById: null,
    expiresAt: null,
    formDefinitionId: mockFormDefId,
    reminderDays: [7, 3, 1],
    escalationAfterDays: 3,
    escalateToUserId: null,
    autoCreateCase: false,
    caseCreationThreshold: null,
    totalAssignments: 0,
    completedAssignments: 0,
    overdueAssignments: 0,
    completionPercentage: 0,
    statusNote: null,
    createdById: mockUserId,
    updatedById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateDto = {
    name: "Q1 2026 COI Disclosure",
    description: "Annual conflict of interest disclosure",
    type: CampaignType.DISCLOSURE,
    audienceMode: AudienceMode.SEGMENT,
    segmentId: mockSegmentId,
    dueDate: "2026-03-31",
    formDefinitionId: mockFormDefId,
    reminderDays: [7, 3, 1],
  };

  // -------------------------------------------------------------------------
  // Mock Setup
  // -------------------------------------------------------------------------
  const mockPrismaService = {
    campaign: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockSegmentService = {
    evaluateSegment: jest.fn(),
  };

  const mockAssignmentService = {
    generateAssignments: jest.fn(),
    syncOverdueStatus: jest.fn(),
  };

  // -------------------------------------------------------------------------
  // Module Setup
  // -------------------------------------------------------------------------
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: SegmentService, useValue: mockSegmentService },
        { provide: CampaignAssignmentService, useValue: mockAssignmentService },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
    segmentService = module.get(SegmentService);
    assignmentService = module.get(CampaignAssignmentService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // describe('create')
  // -------------------------------------------------------------------------
  describe("create", () => {
    it("should create campaign with correct organizationId", async () => {
      // Arrange
      mockPrismaService.campaign.create.mockResolvedValue(mockCampaign);

      // Act
      const result = await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.campaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId, // CRITICAL: Org from parameter
          name: mockCreateDto.name,
          type: mockCreateDto.type,
          createdById: mockUserId,
        }),
      });
      expect(result).toEqual(mockCampaign);
    });

    it("should set status to DRAFT by default", async () => {
      // Arrange
      mockPrismaService.campaign.create.mockResolvedValue(mockCampaign);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.campaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: CampaignStatus.DRAFT,
        }),
      });
    });

    it("should log audit on create", async () => {
      // Arrange
      mockPrismaService.campaign.create.mockResolvedValue(mockCampaign);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: mockCampaignId,
          action: "created",
          actorUserId: mockUserId,
          organizationId: mockOrgId,
        }),
      );
    });

    it("should throw BadRequestException if SEGMENT mode without segmentId", async () => {
      // Arrange
      const invalidDto = {
        ...mockCreateDto,
        audienceMode: AudienceMode.SEGMENT,
        segmentId: undefined,
      };

      // Act & Assert
      await expect(
        service.create(invalidDto, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if MANUAL mode without manualIds", async () => {
      // Arrange
      const invalidDto = {
        ...mockCreateDto,
        audienceMode: AudienceMode.MANUAL,
        segmentId: undefined,
        manualIds: undefined,
      };

      // Act & Assert
      await expect(
        service.create(invalidDto, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // describe('findOne')
  // -------------------------------------------------------------------------
  describe("findOne", () => {
    it("should return campaign when found in organization", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);

      // Act
      const result = await service.findOne(mockCampaignId, mockOrgId);

      // Assert
      expect(result).toEqual(mockCampaign);
      expect(prisma.campaign.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockCampaignId,
          organizationId: mockOrgId, // CRITICAL: Must filter by org
        },
        include: expect.any(Object),
      });
    });

    it("should throw NotFoundException when campaign does not exist", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne("non-existent-id", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when campaign belongs to different org", async () => {
      // Arrange - Campaign exists but query returns null due to org filter
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne(mockCampaignId, mockOtherOrgId),
      ).rejects.toThrow(NotFoundException);

      // Verify query included the different org filter
      expect(prisma.campaign.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOtherOrgId,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('findAll')
  // -------------------------------------------------------------------------
  describe("findAll", () => {
    it("should return paginated results", async () => {
      // Arrange
      const campaignWithCount = { ...mockCampaign, _count: { assignments: 5 } };
      mockPrismaService.campaign.findMany.mockResolvedValue([
        campaignWithCount,
      ]);
      mockPrismaService.campaign.count.mockResolvedValue(1);

      // Act
      const result = await service.findAll(mockOrgId, { skip: 0, take: 20 });

      // Assert
      expect(result.campaigns).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should always filter by organizationId", async () => {
      // Arrange
      mockPrismaService.campaign.findMany.mockResolvedValue([]);
      mockPrismaService.campaign.count.mockResolvedValue(0);

      // Act
      await service.findAll(mockOrgId);

      // Assert - CRITICAL: Must always include org filter
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        }),
      );
    });

    it("should filter by status when provided", async () => {
      // Arrange
      mockPrismaService.campaign.findMany.mockResolvedValue([]);
      mockPrismaService.campaign.count.mockResolvedValue(0);

      // Act
      await service.findAll(mockOrgId, { status: CampaignStatus.ACTIVE });

      // Assert
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CampaignStatus.ACTIVE,
          }),
        }),
      );
    });

    it("should filter by type when provided", async () => {
      // Arrange
      mockPrismaService.campaign.findMany.mockResolvedValue([]);
      mockPrismaService.campaign.count.mockResolvedValue(0);

      // Act
      await service.findAll(mockOrgId, { type: CampaignType.ATTESTATION });

      // Assert
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: CampaignType.ATTESTATION,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('update')
  // -------------------------------------------------------------------------
  describe("update", () => {
    it("should update campaign fields", async () => {
      // Arrange
      const updateDto = { name: "Updated Campaign Name" };
      const updatedCampaign = { ...mockCampaign, ...updateDto };

      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrismaService.campaign.update.mockResolvedValue(updatedCampaign);

      // Act
      const result = await service.update(
        mockCampaignId,
        updateDto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.name).toBe("Updated Campaign Name");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "updated",
        }),
      );
    });

    it("should throw BadRequestException if campaign is ACTIVE and updating restricted fields", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });

      // Act & Assert - Can't edit name on active campaigns
      await expect(
        service.update(
          mockCampaignId,
          { name: "New Name" },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow limited updates on ACTIVE campaigns", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
        reminderDays: [5, 2],
      });

      // Act - reminderDays is allowed on active campaigns
      const result = await service.update(
        mockCampaignId,
        { reminderDays: [5, 2] },
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // describe('launch')
  // -------------------------------------------------------------------------
  describe("launch", () => {
    it("should transition status from DRAFT to ACTIVE", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockSegmentService.evaluateSegment.mockResolvedValue([
        "emp-1",
        "emp-2",
        "emp-3",
      ]);
      mockAssignmentService.generateAssignments.mockResolvedValue(undefined);
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
        launchedAt: new Date(),
      });

      // Act
      const result = await service.launch(
        mockCampaignId,
        {},
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(CampaignStatus.ACTIVE);
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: mockCampaignId },
        data: expect.objectContaining({
          status: CampaignStatus.ACTIVE,
          launchedAt: expect.any(Date),
          launchedById: mockUserId,
        }),
      });
    });

    it("should set launchedAt timestamp", async () => {
      // Arrange
      const launchedCampaign = {
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
        launchedAt: new Date(),
      };
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockSegmentService.evaluateSegment.mockResolvedValue(["emp-1"]);
      mockPrismaService.campaign.update.mockResolvedValue(launchedCampaign);

      // Act
      const result = await service.launch(
        mockCampaignId,
        {},
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.launchedAt).toBeDefined();
    });

    it("should log audit event on launch", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockSegmentService.evaluateSegment.mockResolvedValue(["emp-1"]);
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });

      // Act
      await service.launch(mockCampaignId, {}, mockUserId, mockOrgId);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "launched",
          organizationId: mockOrgId,
        }),
      );
    });

    it("should throw BadRequestException if already ACTIVE", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });

      // Act & Assert
      await expect(
        service.launch(mockCampaignId, {}, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if no target employees", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockSegmentService.evaluateSegment.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.launch(mockCampaignId, {}, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should generate assignments for all target employees", async () => {
      // Arrange
      const employeeIds = ["emp-1", "emp-2", "emp-3"];
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockSegmentService.evaluateSegment.mockResolvedValue(employeeIds);
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
        totalAssignments: 3,
      });

      // Act
      await service.launch(mockCampaignId, {}, mockUserId, mockOrgId);

      // Assert
      expect(assignmentService.generateAssignments).toHaveBeenCalledWith(
        mockCampaignId,
        employeeIds,
        mockCampaign.dueDate,
        mockOrgId,
        mockUserId,
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('pause')
  // -------------------------------------------------------------------------
  describe("pause", () => {
    it("should transition status from ACTIVE to PAUSED", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.PAUSED,
      });

      // Act
      const result = await service.pause(mockCampaignId, mockUserId, mockOrgId);

      // Assert
      expect(result.status).toBe(CampaignStatus.PAUSED);
    });

    it("should log audit event on pause", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.PAUSED,
      });

      // Act
      await service.pause(mockCampaignId, mockUserId, mockOrgId);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "paused",
        }),
      );
    });

    it("should throw BadRequestException if not ACTIVE", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign); // DRAFT status

      // Act & Assert
      await expect(
        service.pause(mockCampaignId, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // describe('resume')
  // -------------------------------------------------------------------------
  describe("resume", () => {
    it("should transition status from PAUSED to ACTIVE", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.PAUSED,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });

      // Act
      const result = await service.resume(
        mockCampaignId,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(CampaignStatus.ACTIVE);
    });

    it("should log audit event on resume", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.PAUSED,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });

      // Act
      await service.resume(mockCampaignId, mockUserId, mockOrgId);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "resumed",
        }),
      );
    });

    it("should throw BadRequestException if not PAUSED", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });

      // Act & Assert
      await expect(
        service.resume(mockCampaignId, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // describe('cancel')
  // -------------------------------------------------------------------------
  describe("cancel", () => {
    it("should transition status to CANCELLED", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.CANCELLED,
      });

      // Act
      const result = await service.cancel(
        mockCampaignId,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(CampaignStatus.CANCELLED);
    });

    it("should set statusNote when reason provided", async () => {
      // Arrange
      const reason = "Campaign no longer needed";
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.CANCELLED,
        statusNote: reason,
      });

      // Act
      await service.cancel(mockCampaignId, mockUserId, mockOrgId, reason);

      // Assert
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: mockCampaignId },
        data: expect.objectContaining({
          statusNote: reason,
        }),
      });
    });

    it("should log audit event on cancel", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.CANCELLED,
      });

      // Act
      await service.cancel(mockCampaignId, mockUserId, mockOrgId);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "cancelled",
        }),
      );
    });

    it("should throw BadRequestException if already COMPLETED", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.COMPLETED,
      });

      // Act & Assert
      await expect(
        service.cancel(mockCampaignId, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // describe('complete')
  // -------------------------------------------------------------------------
  describe("complete", () => {
    it("should transition status to COMPLETED", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.COMPLETED,
      });

      // Act
      const result = await service.complete(mockCampaignId, mockOrgId);

      // Assert
      expect(result.status).toBe(CampaignStatus.COMPLETED);
    });

    it("should log audit event with SYSTEM actor on complete", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.COMPLETED,
      });

      // Act
      await service.complete(mockCampaignId, mockOrgId);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "completed",
          actorUserId: null, // System action
        }),
      );
    });

    it("should throw BadRequestException if not ACTIVE", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign); // DRAFT status

      // Act & Assert
      await expect(service.complete(mockCampaignId, mockOrgId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('remove')
  // -------------------------------------------------------------------------
  describe("remove", () => {
    it("should delete draft campaign", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrismaService.campaign.delete.mockResolvedValue(mockCampaign);

      // Act
      await service.remove(mockCampaignId, mockUserId, mockOrgId);

      // Assert
      expect(prisma.campaign.delete).toHaveBeenCalledWith({
        where: { id: mockCampaignId },
      });
    });

    it("should log audit event on delete", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrismaService.campaign.delete.mockResolvedValue(mockCampaign);

      // Act
      await service.remove(mockCampaignId, mockUserId, mockOrgId);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "deleted",
        }),
      );
    });

    it("should throw BadRequestException if not DRAFT", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });

      // Act & Assert
      await expect(
        service.remove(mockCampaignId, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // describe('getStatistics')
  // -------------------------------------------------------------------------
  describe("getStatistics", () => {
    it("should return campaign statistics", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrismaService.campaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        totalAssignments: 100,
        completedAssignments: 75,
        overdueAssignments: 5,
        completionPercentage: 75,
      });

      // Act
      const result = await service.getStatistics(mockCampaignId, mockOrgId);

      // Assert
      expect(result.total).toBe(100);
      expect(result.completed).toBe(75);
      expect(result.overdue).toBe(5);
      expect(result.completionPercentage).toBe(75);
    });

    it("should sync overdue status before returning statistics", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrismaService.campaign.findUnique.mockResolvedValue(mockCampaign);

      // Act
      await service.getStatistics(mockCampaignId, mockOrgId);

      // Assert
      expect(assignmentService.syncOverdueStatus).toHaveBeenCalledWith(
        mockCampaignId,
        mockOrgId,
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('workflow transitions - state machine verification')
  // -------------------------------------------------------------------------
  describe("workflow transitions", () => {
    it("should support DRAFT -> ACTIVE transition via launch", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockSegmentService.evaluateSegment.mockResolvedValue(["emp-1"]);
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });

      // Act
      const result = await service.launch(
        mockCampaignId,
        {},
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(CampaignStatus.ACTIVE);
    });

    it("should support ACTIVE -> PAUSED transition via pause", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.PAUSED,
      });

      // Act
      const result = await service.pause(mockCampaignId, mockUserId, mockOrgId);

      // Assert
      expect(result.status).toBe(CampaignStatus.PAUSED);
    });

    it("should support PAUSED -> ACTIVE transition via resume", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.PAUSED,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });

      // Act
      const result = await service.resume(
        mockCampaignId,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(CampaignStatus.ACTIVE);
    });

    it("should support ACTIVE -> COMPLETED transition via complete", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.COMPLETED,
      });

      // Act
      const result = await service.complete(mockCampaignId, mockOrgId);

      // Assert
      expect(result.status).toBe(CampaignStatus.COMPLETED);
    });

    it("should support ACTIVE -> CANCELLED transition via cancel", async () => {
      // Arrange
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.CANCELLED,
      });

      // Act
      const result = await service.cancel(
        mockCampaignId,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(CampaignStatus.CANCELLED);
    });
  });
});
