/**
 * Workflow Instance Seeder
 *
 * Seeds ~20 active WorkflowInstance records to demonstrate workflows in progress.
 * Creates draft policies with active approval workflows for demo scenarios.
 *
 * Features:
 * - 5 Policy approval workflows at various stages
 * - 10 Case routing workflows in progress
 * - 5 Disclosure review workflows pending
 * - Realistic stepStates JSON with completion timestamps
 * - Links to existing templates and entities
 *
 * Usage:
 *   import { seedWorkflowInstances } from './workflow-instance.seeder';
 *   await seedWorkflowInstances(prisma, organizationId);
 */

import {
  PrismaClient,
  WorkflowEntityType,
  WorkflowInstanceStatus,
  PolicyStatus,
  PolicyType,
  CaseStatus,
  SlaStatus,
  RiuType,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { subDays, addDays } from 'date-fns';
import { SEED_CONFIG } from './config';
import { randomInt } from './utils';

// Seed offset for workflow instances
const SEED_OFFSET = 8000;

// Batch size for database inserts
const BATCH_SIZE = 100;

// Demo reference date
const DEMO_CURRENT_DATE = SEED_CONFIG.currentDate;

// ===========================================
// Draft Policy Definitions for Workflows
// ===========================================

interface DraftPolicyDefinition {
  title: string;
  slug: string;
  description: string;
  workflowStage: string;
  workflowStep?: string;
  daysAgo: number; // When workflow started
}

const DRAFT_POLICIES: DraftPolicyDefinition[] = [
  {
    title: 'Updated Code of Conduct v2.1',
    slug: 'code-of-conduct-v2-1-draft',
    description: 'Annual update to the Code of Conduct incorporating new remote work guidelines and AI usage policies.',
    workflowStage: 'policy_review',
    workflowStep: 'awaiting_reviewer',
    daysAgo: 5,
  },
  {
    title: 'New Remote Work Policy',
    slug: 'remote-work-policy-draft',
    description: 'Comprehensive policy governing hybrid and remote work arrangements, equipment, and expectations.',
    workflowStage: 'legal_review',
    workflowStep: 'legal_assessment',
    daysAgo: 8,
  },
  {
    title: 'Anti-Harassment Policy Update',
    slug: 'anti-harassment-update-draft',
    description: 'Updated anti-harassment policy with expanded definitions and reporting mechanisms.',
    workflowStage: 'final_approval',
    workflowStep: 'cco_review',
    daysAgo: 12,
  },
  {
    title: 'Expense Reimbursement Guidelines',
    slug: 'expense-guidelines-draft',
    description: 'Revised expense policy with updated per diem rates and digital receipt requirements.',
    workflowStage: 'draft',
    workflowStep: 'author_revision',
    daysAgo: 3,
  },
  {
    title: 'Data Privacy Policy v3',
    slug: 'data-privacy-v3-draft',
    description: 'Major update to data privacy policy for GDPR compliance and new AI data handling requirements.',
    workflowStage: 'compliance_review',
    workflowStep: 'department_assessment',
    daysAgo: 10,
  },
];

// ===========================================
// Case Workflow Stage Distribution
// ===========================================

interface CaseWorkflowConfig {
  stage: string;
  step?: string;
  count: number;
  slaStatus: SlaStatus;
}

const CASE_WORKFLOW_STAGES: CaseWorkflowConfig[] = [
  { stage: 'triage', step: 'pending_assignment', count: 3, slaStatus: SlaStatus.ON_TRACK },
  { stage: 'investigation', step: 'in_progress', count: 4, slaStatus: SlaStatus.ON_TRACK },
  { stage: 'review', step: 'manager_review', count: 2, slaStatus: SlaStatus.WARNING },
  { stage: 'investigation', step: 'legal_hold', count: 1, slaStatus: SlaStatus.ON_TRACK },
];

// ===========================================
// Disclosure Workflow Stage Distribution
// ===========================================

interface DisclosureWorkflowConfig {
  stage: string;
  step?: string;
  count: number;
}

const DISCLOSURE_WORKFLOW_STAGES: DisclosureWorkflowConfig[] = [
  { stage: 'under_review', step: 'conflict_review', count: 3 },
  { stage: 'mitigation_required', step: 'manager_approval', count: 2 },
];

// ===========================================
// Step States Generation
// ===========================================

interface StepState {
  status: 'completed' | 'pending' | 'skipped' | 'in_progress';
  completedAt?: string;
  completedById?: string;
  assigneeId?: string;
  comment?: string;
}

type StepStates = Record<string, StepState>;

/**
 * Generate step states for a policy approval workflow
 */
function generatePolicyStepStates(
  currentStage: string,
  startedAt: Date,
  userIds: { authorId: string; reviewerId: string; ccoId: string },
): StepStates {
  const states: StepStates = {};

  // All policies start with author submission
  states['author_submit'] = {
    status: 'completed',
    completedAt: startedAt.toISOString(),
    completedById: userIds.authorId,
  };

  if (currentStage === 'draft') {
    // Returned for revision
    states['initial_review'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 1).toISOString(),
      completedById: userIds.reviewerId,
      comment: 'Please address the formatting issues in section 3.',
    };
    states['author_revision'] = {
      status: 'in_progress',
      assigneeId: userIds.authorId,
    };
    return states;
  }

  if (currentStage === 'policy_review' || currentStage === 'legal_review' ||
      currentStage === 'compliance_review' || currentStage === 'final_approval') {
    // Past initial submission
    states['initial_submission'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 1).toISOString(),
      completedById: userIds.authorId,
    };
  }

  if (currentStage === 'legal_review') {
    states['policy_review'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 3).toISOString(),
      completedById: userIds.reviewerId,
    };
    states['legal_review'] = {
      status: 'pending',
      assigneeId: userIds.reviewerId,
    };
  }

  if (currentStage === 'compliance_review') {
    states['policy_review'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 2).toISOString(),
      completedById: userIds.reviewerId,
    };
    states['legal_review'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 5).toISOString(),
      completedById: userIds.reviewerId,
    };
    states['compliance_review'] = {
      status: 'pending',
      assigneeId: userIds.ccoId,
    };
  }

  if (currentStage === 'final_approval') {
    states['policy_review'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 2).toISOString(),
      completedById: userIds.reviewerId,
    };
    states['legal_review'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 5).toISOString(),
      completedById: userIds.reviewerId,
    };
    states['compliance_review'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 8).toISOString(),
      completedById: userIds.ccoId,
    };
    states['cco_approval'] = {
      status: 'pending',
      assigneeId: userIds.ccoId,
    };
  }

  if (currentStage === 'policy_review') {
    states['policy_review'] = {
      status: 'pending',
      assigneeId: userIds.reviewerId,
    };
  }

  return states;
}

