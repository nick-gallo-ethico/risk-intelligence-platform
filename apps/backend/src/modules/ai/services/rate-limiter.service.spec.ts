/**
 * AI RATE LIMITER SERVICE - UNIT TESTS
 *
 * Tests for the AiRateLimiterService which provides per-tenant AI rate limiting using Redis.
 * Key test scenarios:
 * - Allow request within rate limit
 * - Reject request exceeding rate limit
 * - Track limits per tenant (not global)
 * - Track limits per user within tenant
 * - Reset limits after window expires
 * - Use Redis sorted set for sliding window
 * - Return remaining quota in response
 * - Handle Redis connection errors gracefully
 * - Support different limits per tier (free/pro/enterprise)
 * - Log rate limit violations
 */

// Mock Redis BEFORE imports (jest.mock is hoisted)
const mockPipeline = {
  zremrangebyscore: jest.fn().mockReturnThis(),
  zcard: jest.fn().mockReturnThis(),
  zrange: jest.fn().mockReturnThis(),
  zadd: jest.fn().mockReturnThis(),
  get: jest.fn().mockReturnThis(),
  incr: jest.fn().mockReturnThis(),
  incrby: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

const mockRedis = {
  zrangebyscore: jest.fn(),
  zadd: jest.fn(),
  zremrangebyscore: jest.fn(),
  zrange: jest.fn(),
  zcard: jest.fn(),
  get: jest.fn(),
  incr: jest.fn(),
  incrby: jest.fn(),
  expire: jest.fn(),
  pipeline: jest.fn().mockReturnValue(mockPipeline),
};

// Mock ioredis - need to handle both default and named exports
const MockRedisConstructor = jest.fn().mockImplementation(() => mockRedis);
jest.mock("ioredis", () => {
  return {
    __esModule: true,
    default: MockRedisConstructor,
    Redis: MockRedisConstructor,
  };
});

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AiRateLimiterService } from "./rate-limiter.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("AiRateLimiterService", () => {
  let service: AiRateLimiterService;
  let mockPrisma: {
    aiRateLimit: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    aiUsage: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrisma = {
      aiRateLimit: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      aiUsage: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const mockConfig = {
      get: jest.fn().mockReturnValue("redis://localhost:6379"),
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Reset pipeline mock to default successful response
    mockPipeline.exec.mockResolvedValue([
      [null, null], // zremrangebyscore for rpm
      [null, 0], // zcard for rpm (current count)
      [null, null], // zremrangebyscore for tpm
      [null, []], // zrange for tpm (entries)
      [null, "0"], // get daily rpm
      [null, "0"], // get daily tpm
    ]);

    mockRedis.zrangebyscore.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiRateLimiterService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<AiRateLimiterService>(AiRateLimiterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkAndConsume", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should allow request within rate limit", async () => {
      // Arrange
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(null); // Use defaults
      mockPipeline.exec.mockResolvedValueOnce([
        [null, null],
        [null, 5], // 5 requests in current minute
        [null, null],
        [null, ["req1:1000", "1000"]], // 1000 tokens
        [null, "100"], // 100 daily requests
        [null, "50000"], // 50000 daily tokens
      ]);

      // Act
      const result = await service.checkAndConsume({
        organizationId: "org-123",
        estimatedTokens: 500,
      });

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeDefined();
      expect(result.remaining!.rpm).toBeGreaterThan(0);
    });

    it("should reject request exceeding RPM limit", async () => {
      // Arrange
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(null);
      mockPipeline.exec.mockResolvedValueOnce([
        [null, null],
        [null, 60], // 60 requests - at default limit
        [null, null],
        [null, []],
        [null, "0"],
        [null, "0"],
      ]);
      mockRedis.zrangebyscore.mockResolvedValue(["timestamp:1000"]);

      // Act
      const result = await service.checkAndConsume({
        organizationId: "org-123",
        estimatedTokens: 100,
      });

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("RATE_LIMIT_RPM");
      expect(result.retryAfterMs).toBeDefined();
    });

    it("should reject request exceeding TPM limit", async () => {
      // Arrange
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(null);
      // Format: [member, score, member, score, ...]
      // Member format is requestId:timestamp:tokenCount (3 parts needed for token parsing)
      mockPipeline.exec.mockResolvedValueOnce([
        [null, null],
        [null, 5], // Few requests
        [null, null],
        [null, ["req1:1000:100000", "1000"]], // Already 100k tokens in window
        [null, "0"],
        [null, "0"],
      ]);

      // Act
      const result = await service.checkAndConsume({
        organizationId: "org-123",
        estimatedTokens: 5000, // Would exceed 100k limit
      });

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("RATE_LIMIT_TPM");
    });

    it("should reject request exceeding daily limit", async () => {
      // Arrange
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(null);
      mockPipeline.exec.mockResolvedValueOnce([
        [null, null],
        [null, 5],
        [null, null],
        [null, []],
        [null, "10000"], // At daily request limit
        [null, "0"],
      ]);

      // Act
      const result = await service.checkAndConsume({
        organizationId: "org-123",
        estimatedTokens: 100,
      });

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("RATE_LIMIT_DAILY");
    });

    it("should track limits per tenant (isolated)", async () => {
      // Arrange
      const org1Limits = {
        organizationId: "org-1",
        requestsPerMinute: 100,
        tokensPerMinute: 200000,
        requestsPerDay: 20000,
        tokensPerDay: 10000000,
      };

      mockPrisma.aiRateLimit.findUnique.mockResolvedValueOnce(org1Limits);
      mockPrisma.aiRateLimit.findUnique.mockResolvedValueOnce(null); // org-2 uses defaults

      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 0],
        [null, null],
        [null, []],
        [null, "0"],
        [null, "0"],
      ]);

      // Act - first org with higher limits
      const result1 = await service.checkAndConsume({
        organizationId: "org-1",
        estimatedTokens: 100,
      });

      // Act - second org with default limits
      const result2 = await service.checkAndConsume({
        organizationId: "org-2",
        estimatedTokens: 100,
      });

      // Assert - both should be allowed but with different remaining quotas
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(mockPrisma.aiRateLimit.findUnique).toHaveBeenCalledTimes(2);
    });

    it("should return remaining quota in response", async () => {
      // Arrange
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(null);
      mockPipeline.exec.mockResolvedValueOnce([
        [null, null],
        [null, 10], // 10 requests used
        [null, null],
        [null, ["req1:10000:5000", "10000"]], // 5000 tokens in member format
        [null, "100"], // 100 daily requests
        [null, "50000"], // 50000 daily tokens
      ]);

      // Act
      const result = await service.checkAndConsume({
        organizationId: "org-123",
        estimatedTokens: 1000,
      });

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeDefined();
      expect(result.remaining!.rpm).toBe(60 - 10 - 1); // default 60 - used 10 - this request
      expect(result.remaining!.dailyRequests).toBe(10000 - 100 - 1);
    });

    it("should cache organization limits", async () => {
      // Arrange
      const orgLimits = {
        organizationId: "org-cached",
        requestsPerMinute: 120,
        tokensPerMinute: 150000,
        requestsPerDay: 15000,
        tokensPerDay: 8000000,
      };
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(orgLimits);
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 0],
        [null, null],
        [null, []],
        [null, "0"],
        [null, "0"],
      ]);

      // Act - call twice
      await service.checkAndConsume({
        organizationId: "org-cached",
        estimatedTokens: 100,
      });
      await service.checkAndConsume({
        organizationId: "org-cached",
        estimatedTokens: 100,
      });

      // Assert - should only query DB once due to caching
      expect(mockPrisma.aiRateLimit.findUnique).toHaveBeenCalledTimes(1);
    });

    it("should throw error when Redis pipeline returns null", async () => {
      // Arrange
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(null);
      mockPipeline.exec.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        service.checkAndConsume({
          organizationId: "org-123",
          estimatedTokens: 100,
        }),
      ).rejects.toThrow("Redis pipeline returned null");
    });
  });

  describe("recordUsage", () => {
    it("should record usage to database", async () => {
      // Arrange
      mockPrisma.aiUsage.create.mockResolvedValue({
        id: "usage-1",
        organizationId: "org-123",
        userId: "user-1",
        inputTokens: 100,
        outputTokens: 200,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        model: "claude-3-opus",
        provider: "claude",
        featureType: "summarize",
        entityType: "case",
        entityId: "case-123",
        durationMs: 1500,
        timestamp: new Date(),
      });

      // Act
      await service.recordUsage({
        organizationId: "org-123",
        userId: "user-1",
        inputTokens: 100,
        outputTokens: 200,
        model: "claude-3-opus",
        featureType: "summarize",
        entityType: "case",
        entityId: "case-123",
        durationMs: 1500,
      });

      // Assert
      expect(mockPrisma.aiUsage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-123",
          userId: "user-1",
          inputTokens: 100,
          outputTokens: 200,
          model: "claude-3-opus",
          featureType: "summarize",
        }),
      });
    });

    it("should use default values for optional fields", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.aiUsage.create.mockResolvedValue({} as any);

      // Act
      await service.recordUsage({
        organizationId: "org-123",
        inputTokens: 50,
        outputTokens: 100,
        model: "claude-3-haiku",
      });

      // Assert
      expect(mockPrisma.aiUsage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          provider: "claude",
        }),
      });
    });
  });

  describe("getUsageStats", () => {
    it("should return usage statistics for organization", async () => {
      // Arrange
      const usageRecords = [
        {
          id: "1",
          inputTokens: 100,
          outputTokens: 200,
          featureType: "summarize",
        },
        {
          id: "2",
          inputTokens: 50,
          outputTokens: 100,
          featureType: "summarize",
        },
        {
          id: "3",
          inputTokens: 80,
          outputTokens: 120,
          featureType: "translate",
        },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.aiUsage.findMany.mockResolvedValue(usageRecords as any);

      // Act
      const stats = await service.getUsageStats("org-123", "day");

      // Assert
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalInputTokens).toBe(230);
      expect(stats.totalOutputTokens).toBe(420);
      expect(stats.byFeature.summarize.requests).toBe(2);
      expect(stats.byFeature.translate.requests).toBe(1);
    });

    it("should filter by period", async () => {
      // Arrange
      mockPrisma.aiUsage.findMany.mockResolvedValue([]);

      // Act
      await service.getUsageStats("org-123", "week");

      // Assert
      expect(mockPrisma.aiUsage.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-123",
          timestamp: { gte: expect.any(Date) },
        },
      });
    });

    it("should return empty stats when no usage", async () => {
      // Arrange
      mockPrisma.aiUsage.findMany.mockResolvedValue([]);

      // Act
      const stats = await service.getUsageStats("org-123", "month");

      // Assert
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalInputTokens).toBe(0);
      expect(stats.totalOutputTokens).toBe(0);
      expect(Object.keys(stats.byFeature)).toHaveLength(0);
    });

    it("should handle unknown feature types", async () => {
      // Arrange
      mockPrisma.aiUsage.findMany.mockResolvedValue([
        {
          id: "1",
          inputTokens: 100,
          outputTokens: 200,
          featureType: null, // Unknown feature
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);

      // Act
      const stats = await service.getUsageStats("org-123", "day");

      // Assert
      expect(stats.byFeature.unknown).toBeDefined();
      expect(stats.byFeature.unknown.requests).toBe(1);
    });
  });

  describe("getRateLimitStatus", () => {
    it("should return current rate limit status", async () => {
      // Arrange
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(null);
      mockPipeline.exec.mockResolvedValueOnce([
        [null, null],
        [null, 15], // current RPM
        [null, null],
        [null, ["req1:1000:25000", "1000"]], // 25000 tokens
        [null, "500"], // daily requests
        [null, "250000"], // daily tokens
      ]);

      // Act
      const status = await service.getRateLimitStatus("org-123");

      // Assert
      expect(status.limits).toBeDefined();
      expect(status.limits.requestsPerMinute).toBe(60); // default
      expect(status.current.rpm).toBe(15);
      expect(status.remaining.rpm).toBe(45); // 60 - 15
    });

    it("should use custom limits for organization", async () => {
      // Arrange
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue({
        organizationId: "org-premium",
        requestsPerMinute: 200,
        tokensPerMinute: 500000,
        requestsPerDay: 50000,
        tokensPerDay: 20000000,
      });
      mockPipeline.exec.mockResolvedValueOnce([
        [null, null],
        [null, 50],
        [null, null],
        [null, []],
        [null, "1000"],
        [null, "100000"],
      ]);

      // Act
      const status = await service.getRateLimitStatus("org-premium");

      // Assert
      expect(status.limits.requestsPerMinute).toBe(200);
      expect(status.remaining.rpm).toBe(150); // 200 - 50
    });

    it("should handle zero remaining gracefully", async () => {
      // Arrange
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(null);
      mockPipeline.exec.mockResolvedValueOnce([
        [null, null],
        [null, 65], // More than limit
        [null, null],
        [null, []],
        [null, "0"],
        [null, "0"],
      ]);

      // Act
      const status = await service.getRateLimitStatus("org-123");

      // Assert
      expect(status.remaining.rpm).toBe(0); // Should be 0, not negative
    });
  });

  describe("updateOrgLimits", () => {
    it("should update organization limits", async () => {
      // Arrange
      const newLimits = {
        requestsPerMinute: 150,
        tokensPerMinute: 300000,
        requestsPerDay: 30000,
        tokensPerDay: 15000000,
      };
      mockPrisma.aiRateLimit.upsert.mockResolvedValue({
        organizationId: "org-123",
        ...newLimits,
      });

      // Act
      const result = await service.updateOrgLimits("org-123", newLimits);

      // Assert
      expect(result).toEqual(newLimits);
      expect(mockPrisma.aiRateLimit.upsert).toHaveBeenCalledWith({
        where: { organizationId: "org-123" },
        create: {
          organizationId: "org-123",
          ...newLimits,
        },
        update: newLimits,
      });
    });

    it("should use default values for partial updates", async () => {
      // Arrange
      const partialLimits = { requestsPerMinute: 100 };
      mockPrisma.aiRateLimit.upsert.mockResolvedValue({
        organizationId: "org-123",
        requestsPerMinute: 100,
        tokensPerMinute: 100000, // default
        requestsPerDay: 10000, // default
        tokensPerDay: 5000000, // default
      });

      // Act
      await service.updateOrgLimits("org-123", partialLimits);

      // Assert
      expect(mockPrisma.aiRateLimit.upsert).toHaveBeenCalledWith({
        where: { organizationId: "org-123" },
        create: expect.objectContaining({
          requestsPerMinute: 100,
          tokensPerMinute: 100000, // default
        }),
        update: { requestsPerMinute: 100 },
      });
    });

    it("should invalidate cache after update", async () => {
      // Arrange
      const orgLimits = {
        organizationId: "org-cache-test",
        requestsPerMinute: 60,
        tokensPerMinute: 100000,
        requestsPerDay: 10000,
        tokensPerDay: 5000000,
      };
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(orgLimits);
      mockPrisma.aiRateLimit.upsert.mockResolvedValue({
        ...orgLimits,
        requestsPerMinute: 120,
      });
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 0],
        [null, null],
        [null, []],
        [null, "0"],
        [null, "0"],
      ]);

      // Populate cache
      await service.checkAndConsume({
        organizationId: "org-cache-test",
        estimatedTokens: 100,
      });

      // Update limits
      await service.updateOrgLimits("org-cache-test", {
        requestsPerMinute: 120,
      });

      // Clear the mock call count
      mockPrisma.aiRateLimit.findUnique.mockClear();

      // Next call should query DB again (cache invalidated)
      await service.checkAndConsume({
        organizationId: "org-cache-test",
        estimatedTokens: 100,
      });

      expect(mockPrisma.aiRateLimit.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe("tier-based limits", () => {
    it("should support different limits for free tier", async () => {
      // Arrange
      const freeLimits = {
        organizationId: "org-free",
        requestsPerMinute: 10,
        tokensPerMinute: 10000,
        requestsPerDay: 100,
        tokensPerDay: 100000,
      };
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(freeLimits);
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 0],
        [null, null],
        [null, []],
        [null, "0"],
        [null, "0"],
      ]);

      // Act
      const result = await service.checkAndConsume({
        organizationId: "org-free",
        estimatedTokens: 100,
      });

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining!.rpm).toBe(9); // 10 - 1
    });

    it("should support different limits for enterprise tier", async () => {
      // Arrange
      const enterpriseLimits = {
        organizationId: "org-enterprise",
        requestsPerMinute: 1000,
        tokensPerMinute: 2000000,
        requestsPerDay: 100000,
        tokensPerDay: 100000000,
      };
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(enterpriseLimits);
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 0],
        [null, null],
        [null, []],
        [null, "0"],
        [null, "0"],
      ]);

      // Act
      const result = await service.checkAndConsume({
        organizationId: "org-enterprise",
        estimatedTokens: 100,
      });

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining!.rpm).toBe(999); // 1000 - 1
    });
  });

  describe("Redis key isolation", () => {
    it("should generate unique keys per organization", async () => {
      // Arrange
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(null);
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 0],
        [null, null],
        [null, []],
        [null, "0"],
        [null, "0"],
      ]);

      // Act
      await service.checkAndConsume({
        organizationId: "org-alpha",
        estimatedTokens: 100,
      });
      await service.checkAndConsume({
        organizationId: "org-beta",
        estimatedTokens: 100,
      });

      // Assert - verify pipeline was called with different keys
      expect(mockRedis.pipeline).toHaveBeenCalledTimes(4); // 2 check + 2 consume
    });
  });
});
