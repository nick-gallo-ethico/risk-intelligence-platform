import { registerAs } from "@nestjs/config";

export default registerAs("database", () => ({
  // Connection pool settings
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || "10", 10),
  connectionTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "10000", 10),
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || "60000", 10),

  // PostgreSQL-specific
  statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || "30000", 10),

  // Connection URL with pooling params
  url: process.env.DATABASE_URL,

  // PgBouncer compatibility (if using external pooler)
  pgbouncerMode: process.env.PGBOUNCER_MODE === "true",
}));
