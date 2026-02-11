/**
 * ReportModule - NestJS module for the report system
 *
 * Provides:
 * - ReportController: REST API endpoints for report operations
 * - ReportService: CRUD operations for saved reports
 * - ReportExecutionService: Query execution engine
 * - ReportFieldRegistryService: Field discovery for report designer
 *
 * Dependencies:
 * - PrismaModule: Database access
 * - AuditModule: Activity logging
 * - AiQueryModule: Natural language to report generation
 */

import { Module, forwardRef } from "@nestjs/common";
import { ReportController } from "./report.controller";
import { ReportService } from "./report.service";
import { ReportExecutionService } from "./report-execution.service";
import { ReportFieldRegistryService } from "./report-field-registry.service";
import { AiQueryModule } from "../ai-query/ai-query.module";

@Module({
  imports: [
    // AiQueryModule provides AiQueryService for natural language report generation
    forwardRef(() => AiQueryModule),
  ],
  controllers: [ReportController],
  providers: [
    ReportService,
    ReportExecutionService,
    ReportFieldRegistryService,
  ],
  exports: [ReportService, ReportFieldRegistryService],
})
export class ReportModule {}
