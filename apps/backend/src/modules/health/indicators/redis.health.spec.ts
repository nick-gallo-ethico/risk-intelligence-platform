import { Test, TestingModule } from "@nestjs/testing";
import { HealthCheckError } from "@nestjs/terminus";
import { RedisHealthIndicator } from "./redis.health";

describe("RedisHealthIndicator", () => {
  let indicator: RedisHealthIndicator;

  const mockRedisClient = {
    ping: jest.fn(),
  };

  describe("with Redis configured", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: RedisHealthIndicator,
            useFactory: () => new RedisHealthIndicator(mockRedisClient as any),
          },
        ],
      }).compile();

      indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
      jest.clearAllMocks();
    });

    it("should return healthy status when ping returns PONG", async () => {
      mockRedisClient.ping.mockResolvedValue("PONG");

      const result = await indicator.isHealthy("redis");

      expect(result).toHaveProperty("redis");
      expect(result.redis.status).toBe("up");
    });

    it("should return unhealthy status when ping returns unexpected value", async () => {
      mockRedisClient.ping.mockResolvedValue("NOT-PONG");

      const result = await indicator.isHealthy("redis");

      expect(result.redis.status).toBe("down");
    });

    it("should throw HealthCheckError when Redis connection fails", async () => {
      mockRedisClient.ping.mockRejectedValue(
        new Error("Redis connection failed"),
      );

      await expect(indicator.isHealthy("redis")).rejects.toThrow(
        HealthCheckError,
      );
    });
  });

  describe("without Redis configured (optional)", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: RedisHealthIndicator,
            useFactory: () => new RedisHealthIndicator(undefined),
          },
        ],
      }).compile();

      indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
    });

    it("should return healthy with not_configured status when Redis is not injected", async () => {
      const result = await indicator.isHealthy("redis");

      expect(result).toHaveProperty("redis");
      expect(result.redis.status).toBe("not_configured");
    });
  });
});
