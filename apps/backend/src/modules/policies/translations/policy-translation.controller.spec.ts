import { Test, TestingModule } from "@nestjs/testing";
import { PolicyTranslationController } from "./policy-translation.controller";
import { PolicyTranslationService } from "./policy-translation.service";
import { TranslationReviewStatus } from "@prisma/client";

describe("PolicyTranslationController", () => {
  let controller: PolicyTranslationController;
  let service: jest.Mocked<PolicyTranslationService>;

  // Test fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockVersionId = "version-test-123";
  const mockTranslationId = "translation-test-123";

  const mockTranslation = {
    id: mockTranslationId,
    organizationId: mockOrgId,
    policyVersionId: mockVersionId,
    languageCode: "es",
    languageName: "Spanish",
    title: "Título Traducido",
    content: "Contenido traducido...",
    plainText: "Contenido traducido...",
    translatedBy: "AI",
    aiModel: "claude-3-sonnet",
    reviewStatus: TranslationReviewStatus.PENDING_REVIEW,
    isStale: false,
    reviewedAt: null,
    reviewedById: null,
    reviewNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLanguages = [
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
  ];

  // Mocks
  const mockService = {
    translate: jest.fn(),
    findByVersion: jest.fn(),
    updateTranslation: jest.fn(),
    reviewTranslation: jest.fn(),
    refreshStaleTranslation: jest.fn(),
    findStale: jest.fn(),
    getAvailableLanguages: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PolicyTranslationController],
      providers: [{ provide: PolicyTranslationService, useValue: mockService }],
    }).compile();

    controller = module.get<PolicyTranslationController>(
      PolicyTranslationController,
    );
    service = module.get(PolicyTranslationService);

    jest.clearAllMocks();
  });

  describe("createTranslation", () => {
    it("should create AI translation", async () => {
      // Arrange
      const dto = {
        policyVersionId: "", // Will be overridden
        languageCode: "es",
        useAI: true,
      };
      mockService.translate.mockResolvedValue(mockTranslation);

      // Act
      const result = await controller.createTranslation(
        mockVersionId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mockTranslation);
      expect(service.translate).toHaveBeenCalledWith(
        { ...dto, policyVersionId: mockVersionId },
        mockUserId,
        mockOrgId,
      );
    });

    it("should create manual translation", async () => {
      // Arrange
      const dto = {
        policyVersionId: "",
        languageCode: "es",
        useAI: false,
        title: "Manual Title",
        content: "Manual content...",
      };
      const manualTranslation = {
        ...mockTranslation,
        translatedBy: "HUMAN",
        title: "Manual Title",
        content: "Manual content...",
      };
      mockService.translate.mockResolvedValue(manualTranslation);

      // Act
      const result = await controller.createTranslation(
        mockVersionId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.translatedBy).toBe("HUMAN");
      expect(service.translate).toHaveBeenCalledWith(
        expect.objectContaining({ useAI: false }),
        mockUserId,
        mockOrgId,
      );
    });

    it("should override policyVersionId from URL param", async () => {
      // Arrange
      const dto = {
        policyVersionId: "wrong-id",
        languageCode: "es",
        useAI: true,
      };
      mockService.translate.mockResolvedValue(mockTranslation);

      // Act
      await controller.createTranslation(
        mockVersionId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(service.translate).toHaveBeenCalledWith(
        expect.objectContaining({ policyVersionId: mockVersionId }),
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("getVersionTranslations", () => {
    it("should return all translations for a version", async () => {
      // Arrange
      const translations = [
        mockTranslation,
        { ...mockTranslation, id: "trans-2", languageCode: "fr" },
      ];
      mockService.findByVersion.mockResolvedValue(translations);

      // Act
      const result = await controller.getVersionTranslations(
        mockVersionId,
        mockOrgId,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(service.findByVersion).toHaveBeenCalledWith(
        mockVersionId,
        mockOrgId,
      );
    });

    it("should return empty array when no translations", async () => {
      // Arrange
      mockService.findByVersion.mockResolvedValue([]);

      // Act
      const result = await controller.getVersionTranslations(
        mockVersionId,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("updateTranslation", () => {
    it("should update translation content", async () => {
      // Arrange
      const dto = {
        title: "Updated Title",
        content: "Updated content...",
      };
      const updatedTranslation = {
        ...mockTranslation,
        ...dto,
        translatedBy: "HUMAN",
      };
      mockService.updateTranslation.mockResolvedValue(updatedTranslation);

      // Act
      const result = await controller.updateTranslation(
        mockTranslationId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.title).toBe("Updated Title");
      expect(service.updateTranslation).toHaveBeenCalledWith(
        mockTranslationId,
        dto,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("reviewTranslation", () => {
    it("should approve translation", async () => {
      // Arrange
      const dto = {
        status: TranslationReviewStatus.APPROVED,
        reviewNotes: "Looks good",
      };
      const reviewedTranslation = {
        ...mockTranslation,
        reviewStatus: TranslationReviewStatus.APPROVED,
        reviewedById: mockUserId,
        reviewedAt: new Date(),
      };
      mockService.reviewTranslation.mockResolvedValue(reviewedTranslation);

      // Act
      const result = await controller.reviewTranslation(
        mockTranslationId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.reviewStatus).toBe(TranslationReviewStatus.APPROVED);
      expect(service.reviewTranslation).toHaveBeenCalledWith(
        mockTranslationId,
        dto,
        mockUserId,
        mockOrgId,
      );
    });

    it("should request revision with notes", async () => {
      // Arrange
      const dto = {
        status: TranslationReviewStatus.NEEDS_REVISION,
        reviewNotes: "Please fix paragraph 3",
      };
      const reviewedTranslation = {
        ...mockTranslation,
        reviewStatus: TranslationReviewStatus.NEEDS_REVISION,
      };
      mockService.reviewTranslation.mockResolvedValue(reviewedTranslation);

      // Act
      const result = await controller.reviewTranslation(
        mockTranslationId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.reviewStatus).toBe(TranslationReviewStatus.NEEDS_REVISION);
    });
  });

  describe("refreshTranslation", () => {
    it("should refresh stale translation", async () => {
      // Arrange
      const refreshedTranslation = {
        ...mockTranslation,
        isStale: false,
        content: "New AI translated content...",
        reviewStatus: TranslationReviewStatus.PENDING_REVIEW,
      };
      mockService.refreshStaleTranslation.mockResolvedValue(
        refreshedTranslation,
      );

      // Act
      const result = await controller.refreshTranslation(
        mockTranslationId,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.isStale).toBe(false);
      expect(service.refreshStaleTranslation).toHaveBeenCalledWith(
        mockTranslationId,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("getStaleTranslations", () => {
    it("should return all stale translations", async () => {
      // Arrange
      const staleTranslations = [
        { ...mockTranslation, isStale: true },
        { ...mockTranslation, id: "trans-2", isStale: true },
      ];
      mockService.findStale.mockResolvedValue(staleTranslations);

      // Act
      const result = await controller.getStaleTranslations(mockOrgId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((t: any) => t.isStale)).toBe(true);
      expect(service.findStale).toHaveBeenCalledWith(mockOrgId);
    });

    it("should return empty array when no stale translations", async () => {
      // Arrange
      mockService.findStale.mockResolvedValue([]);

      // Act
      const result = await controller.getStaleTranslations(mockOrgId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getAvailableLanguages", () => {
    it("should return list of supported languages", async () => {
      // Arrange
      mockService.getAvailableLanguages.mockReturnValue(mockLanguages);

      // Act
      const result = controller.getAvailableLanguages();

      // Assert
      expect(result).toEqual(mockLanguages);
      expect(service.getAvailableLanguages).toHaveBeenCalled();
    });

    it("should include common languages", async () => {
      // Arrange
      mockService.getAvailableLanguages.mockReturnValue(mockLanguages);

      // Act
      const result = controller.getAvailableLanguages();

      // Assert
      const codes = result.map((l: { code: string }) => l.code);
      expect(codes).toContain("es");
      expect(codes).toContain("fr");
    });
  });
});
