import { Test, TestingModule } from "@nestjs/testing";
import { HealthCheckError } from "@nestjs/terminus";
import { PrismaHealthIndicator } from "./prisma.health";
import { PrismaService } from "../../prisma/prisma.service";

describe("PrismaHealthIndicator", () => {
  let indicator: PrismaHealthIndicator;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    indicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    jest.clearAllMocks();
  });

  describe("isHealthy", () => {
    it("should return healthy status when database query succeeds", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

      const result = await indicator.isHealthy("database");

      expect(result).toHaveProperty("database");
      expect(result.database.status).toBe("up");
    });

    it("should throw HealthCheckError when database query fails", async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error("Connection refused"),
      );

      await expect(indicator.isHealthy("database")).rejects.toThrow(
        HealthCheckError,
      );
    });

    it("should include error message in HealthCheckError details", async () => {
      const errorMessage = "ECONNREFUSED: Connection refused";
      mockPrismaService.$queryRaw.mockRejectedValue(new Error(errorMessage));

      try {
        await indicator.isHealthy("database");
        fail("Expected HealthCheckError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        const healthError = error as HealthCheckError;
        const causeStr = JSON.stringify(healthError.causes);
        expect(causeStr).toContain("database");
      }
    });

    it("should use the provided key in the result", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

      const result = await indicator.isHealthy("my-database-key");

      expect(result).toHaveProperty("my-database-key");
    });
  });
});
