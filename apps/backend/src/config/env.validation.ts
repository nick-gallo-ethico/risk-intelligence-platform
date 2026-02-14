import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),

  // Database - required
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL connection string"),

  // Redis - required for production
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // JWT - required in production
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .optional()
    .refine(
      (val) => {
        if (process.env.NODE_ENV === "production" && !val) {
          return false;
        }
        return true;
      },
      { message: "JWT_SECRET is required in production" },
    ),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default("7d"),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Elasticsearch
  ELASTICSEARCH_NODE: z.string().url().default("http://localhost:9200"),

  // AI (optional)
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_DEFAULT_MODEL: z.string().default("claude-opus-4-6"),
  AI_MAX_TOKENS: z.coerce.number().default(4096),

  // Storage
  STORAGE_PROVIDER: z.enum(["local", "azure"]).default("local"),
  LOCAL_STORAGE_PATH: z.string().default("./uploads"),
  AZURE_STORAGE_ACCOUNT_NAME: z.string().optional(),
  AZURE_STORAGE_ACCOUNT_KEY: z.string().optional(),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  AZURE_STORAGE_CONTAINER_PREFIX: z.string().default("ethico"),

  // Azure Key Vault (optional, for production)
  AZURE_KEY_VAULT_URL: z.string().url().optional(),

  // Email
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default("noreply@ethico.local"),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),

  // Rate limiting
  THROTTLE_TTL: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(100),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.map(String).join(".");
      return `  - ${path}: ${issue.message}`;
    });
    throw new Error(
      `\n\nEnvironment validation failed:\n${errors.join("\n")}\n\n` +
        "Please check your .env file or environment variables.\n",
    );
  }

  return result.data;
}
