# Phase 26: Emergency Fixes - Research

**Researched:** 2026-02-14
**Domain:** Security hardening, NestJS exception handling, Prisma connection management
**Confidence:** HIGH

## Summary

This phase addresses three critical security and reliability issues identified in the Unified Audit Report (EMER-01, EMER-02, EMER-03). Research focused on understanding the current state of the affected source files and the correct patterns for remediation.

**Key findings:**

1. **RLS bypass vulnerability (EMER-01):** The `withBypassRLS()` method uses a simple `finally` block that cannot handle `disableBypassRLS()` failures. Prisma's `$disconnect()` method will destroy all pooled connections, which is the correct response to a tainted connection state.
2. **Exposed API key (EMER-02):** A live Anthropic API key (`sk-ant-api03-*`) exists in `.env`. The file is properly gitignored, but the key must be rotated immediately as a precaution.
3. **Unregistered global filters (EMER-03):** The `HttpExceptionFilter` and `SentryExceptionFilter` exist but are NOT registered via `useGlobalFilters()` in `main.ts`. The `HttpExceptionFilter` also silently drops non-Error exceptions in its else branch (lines 70-74).

**Primary recommendation:** All three fixes are straightforward code changes with well-established patterns. No external library additions required.

## Standard Stack

No new dependencies are required for this phase.

### Core (Already Installed)

| Library          | Version | Purpose                 | Why Standard       |
| ---------------- | ------- | ----------------------- | ------------------ |
| `@nestjs/core`   | ^10.x   | NestJS framework        | Already in project |
| `@nestjs/common` | ^10.x   | NestJS common utilities | Already in project |
| `@prisma/client` | ^5.x    | Database client         | Already in project |

### Alternatives Considered

N/A - This phase uses existing infrastructure only.

## Architecture Patterns

### Pattern 1: Global Exception Filter Registration

**What:** Register exception filters globally in `main.ts` using `app.useGlobalFilters()`

**When to use:** When you want filters to apply to every route in the application

**Current state (BROKEN):**

```typescript
// main.ts - NO filter registration exists
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // ... no useGlobalFilters() call
  await app.listen(port);
}
```

**Fixed state:**

```typescript
// main.ts - filters registered globally
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { SentryExceptionFilter } from "./common/filters/sentry-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Register global exception filters
  // Order matters: HttpExceptionFilter handles response formatting,
  // SentryExceptionFilter extends BaseExceptionFilter and reports to Sentry
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new SentryExceptionFilter(app.getHttpAdapter()),
  );

  await app.listen(port);
}
```

**Important note on SentryExceptionFilter:** It extends `BaseExceptionFilter` which requires the `HttpAdapter` to be passed to its constructor. Use `app.getHttpAdapter()` to get this.

### Pattern 2: Connection Pool Destruction on Tainted State

**What:** When a database connection enters a potentially compromised state (e.g., RLS bypass stuck on), destroy the entire connection pool rather than returning the tainted connection to the pool.

**When to use:** Any security-critical session state that could leak across requests if not properly reset.

**Current state (VULNERABLE):**

```typescript
// prisma.service.ts:53-60
async withBypassRLS<T>(callback: () => Promise<T>): Promise<T> {
  await this.enableBypassRLS();
  try {
    return await callback();
  } finally {
    await this.disableBypassRLS(); // If this fails, connection stays in bypass mode!
  }
}
```

**Fixed state:**

```typescript
async withBypassRLS<T>(callback: () => Promise<T>): Promise<T> {
  await this.enableBypassRLS();
  try {
    return await callback();
  } finally {
    try {
      await this.disableBypassRLS();
    } catch (error) {
      // CRITICAL: If disableBypassRLS fails, the connection has bypass_rls=true
      // stuck. We MUST destroy all pooled connections to prevent data leakage.
      this.logger.error(
        'SECURITY: Failed to disable RLS bypass. Destroying connection pool to prevent data leakage.',
        error instanceof Error ? error.stack : String(error)
      );
      await this.$disconnect();
      throw error; // Re-throw so caller knows the operation had a critical failure
    }
  }
}
```

**Why $disconnect() works:** According to Prisma documentation, `$disconnect()` "terminates the Query Engine child process and closes all active database connections." This effectively destroys the entire pool, eliminating the tainted connection.

### Pattern 3: Logging Non-Error Exceptions

**What:** The catch-all filter receives `unknown` type exceptions. Non-Error objects must be logged, not silently dropped.

**Current state (SILENT FAILURE):**

```typescript
// http-exception.filter.ts:70-74
} else {
  status = HttpStatus.INTERNAL_SERVER_ERROR;
  message = "Internal server error";
  error = "Internal Server Error";
  // NO LOGGING - exception is completely lost!
}
```

**Fixed state:**

