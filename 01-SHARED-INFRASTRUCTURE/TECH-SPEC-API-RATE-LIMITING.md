# Technical Specification: API Rate Limiting

**Version:** 1.0
**Last Updated:** February 2026
**Status:** Draft
**Author:** Architecture Team

**Applies To:** All API endpoints across the platform

**Key Consumers:**
- External API integrations (customer IT teams)
- Internal frontend applications
- Webhook delivery system
- AI features and bulk operations
- Third-party marketplace apps

**Related Documents:**
- `00-PLATFORM/WORKING-DECISIONS.md` - Section 16.O (API Rate Limiting & Quotas)
- `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md` - AI-specific rate limiting
- `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md` - Tenant context

---

## Table of Contents

1. [Overview](#1-overview)
2. [Rate Limit Tiers](#2-rate-limit-tiers)
3. [Limit Types](#3-limit-types)
4. [Response Headers](#4-response-headers)
5. [Rate Limit Response](#5-rate-limit-response)
6. [Data Model](#6-data-model)
7. [Implementation](#7-implementation)
8. [Billing Integration](#8-billing-integration)
9. [Admin Controls](#9-admin-controls)
10. [Webhook Rate Limits](#10-webhook-rate-limits)
11. [AI Feature Limits](#11-ai-feature-limits)
12. [Bulk Operation Limits](#12-bulk-operation-limits)
13. [Graceful Degradation](#13-graceful-degradation)
14. [Monitoring & Alerting](#14-monitoring--alerting)
15. [API Specifications](#15-api-specifications)
16. [Implementation Guide](#16-implementation-guide)

---

## 1. Overview

### 1.1 Purpose

This specification defines the rate limiting strategy for the Ethico Risk Intelligence Platform API. Rate limiting serves three critical functions:

1. **Platform Protection**: Prevent abuse and ensure system stability
2. **Fair Usage**: Ensure all customers receive equitable access to resources
3. **Billing Enablement**: Track usage for consumption-based pricing models

### 1.2 Scope

- All REST API endpoints (`/api/v1/*`)
- AI features (policy generation, summarization, translation)
- Bulk operations (mass updates, batch imports, exports)
- Webhook delivery (outbound rate limits)
- File operations (uploads, downloads)
- Report generation (complex aggregations)

### 1.3 Design Principles

1. **Tiered by Plan**: Different subscription tiers receive different limits
2. **Weighted by Cost**: Expensive operations count more than simple reads
3. **Transparent**: Full visibility into usage via headers and dashboards
4. **Graceful**: Priority-based throttling preserves critical operations
5. **Configurable**: Enterprise customers can negotiate custom limits
6. **Multi-tenant Safe**: Limits enforced per-organization, never cross-tenant

### 1.4 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Counter Store | Redis 7 | Distributed rate limit counters |
| Algorithm | Sliding Window Log | Accurate rate limiting |
| Persistence | PostgreSQL | Usage history, audit |
| Queue | BullMQ | Async usage aggregation |
| Cache | Redis | Configuration caching |

---

## 2. Rate Limit Tiers

### 2.1 Standard API Rate Limits

Rate limits are tiered by subscription plan, as defined in WORKING-DECISIONS.md Section 16.O.

| Tier | Requests/min | Requests/hour | Daily Quota | Burst Allowance |
|------|--------------|---------------|-------------|-----------------|
| **Starter** | 100 | 2,000 | 10,000 | 20 |
| **Professional** | 500 | 15,000 | 100,000 | 100 |
| **Enterprise** | 2,000 | 60,000 | 1,000,000 | 500 |
| **Unlimited** | Custom | Custom | Custom | Custom |

### 2.2 AI Feature Limits

AI operations have separate limits due to higher computational cost (per WORKING-DECISIONS.md AA.18).

| Tier | AI Requests/month | Token Budget/month | Premium Model Access |
|------|-------------------|--------------------|-----------------------|
| **Starter** | 10,000 | 5M tokens | Platform skills only |
| **Professional** | 100,000 | 50M tokens | Full skills + create |
| **Enterprise** | Custom/Unlimited | Custom | Priority models |

### 2.3 Bulk Operation Limits

| Tier | Concurrent Bulk Jobs | Max Batch Size | Export Size Limit |
|------|----------------------|----------------|--------------------|
| **Starter** | 1 | 100 records | 10,000 records |
| **Professional** | 3 | 1,000 records | 100,000 records |
| **Enterprise** | 10 | 10,000 records | 1,000,000 records |

### 2.4 File Operation Limits

| Tier | Upload Size Limit | Download Bandwidth/hour | Concurrent Downloads |
|------|-------------------|------------------------|----------------------|
| **Starter** | 25 MB | 500 MB | 5 |
| **Professional** | 100 MB | 2 GB | 20 |
| **Enterprise** | 500 MB | 10 GB | 100 |

---

## 3. Limit Types

### 3.1 Per-Organization Limits

The primary rate limit scope. All users within an organization share the organization's pool.

```typescript
// Key format
org:{organizationId}:api:requests:{window}

// Examples
org:550e8400-e29b-41d4-a716-446655440000:api:requests:minute
org:550e8400-e29b-41d4-a716-446655440000:api:requests:hour
org:550e8400-e29b-41d4-a716-446655440000:api:requests:day
```

### 3.2 Per-User Limits

Optional secondary limits to prevent single users from exhausting org quota.

```typescript
// Key format
org:{organizationId}:user:{userId}:api:requests:{window}

// User limits are typically 10-20% of org limit
// Configurable per organization
```

### 3.3 Per-Endpoint Limits

Specific endpoints with expensive operations have additional limits.

| Endpoint Pattern | Additional Limit | Reason |
|------------------|------------------|--------|
| `POST /api/v1/exports/*` | 10/hour | Resource-intensive |
| `POST /api/v1/bulk/*` | 20/hour | Database load |
| `POST /api/v1/reports/execute` | 30/hour | Complex aggregations |
| `POST /api/v1/ai/*` | See AI limits | LLM costs |
| `GET /api/v1/search/*` | 100/minute | Elasticsearch load |

### 3.4 Per-Feature Limits

Feature-based limits for specialized operations.

```typescript
interface FeatureLimits {
  // AI features
  aiChatTurns: { perMinute: 20, perHour: 200 };
  aiSkillExecutions: { perHour: 100 };
  aiDocumentSummary: { perHour: 50 };

  // Bulk operations
  bulkCaseUpdates: { perHour: 20 };
  bulkAssignments: { perHour: 50 };

  // Reports
  reportGeneration: { perHour: 30 };
  scheduledReports: { perDay: 100 };

  // Integrations
  webhookDelivery: { perMinute: 100 };
  apiKeyRequests: { perMinute: 1000 };
}
```

### 3.5 Weighted Request Costs

Not all requests are equal. Weighted costs reflect actual resource usage.

| Category | Cost Multiplier | Examples |
|----------|-----------------|----------|
| Simple reads | 1x | GET single entity, list queries |
| Standard writes | 2x | POST, PUT (triggers events, audit) |
| Search queries | 3x | Full-text search, filtered lists |
| Bulk operations | 10x | Batch updates, mass assignments |
| Report execution | 20x | Complex aggregations, dashboards |
| AI operations | 50x | Policy generation, summarization |
| File uploads | Size-based | 1 cost per 1MB |

```typescript
// Example: Professional tier with 500 requests/minute
// Equivalent to:
// - 500 simple reads, OR
// - 250 standard writes, OR
// - 166 search queries, OR
// - 50 bulk operations, OR
// - 25 report executions, OR
// - 10 AI operations
```

---

## 4. Response Headers

### 4.1 Standard Rate Limit Headers

All API responses include rate limit information.

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1706889600
X-RateLimit-Scope: organization
X-RateLimit-Policy: professional
```

### 4.2 Header Definitions

| Header | Type | Description |
|--------|------|-------------|
| `X-RateLimit-Limit` | integer | Maximum requests allowed in current window |
| `X-RateLimit-Remaining` | integer | Requests remaining in current window |
| `X-RateLimit-Reset` | unix timestamp | When the current window resets |
| `X-RateLimit-Scope` | string | Scope of limit: `organization`, `user`, `endpoint` |
| `X-RateLimit-Policy` | string | Rate limit policy/tier applied |
| `X-RateLimit-Cost` | integer | Cost of this request (for weighted limits) |

### 4.3 Daily Quota Headers

```http
X-Quota-Limit-Day: 100000
X-Quota-Remaining-Day: 87234
X-Quota-Reset-Day: 2026-02-03T00:00:00Z
```

### 4.4 Rate Limited Response Headers

When rate limited, include `Retry-After` header.

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706889645
X-RateLimit-Scope: organization
Retry-After: 45
Content-Type: application/json
```

---

## 5. Rate Limit Response

### 5.1 Standard Error Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 45 seconds.",
    "details": {
      "limitType": "requests_per_minute",
      "limit": 500,
      "remaining": 0,
      "resetAt": "2026-02-02T15:00:45Z",
      "retryAfter": 45,
      "scope": "organization",
      "tier": "professional"
    }
  },
  "requestId": "req_abc123xyz",
  "timestamp": "2026-02-02T14:59:55Z"
}
```

### 5.2 Daily Quota Exceeded Response

```json
{
  "error": {
    "code": "DAILY_QUOTA_EXCEEDED",
    "message": "Daily API quota exceeded. Quota resets at midnight UTC.",
    "details": {
      "limitType": "daily_quota",
      "limit": 100000,
      "used": 100000,
      "remaining": 0,
      "resetAt": "2026-02-03T00:00:00Z",
      "retryAfter": 32400,
      "scope": "organization",
      "tier": "professional",
      "upgradeUrl": "https://app.ethico.com/settings/billing/upgrade"
    }
  },
  "requestId": "req_def456uvw",
  "timestamp": "2026-02-02T15:00:00Z"
}
```

### 5.3 AI Feature Limit Response

```json
{
  "error": {
    "code": "AI_LIMIT_EXCEEDED",
    "message": "Monthly AI request limit reached. Contact your administrator for additional capacity.",
    "details": {
      "limitType": "ai_requests_monthly",
      "limit": 100000,
      "used": 100000,
      "remaining": 0,
      "resetAt": "2026-03-01T00:00:00Z",
      "scope": "organization",
      "tier": "professional",
      "canPurchaseMore": true,
      "overageRate": "$0.01 per request"
    }
  },
  "requestId": "req_ghi789rst",
  "timestamp": "2026-02-02T15:00:00Z"
}
```

### 5.4 Endpoint-Specific Limit Response

```json
{
  "error": {
    "code": "ENDPOINT_LIMIT_EXCEEDED",
    "message": "Export rate limit exceeded. Maximum 10 exports per hour.",
    "details": {
      "limitType": "endpoint_specific",
      "endpoint": "/api/v1/exports/cases",
      "limit": 10,
      "remaining": 0,
      "resetAt": "2026-02-02T16:00:00Z",
      "retryAfter": 3420,
      "scope": "endpoint"
    }
  },
  "requestId": "req_jkl012mno",
  "timestamp": "2026-02-02T15:03:00Z"
}
```

---

## 6. Data Model

### 6.1 Rate Limit Configuration

```prisma
// prisma/schema.prisma

model RateLimitConfig {
  id                String   @id @default(uuid())
  organizationId    String   @unique
  organization      Organization @relation(fields: [organizationId], references: [id])

  // Tier (determines base limits)
  tier              RateLimitTier  @default(STARTER)

  // Custom overrides (null = use tier defaults)
  customLimits      Json?          // RateLimitOverrides

  // Enterprise contract reference
  contractId        String?
  contractExpiresAt DateTime?

  // Feature flags
  burstEnabled      Boolean   @default(true)
  priorityEnabled   Boolean   @default(false)   // Enterprise only
  overageEnabled    Boolean   @default(false)   // Allow paid overages

  // Audit
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  updatedById       String?

  @@index([organizationId])
}

enum RateLimitTier {
  STARTER
  PROFESSIONAL
  ENTERPRISE
  UNLIMITED
}
```

### 6.2 Rate Limit Overrides Interface

```typescript
// apps/backend/src/modules/rate-limit/interfaces/rate-limit-overrides.interface.ts

export interface RateLimitOverrides {
  // API request limits
  api?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    dailyQuota?: number;
    burstAllowance?: number;
  };

  // AI feature limits
  ai?: {
    requestsPerMonth?: number;
    tokensPerMonth?: number;
    premiumModelAccess?: boolean;
  };

  // Bulk operation limits
  bulk?: {
    concurrentJobs?: number;
    maxBatchSize?: number;
    exportSizeLimit?: number;
  };

  // File operation limits
  files?: {
    uploadSizeLimit?: number;     // bytes
    downloadBandwidthPerHour?: number; // bytes
    concurrentDownloads?: number;
  };

  // Endpoint-specific overrides
  endpoints?: {
    [endpointPattern: string]: {
      requestsPerHour?: number;
      requestsPerDay?: number;
    };
  };

  // Whitelisted integrations (no limits)
  whitelistedApiKeys?: string[];
}
```

### 6.3 Usage Tracking

```prisma
model RateLimitUsage {
  id               String   @id @default(uuid())
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id])

  // Time window
  windowStart      DateTime
  windowType       RateLimitWindow

  // Counters
  requestCount     Int      @default(0)
  weightedCost     Int      @default(0)
  aiRequestCount   Int      @default(0)
  aiTokenCount     Int      @default(0)

  // Breakdown by category
  readCount        Int      @default(0)
  writeCount       Int      @default(0)
  searchCount      Int      @default(0)
  bulkCount        Int      @default(0)
  reportCount      Int      @default(0)
  fileBytes        BigInt   @default(0)

  // For user-level tracking
  userId           String?

  createdAt        DateTime @default(now())

  @@unique([organizationId, windowType, windowStart, userId])
  @@index([organizationId, windowType, windowStart])
  @@index([organizationId, userId, windowType])
}

enum RateLimitWindow {
  MINUTE
  HOUR
  DAY
  MONTH
}
```

### 6.4 Rate Limit Events (for Alerting)

```prisma
model RateLimitEvent {
  id               String   @id @default(uuid())
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id])

  eventType        RateLimitEventType
  threshold        Int                  // Percentage (50, 80, 95, 100)
  limitType        String               // 'api_daily', 'ai_monthly', etc.

  // Context
  currentUsage     Int
  limit            Int
  userId           String?              // If user-level event

  // Notification status
  notifiedAt       DateTime?
  acknowledgedAt   DateTime?
  acknowledgedById String?

  createdAt        DateTime @default(now())

  @@index([organizationId, eventType, createdAt])
}

enum RateLimitEventType {
  THRESHOLD_50
  THRESHOLD_80
  THRESHOLD_95
  LIMIT_REACHED
  OVERAGE_STARTED
  OVERAGE_LIMIT_REACHED
}
```

---

## 7. Implementation

### 7.1 Rate Limiter Service

```typescript
// apps/backend/src/modules/rate-limit/rate-limiter.service.ts

import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimitConfig, RateLimitResult, RequestContext } from './interfaces';

@Injectable()
export class RateLimiterService {
  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
    private configService: RateLimitConfigService,
    private usageService: UsageTrackingService,
  ) {}

  /**
   * Check if request is allowed and record usage
   */
  async checkAndRecord(context: RequestContext): Promise<RateLimitResult> {
    const config = await this.configService.getConfig(context.organizationId);
    const cost = this.calculateRequestCost(context);

    // Check all applicable limits
    const checks = await Promise.all([
      this.checkMinuteLimit(context, config, cost),
      this.checkHourLimit(context, config, cost),
      this.checkDailyQuota(context, config, cost),
      this.checkEndpointLimit(context, config),
      this.checkUserLimit(context, config, cost),
    ]);

    // Find the most restrictive limit that's exceeded
    const exceeded = checks.find(c => !c.allowed);
    if (exceeded) {
      return exceeded;
    }

    // Record the request
    await this.recordRequest(context, cost);

    // Return remaining limits
    return this.buildAllowedResponse(context, config, checks);
  }

  /**
   * Sliding window rate limit check
   */
  private async checkMinuteLimit(
    context: RequestContext,
    config: RateLimitConfig,
    cost: number,
  ): Promise<RateLimitResult> {
    const key = `rate:org:${context.organizationId}:minute`;
    const limit = config.customLimits?.api?.requestsPerMinute
      ?? this.getTierDefault(config.tier, 'requestsPerMinute');

    const current = await this.slidingWindowCount(key, 60);

    if (current + cost > limit) {
      const resetAt = await this.getWindowReset(key, 60);
      return {
        allowed: false,
        limitType: 'requests_per_minute',
        limit,
        remaining: Math.max(0, limit - current),
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
        scope: 'organization',
      };
    }

    return {
      allowed: true,
      limitType: 'requests_per_minute',
      limit,
      remaining: limit - current - cost,
      resetAt: new Date(Date.now() + 60000),
      scope: 'organization',
    };
  }

  /**
   * Sliding window log algorithm
   * More accurate than fixed windows, handles edge cases
   */
  private async slidingWindowCount(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    // Remove old entries
    await this.redis.zremrangebyscore(key, '-inf', windowStart.toString());

    // Count entries in window
    const count = await this.redis.zcount(key, windowStart.toString(), now.toString());

    return count;
  }

  /**
   * Record request in sliding window
   */
  private async recordRequest(context: RequestContext, cost: number): Promise<void> {
    const now = Date.now();
    const member = `${now}:${context.requestId}`;

    // Record in minute window
    const minuteKey = `rate:org:${context.organizationId}:minute`;
    await this.redis.zadd(minuteKey, now.toString(), member);
    await this.redis.expire(minuteKey, 120); // 2 minute TTL

    // Record in hour window
    const hourKey = `rate:org:${context.organizationId}:hour`;
    await this.redis.zadd(hourKey, now.toString(), member);
    await this.redis.expire(hourKey, 7200); // 2 hour TTL

    // Increment daily counter
    const today = new Date().toISOString().split('T')[0];
    const dayKey = `rate:org:${context.organizationId}:day:${today}`;
    await this.redis.incrby(dayKey, cost);
    await this.redis.expire(dayKey, 172800); // 2 day TTL

    // Record for user if applicable
    if (context.userId) {
      const userMinuteKey = `rate:org:${context.organizationId}:user:${context.userId}:minute`;
      await this.redis.zadd(userMinuteKey, now.toString(), member);
      await this.redis.expire(userMinuteKey, 120);
    }

    // Async: persist to database for billing/analytics
    this.usageService.recordUsage(context, cost);
  }

  /**
   * Calculate weighted cost of request
   */
  private calculateRequestCost(context: RequestContext): number {
    const costMap: Record<string, number> = {
      'GET': 1,
      'POST': 2,
      'PUT': 2,
      'PATCH': 2,
      'DELETE': 2,
    };

    let baseCost = costMap[context.method] ?? 1;

    // Endpoint-specific weights
    if (context.endpoint.includes('/search')) {
      baseCost *= 3;
    } else if (context.endpoint.includes('/bulk')) {
      baseCost *= 10;
    } else if (context.endpoint.includes('/reports/execute')) {
      baseCost *= 20;
    } else if (context.endpoint.includes('/ai/')) {
      baseCost *= 50;
    }

    return baseCost;
  }

  private getTierDefault(tier: string, limit: string): number {
    const defaults = {
      STARTER: {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        dailyQuota: 10000,
        burstAllowance: 20,
      },
      PROFESSIONAL: {
        requestsPerMinute: 500,
        requestsPerHour: 15000,
        dailyQuota: 100000,
        burstAllowance: 100,
      },
      ENTERPRISE: {
        requestsPerMinute: 2000,
        requestsPerHour: 60000,
        dailyQuota: 1000000,
        burstAllowance: 500,
      },
      UNLIMITED: {
        requestsPerMinute: 10000,
        requestsPerHour: 300000,
        dailyQuota: 10000000,
        burstAllowance: 1000,
      },
    };

    return defaults[tier]?.[limit] ?? defaults.STARTER[limit];
  }
}
```

### 7.2 Rate Limit Middleware

```typescript
// apps/backend/src/common/middleware/rate-limit.middleware.ts

import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterService } from '../../modules/rate-limit/rate-limiter.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private rateLimiter: RateLimiterService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const context = {
      organizationId: req['organizationId'],
      userId: req['user']?.id,
      requestId: req['requestId'],
      method: req.method,
      endpoint: req.path,
      ip: req.ip,
    };

    // Skip rate limiting for health checks
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }

    const result = await this.rateLimiter.checkAndRecord(context);

    // Always set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000));
    res.setHeader('X-RateLimit-Scope', result.scope);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);

      throw new HttpException({
        error: {
          code: this.getErrorCode(result.limitType),
          message: this.getErrorMessage(result.limitType, result.retryAfter),
          details: {
            limitType: result.limitType,
            limit: result.limit,
            remaining: 0,
            resetAt: result.resetAt.toISOString(),
            retryAfter: result.retryAfter,
            scope: result.scope,
          },
        },
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    next();
  }

  private getErrorCode(limitType: string): string {
    const codes = {
      'requests_per_minute': 'RATE_LIMIT_EXCEEDED',
      'requests_per_hour': 'RATE_LIMIT_EXCEEDED',
      'daily_quota': 'DAILY_QUOTA_EXCEEDED',
      'ai_requests_monthly': 'AI_LIMIT_EXCEEDED',
      'endpoint_specific': 'ENDPOINT_LIMIT_EXCEEDED',
    };
    return codes[limitType] ?? 'RATE_LIMIT_EXCEEDED';
  }

  private getErrorMessage(limitType: string, retryAfter: number): string {
    if (limitType === 'daily_quota') {
      return 'Daily API quota exceeded. Quota resets at midnight UTC.';
    }
    if (limitType === 'ai_requests_monthly') {
      return 'Monthly AI request limit reached. Contact your administrator for additional capacity.';
    }
    return `Too many requests. Please retry after ${retryAfter} seconds.`;
  }
}
```

### 7.3 Rate Limit Guard (for Controllers)

```typescript
// apps/backend/src/common/guards/rate-limit.guard.ts

import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService } from '../../modules/rate-limit/rate-limiter.service';

// Decorator to set endpoint-specific limits
export const RateLimit = (limit: number, window: 'minute' | 'hour' | 'day') =>
  SetMetadata('rateLimit', { limit, window });

// Decorator to set request cost
export const RequestCost = (cost: number) =>
  SetMetadata('requestCost', cost);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rateLimiter: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const customLimit = this.reflector.get<{ limit: number; window: string }>(
      'rateLimit',
      context.getHandler(),
    );

    const customCost = this.reflector.get<number>(
      'requestCost',
      context.getHandler(),
    );

    // Additional endpoint-specific checks if decorated
    if (customLimit) {
      const request = context.switchToHttp().getRequest();
      const result = await this.rateLimiter.checkEndpointLimit(
        request['organizationId'],
        context.getHandler().name,
        customLimit.limit,
        customLimit.window,
      );

      if (!result.allowed) {
        return false;
      }
    }

    return true;
  }
}
```

### 7.4 Graceful Degradation Handler

```typescript
// apps/backend/src/modules/rate-limit/graceful-degradation.service.ts

