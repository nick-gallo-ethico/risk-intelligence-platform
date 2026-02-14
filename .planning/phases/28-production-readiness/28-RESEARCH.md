# Phase 28: Production Readiness - Research

**Researched:** 2026-02-14
**Domain:** Container deployment, health monitoring, secrets management, application resilience
**Confidence:** HIGH

## Summary

This phase focuses on making the NestJS application production-ready through containerization, deep health checks, secrets management, and graceful shutdown handling. The research covers seven key requirements: multi-stage Dockerfile with Node.js 20 Alpine, deep health checks via @nestjs/terminus, fail-fast storage initialization, Azure Key Vault integration, environment validation, Prisma connection retry with exponential backoff, and graceful shutdown hooks.

The standard approach uses established NestJS ecosystem tools: @nestjs/terminus for health checks (with custom indicators for Prisma, Redis, and Elasticsearch since no built-in Prisma indicator exists), @azure/keyvault-secrets with DefaultAzureCredential for vault integration, Zod or Joi for environment validation, and NestJS lifecycle hooks for graceful shutdown. Docker best practices favor multi-stage builds with Alpine, non-root users, and HEALTHCHECK instructions.

**Primary recommendation:** Use @nestjs/terminus with custom health indicators (Prisma, Redis, Elasticsearch), integrate Azure Key Vault via @azure/keyvault-secrets with environment variable fallback, validate config with Zod schema, implement manual retry logic for Prisma connections, and enable NestJS shutdown hooks with SIGTERM handlers.

## Standard Stack

The established libraries/tools for production readiness:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/terminus | 11.x | Health check framework | Official NestJS health check module, integrates with many technologies |
| @azure/keyvault-secrets | 4.9.x | Secrets management | Official Azure SDK, supports DefaultAzureCredential for managed identities |
| @azure/identity | 4.x | Azure authentication | Provides DefaultAzureCredential for seamless local/production auth |
| zod | 3.x | Schema validation | TypeScript-first validation, better DX than Joi, full type inference |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| joi | 17.x | Schema validation | Alternative to Zod, NestJS docs use this by default |
| dumb-init | 1.2.x | PID 1 process manager | Alpine containers need proper signal forwarding |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | Joi | Joi has native NestJS ConfigModule support; Zod requires custom validate function but gives better TypeScript inference |
| @azure/keyvault-secrets | HashiCorp Vault | Azure Key Vault is simpler for Azure-hosted apps; HashiCorp for multi-cloud |
| Custom Prisma health indicator | TypeOrmHealthIndicator | Would require switching ORMs; Prisma needs custom indicator |

**Installation:**
```bash
npm install @nestjs/terminus @azure/keyvault-secrets @azure/identity zod
```

## Architecture Patterns

### Recommended Project Structure
```
apps/backend/
├── src/
│   ├── config/
│   │   ├── configuration.ts       # Config factory (updated for Key Vault)
│   │   ├── env.validation.ts      # Zod schema for env vars
│   │   └── keyvault.service.ts    # Key Vault client wrapper
│   ├── health/
│   │   ├── health.module.ts       # TerminusModule + custom indicators
│   │   ├── health.controller.ts   # /health endpoint with deep checks
│   │   ├── prisma.health.ts       # Custom Prisma health indicator
│   │   ├── redis.health.ts        # Custom Redis health indicator
│   │   └── elasticsearch.health.ts # Custom ES health indicator
│   └── modules/
│       ├── prisma/
│       │   └── prisma.service.ts  # Connection retry + graceful shutdown
│       └── storage/
│           └── providers/         # Fail-fast initialization
├── Dockerfile                     # Multi-stage production build
└── .dockerignore                  # Exclude unnecessary files
```

