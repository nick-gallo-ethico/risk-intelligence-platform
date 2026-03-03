import { Test, TestingModule } from "@nestjs/testing";
import { CampaignSchedulingService } from "./campaign-scheduling.service";
import { WaveSchedulerService } from "./services/wave-scheduler.service";
import { BlackoutManagerService } from "./services/blackout-manager.service";
import { CampaignRolloutStrategy } from "@prisma/client";

describe("CampaignSchedulingService", () => {
  let service: CampaignSchedulingService;
  let waveScheduler: jest.Mocked<WaveSchedulerService>;
  let blackoutManager: jest.Mocked<BlackoutManagerService>;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockCampaignId = "campaign-test-123";

  const mockWaveSchedulerService = {
    scheduleLaunch: jest.fn(),
    cancelScheduledLaunch: jest.fn(),
    createWaves: jest.fn(),
    getWaves: jest.fn(),
    extendDeadlines: jest.fn(),
  };

  const mockBlackoutManagerService = {
    checkBlackouts: jest.fn(),
    getNextAvailableDate: jest.fn(),
    createBlackout: jest.fn(),
    updateBlackout: jest.fn(),
    deleteBlackout: jest.fn(),
    listBlackouts: jest.fn(),
    getBlackout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignSchedulingService,
        { provide: WaveSchedulerService, useValue: mockWaveSchedulerService },
        {
          provide: BlackoutManagerService,
          useValue: mockBlackoutManagerService,
        },
      ],
    }).compile();

    service = module.get<CampaignSchedulingService>(CampaignSchedulingService);
    waveScheduler = module.get(WaveSchedulerService);
    blackoutManager = module.get(BlackoutManagerService);

    jest.clearAllMocks();
  });

  describe("scheduleLaunch", () => {
    it("should delegate to WaveSchedulerService", async () => {
      const scheduledAt = new Date("2026-04-01");
      const rolloutConfig = { type: "percentage" as const, values: [50, 50] };
      const expected = {
        campaignId: mockCampaignId,
        scheduledAt,
        rolloutStrategy: CampaignRolloutStrategy.STAGGERED,
        waveCount: 2,
        waves: [],
      };
      mockWaveSchedulerService.scheduleLaunch.mockResolvedValue(expected);

      const result = await service.scheduleLaunch(
        mockCampaignId,
        scheduledAt,
        rolloutConfig,
        mockUserId,
        mockOrgId,
      );

      expect(result).toEqual(expected);
      expect(waveScheduler.scheduleLaunch).toHaveBeenCalledWith(
        mockCampaignId,
        scheduledAt,
        rolloutConfig,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("cancelScheduledLaunch", () => {
    it("should delegate to WaveSchedulerService", async () => {
      const mockCampaign = { id: mockCampaignId, name: "Test" };
      mockWaveSchedulerService.cancelScheduledLaunch.mockResolvedValue(
        mockCampaign,
      );

      const result = await service.cancelScheduledLaunch(
        mockCampaignId,
        mockUserId,
        mockOrgId,
        "Test reason",
      );

      expect(result).toEqual(mockCampaign);
      expect(waveScheduler.cancelScheduledLaunch).toHaveBeenCalledWith(
        mockCampaignId,
        mockUserId,
        mockOrgId,
        "Test reason",
      );
    });
  });

  describe("createWaves", () => {
    it("should delegate to WaveSchedulerService", async () => {
      const config = { type: "percentage" as const, values: [30, 70] };
      const employeeIds = ["emp-1", "emp-2", "emp-3"];
      mockWaveSchedulerService.createWaves.mockResolvedValue([]);

      await service.createWaves(mockCampaignId, config, employeeIds, mockOrgId);

      expect(waveScheduler.createWaves).toHaveBeenCalledWith(
        mockCampaignId,
        config,
        employeeIds,
        mockOrgId,
      );
    });
  });

  describe("getWaves", () => {
    it("should delegate to WaveSchedulerService", async () => {
      mockWaveSchedulerService.getWaves.mockResolvedValue([]);

      await service.getWaves(mockCampaignId, mockOrgId);

      expect(waveScheduler.getWaves).toHaveBeenCalledWith(
        mockCampaignId,
        mockOrgId,
      );
    });
  });

  describe("extendDeadlines", () => {
    it("should delegate to WaveSchedulerService", async () => {
      const mockCampaign = { id: mockCampaignId, dueDate: new Date() };
      mockWaveSchedulerService.extendDeadlines.mockResolvedValue(mockCampaign);

      const result = await service.extendDeadlines(
        mockCampaignId,
        5,
        mockUserId,
        mockOrgId,
      );

      expect(result).toEqual(mockCampaign);
      expect(waveScheduler.extendDeadlines).toHaveBeenCalledWith(
        mockCampaignId,
        5,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("checkBlackouts", () => {
    it("should delegate to BlackoutManagerService", async () => {
      mockBlackoutManagerService.checkBlackouts.mockResolvedValue(true);

      const result = await service.checkBlackouts(
        new Date(),
        mockOrgId,
        "loc-1",
      );

      expect(result).toBe(true);
      expect(blackoutManager.checkBlackouts).toHaveBeenCalled();
    });
  });

  describe("getNextAvailableDate", () => {
    it("should delegate to BlackoutManagerService", async () => {
      const fromDate = new Date("2026-03-15");
      const expectedDate = new Date("2026-03-20");
      mockBlackoutManagerService.getNextAvailableDate.mockResolvedValue(
        expectedDate,
      );

      const result = await service.getNextAvailableDate(fromDate, mockOrgId);

      expect(result).toEqual(expectedDate);
      expect(blackoutManager.getNextAvailableDate).toHaveBeenCalledWith(
        fromDate,
        mockOrgId,
        undefined,
      );
    });
  });

  describe("createBlackout", () => {
    it("should delegate to BlackoutManagerService", async () => {
      const input = {
        name: "Holiday",
        startDate: new Date("2026-12-24"),
        endDate: new Date("2026-12-26"),
      };
      mockBlackoutManagerService.createBlackout.mockResolvedValue({
        id: "blackout-1",
        ...input,
      });

      await service.createBlackout(input, mockUserId, mockOrgId);

      expect(blackoutManager.createBlackout).toHaveBeenCalledWith(
        input,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("updateBlackout", () => {
    it("should delegate to BlackoutManagerService", async () => {
      mockBlackoutManagerService.updateBlackout.mockResolvedValue({});

      await service.updateBlackout(
        "blackout-1",
        { name: "Updated" },
        mockUserId,
        mockOrgId,
      );

      expect(blackoutManager.updateBlackout).toHaveBeenCalledWith(
        "blackout-1",
        { name: "Updated" },
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("deleteBlackout", () => {
    it("should delegate to BlackoutManagerService", async () => {
      mockBlackoutManagerService.deleteBlackout.mockResolvedValue(undefined);

      await service.deleteBlackout("blackout-1", mockUserId, mockOrgId);

      expect(blackoutManager.deleteBlackout).toHaveBeenCalledWith(
        "blackout-1",
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("listBlackouts", () => {
    it("should delegate to BlackoutManagerService", async () => {
      mockBlackoutManagerService.listBlackouts.mockResolvedValue([]);

      await service.listBlackouts(mockOrgId, { includeInactive: true });

      expect(blackoutManager.listBlackouts).toHaveBeenCalledWith(mockOrgId, {
        includeInactive: true,
      });
    });
  });

  describe("getBlackout", () => {
    it("should delegate to BlackoutManagerService", async () => {
      mockBlackoutManagerService.getBlackout.mockResolvedValue({
        id: "blackout-1",
      });

      await service.getBlackout("blackout-1", mockOrgId);

      expect(blackoutManager.getBlackout).toHaveBeenCalledWith(
        "blackout-1",
        mockOrgId,
      );
    });
  });
});
