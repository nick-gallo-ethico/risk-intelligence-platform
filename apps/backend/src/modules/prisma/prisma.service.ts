import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

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
    await this.$executeRawUnsafe(
      `SET LOCAL app.current_organization = '${organizationId}'`,
    );
  }

  /**
   * Clears the tenant context. Called at the end of requests.
   */
  async clearTenantContext(): Promise<void> {
    await this.$executeRawUnsafe(`RESET app.current_organization`);
  }
}
