import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bullmq";
import {
  CampaignReminderService,
  DEFAULT_REMINDER_SEQUENCE,
} from "./campaign-reminder.service";
import { PrismaService } from "../prisma/prisma.service";
import { CampaignStatus, AssignmentStatus } from "@prisma/client";

describe("CampaignReminderService", () => {
  let service: CampaignReminderService;
  let prisma: jest.Mocked<PrismaService>;
  let mockQueue: { addBulk: jest.Mock };

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockCampaignId = "campaign-test-123";
  const mockEmployeeId = "employee-test-123";

  const mockPrismaService = {
    campaign: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    campaignAssignment: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    employeeComplianceProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    mockQueue = { addBulk: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignReminderService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken("campaign"), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<CampaignReminderService>(CampaignReminderService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe("getReminderSequence", () => {
    it("should return custom reminder config when campaign has one", async () => {
      const customSequence = [{ daysFromDue: -3, ccManager: false }];
      mockPrismaService.campaign.findUnique.mockResolvedValue({
        reminderConfig: customSequence,
      });

      const result = await service.getReminderSequence(mockCampaignId);

      expect(result).toEqual(customSequence);
    });

    it("should return default sequence when no custom config", async () => {
      mockPrismaService.campaign.findUnique.mockResolvedValue({
        reminderConfig: null,
      });

      const result = await service.getReminderSequence(mockCampaignId);

      expect(result).toEqual(DEFAULT_REMINDER_SEQUENCE);
    });

    it("should return default sequence when campaign not found", async () => {
      mockPrismaService.campaign.findUnique.mockResolvedValue(null);

      const result = await service.getReminderSequence(mockCampaignId);

      expect(result).toEqual(DEFAULT_REMINDER_SEQUENCE);
    });
  });

  describe("updateReminderSequence", () => {
    it("should update reminder sequence for campaign", async () => {
      const newSequence = [{ daysFromDue: -7, ccManager: true }];
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        id: mockCampaignId,
      });
      mockPrismaService.campaign.update.mockResolvedValue({});

      await service.updateReminderSequence(
        mockCampaignId,
        newSequence,
        mockOrgId,
      );

      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: mockCampaignId },
        data: { reminderConfig: newSequence },
      });
    });

    it("should throw NotFoundException when campaign not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.updateReminderSequence(mockCampaignId, [], mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("queueRemindersBulk", () => {
    it("should queue reminders in chunks of 100", async () => {
      const reminders = Array.from({ length: 150 }, (_, i) => ({
        assignmentId: `assignment-${i}`,
        employeeId: `employee-${i}`,
        campaignId: mockCampaignId,
        campaignName: "Test Campaign",
        dueDate: new Date(),
        reminderStep: 1,
        ccManager: false,
        ccHR: false,
        managerId: null,
        managerEmail: null,
      }));

      await service.queueRemindersBulk(reminders);

      // Should be called twice: one batch of 100, one batch of 50
      expect(mockQueue.addBulk).toHaveBeenCalledTimes(2);
    });

    it("should add correct job options", async () => {
      const reminders = [
        {
          assignmentId: "assignment-1",
          employeeId: mockEmployeeId,
          campaignId: mockCampaignId,
          campaignName: "Test Campaign",
          dueDate: new Date(),
          reminderStep: 1,
          ccManager: true,
          ccHR: false,
          managerId: "manager-1",
          managerEmail: "manager@example.com",
        },
      ];

      await service.queueRemindersBulk(reminders);

      expect(mockQueue.addBulk).toHaveBeenCalledWith([
        expect.objectContaining({
          name: "send-reminder",
          data: reminders[0],
          opts: expect.objectContaining({
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
          }),
        }),
      ]);
    });
  });

  describe("recordReminderSent", () => {
    it("should increment reminder count and set timestamp", async () => {
      mockPrismaService.campaignAssignment.update.mockResolvedValue({});

      await service.recordReminderSent("assignment-1", false);

      expect(prisma.campaignAssignment.update).toHaveBeenCalledWith({
        where: { id: "assignment-1" },
        data: expect.objectContaining({
          reminderCount: { increment: 1 },
          lastReminderSentAt: expect.any(Date),
        }),
      });
    });

    it("should set managerNotifiedAt when ccManager is true", async () => {
      mockPrismaService.campaignAssignment.update.mockResolvedValue({});

      await service.recordReminderSent("assignment-1", true);

      expect(prisma.campaignAssignment.update).toHaveBeenCalledWith({
        where: { id: "assignment-1" },
        data: expect.objectContaining({
          managerNotifiedAt: expect.any(Date),
        }),
      });
    });
  });

  describe("getOrCreateComplianceProfile", () => {
    it("should return existing profile", async () => {
      const existingProfile = {
        employeeId: mockEmployeeId,
        organizationId: mockOrgId,
        campaignsAssigned: 5,
        campaignsCompleted: 3,
        campaignsMissedDeadline: 1,
        averageResponseDays: 2.5,
        isRepeatNonResponder: false,
        lastCampaignCompletedAt: new Date(),
      };
      mockPrismaService.employeeComplianceProfile.findUnique.mockResolvedValue(
        existingProfile,
      );

      const result = await service.getOrCreateComplianceProfile(
        mockEmployeeId,
        mockOrgId,
      );

      expect(result.campaignsAssigned).toBe(5);
      expect(result.campaignsCompleted).toBe(3);
    });

    it("should create new profile when not found", async () => {
      mockPrismaService.employeeComplianceProfile.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.employeeComplianceProfile.create.mockResolvedValue({
        employeeId: mockEmployeeId,
        organizationId: mockOrgId,
        campaignsAssigned: 0,
        campaignsCompleted: 0,
        campaignsMissedDeadline: 0,
        averageResponseDays: null,
        isRepeatNonResponder: false,
        lastCampaignCompletedAt: null,
      });

      const result = await service.getOrCreateComplianceProfile(
        mockEmployeeId,
        mockOrgId,
      );

      expect(result.campaignsAssigned).toBe(0);
      expect(prisma.employeeComplianceProfile.create).toHaveBeenCalled();
    });
  });

  describe("recordCampaignAssigned", () => {
    it("should upsert compliance profile", async () => {
      mockPrismaService.employeeComplianceProfile.upsert.mockResolvedValue({});

      await service.recordCampaignAssigned(mockEmployeeId, mockOrgId);

      expect(prisma.employeeComplianceProfile.upsert).toHaveBeenCalledWith({
        where: { employeeId: mockEmployeeId },
        update: { campaignsAssigned: { increment: 1 } },
        create: expect.objectContaining({
          employeeId: mockEmployeeId,
          organizationId: mockOrgId,
          campaignsAssigned: 1,
        }),
      });
    });
  });

  describe("getRepeatNonResponders", () => {
    it("should return paginated non-responders", async () => {
      const profiles = [
        {
          employeeId: "emp-1",
          organizationId: mockOrgId,
          campaignsAssigned: 10,
          campaignsCompleted: 3,
          campaignsMissedDeadline: 5,
          averageResponseDays: 10,
          isRepeatNonResponder: true,
          lastCampaignCompletedAt: new Date(),
        },
      ];
      mockPrismaService.employeeComplianceProfile.findMany.mockResolvedValue(
        profiles,
      );

      const result = await service.getRepeatNonResponders(mockOrgId);

      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].isRepeatNonResponder).toBe(true);
    });

    it("should support cursor-based pagination", async () => {
      mockPrismaService.employeeComplianceProfile.findMany.mockResolvedValue(
        [],
      );

      await service.getRepeatNonResponders(mockOrgId, {
        limit: 50,
        cursor: "emp-cursor",
      });

      expect(prisma.employeeComplianceProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 1,
          cursor: { employeeId: "emp-cursor" },
        }),
      );
    });
  });

  describe("getComplianceStatistics", () => {
    it("should return aggregated statistics", async () => {
      mockPrismaService.employeeComplianceProfile.aggregate.mockResolvedValue({
        _count: { _all: 100 },
        _avg: { averageResponseDays: 3.5 },
      });
      mockPrismaService.employeeComplianceProfile.count.mockResolvedValue(10);
      mockPrismaService.$queryRaw.mockResolvedValue([{ rate: 0.85 }]);

      const result = await service.getComplianceStatistics(mockOrgId);

      expect(result.totalEmployees).toBe(100);
      expect(result.repeatNonResponders).toBe(10);
      expect(result.averageResponseDays).toBe(3.5);
      expect(result.averageCompletionRate).toBe(0.85);
    });

    it("should handle null values", async () => {
      mockPrismaService.employeeComplianceProfile.aggregate.mockResolvedValue({
        _count: { _all: 0 },
        _avg: { averageResponseDays: null },
      });
      mockPrismaService.employeeComplianceProfile.count.mockResolvedValue(0);
      mockPrismaService.$queryRaw.mockResolvedValue([{ rate: null }]);

      const result = await service.getComplianceStatistics(mockOrgId);

      expect(result.totalEmployees).toBe(0);
      expect(result.averageResponseDays).toBe(0);
      expect(result.averageCompletionRate).toBe(0);
    });
  });
});
