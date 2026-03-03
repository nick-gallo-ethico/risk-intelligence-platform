import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { CampaignTranslationService } from "./campaign-translation.service";
import { PrismaService } from "../prisma/prisma.service";
import { CampaignStatus, CampaignType } from "@prisma/client";

describe("CampaignTranslationService", () => {
  let service: CampaignTranslationService;
  let prisma: jest.Mocked<PrismaService>;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockCampaignId = "campaign-test-123";

  const mockParentCampaign = {
    id: mockCampaignId,
    organizationId: mockOrgId,
    name: "Test Campaign",
    description: "Parent campaign",
    type: CampaignType.DISCLOSURE,
    status: CampaignStatus.DRAFT,
    language: "en",
    version: 1,
    launchAt: new Date("2026-04-01"),
    dueDate: new Date("2026-04-30"),
    disclosureFormTemplateId: "form-123",
    audienceMode: "ALL",
    segmentId: null,
    reminderConfig: null,
    reminderDays: [7, 3, 1],
    rolloutStrategy: "IMMEDIATE",
    rolloutConfig: null,
  };

  const mockPrismaService = {
    campaign: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignTranslationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CampaignTranslationService>(
      CampaignTranslationService,
    );
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe("createTranslation", () => {
    it("should create a translation campaign", async () => {
      mockPrismaService.campaign.findFirst
        .mockResolvedValueOnce(mockParentCampaign) // parent lookup
        .mockResolvedValueOnce(null); // check existing translation
      mockPrismaService.campaign.create.mockResolvedValue({
        ...mockParentCampaign,
        id: "translation-123",
        language: "es",
        parentCampaignId: mockCampaignId,
      });

      const result = await service.createTranslation(
        {
          sourceCampaignId: mockCampaignId,
          targetLanguage: "es",
          name: "Test Campaign (Spanish)",
        },
        mockOrgId,
        mockUserId,
      );

      expect(result.language).toBe("es");
      expect(prisma.campaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId,
          language: "es",
          parentCampaignId: mockCampaignId,
          parentVersionAtCreation: 1,
        }),
      });
    });

    it("should throw NotFoundException when parent not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.createTranslation(
          {
            sourceCampaignId: "nonexistent",
            targetLanguage: "es",
            name: "Test",
          },
          mockOrgId,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when translation already exists", async () => {
      mockPrismaService.campaign.findFirst
        .mockResolvedValueOnce(mockParentCampaign)
        .mockResolvedValueOnce({ id: "existing-translation" });

      await expect(
        service.createTranslation(
          {
            sourceCampaignId: mockCampaignId,
            targetLanguage: "es",
            name: "Test",
          },
          mockOrgId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getTranslationStatus", () => {
    it("should return translation status with stale detection", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockParentCampaign,
        version: 3, // Parent has been updated
      });
      mockPrismaService.campaign.findMany.mockResolvedValue([
        {
          id: "trans-1",
          language: "es",
          name: "Spanish",
          status: CampaignStatus.DRAFT,
          parentVersionAtCreation: 1, // Stale
          updatedAt: new Date(),
        },
        {
          id: "trans-2",
          language: "fr",
          name: "French",
          status: CampaignStatus.ACTIVE,
          parentVersionAtCreation: 3, // Current
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getTranslationStatus(
        mockCampaignId,
        mockOrgId,
      );

      expect(result).toHaveLength(2);
      expect(result[0].isStale).toBe(true);
      expect(result[1].isStale).toBe(false);
    });

    it("should throw NotFoundException when campaign not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.getTranslationStatus("nonexistent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("markAsUpdated", () => {
    it("should update parentVersionAtCreation to current parent version", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        id: "trans-1",
        parentCampaignId: mockCampaignId,
        parentCampaign: { version: 5 },
      });
      mockPrismaService.campaign.update.mockResolvedValue({});

      await service.markAsUpdated("trans-1", mockOrgId);

      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: "trans-1" },
        data: { parentVersionAtCreation: 5 },
      });
    });

    it("should throw NotFoundException when translation not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.markAsUpdated("nonexistent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when campaign is not a translation", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        id: "campaign-1",
        parentCampaignId: null,
      });

      await expect(
        service.markAsUpdated("campaign-1", mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getAvailableLanguages", () => {
    it("should return all available languages including parent", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        parentCampaignId: null,
        language: "en",
      });
      mockPrismaService.campaign.findMany.mockResolvedValue([
        { language: "es" },
        { language: "fr" },
      ]);
      mockPrismaService.campaign.findUnique.mockResolvedValue({
        language: "en",
      });

      const result = await service.getAvailableLanguages(
        mockCampaignId,
        mockOrgId,
      );

      expect(result).toContain("en");
      expect(result).toContain("es");
      expect(result).toContain("fr");
    });

    it("should throw NotFoundException when campaign not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.getAvailableLanguages("nonexistent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getCampaignForEmployee", () => {
    const mockEmployee = { primaryLanguage: "es" };
    const mockOrg = { defaultLanguage: "en" };

    it("should return campaign in employee preferred language", async () => {
      mockPrismaService.campaign.findFirst
        .mockResolvedValueOnce({
          ...mockParentCampaign,
          parentCampaignId: null,
        })
        .mockResolvedValueOnce({
          id: "trans-es",
          language: "es",
          status: CampaignStatus.ACTIVE,
        });
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.getCampaignForEmployee(
        mockCampaignId,
        "emp-1",
        mockOrgId,
      );

      expect(result.matchedLanguage).toBe("es");
      expect(result.wasFallback).toBe(false);
    });

    it("should fallback to org default when preferred language not available", async () => {
      mockPrismaService.campaign.findFirst
        .mockResolvedValueOnce({
          ...mockParentCampaign,
          parentCampaignId: null,
        })
        .mockResolvedValueOnce(null) // No Spanish translation
        .mockResolvedValueOnce({ id: "trans-en", language: "en" }); // English fallback
      mockPrismaService.employee.findUnique.mockResolvedValue({
        primaryLanguage: "es",
      });
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.getCampaignForEmployee(
        mockCampaignId,
        "emp-1",
        mockOrgId,
      );

      expect(result.wasFallback).toBe(true);
      expect(result.requestedLanguage).toBe("es");
    });

    it("should throw NotFoundException when campaign not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.getCampaignForEmployee("nonexistent", "emp-1", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getStaleTranslations", () => {
    it("should return campaigns with stale translations", async () => {
      mockPrismaService.campaign.findMany.mockResolvedValue([
        {
          id: "camp-1",
          name: "Campaign 1",
          version: 3,
          translations: [
            {
              id: "t1",
              language: "es",
              parentVersionAtCreation: 1,
              updatedAt: new Date(),
            },
            {
              id: "t2",
              language: "fr",
              parentVersionAtCreation: 3,
              updatedAt: new Date(),
            },
          ],
        },
      ]);

      const result = await service.getStaleTranslations(mockOrgId);

      expect(result).toHaveLength(1);
      expect(result[0].staleLanguages).toContain("es");
      expect(result[0].staleLanguages).not.toContain("fr");
    });
  });

  describe("getCampaignWithTranslations", () => {
    it("should return campaign with all translation details", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        id: mockCampaignId,
        name: "Test Campaign",
        type: CampaignType.DISCLOSURE,
        status: CampaignStatus.ACTIVE,
        language: "en",
        version: 2,
        translations: [
          {
            id: "t1",
            language: "es",
            name: "Spanish",
            status: CampaignStatus.DRAFT,
            parentVersionAtCreation: 1,
            updatedAt: new Date(),
          },
        ],
        parentCampaign: null,
      });

      const result = await service.getCampaignWithTranslations(
        mockCampaignId,
        mockOrgId,
      );

      expect(result.availableLanguages).toContain("en");
      expect(result.availableLanguages).toContain("es");
      expect(result.translations).toHaveLength(1);
      expect(result.staleTranslationCount).toBe(1);
    });

    it("should throw NotFoundException when campaign not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.getCampaignWithTranslations("nonexistent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