### Pattern 1: Multi-Stage Dockerfile
**What:** Three-stage build process (dependencies, build, production)
**When to use:** All containerized NestJS applications
**Example:**
```dockerfile
# Source: Docker best practices for Node.js 2026
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build application
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --production

# Stage 3: Production runtime
FROM node:20-alpine AS production
WORKDIR /app

# Security: Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy only production artifacts
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./

# Security: Run as non-root
USER appuser

ENV NODE_ENV=production
EXPOSE 3000

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### Pattern 2: Deep Health Check with @nestjs/terminus
**What:** Health endpoint that checks all critical dependencies
**When to use:** Any production deployment with load balancers
**Example:**
```typescript
// Source: @nestjs/terminus documentation + custom patterns
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';
import { ElasticsearchHealthIndicator } from './elasticsearch.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private redisHealth: RedisHealthIndicator,
    private esHealth: ElasticsearchHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
      () => this.esHealth.isHealthy('elasticsearch'),
    ]);
  }
}
```

### Pattern 3: Custom Prisma Health Indicator
**What:** Health indicator that verifies database connectivity via Prisma
**When to use:** All NestJS apps using Prisma (no built-in indicator exists)
**Example:**
```typescript
// Source: NestJS Terminus custom indicator pattern
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
```

### Pattern 4: Azure Key Vault Integration with Fallback
**What:** Load secrets from Key Vault in production, env vars in development
**When to use:** Production deployments on Azure
**Example:**
```typescript
// Source: Microsoft Learn Azure Key Vault quickstart
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export class KeyVaultService {
  private client: SecretClient | null = null;

  constructor() {
    const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
    if (vaultUrl && process.env.NODE_ENV === 'production') {
      // DefaultAzureCredential works with managed identities in Azure
      // and falls back to Azure CLI credentials locally
      const credential = new DefaultAzureCredential();
      this.client = new SecretClient(vaultUrl, credential);
    }
  }

  async getSecret(name: string, fallback?: string): Promise<string> {
    if (this.client) {
      try {
        const secret = await this.client.getSecret(name);
        return secret.value || fallback || '';
      } catch (error) {
        console.warn(`Failed to get secret ${name} from Key Vault, using fallback`);
        return fallback || '';
      }
    }
    // Development: use environment variable
    return process.env[name] || fallback || '';
  }
}
```

### Pattern 5: Environment Validation with Zod
**What:** Validate all required environment variables at startup
**When to use:** All NestJS applications
**Example:**
```typescript
// Source: NestJS ConfigModule + Zod integration
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ELASTICSEARCH_NODE: z.string().url(),
  // Optional Azure Key Vault (only required in production)
  AZURE_KEY_VAULT_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const missing = result.error.errors
      .map(e => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${missing}`);
  }
  return result.data;
}
```

### Pattern 6: Prisma Connection Retry with Exponential Backoff
**What:** Retry database connection on startup with increasing delays
**When to use:** Container orchestration where DB may not be ready at app start
**Example:**
```typescript
// Source: Prisma connection management + retry patterns
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      this.logger.log(`Attempting database connection (attempt ${attempt}/${this.maxRetries})`);
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      if (attempt >= this.maxRetries) {
        this.logger.error(`Failed to connect to database after ${this.maxRetries} attempts`);
        throw error;
      }
      const delay = this.baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      this.logger.warn(`Database connection failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.connectWithRetry(attempt + 1);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Pattern 7: Graceful Shutdown
**What:** Handle SIGTERM to drain requests and close connections cleanly
**When to use:** All production deployments
**Example:**
```typescript
// Source: NestJS lifecycle events documentation
// In main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable shutdown hooks for graceful termination
  app.enableShutdownHooks();

  await app.listen(3000);
}

// In services that need cleanup
@Injectable()
export class RedisService implements OnApplicationShutdown {
  async onApplicationShutdown(signal?: string) {
    console.log(`Received ${signal}, closing Redis connections...`);
    await this.redis.quit();
  }
}
```

### Anti-Patterns to Avoid
- **Static health checks:** Returning `{ status: 'ok' }` without checking dependencies routes traffic to broken instances
- **Silent initialization failures:** Catching errors and continuing in broken state makes debugging impossible
- **No retry on DB connection:** Container orchestrators may start app before DB is ready
- **Missing shutdown hooks:** In-flight requests are dropped, DB connections leak
- **Hardcoded secrets:** Never commit secrets; use env vars or vault
- **Root user in container:** Security risk; always use non-root user

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Health check framework | Custom status endpoint | @nestjs/terminus | Handles response format, error aggregation, HTTP status codes correctly |
| Azure authentication | Manual token management | DefaultAzureCredential | Handles managed identity, service principal, CLI credentials automatically |
| Environment validation | Manual checks | Zod/Joi with ConfigModule | Type-safe, comprehensive error messages, works with NestJS DI |
| Signal handling in containers | Raw process.on('SIGTERM') | dumb-init + NestJS hooks | dumb-init handles PID 1 correctly, forwards signals to child processes |
| Docker image optimization | Manual layer management | Multi-stage builds | Automatic separation of build and runtime dependencies |

**Key insight:** Production readiness has many edge cases (signal handling, health check response codes, retry jitter, container PID 1 issues) that established tools handle correctly. Custom solutions often miss edge cases that only appear under load or during failures.

## Common Pitfalls

### Pitfall 1: No Prisma Health Indicator in Terminus
**What goes wrong:** Developers expect @nestjs/terminus to have a built-in Prisma indicator like it does for TypeORM
**Why it happens:** Prisma is newer, official support pending (GitHub issue #1510)
**How to avoid:** Create custom PrismaHealthIndicator extending HealthIndicator class
**Warning signs:** Health endpoint returns 200 even when database is down

### Pitfall 2: Azure Key Vault Fails Silently in Dev
**What goes wrong:** App crashes in dev when Key Vault URL is not configured
**Why it happens:** Code assumes Key Vault is always available
**How to avoid:** Check NODE_ENV and AZURE_KEY_VAULT_URL before creating SecretClient; fall back to env vars
**Warning signs:** `SecretClient is not initialized` errors in development

### Pitfall 3: Container Doesn't Receive SIGTERM
**What goes wrong:** `docker stop` takes 10 seconds (timeout) because SIGTERM isn't handled
**Why it happens:** Node.js runs as PID 1 in container, which has special signal handling rules
**How to avoid:** Use dumb-init or tini as entrypoint; enable NestJS shutdown hooks
**Warning signs:** `docker stop` never completes quickly, connections not closed

### Pitfall 4: HEALTHCHECK Uses curl but curl Not Installed
**What goes wrong:** Container health check fails because Alpine doesn't include curl
**Why it happens:** Alpine is minimal; curl/wget must be explicitly installed
**How to avoid:** Use Node.js fetch (built-in since Node 18+) or install wget in Dockerfile
**Warning signs:** Container stuck in "unhealthy" state

### Pitfall 5: Storage Provider Silent Failure
**What goes wrong:** App starts but file uploads fail with cryptic errors
**Why it happens:** Current code catches initialization errors and continues with isInitialized=false
**How to avoid:** Throw from onModuleInit if credentials missing or directory creation fails
**Warning signs:** App starts without errors but storage operations all fail

### Pitfall 6: Missing Environment Variables Give Cryptic Errors
**What goes wrong:** App crashes deep in a service with unclear error message
**Why it happens:** No upfront validation of required environment variables
**How to avoid:** Validate all env vars in ConfigModule.forRoot() validate function
**Warning signs:** Runtime errors like "Cannot read property 'url' of undefined"

### Pitfall 7: Prisma Connection Failure on Cold Start
**What goes wrong:** App fails to start in Kubernetes because database isn't ready yet
**Why it happens:** Prisma $connect() fails immediately with no retry
**How to avoid:** Implement retry with exponential backoff (3 attempts: 1s, 2s, 4s)
**Warning signs:** Pod restarts repeatedly during deployment

## Code Examples

### Complete Health Module Setup
```typescript
// Source: @nestjs/terminus + custom indicators pattern
// health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';
import { ElasticsearchHealthIndicator } from './elasticsearch.health';
import { PrismaModule } from '../modules/prisma/prisma.module';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    RedisHealthIndicator,
    ElasticsearchHealthIndicator,
  ],
})
export class HealthModule {}
```

### Redis Health Indicator
```typescript
// redis.health.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@InjectRedis() private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const result = await this.redis.ping();
      const isHealthy = result === 'PONG';
      return this.getStatus(key, isHealthy);
    } catch (error) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
```

### Elasticsearch Health Indicator
```typescript
// elasticsearch.health.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class ElasticsearchHealthIndicator extends HealthIndicator {
  constructor(private readonly esService: ElasticsearchService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const health = await this.esService.cluster.health();
      // Consider yellow (replicas not assigned) as healthy for single-node
      const isHealthy = ['green', 'yellow'].includes(health.status);
      return this.getStatus(key, isHealthy, {
        status: health.status,
        numberOfNodes: health.number_of_nodes,
      });
    } catch (error) {
      throw new HealthCheckError(
        'Elasticsearch check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
```

### ConfigModule with Zod Validation
```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### Fail-Fast Storage Provider
```typescript
// azure-blob.provider.ts (updated)
async onModuleInit(): Promise<void> {
  const accountName = this.configService.get<string>('storage.azure.accountName');
  const accountKey = this.configService.get<string>('storage.azure.accountKey');

  if (!accountName || !accountKey) {
    throw new Error(
      'Azure Storage credentials not configured. ' +
      'Set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY environment variables.'
    );
  }

  try {
    this.sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    this.blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      this.sharedKeyCredential,
    );
    // Verify connectivity
    await this.blobServiceClient.getProperties();
    this.logger.log(`Azure Blob Storage provider initialized (account: ${accountName})`);
  } catch (error) {
    throw new Error(`Failed to initialize Azure Blob Storage: ${error.message}`);
  }
}
```

### Main.ts with Graceful Shutdown
```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // ... other configuration

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application running on port ${port}`);
  logger.log(`Health check: http://localhost:${port}/health`);
}

