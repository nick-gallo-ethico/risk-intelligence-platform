import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import * as Sentry from "@sentry/node";

/**
 * SentryExceptionFilter - Captures server errors and sends them to Sentry
 *
 * This filter extends BaseExceptionFilter to maintain default error handling behavior
 * while adding Sentry error reporting for 5xx errors.
 *
 * Key behaviors:
 * - Only reports 5xx errors (server errors) to Sentry
 * - 4xx errors (client errors) are not reported (e.g., validation failures, not found)
 * - Captures request context including URL, method, user, and organization
 * - Preserves the default NestJS error response behavior
 *
 * Usage:
 * Register as a global filter in main.ts or AppModule
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    // Determine HTTP status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only report 5xx server errors to Sentry
    // Client errors (4xx) are expected behavior and would create noise
    if (status >= 500) {
      Sentry.withScope((scope) => {
        // Add request context
        scope.setTag("url", request.url);
        scope.setTag("method", request.method);
        scope.setTag("status_code", status.toString());

        // Add user context if available
        if (request.user) {
          scope.setUser({
            id: request.user.id,
            email: request.user.email,
          });
        }

        // Add organization context for multi-tenant debugging
        if (request.organizationId) {
          scope.setTag("organization_id", request.organizationId);
        }

        // Add request details as extra context
        scope.setExtra("body", this.sanitizeBody(request.body));
        scope.setExtra("query", request.query);
        scope.setExtra("params", request.params);

        Sentry.captureException(exception);
      });
    }

    // Always call the base filter to maintain default error response behavior
    super.catch(exception, host);
  }

  /**
   * Sanitize request body to remove sensitive data before sending to Sentry
   */
  private sanitizeBody(
    body: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!body || typeof body !== "object") {
      return undefined;
    }

    const sanitized = { ...body };
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "apiKey",
      "api_key",
      "accessToken",
      "access_token",
      "refreshToken",
      "refresh_token",
      "authorization",
      "ssn",
      "socialSecurityNumber",
      "creditCard",
      "credit_card",
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  }
}
