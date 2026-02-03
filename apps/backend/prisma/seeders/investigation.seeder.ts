/**
 * Investigation Seeder
 *
 * Creates ~5,000 Investigations for the seeded Cases.
 * Investigations represent the formal review process for each case.
 *
 * Features:
 * - Every OPEN and CLOSED case gets at least one investigation
 * - ~10% of healthcare cases get additional REGULATORY investigation
 * - Status progression based on case status
 * - 60% substantiation rate on closed investigations
 * - CCO escalation on ~5% of cases
 * - External party involvement on ~4% of cases
 * - Mid-investigation reassignment on ~10% of cases
 * - Realistic timelines aligned with case durations
 */

import {
  PrismaClient,
  CaseStatus,
  InvestigationStatus,
  InvestigationType,
  InvestigationDepartment,
  InvestigationOutcome,
  SlaStatus,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { addDays, addHours, subDays } from 'date-fns';
import { SEED_CONFIG } from './config';
import {
  weightedRandom,
  chance,
  randomInt,
  pickRandom,
  DEMO_CURRENT_DATE,
} from './utils';

// Seed offset for investigations (masterSeed + 3500)
const SEED_OFFSET = 3500;

// Batch size for database inserts
const BATCH_SIZE = 100;

// ============================================
// Distribution Configuration
// ============================================

/**
 * Investigation type distribution
 * FULL: 55%, LIMITED: 30%, INQUIRY: 10%, (REGULATORY: added separately)
 */
const INVESTIGATION_TYPE_DISTRIBUTION = [
  { value: InvestigationType.FULL, weight: 55 },
  { value: InvestigationType.LIMITED, weight: 30 },
  { value: InvestigationType.INQUIRY, weight: 15 },
];

/**
 * Investigation department distribution
 * HR: 35%, LEGAL: 25%, COMPLIANCE: 20%, SAFETY: 10%, OTHER: 10%
 */
const DEPARTMENT_DISTRIBUTION = [
  { value: InvestigationDepartment.HR, weight: 35 },
  { value: InvestigationDepartment.LEGAL, weight: 25 },
  { value: InvestigationDepartment.COMPLIANCE, weight: 20 },
  { value: InvestigationDepartment.SAFETY, weight: 10 },
  { value: InvestigationDepartment.OTHER, weight: 10 },
];

/**
 * Investigation outcome distribution (60% substantiation rate)
 * SUBSTANTIATED: 60%, UNSUBSTANTIATED: 30%, INCONCLUSIVE: 10%
 */
const OUTCOME_DISTRIBUTION = [
  { value: InvestigationOutcome.SUBSTANTIATED, weight: 60 },
  { value: InvestigationOutcome.UNSUBSTANTIATED, weight: 30 },
  { value: InvestigationOutcome.INCONCLUSIVE, weight: 10 },
];

/**
 * Open investigation status distribution
 */
const OPEN_STATUS_DISTRIBUTION = [
  { value: InvestigationStatus.NEW, weight: 10 },
  { value: InvestigationStatus.ASSIGNED, weight: 20 },
  { value: InvestigationStatus.INVESTIGATING, weight: 50 },
  { value: InvestigationStatus.PENDING_REVIEW, weight: 15 },
  { value: InvestigationStatus.ON_HOLD, weight: 5 },
];

// ============================================
// Investigation Record Interface
// ============================================

interface InvestigationRecord {
  id: string;
  caseId: string;
  organizationId: string;
  investigationNumber: number;
  categoryId: string | null;
  investigationType: InvestigationType;
  department: InvestigationDepartment | null;
  assignedTo: string[];
  primaryInvestigatorId: string | null;
  assignedAt: Date | null;
  assignedById: string | null;
  assignmentHistory: Record<string, unknown> | null;
  status: InvestigationStatus;
  statusRationale: string | null;
  statusChangedAt: Date | null;
  dueDate: Date | null;
  slaStatus: SlaStatus;
  findingsSummary: string | null;
  findingsDetail: string | null;
  outcome: InvestigationOutcome | null;
  rootCause: string | null;
  lessonsLearned: string | null;
  findingsDate: Date | null;
  closedAt: Date | null;
  closedById: string | null;
  closureApprovedById: string | null;
  closureApprovedAt: Date | null;
  closureNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  updatedById: string;
}

// ============================================
// Findings Generation
// ============================================

const FINDINGS_SUMMARIES: Record<InvestigationOutcome, string[]> = {
  [InvestigationOutcome.SUBSTANTIATED]: [
    'Investigation found sufficient evidence to support the allegations.',
    'Witness statements and documentary evidence corroborate the reported concerns.',
    'Analysis confirms policy violations occurred as described.',
    'Preponderance of evidence supports the complaint.',
    'Investigation substantiated the primary allegations with clear documentation.',
  ],
  [InvestigationOutcome.UNSUBSTANTIATED]: [
    'Investigation did not find sufficient evidence to support the allegations.',
    'Available evidence does not corroborate the reported concerns.',
    'Witness accounts conflict with the reported narrative.',
    'No policy violations were identified during the investigation.',
    'Insufficient evidence to conclude that the alleged conduct occurred.',
  ],
  [InvestigationOutcome.INCONCLUSIVE]: [
    'Investigation could not definitively determine whether the alleged conduct occurred.',
    'Conflicting accounts from witnesses prevent a definitive conclusion.',
    'Evidence is insufficient to support or refute the allegations.',
    'Due to passage of time, key evidence is no longer available.',
    'Parties provided contradictory statements that could not be reconciled.',
  ],
  [InvestigationOutcome.POLICY_VIOLATION]: [
    'Investigation confirmed a policy violation occurred.',
    'Evidence clearly establishes a violation of company policy.',
    'The reported conduct constitutes a policy violation.',
    'Policy violation confirmed with documented evidence.',
    'Investigation substantiated the policy violation allegation.',
  ],
  [InvestigationOutcome.NO_VIOLATION]: [
    'Investigation found no policy violation occurred.',
    'The reported conduct does not constitute a policy violation.',
    'No violation of company policy was identified.',
    'Evidence does not support a finding of policy violation.',
    'Investigation determined no policy violation took place.',
  ],
  [InvestigationOutcome.INSUFFICIENT_EVIDENCE]: [
    'Insufficient evidence to make a determination.',
    'Available evidence is not sufficient to reach a conclusion.',
    'More evidence would be needed to substantiate the allegations.',
    'The investigation was unable to gather sufficient evidence.',
    'Due to lack of evidence, no determination could be made.',
  ],
};

const ROOT_CAUSES = [
  'Lack of clear policy communication',
  'Insufficient management oversight',
  'Inadequate training on expectations',
  'Cultural issues within the team',
  'Pressure to meet performance targets',
  'Breakdown in communication channels',
  'Ambiguous reporting structure',
  'Resource constraints leading to shortcuts',
  'Failure to address prior warning signs',
  'Insufficient documentation of expectations',
];

const LESSONS_LEARNED = [
  'Enhanced training required for all team members.',
  'Policy clarification needed in employee handbook.',
  'Management coaching recommended.',
  'Regular compliance check-ins to be implemented.',
  'Anonymous feedback mechanism to be strengthened.',
  'Escalation procedures to be reviewed and updated.',
  'Communication protocols to be reinforced.',
  'Workload assessment recommended for affected team.',
  'Conflict resolution training to be provided.',
  'Regular one-on-ones between managers and direct reports.',
];

const CLOSURE_NOTES = [
  'All investigation steps completed per protocol.',
  'Documentation archived per retention policy.',
  'Relevant parties notified of outcome.',
  'Remediation plan implemented and verified.',
  'Follow-up scheduled for 90 days.',
  'No further action required at this time.',
  'Matter referred to appropriate department for action.',
  'Training completion verified.',
  'Policy acknowledgment obtained.',
  'Case closed with no outstanding items.',
];

/**
 * Generate findings for a closed investigation
 */
function generateFindings(
  outcome: InvestigationOutcome,
): {
  findingsSummary: string;
  findingsDetail: string;
  rootCause: string | null;
  lessonsLearned: string | null;
  closureNotes: string;
} {
  const summaries: string[] = FINDINGS_SUMMARIES[outcome] || FINDINGS_SUMMARIES[InvestigationOutcome.INCONCLUSIVE];
  const findingsSummary: string = pickRandom(summaries);

  // Generate detailed findings
  const findingsDetail: string = `${findingsSummary}\n\n` +
    `Key findings from the investigation:\n` +
    `- ${faker.lorem.sentence()}\n` +
    `- ${faker.lorem.sentence()}\n` +
    `- ${faker.lorem.sentence()}\n\n` +
    `${faker.lorem.paragraph()}`;

  // Substantiated cases get root cause and lessons learned
  const rootCause: string | null = outcome === InvestigationOutcome.SUBSTANTIATED
    ? pickRandom(ROOT_CAUSES)
    : null;

  const lessonsLearned: string | null = outcome === InvestigationOutcome.SUBSTANTIATED
    ? pickRandom(LESSONS_LEARNED)
    : null;

  const closureNotes: string = pickRandom(CLOSURE_NOTES);

  return {
    findingsSummary,
    findingsDetail,
    rootCause,
    lessonsLearned,
    closureNotes,
  };
}

// ============================================
// Status Rationale Generation
// ============================================

const STATUS_RATIONALES = {
  [InvestigationStatus.NEW]: [
    'Case received and pending initial review.',
    'Awaiting assignment to investigator.',
    'Preliminary assessment in progress.',
  ],
  [InvestigationStatus.ASSIGNED]: [
    'Assigned to investigator for review.',
    'Investigation plan being developed.',
    'Initial document collection underway.',
  ],
  [InvestigationStatus.INVESTIGATING]: [
    'Active investigation in progress.',
    'Witness interviews scheduled.',
    'Evidence review ongoing.',
    'Document analysis in progress.',
  ],
  [InvestigationStatus.PENDING_REVIEW]: [
    'Investigation complete, awaiting management review.',
    'Findings drafted, pending approval.',
    'Quality review in progress.',
  ],
  [InvestigationStatus.ON_HOLD]: [
    'Awaiting response from key witness.',
    'Pending legal guidance.',
    'Related matter under review.',
    'Temporary hold per management request.',
  ],
  [InvestigationStatus.CLOSED]: [
    'Investigation complete.',
    'All findings documented and approved.',
    'Matter resolved.',
  ],
};

// ============================================
// Main Seeder Function
// ============================================

export interface CaseDataForInvestigation {
  id: string;
  status: CaseStatus;
  createdAt: Date;
  categoryId: string | null;
  priority: string;
  isFlagship: boolean;
}

/**
 * Seed Investigations for a demo tenant
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID
 * @param caseData - Array of case data for creating investigations
 * @param userIds - Array of user IDs for assignment
 */
export async function seedInvestigations(
  prisma: PrismaClient,
  organizationId: string,
  caseData: CaseDataForInvestigation[],
  userIds: string[],
): Promise<void> {
  // Initialize faker with deterministic seed
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  const investigationBatch: InvestigationRecord[] = [];
  let totalInvestigations = 0;
  let regulatoryCount = 0;
  let escalationCount = 0;
  let externalPartyCount = 0;
  let reassignmentCount = 0;

  console.log(`  Generating investigations for ${caseData.length} cases...`);

  for (let caseIndex = 0; caseIndex < caseData.length; caseIndex++) {
    // Progress logging
    if (caseIndex > 0 && caseIndex % 500 === 0) {
      console.log(`    Progress: ${caseIndex}/${caseData.length} cases processed...`);
    }

    const caseInfo = caseData[caseIndex];
    const isOpenCase = caseInfo.status === CaseStatus.NEW || caseInfo.status === CaseStatus.OPEN;

    // Skip NEW cases with 50% probability (they may not have investigations yet)
    if (caseInfo.status === CaseStatus.NEW && chance(0.5)) {
      continue;
    }

    // Determine number of investigations for this case
    let investigationCount = 1;

    // ~10% of healthcare-related cases get additional regulatory investigation
    // Use category ID presence as proxy for healthcare (would need category lookup for full implementation)
    if (caseInfo.categoryId && chance(0.10)) {
      investigationCount = 2;
      regulatoryCount++;
    }

    // Flagship cases with multiple investigations
    if (caseInfo.isFlagship && chance(0.3)) {
      investigationCount = Math.max(investigationCount, 2);
    }

    // Create investigations for this case
    for (let invNum = 1; invNum <= investigationCount; invNum++) {
      const investigationId = faker.string.uuid();
      totalInvestigations++;

      // Determine investigation type
      const isRegulatory = invNum > 1;
      const investigationType = isRegulatory
        ? InvestigationType.FULL // Regulatory investigations are always FULL
        : weightedRandom(INVESTIGATION_TYPE_DISTRIBUTION);

      // Determine department
      const department = isRegulatory
        ? InvestigationDepartment.COMPLIANCE
        : weightedRandom(DEPARTMENT_DISTRIBUTION);

      // Determine status based on case status
      let status: InvestigationStatus;
      if (isOpenCase) {
        status = weightedRandom(OPEN_STATUS_DISTRIBUTION);
      } else {
        status = InvestigationStatus.CLOSED;
      }

      // Assign investigators
      const investigatorCount = randomInt(1, 3);
      const assignedTo = faker.helpers.arrayElements(userIds, investigatorCount);
      const primaryInvestigatorId = assignedTo[0] || null;

      // Calculate timeline
      const createdAt = caseInfo.createdAt;
      const assignedAt = status !== InvestigationStatus.NEW
        ? addDays(createdAt, randomInt(1, 3))
        : null;

      // Due date: 30-60 days from assignment
      const dueDate = assignedAt
        ? addDays(assignedAt, randomInt(30, 60))
        : null;

      // Status changed at
      let statusChangedAt: Date | null = null;
      if (status === InvestigationStatus.ASSIGNED && assignedAt) {
        statusChangedAt = assignedAt;
      } else if (status === InvestigationStatus.INVESTIGATING && assignedAt) {
        statusChangedAt = addDays(assignedAt, randomInt(1, 5));
      } else if (status === InvestigationStatus.PENDING_REVIEW && assignedAt) {
        statusChangedAt = addDays(assignedAt, randomInt(10, 30));
      }

      // SLA status based on due date
      let slaStatus: SlaStatus = SlaStatus.ON_TRACK;
      if (dueDate && status !== InvestigationStatus.CLOSED) {
        const daysUntilDue = Math.floor((dueDate.getTime() - DEMO_CURRENT_DATE.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue < 0) {
          slaStatus = 'OVERDUE' as SlaStatus;
        } else if (daysUntilDue < 7) {
          slaStatus = 'WARNING' as SlaStatus;
        }
      }

      // Closure details for closed investigations
      let closedAt: Date | null = null;
      let closedById: string | null = null;
      let outcome: InvestigationOutcome | null = null;
      let findingsSummary: string | null = null;
      let findingsDetail: string | null = null;
      let rootCause: string | null = null;
      let lessonsLearned: string | null = null;
      let closureNotes: string | null = null;
      let findingsDate: Date | null = null;
      let closureApprovedById: string | null = null;
      let closureApprovedAt: Date | null = null;

      if (status === InvestigationStatus.CLOSED) {
        // Determine outcome with 60% substantiation rate
        outcome = weightedRandom(OUTCOME_DISTRIBUTION);

        // Generate findings
        const findings = generateFindings(outcome);
        findingsSummary = findings.findingsSummary;
        findingsDetail = findings.findingsDetail;
        rootCause = findings.rootCause;
        lessonsLearned = findings.lessonsLearned;
        closureNotes = findings.closureNotes;

        // Calculate closure timeline
        // Duration based on case priority (critical/high faster, complex longer)
        let durationDays: number;
        if (caseInfo.priority === 'CRITICAL') {
          durationDays = randomInt(5, 15);
        } else if (caseInfo.priority === 'HIGH') {
          durationDays = randomInt(7, 21);
        } else if (caseInfo.priority === 'MEDIUM') {
          durationDays = randomInt(10, 30);
        } else {
          durationDays = randomInt(14, 45);
        }

        findingsDate = addDays(createdAt, Math.floor(durationDays * 0.8));
        closedAt = addDays(createdAt, durationDays);

        // Ensure closed date is not in the future
        if (closedAt > DEMO_CURRENT_DATE) {
          closedAt = subDays(DEMO_CURRENT_DATE, randomInt(1, 30));
          findingsDate = subDays(closedAt, randomInt(1, 5));
        }

        statusChangedAt = closedAt;
        closedById = primaryInvestigatorId;
        closureApprovedById = pickRandom(userIds);
        closureApprovedAt = addHours(closedAt, randomInt(1, 24));
      }

      // Status rationale
      const statusRationale = pickRandom(STATUS_RATIONALES[status] || STATUS_RATIONALES[InvestigationStatus.INVESTIGATING]);

      // Get user IDs for created/updated
      const createdById = pickRandom(userIds);
      const updatedById = status === InvestigationStatus.CLOSED ? closedById || createdById : createdById;
      const assignedById = assignedAt ? pickRandom(userIds) : null;

      // Assignment history (for reassignment tracking)
      let assignmentHistory: Record<string, unknown> | null = null;

      // ~10% of open/recent closed cases show mid-investigation reassignment
      if ((isOpenCase || (closedAt && DEMO_CURRENT_DATE.getTime() - closedAt.getTime() < 30 * 24 * 60 * 60 * 1000)) && chance(0.10)) {
        reassignmentCount++;
        const previousInvestigatorId = pickRandom(userIds.filter((id) => id !== primaryInvestigatorId));
        const reassignedAt = assignedAt ? addDays(assignedAt, randomInt(3, 14)) : null;
        assignmentHistory = {
          reassignments: [{
            from: previousInvestigatorId,
            to: primaryInvestigatorId,
            reassignedAt: reassignedAt?.toISOString(),
            reason: pickRandom([
              'Workload balancing',
              'Conflict of interest identified',
              'Investigator on leave',
              'Subject matter expertise needed',
              'Manager reassignment',
            ]),
          }],
        };
      }

      investigationBatch.push({
        id: investigationId,
        caseId: caseInfo.id,
        organizationId,
        investigationNumber: invNum,
        categoryId: caseInfo.categoryId,
        investigationType,
        department,
        assignedTo,
        primaryInvestigatorId,
        assignedAt,
        assignedById,
        assignmentHistory,
        status,
        statusRationale,
        statusChangedAt,
        dueDate,
        slaStatus,
        findingsSummary,
        findingsDetail,
        outcome,
        rootCause,
        lessonsLearned,
        findingsDate,
        closedAt,
        closedById,
        closureApprovedById,
        closureApprovedAt,
        closureNotes,
        createdAt,
        updatedAt: closedAt || statusChangedAt || createdAt,
        createdById,
        updatedById,
      });

      // Flush batch if full
      if (investigationBatch.length >= BATCH_SIZE) {
        await flushInvestigationBatch(prisma, investigationBatch);
        investigationBatch.length = 0;
      }
    }
  }

  // Final flush
  if (investigationBatch.length > 0) {
    await flushInvestigationBatch(prisma, investigationBatch);
  }

  // Calculate outcome distribution
  const closedInvestigations = await prisma.investigation.count({
    where: { organizationId, status: InvestigationStatus.CLOSED },
  });
  const substantiatedCount = await prisma.investigation.count({
    where: { organizationId, outcome: InvestigationOutcome.SUBSTANTIATED },
  });
  const substantiationRate = closedInvestigations > 0
    ? Math.round((substantiatedCount / closedInvestigations) * 100)
    : 0;

  console.log(`  Created ${totalInvestigations} Investigations`);
  console.log(`    - Regulatory investigations: ${regulatoryCount}`);
  console.log(`    - With reassignments: ${reassignmentCount}`);
  console.log(`    - Substantiation rate: ${substantiationRate}% (target: ~60%)`);
}

/**
 * Flush investigation batch to database
 */
async function flushInvestigationBatch(
  prisma: PrismaClient,
  batch: InvestigationRecord[],
): Promise<void> {
  if (batch.length === 0) return;

  await prisma.investigation.createMany({
    data: batch.map((inv) => ({
      id: inv.id,
      caseId: inv.caseId,
      organizationId: inv.organizationId,
      investigationNumber: inv.investigationNumber,
      categoryId: inv.categoryId,
      investigationType: inv.investigationType,
      department: inv.department,
      assignedTo: inv.assignedTo,
      primaryInvestigatorId: inv.primaryInvestigatorId,
      assignedAt: inv.assignedAt,
      assignedById: inv.assignedById,
      assignmentHistory: inv.assignmentHistory ? JSON.parse(JSON.stringify(inv.assignmentHistory)) : undefined,
      status: inv.status,
      statusRationale: inv.statusRationale,
      statusChangedAt: inv.statusChangedAt,
      dueDate: inv.dueDate,
      slaStatus: inv.slaStatus,
      findingsSummary: inv.findingsSummary,
      findingsDetail: inv.findingsDetail,
      outcome: inv.outcome,
      rootCause: inv.rootCause,
      lessonsLearned: inv.lessonsLearned,
      findingsDate: inv.findingsDate,
      closedAt: inv.closedAt,
      closedById: inv.closedById,
      closureApprovedById: inv.closureApprovedById,
      closureApprovedAt: inv.closureApprovedAt,
      closureNotes: inv.closureNotes,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
      createdById: inv.createdById,
      updatedById: inv.updatedById,
    })),
    skipDuplicates: true,
  });
}

/**
 * Get investigation statistics for demo metrics
 */
export async function getInvestigationStats(
  prisma: PrismaClient,
  organizationId: string,
): Promise<{
  total: number;
  open: number;
  closed: number;
  substantiated: number;
  unsubstantiated: number;
  inconclusive: number;
  substantiationRate: number;
  avgDuration: number;
}> {
  const total = await prisma.investigation.count({ where: { organizationId } });
  const open = await prisma.investigation.count({
    where: {
      organizationId,
      status: { not: InvestigationStatus.CLOSED },
    },
  });
  const closed = await prisma.investigation.count({
    where: { organizationId, status: InvestigationStatus.CLOSED },
  });
  const substantiated = await prisma.investigation.count({
    where: { organizationId, outcome: InvestigationOutcome.SUBSTANTIATED },
  });
  const unsubstantiated = await prisma.investigation.count({
    where: { organizationId, outcome: InvestigationOutcome.UNSUBSTANTIATED },
  });
  const inconclusive = await prisma.investigation.count({
    where: { organizationId, outcome: InvestigationOutcome.INCONCLUSIVE },
  });

  const substantiationRate = closed > 0 ? Math.round((substantiated / closed) * 100) : 0;

  // Calculate average duration for closed investigations
  const closedInvestigations = await prisma.investigation.findMany({
    where: { organizationId, status: InvestigationStatus.CLOSED },
    select: { createdAt: true, closedAt: true },
  });

  let totalDuration = 0;
  let durationCount = 0;
  for (const inv of closedInvestigations) {
    if (inv.closedAt) {
      const duration = Math.floor((inv.closedAt.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      totalDuration += duration;
      durationCount++;
    }
  }
  const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

  return {
    total,
    open,
    closed,
    substantiated,
    unsubstantiated,
    inconclusive,
    substantiationRate,
    avgDuration,
  };
}
