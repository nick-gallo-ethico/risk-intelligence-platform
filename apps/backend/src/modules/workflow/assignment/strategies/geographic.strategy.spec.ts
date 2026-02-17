import { Test, TestingModule } from "@nestjs/testing";
import { GeographicStrategy, GeographicConfig } from "./geographic.strategy";
import { PrismaService } from "../../../prisma/prisma.service";
import { AssignmentContext } from "./base.strategy";

describe("GeographicStrategy", () => {
  let strategy: GeographicStrategy;

  const orgId = "org-123";
  const entityId = "case-456";

  const mockUser = {
    id: "user-us",
    firstName: "John",
    lastName: "Doe",
  };

  const baseContext: AssignmentContext = {
    organizationId: orgId,
    entityType: "CASE",
    entityId,
  };

  // Define mock outside beforeEach for direct access
  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeographicStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    strategy = module.get<GeographicStrategy>(GeographicStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should have type 'geographic'", () => {
    expect(strategy.type).toBe("geographic");
  });

  describe("resolve", () => {
    it("should match case location to user by country", async () => {
      const contextWithLocation: AssignmentContext = {
        ...baseContext,
        location: {
          id: "loc-1",
          name: "New York Office",
          country: "US",
          region: "North America",
        },
      };

      const config: GeographicConfig = {
        locationMapping: {
          US: "user-us",
          UK: "user-uk",
        },
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await strategy.resolve(contextWithLocation, config);

      expect(result).toEqual({
        userId: "user-us",
        reason: "Geographic assignment to John Doe for US",
      });
    });

    it("should fall back to region when country not matched", async () => {
      const contextWithLocation: AssignmentContext = {
        ...baseContext,
        location: {
          id: "loc-1",
          name: "Paris Office",
          country: "FR", // Not in mapping
          region: "EMEA",
        },
      };

      const config: GeographicConfig = {
        locationMapping: {
          US: "user-us",
          EMEA: "user-emea",
        },
      };

      const emeaUser = {
        id: "user-emea",
        firstName: "Jean",
        lastName: "Dupont",
      };
      mockPrismaService.user.findFirst.mockResolvedValue(emeaUser as any);

      const result = await strategy.resolve(contextWithLocation, config);

      expect(result).toEqual({
        userId: "user-emea",
        reason: "Geographic assignment to Jean Dupont for EMEA",
      });
    });

    it("should fall back to fallbackUserId when no location match", async () => {
      const contextWithLocation: AssignmentContext = {
        ...baseContext,
        location: {
          id: "loc-1",
          name: "Unknown Office",
          country: "ZZ", // Not in mapping
        },
      };

      const config: GeographicConfig = {
        locationMapping: {
          US: "user-us",
        },
        fallbackUserId: "user-default",
      };

      const defaultUser = {
        id: "user-default",
        firstName: "Default",
        lastName: "Handler",
      };
      mockPrismaService.user.findFirst.mockResolvedValue(defaultUser as any);

      const result = await strategy.resolve(contextWithLocation, config);

      expect(result).toEqual({
        userId: "user-default",
        reason: "Geographic assignment to Default Handler (fallback)",
      });
    });

    it("should return null when no location and no fallback", async () => {
      const config: GeographicConfig = {
        locationMapping: { US: "user-us" },
      };

      const result = await strategy.resolve(baseContext, config);

      expect(result).toBeNull();
    });

    it("should handle missing location data with fallback", async () => {
      const config: GeographicConfig = {
        fallbackUserId: "user-default",
      };

      const defaultUser = {
        id: "user-default",
        firstName: "Default",
        lastName: "Handler",
      };
      mockPrismaService.user.findFirst.mockResolvedValue(defaultUser as any);

      const result = await strategy.resolve(baseContext, config);

      expect(result).toEqual({
        userId: "user-default",
        reason: "Geographic assignment to Default Handler (fallback)",
      });
    });

    it("should support location hierarchy (country > region > name > id)", async () => {
      // Test that location ID is also checked
      const contextWithLocation: AssignmentContext = {
        ...baseContext,
        location: {
          id: "building-42",
          name: "Building 42",
          // No country or region
        },
      };

      const config: GeographicConfig = {
        locationMapping: {
          "building-42": "user-b42",
        },
      };

      const b42User = {
        id: "user-b42",
        firstName: "Building",
        lastName: "Manager",
      };
      mockPrismaService.user.findFirst.mockResolvedValue(b42User as any);

      const result = await strategy.resolve(contextWithLocation, config);

      expect(result).toEqual({
        userId: "user-b42",
        reason: "Geographic assignment to Building Manager for building-42",
      });
    });

    it("should prioritize country over region in location hierarchy", async () => {
      const contextWithLocation: AssignmentContext = {
        ...baseContext,
        location: {
          id: "loc-1",
          name: "Berlin Office",
          country: "DE",
          region: "EMEA", // Both country and region in mapping
        },
      };

      const config: GeographicConfig = {
        locationMapping: {
          DE: "user-de", // Should match first
          EMEA: "user-emea",
        },
      };

      const deUser = { id: "user-de", firstName: "Hans", lastName: "Mueller" };
      mockPrismaService.user.findFirst.mockResolvedValue(deUser as any);

      const result = await strategy.resolve(contextWithLocation, config);

      expect(result).toEqual({
        userId: "user-de",
        reason: "Geographic assignment to Hans Mueller for DE",
      });
    });

    it("should return null when designated user not found or inactive", async () => {
      const contextWithLocation: AssignmentContext = {
        ...baseContext,
        location: {
          id: "loc-1",
          name: "Tokyo Office",
          country: "JP",
        },
      };

      const config: GeographicConfig = {
        locationMapping: {
          JP: "user-jp-inactive",
        },
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await strategy.resolve(contextWithLocation, config);

      expect(result).toBeNull();
    });

    it("should verify user is active and in correct organization", async () => {
      const contextWithLocation: AssignmentContext = {
        ...baseContext,
        location: {
          id: "loc-1",
          name: "Sydney Office",
          country: "AU",
        },
      };

      const config: GeographicConfig = {
        locationMapping: {
          AU: "user-au",
        },
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser as any);

      await strategy.resolve(contextWithLocation, config);

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: "user-au",
          organizationId: orgId,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });
    });

    it("should handle empty locationMapping gracefully", async () => {
      const contextWithLocation: AssignmentContext = {
        ...baseContext,
        location: {
          id: "loc-1",
          name: "Office",
          country: "US",
        },
      };

      const config: GeographicConfig = {
        locationMapping: {},
        fallbackUserId: "user-fallback",
      };

      const fallbackUser = {
        id: "user-fallback",
        firstName: "Fallback",
        lastName: "User",
      };
      mockPrismaService.user.findFirst.mockResolvedValue(fallbackUser as any);

      const result = await strategy.resolve(contextWithLocation, config);

      expect(result?.userId).toBe("user-fallback");
    });

    it("should handle location with only name (no country/region)", async () => {
      const contextWithLocation: AssignmentContext = {
        ...baseContext,
        location: {
          id: "loc-1",
          name: "Headquarters",
        },
      };

      const config: GeographicConfig = {
        locationMapping: {
          Headquarters: "user-hq",
        },
      };

      const hqUser = { id: "user-hq", firstName: "HQ", lastName: "Manager" };
      mockPrismaService.user.findFirst.mockResolvedValue(hqUser as any);

      const result = await strategy.resolve(contextWithLocation, config);

      expect(result).toEqual({
        userId: "user-hq",
        reason: "Geographic assignment to HQ Manager for Headquarters",
      });
    });

    it("should respect tenant isolation in user lookup", async () => {
      const otherOrgContext: AssignmentContext = {
        ...baseContext,
        organizationId: "org-other",
        location: {
          id: "loc-1",
          name: "Office",
          country: "US",
        },
      };

      const config: GeographicConfig = {
        locationMapping: { US: "user-us" },
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await strategy.resolve(otherOrgContext, config);

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-other",
          }),
        }),
      );
    });
  });
});