```typescript
} else {
  status = HttpStatus.INTERNAL_SERVER_ERROR;
  message = "Internal server error";
  error = "Internal Server Error";

  // Log non-Error exceptions (strings, numbers, objects, etc.)
  this.logger.error(
    `Unhandled non-Error exception: ${typeof exception}`,
    typeof exception === 'object' ? JSON.stringify(exception) : String(exception)
  );
}
```

### Anti-Patterns to Avoid

- **Swallowing errors in finally blocks:** Always wrap `finally` block operations that can fail in their own try-catch
- **Returning tainted connections to pool:** When security-critical state cannot be reset, destroy the connection
- **Silent exception dropping:** All exceptions, even non-Error types, must be logged
- **Registering filters via APP_FILTER when dependencies aren't needed:** Use `useGlobalFilters()` in `main.ts` for simpler filters; use `APP_FILTER` provider only when you need dependency injection

## Don't Hand-Roll

| Problem                     | Don't Build                   | Use Instead              | Why                              |
| --------------------------- | ----------------------------- | ------------------------ | -------------------------------- |
| Global filter registration  | Custom module providers       | `app.useGlobalFilters()` | Standard NestJS pattern, simpler |
| Connection pool destruction | Manual connection tracking    | `prisma.$disconnect()`   | Prisma handles pool lifecycle    |
| Exception logging           | Custom logging infrastructure | `@nestjs/common Logger`  | Already used throughout codebase |

## Common Pitfalls

### Pitfall 1: SentryExceptionFilter Constructor Requirements

**What goes wrong:** `SentryExceptionFilter` extends `BaseExceptionFilter`, which requires the `HttpAdapter` in its constructor. Instantiating without it causes runtime errors.

**Why it happens:** Not reading the filter's base class requirements.

**How to avoid:** Pass `app.getHttpAdapter()` when instantiating:

```typescript
new SentryExceptionFilter(app.getHttpAdapter());
```

**Warning signs:** Runtime error: "Cannot read property 'reply' of undefined" or similar

### Pitfall 2: Filter Ordering

**What goes wrong:** If filters are registered in wrong order, the more specific filter may not run.

**Why it happens:** NestJS processes filters in registration order for catch-all filters.

**How to avoid:** Since both filters use `@Catch()` (catch-all), the order is:

1. `HttpExceptionFilter` - handles response formatting
2. `SentryExceptionFilter` - reports to Sentry then delegates to base filter

**Note:** In this project, `HttpExceptionFilter` is standalone and `SentryExceptionFilter` calls `super.catch()` to produce the response. They can coexist, but only one should produce the final HTTP response.

### Pitfall 3: Not Re-throwing After $disconnect()

**What goes wrong:** If you catch the `disableBypassRLS()` error, call `$disconnect()`, but don't re-throw, the caller thinks the operation succeeded.

**Why it happens:** Defensive programming instinct to not let errors propagate.

**How to avoid:** Re-throw after destroying the pool:

```typescript
await this.$disconnect();
throw error; // Caller must know the operation failed critically
```

### Pitfall 4: Assuming $disconnect() is Synchronous

**What goes wrong:** Using `this.$disconnect()` without `await` in a finally block.

**Why it happens:** Forgetting that all Prisma operations are async.

**How to avoid:** Always `await this.$disconnect()`.

## Code Examples

### Complete Fixed withBypassRLS() Method

```typescript
// Source: apps/backend/src/modules/prisma/prisma.service.ts

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async setTenantContext(organizationId: string): Promise<void> {
    await this
      .$executeRaw`SELECT set_config('app.current_organization', ${organizationId}, true)`;
  }

  async clearTenantContext(): Promise<void> {
    await this.$executeRaw`RESET app.current_organization`;
  }

  async enableBypassRLS(): Promise<void> {
    await this.$executeRaw`SELECT set_config('app.bypass_rls', 'true', true)`;
  }

  async disableBypassRLS(): Promise<void> {
    await this.$executeRaw`SELECT set_config('app.bypass_rls', 'false', true)`;
  }

  /**
   * Executes a callback with RLS bypassed, then re-enables RLS.
   * If disabling RLS bypass fails, destroys the connection pool to prevent
   * tainted connections from being returned to the pool.
   */
  async withBypassRLS<T>(callback: () => Promise<T>): Promise<T> {
    await this.enableBypassRLS();
    try {
      return await callback();
    } finally {
      try {
        await this.disableBypassRLS();
      } catch (error) {
        // CRITICAL: If disableBypassRLS fails, the connection has bypass_rls=true
        // stuck. We MUST destroy all pooled connections to prevent data leakage.
        this.logger.error(
          "SECURITY: Failed to disable RLS bypass. Destroying connection pool to prevent data leakage.",
          error instanceof Error ? error.stack : String(error),
        );
        await this.$disconnect();
        throw error;
      }
    }
  }
}
```

