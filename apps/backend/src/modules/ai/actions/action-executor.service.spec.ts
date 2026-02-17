import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { ActionExecutorService } from "./action-executor.service";
import { ActionCatalog } from "./action.catalog";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ActionCategory,
  ActionContext,
  ActionDefinition,
  ActionPreview,
  ActionResult,
} from "./action.types";
import { z } from "zod";

// Mock interfaces for better TypeScript compatibility
interface MockAiAction {
  create: jest.Mock;
  update: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
}

interface MockPrismaService {
  aiAction: MockAiAction;
}

describe("ActionExecutorService", () => {
  let service: ActionExecutorService;
  let mockPrisma: MockPrismaService;
  let mockCatalog: {
    getAction: jest.Mock;
    requiresPreview: jest.Mock;
  };
  let mockEventEmitter: {
    emit: jest.Mock;
  };

  const mockContext: ActionContext = {
    organizationId: "org-123",
    userId: "user-456",
    userRole: "ADMIN",
    permissions: ["cases:update", "notes:create"],
    entityType: "case",
    entityId: "case-789",
    conversationId: "conv-111",
  };

  const createMockAction = (
    overrides: Partial<ActionDefinition> = {},
  ): ActionDefinition => ({
    id: "test-action",
    name: "Test Action",
    description: "A test action",
    category: ActionCategory.STANDARD,
    entityTypes: ["case"],
    requiredPermissions: ["cases:update"],
    undoWindowSeconds: 300,
    inputSchema: z.object({ value: z.string() }),
    generatePreview: jest.fn().mockResolvedValue({
      description: "Will update value",
      changes: [{ field: "value", oldValue: "old", newValue: "new" }],
    } as ActionPreview),
    execute: jest.fn().mockResolvedValue({
      success: true,
      message: "Action completed",
      previousState: { value: "old" },
      newState: { value: "new" },
    } as ActionResult),
    undo: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(async () => {
    mockPrisma = {
      aiAction: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    mockCatalog = {
      getAction: jest.fn(),
      requiresPreview: jest.fn().mockReturnValue(true),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionExecutorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ActionCatalog, useValue: mockCatalog },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ActionExecutorService>(ActionExecutorService);
  });

  describe("preview()", () => {
    it("should return preview without executing action", async () => {
      const mockAction = createMockAction();
      mockCatalog.getAction.mockReturnValue(mockAction);

      const result = await service.preview(
        "test-action",
        { value: "new" },
        mockContext,
      );

      expect(result).toEqual({
        description: "Will update value",
        changes: [{ field: "value", oldValue: "old", newValue: "new" }],
      });
      expect(mockAction.generatePreview).toHaveBeenCalledWith(
        { value: "new" },
        mockContext,
      );
      expect(mockAction.execute).not.toHaveBeenCalled();
      expect(mockPrisma.aiAction.create).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException for unknown action", async () => {
      mockCatalog.getAction.mockReturnValue(undefined);

      await expect(
        service.preview("unknown-action", {}, mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it("should validate action parameters with Zod schema", async () => {
      const mockAction = createMockAction({
        inputSchema: z.object({
          value: z.string().min(3),
        }),
      });
      mockCatalog.getAction.mockReturnValue(mockAction);

      // Invalid input - too short
      await expect(
        service.preview("test-action", { value: "ab" }, mockContext),
      ).rejects.toThrow();

      // Valid input
      const result = await service.preview(
        "test-action",
        { value: "abc" },
        mockContext,
      );
      expect(result).toBeDefined();
    });

    it("should check user permissions for action", async () => {
      const mockAction = createMockAction({
        requiredPermissions: ["admin:super"],
      });
      mockCatalog.getAction.mockReturnValue(mockAction);

      const limitedContext = {
        ...mockContext,
        permissions: ["cases:read"], // Missing admin:super
      };

      await expect(
        service.preview("test-action", { value: "new" }, limitedContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should check entity type compatibility", async () => {
      const mockAction = createMockAction({
        entityTypes: ["investigation"], // Only for investigations
      });
      mockCatalog.getAction.mockReturnValue(mockAction);

      // Context has entityType: "case"
      await expect(
        service.preview("test-action", { value: "new" }, mockContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should call canExecute if defined", async () => {
      const canExecuteMock = jest.fn().mockResolvedValue({
        allowed: false,
        reason: "Case is already closed",
      });
      const mockAction = createMockAction({
        canExecute: canExecuteMock,
      });
      mockCatalog.getAction.mockReturnValue(mockAction);

      await expect(
        service.preview("test-action", { value: "new" }, mockContext),
      ).rejects.toThrow(ForbiddenException);

      expect(canExecuteMock).toHaveBeenCalledWith(
        { value: "new" },
        mockContext,
      );
    });
  });

  describe("execute()", () => {
    const mockAiActionRecord = {
      id: "action-record-123",
      organizationId: "org-123",
      userId: "user-456",
      actionType: "test-action",
      entityType: "case",
      entityId: "case-789",
      status: "EXECUTING",
      undoWindowSeconds: 300,
      undoExpiresAt: new Date(Date.now() + 300000),
      executedAt: new Date(),
      createdAt: new Date(),
    };

    it("should execute action and create database record", async () => {
      const mockAction = createMockAction();
      mockCatalog.getAction.mockReturnValue(mockAction);
      mockPrisma.aiAction.create.mockResolvedValue(mockAiActionRecord as any);
      mockPrisma.aiAction.update.mockResolvedValue({
        ...mockAiActionRecord,
        status: "COMPLETED",
      } as any);

      const result = await service.execute(
        "test-action",
        { value: "new" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.actionId).toBe("action-record-123");
      expect(result.undoAvailable).toBe(true);
      expect(mockPrisma.aiAction.create).toHaveBeenCalled();
      expect(mockAction.execute).toHaveBeenCalledWith(
        { value: "new" },
        mockContext,
      );
    });

    it("should throw NotFoundException for unknown action", async () => {
      mockCatalog.getAction.mockReturnValue(undefined);

      await expect(
        service.execute("unknown-action", {}, mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it("should reject if user lacks permissions", async () => {
      const mockAction = createMockAction({
        requiredPermissions: ["admin:super"],
      });
      mockCatalog.getAction.mockReturnValue(mockAction);

      const limitedContext = {
        ...mockContext,
        permissions: ["cases:read"],
      };

      await expect(
        service.execute("test-action", { value: "new" }, limitedContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should emit event after successful execution", async () => {
      const mockAction = createMockAction();
      mockCatalog.getAction.mockReturnValue(mockAction);
      mockPrisma.aiAction.create.mockResolvedValue(mockAiActionRecord as any);
      mockPrisma.aiAction.update.mockResolvedValue({
        ...mockAiActionRecord,
        status: "COMPLETED",
      } as any);

      await service.execute("test-action", { value: "new" }, mockContext);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "ai.action.completed",
        {
          actionId: "action-record-123",
          organizationId: "org-123",
          userId: "user-456",
          entityType: "case",
          entityId: "case-789",
          actionType: "test-action",
        },
      );
    });

    it("should handle action execution failure", async () => {
      const mockAction = createMockAction({
        execute: jest.fn().mockResolvedValue({
          success: false,
          message: "Entity locked",
        }),
      });
      mockCatalog.getAction.mockReturnValue(mockAction);
      mockPrisma.aiAction.create.mockResolvedValue(mockAiActionRecord as any);
      mockPrisma.aiAction.update.mockResolvedValue({
        ...mockAiActionRecord,
        status: "FAILED",
      } as any);

      const result = await service.execute(
        "test-action",
        { value: "new" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Entity locked");
      expect(result.undoAvailable).toBe(false);
      expect(mockPrisma.aiAction.update).toHaveBeenCalledWith({
        where: { id: "action-record-123" },
        data: {
          status: "FAILED",
          error: "Entity locked",
        },
      });
    });

    it("should handle thrown exceptions during execution", async () => {
      const mockAction = createMockAction({
        execute: jest.fn().mockRejectedValue(new Error("Database timeout")),
      });
      mockCatalog.getAction.mockReturnValue(mockAction);
      mockPrisma.aiAction.create.mockResolvedValue(mockAiActionRecord as any);
      mockPrisma.aiAction.update.mockResolvedValue({
        ...mockAiActionRecord,
        status: "FAILED",
      } as any);

      const result = await service.execute(
        "test-action",
        { value: "new" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database timeout");
      expect(result.undoAvailable).toBe(false);
    });

    it("should set undoAvailable to false for non-undoable actions", async () => {
      const mockAction = createMockAction({
        undoWindowSeconds: 0, // Non-undoable
      });
      mockCatalog.getAction.mockReturnValue(mockAction);
      mockPrisma.aiAction.create.mockResolvedValue({
        ...mockAiActionRecord,
        undoWindowSeconds: 0,
        undoExpiresAt: null,
      } as any);
      mockPrisma.aiAction.update.mockResolvedValue({
        ...mockAiActionRecord,
        status: "COMPLETED",
      } as any);

      const result = await service.execute(
        "test-action",
        { value: "new" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.undoAvailable).toBe(false);
      expect(result.undoExpiresAt).toBeUndefined();
    });

    it("should support different action categories (QUICK, STANDARD, CRITICAL)", async () => {
      for (const category of [
        ActionCategory.QUICK,
        ActionCategory.STANDARD,
        ActionCategory.CRITICAL,
      ]) {
        const mockAction = createMockAction({ category });
        mockCatalog.getAction.mockReturnValue(mockAction);
        mockPrisma.aiAction.create.mockResolvedValue(mockAiActionRecord as any);
        mockPrisma.aiAction.update.mockResolvedValue({
          ...mockAiActionRecord,
          status: "COMPLETED",
        } as any);

        const result = await service.execute(
          "test-action",
          { value: "new" },
          mockContext,
        );

        expect(result.success).toBe(true);
      }
    });
  });

  describe("undo()", () => {
    const completedAction = {
      id: "action-record-123",
      organizationId: "org-123",
      userId: "user-456",
      actionType: "test-action",
      entityType: "case",
      entityId: "case-789",
      status: "COMPLETED",
      undoWindowSeconds: 300,
      undoExpiresAt: new Date(Date.now() + 60000), // 1 minute from now
      previousState: { value: "old" },
      createdAt: new Date(),
    };

    it("should undo action within window", async () => {
      const mockAction = createMockAction();
      mockPrisma.aiAction.findFirst.mockResolvedValue(completedAction as any);
      mockCatalog.getAction.mockReturnValue(mockAction);
      mockPrisma.aiAction.update.mockResolvedValue({
        ...completedAction,
        status: "UNDONE",
      } as any);

      await service.undo("action-record-123", mockContext);

      expect(mockAction.undo).toHaveBeenCalledWith(
        "action-record-123",
        { value: "old" },
        expect.objectContaining({
          organizationId: "org-123",
          entityType: "case",
          entityId: "case-789",
        }),
      );
      expect(mockPrisma.aiAction.update).toHaveBeenCalledWith({
        where: { id: "action-record-123" },
        data: {
          status: "UNDONE",
          undoneAt: expect.any(Date),
          undoneByUserId: "user-456",
        },
      });
    });

    it("should throw NotFoundException if action not found", async () => {
      mockPrisma.aiAction.findFirst.mockResolvedValue(null);

      await expect(service.undo("unknown-action", mockContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException if undo window expired", async () => {
      mockPrisma.aiAction.findFirst.mockResolvedValue({
        ...completedAction,
        undoExpiresAt: new Date(Date.now() - 60000), // 1 minute ago (expired)
      } as any);

      await expect(
        service.undo("action-record-123", mockContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException if action is not undoable", async () => {
      mockPrisma.aiAction.findFirst.mockResolvedValue(completedAction as any);
      mockCatalog.getAction.mockReturnValue(
        createMockAction({ undo: undefined }),
      );

      await expect(
        service.undo("action-record-123", mockContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should emit event after successful undo", async () => {
      const mockAction = createMockAction();
      mockPrisma.aiAction.findFirst.mockResolvedValue(completedAction as any);
      mockCatalog.getAction.mockReturnValue(mockAction);
      mockPrisma.aiAction.update.mockResolvedValue({
        ...completedAction,
        status: "UNDONE",
      } as any);

      await service.undo("action-record-123", mockContext);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith("ai.action.undone", {
        actionId: "action-record-123",
        organizationId: "org-123",
        userId: "user-456",
        entityType: "case",
        entityId: "case-789",
        actionType: "test-action",
      });
    });

    it("should respect tenant isolation - cannot undo cross-tenant", async () => {
      // findFirst returns null because organizationId doesn't match
      mockPrisma.aiAction.findFirst.mockResolvedValue(null);

      const crossTenantContext = {
        ...mockContext,
        organizationId: "different-org",
      };

      await expect(
        service.undo("action-record-123", crossTenantContext),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.aiAction.findFirst).toHaveBeenCalledWith({
        where: {
          id: "action-record-123",
          organizationId: "different-org",
          status: "COMPLETED",
        },
      });
    });
  });

  describe("getActionHistory()", () => {
    const mockActions = [
      {
        id: "action-1",
        actionType: "change-status",
        status: "COMPLETED",
        createdAt: new Date("2024-01-15"),
        undoExpiresAt: new Date(Date.now() + 60000), // Valid undo
      },
      {
        id: "action-2",
        actionType: "add-note",
        status: "COMPLETED",
        createdAt: new Date("2024-01-14"),
        undoExpiresAt: new Date(Date.now() - 60000), // Expired undo
      },
      {
        id: "action-3",
        actionType: "send-email",
        status: "COMPLETED",
        createdAt: new Date("2024-01-13"),
        undoExpiresAt: null, // Non-undoable
      },
    ];

    it("should return action history for entity", async () => {
      mockPrisma.aiAction.findMany.mockResolvedValue(mockActions as any);

      const result = await service.getActionHistory({
        organizationId: "org-123",
        entityType: "case",
        entityId: "case-789",
      });

      expect(result).toHaveLength(3);
      expect(result[0].undoAvailable).toBe(true);
      expect(result[1].undoAvailable).toBe(false); // Expired
      expect(result[2].undoAvailable).toBe(false); // No undo window
    });

    it("should filter by organization (tenant isolation)", async () => {
      mockPrisma.aiAction.findMany.mockResolvedValue([]);

      await service.getActionHistory({
        organizationId: "org-123",
      });

      expect(mockPrisma.aiAction.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-123" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });

    it("should respect limit parameter", async () => {
      mockPrisma.aiAction.findMany.mockResolvedValue([]);

      await service.getActionHistory({
        organizationId: "org-123",
        limit: 10,
      });

      expect(mockPrisma.aiAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe("canUndo()", () => {
    it("should return true with remaining seconds when within window", async () => {
      const futureTime = new Date(Date.now() + 120000); // 2 minutes from now
      mockPrisma.aiAction.findFirst.mockResolvedValue({
        id: "action-123",
        status: "COMPLETED",
        undoExpiresAt: futureTime,
      } as any);

      const result = await service.canUndo("action-123", mockContext);

      expect(result.canUndo).toBe(true);
      expect(result.remainingSeconds).toBeGreaterThan(100);
      expect(result.remainingSeconds).toBeLessThanOrEqual(120);
    });

    it("should return false when window expired", async () => {
      mockPrisma.aiAction.findFirst.mockResolvedValue({
        id: "action-123",
        status: "COMPLETED",
        undoExpiresAt: new Date(Date.now() - 60000), // 1 minute ago
      } as any);

      const result = await service.canUndo("action-123", mockContext);

      expect(result.canUndo).toBe(false);
      expect(result.remainingSeconds).toBeUndefined();
    });

    it("should return false for non-undoable actions", async () => {
      mockPrisma.aiAction.findFirst.mockResolvedValue({
        id: "action-123",
        status: "COMPLETED",
        undoExpiresAt: null, // Non-undoable
      } as any);

      const result = await service.canUndo("action-123", mockContext);

      expect(result.canUndo).toBe(false);
    });

    it("should return false if action not found", async () => {
      mockPrisma.aiAction.findFirst.mockResolvedValue(null);

      const result = await service.canUndo("unknown-action", mockContext);

      expect(result.canUndo).toBe(false);
    });

    it("should respect tenant isolation", async () => {
      mockPrisma.aiAction.findFirst.mockResolvedValue(null);

      await service.canUndo("action-123", {
        ...mockContext,
        organizationId: "different-org",
      });

      expect(mockPrisma.aiAction.findFirst).toHaveBeenCalledWith({
        where: {
          id: "action-123",
          organizationId: "different-org",
          status: "COMPLETED",
        },
      });
    });
  });

  describe("tenant isolation", () => {
    it("should include organizationId in all database operations", async () => {
      const mockAction = createMockAction();
      mockCatalog.getAction.mockReturnValue(mockAction);
      mockPrisma.aiAction.create.mockResolvedValue({
        id: "action-123",
        organizationId: "org-123",
        undoExpiresAt: new Date(Date.now() + 60000),
      } as any);
      mockPrisma.aiAction.update.mockResolvedValue({} as any);

      await service.execute("test-action", { value: "new" }, mockContext);

      expect(mockPrisma.aiAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-123",
        }),
      });
    });

    it("should filter findFirst by organizationId", async () => {
      mockPrisma.aiAction.findFirst.mockResolvedValue(null);

      await service.canUndo("action-123", mockContext);

      expect(mockPrisma.aiAction.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organizationId: "org-123",
        }),
      });
    });

    it("should filter findMany by organizationId", async () => {
      mockPrisma.aiAction.findMany.mockResolvedValue([]);

      await service.getActionHistory({ organizationId: "org-123" });

      expect(mockPrisma.aiAction.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organizationId: "org-123",
        }),
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });
  });

  describe("activity logging", () => {
    it("should create aiAction record with all required fields", async () => {
      const mockAction = createMockAction();
      mockCatalog.getAction.mockReturnValue(mockAction);
      mockPrisma.aiAction.create.mockResolvedValue({
        id: "action-123",
        undoExpiresAt: new Date(Date.now() + 60000),
      } as any);
      mockPrisma.aiAction.update.mockResolvedValue({} as any);

      await service.execute("test-action", { value: "new" }, mockContext);

      expect(mockPrisma.aiAction.create).toHaveBeenCalledWith({
        data: {
          organizationId: "org-123",
          userId: "user-456",
          conversationId: "conv-111",
          actionType: "test-action",
          entityType: "case",
          entityId: "case-789",
          input: { value: "new" },
          status: "EXECUTING",
          undoWindowSeconds: 300,
          undoExpiresAt: expect.any(Date),
          executedAt: expect.any(Date),
        },
      });
    });

    it("should update status to COMPLETED on success", async () => {
      const mockAction = createMockAction();
      mockCatalog.getAction.mockReturnValue(mockAction);
      mockPrisma.aiAction.create.mockResolvedValue({
        id: "action-123",
        undoExpiresAt: new Date(Date.now() + 60000),
      } as any);
      mockPrisma.aiAction.update.mockResolvedValue({} as any);

      await service.execute("test-action", { value: "new" }, mockContext);

      expect(mockPrisma.aiAction.update).toHaveBeenCalledWith({
        where: { id: "action-123" },
        data: expect.objectContaining({
          status: "COMPLETED",
          result: expect.any(Object),
          previousState: { value: "old" },
          completedAt: expect.any(Date),
        }),
      });
    });

    it("should update status to FAILED on error", async () => {
      const mockAction = createMockAction({
        execute: jest.fn().mockRejectedValue(new Error("Execution failed")),
      });
      mockCatalog.getAction.mockReturnValue(mockAction);
      mockPrisma.aiAction.create.mockResolvedValue({
        id: "action-123",
        undoExpiresAt: null,
      } as any);
      mockPrisma.aiAction.update.mockResolvedValue({} as any);

      await service.execute("test-action", { value: "new" }, mockContext);

      expect(mockPrisma.aiAction.update).toHaveBeenCalledWith({
        where: { id: "action-123" },
        data: {
          status: "FAILED",
          error: "Execution failed",
        },
      });
    });

    it("should update status to UNDONE after undo", async () => {
      const mockAction = createMockAction();
      mockPrisma.aiAction.findFirst.mockResolvedValue({
        id: "action-123",
        organizationId: "org-123",
        actionType: "test-action",
        entityType: "case",
        entityId: "case-789",
        status: "COMPLETED",
        undoExpiresAt: new Date(Date.now() + 60000),
        previousState: { value: "old" },
      } as any);
      mockCatalog.getAction.mockReturnValue(mockAction);
      mockPrisma.aiAction.update.mockResolvedValue({} as any);

      await service.undo("action-123", mockContext);

      expect(mockPrisma.aiAction.update).toHaveBeenCalledWith({
        where: { id: "action-123" },
        data: {
          status: "UNDONE",
          undoneAt: expect.any(Date),
          undoneByUserId: "user-456",
        },
      });
    });
  });
});
