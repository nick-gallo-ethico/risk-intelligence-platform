import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationShutdown,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  async onModuleInit() {
    await this.connectWithRetry();
  }

  /**
   * Attempts database connection with exponential backoff.
   * Retries 3 times with delays: 1s, 2s, 4s
   */
  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      this.logger.log(
        `Attempting database connection (attempt ${attempt}/${this.maxRetries})...`,
      );
      await this.$connect();
      this.logger.log("Database connection established successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (attempt >= this.maxRetries) {
        this.logger.error(
          `Failed to connect to database after ${this.maxRetries} attempts: ${errorMessage}`,
        );
        throw new Error(
          `Database connection failed after ${this.maxRetries} attempts. ` +
            `Last error: ${errorMessage}`,
        );
      }

      const delay = this.baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      this.logger.warn(
        `Database connection attempt ${attempt} failed: ${errorMessage}. ` +
          `Retrying in ${delay}ms...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.connectWithRetry(attempt + 1);
    }
  }

  async onModuleDestroy() {
    this.logger.log("Closing database connection...");
    await this.$disconnect();
    this.logger.log("Database connection closed");
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Received shutdown signal: ${signal}`);
    await this.$disconnect();
  }

  /**
   * Sets the tenant context for Row-Level Security.
   * Must be called at the start of each request to ensure
   * all queries are scoped to the correct organization.
   */
  async setTenantContext(organizationId: string): Promise<void> {
    await this
      .$executeRaw`SELECT set_config('app.current_organization', ${organizationId}, true)`;
  }

  /**
   * Clears the tenant context. Called at the end of requests.
   */
  async clearTenantContext(): Promise<void> {
    await this.$executeRaw`RESET app.current_organization`;
  }

  /**
   * Enables RLS bypass for system operations (auth, background jobs).
   * Use sparingly - only for operations that legitimately need cross-tenant access.
   */
  async enableBypassRLS(): Promise<void> {
    await this.$executeRaw`SELECT set_config('app.bypass_rls', 'true', true)`;
  }

  /**
   * Disables RLS bypass after system operations complete.
   */
  async disableBypassRLS(): Promise<void> {
    await this.$executeRaw`SELECT set_config('app.bypass_rls', 'false', true)`;
  }

  /**
   * Executes a callback with RLS bypassed, then re-enables RLS.
   * Ensures bypass is always disabled even if callback throws.
   *
   * SECURITY: If disableBypassRLS() fails, the connection pool is destroyed
   * to prevent tainted connections (with bypass_rls=true) from being reused.
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
        throw error; // Re-throw so caller knows the operation had a critical failure
      }
    }
  }
}