/**
 * Generate step states for a case investigation workflow
 */
function generateCaseStepStates(
  currentStage: string,
  startedAt: Date,
  userIds: { triageId: string; investigatorId: string; ccoId: string },
): StepStates {
  const states: StepStates = {};

  // Initial case creation
  states['case_created'] = {
    status: 'completed',
    completedAt: startedAt.toISOString(),
    completedById: userIds.triageId,
  };

  if (currentStage === 'new') {
    return states;
  }

  if (currentStage === 'triage' || currentStage === 'investigation' || currentStage === 'review') {
    states['begin_triage'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 1).toISOString(),
      completedById: userIds.triageId,
    };
  }

  if (currentStage === 'triage') {
    states['assign_investigator'] = {
      status: 'pending',
      assigneeId: userIds.triageId,
    };
    return states;
  }

  if (currentStage === 'investigation' || currentStage === 'review') {
    states['assign_investigator'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 2).toISOString(),
      completedById: userIds.triageId,
    };
    states['investigation_started'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 3).toISOString(),
      completedById: userIds.investigatorId,
    };
  }

  if (currentStage === 'investigation') {
    states['evidence_collection'] = {
      status: 'in_progress',
      assigneeId: userIds.investigatorId,
    };
    return states;
  }

  if (currentStage === 'review') {
    states['investigation_complete'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 10).toISOString(),
      completedById: userIds.investigatorId,
    };
    states['manager_review'] = {
      status: 'pending',
      assigneeId: userIds.ccoId,
    };
  }

  return states;
}

