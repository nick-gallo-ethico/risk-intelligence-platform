import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  PolicyTranslationService,
  PolicyTranslationCreatedEvent,
  PolicyTranslationReviewedEvent,
} from "./policy-translation.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivityService } from "../../../common/services/activity.service";
import { SkillRegistry } from "../../ai/skills/skill.registry";
import { TranslationSource, TranslationReviewStatus } from "@prisma/client";

describe("PolicyTranslationService", () => {
  let service: PolicyTranslationService;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;
  let skillRegistry: jest.Mocked<SkillRegistry>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  // Test fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockPolicyVersionId = "version-test-123";
  const mockPolicyId = "policy-test-123";
  const mockTranslationId = "translation-test-123";

  const mockPolicyVersion = {
    id: mockPolicyVersionId,
    organizationId: mockOrgId,
    policyId: mockPolicyId,
    version: 1,
    content: "<p>Policy content in English</p>",
    policy: {
      id: mockPolicyId,
      title: "Code of Conduct",
    },
  };

  const mockTranslation = {
    id: mockTranslationId,
    organizationId: mockOrgId,
    policyVersionId: mockPolicyVersionId,
    languageCode: "es",
    languageName: "Spanish",
    title: "Codigo de Conducta",
    content: "<p>Contenido de la politica</p>",
    plainText: "Contenido de la politica",
    translatedBy: TranslationSource.AI,
    aiModel: "claude-3-opus",
    reviewStatus: TranslationReviewStatus.PENDING_REVIEW,
    isStale: false,
    policyVersion: mockPolicyVersion,
    reviewedBy: null,
  };

  // Mocks
  const mockPrismaService = {
    policyVersion: {
      findFirst: jest.fn(),
    },
    policyVersionTranslation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  const mockSkillRegistry = {
    executeSkill: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyTranslationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: SkillRegistry, useValue: mockSkillRegistry },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PolicyTranslationService>(PolicyTranslationService);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);
    skillRegistry = module.get(SkillRegistry);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe("translate", () => {
    it("should create AI translation", async () => {
      // Arrange
      const dto = {
        policyVersionId: mockPolicyVersionId,
        languageCode: "es",
      };
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        null,
      );
      mockSkillRegistry.executeSkill
        .mockResolvedValueOnce({
          success: true,
          data: { translated: "<p>Contenido de la politica</p>" },
          metadata: { model: "claude-3-opus" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { translated: "Codigo de Conducta" },
          metadata: { model: "claude-3-opus" },
        });
      mockPrismaService.policyVersionTranslation.create.mockResolvedValue(
        mockTranslation,
      );

      // Act
      const result = await service.translate(dto, mockUserId, mockOrgId);

      // Assert
      expect(result).toEqual(mockTranslation);
      expect(skillRegistry.executeSkill).toHaveBeenCalledTimes(2);
    });

    it("should create manual translation when useAI is false", async () => {
      // Arrange
      const dto = {
        policyVersionId: mockPolicyVersionId,
        languageCode: "es",
        useAI: false,
        content: "<p>Manual translation</p>",
        title: "Manual Title",
      };
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        null,
      );
      const manualTranslation = {
        ...mockTranslation,
        translatedBy: TranslationSource.HUMAN,
        content: dto.content,
        title: dto.title,
      };
      mockPrismaService.policyVersionTranslation.create.mockResolvedValue(
        manualTranslation,
      );

      // Act
      const result = await service.translate(dto, mockUserId, mockOrgId);

      // Assert
      expect(result.translatedBy).toBe(TranslationSource.HUMAN);
      expect(skillRegistry.executeSkill).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when policy version not found", async () => {
      // Arrange
      const dto = {
        policyVersionId: mockPolicyVersionId,
        languageCode: "es",
      };
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.translate(dto, mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when translation already exists", async () => {
      // Arrange
      const dto = {
        policyVersionId: mockPolicyVersionId,
        languageCode: "es",
      };
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        mockTranslation,
      );

      // Act & Assert
      await expect(
        service.translate(dto, mockUserId, mockOrgId),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException when AI translation fails", async () => {
      // Arrange
      const dto = {
        policyVersionId: mockPolicyVersionId,
        languageCode: "es",
      };
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        null,
      );
      mockSkillRegistry.executeSkill.mockResolvedValue({
        success: false,
        error: "Translation service unavailable",
      });

      // Act & Assert
      await expect(
        service.translate(dto, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when manual translation missing content", async () => {
      // Arrange
      const dto = {
        policyVersionId: mockPolicyVersionId,
        languageCode: "es",
        useAI: false,
        // Missing content and title
      };
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        null,
      );

      // Act & Assert
      await expect(
        service.translate(dto, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should emit PolicyTranslationCreatedEvent", async () => {
      // Arrange
      const dto = {
        policyVersionId: mockPolicyVersionId,
        languageCode: "es",
      };
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        null,
      );
      mockSkillRegistry.executeSkill
        .mockResolvedValueOnce({
          success: true,
          data: { translated: "content" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { translated: "title" },
        });
      mockPrismaService.policyVersionTranslation.create.mockResolvedValue(
        mockTranslation,
      );

      // Act
      await service.translate(dto, mockUserId, mockOrgId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyTranslationCreatedEvent.eventName,
        expect.objectContaining({
          translationId: mockTranslationId,
          languageCode: "es",
        }),
      );
    });
  });

  describe("updateTranslation", () => {
    it("should update translation content", async () => {
      // Arrange
      const dto = {
        content: "<p>Updated content</p>",
        title: "Updated Title",
      };
      const updatedTranslation = { ...mockTranslation, ...dto };
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        mockTranslation,
      );
      mockPrismaService.policyVersionTranslation.update.mockResolvedValue(
        updatedTranslation,
      );

      // Act
      const result = await service.updateTranslation(
        mockTranslationId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.content).toBe(dto.content);
    });

    it("should change translatedBy to HUMAN when editing AI translation", async () => {
      // Arrange
      const dto = { content: "<p>Human edited</p>" };
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        mockTranslation,
      );
      mockPrismaService.policyVersionTranslation.update.mockResolvedValue({
        ...mockTranslation,
        translatedBy: TranslationSource.HUMAN,
      });

      // Act
      const result = await service.updateTranslation(
        mockTranslationId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(prisma.policyVersionTranslation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            translatedBy: TranslationSource.HUMAN,
          }),
        }),
      );
    });

    it("should throw NotFoundException when translation not found", async () => {
      // Arrange
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        null,
      );

      // Act & Assert
      await expect(
        service.updateTranslation(
          mockTranslationId,
          { content: "test" },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should set isStale to false after update", async () => {
      // Arrange
      const dto = { content: "<p>Updated</p>" };
      const staleTranslation = { ...mockTranslation, isStale: true };
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        staleTranslation,
      );
      mockPrismaService.policyVersionTranslation.update.mockResolvedValue({
        ...staleTranslation,
        isStale: false,
      });

      // Act
      await service.updateTranslation(
        mockTranslationId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(prisma.policyVersionTranslation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isStale: false,
          }),
        }),
      );
    });
  });

  describe("reviewTranslation", () => {
    it("should update review status", async () => {
      // Arrange
      const dto = {
        status: TranslationReviewStatus.APPROVED,
        reviewNotes: "Looks good!",
      };
      const reviewedTranslation = {
        ...mockTranslation,
        reviewStatus: TranslationReviewStatus.APPROVED,
        reviewedById: mockUserId,
        reviewedAt: new Date(),
      };
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        mockTranslation,
      );
      mockPrismaService.policyVersionTranslation.update.mockResolvedValue(
        reviewedTranslation,
      );

      // Act
      const result = await service.reviewTranslation(
        mockTranslationId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.reviewStatus).toBe(TranslationReviewStatus.APPROVED);
    });

    it("should throw NotFoundException when translation not found", async () => {
      // Arrange
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        null,
      );

      // Act & Assert
      await expect(
        service.reviewTranslation(
          mockTranslationId,
          { status: TranslationReviewStatus.APPROVED },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should emit PolicyTranslationReviewedEvent", async () => {
      // Arrange
      const dto = { status: TranslationReviewStatus.APPROVED };
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        mockTranslation,
      );
      mockPrismaService.policyVersionTranslation.update.mockResolvedValue({
        ...mockTranslation,
        reviewStatus: TranslationReviewStatus.APPROVED,
      });

      // Act
      await service.reviewTranslation(
        mockTranslationId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyTranslationReviewedEvent.eventName,
        expect.objectContaining({
          translationId: mockTranslationId,
          reviewStatus: TranslationReviewStatus.APPROVED,
        }),
      );
    });
  });

  describe("refreshStaleTranslation", () => {
    it("should re-translate stale translation using AI", async () => {
      // Arrange
      const staleTranslation = { ...mockTranslation, isStale: true };
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        staleTranslation,
      );
      mockSkillRegistry.executeSkill
        .mockResolvedValueOnce({
          success: true,
          data: { translated: "New content" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { translated: "New title" },
        });
      mockPrismaService.policyVersionTranslation.update.mockResolvedValue({
        ...staleTranslation,
        isStale: false,
        reviewStatus: TranslationReviewStatus.PENDING_REVIEW,
      });

      // Act
      const result = await service.refreshStaleTranslation(
        mockTranslationId,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.isStale).toBe(false);
      expect(result.reviewStatus).toBe(TranslationReviewStatus.PENDING_REVIEW);
    });

    it("should throw BadRequestException when translation is not stale", async () => {
      // Arrange
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        mockTranslation,
      );

      // Act & Assert
      await expect(
        service.refreshStaleTranslation(
          mockTranslationId,
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when translation not found", async () => {
      // Arrange
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        null,
      );

      // Act & Assert
      await expect(
        service.refreshStaleTranslation(
          mockTranslationId,
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByVersion", () => {
    it("should return all translations for a version", async () => {
      // Arrange
      mockPrismaService.policyVersionTranslation.findMany.mockResolvedValue([
        mockTranslation,
      ]);

      // Act
      const result = await service.findByVersion(
        mockPolicyVersionId,
        mockOrgId,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(prisma.policyVersionTranslation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            policyVersionId: mockPolicyVersionId,
            organizationId: mockOrgId,
          },
        }),
      );
    });
  });

  describe("findStale", () => {
    it("should return all stale translations", async () => {
      // Arrange
      const staleTranslation = { ...mockTranslation, isStale: true };
      mockPrismaService.policyVersionTranslation.findMany.mockResolvedValue([
        staleTranslation,
      ]);

      // Act
      const result = await service.findStale(mockOrgId);

      // Assert
      expect(result).toHaveLength(1);
      expect(prisma.policyVersionTranslation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: mockOrgId,
            isStale: true,
          },
        }),
      );
    });
  });

  describe("findById", () => {
    it("should return translation by ID", async () => {
      // Arrange
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        mockTranslation,
      );

      // Act
      const result = await service.findById(mockTranslationId, mockOrgId);

      // Assert
      expect(result).toEqual(mockTranslation);
    });

    it("should return null when not found", async () => {
      // Arrange
      mockPrismaService.policyVersionTranslation.findFirst.mockResolvedValue(
        null,
      );

      // Act
      const result = await service.findById(mockTranslationId, mockOrgId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("getAvailableLanguages", () => {
    it("should return list of supported languages", () => {
      // Act
      const result = service.getAvailableLanguages();

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("code");
      expect(result[0]).toHaveProperty("name");
    });

    it("should include Spanish", () => {
      // Act
      const result = service.getAvailableLanguages();

      // Assert
      const spanish = result.find((l) => l.code === "es");
      expect(spanish).toBeDefined();
      expect(spanish!.name).toBe("Spanish");
    });
  });
});