import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class GracefulDegradationService {
  constructor(private redis: RedisService) {}

  /**
   * Check if Redis is available for rate limiting
   */
  async isRedisHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fallback rate limiting using in-memory counters
   * Used when Redis is unavailable
   */
  private inMemoryCounters = new Map<string, { count: number; resetAt: number }>();

  async fallbackCheck(organizationId: string, limit: number): Promise<boolean> {
    const key = `${organizationId}:fallback`;
    const now = Date.now();

    const counter = this.inMemoryCounters.get(key);

    if (!counter || counter.resetAt < now) {
      this.inMemoryCounters.set(key, { count: 1, resetAt: now + 60000 });
      return true;
    }

    if (counter.count >= limit) {
      return false;
    }

    counter.count++;
    return true;
  }

  /**
   * Priority-based throttling when approaching limits
   * Lower priority requests are rejected first
   */
  getRequestPriority(endpoint: string, method: string): number {
    // Critical operations (never throttle)
    if (endpoint.includes('/auth/') || endpoint.includes('/health')) {
      return 100;
    }

    // High priority (user-facing operations)
    if (method === 'GET' && !endpoint.includes('/export')) {
      return 80;
    }

    // Medium priority (standard writes)
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      return 60;
    }

    // Low priority (background operations)
    if (endpoint.includes('/sync') || endpoint.includes('/webhook')) {
      return 40;
    }

    // Lowest priority (exports, bulk operations)
    if (endpoint.includes('/export') || endpoint.includes('/bulk')) {
      return 20;
    }

    return 50;
  }

  /**
   * When at 90%+ of limits, only allow high-priority requests
   */
  shouldThrottleLowPriority(usagePercent: number, priority: number): boolean {
    if (usagePercent >= 95 && priority < 60) return true;
    if (usagePercent >= 90 && priority < 40) return true;
    if (usagePercent >= 80 && priority < 20) return true;
    return false;
  }
}
```

---

## 8. Billing Integration

### 8.1 Usage Tracking for Billing

```typescript
// apps/backend/src/modules/rate-limit/usage-tracking.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class UsageTrackingService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('usage-aggregation') private usageQueue: Queue,
  ) {}

  /**
   * Record usage for billing purposes (async)
   */
  async recordUsage(context: RequestContext, cost: number): Promise<void> {
    // Add to queue for async processing
    await this.usageQueue.add('record-usage', {
      organizationId: context.organizationId,
      userId: context.userId,
      endpoint: context.endpoint,
      method: context.method,
      cost,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get current billing period usage
   */
  async getBillingUsage(organizationId: string): Promise<BillingUsage> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await this.prisma.rateLimitUsage.aggregate({
      where: {
        organizationId,
        windowType: 'MONTH',
        windowStart: { gte: startOfMonth },
      },
      _sum: {
        requestCount: true,
        weightedCost: true,
        aiRequestCount: true,
        aiTokenCount: true,
      },
    });

    const config = await this.prisma.rateLimitConfig.findUnique({
      where: { organizationId },
    });

    return {
      period: {
        start: startOfMonth,
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      },
      apiRequests: {
        used: usage._sum.requestCount ?? 0,
        limit: this.getMonthlyLimit(config?.tier ?? 'STARTER'),
        overage: Math.max(0, (usage._sum.requestCount ?? 0) - this.getMonthlyLimit(config?.tier ?? 'STARTER')),
      },
      aiRequests: {
        used: usage._sum.aiRequestCount ?? 0,
        limit: this.getAIMonthlyLimit(config?.tier ?? 'STARTER'),
        overage: Math.max(0, (usage._sum.aiRequestCount ?? 0) - this.getAIMonthlyLimit(config?.tier ?? 'STARTER')),
      },
      aiTokens: {
        used: usage._sum.aiTokenCount ?? 0,
        limit: this.getTokenMonthlyLimit(config?.tier ?? 'STARTER'),
      },
    };
  }

  /**
   * Calculate overage charges
   */
  async calculateOverageCharges(organizationId: string): Promise<OverageCharges> {
    const usage = await this.getBillingUsage(organizationId);
    const config = await this.prisma.rateLimitConfig.findUnique({
      where: { organizationId },
    });

    if (!config?.overageEnabled) {
      return { apiOverage: 0, aiOverage: 0, total: 0 };
    }

    // Overage rates (per request)
    const API_OVERAGE_RATE = 0.001;  // $0.001 per request
    const AI_OVERAGE_RATE = 0.01;    // $0.01 per AI request

    const apiOverage = usage.apiRequests.overage * API_OVERAGE_RATE;
    const aiOverage = usage.aiRequests.overage * AI_OVERAGE_RATE;

    return {
      apiOverage,
      aiOverage,
      total: apiOverage + aiOverage,
    };
  }

  private getMonthlyLimit(tier: string): number {
    const limits = { STARTER: 300000, PROFESSIONAL: 3000000, ENTERPRISE: 30000000 };
    return limits[tier] ?? limits.STARTER;
  }

  private getAIMonthlyLimit(tier: string): number {
    const limits = { STARTER: 10000, PROFESSIONAL: 100000, ENTERPRISE: 1000000 };
    return limits[tier] ?? limits.STARTER;
  }

  private getTokenMonthlyLimit(tier: string): number {
    const limits = { STARTER: 5000000, PROFESSIONAL: 50000000, ENTERPRISE: 500000000 };
    return limits[tier] ?? limits.STARTER;
  }
}
```

### 8.2 Usage Alerts

```typescript
// apps/backend/src/modules/rate-limit/usage-alerts.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class UsageAlertsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  /**
   * Check usage thresholds and send alerts
   */
  async checkThresholds(organizationId: string): Promise<void> {
    const usage = await this.getCurrentUsagePercent(organizationId);

    const thresholds = [50, 80, 95, 100];

    for (const threshold of thresholds) {
      if (usage.apiPercent >= threshold) {
        await this.createAlertIfNeeded(organizationId, 'api_daily', threshold, usage.apiPercent);
      }
      if (usage.aiPercent >= threshold) {
        await this.createAlertIfNeeded(organizationId, 'ai_monthly', threshold, usage.aiPercent);
      }
    }
  }

  private async createAlertIfNeeded(
    organizationId: string,
    limitType: string,
    threshold: number,
    currentPercent: number,
  ): Promise<void> {
    // Check if alert already sent today
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.prisma.rateLimitEvent.findFirst({
      where: {
        organizationId,
        limitType,
        threshold,
        createdAt: { gte: new Date(today) },
      },
    });

    if (existing) return;

    // Create event and send notification
    const event = await this.prisma.rateLimitEvent.create({
      data: {
        organizationId,
        eventType: this.getEventType(threshold),
        threshold,
        limitType,
        currentUsage: Math.round(currentPercent),
        limit: 100,
        notifiedAt: new Date(),
      },
    });

    // Send notification to org admins
    await this.notifications.sendToOrgAdmins(organizationId, {
      type: 'RATE_LIMIT_ALERT',
      title: this.getAlertTitle(limitType, threshold),
      body: this.getAlertBody(limitType, threshold, currentPercent),
      severity: threshold >= 95 ? 'high' : threshold >= 80 ? 'medium' : 'low',
      actionUrl: '/settings/usage',
    });
  }

  private getEventType(threshold: number): string {
    if (threshold >= 100) return 'LIMIT_REACHED';
    return `THRESHOLD_${threshold}`;
  }

  private getAlertTitle(limitType: string, threshold: number): string {
    const typeLabel = limitType === 'ai_monthly' ? 'AI' : 'API';
    if (threshold >= 100) return `${typeLabel} limit reached`;
    return `${typeLabel} usage at ${threshold}%`;
  }

  private getAlertBody(limitType: string, threshold: number, current: number): string {
    if (limitType === 'ai_monthly') {
      return `Your organization has used ${current.toFixed(1)}% of the monthly AI request quota.`;
    }
    return `Your organization has used ${current.toFixed(1)}% of today's API quota.`;
  }
}
```

---

## 9. Admin Controls

### 9.1 Admin API Endpoints

```typescript
// apps/backend/src/modules/rate-limit/rate-limit.controller.ts

