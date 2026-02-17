import { Test, TestingModule } from "@nestjs/testing";
import {
  LeastLoadedStrategy,
  LeastLoadedConfig,
} from "./least-loaded.strategy";
import { PrismaService } from "../../../prisma/prisma.service";
import { AssignmentContext } from "./base.strategy";
import { UserRole } from "@prisma/client";

describe("LeastLoadedStrategy", () => {
  let strategy: LeastLoadedStrategy;

  const orgId = "org-123";
  const entityId = "case-456";

  const baseContext: AssignmentContext = {
    organizationId: orgId,
    entityType: "CASE",
    entityId,
  };

  // Define mock outside beforeEach for direct access
  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeastLoadedStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    strategy = module.get<LeastLoadedStrategy>(LeastLoadedStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should have type 'least_loaded'", () => {
    expect(strategy.type).toBe("least_loaded");
  });

  describe("resolve", () => {
    it("should return user with fewest active cases", async () => {
      const usersWithLoad = [
        {
          id: "user-1",
          firstName: "Alice",
          lastName: "Smith",
          _count: { investigationsPrimaryInvestigator: 5 },
        },
        {
          id: "user-2",
          firstName: "Bob",
          lastName: "Jones",
          _count: { investigationsPrimaryInvestigator: 2 },
        },
        {
          id: "user-3",
          firstName: "Carol",
          lastName: "Wilson",
          _count: { investigationsPrimaryInvestigator: 8 },
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(usersWithLoad as any);

      const result = await strategy.resolve(baseContext, {});

      expect(result).toEqual({
        userId: "user-2",
        reason: "Least-loaded assignment to Bob Jones (2 active)",
      });
    });

    it("should handle tie by returning first in sort order", async () => {
      const usersWithSameLoad = [
        {
          id: "user-1",
          firstName: "Alice",
          lastName: "Smith",
          _count: { investigationsPrimaryInvestigator: 3 },
        },
        {
          id: "user-2",
          firstName: "Bob",
          lastName: "Jones",
          _count: { investigationsPrimaryInvestigator: 3 },
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(
        usersWithSameLoad as any,
      );

      const result = await strategy.resolve(baseContext, {});

      // First user in alphabetically sorted list with same count
      expect(result?.userId).toBe("user-1");
    });

    it("should only count open cases (not closed)", async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await strategy.resolve(baseContext, {});

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            _count: {
              select: {
                investigationsPrimaryInvestigator: {
                  where: { status: { not: "CLOSED" } },
                },
              },
            },
          }),
        }),
      );
    });

    it("should filter inactive users", async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await strategy.resolve(baseContext, {});

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it("should respect capacity limits when maxLoad configured", async () => {
      const usersWithLoad = [
        {
          id: "user-1",
          firstName: "Alice",
          lastName: "Smith",
          _count: { investigationsPrimaryInvestigator: 10 }, // At capacity
        },
        {
          id: "user-2",
          firstName: "Bob",
          lastName: "Jones",
          _count: { investigationsPrimaryInvestigator: 10 }, // At capacity
        },
        {
          id: "user-3",
          firstName: "Carol",
          lastName: "Wilson",
          _count: { investigationsPrimaryInvestigator: 5 }, // Under capacity
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(usersWithLoad as any);

      const config: LeastLoadedConfig = { maxLoad: 10 };
      const result = await strategy.resolve(baseContext, config);

      expect(result).toEqual({
        userId: "user-3",
        reason: "Least-loaded assignment to Carol Wilson (5 active)",
      });
    });

    it("should return null when all users at capacity", async () => {
      const usersAtCapacity = [
        {
          id: "user-1",
          firstName: "Alice",
          lastName: "Smith",
          _count: { investigationsPrimaryInvestigator: 10 },
        },
        {
          id: "user-2",
          firstName: "Bob",
          lastName: "Jones",
          _count: { investigationsPrimaryInvestigator: 15 },
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(usersAtCapacity as any);

      const config: LeastLoadedConfig = { maxLoad: 10 };
      const result = await strategy.resolve(baseContext, config);

      expect(result).toBeNull();
    });

    it("should return null when no eligible users", async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await strategy.resolve(baseContext, {});

      expect(result).toBeNull();
    });

    it("should filter by role when roleFilter provided", async () => {
      const config: LeastLoadedConfig = {
        roleFilter: [UserRole.INVESTIGATOR, UserRole.COMPLIANCE_OFFICER],
      };

      mockPrismaService.user.findMany.mockResolvedValue([]);

      await strategy.resolve(baseContext, config);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { in: [UserRole.INVESTIGATOR, UserRole.COMPLIANCE_OFFICER] },
          }),
        }),
      );
    });

    it("should respect tenant isolation", async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await strategy.resolve(baseContext, {});

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: orgId,
          }),
        }),
      );
    });

    it("should handle user with zero load", async () => {
      const usersWithLoad = [
        {
          id: "user-1",
          firstName: "Alice",
          lastName: "Smith",
          _count: { investigationsPrimaryInvestigator: 5 },
        },
        {
          id: "user-2",
          firstName: "Bob",
          lastName: "Jones",
          _count: { investigationsPrimaryInvestigator: 0 }, // No active cases
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(usersWithLoad as any);

      const result = await strategy.resolve(baseContext, {});

      expect(result).toEqual({
        userId: "user-2",
        reason: "Least-loaded assignment to Bob Jones (0 active)",
      });
    });

    it("should correctly sort users by load ascending", async () => {
      const usersUnsorted = [
        {
          id: "user-1",
          firstName: "Alice",
          lastName: "Smith",
          _count: { investigationsPrimaryInvestigator: 8 },
        },
        {
          id: "user-2",
          firstName: "Bob",
          lastName: "Jones",
          _count: { investigationsPrimaryInvestigator: 3 },
        },
        {
          id: "user-3",
          firstName: "Carol",
          lastName: "Wilson",
          _count: { investigationsPrimaryInvestigator: 5 },
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(usersUnsorted as any);

      const result = await strategy.resolve(baseContext, {});

      // Bob has 3, Carol has 5, Alice has 8 - should select Bob
      expect(result?.userId).toBe("user-2");
    });

    it("should skip users at maxLoad even with lower count than others", async () => {
      // Edge case: first in sort order is at capacity
      const usersWithLoad = [
        {
          id: "user-1",
          firstName: "Alice",
          lastName: "Smith",
          _count: { investigationsPrimaryInvestigator: 5 }, // At maxLoad
        },
        {
          id: "user-2",
          firstName: "Bob",
          lastName: "Jones",
          _count: { investigationsPrimaryInvestigator: 4 }, // Under maxLoad
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(usersWithLoad as any);

      const config: LeastLoadedConfig = { maxLoad: 5 };
      const result = await strategy.resolve(baseContext, config);

      expect(result?.userId).toBe("user-2");
    });
  });
});
