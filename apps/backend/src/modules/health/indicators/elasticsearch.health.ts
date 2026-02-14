import { Injectable, Optional } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import { ElasticsearchService } from "@nestjs/elasticsearch";

/**
 * Health indicator for Elasticsearch cluster connectivity.
 *
 * Verifies Elasticsearch connectivity by checking cluster health.
 * Considers "green" and "yellow" status as healthy (yellow is normal
 * for single-node clusters or during shard allocation).
 * If Elasticsearch is not configured (optional dependency), returns
 * healthy with status "not_configured" to indicate graceful degradation.
 */
@Injectable()
export class ElasticsearchHealthIndicator extends HealthIndicator {
  constructor(@Optional() private readonly esService?: ElasticsearchService) {
    super();
  }

  /**
   * Checks Elasticsearch health by querying cluster health endpoint.
   *
   * @param key - The key used in the health check result
   * @returns Health indicator result with cluster status details
   * @throws HealthCheckError if Elasticsearch is configured but unreachable
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.esService) {
      return this.getStatus(key, true, { status: "not_configured" });
    }

    try {
      const health = await this.esService.cluster.health();
      const isHealthy = ["green", "yellow"].includes(health.status);

      return this.getStatus(key, isHealthy, {
        status: health.status,
        numberOfNodes: health.number_of_nodes,
        activeShards: health.active_shards,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new HealthCheckError(
        "Elasticsearch check failed",
        this.getStatus(key, false, { message }),
      );
    }
  }
}
