import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import * as Sentry from "@sentry/node";

/**
 * SentryInterceptor - Adds performance tracing spans for all HTTP requests
 *
 * This interceptor wraps each request in a Sentry span for performance monitoring.
 * It captures timing data and automatically reports errors that occur during request handling.
 *
 * Key features:
 * - Creates a span for each HTTP request with method and URL
 * - Captures errors that occur during request handling
 * - Works with Sentry's distributed tracing for end-to-end visibility
 *
 * Usage:
 * Register as a global interceptor in main.ts or AppModule
 */
@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // Extract route pattern for better grouping in Sentry
    // e.g., "/api/v1/cases/:id" instead of "/api/v1/cases/123"
    const route = request.route?.path || url;
    const spanName = `${method} ${route}`;

    return Sentry.startSpan(
      {
        name: spanName,
        op: "http.server",
        attributes: {
          "http.method": method,
          "http.url": url,
          "http.route": route,
        },
      },
      () =>
        next.handle().pipe(
          tap({
            error: (error) => {
              // Capture the error with the span context
              Sentry.captureException(error);
            },
          }),
        ),
    );
  }
}
