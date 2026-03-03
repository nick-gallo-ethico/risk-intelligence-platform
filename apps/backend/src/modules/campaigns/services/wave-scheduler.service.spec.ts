import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  WaveSchedulerService,
  CAMPAIGN_QUEUE_NAME,
} from "./wave-scheduler.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { BlackoutManagerService } from "./blackout-manager.service";
import { CampaignStatus, CampaignRolloutStrategy } from "@prisma/client";

describe("WaveSchedulerService", () => {
  let service: WaveSchedulerService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;
  let blackoutManager: jest.Mocked<BlackoutManagerService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockQueue: { add: jest.Mock; getJob: jest.Mock };

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockCampaignId = "campaign-test-123";

  const mockCampaign = {
    id: mockCampaignId,
    organizationId: mockOrgId,
    name: "Test Campaign",
    status: CampaignStatus.DRAFT,
    dueDate: new Date("2026-04-30"),
    expiresAt: new Date("2026-05-30"),
    version: 1,
  };

  const mockPrismaService = {
    campaign: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    campaignWave: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    campaignAssignment: {
      updateMany: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockBlackoutManagerService = {
    checkBlackouts: jest.fn(),
    getNextAvailableDate: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: "job-1" }),
      getJob: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaveSchedulerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        {
          provide: BlackoutManagerService,
          useValue: mockBlackoutManagerService,
        },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: getQueueToken(CAMPAIGN_QUEUE_NAME), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<WaveSchedulerService>(WaveSchedulerService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
    blackoutManager = module.get(BlackoutManagerService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe("scheduleLaunch", () => {
    const futureDate = new Date(Date.now() + 86400000); // Tomorrow

    it("should schedule campaign launch", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockBlackoutManagerService.checkBlackouts.mockResolvedValue(false);
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.SCHEDULED,
      });

      const result = await service.scheduleLaunch(
        mockCampaignId,
        futureDate,
        null,
        mockUserId,
        mockOrgId,
      );

      expect(result.campaignId).toBe(mockCampaignId);
      expect(result.rolloutStrategy).toBe(CampaignRolloutStrategy.IMMEDIATE);
      expect(mockQueue.add).toHaveBeenCalledWith(
        "launch-campaign",
        expect.any(Object),
        expect.objectContaining({ delay: expect.any(Number) }),
      );
      expect(auditService.log).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "campaign.scheduled",
        expect.any(Object),
      );
    });

    it("should throw NotFoundException when campaign not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.scheduleLaunch(
          "nonexistent",
          futureDate,
          null,
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when campaign not in DRAFT status", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });

      await expect(
        service.scheduleLaunch(
          mockCampaignId,
          futureDate,
          null,
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when date is in blackout", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockBlackoutManagerService.checkBlackouts.mockResolvedValue(true);
      mockBlackoutManagerService.getNextAvailableDate.mockResolvedValue(
        new Date(Date.now() + 172800000),
      );

      await expect(
        service.scheduleLaunch(
          mockCampaignId,
          futureDate,
          null,
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when scheduled time is in the past", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockBlackoutManagerService.checkBlackouts.mockResolvedValue(false);
      mockPrismaService.campaign.update.mockResolvedValue({});

      const pastDate = new Date(Date.now() - 86400000);

      await expect(
        service.scheduleLaunch(
          mockCampaignId,
          pastDate,
          null,
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create waves for staggered rollout", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockBlackoutManagerService.checkBlackouts.mockResolvedValue(false);
      mockBlackoutManagerService.getNextAvailableDate.mockImplementation(
        (date) => Promise.resolve(date),
      );
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.SCHEDULED,
      });
      mockPrismaService.campaignWave.create.mockResolvedValue({
        waveNumber: 1,
        scheduledAt: futureDate,
        employeeIds: [],
      });

      const result = await service.scheduleLaunch(
        mockCampaignId,
        futureDate,
        { type: "percentage", values: [50, 50] },
        mockUserId,
        mockOrgId,
      );

      expect(result.rolloutStrategy).toBe(CampaignRolloutStrategy.STAGGERED);
      expect(prisma.campaignWave.create).toHaveBeenCalled();
    });
  });

  describe("cancelScheduledLaunch", () => {
    it("should cancel scheduled campaign", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.SCHEDULED,
      });
      mockQueue.getJob.mockResolvedValue({ remove: jest.fn() });
      mockPrismaService.campaignWave.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.DRAFT,
      });

      const result = await service.cancelScheduledLaunch(
        mockCampaignId,
        mockUserId,
        mockOrgId,
        "Test reason",
      );

      expect(result.status).toBe(CampaignStatus.DRAFT);
      expect(auditService.log).toHaveBeenCalled();
    });

    it("should throw NotFoundException when campaign not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelScheduledLaunch("nonexistent", mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when not scheduled", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });

      await expect(
        service.cancelScheduledLaunch(mockCampaignId, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("createWaves", () => {
    it("should create waves with employee distribution", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockBlackoutManagerService.getNextAvailableDate.mockImplementation(
        (date) => Promise.resolve(date),
      );
      mockPrismaService.campaignWave.create.mockImplementation((args) =>
        Promise.resolve({
          id: `wave-${args.data.waveNumber}`,
          ...args.data,
        }),
      );

      const result = await service.createWaves(
        mockCampaignId,
        { type: "percentage", values: [30, 70] },
        ["emp-1", "emp-2", "emp-3", "emp-4", "emp-5"],
        mockOrgId,
      );

      expect(result).toHaveLength(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "campaign.wave.scheduled",
        expect.any(Object),
      );
    });

    it("should throw NotFoundException when campaign not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.createWaves(
          "nonexistent",
          { type: "percentage", values: [100] },
          [],
          mockOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getWaves", () => {
    it("should return waves for campaign", async () => {
      const mockWaves = [
        { waveNumber: 1, scheduledAt: new Date() },
        { waveNumber: 2, scheduledAt: new Date() },
      ];
      mockPrismaService.campaignWave.findMany.mockResolvedValue(mockWaves);

      const result = await service.getWaves(mockCampaignId, mockOrgId);

      expect(result).toHaveLength(2);
      expect(prisma.campaignWave.findMany).toHaveBeenCalledWith({
        where: { campaignId: mockCampaignId, organizationId: mockOrgId },
        orderBy: { waveNumber: "asc" },
      });
    });
  });

  describe("extendDeadlines", () => {
    it("should extend campaign deadlines", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        dueDate: new Date("2026-05-05"),
      });
      mockPrismaService.campaignAssignment.updateMany.mockResolvedValue({
        count: 10,
      });

      const result = await service.extendDeadlines(
        mockCampaignId,
        5,
        mockUserId,
        mockOrgId,
      );

      expect(prisma.campaign.update).toHaveBeenCalled();
      expect(prisma.campaignAssignment.updateMany).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });

    it("should throw NotFoundException when campaign not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.extendDeadlines("nonexistent", 5, mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
