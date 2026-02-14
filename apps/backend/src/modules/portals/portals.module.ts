/**
 * PortalsModule - Unified Portal Module
 *
 * Parent module that aggregates all portal sub-modules:
 *
 * 1. EmployeePortalModule - Employee self-service portal
 *    - Unified "My Tasks" view
 *    - Attestation and disclosure completion
 *    - Remediation step tracking
 *
 * 2. OperatorPortalModule - Ethico internal hotline console
 *    - Client lookup by phone number
 *    - Directive/script management
 *    - QA workflow support
 *
 * 3. EthicsPortalModule - Public ethics reporting portal
 *    - Anonymous report submission
 *    - Category and form configuration
 *    - Access code status checking and messaging
 *
 * Import this single module in AppModule to enable all portal features.
 */
import { Module } from "@nestjs/common";
import { EmployeePortalModule } from "./employee/employee-portal.module";
import { OperatorPortalModule } from "./operator/operator-portal.module";
import { EthicsPortalModule } from "./ethics/ethics-portal.module";

@Module({
  imports: [EmployeePortalModule, OperatorPortalModule, EthicsPortalModule],
  exports: [EmployeePortalModule, OperatorPortalModule, EthicsPortalModule],
})
export class PortalsModule {}
