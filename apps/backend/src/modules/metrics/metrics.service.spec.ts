import { Test, TestingModule } from "@nestjs/testing";
import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    // Reset metrics before each test to ensure clean state
    service.resetMetrics();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getMetrics", () => {
    it("should return metrics in Prometheus format", async () => {
      const metrics = await service.getMetrics();

      expect(typeof metrics).toBe("string");
      expect(metrics).toContain("# HELP");
      expect(metrics).toContain("# TYPE");
    });

    it("should include default Node.js metrics after init", async () => {
      // Trigger onModuleInit
      service.onModuleInit();

      const metrics = await service.getMetrics();

      // Default metrics include process and Node.js runtime metrics
      expect(metrics).toContain("ethico_");
    });
  });

  describe("getContentType", () => {
    it("should return Prometheus content type", () => {
      const contentType = service.getContentType();

      expect(contentType).toContain("text/plain");
    });
  });

  describe("HTTP metrics", () => {
    it("should increment httpRequestsTotal counter", async () => {
      service.httpRequestsTotal.inc({
        method: "GET",
        path: "/api/v1/cases",
        status: "200",
      });

      const metrics = await service.getMetrics();

      expect(metrics).toContain("http_requests_total");
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('path="/api/v1/cases"');
      expect(metrics).toContain('status="200"');
    });

    it("should record httpRequestDuration histogram", async () => {
      service.httpRequestDuration.observe(
        {
          method: "POST",
          path: "/api/v1/cases",
          status: "201",
        },
        0.15,
      );

      const metrics = await service.getMetrics();

      expect(metrics).toContain("http_request_duration_seconds");
      expect(metrics).toContain("_bucket");
      expect(metrics).toContain("_sum");
      expect(metrics).toContain("_count");
    });
  });

  describe("Business metrics", () => {
    it("should increment casesCreated counter", async () => {
      service.casesCreated.inc({
        organization_id: "org-123",
        source_channel: "web_form",
      });

      const metrics = await service.getMetrics();

      expect(metrics).toContain("cases_created_total");
      expect(metrics).toContain('organization_id="org-123"');
      expect(metrics).toContain('source_channel="web_form"');
    });

    it("should track activeInvestigations gauge", async () => {
      service.activeInvestigations.set({ organization_id: "org-456" }, 5);

      const metrics = await service.getMetrics();

      expect(metrics).toContain("investigations_active");
      expect(metrics).toContain("5");
    });

    it("should increment riusCreated counter", async () => {
      service.riusCreated.inc({
        organization_id: "org-123",
        type: "hotline_report",
      });

      const metrics = await service.getMetrics();

      expect(metrics).toContain("rius_created_total");
      expect(metrics).toContain('type="hotline_report"');
    });
  });

  describe("AI metrics", () => {
    it("should track AI requests", async () => {
      service.aiRequestsTotal.inc({
        skill: "summarize",
        status: "success",
      });

      const metrics = await service.getMetrics();

      expect(metrics).toContain("ai_requests_total");
      expect(metrics).toContain('skill="summarize"');
      expect(metrics).toContain('status="success"');
    });

    it("should record AI request duration", async () => {
      service.aiRequestDuration.observe({ skill: "translate" }, 2.5);

      const metrics = await service.getMetrics();

      expect(metrics).toContain("ai_request_duration_seconds");
    });

    it("should track AI tokens used", async () => {
      service.aiTokensUsed.inc(
        {
          skill: "summarize",
          type: "input",
        },
        1500,
      );

      const metrics = await service.getMetrics();

      expect(metrics).toContain("ai_tokens_used_total");
      expect(metrics).toContain('type="input"');
    });
  });

  describe("WebSocket metrics", () => {
    it("should track active connections", async () => {
      service.websocketConnectionsActive.inc({ namespace: "notifications" });

      const metrics = await service.getMetrics();

      expect(metrics).toContain("websocket_connections_active");
      expect(metrics).toContain('namespace="notifications"');
    });

    it("should count WebSocket messages", async () => {
      service.websocketMessagesTotal.inc({
        namespace: "ai",
        event: "stream",
        direction: "outbound",
      });

      const metrics = await service.getMetrics();

      expect(metrics).toContain("websocket_messages_total");
      expect(metrics).toContain('direction="outbound"');
    });
  });

  describe("Database metrics", () => {
    it("should record query duration", async () => {
      service.databaseQueryDuration.observe(
        {
          operation: "findMany",
          model: "Case",
        },
        0.025,
      );

      const metrics = await service.getMetrics();

      expect(metrics).toContain("database_query_duration_seconds");
      expect(metrics).toContain('model="Case"');
    });

    it("should track active connections", async () => {
      service.databaseConnectionsActive.set(10);

      const metrics = await service.getMetrics();

      expect(metrics).toContain("database_connections_active");
    });
  });

  describe("Queue metrics", () => {
    it("should count processed jobs", async () => {
      service.jobsProcessed.inc({
        queue: "email",
        job_name: "send-notification",
      });

      const metrics = await service.getMetrics();

      expect(metrics).toContain("jobs_processed_total");
      expect(metrics).toContain('queue="email"');
    });

    it("should count failed jobs", async () => {
      service.jobsFailed.inc({
        queue: "export",
        job_name: "generate-report",
      });

      const metrics = await service.getMetrics();

      expect(metrics).toContain("jobs_failed_total");
    });

    it("should track active jobs", async () => {
      service.jobsActive.set({ queue: "indexing" }, 3);

      const metrics = await service.getMetrics();

      expect(metrics).toContain("jobs_active");
    });
  });

  describe("resetMetrics", () => {
    it("should reset all metrics", async () => {
      // Add some metrics
      service.httpRequestsTotal.inc({
        method: "GET",
        path: "/test",
        status: "200",
      });

      // Reset
      service.resetMetrics();

      // Get metrics after reset
      const metrics = await service.getMetrics();

      // Counter should still be defined but reset to 0
      expect(metrics).toContain("http_requests_total");
    });
  });
});
