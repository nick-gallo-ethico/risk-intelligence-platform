import { Module } from "@nestjs/common";
import { MigrationService } from "./migration.service";
import { PrismaModule } from "../../prisma/prisma.module";

/**
 * MigrationModule provides data import capabilities for competitor system migrations.
 * Supports NAVEX, EQS, Legacy Ethico, and generic CSV imports.
 */
@Module({
  imports: [PrismaModule],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class MigrationModule {}
