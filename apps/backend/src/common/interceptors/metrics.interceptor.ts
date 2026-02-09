import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MetricsService } from "../../modules/metrics/metrics.service";

/**
 * MetricsInterceptor - HTTP Request Metrics Collection
 *
 * Automatically records HTTP request metrics for all endpoints:
 * - Request count (by method, path, status)
 * - Request duration (histogram with latency percentiles)
 *
 * The interceptor normalizes paths to avoid high-cardinality issues:
 * - /api/v1/cases/123 -> /api/v1/cases/:id
 * - /api/v1/organizations/abc/users/def -> /api/v1/organizations/:id/users/:id
 *
 * Usage:
 * Apply globally in AppModule or per-controller:
 *
 * ```typescript
 * // Global (in main.ts or AppModule)
 * app.useGlobalInterceptors(new MetricsInterceptor(metricsService));
 *
 * // Per-controller
 * @UseInterceptors(MetricsInterceptor)
 * @Controller('cases')
 * export class CasesController {}
 * ```
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only process HTTP requests
    if (context.getType() !== "http") {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const { method } = req;
    const path = this.normalizePath(req.route?.path || req.path);
    const startTime = process.hrtime();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          this.recordMetrics(method, path, res.statusCode, startTime);
        },
        error: (err) => {
          const status = err.status || err.statusCode || 500;
          this.recordMetrics(method, path, status, startTime);
        },
      }),
    );
  }

  /**
   * Record HTTP request metrics.
   */
  private recordMetrics(
    method: string,
    path: string,
    status: number,
    startTime: [number, number],
  ): void {
    const duration = this.calculateDuration(startTime);

    // Increment request counter
    this.metricsService.httpRequestsTotal.inc({
      method,
      path,
      status: status.toString(),
    });

    // Record request duration
    this.metricsService.httpRequestDuration.observe(
      {
        method,
        path,
        status: status.toString(),
      },
      duration,
    );
  }

  /**
   * Calculate request duration in seconds from high-resolution time.
   */
  private calculateDuration(startTime: [number, number]): number {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    return seconds + nanoseconds / 1e9;
  }

  /**
   * Normalize path to reduce cardinality.
   *
   * Replaces dynamic path segments (UUIDs, numbers) with :id placeholder.
   * This prevents metric explosion from unique resource identifiers.
   *
   * Examples:
   * - /api/v1/cases/550e8400-e29b-41d4-a716-446655440000 -> /api/v1/cases/:id
   * - /api/v1/users/12345 -> /api/v1/users/:id
   */
  private normalizePath(path: string): string {
    if (!path) {
      return "/unknown";
    }

    // If it's already a route pattern with :param, use it directly
    if (path.includes(":")) {
      return path;
    }

    // Replace UUIDs with :id
    let normalized = path.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ":id",
    );

    // Replace numeric IDs (standalone numbers in path segments)
    normalized = normalized.replace(/\/\d+(?=\/|$)/g, "/:id");

    // Replace long alphanumeric strings (likely IDs) - 20+ chars
    normalized = normalized.replace(/\/[a-zA-Z0-9]{20,}(?=\/|$)/g, "/:id");

    return normalized;
  }
}
