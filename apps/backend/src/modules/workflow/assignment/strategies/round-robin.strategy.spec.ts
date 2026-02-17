import { Test, TestingModule } from "@nestjs/testing";
import { RoundRobinStrategy, RoundRobinConfig } from "./round-robin.strategy";
import { PrismaService } from "../../../prisma/prisma.service";
import { AssignmentContext } from "./base.strategy";
import { UserRole } from "@prisma/client";

describe("RoundRobinStrategy", () => {
  let strategy: RoundRobinStrategy;

  const orgId = "org-123";
  const entityId = "case-456";

  const mockUsers = [
    { id: "user-1", firstName: "Alice", lastName: "Smith" },
    { id: "user-2", firstName: "Bob", lastName: "Jones" },
    { id: "user-3", firstName: "Carol", lastName: "Wilson" },
  ];

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
    auditLog: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoundRobinStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    strategy = module.get<RoundRobinStrategy>(RoundRobinStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should have type 'round_robin'", () => {
    expect(strategy.type).toBe("round_robin");
  });

  describe("resolve", () => {
    it("should return users in rotating order", async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      // Last assignment was to user-1
      mockPrismaService.auditLog.findFirst.mockResolvedValue({
        changes: { assignedTo: { new: "user-1" } },
      } as any);

      const result = await strategy.resolve(baseContext, {});

      // Next user after user-1 should be user-2 (index 1)
      expect(result).toEqual({
        userId: "user-2",
        reason: "Round-robin assignment to Bob Jones",
      });
    });

    it("should wrap around to first user after last", async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      // Last assignment was to user-3 (last in list)
      mockPrismaService.auditLog.findFirst.mockResolvedValue({
        changes: { assignedTo: { new: "user-3" } },
      } as any);

      const result = await strategy.resolve(baseContext, {});

      // Should wrap around to user-1 (index 0)
      expect(result).toEqual({
        userId: "user-1",
        reason: "Round-robin assignment to Alice Smith",
      });
    });

    it("should return first user when no previous assignment exists", async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.auditLog.findFirst.mockResolvedValue(null);

      const result = await strategy.resolve(baseContext, {});

      expect(result).toEqual({
        userId: "user-1",
        reason: "Round-robin assignment to Alice Smith",
      });
    });

    it("should handle single user (always return same)", async () => {
      const singleUser = [mockUsers[0]];
      mockPrismaService.user.findMany.mockResolvedValue(singleUser as any);
      mockPrismaService.auditLog.findFirst.mockResolvedValue({
        changes: { assignedTo: { new: "user-1" } },
      } as any);

      const result = await strategy.resolve(baseContext, {});

      // With single user, next index wraps to 0
      expect(result?.userId).toBe("user-1");
    });

    it("should handle user list change (re-index to first)", async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      // Last assigned user no longer in the list
      mockPrismaService.auditLog.findFirst.mockResolvedValue({
        changes: { assignedTo: { new: "user-removed" } },
      } as any);

      const result = await strategy.resolve(baseContext, {});

      // When previous user not found, start from index 0
      expect(result?.userId).toBe("user-1");
    });

    it("should filter by role when roleFilter provided", async () => {
      const config: RoundRobinConfig = {
        roleFilter: [UserRole.INVESTIGATOR],
      };

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.auditLog.findFirst.mockResolvedValue(null);

      await strategy.resolve(baseContext, config);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          isActive: true,
          role: { in: [UserRole.INVESTIGATOR] },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
        orderBy: { createdAt: "asc" },
      });
    });

    it("should only consider active users", async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.auditLog.findFirst.mockResolvedValue(null);

      await strategy.resolve(baseContext, {});

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it("should return null when no eligible users", async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.findFirst.mockResolvedValue(null);

      const result = await strategy.resolve(baseContext, {});

      expect(result).toBeNull();
    });

    it("should respect tenant isolation in queries", async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.auditLog.findFirst.mockResolvedValue(null);

      await strategy.resolve(baseContext, {});

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: orgId,
          }),
        }),
      );

      expect(mockPrismaService.auditLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: orgId,
          }),
        }),
      );
    });

    it("should order users consistently for stable rotation", async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.auditLog.findFirst.mockResolvedValue(null);

      await strategy.resolve(baseContext, {});

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "asc" },
        }),
      );
    });

    it("should look up last assignment in audit logs", async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrismaService.auditLog.findFirst.mockResolvedValue(null);

      await strategy.resolve(baseContext, {});

      expect(mockPrismaService.auditLog.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          entityType: "CASE",
          action: "assigned",
        },
        orderBy: { createdAt: "desc" },
        select: { changes: true },
      });
    });
  });
});