import { Controller, Get, Put, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('Rate Limits')
@Controller('api/v1/admin/rate-limits')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RateLimitAdminController {
  constructor(
    private rateLimitService: RateLimiterService,
    private configService: RateLimitConfigService,
  ) {}

  /**
   * Get current rate limit status
   */
  @Get('status')
  @Roles('SYSTEM_ADMIN', 'CCO')
  @ApiOperation({ summary: 'Get current rate limit status and usage' })
  async getStatus(@TenantId() organizationId: string) {
    return this.rateLimitService.getStatus(organizationId);
  }

  /**
   * Get usage history
   */
  @Get('usage')
  @Roles('SYSTEM_ADMIN', 'CCO')
  @ApiOperation({ summary: 'Get usage history for billing period' })
  async getUsage(
    @TenantId() organizationId: string,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    return this.rateLimitService.getUsageHistory(organizationId, period);
  }

  /**
   * Get configuration
   */
  @Get('config')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Get rate limit configuration' })
  async getConfig(@TenantId() organizationId: string) {
    return this.configService.getConfig(organizationId);
  }

  /**
   * Update configuration (Ethico admin only)
   */
  @Put('config')
  @Roles('ETHICO_ADMIN')
  @ApiOperation({ summary: 'Update rate limit configuration (Ethico admin only)' })
  async updateConfig(
    @TenantId() organizationId: string,
    @Body() dto: UpdateRateLimitConfigDto,
  ) {
    return this.configService.updateConfig(organizationId, dto);
  }

  /**
   * Temporarily increase limits
   */
  @Post('temporary-increase')
  @Roles('ETHICO_ADMIN')
  @ApiOperation({ summary: 'Grant temporary limit increase' })
  async temporaryIncrease(
    @TenantId() organizationId: string,
    @Body() dto: TemporaryIncreaseDto,
  ) {
    return this.configService.grantTemporaryIncrease(
      organizationId,
      dto.multiplier,
      dto.durationHours,
      dto.reason,
    );
  }

  /**
   * Whitelist an API key (no limits)
   */
  @Post('whitelist')
  @Roles('ETHICO_ADMIN')
  @ApiOperation({ summary: 'Whitelist an API key from rate limits' })
  async whitelistApiKey(
    @TenantId() organizationId: string,
    @Body() dto: WhitelistApiKeyDto,
  ) {
    return this.configService.whitelistApiKey(
      organizationId,
      dto.apiKeyId,
      dto.reason,
    );
  }
}
```

### 9.2 Customer Usage Dashboard Data

```typescript
// Response for GET /api/v1/admin/rate-limits/status

interface RateLimitStatusResponse {
  organization: {
    id: string;
    name: string;
    tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  };

  currentUsage: {
    // Per-minute usage
    minute: {
      used: number;
      limit: number;
      remaining: number;
      resetAt: string;
    };

    // Hourly usage
    hour: {
      used: number;
      limit: number;
      remaining: number;
      resetAt: string;
    };

    // Daily quota
    day: {
      used: number;
      limit: number;
      remaining: number;
      percentUsed: number;
      resetAt: string;
    };

    // Monthly AI usage
    aiMonth: {
      used: number;
      limit: number;
      remaining: number;
      percentUsed: number;
      resetAt: string;
    };
  };

  projections: {
    dailyProjected: number;        // Expected daily usage
    monthlyProjected: number;      // Expected monthly AI usage
    willExceedDaily: boolean;
    willExceedMonthly: boolean;
  };

  breakdown: {
    byCategory: {
      reads: number;
      writes: number;
      searches: number;
      bulk: number;
      reports: number;
      ai: number;
    };
    byUser: Array<{
      userId: string;
      userName: string;
      requestCount: number;
      percentOfTotal: number;
    }>;
    byEndpoint: Array<{
      endpoint: string;
      count: number;
      percentOfTotal: number;
    }>;
  };

  alerts: Array<{
    type: string;
    threshold: number;
    message: string;
    createdAt: string;
    acknowledged: boolean;
  }>;

  recommendations: string[];
}
```

---

## 10. Webhook Rate Limits

### 10.1 Outbound Webhook Limits

```typescript
// apps/backend/src/modules/webhooks/webhook-rate-limiter.ts

export interface WebhookRateLimits {
  // Per-endpoint limits
  maxDeliveriesPerMinute: number;     // 100 default
  maxDeliveriesPerHour: number;       // 1000 default

  // Retry limits
  maxRetries: number;                 // 5 default
  retryBackoffSeconds: number[];      // [10, 30, 120, 600, 3600]

  // Concurrent delivery
  maxConcurrentDeliveries: number;    // 10 default

  // Payload limits
  maxPayloadSizeBytes: number;        // 1MB default
}

const TIER_WEBHOOK_LIMITS: Record<string, WebhookRateLimits> = {
  STARTER: {
    maxDeliveriesPerMinute: 50,
    maxDeliveriesPerHour: 500,
    maxRetries: 3,
    retryBackoffSeconds: [30, 300, 3600],
    maxConcurrentDeliveries: 5,
    maxPayloadSizeBytes: 512 * 1024,
  },
  PROFESSIONAL: {
    maxDeliveriesPerMinute: 100,
    maxDeliveriesPerHour: 2000,
    maxRetries: 5,
    retryBackoffSeconds: [10, 30, 120, 600, 3600],
    maxConcurrentDeliveries: 10,
    maxPayloadSizeBytes: 1024 * 1024,
  },
  ENTERPRISE: {
    maxDeliveriesPerMinute: 500,
    maxDeliveriesPerHour: 10000,
    maxRetries: 7,
    retryBackoffSeconds: [10, 30, 60, 300, 900, 3600, 7200],
    maxConcurrentDeliveries: 50,
    maxPayloadSizeBytes: 5 * 1024 * 1024,
  },
};
```

### 10.2 Backoff Strategy

```typescript
// apps/backend/src/modules/webhooks/webhook-delivery.service.ts

@Injectable()
export class WebhookDeliveryService {
  /**
   * Exponential backoff with jitter
   */
  calculateRetryDelay(attempt: number, limits: WebhookRateLimits): number {
    const baseDelay = limits.retryBackoffSeconds[
      Math.min(attempt - 1, limits.retryBackoffSeconds.length - 1)
    ];

    // Add jitter (0-25% random addition)
    const jitter = Math.random() * 0.25 * baseDelay;

    return Math.round((baseDelay + jitter) * 1000); // Return milliseconds
  }

  /**
   * Check if webhook endpoint is healthy
   * Disable webhooks to endpoints that consistently fail
   */
  async checkEndpointHealth(endpointId: string): Promise<EndpointHealth> {
    const recentDeliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        endpointId,
        createdAt: { gte: new Date(Date.now() - 3600000) }, // Last hour
      },
      select: { status: true },
    });

    const total = recentDeliveries.length;
    const failed = recentDeliveries.filter(d => d.status === 'FAILED').length;
    const failRate = total > 0 ? failed / total : 0;

    return {
      healthy: failRate < 0.5,
      failRate,
      totalDeliveries: total,
      failedDeliveries: failed,
      recommendation: failRate >= 0.8 ? 'disable' : failRate >= 0.5 ? 'warn' : 'healthy',
    };
  }
}
```

---

## 11. AI Feature Limits

See `TECH-SPEC-AI-INTEGRATION.md` Section 14 for detailed AI rate limiting. This section covers integration points.

### 11.1 AI Limit Integration

```typescript
// apps/backend/src/modules/rate-limit/ai-rate-limiter.service.ts