/**
 * Generate step states for a disclosure review workflow
 */
function generateDisclosureStepStates(
  currentStage: string,
  startedAt: Date,
  userIds: { submitterId: string; reviewerId: string },
): StepStates {
  const states: StepStates = {};

  states['disclosure_submitted'] = {
    status: 'completed',
    completedAt: startedAt.toISOString(),
    completedById: userIds.submitterId,
  };

  if (currentStage === 'submitted') {
    return states;
  }

  if (currentStage === 'under_review' || currentStage === 'mitigation_required') {
    states['begin_review'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 1).toISOString(),
      completedById: userIds.reviewerId,
    };
  }

  if (currentStage === 'under_review') {
    states['conflict_assessment'] = {
      status: 'in_progress',
      assigneeId: userIds.reviewerId,
    };
    return states;
  }

  if (currentStage === 'mitigation_required') {
    states['conflict_identified'] = {
      status: 'completed',
      completedAt: addDays(startedAt, 3).toISOString(),
      completedById: userIds.reviewerId,
      comment: 'Potential conflict identified. Mitigation plan required.',
    };
    states['mitigation_plan'] = {
      status: 'pending',
      assigneeId: userIds.reviewerId,
    };
  }

  return states;
}

// ===========================================
// Main Seeder Function
// ===========================================

export interface SeedWorkflowInstancesResult {
  workflowInstanceIds: string[];
  draftPolicyIds: string[];
}

/**
 * Seed workflow instances for active workflows
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID to seed for
 * @returns Object with created workflow instance IDs and draft policy IDs
 */
