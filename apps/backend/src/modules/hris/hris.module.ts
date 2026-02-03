import { Module } from "@nestjs/common";
import { HrisSyncService } from "./hris-sync.service";
import { MergeClientService } from "./merge-client.service";
import { PersonsModule } from "../persons/persons.module";
import { PrismaModule } from "../prisma/prisma.module";

/**
 * HrisModule provides HRIS integration via Merge.dev unified API.
 *
 * Features:
 * - MergeClientService: Direct API client for Merge.dev HRIS endpoints
 * - HrisSyncService: Orchestrates Employee → Person sync with manager ordering
 *
 * The sync process:
 * 1. Fetches employees from connected HRIS via Merge.dev
 * 2. Creates/updates Employee records in our database
 * 3. Creates/updates corresponding Person records for pattern detection
 * 4. Maintains manager hierarchy via topological sort
 *
 * Key Properties:
 * - Idempotent syncs (running twice produces same result)
 * - Respects manual edits on Person records
 * - Error resilient (collects errors without stopping)
 *
 * Exports both services for use by other modules (e.g., scheduled jobs).
 */
@Module({
  imports: [PersonsModule, PrismaModule],
  providers: [HrisSyncService, MergeClientService],
  exports: [HrisSyncService, MergeClientService],
})
export class HrisModule {}
