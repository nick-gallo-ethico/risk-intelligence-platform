import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { UserTableService, TABLE_DELIVERY_QUEUE } from "./user-table.service";
import { UserTableController } from "./user-table.controller";
import { ReportingModule } from "../reporting/reporting.module";

/**
 * Tables Module
 *
 * Provides user-created custom data tables (RS.48).
 *
 * Features:
 * - User table CRUD operations
 * - Query execution with dynamic Prisma queries
 * - Export to CSV, Excel, PDF
 * - Scheduled delivery via BullMQ
 * - Sharing controls (private, team, org-wide)
 *
 * Dependencies:
 * - PrismaModule (database access)
 * - ReportingModule (export service, query builder)
 * - AuditModule (audit logging)
 * - JobsModule (delivery queue)
 */
@Module({
  imports: [
    // Import ReportingModule for export infrastructure
    ReportingModule,
    // Register the table delivery queue
    BullModule.registerQueue({
      name: TABLE_DELIVERY_QUEUE,
    }),
  ],
  controllers: [UserTableController],
  providers: [UserTableService],
  exports: [UserTableService],
})
export class TablesModule {}
