import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AuditService, CreateAuditLogDto } from "./audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";

describe("AuditService", () => {
  let service: AuditService;

  const mockOrgId = "org-test-123";
  const mockEntityId = "entity-test-123";
  const mockUserId = "user-test-123";

  const mockAuditLog = {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  };

  const mockPrisma = {
    auditLog: mockAuditLog,
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const baseLogDto: CreateAuditLogDto = {
    organizationId: mockOrgId,
    entityType: AuditEntityType.CASE,
    entityId: mockEntityId,
    action: "created",
    actionCategory: AuditActionCategory.CREATE,
    actionDescription: "User created a case",
    actorUserId: mockUserId,
    actorType: ActorType.USER,
    actorName: "Test User",
  };

  const mockAuditEntry = {
    id: "audit-1",
    organizationId: mockOrgId,
    entityType: AuditEntityType.CASE,
    entityId: mockEntityId,
    action: "created",
    actionCategory: AuditActionCategory.CREATE,
    actionDescription: "User created a case",
    actorUserId: mockUserId,
    actorType: ActorType.USER,
    actorName: "Test User",
    createdAt: new Date("2026-01-15T10:00:00Z"),
    changes: null,
    context: null,
    ipAddress: null,
    userAgent: null,
    requestId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  describe("log", () => {
    it("should create an audit log entry successfully", async () => {
      mockAuditLog.create.mockResolvedValue(mockAuditEntry);

      await service.log(baseLogDto);

      expect(mockAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId,
          entityType: AuditEntityType.CASE,
          entityId: mockEntityId,
          action: "created",
          actionDescription: "User created a case",
          actorUserId: mockUserId,
          actorType: ActorType.USER,
        }),
      });
    });

    it("should not throw if audit log creation fails (graceful degradation)", async () => {
      mockAuditLog.create.mockRejectedValue(
        new Error("Database connection error"),
      );

      // Should not throw - audit failures must not crash main operations
      await expect(service.log(baseLogDto)).resolves.not.toThrow();
    });

    it("should emit monitoring alert after 5 consecutive failures", async () => {
      mockAuditLog.create.mockRejectedValue(new Error("DB error"));

      // Trigger 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        await service.log(baseLogDto);
      }

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "monitoring.alert",
        expect.objectContaining({
          type: "AUDIT_TRAIL_GAP",
          severity: "CRITICAL",
        }),
      );
    });

    it("should reset consecutive failure counter after success", async () => {
      mockAuditLog.create
        .mockRejectedValueOnce(new Error("DB error"))
        .mockRejectedValueOnce(new Error("DB error"))
        .mockResolvedValueOnce(mockAuditEntry); // Success resets counter

      await service.log(baseLogDto); // fail 1
      await service.log(baseLogDto); // fail 2
      await service.log(baseLogDto); // success - resets counter

      // Now 2 more failures should not trigger alert (counter was reset)
      await service.log(baseLogDto); // fail 1 (new counter)
      await service.log(baseLogDto); // fail 2

      // Alert should NOT have been emitted since counter was reset
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it("should handle null actorUserId gracefully", async () => {
      mockAuditLog.create.mockResolvedValue(mockAuditEntry);

      await service.log({ ...baseLogDto, actorUserId: null, actorName: null });

      expect(mockAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorUserId: null,
          actorName: null,
        }),
      });
    });
  });

  describe("findByEntity", () => {
    it("should return audit logs for an entity scoped by organization", async () => {
      mockAuditLog.findMany.mockResolvedValue([mockAuditEntry]);

      const result = await service.findByEntity(
        mockOrgId,
        AuditEntityType.CASE,
        mockEntityId,
      );

      expect(result).toHaveLength(1);
      expect(mockAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrgId,
          entityType: AuditEntityType.CASE,
          entityId: mockEntityId,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });

    it("should respect custom limit", async () => {
      mockAuditLog.findMany.mockResolvedValue([]);

      await service.findByEntity(
        mockOrgId,
        AuditEntityType.CASE,
        mockEntityId,
        10,
      );

      expect(mockAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe("query", () => {
    it("should return paginated audit logs filtered by organization", async () => {
      mockAuditLog.findMany.mockResolvedValue([mockAuditEntry]);
      mockAuditLog.count.mockResolvedValue(1);

      const result = await service.query(mockOrgId, { limit: 50, offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(50);
      expect(mockAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        }),
      );
    });

    it("should filter by entityType when provided", async () => {
      mockAuditLog.findMany.mockResolvedValue([]);
      mockAuditLog.count.mockResolvedValue(0);

      await service.query(mockOrgId, {
        entityType: AuditEntityType.CASE,
      });

      expect(mockAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: AuditEntityType.CASE,
          }),
        }),
      );
    });

    it("should filter by date range when startDate and endDate provided", async () => {
      mockAuditLog.findMany.mockResolvedValue([]);
      mockAuditLog.count.mockResolvedValue(0);

      const startDate = "2026-01-01";
      const endDate = "2026-01-31";

      await service.query(mockOrgId, { startDate, endDate });

      expect(mockAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: new Date(startDate),
              lte: new Date(endDate),
            }),
          }),
        }),
      );
    });

    it("should use default limit and offset when not provided", async () => {
      mockAuditLog.findMany.mockResolvedValue([]);
      mockAuditLog.count.mockResolvedValue(0);

      const result = await service.query(mockOrgId, {});

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });
  });
});
