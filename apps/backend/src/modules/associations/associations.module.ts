import { Module } from '@nestjs/common';
import { PersonCaseAssociationService } from './person-case/person-case-association.service';
import { PersonRiuAssociationService } from './person-riu/person-riu-association.service';
import { CaseCaseAssociationService } from './case-case/case-case-association.service';
import { PersonPersonAssociationService } from './person-person/person-person-association.service';

/**
 * AssociationsModule provides first-class association entities per HubSpot V4 pattern.
 *
 * Per CONTEXT.md decisions, associations are first-class entities with:
 * - Labels defining the relationship type
 * - Status fields (for evidentiary associations)
 * - Validity periods (for role associations)
 * - Audit trail via createdBy and AuditLog
 *
 * Services:
 * - PersonCaseAssociationService: Person-to-Case with role labels
 *   - Evidentiary (REPORTER, SUBJECT, WITNESS) use status field
 *   - Roles (INVESTIGATOR, COUNSEL) use validity periods
 *
 * - PersonRiuAssociationService: Person-to-RIU for intake mentions
 *   - Tracks who is mentioned in immutable RIU records
 *
 * - CaseCaseAssociationService: Case-to-Case for hierarchy/splits
 *   - PARENT/CHILD, SPLIT_FROM/SPLIT_TO, MERGED_INTO, etc.
 *
 * - PersonPersonAssociationService: Person-to-Person for relationships
 *   - Sources: HRIS, DISCLOSURE, INVESTIGATION, MANUAL
 *   - Used for COI detection
 */
@Module({
  providers: [
    PersonCaseAssociationService,
    PersonRiuAssociationService,
    CaseCaseAssociationService,
    PersonPersonAssociationService,
  ],
  exports: [
    PersonCaseAssociationService,
    PersonRiuAssociationService,
    CaseCaseAssociationService,
    PersonPersonAssociationService,
  ],
})
export class AssociationsModule {}
