import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import pino from "pino";
import { AppModule } from "./app.module";

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
