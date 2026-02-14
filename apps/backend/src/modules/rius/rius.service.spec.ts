import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RiusService } from "./rius.service";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import {
  HotlineRiuService,
  DisclosureRiuService,
  WebFormRiuService,
} from "./extensions";
import {
  RiuStatus,
  RiuType,
  RiuSourceChannel,
  RiuReporterType,
  Severity,
  AuditEntityType,
} from "@prisma/client";

describe("RiusService", () => {
  let service: RiusService;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  // -------------------------------------------------------------------------
  // Test Data Fixtures
  // -------------------------------------------------------------------------
  const mockOrgId = "org-test-123";
  const mockOtherOrgId = "org-other-456";
  const mockUserId = "user-test-123";
  const mockRiuId = "riu-test-123";
  const mockReferenceNumber = "RIU-2026-00001";
  const mockAccessCode = "ABC123XYZ";

  const mockRiu = {
    id: mockRiuId,
    referenceNumber: mockReferenceNumber,
    organizationId: mockOrgId,
    type: RiuType.HOTLINE_REPORT,
    sourceChannel: RiuSourceChannel.PHONE,
    status: RiuStatus.PENDING_QA,
    details: "Original report content - IMMUTABLE",
    summary: "Summary of the report",
    reporterType: RiuReporterType.ANONYMOUS,
    anonymousAccessCode: mockAccessCode,
    reporterName: null,
    reporterEmail: null,
    reporterPhone: null,
    categoryId: "cat-123",
    severity: Severity.MEDIUM,
    locationName: null,
    locationAddress: null,
    locationCity: null,
    locationState: null,
    locationZip: null,
    locationCountry: null,
    campaignId: null,
    campaignAssignmentId: null,
    customFields: null,
    formResponses: null,
    sourceSystem: null,
    sourceRecordId: null,
    migratedAt: null,
    languageDetected: "en",
    languageConfirmed: null,
    languageEffective: "en",
    aiSummary: null,
    aiRiskScore: null,
    aiTranslation: null,
    aiLanguageDetected: null,
    aiModelVersion: null,
    aiGeneratedAt: null,
    aiConfidenceScore: null,
    statusChangedAt: null,
    statusChangedById: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    createdById: mockUserId,
    demoUserSessionId: null,
    isBaseData: false,
    createdBy: {
      id: mockUserId,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
    },
    category: {
      id: "cat-123",
      name: "Harassment",
      code: "HAR",
    },
    caseAssociations: [],
  };

  const mockCreateDto = {
    type: RiuType.HOTLINE_REPORT,
    sourceChannel: RiuSourceChannel.PHONE,
    details: "Report content",
    reporterType: RiuReporterType.ANONYMOUS,
    severity: Severity.MEDIUM,
  };

  // -------------------------------------------------------------------------
  // Mock Setup
  // -------------------------------------------------------------------------
  const mockPrismaService = {
    riskIntelligenceUnit: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockHotlineRiuService = {
    createExtension: jest.fn(),
  };

  const mockDisclosureRiuService = {
    createExtension: jest.fn(),
  };

  const mockWebFormRiuService = {
    createExtension: jest.fn(),
  };

  // -------------------------------------------------------------------------
  // Module Setup
  // -------------------------------------------------------------------------
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiusService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: HotlineRiuService, useValue: mockHotlineRiuService },
        { provide: DisclosureRiuService, useValue: mockDisclosureRiuService },
        { provide: WebFormRiuService, useValue: mockWebFormRiuService },
      ],
    }).compile();

    service = module.get<RiusService>(RiusService);
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
    it("should create RIU with correct organizationId", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(null);
      mockPrismaService.riskIntelligenceUnit.create.mockResolvedValue(mockRiu);

      // Act
      const result = await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.riskIntelligenceUnit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId, // CRITICAL: Tenant isolation
          createdById: mockUserId,
          type: mockCreateDto.type,
          sourceChannel: mockCreateDto.sourceChannel,
        }),
      });
      expect(result).toEqual(mockRiu);
    });

    it("should generate reference number in RIU-YYYY-NNNNN format", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(null);
      mockPrismaService.riskIntelligenceUnit.create.mockResolvedValue(mockRiu);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.riskIntelligenceUnit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referenceNumber: expect.stringMatching(/^RIU-\d{4}-\d{5}$/),
        }),
      });
    });

    it("should set status to PENDING_QA by default", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(null);
      mockPrismaService.riskIntelligenceUnit.create.mockResolvedValue(mockRiu);

      // Act
      const result = await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(result.status).toBe(RiuStatus.PENDING_QA);
    });

    it("should log activity on create", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(null);
      mockPrismaService.riskIntelligenceUnit.create.mockResolvedValue(mockRiu);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.RIU,
          entityId: mockRiuId,
          action: "created",
          actionDescription: expect.stringContaining("Created RIU"),
          actorUserId: mockUserId,
          organizationId: mockOrgId,
        }),
      );
    });

    it("should emit riu.created event", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(null);
      mockPrismaService.riskIntelligenceUnit.create.mockResolvedValue(mockRiu);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "riu.created",
        expect.objectContaining({
          organizationId: mockOrgId,
          riuId: mockRiuId,
          referenceNumber: mockReferenceNumber,
          type: mockRiu.type,
          sourceChannel: mockRiu.sourceChannel,
        }),
      );
    });

    it("should compute languageEffective from languageDetected", async () => {
      // Arrange
      const dtoWithLanguage = {
        ...mockCreateDto,
        languageDetected: "es",
      };
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(null);
      mockPrismaService.riskIntelligenceUnit.create.mockResolvedValue({
        ...mockRiu,
        languageDetected: "es",
        languageEffective: "es",
      });

      // Act
      await service.create(dtoWithLanguage, mockUserId, mockOrgId);

      // Assert
      expect(prisma.riskIntelligenceUnit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          languageDetected: "es",
          languageEffective: "es",
        }),
      });
    });
  });

  // -------------------------------------------------------------------------
  // describe('findOne')
  // -------------------------------------------------------------------------
  describe("findOne", () => {
    it("should return RIU when found in organization", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
        mockRiu,
      );

      // Act
      const result = await service.findOne(mockRiuId, mockOrgId);

      // Assert
      expect(result).toEqual(mockRiu);
      expect(prisma.riskIntelligenceUnit.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockRiuId,
          organizationId: mockOrgId, // CRITICAL: Tenant isolation
        },
        include: expect.any(Object),
      });
    });

    it("should throw NotFoundException when RIU does not exist", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne("non-existent-id", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when RIU belongs to different org", async () => {
      // Arrange - RIU exists but query returns null due to org filter
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(mockRiuId, mockOtherOrgId)).rejects.toThrow(
        NotFoundException,
      );

      // Verify query included the different org filter
      expect(prisma.riskIntelligenceUnit.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOtherOrgId,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('update') - CRITICAL: Immutability enforcement
  // -------------------------------------------------------------------------
  describe("update", () => {
    describe("MUTABLE fields - should allow updates", () => {
      it("should allow updating status field", async () => {
        // Arrange
        const updatedRiu = { ...mockRiu, status: RiuStatus.RELEASED };
        mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
          mockRiu,
        );
        mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
          updatedRiu,
        );

        // Act
        const result = await service.update(
          mockRiuId,
          { status: RiuStatus.RELEASED },
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(result.status).toBe(RiuStatus.RELEASED);
      });

      it("should allow updating aiSummary field (AI enrichment)", async () => {
        // Arrange
        const updatedRiu = { ...mockRiu, aiSummary: "AI generated summary" };
        mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
          mockRiu,
        );
        mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
          updatedRiu,
        );

        // Act
        const result = await service.update(
          mockRiuId,
          { aiSummary: "AI generated summary" },
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(result.aiSummary).toBe("AI generated summary");
      });

      it("should allow updating aiRiskScore field", async () => {
        // Arrange
        const updatedRiu = { ...mockRiu, aiRiskScore: 75 };
        mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
          mockRiu,
        );
        mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
          updatedRiu,
        );

        // Act
        const result = await service.update(
          mockRiuId,
          { aiRiskScore: 75 },
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(result.aiRiskScore).toBe(75);
      });

      it("should allow updating languageConfirmed field", async () => {
        // Arrange
        const updatedRiu = {
          ...mockRiu,
          languageConfirmed: "es",
          languageEffective: "es",
        };
        mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
          mockRiu,
        );
        mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
          updatedRiu,
        );

        // Act
        const result = await service.update(
          mockRiuId,
          { languageConfirmed: "es" },
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(result.languageConfirmed).toBe("es");
      });
    });

    describe("IMMUTABLE fields - should REJECT updates", () => {
      it("should REJECT updating details field (immutable content)", async () => {
        // Arrange
        mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
          mockRiu,
        );

        // Act & Assert
        await expect(
          service.update(
            mockRiuId,
            { details: "Attempted modification of content" } as any,
            mockUserId,
            mockOrgId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it("should REJECT updating reporterType field (immutable)", async () => {
        // Arrange
        mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
          mockRiu,
        );

        // Act & Assert
        await expect(
          service.update(
            mockRiuId,
            { reporterType: RiuReporterType.IDENTIFIED } as any,
            mockUserId,
            mockOrgId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it("should REJECT updating sourceChannel field (immutable)", async () => {
        // Arrange
        mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
          mockRiu,
        );

        // Act & Assert
        await expect(
          service.update(
            mockRiuId,
            { sourceChannel: RiuSourceChannel.WEB_FORM } as any,
            mockUserId,
            mockOrgId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it("should REJECT updating type field (immutable)", async () => {
        // Arrange
        mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
          mockRiu,
        );

        // Act & Assert
        await expect(
          service.update(
            mockRiuId,
            { type: RiuType.WEB_FORM_SUBMISSION } as any,
            mockUserId,
            mockOrgId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it("should REJECT updating categoryId field (immutable)", async () => {
        // Arrange
        mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
          mockRiu,
        );

        // Act & Assert
        await expect(
          service.update(
            mockRiuId,
            { categoryId: "new-category-id" } as any,
            mockUserId,
            mockOrgId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it("should REJECT updating severity field (immutable)", async () => {
        // Arrange
        mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
          mockRiu,
        );

        // Act & Assert
        await expect(
          service.update(
            mockRiuId,
            { severity: Severity.HIGH } as any,
            mockUserId,
            mockOrgId,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it("should throw BadRequestException with list of immutable fields", async () => {
        // Arrange
        mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
          mockRiu,
        );

        // Act & Assert
        await expect(
          service.update(
            mockRiuId,
            { details: "Hack attempt", reporterType: "IDENTIFIED" } as any,
            mockUserId,
            mockOrgId,
          ),
        ).rejects.toThrow(/Cannot modify immutable RIU fields/);
      });

      it("should include correction guidance in error message", async () => {
        // Arrange
        mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
          mockRiu,
        );

        // Act & Assert
        try {
          await service.update(
            mockRiuId,
            { details: "Hack" } as any,
            mockUserId,
            mockOrgId,
          );
          fail("Should have thrown BadRequestException");
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect((error as BadRequestException).message).toContain(
            "Corrections should go on the linked Case",
          );
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // describe('updateStatus')
  // -------------------------------------------------------------------------
  describe("updateStatus", () => {
    it("should update status with statusChangedAt timestamp", async () => {
      // Arrange
      const updatedRiu = {
        ...mockRiu,
        status: RiuStatus.RELEASED,
        statusChangedAt: new Date(),
      };
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
        mockRiu,
      );
      mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
        updatedRiu,
      );

      // Act
      const result = await service.updateStatus(
        mockRiuId,
        RiuStatus.RELEASED,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(RiuStatus.RELEASED);
    });

    it("should emit riu.status.changed event", async () => {
      // Arrange
      const updatedRiu = { ...mockRiu, status: RiuStatus.RELEASED };
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
        mockRiu,
      );
      mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
        updatedRiu,
      );

      // Act
      await service.updateStatus(
        mockRiuId,
        RiuStatus.RELEASED,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "riu.status.changed",
        expect.objectContaining({
          organizationId: mockOrgId,
          riuId: mockRiuId,
          previousStatus: RiuStatus.PENDING_QA,
          newStatus: RiuStatus.RELEASED,
        }),
      );
    });

    it("should log status change activity", async () => {
      // Arrange
      const updatedRiu = { ...mockRiu, status: RiuStatus.RELEASED };
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
        mockRiu,
      );
      mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
        updatedRiu,
      );

      // Act
      await service.updateStatus(
        mockRiuId,
        RiuStatus.RELEASED,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "status_changed",
          actionDescription: expect.stringContaining("PENDING_QA"),
          changes: expect.objectContaining({
            oldValue: { status: RiuStatus.PENDING_QA },
            newValue: { status: RiuStatus.RELEASED },
          }),
        }),
      );
    });

    it("should allow PENDING_QA -> RELEASED transition", async () => {
      // Arrange
      const updatedRiu = { ...mockRiu, status: RiuStatus.RELEASED };
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
        mockRiu,
      );
      mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
        updatedRiu,
      );

      // Act
      const result = await service.updateStatus(
        mockRiuId,
        RiuStatus.RELEASED,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(RiuStatus.RELEASED);
    });
  });

  // -------------------------------------------------------------------------
  // describe('updateAiEnrichment')
  // -------------------------------------------------------------------------
  describe("updateAiEnrichment", () => {
    it("should update aiSummary", async () => {
      // Arrange
      const enrichedRiu = { ...mockRiu, aiSummary: "AI summary content" };
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
        mockRiu,
      );
      mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
        enrichedRiu,
      );

      // Act
      const result = await service.updateAiEnrichment(
        mockRiuId,
        { aiSummary: "AI summary content" },
        mockOrgId,
      );

      // Assert
      expect(result.aiSummary).toBe("AI summary content");
    });

    it("should update aiRiskScore", async () => {
      // Arrange
      const enrichedRiu = { ...mockRiu, aiRiskScore: 85 };
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
        mockRiu,
      );
      mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
        enrichedRiu,
      );

      // Act
      const result = await service.updateAiEnrichment(
        mockRiuId,
        { aiRiskScore: 85 },
        mockOrgId,
      );

      // Assert
      expect(result.aiRiskScore).toBe(85);
    });

    it("should update aiTranslation", async () => {
      // Arrange
      const enrichedRiu = {
        ...mockRiu,
        aiTranslation: "Translated content in English",
      };
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
        mockRiu,
      );
      mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
        enrichedRiu,
      );

      // Act
      const result = await service.updateAiEnrichment(
        mockRiuId,
        { aiTranslation: "Translated content in English" },
        mockOrgId,
      );

      // Assert
      expect(result.aiTranslation).toBe("Translated content in English");
    });

    it("should set aiGeneratedAt timestamp", async () => {
      // Arrange
      const enrichedRiu = {
        ...mockRiu,
        aiSummary: "Summary",
        aiGeneratedAt: new Date(),
      };
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
        mockRiu,
      );
      mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
        enrichedRiu,
      );

      // Act
      await service.updateAiEnrichment(
        mockRiuId,
        { aiSummary: "Summary" },
        mockOrgId,
      );

      // Assert
      expect(prisma.riskIntelligenceUnit.update).toHaveBeenCalledWith({
        where: { id: mockRiuId },
        data: expect.objectContaining({
          aiGeneratedAt: expect.any(Date),
        }),
      });
    });

    it("should emit riu.ai.enriched event", async () => {
      // Arrange
      const enrichedRiu = {
        ...mockRiu,
        aiSummary: "Summary",
        aiModelVersion: "claude-3-opus",
      };
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
        mockRiu,
      );
      mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(
        enrichedRiu,
      );

      // Act
      await service.updateAiEnrichment(
        mockRiuId,
        { aiSummary: "Summary", aiModelVersion: "claude-3-opus" },
        mockOrgId,
      );

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "riu.ai.enriched",
        expect.objectContaining({
          organizationId: mockOrgId,
          riuId: mockRiuId,
          aiModelVersion: "claude-3-opus",
        }),
      );
    });

    it("should NOT modify immutable content fields", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
        mockRiu,
      );
      mockPrismaService.riskIntelligenceUnit.update.mockResolvedValue(mockRiu);

      // Act
      await service.updateAiEnrichment(
        mockRiuId,
        { aiSummary: "Summary" },
        mockOrgId,
      );

      // Assert - Verify no immutable fields in update call
      expect(prisma.riskIntelligenceUnit.update).toHaveBeenCalledWith({
        where: { id: mockRiuId },
        data: expect.not.objectContaining({
          details: expect.anything(),
          reporterType: expect.anything(),
          sourceChannel: expect.anything(),
        }),
      });
    });
  });

  // -------------------------------------------------------------------------
  // describe('findByAccessCode')
  // -------------------------------------------------------------------------
  describe("findByAccessCode", () => {
    it("should return RIU for valid access code", async () => {
      // Arrange
      const minimalRiu = {
        id: mockRiuId,
        referenceNumber: mockReferenceNumber,
        status: RiuStatus.PENDING_QA,
        type: RiuType.HOTLINE_REPORT,
        sourceChannel: RiuSourceChannel.PHONE,
        reporterType: RiuReporterType.ANONYMOUS,
        anonymousAccessCode: mockAccessCode,
        severity: Severity.MEDIUM,
        createdAt: new Date(),
      };
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(
        minimalRiu,
      );

      // Act
      const result = await service.findByAccessCode(mockAccessCode, mockOrgId);

      // Assert
      expect(result).toEqual(minimalRiu);
      expect(result?.anonymousAccessCode).toBe(mockAccessCode);
    });

    it("should return null for invalid access code", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.findByAccessCode("INVALID123", mockOrgId);

      // Assert
      expect(result).toBeNull();
    });

    it("should filter by organizationId", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(null);

      // Act
      await service.findByAccessCode(mockAccessCode, mockOrgId);

      // Assert
      expect(prisma.riskIntelligenceUnit.findFirst).toHaveBeenCalledWith({
        where: {
          anonymousAccessCode: mockAccessCode,
          organizationId: mockOrgId,
        },
        select: expect.any(Object),
      });
    });

    it("should not return sensitive content fields", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue({
        id: mockRiuId,
        referenceNumber: mockReferenceNumber,
        status: RiuStatus.PENDING_QA,
        // Note: details and other sensitive fields should NOT be selected
      });

      // Act
      await service.findByAccessCode(mockAccessCode, mockOrgId);

      // Assert - Verify select does not include sensitive fields
      expect(prisma.riskIntelligenceUnit.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({
            details: true,
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
      mockPrismaService.riskIntelligenceUnit.findMany.mockResolvedValue([
        mockRiu,
      ]);
      mockPrismaService.riskIntelligenceUnit.count.mockResolvedValue(1);

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
      mockPrismaService.riskIntelligenceUnit.findMany.mockResolvedValue([]);
      mockPrismaService.riskIntelligenceUnit.count.mockResolvedValue(0);

      // Act
      await service.findAll({}, mockOrgId);

      // Assert - CRITICAL: Must always include org filter
      expect(prisma.riskIntelligenceUnit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        }),
      );
    });

    it("should filter by type when provided", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findMany.mockResolvedValue([]);
      mockPrismaService.riskIntelligenceUnit.count.mockResolvedValue(0);

      // Act
      await service.findAll({ type: RiuType.DISCLOSURE_RESPONSE }, mockOrgId);

      // Assert
      expect(prisma.riskIntelligenceUnit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
            type: RiuType.DISCLOSURE_RESPONSE,
          }),
        }),
      );
    });

    it("should filter by status when provided", async () => {
      // Arrange
      mockPrismaService.riskIntelligenceUnit.findMany.mockResolvedValue([]);
      mockPrismaService.riskIntelligenceUnit.count.mockResolvedValue(0);

      // Act
      await service.findAll({ status: RiuStatus.RELEASED }, mockOrgId);

      // Assert
      expect(prisma.riskIntelligenceUnit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: RiuStatus.RELEASED,
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
      mockPrismaService.riskIntelligenceUnit.findFirst.mockResolvedValue(null);
      mockPrismaService.riskIntelligenceUnit.create.mockResolvedValue(mockRiu);
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error("Event emission failed");
      });

      // Act - Should not throw despite event emission failure
      const result = await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(result).toEqual(mockRiu);
    });
  });
});
