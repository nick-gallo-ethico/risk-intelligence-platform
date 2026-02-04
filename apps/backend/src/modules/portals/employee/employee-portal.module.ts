/**
 * EmployeePortalModule - Employee Self-Service Portal
 *
 * Provides the employee-facing portal functionality:
 * - Unified task management (attestations, disclosures, remediation, follow-ups)
 * - History views (my reports, disclosures, attestations)
 * - Compliance overview with score
 * - Manager proxy reporting for team members
 *
 * This module aggregates data from multiple sources (campaigns, remediation plans, RIUs)
 * into a unified employee experience.
 */
import { Module } from '@nestjs/common';
import { EmployeeTasksService } from './employee-tasks.service';
import { EmployeeHistoryService } from './employee-history.service';
import { ManagerProxyService } from './manager-proxy.service';
import { EmployeePortalController } from './employee-portal.controller';

@Module({
  controllers: [EmployeePortalController],
  providers: [
    EmployeeTasksService,
    EmployeeHistoryService,
    ManagerProxyService,
  ],
  exports: [
    EmployeeTasksService,
    EmployeeHistoryService,
    ManagerProxyService,
  ],
})
export class EmployeePortalModule {}
