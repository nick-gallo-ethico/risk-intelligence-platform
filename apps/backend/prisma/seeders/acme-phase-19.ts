/**
 * Phase 19 Demo Data Seeder - Workflow Engine UI
 *
 * Seeds Acme Co. with Phase 19 specific data:
 * - 3 workflow templates: Case Investigation, Policy Approval, Disclosure Review
 * - 6 workflow instances in various states (ACTIVE, COMPLETED, PAUSED)
 *
 * Templates have realistic stages, transitions, SLA configurations, and
 * steps that match the entity types they govern.
 *
 * Usage:
 *   npx ts-node prisma/seeders/acme-phase-19.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import {
  PrismaClient,
  Prisma,
  WorkflowEntityType,
  WorkflowInstanceStatus,
  SlaStatus,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import { subDays, addDays } from "date-fns";
import { SEED_CONFIG } from "./config";

const prisma = new PrismaClient();

// ===========================================
// Types
// ===========================================

interface AcmeContext {
  organizationId: string;
  systemAdminId: string;
  caseIds: string[];
  policyIds: string[];
  disclosureRiuIds: string[];
}

interface WorkflowStageDefinition {
  id: string;
  name: string;
  description?: string;
  steps: {
    id: string;
    name: string;
    type: "manual" | "automatic" | "approval" | "notification";
    isOptional?: boolean;
    description?: string;
  }[];
  slaDays?: number;
  gates?: {
    type: string;
    config: Record<string, unknown>;
    errorMessage?: string;
  }[];
  isTerminal?: boolean;
  display: {
    color: string;
    sortOrder: number;
  };
}

interface WorkflowTransitionDefinition {
  from: string;
  to: string;
  label: string;
  requiresReason?: boolean;
  allowedRoles?: string[];
  conditions?: { type: string; config: Record<string, unknown> }[];
  actions?: { type: string; config: Record<string, unknown> }[];
}

interface WorkflowTemplateDefinition {
  name: string;
  description: string;
  entityType: WorkflowEntityType;
  isDefault: boolean;
  defaultSlaDays: number;
  tags: string[];
  stages: WorkflowStageDefinition[];
  transitions: WorkflowTransitionDefinition[];
  initialStage: string;
}

// ===========================================
// Workflow Template Definitions
// ===========================================

const WORKFLOW_TEMPLATES: WorkflowTemplateDefinition[] = [
  // 1. Case Investigation Pipeline
  {
    name: "Case Investigation Pipeline",
    description:
      "Standard workflow for case investigations: New -> Triage -> Investigation -> Review -> Closed. Includes SLA tracking and approval gates.",
    entityType: WorkflowEntityType.CASE,
    isDefault: true,
    defaultSlaDays: 30,
    tags: ["case", "investigation", "standard"],
    initialStage: "new",
    stages: [
      {
        id: "new",
        name: "New",
        description: "Case has been created and awaits initial triage.",
        steps: [
          {
            id: "assign-triage",
            name: "Assign to Triage Team",
            type: "manual",
            description:
              "Assign the case to a triage analyst for initial review.",
          },
        ],
        display: { color: "#3b82f6", sortOrder: 0 },
      },
      {
        id: "triage",
        name: "Triage",
        description:
          "Initial assessment to determine case priority and routing.",
        steps: [
          {
            id: "review-riu",
            name: "Review RIU Details",
            type: "manual",
            description:
              "Review the Risk Intelligence Unit details and source information.",
          },
          {
            id: "categorize",
            name: "Confirm Category",
            type: "manual",
            description: "Verify or correct the case category and subcategory.",
          },
          {
            id: "assess-severity",
            name: "Assess Severity",
            type: "manual",
            description: "Determine case severity based on potential impact.",
          },
        ],
        slaDays: 3,
        display: { color: "#f59e0b", sortOrder: 1 },
      },
      {
        id: "investigation",
        name: "Investigation",
        description:
          "Active investigation phase with evidence gathering and interviews.",
        steps: [
          {
            id: "gather-evidence",
            name: "Gather Evidence",
            type: "manual",
            description:
              "Collect relevant documents, records, and digital evidence.",
          },
          {
            id: "conduct-interviews",
            name: "Conduct Interviews",
            type: "manual",
            description:
              "Interview relevant parties: complainant, respondent, witnesses.",
          },
          {
            id: "document-findings",
            name: "Document Findings",
            type: "manual",
            description:
              "Document investigation findings and supporting evidence.",
          },
        ],
        slaDays: 21,
        display: { color: "#8b5cf6", sortOrder: 2 },
      },
      {
        id: "review",
        name: "Review",
        description:
          "Management review of investigation findings before closure.",
        steps: [
          {
            id: "manager-review",
            name: "Manager Review",
            type: "approval",
            description:
              "Manager reviews findings and approves recommended outcome.",
          },
        ],
        slaDays: 5,
        gates: [
          {
            type: "approval",
            config: { requiredApprovals: 1 },
            errorMessage: "Manager approval required before closing case.",
          },
        ],
        display: { color: "#06b6d4", sortOrder: 3 },
      },
      {
        id: "closed",
        name: "Closed",
        description: "Case has been resolved and closed.",
        steps: [],
        isTerminal: true,
        display: { color: "#6b7280", sortOrder: 4 },
      },
    ],
    transitions: [
      {
        from: "new",
        to: "triage",
        label: "Start Triage",
      },
      {
        from: "triage",
        to: "investigation",
        label: "Begin Investigation",
      },
      {
        from: "triage",
        to: "closed",
        label: "Close Without Investigation",
        requiresReason: true,
      },
      {
        from: "investigation",
        to: "review",
        label: "Submit for Review",
      },
      {
        from: "investigation",
        to: "triage",
        label: "Return to Triage",
        requiresReason: true,
      },
      {
        from: "review",
        to: "closed",
        label: "Close Case",
      },
      {
        from: "review",
        to: "investigation",
        label: "Return to Investigation",
        requiresReason: true,
      },
      {
        from: "*",
        to: "closed",
        label: "Close (Admin)",
        allowedRoles: ["SYSTEM_ADMIN"],
        requiresReason: true,
      },
    ],
  },

  // 2. Policy Approval Workflow
  {
    name: "Policy Approval Workflow",
    description:
      "Two-tier approval workflow for policies: Draft -> Under Review -> Approved/Rejected. Requires legal and compliance review.",
    entityType: WorkflowEntityType.POLICY,
    isDefault: true,
    defaultSlaDays: 14,
    tags: ["policy", "approval", "two-tier"],
    initialStage: "draft",
    stages: [
      {
        id: "draft",
        name: "Draft",
        description: "Policy is being drafted or revised by the author.",
        steps: [
          {
            id: "author-draft",
            name: "Draft Policy Content",
            type: "manual",
            description: "Create or revise policy content.",
          },
          {
            id: "submit-review",
            name: "Submit for Review",
            type: "manual",
            description: "Submit the draft policy for review.",
          },
        ],
        display: { color: "#3b82f6", sortOrder: 0 },
      },
      {
        id: "under-review",
        name: "Under Review",
        description: "Policy is being reviewed by legal and compliance teams.",
        steps: [
          {
            id: "legal-review",
            name: "Legal Review",
            type: "approval",
            description: "Legal team reviews policy for regulatory compliance.",
          },
          {
            id: "compliance-review",
            name: "Compliance Review",
            type: "approval",
            description: "Compliance team verifies alignment with standards.",
          },
        ],
        slaDays: 14,
        gates: [
          {
            type: "approval",
            config: { requiredApprovals: 2 },
            errorMessage: "Both legal and compliance approval required.",
          },
        ],
        display: { color: "#f59e0b", sortOrder: 1 },
      },
      {
        id: "approved",
        name: "Approved",
        description: "Policy has been approved and is ready for publication.",
        steps: [
          {
            id: "notify-stakeholders",
            name: "Notify Stakeholders",
            type: "notification",
            description: "Send approval notification to stakeholders.",
          },
        ],
        isTerminal: true,
        display: { color: "#22c55e", sortOrder: 2 },
      },
      {
        id: "rejected",
        name: "Rejected",
        description: "Policy was rejected and requires revision.",
        steps: [],
        isTerminal: true,
        display: { color: "#ef4444", sortOrder: 3 },
      },
    ],
    transitions: [
      {
        from: "draft",
        to: "under-review",
        label: "Submit for Review",
      },
      {
        from: "under-review",
        to: "approved",
        label: "Approve",
      },
      {
        from: "under-review",
        to: "rejected",
        label: "Reject",
        requiresReason: true,
      },
      {
        from: "under-review",
        to: "draft",
        label: "Return to Draft",
        requiresReason: true,
      },
      {
        from: "rejected",
        to: "draft",
        label: "Revise",
      },
    ],
  },

  // 3. Disclosure Review
  {
    name: "Disclosure Review",
    description:
      "Workflow for reviewing disclosure submissions: Submitted -> Under Review -> Approved/Flagged. Includes automatic conflict checking.",
    entityType: WorkflowEntityType.DISCLOSURE,
    isDefault: true,
    defaultSlaDays: 7,
    tags: ["disclosure", "review", "coi"],
    initialStage: "submitted",
    stages: [
      {
        id: "submitted",
        name: "Submitted",
        description: "Disclosure has been submitted and awaits review.",
        steps: [
          {
            id: "auto-acknowledge",
            name: "Send Acknowledgment",
            type: "notification",
            description: "Send automatic acknowledgment to submitter.",
          },
        ],
        display: { color: "#3b82f6", sortOrder: 0 },
      },
      {
        id: "under-review",
        name: "Under Review",
        description:
          "Disclosure is being reviewed for conflicts and compliance.",
        steps: [
          {
            id: "conflict-check",
            name: "Conflict Check",
            type: "automatic",
            description: "Automatic check against known conflicts database.",
          },
          {
            id: "threshold-check",
            name: "Threshold Check",
            type: "automatic",
            description: "Verify disclosure amounts against thresholds.",
          },
          {
            id: "reviewer-assessment",
            name: "Reviewer Assessment",
            type: "approval",
            description: "Manual review and assessment by compliance reviewer.",
          },
        ],
        slaDays: 7,
        display: { color: "#f59e0b", sortOrder: 1 },
      },
      {
        id: "approved",
        name: "Approved",
        description: "Disclosure has been reviewed and approved.",
        steps: [
          {
            id: "notify-approval",
            name: "Notify Submitter",
            type: "notification",
            description: "Notify submitter of approval.",
          },
        ],
        isTerminal: true,
        display: { color: "#22c55e", sortOrder: 2 },
      },
      {
        id: "flagged",
        name: "Flagged for Investigation",
        description:
          "Disclosure requires further investigation due to potential conflict.",
        steps: [
          {
            id: "create-case",
            name: "Create Case",
            type: "automatic",
            description: "Automatically create a case for investigation.",
          },
        ],
        display: { color: "#ef4444", sortOrder: 3 },
      },
    ],
    transitions: [
      {
        from: "submitted",
        to: "under-review",
        label: "Start Review",
      },
      {
        from: "under-review",
        to: "approved",
        label: "Approve",
      },
      {
        from: "under-review",
        to: "flagged",
        label: "Flag for Investigation",
        requiresReason: true,
      },
      {
        from: "flagged",
        to: "under-review",
        label: "Return to Review",
        requiresReason: true,
      },
      {
        from: "flagged",
        to: "approved",
        label: "Resolve & Approve",
        requiresReason: true,
      },
    ],
  },
];

// ===========================================
// Seeder Functions
// ===========================================

async function seedWorkflowTemplates(
  ctx: AcmeContext,
): Promise<Map<string, string>> {
  console.log("\n1. Creating workflow templates...");
  const templateIds = new Map<string, string>();

  for (const template of WORKFLOW_TEMPLATES) {
    // Check if template already exists (idempotent)
    const existing = await prisma.workflowTemplate.findFirst({
      where: {
        organizationId: ctx.organizationId,
        name: template.name,
        version: 1,
      },
    });

    if (existing) {
      console.log(`  - Template already exists: ${template.name}`);
      templateIds.set(template.entityType, existing.id);
      continue;
    }

    const created = await prisma.workflowTemplate.create({
      data: {
        organizationId: ctx.organizationId,
        name: template.name,
        description: template.description,
        entityType: template.entityType,
        version: 1,
        isActive: true,
        isDefault: template.isDefault,
        stages: template.stages as unknown as Prisma.InputJsonValue,
        transitions: template.transitions as unknown as Prisma.InputJsonValue,
        initialStage: template.initialStage,
        defaultSlaDays: template.defaultSlaDays,
        slaConfig: {
          enabled: true,
          warningThresholdHours: 24,
        } as Prisma.InputJsonValue,
        tags: template.tags,
        createdById: ctx.systemAdminId,
      },
    });

    templateIds.set(template.entityType, created.id);
    console.log(`  + Created: ${template.name} (${template.entityType})`);
  }

  return templateIds;
}

async function seedWorkflowInstances(
  ctx: AcmeContext,
  templateIds: Map<string, string>,
): Promise<number> {
  console.log("\n2. Creating workflow instances...");
  let createdCount = 0;
  const now = SEED_CONFIG.currentDate;

  // Get template details for version
  const caseTemplateId = templateIds.get(WorkflowEntityType.CASE);
  const policyTemplateId = templateIds.get(WorkflowEntityType.POLICY);
  const disclosureTemplateId = templateIds.get(WorkflowEntityType.DISCLOSURE);

  // Instance configurations
  const instances = [
    // 2 ACTIVE case instances
    {
      templateId: caseTemplateId,
      entityType: WorkflowEntityType.CASE,
      entityId: ctx.caseIds[0],
      currentStage: "investigation",
      status: WorkflowInstanceStatus.ACTIVE,
      slaStatus: SlaStatus.ON_TRACK,
      daysAgo: 10,
    },
    {
      templateId: caseTemplateId,
      entityType: WorkflowEntityType.CASE,
      entityId: ctx.caseIds[1],
      currentStage: "review",
      status: WorkflowInstanceStatus.ACTIVE,
      slaStatus: SlaStatus.WARNING,
      daysAgo: 25,
    },
    // 1 COMPLETED case instance
    {
      templateId: caseTemplateId,
      entityType: WorkflowEntityType.CASE,
      entityId: ctx.caseIds[2],
      currentStage: "closed",
      status: WorkflowInstanceStatus.COMPLETED,
      slaStatus: SlaStatus.ON_TRACK,
      daysAgo: 45,
      outcome: "Substantiated - Corrective action taken",
    },
    // 1 PAUSED case instance
    {
      templateId: caseTemplateId,
      entityType: WorkflowEntityType.CASE,
      entityId: ctx.caseIds[3],
      currentStage: "investigation",
      status: WorkflowInstanceStatus.PAUSED,
      slaStatus: SlaStatus.WARNING,
      daysAgo: 30,
    },
    // 1 ACTIVE policy instance
    {
      templateId: policyTemplateId,
      entityType: WorkflowEntityType.POLICY,
      entityId: ctx.policyIds[0],
      currentStage: "under-review",
      status: WorkflowInstanceStatus.ACTIVE,
      slaStatus: SlaStatus.ON_TRACK,
      daysAgo: 5,
    },
    // 1 ACTIVE disclosure instance
    {
      templateId: disclosureTemplateId,
      entityType: WorkflowEntityType.DISCLOSURE,
      entityId: ctx.disclosureRiuIds[0],
      currentStage: "under-review",
      status: WorkflowInstanceStatus.ACTIVE,
      slaStatus: SlaStatus.ON_TRACK,
      daysAgo: 3,
    },
  ];

  for (const config of instances) {
    if (!config.templateId || !config.entityId) {
      console.log(
        `  - Skipping: missing template or entity for ${config.entityType}`,
      );
      continue;
    }

    // Check if instance already exists for this entity
    const existing = await prisma.workflowInstance.findUnique({
      where: {
        entityType_entityId: {
          entityType: config.entityType,
          entityId: config.entityId,
        },
      },
    });

    if (existing) {
      console.log(
        `  - Instance already exists for ${config.entityType}:${config.entityId.slice(0, 8)}`,
      );
      continue;
    }

    const startedAt = subDays(now, config.daysAgo);
    const dueDate = addDays(startedAt, 30);

    await prisma.workflowInstance.create({
      data: {
        organizationId: ctx.organizationId,
        templateId: config.templateId,
        templateVersion: 1,
        entityType: config.entityType,
        entityId: config.entityId,
        currentStage: config.currentStage,
        status: config.status,
        stepStates: {},
        dueDate,
        slaStatus: config.slaStatus,
        outcome: config.outcome,
        completedAt:
          config.status === WorkflowInstanceStatus.COMPLETED
            ? subDays(now, 5)
            : null,
        startedById: ctx.systemAdminId,
        createdAt: startedAt,
      },
    });

    createdCount++;
    console.log(
      `  + Created: ${config.entityType} instance (${config.status}, stage: ${config.currentStage})`,
    );
  }

  return createdCount;
}

// ===========================================
// Main Seeder
// ===========================================

/**
 * Main seeder function for Phase 19 Acme Co. demo data.
 * Cumulative - adds to existing Acme data.
 */
