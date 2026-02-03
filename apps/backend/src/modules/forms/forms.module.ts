import { Module } from '@nestjs/common';
import { FormSchemaService } from './form-schema.service';
import { FormValidationService } from './form-validation.service';
import { FormSubmissionService } from './form-submission.service';
import { FormsController } from './forms.controller';

/**
 * FormsModule provides the dynamic form engine for the platform.
 *
 * This module powers:
 * - Intake forms (web form submissions)
 * - Disclosure forms (COI, gifts, outside employment)
 * - Attestation forms (policy acknowledgment)
 * - Survey forms (compliance surveys)
 * - Workflow task forms (embedded in workflow steps)
 *
 * Key features:
 * - JSON Schema-based form definitions
 * - Ajv validation with custom formats
 * - Form versioning for historical accuracy
 * - Anonymous submission support with access codes
 * - Conditional field requirements
 *
 * Exports:
 * - FormSchemaService: Form definition CRUD and publishing
 * - FormValidationService: JSON Schema validation
 * - FormSubmissionService: Submission handling
 */
@Module({
  providers: [FormSchemaService, FormValidationService, FormSubmissionService],
  controllers: [FormsController],
  exports: [FormSchemaService, FormValidationService, FormSubmissionService],
})
export class FormsModule {}
