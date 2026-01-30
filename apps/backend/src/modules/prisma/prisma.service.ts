import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
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
   */
  async withBypassRLS<T>(callback: () => Promise<T>): Promise<T> {
    await this.enableBypassRLS();
    try {
      return await callback();
    } finally {
      await this.disableBypassRLS();
    }
  }
}
