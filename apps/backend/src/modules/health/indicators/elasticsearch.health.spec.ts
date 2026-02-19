import { Test, TestingModule } from "@nestjs/testing";
import { HealthCheckError } from "@nestjs/terminus";
import { ElasticsearchHealthIndicator } from "./elasticsearch.health";

describe("ElasticsearchHealthIndicator", () => {
  let indicator: ElasticsearchHealthIndicator;

  const mockEsService = {
    cluster: {
      health: jest.fn(),
    },
  };

  describe("with Elasticsearch configured", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: ElasticsearchHealthIndicator,
            useFactory: () =>
              new ElasticsearchHealthIndicator(mockEsService as any),
          },
        ],
      }).compile();

      indicator = module.get<ElasticsearchHealthIndicator>(
        ElasticsearchHealthIndicator,
      );
      jest.clearAllMocks();
    });

    it("should return healthy for green cluster status", async () => {
      mockEsService.cluster.health.mockResolvedValue({
        status: "green",
        number_of_nodes: 3,
        active_shards: 15,
      });

      const result = await indicator.isHealthy("elasticsearch");

      expect(result.elasticsearch.status).toBe("up");
      expect(result.elasticsearch.clusterStatus).toBe("green");
    });

    it("should return healthy for yellow cluster status", async () => {
      mockEsService.cluster.health.mockResolvedValue({
        status: "yellow",
        number_of_nodes: 1,
        active_shards: 5,
      });

      const result = await indicator.isHealthy("elasticsearch");

      expect(result.elasticsearch.status).toBe("up");
      expect(result.elasticsearch.clusterStatus).toBe("yellow");
    });

    it("should return unhealthy for red cluster status", async () => {
      mockEsService.cluster.health.mockResolvedValue({
        status: "red",
        number_of_nodes: 0,
        active_shards: 0,
      });

      const result = await indicator.isHealthy("elasticsearch");

      expect(result.elasticsearch.status).toBe("down");
      expect(result.elasticsearch.clusterStatus).toBe("red");
    });

    it("should throw HealthCheckError when ES connection fails", async () => {
      mockEsService.cluster.health.mockRejectedValue(
        new Error("Connection refused"),
      );

      await expect(indicator.isHealthy("elasticsearch")).rejects.toThrow(
        HealthCheckError,
      );
    });
  });

  describe("without Elasticsearch configured (optional)", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: ElasticsearchHealthIndicator,
            useFactory: () => new ElasticsearchHealthIndicator(undefined),
          },
        ],
      }).compile();

      indicator = module.get<ElasticsearchHealthIndicator>(
        ElasticsearchHealthIndicator,
      );
    });

    it("should return healthy with not_configured status when ES is not injected", async () => {
      const result = await indicator.isHealthy("elasticsearch");

      expect(result.elasticsearch.status).toBe("up");
      expect(result.elasticsearch.clusterStatus).toBe("not_configured");
    });
  });
});