### Complete Fixed HttpExceptionFilter

```typescript
// Source: apps/backend/src/common/filters/http-exception.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error: string;
  requestId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message =
          (responseObj.message as string | string[]) || exception.message;
        error = (responseObj.error as string) || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Internal server error";
      error = "Internal Server Error";

      // Log the full error for debugging (but don't expose to client)
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Internal server error";
      error = "Internal Server Error";

      // Log non-Error exceptions (strings, numbers, objects, etc.)
      this.logger.error(
        `Unhandled non-Error exception: ${typeof exception}`,
        typeof exception === "object"
          ? JSON.stringify(exception)
          : String(exception),
      );
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    };

    // Add request ID if available (for log correlation)
    const requestId = request.headers["x-request-id"] as string;
    if (requestId) {
      errorResponse.requestId = requestId;
    }

    response.status(status).json(errorResponse);
  }
}
```

### Complete Fixed main.ts Bootstrap

```typescript
// Source: apps/backend/src/main.ts

import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import pino from "pino";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { SentryExceptionFilter } from "./common/filters/sentry-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 3000);
  const corsOrigin = configService.get<string>(
    "CORS_ORIGIN",
    "http://localhost:5173",
  );
  const nodeEnv = configService.get<string>("NODE_ENV", "development");

  // Configure logger
  const logger = pino({
    level: configService.get<string>("LOG_LEVEL", "debug"),
    transport:
      nodeEnv === "development"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  });

  // Security headers (HSTS, CSP, X-Frame-Options, etc.)
  app.use(helmet());

  // Global exception filters
  // HttpExceptionFilter handles response formatting for all exceptions
  // SentryExceptionFilter reports 5xx errors to Sentry
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new SentryExceptionFilter(app.getHttpAdapter()),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  // Global prefix for all routes
  app.setGlobalPrefix("api/v1", {
    exclude: ["health"],
  });

  // Swagger/OpenAPI documentation (disabled in production)
  if (nodeEnv !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Risk Intelligence Platform API")
      .setDescription(
        "API documentation for the Ethico Risk Intelligence Platform",
      )
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT access token",
        },
        "JWT",
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port);

  logger.info(`Application is running on: http://localhost:${port}`);
  logger.info(`Health check available at: http://localhost:${port}/health`);
  if (nodeEnv !== "production") {
    logger.info(
      `API documentation available at: http://localhost:${port}/api/docs`,
    );
  }
  logger.info(`Environment: ${nodeEnv}`);
}

bootstrap();
```

## State of the Art

| Old Approach                    | Current Approach                           | When Changed           | Impact                                 |
| ------------------------------- | ------------------------------------------ | ---------------------- | -------------------------------------- |
| Filters via APP_FILTER provider | `useGlobalFilters()` for simple filters    | NestJS best practice   | Simpler registration when no DI needed |
| Silent finally block failures   | Try-catch in finally with pool destruction | Security best practice | Prevents tainted connection reuse      |

**Note:** Both APP_FILTER provider and useGlobalFilters() are valid. Use APP_FILTER when you need dependency injection in the filter; use useGlobalFilters() when you don't.

## Open Questions

None. All three fixes have clear, well-documented patterns.

## Sources

### Primary (HIGH confidence)

- **Current codebase analysis:**
  - `apps/backend/src/modules/prisma/prisma.service.ts` - Verified current implementation
  - `apps/backend/src/main.ts` - Confirmed no useGlobalFilters() call
  - `apps/backend/src/common/filters/http-exception.filter.ts` - Verified non-Error else branch
  - `apps/backend/src/common/filters/sentry-exception.filter.ts` - Verified BaseExceptionFilter usage
  - `apps/backend/.env` - Confirmed exposed API key presence
  - `.gitignore` - Confirmed .env is gitignored

- **Official Documentation:**
  - [Prisma Connection Management](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-management) - Verified $disconnect() destroys all connections
  - [NestJS Exception Filters](https://docs.nestjs.com/exception-filters) - Referenced for filter registration patterns

### Secondary (MEDIUM confidence)

- [NestJS Error Handling Patterns - Better Stack](https://betterstack.com/community/guides/scaling-nodejs/error-handling-nestjs/)
- [Custom Exception Filters in NestJS - OneUptime](https://oneuptime.com/blog/post/2026-01-25-custom-exception-filters-nestjs/view)

## Metadata

**Confidence breakdown:**

- RLS bypass fix: HIGH - Verified Prisma $disconnect() behavior via official docs
- API key rotation: HIGH - Manual operation, no code research needed
- Filter registration: HIGH - Verified missing call in main.ts, confirmed pattern via NestJS docs
- Non-Error logging: HIGH - Verified missing logging in current code

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (stable NestJS/Prisma patterns, unlikely to change)
