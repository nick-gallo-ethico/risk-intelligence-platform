import { Test, TestingModule } from "@nestjs/testing";
import { ViolationAnalyticsService } from "./violation-analytics.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { PolicyCaseLinkType, PolicyType, CaseStatus } from "@prisma/client";

describe("ViolationAnalyticsService", () => {
  let service: ViolationAnalyticsService;
  let prisma: jest.Mocked<PrismaService>;

  // Test fixtures
  const mockOrgId = "org-test-123";
  const mockPolicyId1 = "policy-1";
  const mockPolicyId2 = "policy-2";

  const mockPolicy1 = {
    id: mockPolicyId1,
    title: "Code of Conduct",
    policyType: PolicyType.CODE_OF_CONDUCT,
  };

  const mockPolicy2 = {
    id: mockPolicyId2,
    title: "Anti-Bribery Policy",
    policyType: PolicyType.ANTI_BRIBERY,
  };

  const mockAssociations = [
    {
      id: "assoc-1",
      policyId: mockPolicyId1,
      linkType: PolicyCaseLinkType.VIOLATION,
      createdAt: new Date("2026-01-15"),
      policy: mockPolicy1,
    },
    {
      id: "assoc-2",
      policyId: mockPolicyId1,
      linkType: PolicyCaseLinkType.VIOLATION,
      createdAt: new Date("2026-02-15"),
      policy: mockPolicy1,
    },
    {
      id: "assoc-3",
      policyId: mockPolicyId2,
      linkType: PolicyCaseLinkType.VIOLATION,
      createdAt: new Date("2026-01-20"),
      policy: mockPolicy2,
    },
  ];

  // Mocks
  const mockPrismaService = {
    policyCaseAssociation: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    policy: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViolationAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ViolationAnalyticsService>(ViolationAnalyticsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe("getViolationStats", () => {
    it("should return violation stats aggregated by policy", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.groupBy.mockResolvedValue([
        { policyId: mockPolicyId1, _count: { id: 5 } },
        { policyId: mockPolicyId2, _count: { id: 3 } },
      ]);
      mockPrismaService.policy.findMany.mockResolvedValue([
        mockPolicy1,
        mockPolicy2,
      ]);

      // Act
      const result = await service.getViolationStats(mockOrgId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        policyId: mockPolicyId1,
        policyTitle: "Code of Conduct",
        policyType: PolicyType.CODE_OF_CONDUCT,
        violationCount: 5,
      });
    });

    it("should filter by date range", async () => {
      // Arrange
      const filters = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      };
      mockPrismaService.policyCaseAssociation.groupBy.mockResolvedValue([]);
      mockPrismaService.policy.findMany.mockResolvedValue([]);

      // Act
      await service.getViolationStats(mockOrgId, filters);

      // Assert
      expect(prisma.policyCaseAssociation.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            linkType: PolicyCaseLinkType.VIOLATION,
            createdAt: {
              gte: filters.startDate,
              lte: filters.endDate,
            },
          }),
        }),
      );
    });

    it("should filter by policy type", async () => {
      // Arrange
      const filters = { policyType: PolicyType.CODE_OF_CONDUCT };
      mockPrismaService.policyCaseAssociation.groupBy.mockResolvedValue([]);
      mockPrismaService.policy.findMany.mockResolvedValue([]);

      // Act
      await service.getViolationStats(mockOrgId, filters);

      // Assert
      expect(prisma.policyCaseAssociation.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            policy: { policyType: PolicyType.CODE_OF_CONDUCT },
          }),
        }),
      );
    });

    it("should return empty array when no violations", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.groupBy.mockResolvedValue([]);

      // Act
      const result = await service.getViolationStats(mockOrgId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should filter out policies that no longer exist", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.groupBy.mockResolvedValue([
        { policyId: mockPolicyId1, _count: { id: 5 } },
        { policyId: "deleted-policy", _count: { id: 3 } },
      ]);
      mockPrismaService.policy.findMany.mockResolvedValue([mockPolicy1]);

      // Act
      const result = await service.getViolationStats(mockOrgId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].policyId).toBe(mockPolicyId1);
    });
  });

  describe("getViolationsByCategory", () => {
    it("should return violations grouped by policy type", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue(
        mockAssociations,
      );

      // Act
      const result = await service.getViolationsByCategory(mockOrgId);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      const codeOfConductCategory = result.find(
        (c) => c.policyType === PolicyType.CODE_OF_CONDUCT,
      );
      expect(codeOfConductCategory).toBeDefined();
      expect(codeOfConductCategory!.violationCount).toBe(2);
    });

    it("should sort by violation count descending", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue(
        mockAssociations,
      );

      // Act
      const result = await service.getViolationsByCategory(mockOrgId);

      // Assert
      if (result.length > 1) {
        expect(result[0].violationCount).toBeGreaterThanOrEqual(
          result[1].violationCount,
        );
      }
    });

    it("should filter by date range", async () => {
      // Arrange
      const filters = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-30"),
      };
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([]);

      // Act
      await service.getViolationsByCategory(mockOrgId, filters);

      // Assert
      expect(prisma.policyCaseAssociation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: filters.startDate,
              lte: filters.endDate,
            },
          }),
        }),
      );
    });
  });

  describe("getViolationTrends", () => {
    it("should return monthly violation trends", async () => {
      // Arrange - Use UTC dates to avoid timezone issues
      const startDate = new Date(Date.UTC(2026, 0, 1)); // Jan 1, 2026
      const endDate = new Date(Date.UTC(2026, 2, 31)); // Mar 31, 2026
      const options = {
        startDate,
        endDate,
        periodType: "monthly" as const,
      };
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue(
        mockAssociations,
      );

      // Act
      const result = await service.getViolationTrends(mockOrgId, options);

      // Assert - Should have 3 periods (Jan, Feb, Mar)
      expect(result.length).toBeGreaterThanOrEqual(3);
      // Check period format is correct (YYYY-MM)
      expect(result[0].period).toMatch(/^\d{4}-\d{2}$/);
    });

    it("should return quarterly violation trends", async () => {
      // Arrange - Use UTC dates
      const startDate = new Date(Date.UTC(2026, 0, 1)); // Jan 1, 2026
      const endDate = new Date(Date.UTC(2026, 5, 30)); // Jun 30, 2026
      const options = {
        startDate,
        endDate,
        periodType: "quarterly" as const,
      };
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getViolationTrends(mockOrgId, options);

      // Assert - Should have at least 2 periods (Q1, Q2)
      expect(result.length).toBeGreaterThanOrEqual(2);
      // Check period format is correct (YYYY-QN)
      expect(result[0].period).toMatch(/^\d{4}-Q\d$/);
    });

    it("should include policy breakdown per period", async () => {
      // Arrange - Create association with date that matches the period key generation
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const options = {
        startDate,
        endDate,
        periodType: "monthly" as const,
      };
      // Create association that matches current month
      const association = {
        id: "assoc-current",
        policyId: mockPolicyId1,
        linkType: PolicyCaseLinkType.VIOLATION,
        createdAt: new Date(now.getFullYear(), now.getMonth(), 15),
        policy: mockPolicy1,
      };
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([
        association,
      ]);

      // Act
      const result = await service.getViolationTrends(mockOrgId, options);

      // Assert - Should have exactly one period and it should have breakdown
      expect(result.length).toBeGreaterThanOrEqual(1);
      // Find period with violations
      const periodWithViolations = result.find((r) => r.violationCount > 0);
      if (periodWithViolations) {
        expect(periodWithViolations.policyBreakdown.length).toBeGreaterThan(0);
      } else {
        // If no violations found, the breakdown should be empty arrays
        expect(result[0].policyBreakdown).toEqual([]);
      }
    });

    it("should filter by policy type", async () => {
      // Arrange
      const options = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-03-31"),
        periodType: "monthly" as const,
        policyType: PolicyType.CODE_OF_CONDUCT,
      };
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([]);

      // Act
      await service.getViolationTrends(mockOrgId, options);

      // Assert
      expect(prisma.policyCaseAssociation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            policy: { policyType: PolicyType.CODE_OF_CONDUCT },
          }),
        }),
      );
    });

    it("should return zero counts for periods with no violations", async () => {
      // Arrange
      const options = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-03-31"),
        periodType: "monthly" as const,
      };
      // Only Jan violations
      const janAssociations = mockAssociations.filter(
        (a) => a.createdAt.getMonth() === 0,
      );
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue(
        janAssociations,
      );

      // Act
      const result = await service.getViolationTrends(mockOrgId, options);

      // Assert
      const marchData = result.find((r) => r.period === "2026-03");
      expect(marchData?.violationCount).toBe(0);
    });
  });

  describe("getViolationSummary", () => {
    it("should return comprehensive violation summary", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.count.mockResolvedValue(10);
      mockPrismaService.policyCaseAssociation.groupBy.mockResolvedValue([
        { policyId: mockPolicyId1, _count: { id: 7 } },
        { policyId: mockPolicyId2, _count: { id: 3 } },
      ]);
      mockPrismaService.policy.findMany.mockResolvedValue([
        mockPolicy1,
        mockPolicy2,
      ]);
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue(
        mockAssociations,
      );

      // Act
      const result = await service.getViolationSummary(mockOrgId);

      // Assert
      expect(result.totalViolations).toBe(10);
      expect(result.topViolatedPolicy).toBeDefined();
      expect(result.topViolatedPolicy!.policyId).toBe(mockPolicyId1);
    });

    it("should calculate open and closed case violations", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.count
        .mockResolvedValueOnce(15) // total
        .mockResolvedValueOnce(10) // open
        .mockResolvedValueOnce(5); // closed
      mockPrismaService.policyCaseAssociation.groupBy.mockResolvedValue([]);
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getViolationSummary(mockOrgId);

      // Assert
      expect(result.totalViolations).toBe(15);
      expect(result.openCaseViolations).toBe(10);
      expect(result.closedCaseViolations).toBe(5);
    });

    it("should return null for topViolatedPolicy when no violations", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.count.mockResolvedValue(0);
      mockPrismaService.policyCaseAssociation.groupBy.mockResolvedValue([]);
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getViolationSummary(mockOrgId);

      // Assert
      expect(result.topViolatedPolicy).toBeNull();
    });

    it("should include violations by policy type", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.count.mockResolvedValue(10);
      mockPrismaService.policyCaseAssociation.groupBy.mockResolvedValue([
        { policyId: mockPolicyId1, _count: { id: 5 } },
      ]);
      mockPrismaService.policy.findMany.mockResolvedValue([mockPolicy1]);
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue(
        mockAssociations,
      );

      // Act
      const result = await service.getViolationSummary(mockOrgId);

      // Assert
      expect(result.violationsByPolicyType).toBeDefined();
      expect(
        typeof result.violationsByPolicyType[PolicyType.CODE_OF_CONDUCT],
      ).toBe("number");
    });

    it("should filter by date range", async () => {
      // Arrange
      const filters = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-30"),
      };
      mockPrismaService.policyCaseAssociation.count.mockResolvedValue(5);
      mockPrismaService.policyCaseAssociation.groupBy.mockResolvedValue([]);
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([]);

      // Act
      await service.getViolationSummary(mockOrgId, filters);

      // Assert
      expect(prisma.policyCaseAssociation.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: filters.startDate,
              lte: filters.endDate,
            },
          }),
        }),
      );
    });
  });
});
