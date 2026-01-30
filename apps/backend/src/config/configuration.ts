export default () => ({
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT ?? "3000", 10),
  host: process.env.HOST || "0.0.0.0",

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
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
});
