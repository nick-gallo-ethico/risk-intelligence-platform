import { Global, Module, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Sentry from "@sentry/node";

/**
 * SentryModule - Global error tracking and performance monitoring
 *
 * Initializes Sentry for centralized error tracking across the platform.
 * Automatically captures unhandled exceptions, performance data, and custom events.
 *
 * Configuration:
 * - SENTRY_DSN: Sentry Data Source Name (required for Sentry to initialize)
 * - NODE_ENV: Environment name (development, staging, production)
 *
 * Sample rates are adjusted based on environment:
 * - Production: 10% sampling for traces and profiles
 * - Non-production: 100% sampling for full visibility
 */
@Global()
@Module({})
export class SentryModule implements OnModuleInit {
  private readonly logger = new Logger(SentryModule.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get<string>("SENTRY_DSN");
    const environment = this.configService.get<string>(
      "NODE_ENV",
      "development",
    );

    if (dsn) {
      // Try to load profiling integration (may fail on some platforms)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const integrations: any[] = [];
      try {
        // Dynamic import to gracefully handle missing native module
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { nodeProfilingIntegration } = require("@sentry/profiling-node");
        integrations.push(nodeProfilingIntegration());
        this.logger.log("Sentry profiling integration loaded");
      } catch {
        this.logger.warn(
          "Sentry profiling not available (native module missing), continuing without profiling",
        );
      }

      Sentry.init({
        dsn,
        environment,
        integrations,
        // Reduce sampling in production to manage costs
        tracesSampleRate: environment === "production" ? 0.1 : 1.0,
        profilesSampleRate:
          integrations.length > 0
            ? environment === "production"
              ? 0.1
              : 1.0
            : 0,
        // Capture additional context
        beforeSend(event) {
          // Scrub sensitive data before sending to Sentry
          if (event.request?.headers) {
            delete event.request.headers["authorization"];
            delete event.request.headers["cookie"];
          }
          return event;
        },
      });

      this.logger.log(`Sentry initialized for environment: ${environment}`);
    } else {
      this.logger.log("Sentry DSN not configured, skipping initialization");
    }
  }
}