bootstrap();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| curl in HEALTHCHECK | Node.js fetch | Node 18+ (2022) | No need to install curl in Alpine images |
| joi for env validation | Zod with full TypeScript inference | 2023+ | Better DX, type safety without separate types |
| Manual secrets in env vars | Azure Key Vault + DefaultAzureCredential | 2020+ | Managed identity support, automatic rotation |
| Single-stage Dockerfile | Multi-stage builds | 2017+ | 5-10x smaller images, no build tools in production |
| process.on('SIGTERM') | dumb-init + NestJS enableShutdownHooks | 2020+ | Proper PID 1 handling, graceful drain |

**Deprecated/outdated:**
- **@azure/keyvault-secrets < 4.x:** Use 4.9+ for modern API and DefaultAzureCredential support
- **node:18 base images:** Use node:20-alpine (LTS, smaller)
- **npm install in Dockerfile:** Use npm ci for deterministic builds

## Open Questions

Things that couldn't be fully resolved:

1. **Exact @nestjs/terminus version compatibility with NestJS 10.3**
   - What we know: Terminus 11.x is latest, should work with NestJS 10.x
   - What's unclear: Exact peer dependency requirements
   - Recommendation: Install and verify, check for peer dependency warnings

2. **Azure Key Vault secret naming conventions**
   - What we know: Key Vault secret names can only contain alphanumeric and hyphens
   - What's unclear: Whether to use DATABASE_URL or database-url naming
   - Recommendation: Use kebab-case in Key Vault, map to env var names in code

