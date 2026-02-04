/**
 * EmployeePortalModule - Employee Self-Service Portal
 *
 * Provides the employee-facing portal functionality:
 * - Unified task management (attestations, disclosures, remediation, follow-ups)
 * - Task completion workflows
 * - Badge counts for pending/overdue items
 *
 * This module aggregates tasks from multiple sources (campaigns, remediation plans)
 * into a single "My Tasks" view for employees.
 */
import { Module } from '@nestjs/common';
import { EmployeeTasksService } from './employee-tasks.service';
import { EmployeePortalController } from './employee-portal.controller';

@Module({
  controllers: [EmployeePortalController],
  providers: [EmployeeTasksService],
  exports: [EmployeeTasksService],
})
export class EmployeePortalModule {}
