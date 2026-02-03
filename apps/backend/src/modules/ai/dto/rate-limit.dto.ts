export interface RateLimitCheckParams {
  organizationId: string;
  estimatedTokens: number;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'RATE_LIMIT_RPM' | 'RATE_LIMIT_TPM' | 'RATE_LIMIT_DAILY';
  retryAfterMs?: number;
  remaining?: {
    rpm: number;
    tpm: number;
    dailyRequests?: number;
    dailyTokens?: number;
  };
}

export interface RecordUsageParams {
  organizationId: string;
  userId?: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  model: string;
  provider?: string;
  featureType?: string;
  entityType?: string;
  entityId?: string;
  durationMs?: number;
}

export interface OrgRateLimits {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay: number;
  tokensPerDay: number;
}
