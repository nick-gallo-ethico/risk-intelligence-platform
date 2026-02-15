/**
 * Application configuration factory.
 *
 * SECRET HANDLING:
 * - Development: Reads from environment variables (.env file)
 * - Production: KeyVaultService reads from Azure Key Vault
 *
 * This factory reads env vars. For Key Vault secrets, inject KeyVaultService
 * directly and call getSecret() with the kebab-case secret name.
 *
 * KEY VAULT SECRET NAMES (kebab-case):
 * - database-url -> DATABASE_URL
 * - jwt-secret -> JWT_SECRET
 * - redis-password -> REDIS_PASSWORD
 * - anthropic-api-key -> ANTHROPIC_API_KEY
 * - azure-storage-account-key -> AZURE_STORAGE_ACCOUNT_KEY
 */
export default () => ({
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT ?? "3000", 10),
  host: process.env.HOST || "0.0.0.0",

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret:
      process.env.JWT_SECRET ||
      (() => {
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "JWT_SECRET environment variable is required in production",
          );
        }
        return "dev-only-secret-key-do-not-use-in-production";
      })(),
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || "15m",
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || "7d",

    // RS256 asymmetric key configuration
    // In production, set these for RS256 signing. In development, keys are auto-generated.
    // RS256 enables key rotation without mass user logout and supports microservices.
    rs256: {
      // PEM-encoded RSA private key (for signing)
      // Can be base64-encoded or have escaped newlines (\n)
      privateKey: process.env.JWT_RS256_PRIVATE_KEY || undefined,

      // PEM-encoded RSA public key (for verification)
      // Can be base64-encoded or have escaped newlines (\n)
      publicKey: process.env.JWT_RS256_PUBLIC_KEY || undefined,

      // Key ID (kid) - should be unique per key rotation
      // If not provided, one is auto-generated
      keyId: process.env.JWT_RS256_KEY_ID || undefined,

      // Enable key rotation support (default: true)
      rotationEnabled: process.env.JWT_RS256_ROTATION_ENABLED !== "false",

      // Days to keep old keys valid for verification (default: 7, matches refresh token lifetime)
      keyOverlapDays: parseInt(
        process.env.JWT_RS256_KEY_OVERLAP_DAYS || "7",
        10,
      ),
    },

    // Algorithm selection (RS256 preferred, HS256 for migration)
    // In development without RS256 keys: auto-generates RS256 keys
    // In production without RS256 keys: falls back to HS256 with warning
    algorithm: (process.env.JWT_ALGORITHM || "RS256") as "RS256" | "HS256",
  },

  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  },

  logging: {
    level: process.env.LOG_LEVEL || "debug",
  },

  email: {
    host: process.env.SMTP_HOST || "localhost",
    port: parseInt(process.env.SMTP_PORT ?? "1025", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM || "noreply@ethico.local",
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || "http://localhost:9200",
    maxRetries: 2,
    timeout: 5000, // Reduced from 30s to 5s for faster failure detection
    circuitBreaker: {
      timeout: 5000, // Circuit breaker timeout matches ES timeout
      errorThresholdPercentage: 50, // Open circuit after 50% failures
      resetTimeout: 30000, // Attempt to close circuit after 30s
      volumeThreshold: 5, // Minimum requests before circuit can open
    },
  },

  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    defaultModel: process.env.AI_DEFAULT_MODEL || "claude-opus-4-6",
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || "4096", 10),
  },

  storage: {
    // Provider selection: 'local' for development, 'azure' for production
    provider: (process.env.STORAGE_PROVIDER || "local") as "local" | "azure",

    // File size and type restrictions
    maxFileSize: parseInt(
      process.env.MAX_FILE_SIZE ?? String(50 * 1024 * 1024),
      10,
    ), // 50MB default
    allowedMimeTypes: (
      process.env.ALLOWED_MIME_TYPES ||
      "image/*,application/pdf,text/*,application/msword,application/vnd.openxmlformats-officedocument.*,application/vnd.ms-excel,application/vnd.ms-powerpoint"
    ).split(","),

    // Azure Blob Storage configuration
    azure: {
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || "",
      accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || "",
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || "",
      containerPrefix: process.env.AZURE_STORAGE_CONTAINER_PREFIX || "ethico",
    },

    // Local storage configuration (for development)
    local: {
      basePath: process.env.LOCAL_STORAGE_PATH || "./uploads",
    },
  },

  // Azure Key Vault configuration
  // Set AZURE_KEY_VAULT_URL to enable Key Vault for secrets in production
  keyVault: {
    url: process.env.AZURE_KEY_VAULT_URL || "",
  },
});
