import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { FeatureFlagsService, FeatureFlag } from "./feature-flags.service";

// Mock ioredis to avoid real Redis connections in tests
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
  }));
});

describe("FeatureFlagsService", () => {
  let service: FeatureFlagsService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Return no Redis URL so the service uses in-memory fallback
    mockConfigService.get.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);

    // Initialize the module (normally called by NestJS lifecycle)
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("isEnabled", () => {
    it("should return false for unknown flag", async () => {
      const result = await service.isEnabled("unknown_flag");
      expect(result).toBe(false);
    });

    it("should return true for globally enabled flag", async () => {
      await service.setFlag({ name: "test_feature", enabled: true });
      const result = await service.isEnabled("test_feature");
      expect(result).toBe(true);
    });

    it("should return false for globally disabled flag", async () => {
      await service.setFlag({ name: "disabled_feature", enabled: false });
      const result = await service.isEnabled("disabled_feature");
      expect(result).toBe(false);
    });

    it("should return false when org not in allowedOrgs list", async () => {
      await service.setFlag({
        name: "org_specific_feature",
        enabled: true,
        allowedOrgs: ["org-allowed"],
      });

      const result = await service.isEnabled("org_specific_feature", {
        organizationId: "org-not-allowed",
      });

      expect(result).toBe(false);
    });

    it("should return true when org is in allowedOrgs list", async () => {
      await service.setFlag({
        name: "org_specific_feature",
        enabled: true,
        allowedOrgs: ["org-allowed"],
      });

      const result = await service.isEnabled("org_specific_feature", {
        organizationId: "org-allowed",
      });

      expect(result).toBe(true);
    });

    it("should use deterministic percentage rollout (same org always gets same result)", async () => {
      await service.setFlag({
        name: "partial_rollout",
        enabled: true,
        percentage: 50,
      });

      const context = { organizationId: "org-consistent-123" };

      // Multiple calls for the same context should always return the same result
      const result1 = await service.isEnabled("partial_rollout", context);
      const result2 = await service.isEnabled("partial_rollout", context);
      const result3 = await service.isEnabled("partial_rollout", context);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it("should return true for 100% rollout flag regardless of org", async () => {
      await service.setFlag({
        name: "full_rollout",
        enabled: true,
        percentage: 100,
      });

      const result = await service.isEnabled("full_rollout", {
        organizationId: "any-org",
      });

      expect(result).toBe(true);
    });
  });

  describe("getFlag", () => {
    it("should return null for non-existent flag", async () => {
      const result = await service.getFlag("non_existent");
      expect(result).toBeNull();
    });

    it("should return flag after setting it", async () => {
      const flag: FeatureFlag = { name: "my_feature", enabled: true };
      await service.setFlag(flag);

      const result = await service.getFlag("my_feature");

      expect(result).toEqual(flag);
    });
  });

  describe("setFlag", () => {
    it("should persist flag in in-memory store", async () => {
      const flag: FeatureFlag = {
        name: "new_feature",
        enabled: true,
        percentage: 25,
      };

      await service.setFlag(flag);

      const retrieved = await service.getFlag("new_feature");
      expect(retrieved).toEqual(flag);
    });

    it("should overwrite an existing flag", async () => {
      await service.setFlag({ name: "toggle_feature", enabled: true });
      await service.setFlag({ name: "toggle_feature", enabled: false });

      const result = await service.getFlag("toggle_feature");
      expect(result?.enabled).toBe(false);
    });
  });

  describe("deleteFlag", () => {
    it("should remove flag from in-memory store", async () => {
      await service.setFlag({ name: "temp_feature", enabled: true });
      await service.deleteFlag("temp_feature");

      const result = await service.getFlag("temp_feature");
      expect(result).toBeNull();
    });

    it("should not throw when deleting non-existent flag", async () => {
      await expect(service.deleteFlag("non_existent")).resolves.not.toThrow();
    });
  });

  describe("getAllFlags", () => {
    it("should return all flags including defaults", async () => {
      const flags = await service.getAllFlags();

      // Default flags are initialized in onModuleInit
      expect(flags.length).toBeGreaterThan(0);
      expect(flags.some((f) => f.name === "ai_chat")).toBe(true);
      expect(flags.some((f) => f.name === "ai_summarization")).toBe(true);
    });

    it("should include custom flags added after initialization", async () => {
      await service.setFlag({ name: "custom_flag", enabled: true });

      const flags = await service.getAllFlags();

      expect(flags.some((f) => f.name === "custom_flag")).toBe(true);
    });
  });

  describe("default flags initialization", () => {
    it("should have ai_chat enabled by default", async () => {
      const result = await service.isEnabled("ai_chat");
      expect(result).toBe(true);
    });

    it("should have new_investigation_ui disabled by default", async () => {
      const result = await service.isEnabled("new_investigation_ui");
      expect(result).toBe(false);
    });

    it("should have realtime_collaboration enabled by default", async () => {
      const result = await service.isEnabled("realtime_collaboration");
      expect(result).toBe(true);
    });
  });
});
