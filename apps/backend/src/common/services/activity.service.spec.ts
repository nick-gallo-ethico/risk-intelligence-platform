// =============================================================================
// ACTIVITY SERVICE - UNIT TESTS
// =============================================================================
//
// Tests for the ActivityService.
// Key test scenarios:
// - Activity logging with correct organization
// - Actor name denormalization
// - System actions (no actor)
// - Non-blocking error handling
// - Tenant isolation in queries
// - Pagination
// =============================================================================

import { Test, TestingModule } from "@nestjs/testing";
import { ActivityService, LogActivityInput } from "./activity.service";
import { ActivityDescriptionGenerator } from "./activity-description.service";
import { PrismaService } from "../../modules/prisma/prisma.service";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";

describe("ActivityService", () => {
  let service: ActivityService;
  let prismaService: jest.Mocked<PrismaService>;
  let descriptionGenerator: jest.Mocked<ActivityDescriptionGenerator>;

  // Test data
  const mockOrganizationId = "org-uuid-123";
  const mockUserId = "user-uuid-456";
  const mockEntityId = "entity-uuid-789";

  const mockUser = {
    id: mockUserId,
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
  };

  const mockAuditLog = {
    id: "audit-uuid-001",
    organizationId: mockOrganizationId,
    entityType: AuditEntityType.CASE,
    entityId: mockEntityId,
    action: "status_changed",
    actionCategory: AuditActionCategory.UPDATE,
    actionDescription: "John Doe changed status from OPEN to CLOSED",
    actorUserId: mockUserId,
    actorType: ActorType.USER,
    actorName: "John Doe",
    changes: { oldValue: { status: "OPEN" }, newValue: { status: "CLOSED" } },
    context: null,
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0",
    requestId: "req-123",
    createdAt: new Date("2026-01-29T12:00:00Z"),
    actorUser: {
      id: mockUserId,
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    },
  };

  beforeEach(async () => {
    // Create mock implementations
    const mockPrismaService = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    };

    const mockDescriptionGenerator = {
      generate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ActivityDescriptionGenerator,
          useValue: mockDescriptionGenerator,
        },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    prismaService = module.get(PrismaService);
    descriptionGenerator = module.get(ActivityDescriptionGenerator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // LOG METHOD TESTS
  // -------------------------------------------------------------------------

  describe("log()", () => {
    it("should create activity log with correct organization", async () => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(
        mockAuditLog,
      );

      const input: LogActivityInput = {
        entityType: AuditEntityType.CASE,
        entityId: mockEntityId,
        action: "status_changed",
        actionDescription: "John Doe changed status from OPEN to CLOSED",
        organizationId: mockOrganizationId,
        actorUserId: mockUserId,
        changes: {
          oldValue: { status: "OPEN" },
          newValue: { status: "CLOSED" },
        },
      };

      // Act
      const result = await service.log(input);

      // Assert
      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrganizationId,
            entityType: AuditEntityType.CASE,
            entityId: mockEntityId,
          }),
        }),
      );
      expect(result).not.toBeNull();
      expect(result?.organizationId).toBe(mockOrganizationId);
    });

    it("should denormalize actor name", async () => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(
        mockAuditLog,
      );

      const input: LogActivityInput = {
        entityType: AuditEntityType.CASE,
        entityId: mockEntityId,
        action: "created",
        actionDescription: "John Doe created Case",
        organizationId: mockOrganizationId,
        actorUserId: mockUserId,
      };

      // Act
      await service.log(input);

      // Assert
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockUserId,
          organizationId: mockOrganizationId,
        },
        select: {
          firstName: true,
          lastName: true,
        },
      });
      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorName: "John Doe",
          }),
        }),
      );
    });

    it("should handle null actorUserId gracefully", async () => {
      // Arrange
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({
        ...mockAuditLog,
        actorUserId: null,
        actorName: null,
        actorType: ActorType.SYSTEM,
        actorUser: null,
      });

      const input: LogActivityInput = {
        entityType: AuditEntityType.CASE,
        entityId: mockEntityId,
        action: "created",
        actionDescription: "System created Case",
        organizationId: mockOrganizationId,
        // No actorUserId
      };

      // Act
      const result = await service.log(input);

      // Assert
      expect(prismaService.user.findFirst).not.toHaveBeenCalled();
      expect(result?.actorName).toBeNull();
    });

    it("should handle system actions (no actor)", async () => {
      // Arrange
      const systemAuditLog = {
        ...mockAuditLog,
        actorUserId: null,
        actorType: ActorType.SYSTEM,
        actorName: null,
        actorUser: null,
      };
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(
        systemAuditLog,
      );

      const input: LogActivityInput = {
        entityType: AuditEntityType.CASE,
        entityId: mockEntityId,
        action: "synced",
        actionDescription: "HRIS sync updated 150 records",
        organizationId: mockOrganizationId,
        actorType: ActorType.SYSTEM,
      };

      // Act
      const result = await service.log(input);

      // Assert
      expect(prismaService.user.findFirst).not.toHaveBeenCalled();
      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorUserId: null,
            actorType: ActorType.SYSTEM,
            actorName: null,
          }),
        }),
      );
      expect(result?.actorType).toBe(ActorType.SYSTEM);
    });

    it("should not throw when logging fails", async () => {
      // Arrange
      (prismaService.auditLog.create as jest.Mock).mockRejectedValue(
        new Error("Database connection error"),
      );

      const input: LogActivityInput = {
        entityType: AuditEntityType.CASE,
        entityId: mockEntityId,
        action: "created",
        actionDescription: "Test action",
        organizationId: mockOrganizationId,
        actorUserId: mockUserId,
      };

      // Act & Assert - should not throw
      const result = await service.log(input);

      expect(result).toBeNull();
    });

    it("should auto-generate description when not provided", async () => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(
        mockAuditLog,
      );
      (descriptionGenerator.generate as jest.Mock).mockReturnValue(
        "John Doe created Case",
      );

      const input: LogActivityInput = {
        entityType: AuditEntityType.CASE,
        entityId: mockEntityId,
        action: "created",
        // No actionDescription provided
        organizationId: mockOrganizationId,
        actorUserId: mockUserId,
      };

      // Act
      await service.log(input);

      // Assert
      expect(descriptionGenerator.generate).toHaveBeenCalled();
      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionDescription: "John Doe created Case",
          }),
        }),
      );
    });

    it("should capture request metadata", async () => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(
        mockAuditLog,
      );

      const input: LogActivityInput = {
        entityType: AuditEntityType.CASE,
        entityId: mockEntityId,
        action: "created",
        actionDescription: "John Doe created Case",
        organizationId: mockOrganizationId,
        actorUserId: mockUserId,
        ipAddress: "192.168.1.100",
        userAgent: "TestAgent/1.0",
        requestId: "req-456",
      };

      // Act
      await service.log(input);

      // Assert
      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: "192.168.1.100",
            userAgent: "TestAgent/1.0",
            requestId: "req-456",
          }),
        }),
      );
    });

    it("should infer action category when not provided", async () => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({
        ...mockAuditLog,
        action: "created",
        actionCategory: AuditActionCategory.CREATE,
      });

      const input: LogActivityInput = {
        entityType: AuditEntityType.CASE,
        entityId: mockEntityId,
        action: "created",
        actionDescription: "John Doe created Case",
        organizationId: mockOrganizationId,
        actorUserId: mockUserId,
        // No actionCategory provided
      };

      // Act
      await service.log(input);

      // Assert
      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionCategory: AuditActionCategory.CREATE,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // GET ENTITY TIMELINE TESTS
  // -------------------------------------------------------------------------

  describe("getEntityTimeline()", () => {
    it("should filter timeline by organization", async () => {
      // Arrange
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLog,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      await service.getEntityTimeline(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrganizationId,
      );

      // Assert
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
            entityType: AuditEntityType.CASE,
            entityId: mockEntityId,
          }),
        }),
      );
    });

    it("should paginate results correctly", async () => {
      // Arrange
      const activities = Array.from({ length: 5 }, (_, i) => ({
        ...mockAuditLog,
        id: `audit-uuid-00${i}`,
      }));
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(
        activities,
      );
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(25);

      // Act
      const result = await service.getEntityTimeline(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrganizationId,
        { page: 2, limit: 5 },
      );

      // Assert
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page 2 - 1) * limit 5
          take: 5,
        }),
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 25,
        totalPages: 5,
      });
    });

    it("should order by createdAt descending by default", async () => {
      // Arrange
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLog,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      await service.getEntityTimeline(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrganizationId,
      );

      // Assert
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("should include actor user details", async () => {
      // Arrange
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLog,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await service.getEntityTimeline(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrganizationId,
      );

      // Assert
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            actorUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
      );
      expect(result.items[0].actorUser).toBeDefined();
      expect(result.items[0].actorUser?.name).toBe("John Doe");
    });
  });

  // -------------------------------------------------------------------------
  // GET ORGANIZATION ACTIVITY TESTS
  // -------------------------------------------------------------------------

  describe("getOrganizationActivity()", () => {
    it("should filter by organization", async () => {
      // Arrange
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLog,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      await service.getOrganizationActivity(mockOrganizationId);

      // Assert
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
          }),
        }),
      );
    });

    it("should filter by action category when provided", async () => {
      // Arrange
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLog,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      await service.getOrganizationActivity(mockOrganizationId, {
        actionCategory: AuditActionCategory.CREATE,
      });

      // Assert
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
            actionCategory: AuditActionCategory.CREATE,
          }),
        }),
      );
    });

    it("should filter by date range when provided", async () => {
      // Arrange
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLog,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);
      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-01-31");

      // Act
      await service.getOrganizationActivity(mockOrganizationId, {
        startDate,
        endDate,
      });

      // Assert
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });

    it("should paginate results correctly", async () => {
      // Arrange
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLog,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(100);

      // Act
      const result = await service.getOrganizationActivity(mockOrganizationId, {
        page: 3,
        limit: 10,
      });

      // Assert
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (page 3 - 1) * limit 10
          take: 10,
        }),
      );
      expect(result.pagination.totalPages).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // GET USER ACTIVITY TESTS
  // -------------------------------------------------------------------------

  describe("getUserActivity()", () => {
    it("should filter by user and organization", async () => {
      // Arrange
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLog,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      await service.getUserActivity(mockUserId, mockOrganizationId);

      // Assert
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrganizationId,
            actorUserId: mockUserId,
          }),
        }),
      );
    });

    it("should paginate results correctly", async () => {
      // Arrange
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLog,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(50);

      // Act
      const result = await service.getUserActivity(
        mockUserId,
        mockOrganizationId,
        {
          page: 2,
          limit: 25,
        },
      );

      // Assert
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 25,
          take: 25,
        }),
      );
      expect(result.pagination.totalPages).toBe(2);
    });

    it("should filter by date range when provided", async () => {
      // Arrange
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLog,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);
      const startDate = new Date("2026-01-15");
      const endDate = new Date("2026-01-20");

      // Act
      await service.getUserActivity(mockUserId, mockOrganizationId, {
        startDate,
        endDate,
      });

      // Assert
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            actorUserId: mockUserId,
            organizationId: mockOrganizationId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // ACTION CATEGORY INFERENCE TESTS
  // -------------------------------------------------------------------------

  describe("action category inference", () => {
    it.each([
      ["created", AuditActionCategory.CREATE],
      ["deleted", AuditActionCategory.DELETE],
      ["viewed", AuditActionCategory.ACCESS],
      ["exported", AuditActionCategory.ACCESS],
      ["login", AuditActionCategory.SECURITY],
      ["login_failed", AuditActionCategory.SECURITY],
      ["ai_generated", AuditActionCategory.AI],
      ["ai_edited", AuditActionCategory.AI],
      ["synced", AuditActionCategory.SYSTEM],
      ["updated", AuditActionCategory.UPDATE],
      ["status_changed", AuditActionCategory.UPDATE],
    ])("should infer %s as %s", async (action, expectedCategory) => {
      // Arrange
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({
        ...mockAuditLog,
        action,
        actionCategory: expectedCategory,
      });

      const input: LogActivityInput = {
        entityType: AuditEntityType.CASE,
        entityId: mockEntityId,
        action,
        actionDescription: `Test ${action}`,
        organizationId: mockOrganizationId,
        actorUserId: mockUserId,
      };

      // Act
      await service.log(input);

      // Assert
      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionCategory: expectedCategory,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // RESPONSE MAPPING TESTS
  // -------------------------------------------------------------------------

  describe("response mapping", () => {
    it("should map actor user to response format", async () => {
      // Arrange
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLog,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await service.getEntityTimeline(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrganizationId,
      );

      // Assert
      expect(result.items[0].actorUser).toEqual({
        id: mockUserId,
        name: "John Doe",
        email: "john.doe@example.com",
      });
    });

    it("should handle null actor user", async () => {
      // Arrange
      const systemActivity = {
        ...mockAuditLog,
        actorUserId: null,
        actorType: ActorType.SYSTEM,
        actorUser: null,
      };
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        systemActivity,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await service.getEntityTimeline(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrganizationId,
      );

      // Assert
      expect(result.items[0].actorUser).toBeUndefined();
      expect(result.items[0].actorType).toBe(ActorType.SYSTEM);
    });
  });
});