@Injectable()
export class AIRateLimiterService {
  constructor(
    private rateLimiter: RateLimiterService,
    private redis: RedisService,
  ) {}

  /**
   * Check AI-specific limits
   */
  async checkAILimit(
    organizationId: string,
    operationType: 'chat' | 'skill' | 'summary' | 'generation',
    estimatedTokens: number,
  ): Promise<AIRateLimitResult> {
    // Check monthly request limit
    const monthlyResult = await this.checkMonthlyLimit(organizationId);
    if (!monthlyResult.allowed) {
      return monthlyResult;
    }

    // Check monthly token budget
    const tokenResult = await this.checkTokenBudget(organizationId, estimatedTokens);
    if (!tokenResult.allowed) {
      return tokenResult;
    }

    // Check per-minute burst limit
    const burstResult = await this.checkBurstLimit(organizationId, operationType);
    if (!burstResult.allowed) {
      return burstResult;
    }

    return { allowed: true, ...monthlyResult };
  }

  /**
   * Record AI usage
   */
  async recordAIUsage(
    organizationId: string,
    userId: string,
    operationType: string,
    tokensUsed: number,
    model: string,
    cost: number,
  ): Promise<void> {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Increment monthly counters
    await Promise.all([
      this.redis.incrby(`ai:org:${organizationId}:requests:${month}`, 1),
      this.redis.incrby(`ai:org:${organizationId}:tokens:${month}`, tokensUsed),
      this.redis.incrbyfloat(`ai:org:${organizationId}:cost:${month}`, cost),

      // User-level tracking
      this.redis.incrby(`ai:org:${organizationId}:user:${userId}:requests:${month}`, 1),
      this.redis.incrby(`ai:org:${organizationId}:user:${userId}:tokens:${month}`, tokensUsed),
    ]);

    // Persist to database async
    this.persistAIUsage(organizationId, userId, operationType, tokensUsed, model, cost);
  }
}
```

---

## 12. Bulk Operation Limits

### 12.1 Bulk Operation Controller

```typescript
// apps/backend/src/modules/bulk/bulk.controller.ts