export async function seedPhase19(): Promise<void> {
  console.log("\n========================================");
  console.log("ACME PHASE 19 SEED - Workflow Engine UI");
  console.log("========================================\n");

  // Initialize faker for reproducibility
  faker.seed(20260219);

  // Get Acme organization
  const acmeOrg = await prisma.organization.findFirst({
    where: {
      OR: [{ slug: "acme-corp" }, { name: { contains: "Acme" } }],
    },
  });

  if (!acmeOrg) {
    console.error("ERROR: Acme organization not found. Run base seed first.");
    return;
  }

  console.log(`Found Acme organization: ${acmeOrg.name} (${acmeOrg.id})`);

  // Get system admin user
  const systemAdmin = await prisma.user.findFirst({
    where: {
      organizationId: acmeOrg.id,
      OR: [{ email: "demo-admin@acme.local" }, { role: "SYSTEM_ADMIN" }],
    },
  });

  if (!systemAdmin) {
    console.error("ERROR: System admin user not found.");
    return;
  }

  console.log(`System Admin: ${systemAdmin.email}`);

  // Get existing cases (need at least 4 for instances)
  const cases = await prisma.case.findMany({
    where: { organizationId: acmeOrg.id },
    select: { id: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  if (cases.length < 4) {
    console.error(
      "ERROR: Need at least 4 cases for workflow instances. Run case seeder first.",
    );
    return;
  }

  // Get existing policies (need at least 1)
  const policies = await prisma.policy.findMany({
    where: { organizationId: acmeOrg.id },
    select: { id: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  if (policies.length < 1) {
    console.error(
      "ERROR: Need at least 1 policy for workflow instances. Run policy seeder first.",
    );
    return;
  }

  // Get existing disclosure RIUs (need at least 1)
  const disclosureRius = await prisma.riskIntelligenceUnit.findMany({
    where: {
      organizationId: acmeOrg.id,
      type: "DISCLOSURE_RESPONSE",
    },
    select: { id: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  // If no disclosure RIUs, use any RIU
  let riuIds = disclosureRius.map((r) => r.id);
  if (riuIds.length === 0) {
    const anyRius = await prisma.riskIntelligenceUnit.findMany({
      where: { organizationId: acmeOrg.id },
      select: { id: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    riuIds = anyRius.map((r) => r.id);
    console.log(
      "Note: No disclosure RIUs found, using general RIUs for disclosure workflow demo.",
    );
  }

  const ctx: AcmeContext = {
    organizationId: acmeOrg.id,
    systemAdminId: systemAdmin.id,
    caseIds: cases.map((c) => c.id),
    policyIds: policies.map((p) => p.id),
    disclosureRiuIds: riuIds,
  };

  // Seed workflow templates
  const templateIds = await seedWorkflowTemplates(ctx);

  // Seed workflow instances
  const instancesCreated = await seedWorkflowInstances(ctx, templateIds);

  // Summary
  console.log("\n========================================");
  console.log("ACME PHASE 19 SEED COMPLETE");
  console.log("========================================");
  console.log(`\nSummary:`);
  console.log(`  - Workflow templates: ${WORKFLOW_TEMPLATES.length}`);
  console.log(`    - Case Investigation Pipeline (5 stages)`);
  console.log(`    - Policy Approval Workflow (4 stages)`);
  console.log(`    - Disclosure Review (4 stages)`);
  console.log(`  - Workflow instances created: ${instancesCreated}`);
  console.log("========================================\n");
}

// Run if executed directly
if (require.main === module) {
  seedPhase19()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