export async function seedWorkflowInstances(
  prisma: PrismaClient,
  organizationId: string,
): Promise<SeedWorkflowInstancesResult> {
  // Initialize faker with deterministic seed
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  console.log('\nSeeding Workflow Instances...');

  const workflowInstanceIds: string[] = [];
  const draftPolicyIds: string[] = [];

  // Step 1: Fetch existing workflow templates
  const workflowTemplates = await prisma.workflowTemplate.findMany({
    where: { organizationId, isActive: true },
    select: {
      id: true,
      name: true,
      entityType: true,
      version: true,
      stages: true,
      initialStage: true,
    },
  });

  if (workflowTemplates.length === 0) {
    console.log('  No workflow templates found. Skipping workflow instance seeding.');
    return { workflowInstanceIds, draftPolicyIds };
  }

  // Find templates by entity type
  const policyTemplate = workflowTemplates.find(
    (t) => t.entityType === WorkflowEntityType.POLICY && t.name.includes('Standard'),
  ) || workflowTemplates.find((t) => t.entityType === WorkflowEntityType.POLICY);

  const caseTemplate = workflowTemplates.find(
    (t) => t.entityType === WorkflowEntityType.CASE,
  );

  const disclosureTemplate = workflowTemplates.find(
    (t) => t.entityType === WorkflowEntityType.DISCLOSURE,
  );

  // Step 2: Fetch demo users by role
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: { id: true, email: true, role: true },
  });

  const usersByEmail: Record<string, string> = {};
  users.forEach((u) => {
    usersByEmail[u.email] = u.id;
  });

  const authorId = usersByEmail['demo-policy@acme.local'] || users[0]?.id;
  const reviewerId = usersByEmail['demo-reviewer@acme.local'] || users[0]?.id;
  const ccoId = usersByEmail['demo-cco@acme.local'] || users[0]?.id;
  const triageId = usersByEmail['demo-triage@acme.local'] || users[0]?.id;
  const investigatorId = usersByEmail['demo-investigator@acme.local'] || users[0]?.id;
  const employeeId = usersByEmail['demo-employee@acme.local'] || users[0]?.id;

  if (!users.length) {
    console.log('  No users found. Skipping workflow instance seeding.');
    return { workflowInstanceIds, draftPolicyIds };
  }

  // Step 3: Create draft policies with active workflows
  if (policyTemplate) {
    console.log('  Creating draft policies with active workflows...');

    for (const policy of DRAFT_POLICIES) {
      const policyId = faker.string.uuid();
      const workflowId = faker.string.uuid();
      const startedAt = subDays(DEMO_CURRENT_DATE, policy.daysAgo);

      // Create draft policy
      await prisma.policy.create({
        data: {
          id: policyId,
          organizationId,
          title: policy.title,
          slug: policy.slug,
          policyType: PolicyType.OTHER, // Using OTHER for draft policies
          category: 'Compliance',
          status: PolicyStatus.DRAFT,
          currentVersion: 0, // Never published
          draftContent: `<h1>${policy.title}</h1><p>${policy.description}</p><p>This policy is currently under review.</p>`,
          draftUpdatedAt: DEMO_CURRENT_DATE,
          draftUpdatedById: authorId,
          ownerId: authorId,
          effectiveDate: addDays(DEMO_CURRENT_DATE, 30),
          createdAt: startedAt,
          updatedAt: DEMO_CURRENT_DATE,
          createdById: authorId,
        },
      });

      draftPolicyIds.push(policyId);

      // Create workflow instance for policy
      const stepStates = generatePolicyStepStates(policy.workflowStage, startedAt, {
        authorId,
        reviewerId,
        ccoId,
      });

      await prisma.workflowInstance.create({
        data: {
          id: workflowId,
          organizationId,
          templateId: policyTemplate.id,
          templateVersion: policyTemplate.version,
          entityType: WorkflowEntityType.POLICY,
          entityId: policyId,
          currentStage: policy.workflowStage,
          currentStep: policy.workflowStep,
          status: WorkflowInstanceStatus.ACTIVE,
          stepStates: stepStates as any,
          dueDate: addDays(startedAt, 14),
          slaStatus: policy.daysAgo > 10 ? SlaStatus.WARNING : SlaStatus.ON_TRACK,
          createdAt: startedAt,
          updatedAt: DEMO_CURRENT_DATE,
          startedById: authorId,
        },
      });

      workflowInstanceIds.push(workflowId);
      console.log(`    Created: ${policy.title} (stage: ${policy.workflowStage})`);
    }
  } else {
    console.log('  No policy workflow template found. Skipping policy workflows.');
  }

  // Step 4: Create case workflow instances for existing open cases
  if (caseTemplate) {
    console.log('  Creating case workflow instances...');

    // Get open cases without workflow instances
    const openCases = await prisma.case.findMany({
      where: {
        organizationId,
        status: { in: [CaseStatus.NEW, CaseStatus.OPEN] },
      },
      select: { id: true, createdAt: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    // Check which cases already have workflow instances
    const existingInstances = await prisma.workflowInstance.findMany({
      where: {
        organizationId,
        entityType: WorkflowEntityType.CASE,
        entityId: { in: openCases.map((c) => c.id) },
      },
      select: { entityId: true },
    });

    const casesWithWorkflow = new Set(existingInstances.map((i) => i.entityId));
    const availableCases = openCases.filter((c) => !casesWithWorkflow.has(c.id));

    let caseIndex = 0;
    for (const stageConfig of CASE_WORKFLOW_STAGES) {
      for (let i = 0; i < stageConfig.count && caseIndex < availableCases.length; i++) {
        const caseRecord = availableCases[caseIndex];
        const workflowId = faker.string.uuid();
        const startedAt = subDays(caseRecord.createdAt, randomInt(0, 2));

        const stepStates = generateCaseStepStates(stageConfig.stage, startedAt, {
          triageId,
          investigatorId,
          ccoId,
        });

        await prisma.workflowInstance.create({
          data: {
            id: workflowId,
            organizationId,
            templateId: caseTemplate.id,
            templateVersion: caseTemplate.version,
            entityType: WorkflowEntityType.CASE,
            entityId: caseRecord.id,
            currentStage: stageConfig.stage,
            currentStep: stageConfig.step,
            status: WorkflowInstanceStatus.ACTIVE,
            stepStates: stepStates as any,
            dueDate: addDays(startedAt, 30),
            slaStatus: stageConfig.slaStatus,
            createdAt: startedAt,
            updatedAt: DEMO_CURRENT_DATE,
            startedById: triageId,
          },
        });

        workflowInstanceIds.push(workflowId);
        caseIndex++;
      }
    }

    console.log(`    Created ${caseIndex} case workflow instances`);
  } else {
    console.log('  No case workflow template found. Skipping case workflows.');
  }

  // Step 5: Create disclosure workflow instances
  // Disclosures are RIUs with type DISCLOSURE_RESPONSE
  if (disclosureTemplate) {
    console.log('  Creating disclosure workflow instances...');

    // Get recent disclosure RIUs
    const disclosureRius = await prisma.riskIntelligenceUnit.findMany({
      where: {
        organizationId,
        type: RiuType.DISCLOSURE_RESPONSE,
      },
      select: { id: true, createdAt: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    // Check which disclosure RIUs already have workflow instances
    const existingDisclosureInstances = await prisma.workflowInstance.findMany({
      where: {
        organizationId,
        entityType: WorkflowEntityType.DISCLOSURE,
        entityId: { in: disclosureRius.map((d) => d.id) },
      },
      select: { entityId: true },
    });

    const disclosuresWithWorkflow = new Set(existingDisclosureInstances.map((i) => i.entityId));
    const availableDisclosures = disclosureRius.filter((d) => !disclosuresWithWorkflow.has(d.id));

    let disclosureIndex = 0;
    for (const stageConfig of DISCLOSURE_WORKFLOW_STAGES) {
      for (let i = 0; i < stageConfig.count && disclosureIndex < availableDisclosures.length; i++) {
        const disclosure = availableDisclosures[disclosureIndex];
        const workflowId = faker.string.uuid();
        const startedAt = subDays(disclosure.createdAt, randomInt(0, 2));

        const stepStates = generateDisclosureStepStates(stageConfig.stage, startedAt, {
          submitterId: employeeId,
          reviewerId: ccoId,
        });

        await prisma.workflowInstance.create({
          data: {
            id: workflowId,
            organizationId,
            templateId: disclosureTemplate.id,
            templateVersion: disclosureTemplate.version,
            entityType: WorkflowEntityType.DISCLOSURE,
            entityId: disclosure.id,
            currentStage: stageConfig.stage,
            currentStep: stageConfig.step,
            status: WorkflowInstanceStatus.ACTIVE,
            stepStates: stepStates as any,
            dueDate: addDays(startedAt, 14),
            slaStatus: SlaStatus.ON_TRACK,
            createdAt: startedAt,
            updatedAt: DEMO_CURRENT_DATE,
            startedById: employeeId,
          },
        });

        workflowInstanceIds.push(workflowId);
        disclosureIndex++;
      }
    }

    console.log(`    Created ${disclosureIndex} disclosure workflow instances`);
  } else {
    console.log('  No disclosure workflow template found. Skipping disclosure workflows.');
  }

  // Summary
  console.log(`\n  Total workflow instances created: ${workflowInstanceIds.length}`);
  console.log(`    - Policy approval workflows: ${draftPolicyIds.length}`);
  console.log(`    - Case workflows: ${workflowInstanceIds.length - draftPolicyIds.length - DISCLOSURE_WORKFLOW_STAGES.reduce((a, s) => a + s.count, 0)}`);
  console.log(`    - Disclosure workflows: ${DISCLOSURE_WORKFLOW_STAGES.reduce((a, s) => a + s.count, 0)}`);

  return { workflowInstanceIds, draftPolicyIds };
}

/**
 * Clean up workflow instances (for demo reset)
 */
export async function cleanupWorkflowInstances(
  prisma: PrismaClient,
  organizationId: string,
): Promise<void> {
  // Delete workflow instances
  await prisma.workflowInstance.deleteMany({
    where: { organizationId },
  });

  // Delete draft policies created by this seeder
  await prisma.policy.deleteMany({
    where: {
      organizationId,
      slug: { endsWith: '-draft' },
      status: PolicyStatus.DRAFT,
    },
  });

  console.log('  Cleaned up workflow instances and draft policies');
}
