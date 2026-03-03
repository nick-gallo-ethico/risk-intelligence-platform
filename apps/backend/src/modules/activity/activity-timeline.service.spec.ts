import { Test, TestingModule } from "@nestjs/testing";
import {
  ActivityTimelineService,
  TimelineEntry,
} from "./activity-timeline.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditEntityType } from "@prisma/client";

describe("ActivityTimelineService", () => {
  let service: ActivityTimelineService;

  const mockAuditLog = {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    groupBy: jest.fn(),
  };

  const mockInvestigation = {
    findMany: jest.fn(),
  };

  const mockPrisma = {
    auditLog: mockAuditLog,
    investigation: mockInvestigation,
  };

  const mockOrgId = "org-test-123";
  const mockEntityId = "entity-test-123";
  const mockUserId = "user-test-123";

  const mockAuditEntry = {
    id: "audit-1",
    entityType: AuditEntityType.CASE,
    entityId: mockEntityId,
    action: "created",
    actionDescription: "Created case ETH-2026-00001",
    actorUserId: mockUserId,
    actorName: "Test User",
    createdAt: new Date("2026-01-15T10:00:00Z"),
    changes: null,
    context: null,
    organizationId: mockOrgId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityTimelineService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ActivityTimelineService>(ActivityTimelineService);
    jest.clearAllMocks();
    mockInvestigation.findMany.mockResolvedValue([]);
  });

  describe("getTimeline", () => {
    it("should return paginated timeline entries for an entity", async () => {
      mockAuditLog.count.mockResolvedValue(1);
      mockAuditLog.findMany.mockResolvedValue([mockAuditEntry]);

      const result = await service.getTimeline(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrgId,
      );

      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.entries[0].entityId).toBe(mockEntityId);
      expect(result.entries[0].isRelatedEntity).toBe(false);
    });

    it("should include related investigations for CASE entities", async () => {
      const investId = "invest-1";
      mockInvestigation.findMany.mockResolvedValue([{ id: investId }]);
      mockAuditLog.count.mockResolvedValue(2);
      mockAuditLog.findMany.mockResolvedValue([
        mockAuditEntry,
        {
          ...mockAuditEntry,
          id: "audit-2",
          entityType: AuditEntityType.INVESTIGATION,
          entityId: investId,
          actionDescription: "Investigation created",
        },
      ]);

      const result = await service.getTimeline(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrgId,
        { includeRelated: true },
      );

      expect(result.entries).toHaveLength(2);
      expect(result.entries[1].isRelatedEntity).toBe(true);
      expect(result.entries[1].relatedEntityInfo?.parentEntityType).toBe(
        AuditEntityType.CASE,
      );
    });

    it("should respect pagination options", async () => {
      mockAuditLog.count.mockResolvedValue(50);
      mockAuditLog.findMany.mockResolvedValue([mockAuditEntry]);

      const result = await service.getTimeline(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrgId,
        { page: 2, limit: 10 },
      );

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.hasMore).toBe(true);
      expect(mockAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it("should apply date range filters", async () => {
      mockAuditLog.count.mockResolvedValue(0);
      mockAuditLog.findMany.mockResolvedValue([]);

      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-01-31");

      await service.getTimeline(AuditEntityType.CASE, mockEntityId, mockOrgId, {
        startDate,
        endDate,
      });

      expect(mockAuditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: startDate,
              lte: endDate,
            }),
          }),
        }),
      );
    });

    it("should return hasMore false when all items fit on one page", async () => {
      mockAuditLog.count.mockResolvedValue(3);
      mockAuditLog.findMany.mockResolvedValue([
        mockAuditEntry,
        mockAuditEntry,
        mockAuditEntry,
      ]);

      const result = await service.getTimeline(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrgId,
        { limit: 20 },
      );

      expect(result.hasMore).toBe(false);
    });
  });

  describe("getRecentActivity", () => {
    it("should return user recent activity scoped by organization", async () => {
      mockAuditLog.count.mockResolvedValue(1);
      mockAuditLog.findMany.mockResolvedValue([mockAuditEntry]);

      const result = await service.getRecentActivity(mockUserId, mockOrgId);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].isRelatedEntity).toBe(false);
      expect(mockAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
            actorUserId: mockUserId,
          }),
        }),
      );
    });

    it("should support date range filtering for recent activity", async () => {
      mockAuditLog.count.mockResolvedValue(0);
      mockAuditLog.findMany.mockResolvedValue([]);

      const startDate = new Date("2026-01-01");
      await service.getRecentActivity(mockUserId, mockOrgId, { startDate });

      expect(mockAuditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({ gte: startDate }),
          }),
        }),
      );
    });
  });

  describe("getEntitySummary", () => {
    it("should return summary statistics for an entity", async () => {
      mockAuditLog.count.mockResolvedValue(5);
      mockAuditLog.findFirst.mockResolvedValue({
        createdAt: new Date("2026-01-15T10:00:00Z"),
        actorName: "Test User",
      });
      mockAuditLog.groupBy.mockResolvedValue([
        { actorUserId: mockUserId },
        { actorUserId: "user-2" },
      ]);

      const result = await service.getEntitySummary(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrgId,
      );

      expect(result.totalActivities).toBe(5);
      expect(result.lastActivityBy).toBe("Test User");
      expect(result.uniqueActors).toBe(2);
    });

    it("should return nulls for entity with no activity", async () => {
      mockAuditLog.count.mockResolvedValue(0);
      mockAuditLog.findFirst.mockResolvedValue(null);
      mockAuditLog.groupBy.mockResolvedValue([]);

      const result = await service.getEntitySummary(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrgId,
      );

      expect(result.totalActivities).toBe(0);
      expect(result.lastActivityAt).toBeNull();
      expect(result.lastActivityBy).toBeNull();
      expect(result.uniqueActors).toBe(0);
    });
  });

  describe("getRelatedEntityIds", () => {
    it("should return investigation IDs for a case entity", async () => {
      mockInvestigation.findMany.mockResolvedValue([
        { id: "invest-1" },
        { id: "invest-2" },
      ]);

      const result = await service.getRelatedEntityIds(
        AuditEntityType.CASE,
        mockEntityId,
        mockOrgId,
      );

      expect(result).toEqual(["invest-1", "invest-2"]);
      expect(mockInvestigation.findMany).toHaveBeenCalledWith({
        where: { caseId: mockEntityId, organizationId: mockOrgId },
        select: { id: true },
      });
    });

    it("should return empty array for entity types without relationships", async () => {
      const result = await service.getRelatedEntityIds(
        AuditEntityType.INVESTIGATION,
        mockEntityId,
        mockOrgId,
      );

      expect(result).toEqual([]);
    });
  });
});