@Controller('api/v1/bulk')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
export class BulkOperationController {
  @Post('cases/update')
  @Roles('SYSTEM_ADMIN', 'CCO', 'TRIAGE_LEAD')
  @RateLimit(20, 'hour')        // Max 20 bulk updates per hour
  @RequestCost(10)              // Each bulk op costs 10 API units
  @ApiOperation({ summary: 'Bulk update cases' })
  async bulkUpdateCases(
    @TenantId() organizationId: string,
    @Body() dto: BulkUpdateCasesDto,
    @CurrentUser() user: User,
  ) {
    // Check concurrent job limit
    const activeJobs = await this.bulkService.getActiveJobCount(organizationId);
    const config = await this.configService.getConfig(organizationId);

    if (activeJobs >= config.bulk.concurrentJobs) {
      throw new HttpException({
        error: {
          code: 'CONCURRENT_JOB_LIMIT',
          message: `Maximum ${config.bulk.concurrentJobs} concurrent bulk operations allowed.`,
          activeJobs,
        },
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Check batch size
    if (dto.caseIds.length > config.bulk.maxBatchSize) {
      throw new HttpException({
        error: {
          code: 'BATCH_SIZE_EXCEEDED',
          message: `Maximum batch size is ${config.bulk.maxBatchSize} records.`,
          requested: dto.caseIds.length,
        },
      }, HttpStatus.BAD_REQUEST);
    }

    return this.bulkService.queueBulkUpdate(organizationId, dto, user.id);
  }

  @Post('export')
  @RateLimit(10, 'hour')
  @RequestCost(20)
  @ApiOperation({ summary: 'Export data' })
  async exportData(
    @TenantId() organizationId: string,
    @Body() dto: ExportDto,
  ) {
    const config = await this.configService.getConfig(organizationId);

    // Check export size limit
    const estimatedSize = await this.exportService.estimateSize(dto);
    if (estimatedSize > config.bulk.exportSizeLimit) {
      throw new HttpException({
        error: {
          code: 'EXPORT_SIZE_EXCEEDED',
          message: `Export exceeds maximum size of ${config.bulk.exportSizeLimit} records.`,
          estimated: estimatedSize,
        },
      }, HttpStatus.BAD_REQUEST);
    }

    return this.exportService.queueExport(organizationId, dto);
  }
}
```

---

## 13. Graceful Degradation

### 13.1 Priority-Based Throttling

When approaching rate limits, the system prioritizes critical operations.

```typescript
// Priority levels (higher = more important)
const OPERATION_PRIORITIES = {
  // Critical - never throttle
  'auth/login': 100,
  'auth/refresh': 100,
  'health': 100,

  // High - user-facing reads
  'cases/get': 80,
  'investigations/get': 80,
  'policies/get': 80,

  // Medium - user-facing writes
  'cases/create': 60,
  'cases/update': 60,
  'investigations/create': 60,

  // Low - background operations
  'sync/hris': 40,
  'webhooks/deliver': 40,

  // Lowest - bulk/export
  'bulk/*': 20,
  'export/*': 20,
};
```

### 13.2 Degradation Behavior

| Usage Level | Behavior |
|-------------|----------|
| 0-80% | Normal operation |
| 80-90% | Warn admins, allow all requests |
| 90-95% | Reject priority < 40 (bulk/export) |
| 95-99% | Reject priority < 60 (background ops) |
| 99-100% | Reject priority < 80 (only reads) |
| 100%+ | Reject all except priority 100 (auth/health) |

### 13.3 Redis Unavailable Fallback

```typescript
async handleRedisFailure(context: RequestContext): Promise<RateLimitResult> {
  // Log the failure
  this.logger.error('Redis unavailable for rate limiting', { context });

  // Fall back to in-memory limiting (conservative)
  const fallbackAllowed = await this.gracefulDegradation.fallbackCheck(
    context.organizationId,
    50, // Conservative fallback limit
  );

  if (!fallbackAllowed) {
    return {
      allowed: false,
      limitType: 'fallback',
      retryAfter: 60,
      message: 'Service temporarily limited. Please retry.',
    };
  }

  // Allow with warning header
  return {
    allowed: true,
    headers: {
      'X-RateLimit-Fallback': 'true',
    },
  };
}
```

---

## 14. Monitoring & Alerting

### 14.1 Metrics to Track

```typescript
// Prometheus metrics
const RATE_LIMIT_METRICS = {
  // Request counters
  'rate_limit_requests_total': Counter,           // Total requests
  'rate_limit_rejected_total': Counter,           // Rejected requests
  'rate_limit_allowed_total': Counter,            // Allowed requests

  // Latency
  'rate_limit_check_duration_seconds': Histogram, // Rate limit check latency

  // Usage gauges
  'rate_limit_usage_percent': Gauge,              // Current usage percentage
  'rate_limit_remaining': Gauge,                  // Remaining requests

  // Errors
  'rate_limit_redis_errors_total': Counter,       // Redis failures
  'rate_limit_fallback_activations_total': Counter, // Fallback mode activations
};
```

### 14.2 Alert Rules

```yaml
# Prometheus alerting rules
groups:
  - name: rate_limiting
    rules:
      - alert: HighRateLimitRejections
        expr: |
          sum(rate(rate_limit_rejected_total[5m]))
          / sum(rate(rate_limit_requests_total[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High rate of API rejections
          description: >
            More than 10% of requests are being rate limited.

      - alert: OrganizationApproachingLimit
        expr: rate_limit_usage_percent > 90
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Organization approaching rate limit

      - alert: RedisRateLimitFailure
        expr: rate(rate_limit_redis_errors_total[1m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Redis rate limiting failures detected
```

---

## 15. API Specifications

### 15.1 Rate Limit Status API

```yaml
# OpenAPI specification
paths:
  /api/v1/admin/rate-limits/status:
    get:
      summary: Get current rate limit status
      tags:
        - Rate Limits
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Rate limit status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RateLimitStatus'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

  /api/v1/admin/rate-limits/usage:
    get:
      summary: Get usage history
      tags:
        - Rate Limits
      parameters:
        - name: period
          in: query
          schema:
            type: string
            enum: [day, week, month]
            default: day
        - name: groupBy
          in: query
          schema:
            type: string
            enum: [hour, day, user, endpoint]
      responses:
        '200':
          description: Usage history
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsageHistory'

components:
  schemas:
    RateLimitStatus:
      type: object
      properties:
        organization:
          type: object
          properties:
            id:
              type: string
            name:
              type: string
            tier:
              type: string
              enum: [STARTER, PROFESSIONAL, ENTERPRISE]
        currentUsage:
          type: object
          properties:
            minute:
              $ref: '#/components/schemas/UsageWindow'
            hour:
              $ref: '#/components/schemas/UsageWindow'
            day:
              $ref: '#/components/schemas/UsageWindow'
            aiMonth:
              $ref: '#/components/schemas/UsageWindow'

    UsageWindow:
      type: object
      properties:
        used:
          type: integer
        limit:
          type: integer
        remaining:
          type: integer
        percentUsed:
          type: number
        resetAt:
          type: string
          format: date-time
```

---

## 16. Implementation Guide

### 16.1 Implementation Phases

| Phase | Scope | Duration |
|-------|-------|----------|
| **Phase 1** | Core rate limiting (per-org, per-minute/hour/day) | 2 weeks |
| **Phase 2** | Weighted costs, endpoint-specific limits | 1 week |
| **Phase 3** | Billing integration, usage dashboard | 2 weeks |
| **Phase 4** | AI limits, bulk limits | 1 week |
| **Phase 5** | Admin controls, alerts | 1 week |
| **Phase 6** | Webhook limits, graceful degradation | 1 week |

### 16.2 Testing Checklist

- [ ] Rate limits enforced correctly per tier
- [ ] Headers returned on all responses
- [ ] 429 response format correct
- [ ] Retry-After header accurate
- [ ] Redis failure fallback works
- [ ] Priority-based throttling activates correctly
- [ ] Billing usage tracked accurately
- [ ] Alerts fire at correct thresholds
- [ ] Admin override works
- [ ] Whitelist bypasses limits
- [ ] Multi-tenant isolation verified
- [ ] Load test at 2x expected peak

### 16.3 Configuration

```typescript
// apps/backend/src/config/rate-limit.config.ts

export const rateLimitConfig = {
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
    keyPrefix: 'rate:',
  },

  // Default tier limits
  tiers: {
    STARTER: {
      requestsPerMinute: 100,
      requestsPerHour: 2000,
      dailyQuota: 10000,
      aiRequestsPerMonth: 10000,
    },
    PROFESSIONAL: {
      requestsPerMinute: 500,
      requestsPerHour: 15000,
      dailyQuota: 100000,
      aiRequestsPerMonth: 100000,
    },
    ENTERPRISE: {
      requestsPerMinute: 2000,
      requestsPerHour: 60000,
      dailyQuota: 1000000,
      aiRequestsPerMonth: 1000000,
    },
  },

  // Alert thresholds
  alerts: {
    thresholds: [50, 80, 95, 100],
    notifyAdmins: true,
    notifyUsers: false, // Only at 95%+
  },

  // Graceful degradation
  degradation: {
    enabled: true,
    priorityThresholds: {
      80: 20,   // At 80%, reject priority < 20
      90: 40,   // At 90%, reject priority < 40
      95: 60,   // At 95%, reject priority < 60
      99: 80,   // At 99%, reject priority < 80
    },
  },
};
```

### 16.4 Environment Variables

```bash
# Rate Limiting Configuration
RATE_LIMIT_REDIS_HOST=localhost
RATE_LIMIT_REDIS_PORT=6379
RATE_LIMIT_ENABLED=true
RATE_LIMIT_FALLBACK_ENABLED=true

# Default limits (can be overridden per-org)
RATE_LIMIT_DEFAULT_RPM=100
RATE_LIMIT_DEFAULT_RPH=2000
RATE_LIMIT_DEFAULT_DAILY=10000

# AI limits
AI_RATE_LIMIT_MONTHLY=10000
AI_TOKEN_LIMIT_MONTHLY=5000000

# Alerting
RATE_LIMIT_ALERT_EMAIL=ops@ethico.com
RATE_LIMIT_ALERT_SLACK_WEBHOOK=https://hooks.slack.com/...
```

---

## Appendix A: Decision References

This specification implements decisions from WORKING-DECISIONS.md:

| Decision | Reference | Implementation |
|----------|-----------|----------------|
| REST + OpenAPI | N.1 | All endpoints follow REST patterns |
| Tiered by plan | O.1 | Section 2.1 |
| Weighted by cost | O.2 | Section 3.5 |
| Redis sliding window | O.3 | Section 7.1 |
| Standard headers | O.4 | Section 4 |
| Customer visibility | O.5 | Section 9.2 |
| Admin overrides | O.6 | Section 9.1 |
| Priority throttling | O.7 | Section 13 |
| AI rate limits | AA.18 | Section 11 |

---

## Appendix B: Related Documents

- `00-PLATFORM/WORKING-DECISIONS.md` - Section 16.O (API Rate Limiting & Quotas)
- `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md` - AI-specific rate limiting
- `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md` - Tenant context and authentication
- `02-MODULES/13-NOTIFICATIONS/PRD.md` - Alert notification delivery
