import { Module } from "@nestjs/common";
import { MigrationService } from "./migration.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { NavexConnector } from "./connectors/navex.connector";
import { EqsConnector } from "./connectors/eqs.connector";
import { CsvConnector } from "./connectors/csv.connector";

/**
 * MigrationModule provides data import capabilities for competitor system migrations.
 * Supports NAVEX, EQS, Legacy Ethico, and generic CSV imports.
 */
@Module({
  imports: [PrismaModule],
  providers: [MigrationService, NavexConnector, EqsConnector, CsvConnector],
  exports: [MigrationService, NavexConnector, EqsConnector, CsvConnector],
})
export class MigrationModule {}
