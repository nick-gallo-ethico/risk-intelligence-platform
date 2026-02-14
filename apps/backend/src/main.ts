import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as bodyParser from "body-parser";
import helmet from "helmet";
import pino from "pino";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { SentryExceptionFilter } from "./common/filters/sentry-exception.filter";

async function bootstrap() {
  const nestLogger = new Logger("Bootstrap");

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Enable graceful shutdown - NestJS will call onApplicationShutdown hooks
  // This ensures database connections, WebSockets, and background jobs close cleanly
  app.enableShutdownHooks();
  nestLogger.log("Graceful shutdown hooks enabled");

  // Configure body size limits for security (SEC-05)
  // 10MB limit for JSON and URL-encoded bodies
  // File uploads are handled separately by Multer with their own limits
  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

  // CSRF Protection (SEC-04 - Mitigated by Design)
  // ------------------------------------------------
  // This API uses JWT tokens in Authorization headers (not cookies) for authentication.
  // Browsers do not automatically send Authorization headers on cross-site requests,
  // which inherently mitigates CSRF attacks for most endpoints.
  //
  // The refresh token endpoint (/auth/refresh) uses httpOnly cookies, but:
  // 1. It requires a valid refresh_token cookie with correct signature
  // 2. It only issues new access tokens, not perform state changes
  // 3. The SameSite cookie attribute provides additional protection
  //
  // For SPAs, adding traditional CSRF middleware (csurf) would break the API flow
  // since there's no server-rendered form to embed CSRF tokens.
  //
  // Decision: CSRF is mitigated by architecture rather than additional middleware.

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
  // SentryExceptionFilter reports 5xx errors to Sentry (extends BaseExceptionFilter)
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
        "API documentation for the Ethico Risk Intelligence Platform - a multi-tenant SaaS compliance management system",
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
      .addTag("Auth", "Authentication endpoints")
      .addTag("Cases", "Case management endpoints")
      .addTag("Investigations", "Investigation management endpoints")
      .addTag("Investigation Notes", "Investigation notes endpoints")
      .addTag("Activity", "Activity/audit log endpoints")
      .addTag("Health", "Health check endpoints")
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
