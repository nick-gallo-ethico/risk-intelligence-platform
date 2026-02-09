import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  collectDefaultMetrics,
  Registry,
  Counter,
  Histogram,
  Gauge,
} from "prom-client";

/**
 * MetricsService - Prometheus Metrics Collection
 *
 * Provides application metrics in Prometheus format for monitoring and alerting.
 * Exposes both default Node.js metrics and custom business metrics.
 *
 * Default Metrics:
 * - Node.js runtime metrics (memory, CPU, event loop, GC)
 * - Process metrics (uptime, file descriptors)
 *
 * Custom Metrics:
 * - HTTP request metrics (count, duration)
 * - Business metrics (cases created, active investigations)
 * - AI metrics (request count, duration)
 *
 * Usage:
 * - Inject MetricsService to record custom metrics
 * - Access /metrics endpoint for Prometheus scraping
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry();

  // HTTP Request Metrics
  readonly httpRequestsTotal: Counter;
  readonly httpRequestDuration: Histogram;

  // Business Metrics
  readonly casesCreated: Counter;
  readonly activeInvestigations: Gauge;
  readonly riusCreated: Counter;
  readonly campaignsActive: Gauge;

  // AI Metrics
  readonly aiRequestsTotal: Counter;
  readonly aiRequestDuration: Histogram;
  readonly aiTokensUsed: Counter;

  // WebSocket Metrics
  readonly websocketConnectionsActive: Gauge;
  readonly websocketMessagesTotal: Counter;

  // Database Metrics
  readonly databaseQueryDuration: Histogram;
  readonly databaseConnectionsActive: Gauge;

  // Queue Metrics
  readonly jobsProcessed: Counter;
  readonly jobsFailed: Counter;
  readonly jobsActive: Gauge;

  constructor() {
    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "path", "status"],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "path", "status"],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    // Business Metrics
    this.casesCreated = new Counter({
      name: "cases_created_total",
      help: "Total number of cases created",
      labelNames: ["organization_id", "source_channel"],
      registers: [this.registry],
    });

    this.activeInvestigations = new Gauge({
      name: "investigations_active",
      help: "Number of active investigations",
      labelNames: ["organization_id"],
      registers: [this.registry],
    });

    this.riusCreated = new Counter({
      name: "rius_created_total",
      help: "Total number of RIUs created",
      labelNames: ["organization_id", "type"],
      registers: [this.registry],
    });

    this.campaignsActive = new Gauge({
      name: "campaigns_active",
      help: "Number of active campaigns",
      labelNames: ["organization_id", "type"],
      registers: [this.registry],
    });

    // AI Metrics
    this.aiRequestsTotal = new Counter({
      name: "ai_requests_total",
      help: "Total AI API requests",
      labelNames: ["skill", "status"],
      registers: [this.registry],
    });

    this.aiRequestDuration = new Histogram({
      name: "ai_request_duration_seconds",
      help: "Duration of AI requests in seconds",
      labelNames: ["skill"],
      buckets: [0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry],
    });

    this.aiTokensUsed = new Counter({
      name: "ai_tokens_used_total",
      help: "Total AI tokens consumed",
      labelNames: ["skill", "type"],
      registers: [this.registry],
    });

    // WebSocket Metrics
    this.websocketConnectionsActive = new Gauge({
      name: "websocket_connections_active",
      help: "Number of active WebSocket connections",
      labelNames: ["namespace"],
      registers: [this.registry],
    });

    this.websocketMessagesTotal = new Counter({
      name: "websocket_messages_total",
      help: "Total WebSocket messages sent/received",
      labelNames: ["namespace", "event", "direction"],
      registers: [this.registry],
    });

    // Database Metrics
    this.databaseQueryDuration = new Histogram({
      name: "database_query_duration_seconds",
      help: "Duration of database queries in seconds",
      labelNames: ["operation", "model"],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.databaseConnectionsActive = new Gauge({
      name: "database_connections_active",
      help: "Number of active database connections",
      registers: [this.registry],
    });

    // Queue Metrics
    this.jobsProcessed = new Counter({
      name: "jobs_processed_total",
      help: "Total jobs processed",
      labelNames: ["queue", "job_name"],
      registers: [this.registry],
    });

    this.jobsFailed = new Counter({
      name: "jobs_failed_total",
      help: "Total jobs failed",
      labelNames: ["queue", "job_name"],
      registers: [this.registry],
    });

    this.jobsActive = new Gauge({
      name: "jobs_active",
      help: "Number of active jobs",
      labelNames: ["queue"],
      registers: [this.registry],
    });
  }

  /**
   * Initialize default Node.js metrics collection on module init.
   */
  onModuleInit() {
    // Collect default Node.js runtime metrics
    collectDefaultMetrics({
      register: this.registry,
      prefix: "ethico_", // Prefix to namespace our metrics
    });
  }

  /**
   * Get all metrics in Prometheus text format.
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get the content type for Prometheus metrics response.
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Reset all metrics (useful for testing).
   */
  resetMetrics(): void {
    this.registry.resetMetrics();
  }
}