3. **Health check endpoint path**
   - What we know: /health is common, but Kubernetes uses /healthz and /readyz
   - What's unclear: Whether to implement separate liveness and readiness probes
   - Recommendation: Start with /health, add /health/liveness and /health/readiness if Kubernetes requires separation

## Sources

### Primary (HIGH confidence)
- [Microsoft Learn: Azure Key Vault Node.js Quickstart](https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-node) - SecretClient, DefaultAzureCredential usage
- [NestJS Terminus GitHub](https://github.com/nestjs/terminus) - Version 11.0.0, custom indicator patterns
- [OneUptime: NestJS Docker Containerization 2026](https://oneuptime.com/blog/post/2026-02-08-how-to-containerize-a-nestjs-application-with-docker/view) - Multi-stage Dockerfile, HEALTHCHECK, non-root user
- [Wanago.io: NestJS Health Checks with Terminus](https://wanago.io/2021/10/11/api-nestjs-health-checks-terminus-datadog/) - TerminusModule setup, custom indicators
- [Prisma Connection Management Docs](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-management) - Connection pool, $connect/$disconnect

### Secondary (MEDIUM confidence)
- [NestJS GitHub Issue #1510](https://github.com/nestjs/terminus/issues/1510) - Prisma health indicator not built-in, custom implementation required
- [Tom Ray: NestJS Docker Production](https://www.tomray.dev/nestjs-docker-production) - Multi-stage patterns, npm ci
- [GitHub: nestjs-graceful-shutdown](https://github.com/hienngm/nestjs-graceful-shutdown) - Alternative graceful shutdown library
- [Prisma GitHub Discussions](https://github.com/prisma/prisma/discussions/19978) - Connection retry patterns

### Tertiary (LOW confidence)
- Web search results for specific patterns - verified against official docs where possible

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official NestJS and Azure packages, well-documented
- Architecture: HIGH - Patterns from official documentation and verified examples
- Pitfalls: MEDIUM - Based on GitHub issues and community reports, some patterns from experience

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days - stack is stable)
