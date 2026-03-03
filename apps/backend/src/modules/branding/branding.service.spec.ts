import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BrandingService } from "./branding.service";
import { PrismaService } from "../prisma/prisma.service";
import { BrandingMode, ThemeMode } from "./types/branding.types";

describe("BrandingService", () => {
  let service: BrandingService;

  const mockOrgId = "org-test-123";
  const mockSlug = "test-org";

  const mockBrandingRecord = {
    id: "branding-1",
    organizationId: mockOrgId,
    mode: "TEMPLATE",
    logoUrl: null,
    primaryColor: "221 83% 53%",
    theme: "LIGHT",
    colorPalette: null,
    typography: null,
    customDomain: null,
    footerText: null,
    welcomeVideoUrl: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  };

  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
    },
    tenantBranding: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<BrandingService>(BrandingService);
    jest.clearAllMocks();
  });

  describe("getBranding", () => {
    it("should return branding config for a valid tenant slug", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: mockOrgId });
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.tenantBranding.findUnique.mockResolvedValue(
        mockBrandingRecord,
      );
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.getBranding(mockSlug);

      expect(result.organizationId).toBe(mockOrgId);
      expect(result.mode).toBe(BrandingMode.TEMPLATE);
    });

    it("should throw NotFoundException for unknown tenant slug", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.getBranding("unknown-slug")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getBrandingByOrgId", () => {
    it("should return cached branding when available", async () => {
      const cachedBranding = service.getDefaultBranding(mockOrgId);
      mockCacheManager.get.mockResolvedValue(cachedBranding);

      const result = await service.getBrandingByOrgId(mockOrgId);

      expect(result).toEqual(cachedBranding);
      expect(mockPrisma.tenantBranding.findUnique).not.toHaveBeenCalled();
    });

    it("should return default branding when no record exists", async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.tenantBranding.findUnique.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.getBrandingByOrgId(mockOrgId);

      expect(result.id).toBe("default");
      expect(result.mode).toBe(BrandingMode.TEMPLATE);
    });

    it("should cache the branding config after fetching from DB", async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.tenantBranding.findUnique.mockResolvedValue(
        mockBrandingRecord,
      );

      await service.getBrandingByOrgId(mockOrgId);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `branding:${mockOrgId}`,
        expect.any(Object),
        expect.any(Number),
      );
    });
  });

  describe("generateCss", () => {
    it("should generate valid CSS custom properties", () => {
      const branding = service.getDefaultBranding(mockOrgId);
      const css = service.generateCss(branding);

      expect(css).toContain(":root {");
      expect(css).toContain("}");
      expect(css).toContain("--font-family");
    });

    it("should include logo URL variable when logoUrl is set", () => {
      const branding = {
        ...service.getDefaultBranding(mockOrgId),
        logoUrl: "https://example.com/logo.png",
      };

      const css = service.generateCss(branding);

      expect(css).toContain("--logo-url");
      expect(css).toContain("https://example.com/logo.png");
    });

    it("should use full color palette in FULL_WHITE_LABEL mode", () => {
      const branding = {
        ...service.getDefaultBranding(mockOrgId),
        mode: BrandingMode.FULL_WHITE_LABEL,
        colorPalette: {
          primary: "120 50% 50%",
          primaryForeground: "0 0% 100%",
          secondary: "210 40% 96%",
          secondaryForeground: "222 47% 11%",
          background: "0 0% 100%",
          foreground: "222 84% 5%",
          muted: "210 40% 96%",
          mutedForeground: "215 16% 47%",
          accent: "210 40% 96%",
          accentForeground: "222 47% 11%",
          destructive: "0 84% 60%",
          destructiveForeground: "210 40% 98%",
          border: "214 32% 91%",
          input: "214 32% 91%",
          ring: "120 50% 50%",
          card: "0 0% 100%",
          cardForeground: "222 84% 5%",
          popover: "0 0% 100%",
          popoverForeground: "222 84% 5%",
        },
      };

      const css = service.generateCss(branding);

      expect(css).toContain(":root {");
      // Should use the custom palette primary color
      expect(css).toContain("120 50% 50%");
    });
  });

  describe("update", () => {
    it("should update branding and invalidate cache", async () => {
      mockPrisma.tenantBranding.upsert.mockResolvedValue({
        ...mockBrandingRecord,
        primaryColor: "200 80% 40%",
      });
      mockCacheManager.del.mockResolvedValue(undefined);
      mockEventEmitter.emit.mockReturnValue(undefined);

      const result = await service.update(mockOrgId, {
        primaryColor: "200 80% 40%",
      });

      expect(mockPrisma.tenantBranding.upsert).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2); // config + css keys
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "branding.updated",
        expect.objectContaining({ organizationId: mockOrgId }),
      );
    });

    it("should throw BadRequestException for FULL_WHITE_LABEL without colorPalette", async () => {
      mockPrisma.tenantBranding.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockOrgId, {
          mode: BrandingMode.FULL_WHITE_LABEL,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("previewCss", () => {
    it("should generate CSS preview without saving to database", () => {
      const css = service.previewCss({
        primaryColor: "200 80% 40%",
      });

      expect(css).toContain(":root {");
      expect(mockPrisma.tenantBranding.upsert).not.toHaveBeenCalled();
    });

    it("should use FULL_WHITE_LABEL mode when colorPalette is provided in preview", () => {
      const customPalette = {
        primary: "120 50% 50%",
        primaryForeground: "0 0% 100%",
        secondary: "210 40% 96%",
        secondaryForeground: "222 47% 11%",
        background: "0 0% 100%",
        foreground: "222 84% 5%",
        muted: "210 40% 96%",
        mutedForeground: "215 16% 47%",
        accent: "210 40% 96%",
        accentForeground: "222 47% 11%",
        destructive: "0 84% 60%",
        destructiveForeground: "210 40% 98%",
        border: "214 32% 91%",
        input: "214 32% 91%",
        ring: "120 50% 50%",
        card: "0 0% 100%",
        cardForeground: "222 84% 5%",
        popover: "0 0% 100%",
        popoverForeground: "222 84% 5%",
      };

      const css = service.previewCss({ colorPalette: customPalette });

      expect(css).toContain("120 50% 50%");
    });
  });

  describe("getDefaultBranding", () => {
    it("should return default branding config with Ethico blue", () => {
      const defaultBranding = service.getDefaultBranding(mockOrgId);

      expect(defaultBranding.organizationId).toBe(mockOrgId);
      expect(defaultBranding.mode).toBe(BrandingMode.TEMPLATE);
      expect(defaultBranding.theme).toBe(ThemeMode.LIGHT);
      expect(defaultBranding.primaryColor).toBe("221 83% 53%"); // Ethico blue
    });
  });
});
