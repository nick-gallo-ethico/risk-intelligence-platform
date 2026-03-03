import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CampaignDashboardService } from "./campaign-dashboard.service";
import { PrismaService } from "../prisma/prisma.service";
import { CampaignStatus, AssignmentStatus, CampaignType } from "@prisma/client";

describe("CampaignDashboardService", () => {
  let service: CampaignDashboardService;
  let prisma: jest.Mocked<PrismaService>;

  const mockOrgId = "org-test-123";
  const mockCampaignId = "campaign-test-123";

  const mockCampaign = {
    id: mockCampaignId,
    organizationId: mockOrgId,
    name: "Test Campaign",
    type: CampaignType.DISCLOSURE,
    status: CampaignStatus.ACTIVE,
    dueDate: new Date("2026-03-31"),
    totalAssignments: 100,
    completedAssignments: 75,
    overdueAssignments: 5,
    completionPercentage: 75,
    launchedAt: new Date(),
  };

  const mockPrismaService = {
    campaign: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    campaignAssignment: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    employee: {
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignDashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CampaignDashboardService>(CampaignDashboardService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe("getDashboardStats", () => {
    it("should return comprehensive dashboard statistics", async () => {
      mockPrismaService.campaign.groupBy.mockResolvedValue([
        { status: CampaignStatus.DRAFT, _count: { id: 5 } },
        { status: CampaignStatus.ACTIVE, _count: { id: 10 } },
        { status: CampaignStatus.COMPLETED, _count: { id: 20 } },
        { status: CampaignStatus.SCHEDULED, _count: { id: 2 } },
      ]);
      mockPrismaService.campaign.findMany.mockResolvedValue([
        { id: "camp-1" },
        { id: "camp-2" },
      ]);
      mockPrismaService.campaignAssignment.groupBy.mockResolvedValue([
        { status: AssignmentStatus.PENDING, _count: { id: 50 } },
        { status: AssignmentStatus.COMPLETED, _count: { id: 100 } },
        { status: AssignmentStatus.OVERDUE, _count: { id: 10 } },
      ]);

      const result = await service.getDashboardStats(mockOrgId);

      expect(result.totalCampaigns).toBe(37);
      expect(result.activeCampaigns).toBe(10);
      expect(result.completedCampaigns).toBe(20);
      expect(result.draftCampaigns).toBe(5);
      expect(result.scheduledCampaigns).toBe(2);
      expect(result.assignmentsByStatus.completed).toBe(100);
      expect(result.assignmentsByStatus.overdue).toBe(10);
    });

    it("should calculate completion rate correctly", async () => {
      mockPrismaService.campaign.groupBy.mockResolvedValue([
        { status: CampaignStatus.ACTIVE, _count: { id: 1 } },
      ]);
      mockPrismaService.campaign.findMany.mockResolvedValue([{ id: "camp-1" }]);
      mockPrismaService.campaignAssignment.groupBy.mockResolvedValue([
        { status: AssignmentStatus.COMPLETED, _count: { id: 75 } },
        { status: AssignmentStatus.PENDING, _count: { id: 25 } },
      ]);

      const result = await service.getDashboardStats(mockOrgId);

      expect(result.overallCompletionRate).toBe(75);
      expect(result.totalAssignments).toBe(100);
      expect(result.completedAssignments).toBe(75);
    });

    it("should handle zero assignments", async () => {
      mockPrismaService.campaign.groupBy.mockResolvedValue([]);
      mockPrismaService.campaign.findMany.mockResolvedValue([]);
      mockPrismaService.campaignAssignment.groupBy.mockResolvedValue([]);

      const result = await service.getDashboardStats(mockOrgId);

      expect(result.totalCampaigns).toBe(0);
      expect(result.overallCompletionRate).toBe(0);
    });

    it("should count skipped as completed", async () => {
      mockPrismaService.campaign.groupBy.mockResolvedValue([
        { status: CampaignStatus.ACTIVE, _count: { id: 1 } },
      ]);
      mockPrismaService.campaign.findMany.mockResolvedValue([{ id: "camp-1" }]);
      mockPrismaService.campaignAssignment.groupBy.mockResolvedValue([
        { status: AssignmentStatus.COMPLETED, _count: { id: 50 } },
        { status: AssignmentStatus.SKIPPED, _count: { id: 25 } },
        { status: AssignmentStatus.PENDING, _count: { id: 25 } },
      ]);

      const result = await service.getDashboardStats(mockOrgId);

      expect(result.completedAssignments).toBe(75); // 50 completed + 25 skipped
    });
  });

  describe("getOverdueCampaigns", () => {
    it("should return campaigns with overdue assignments", async () => {
      mockPrismaService.campaign.findMany.mockResolvedValue([mockCampaign]);

      const result = await service.getOverdueCampaigns(mockOrgId);

      expect(result).toHaveLength(1);
      expect(result[0].overdueAssignments).toBe(5);
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: mockOrgId,
            overdueAssignments: { gt: 0 },
            status: {
              in: [CampaignStatus.ACTIVE, CampaignStatus.PAUSED],
            },
          },
          orderBy: { overdueAssignments: "desc" },
        }),
      );
    });

    it("should respect limit parameter", async () => {
      mockPrismaService.campaign.findMany.mockResolvedValue([]);

      await service.getOverdueCampaigns(mockOrgId, 5);

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe("getUpcomingDeadlines", () => {
    it("should return campaigns with upcoming deadlines", async () => {
      mockPrismaService.campaign.findMany.mockResolvedValue([mockCampaign]);

      const result = await service.getUpcomingDeadlines(mockOrgId, 7);

      expect(result).toHaveLength(1);
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: mockOrgId,
            status: CampaignStatus.ACTIVE,
            dueDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
          orderBy: { dueDate: "asc" },
        }),
      );
    });

    it("should respect limit parameter", async () => {
      mockPrismaService.campaign.findMany.mockResolvedValue([]);

      await service.getUpcomingDeadlines(mockOrgId, 14, 5);

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe("getWeeklyCompletionTrend", () => {
    it("should return weekly completion data", async () => {
      mockPrismaService.campaignAssignment.count.mockResolvedValue(10);

      const result = await service.getWeeklyCompletionTrend(mockOrgId, 4);

      expect(result).toHaveLength(4);
      result.forEach((week) => {
        expect(week).toHaveProperty("weekStart");
        expect(week).toHaveProperty("weekEnd");
        expect(week).toHaveProperty("completions");
        expect(week).toHaveProperty("newAssignments");
      });
    });

    it("should query completions for each week", async () => {
      mockPrismaService.campaignAssignment.count.mockResolvedValue(5);

      await service.getWeeklyCompletionTrend(mockOrgId, 2);

      // Called twice for each week (completions + newAssignments)
      expect(prisma.campaignAssignment.count).toHaveBeenCalledTimes(4);
    });
  });

  describe("getCampaignDetails", () => {
    it("should return detailed campaign statistics", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([
        {
          id: "assign-1",
          status: AssignmentStatus.COMPLETED,
          assignedAt: new Date("2026-01-01"),
          completedAt: new Date("2026-01-02"),
          employeeSnapshot: { department: "Engineering", location: "NYC" },
        },
        {
          id: "assign-2",
          status: AssignmentStatus.OVERDUE,
          assignedAt: new Date("2026-01-01"),
          completedAt: null,
          employeeSnapshot: { department: "Engineering", location: "LA" },
        },
      ]);

      const result = await service.getCampaignDetails(
        mockCampaignId,
        mockOrgId,
      );

      expect(result.campaign).toBeDefined();
      expect(result.byDepartment).toBeDefined();
      expect(result.byLocation).toBeDefined();
      expect(result.responseTimeDistribution).toBeDefined();
      expect(result.nonResponders).toBeDefined();
    });

    it("should throw NotFoundException when campaign not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.getCampaignDetails("nonexistent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should calculate response time distribution", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      const now = new Date();
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([
        {
          id: "assign-1",
          status: AssignmentStatus.COMPLETED,
          assignedAt: new Date(now.getTime() - 0 * 24 * 60 * 60 * 1000), // same day
          completedAt: now,
          employeeSnapshot: {},
        },
        {
          id: "assign-2",
          status: AssignmentStatus.COMPLETED,
          assignedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days
          completedAt: now,
          employeeSnapshot: {},
        },
        {
          id: "assign-3",
          status: AssignmentStatus.COMPLETED,
          assignedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days
          completedAt: now,
          employeeSnapshot: {},
        },
        {
          id: "assign-4",
          status: AssignmentStatus.COMPLETED,
          assignedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days
          completedAt: now,
          employeeSnapshot: {},
        },
      ]);

      const result = await service.getCampaignDetails(
        mockCampaignId,
        mockOrgId,
      );

      expect(result.responseTimeDistribution.sameDay).toBe(1);
      expect(result.responseTimeDistribution.oneToThreeDays).toBe(1);
      expect(result.responseTimeDistribution.fourToSevenDays).toBe(1);
      expect(result.responseTimeDistribution.overSevenDays).toBe(1);
    });
  });

  describe("getNonResponderReport", () => {
    it("should return non-responder report", async () => {
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([
        {
          id: "assign-1",
          campaignId: "camp-1",
          employee: {
            id: "emp-1",
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            department: "Engineering",
            managerName: "Jane",
            managerId: "mgr-1",
          },
          campaign: { name: "Campaign 1" },
        },
        {
          id: "assign-2",
          campaignId: "camp-2",
          employee: {
            id: "emp-1",
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            department: "Engineering",
            managerName: "Jane",
            managerId: "mgr-1",
          },
          campaign: { name: "Campaign 2" },
        },
      ]);
      mockPrismaService.campaignAssignment.groupBy.mockResolvedValue([
        { employeeId: "emp-1", _count: { id: 5 } },
      ]);
      mockPrismaService.employee.groupBy.mockResolvedValue([
        { department: "Engineering", _count: { id: 10 } },
      ]);

      const result = await service.getNonResponderReport(mockOrgId);

      expect(result.repeatNonResponders).toBeDefined();
      expect(result.byDepartment).toBeDefined();
      expect(result.byManager).toBeDefined();
    });

    it("should identify repeat non-responders (2+ missed campaigns)", async () => {
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([
        {
          id: "assign-1",
          campaignId: "camp-1",
          employee: {
            id: "emp-1",
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            department: "Engineering",
            managerName: "Jane",
            managerId: "mgr-1",
          },
          campaign: { name: "Campaign 1" },
        },
        {
          id: "assign-2",
          campaignId: "camp-2",
          employee: {
            id: "emp-1",
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            department: "Engineering",
            managerName: "Jane",
            managerId: "mgr-1",
          },
          campaign: { name: "Campaign 2" },
        },
      ]);
      mockPrismaService.campaignAssignment.groupBy.mockResolvedValue([
        { employeeId: "emp-1", _count: { id: 2 } },
      ]);
      mockPrismaService.employee.groupBy.mockResolvedValue([
        { department: "Engineering", _count: { id: 5 } },
      ]);

      const result = await service.getNonResponderReport(mockOrgId);

      expect(result.repeatNonResponders.length).toBeGreaterThanOrEqual(1);
      expect(result.repeatNonResponders[0].missedCampaigns).toBe(2);
    });
  });
});
