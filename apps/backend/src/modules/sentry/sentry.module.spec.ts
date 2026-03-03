import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { SentryModule } from "./sentry.module";

// Mock the Sentry SDK to avoid network calls in tests
jest.mock("@sentry/node", () => ({
  init: jest.fn(),
}));

// Mock the profiling integration (it may or may not be available)
jest.mock(
  "@sentry/profiling-node",
  () => ({
    nodeProfilingIntegration: jest.fn().mockReturnValue({ name: "Profiling" }),
  }),
  { virtual: true },
);

import * as Sentry from "@sentry/node";

describe("SentryModule", () => {
  let sentryModule: SentryModule;

  const mockConfigService = {
    get: jest.fn(),
  };

  async function createModule(): Promise<TestingModule> {
    return Test.createTestingModule({
      providers: [
        SentryModule,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("onModuleInit", () => {
    it("should initialize Sentry when DSN is configured", async () => {
      mockConfigService.get.mockImplementation(
        (key: string, defaultVal?: string) => {
          if (key === "SENTRY_DSN") return "https://test@sentry.io/123456";
          if (key === "NODE_ENV") return "production";
          return defaultVal;
        },
      );

      const module = await createModule();
      sentryModule = module.get<SentryModule>(SentryModule);

      sentryModule.onModuleInit();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://test@sentry.io/123456",
          environment: "production",
        }),
      );
    });

    it("should not initialize Sentry when DSN is not configured", async () => {
      mockConfigService.get.mockImplementation(
        (key: string, defaultVal?: string) => {
          if (key === "SENTRY_DSN") return undefined;
          if (key === "NODE_ENV") return "development";
          return defaultVal;
        },
      );

      const module = await createModule();
      sentryModule = module.get<SentryModule>(SentryModule);

      sentryModule.onModuleInit();

      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it("should use lower sample rates in production", async () => {
      mockConfigService.get.mockImplementation(
        (key: string, defaultVal?: string) => {
          if (key === "SENTRY_DSN") return "https://test@sentry.io/123456";
          if (key === "NODE_ENV") return "production";
          return defaultVal;
        },
      );

      const module = await createModule();
      sentryModule = module.get<SentryModule>(SentryModule);

      sentryModule.onModuleInit();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0.1,
        }),
      );
    });

    it("should use 100% sample rates in non-production environments", async () => {
      mockConfigService.get.mockImplementation(
        (key: string, defaultVal?: string) => {
          if (key === "SENTRY_DSN") return "https://test@sentry.io/123456";
          if (key === "NODE_ENV") return "development";
          return defaultVal;
        },
      );

      const module = await createModule();
      sentryModule = module.get<SentryModule>(SentryModule);

      sentryModule.onModuleInit();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 1.0,
        }),
      );
    });

    it("should scrub authorization headers before sending to Sentry", async () => {
      mockConfigService.get.mockImplementation(
        (key: string, defaultVal?: string) => {
          if (key === "SENTRY_DSN") return "https://test@sentry.io/123456";
          if (key === "NODE_ENV") return "production";
          return defaultVal;
        },
      );

      const module = await createModule();
      sentryModule = module.get<SentryModule>(SentryModule);

      sentryModule.onModuleInit();

      // Get the beforeSend callback from the Sentry.init call
      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const mockEvent = {
        request: {
          headers: {
            authorization: "Bearer secret-token",
            cookie: "session=abc123",
            "content-type": "application/json",
          },
        },
      };

      const result = beforeSend(mockEvent);

      expect(result.request.headers["authorization"]).toBeUndefined();
      expect(result.request.headers["cookie"]).toBeUndefined();
      expect(result.request.headers["content-type"]).toBe("application/json");
    });

    it("should default environment to development when NODE_ENV not set", async () => {
      mockConfigService.get.mockImplementation(
        (key: string, defaultVal?: string) => {
          if (key === "SENTRY_DSN") return "https://test@sentry.io/123456";
          if (key === "NODE_ENV") return defaultVal; // returns "development" as default
          return defaultVal;
        },
      );

      const module = await createModule();
      sentryModule = module.get<SentryModule>(SentryModule);

      sentryModule.onModuleInit();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: "development",
        }),
      );
    });
  });
});
