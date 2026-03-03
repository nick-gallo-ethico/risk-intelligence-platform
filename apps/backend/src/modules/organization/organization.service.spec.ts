import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { OrganizationService } from "./organization.service";
import { PrismaService } from "../prisma/prisma.service";
import { BrandingMode } from "./dto";

describe("OrganizationService", () => {
  let service: OrganizationService;

  const mockOrgId = "org-test-123";

  const mockOrg = {
    id: mockOrgId,
    name: "Test Healthcare Inc.",
    slug: "test-healthcare",
    defaultLanguage: "en",
    settings: {
      timezone: "America/Chicago",
      dateFormat: "MM/DD/YYYY",
    },
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
    tenantBranding: {
      logoUrl: "https://example.com/logo.png",
      primaryColor: "221 83% 53%",
      customDomain: "compliance.test-healthcare.com",
    },
  };

  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tenantBranding: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    orgNotificationSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    tenantSsoConfig: {
      findUnique: jest.fn(),
    },
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    jest.clearAllMocks();
  });

  describe("getOrganization", () => {
    it("should return organization details", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.getOrganization(mockOrgId);

      expect(result.id).toBe(mockOrgId);
      expect(result.name).toBe("Test Healthcare Inc.");
      expect(result.slug).toBe("test-healthcare");
      expect(result.logoUrl).toBe("https://example.com/logo.png");
    });

    it("should throw NotFoundException when organization not found", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.getOrganization("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should use timezone from settings", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.getOrganization(mockOrgId);

      expect(result.timezone).toBe("America/Chicago");
    });

    it("should default timezone to America/New_York when not set", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...mockOrg,
        settings: {},
      });

      const result = await service.getOrganization(mockOrgId);

      expect(result.timezone).toBe("America/New_York");
    });
  });

  describe("getSettings", () => {
    it("should return cached settings when available", async () => {
      const cachedSettings = {
        name: "Test Healthcare Inc.",
        timezone: "America/Chicago",
        dateFormat: "MM/DD/YYYY",
        defaultLanguage: "en",
      };
      mockCacheManager.get.mockResolvedValue(cachedSettings);

      const result = await service.getSettings(mockOrgId);

      expect(result).toEqual(cachedSettings);
      expect(mockPrisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it("should query DB and cache when no cached value", async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrisma.tenantBranding.findUnique.mockResolvedValue(null);
      mockPrisma.orgNotificationSettings.findUnique.mockResolvedValue(null);
      mockPrisma.tenantSsoConfig.findUnique.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.getSettings(mockOrgId);

      expect(result.name).toBe("Test Healthcare Inc.");
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `org-settings:${mockOrgId}`,
        expect.any(Object),
        expect.any(Number),
      );
    });

    it("should throw NotFoundException when organization not found during settings fetch", async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.tenantBranding.findUnique.mockResolvedValue(null);
      mockPrisma.orgNotificationSettings.findUnique.mockResolvedValue(null);
      mockPrisma.tenantSsoConfig.findUnique.mockResolvedValue(null);

      await expect(service.getSettings("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should include SSO config when present", async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrisma.tenantBranding.findUnique.mockResolvedValue(null);
      mockPrisma.orgNotificationSettings.findUnique.mockResolvedValue(null);
      mockPrisma.tenantSsoConfig.findUnique.mockResolvedValue({
        ssoEnabled: true,
        ssoProvider: "AZURE_AD",
        azureTenantId: "azure-tenant-123",
        jitProvisioningEnabled: true,
        samlIdpEntryPoint: null,
      });
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.getSettings(mockOrgId);

      expect(result.ssoEnabled).toBe(true);
      expect(result.ssoConfig?.tenantId).toBe("azure-tenant-123");
    });
  });

  describe("updateOrganization", () => {
    it("should update organization and invalidate cache", async () => {
      mockPrisma.organization.findUnique
        .mockResolvedValueOnce(mockOrg) // initial check
        .mockResolvedValueOnce(mockOrg); // getOrganization call
      mockPrisma.organization.update.mockResolvedValue({
        ...mockOrg,
        name: "Updated Name",
      });
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.updateOrganization(mockOrgId, { name: "Updated Name" });

      expect(mockPrisma.organization.update).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `org-settings:${mockOrgId}`,
      );
    });

    it("should throw NotFoundException when organization does not exist", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrganization("non-existent", { name: "Test" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update timezone in settings JSON field", async () => {
      mockPrisma.organization.findUnique
        .mockResolvedValueOnce(mockOrg)
        .mockResolvedValueOnce(mockOrg);
      mockPrisma.organization.update.mockResolvedValue(mockOrg);
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.updateOrganization(mockOrgId, {
        timezone: "America/Los_Angeles",
      });

      expect(mockPrisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              timezone: "America/Los_Angeles",
            }),
          }),
        }),
      );
    });
  });

  describe("updateSecuritySettings", () => {
    it("should update security settings and invalidate cache", async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrisma.organization.update.mockResolvedValue(mockOrg);
      mockPrisma.tenantBranding.findUnique.mockResolvedValue(null);
      mockPrisma.orgNotificationSettings.findUnique.mockResolvedValue(null);
      mockPrisma.tenantSsoConfig.findUnique.mockResolvedValue(null);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.updateSecuritySettings(mockOrgId, { mfaRequired: true });

      expect(mockPrisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              mfaRequired: true,
            }),
          }),
        }),
      );
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `org-settings:${mockOrgId}`,
      );
    });

    it("should throw NotFoundException when org not found", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSecuritySettings("non-existent", { mfaRequired: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
