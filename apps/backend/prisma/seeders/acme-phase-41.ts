/**
 * Phase 41 Demo Data Seeder - SLA Monitoring & Escalation
 *
 * Seeds Acme Co. with Phase 41 specific data:
 * - SLA configuration for the organization
 * - Cases at various SLA states (warning, breached, critical)
 * - SLA escalation rules using the rules engine
 *
 * Usage:
 *   npx ts-node prisma/seeders/acme-phase-41.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import {
  PrismaClient,
  Severity,
  SourceChannel,
  CaseType,
  CaseStatus,
  ReporterType,
} from "@prisma/client";

const prisma = new PrismaClient();

// ===========================================
// Helper Functions
// ===========================================

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

// ===========================================
// Types
// ===========================================

interface AcmeContext {
  organizationId: string;
  systemAdminId: string;
  ccoUserId: string | null;
}

// ===========================================
// Seeder Functions
// ===========================================

async function configureSlaSettings(ctx: AcmeContext): Promise<void> {
  console.log("\n1. Configuring Acme SLA Settings...");

  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: {
      caseSlaConfig: {
        enabled: true,
        defaultDays: 14,
        warningThresholdPercent: 80,
        criticalThresholdHours: 48,
        severityOverrides: {
          HIGH: 7,
          MEDIUM: 14,
          LOW: 30,
        },
        categoryOverrides: {},
        excludedStatuses: ["CLOSED"],
        notifications: {
          warning: {
            enabled: true,
            channels: ["IN_APP", "EMAIL"],
          },
          breach: {
            enabled: true,
            channels: ["IN_APP", "EMAIL"],
          },
          critical: {
            enabled: true,
            channels: ["IN_APP", "EMAIL"],
          },
        },
      },
    },
  });

  console.log("  - Configured SLA settings:");
  console.log("    * Default SLA: 14 days");
  console.log("    * Warning threshold: 80%");
  console.log("    * Critical threshold: 48 hours after breach");
  console.log("    * HIGH severity: 7 days");
  console.log("    * MEDIUM severity: 14 days");
  console.log("    * LOW severity: 30 days");
}

async function createSlaTestCases(ctx: AcmeContext): Promise<number> {
  console.log("\n2. Creating SLA Test Cases...");
  let createdCount = 0;
  const now = new Date();

  // Check for existing SLA demo cases (idempotency)
  const existingCases = await prisma.case.findMany({
    where: {
      organizationId: ctx.organizationId,
      referenceNumber: { startsWith: "SLA-" },
    },
    select: { referenceNumber: true },
  });

  const existingRefs = new Set(existingCases.map((c) => c.referenceNumber));

  // Case 1: Approaching SLA warning (created 10 days ago for 14-day SLA = ~71%)
  const warningRef = "SLA-WARN-DEMO-001";
  if (!existingRefs.has(warningRef)) {
    const warningCase = await prisma.case.create({
      data: {
        organizationId: ctx.organizationId,
        referenceNumber: warningRef,
        status: CaseStatus.OPEN,
        sourceChannel: SourceChannel.WEB_FORM,
        caseType: CaseType.REPORT,
        reporterType: ReporterType.ANONYMOUS,
        severity: Severity.MEDIUM,
        details:
          "Demo case approaching SLA warning threshold. This case was created 10 days ago with a 14-day SLA, putting it at approximately 71% of the SLA deadline. The system should soon flag this as approaching warning.",
        slaDueDate: subDays(now, -4), // Due in 4 days (14 - 10 = 4)
        slaState: {
          lastStatus: "on_track",
          lastNotifiedAt: null,
          lastNotificationType: null,
        },
        createdAt: subDays(now, 10),
        createdById: ctx.systemAdminId,
        updatedById: ctx.systemAdminId,
      },
    });
    console.log(
      `  + Created warning-state case: ${warningCase.referenceNumber}`,
    );
    createdCount++;
  } else {
    console.log(`  ~ Skipped existing case: ${warningRef}`);
  }

  // Case 2: Past SLA (created 20 days ago for 14-day SLA = breached)
  const breachedRef = "SLA-BREACH-DEMO-001";
  if (!existingRefs.has(breachedRef)) {
    const breachedCase = await prisma.case.create({
      data: {
        organizationId: ctx.organizationId,
        referenceNumber: breachedRef,
        status: CaseStatus.OPEN,
        sourceChannel: SourceChannel.HOTLINE,
        caseType: CaseType.REPORT,
        reporterType: ReporterType.IDENTIFIED,
        severity: Severity.HIGH,
        details:
          "Demo case that has breached SLA. This HIGH severity case was created 20 days ago and had a 7-day SLA. It has been overdue for 13 days and should have triggered breach notifications.",
        slaDueDate: subDays(now, 13), // Due 13 days ago (20 - 7 = 13 days overdue)
        slaState: {
          lastStatus: "breached",
          lastNotifiedAt: subDays(now, 5).toISOString(),
          lastNotificationType: "breach",
        },
        createdAt: subDays(now, 20),
        createdById: ctx.systemAdminId,
        updatedById: ctx.systemAdminId,
      },
    });
    console.log(`  + Created breached case: ${breachedCase.referenceNumber}`);
    createdCount++;
  } else {
    console.log(`  ~ Skipped existing case: ${breachedRef}`);
  }

  // Case 3: Critically overdue (breached 72+ hours ago)
  const criticalRef = "SLA-CRIT-DEMO-001";
  if (!existingRefs.has(criticalRef)) {
    const criticalCase = await prisma.case.create({
      data: {
        organizationId: ctx.organizationId,
        referenceNumber: criticalRef,
        status: CaseStatus.OPEN,
        sourceChannel: SourceChannel.DIRECT_ENTRY,
        caseType: CaseType.REPORT,
        reporterType: ReporterType.ANONYMOUS,
        severity: Severity.HIGH,
        details:
          "Demo case requiring critical escalation. This HIGH severity case was created 25 days ago and has been overdue for 18 days (far exceeding the 48-hour critical threshold). This should trigger immediate attention from compliance leadership.",
        slaDueDate: subDays(now, 18), // Due 18 days ago (critical)
        slaState: {
          lastStatus: "critical",
          lastNotifiedAt: subDays(now, 2).toISOString(),
          lastNotificationType: "critical",
        },
        createdAt: subDays(now, 25),
        createdById: ctx.systemAdminId,
        updatedById: ctx.systemAdminId,
      },
    });
    console.log(`  + Created critical case: ${criticalCase.referenceNumber}`);
    createdCount++;
  } else {
    console.log(`  ~ Skipped existing case: ${criticalRef}`);
  }

  // Case 4: On track (created 2 days ago for 14-day SLA = ~14%)
  const onTrackRef = "SLA-OK-DEMO-001";
  if (!existingRefs.has(onTrackRef)) {
    const onTrackCase = await prisma.case.create({
      data: {
        organizationId: ctx.organizationId,
        referenceNumber: onTrackRef,
        status: CaseStatus.NEW,
        sourceChannel: SourceChannel.CHATBOT,
        caseType: CaseType.REPORT,
        reporterType: ReporterType.ANONYMOUS,
        severity: Severity.LOW,
        details:
          "Demo case that is well within SLA. This LOW severity case was created 2 days ago with a 30-day SLA, giving it plenty of time for resolution. No SLA notifications should be triggered.",
        slaDueDate: subDays(now, -28), // Due in 28 days (30 - 2 = 28)
        slaState: {
          lastStatus: "on_track",
          lastNotifiedAt: null,
          lastNotificationType: null,
        },
        createdAt: subDays(now, 2),
        createdById: ctx.systemAdminId,
        updatedById: ctx.systemAdminId,
      },
    });
    console.log(`  + Created on-track case: ${onTrackCase.referenceNumber}`);
    createdCount++;
  } else {
    console.log(`  ~ Skipped existing case: ${onTrackRef}`);
  }

  return createdCount;
}

async function createEscalationRules(ctx: AcmeContext): Promise<number> {
  console.log("\n3. Creating SLA Escalation Rules...");
  let createdCount = 0;

  // Rule 1: High Severity Unassigned Escalation
  const rule1Id = "seed-rule-sla-high-unassigned-escalation";
  const existingRule1 = await prisma.ruleDefinition.findUnique({
    where: { id: rule1Id },
  });

  if (existingRule1) {
    await prisma.ruleDefinition.update({
      where: { id: rule1Id },
      data: {
        name: "High Severity Unassigned Escalation",
        description:
          "Escalate HIGH severity cases that remain unassigned for 4+ hours to Compliance Officer when SLA warning is triggered.",
        triggerEvent: "sla.warning",
        conditions: {
          all: [
            { fact: "severity", operator: "equal", value: "HIGH" },
            { fact: "isUnassigned", operator: "equal", value: true },
            { fact: "hoursUnassigned", operator: "greaterThan", value: 4 },
          ],
        },
        actions: [
          {
            type: "escalate_to_role",
            params: {
              role: "COMPLIANCE_OFFICER",
              notifyOriginalAssignee: true,
            },
          },
        ],
        priority: 10,
        isActive: true,
      },
    });
    console.log(`  ~ Updated: High Severity Unassigned Escalation`);
  } else {
    await prisma.ruleDefinition.create({
      data: {
        id: rule1Id,
        organizationId: ctx.organizationId,
        name: "High Severity Unassigned Escalation",
        description:
          "Escalate HIGH severity cases that remain unassigned for 4+ hours to Compliance Officer when SLA warning is triggered.",
        triggerEvent: "sla.warning",
        conditions: {
          all: [
            { fact: "severity", operator: "equal", value: "HIGH" },
            { fact: "isUnassigned", operator: "equal", value: true },
            { fact: "hoursUnassigned", operator: "greaterThan", value: 4 },
          ],
        },
        actions: [
          {
            type: "escalate_to_role",
            params: {
              role: "COMPLIANCE_OFFICER",
              notifyOriginalAssignee: true,
            },
          },
        ],
        priority: 10,
        isActive: true,
        createdById: ctx.systemAdminId,
      },
    });
    console.log(`  + Created: High Severity Unassigned Escalation`);
    createdCount++;
  }

  // Rule 2: SLA Breach Escalation
  const rule2Id = "seed-rule-sla-breach-escalation";
  const existingRule2 = await prisma.ruleDefinition.findUnique({
    where: { id: rule2Id },
  });

  if (existingRule2) {
    await prisma.ruleDefinition.update({
      where: { id: rule2Id },
      data: {
        name: "SLA Breach Escalation",
        description:
          "Automatically escalate any breached case to Compliance Officer for review and prioritization.",
        triggerEvent: "sla.breached",
        conditions: {
          all: [
            { fact: "slaEvent.type", operator: "equal", value: "breached" },
          ],
        },
        actions: [
          {
            type: "escalate_to_role",
            params: {
              role: "COMPLIANCE_OFFICER",
              notifyOriginalAssignee: true,
            },
          },
        ],
        priority: 5,
        isActive: true,
      },
    });
    console.log(`  ~ Updated: SLA Breach Escalation`);
  } else {
    await prisma.ruleDefinition.create({
      data: {
        id: rule2Id,
        organizationId: ctx.organizationId,
        name: "SLA Breach Escalation",
        description:
          "Automatically escalate any breached case to Compliance Officer for review and prioritization.",
        triggerEvent: "sla.breached",
        conditions: {
          all: [
            { fact: "slaEvent.type", operator: "equal", value: "breached" },
          ],
        },
        actions: [
          {
            type: "escalate_to_role",
            params: {
              role: "COMPLIANCE_OFFICER",
              notifyOriginalAssignee: true,
            },
          },
        ],
        priority: 5,
        isActive: true,
        createdById: ctx.systemAdminId,
      },
    });
    console.log(`  + Created: SLA Breach Escalation`);
    createdCount++;
  }

  // Rule 3: Critical SLA Escalation to CCO
  const rule3Id = "seed-rule-sla-critical-cco-escalation";
  const existingRule3 = await prisma.ruleDefinition.findUnique({
    where: { id: rule3Id },
  });

  if (existingRule3) {
    await prisma.ruleDefinition.update({
      where: { id: rule3Id },
      data: {
        name: "Critical SLA Escalation to CCO",
        description:
          "Escalate critically overdue cases (48+ hours past SLA) to Chief Compliance Officer for immediate executive attention.",
        triggerEvent: "sla.critical",
        conditions: {
          all: [
            { fact: "slaEvent.type", operator: "equal", value: "critical" },
          ],
        },
        actions: [
          {
            type: "escalate_to_role",
            params: {
              role: "COMPLIANCE_OFFICER",
              notifyOriginalAssignee: true,
              notificationUrgency: "high",
            },
          },
          {
            type: "add_flag",
            params: {
              flag: "CRITICAL_SLA",
              reason: "Case exceeded critical SLA threshold",
            },
          },
        ],
        priority: 1, // Highest priority
        isActive: true,
      },
    });
    console.log(`  ~ Updated: Critical SLA Escalation to CCO`);
  } else {
    await prisma.ruleDefinition.create({
      data: {
        id: rule3Id,
        organizationId: ctx.organizationId,
        name: "Critical SLA Escalation to CCO",
        description:
          "Escalate critically overdue cases (48+ hours past SLA) to Chief Compliance Officer for immediate executive attention.",
        triggerEvent: "sla.critical",
        conditions: {
          all: [
            { fact: "slaEvent.type", operator: "equal", value: "critical" },
          ],
        },
        actions: [
          {
            type: "escalate_to_role",
            params: {
              role: "COMPLIANCE_OFFICER",
              notifyOriginalAssignee: true,
              notificationUrgency: "high",
            },
          },
          {
            type: "add_flag",
            params: {
              flag: "CRITICAL_SLA",
              reason: "Case exceeded critical SLA threshold",
            },
          },
        ],
        priority: 1, // Highest priority
        isActive: true,
        createdById: ctx.systemAdminId,
      },
    });
    console.log(`  + Created: Critical SLA Escalation to CCO`);
    createdCount++;
  }

  return createdCount;
}

// ===========================================
// Main Seeder
// ===========================================

/**
 * Main seeder function for Phase 41 Acme Co. demo data.
 * Creates SLA configuration, test cases, and escalation rules.
 */
export async function seedAcmePhase41(): Promise<void> {
  console.log("\n========================================");
  console.log("ACME PHASE 41 SEED - SLA Monitoring & Escalation");
  console.log("========================================");

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

  console.log(`\nOrganization: ${acmeOrg.name} (${acmeOrg.id})`);

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

  // Get CCO user
  const ccoUser = await prisma.user.findFirst({
    where: {
      organizationId: acmeOrg.id,
      email: "demo-cco@acme.local",
    },
  });

  if (ccoUser) {
    console.log(`CCO User: ${ccoUser.email}`);
  }

  // Build context
  const ctx: AcmeContext = {
    organizationId: acmeOrg.id,
    systemAdminId: systemAdmin.id,
    ccoUserId: ccoUser?.id || null,
  };

  // 1. Configure SLA settings
  await configureSlaSettings(ctx);

  // 2. Create test cases at various SLA states
  const casesCreated = await createSlaTestCases(ctx);

  // 3. Create escalation rules
  const rulesCreated = await createEscalationRules(ctx);

  // Summary
  console.log("\n========================================");
  console.log("ACME PHASE 41 SEED COMPLETE");
  console.log("========================================");
  console.log(`\nSummary:`);
  console.log(`  - SLA Configuration: Applied`);
  console.log(`  - Test Cases created: ${casesCreated}`);
  console.log(`  - Escalation Rules created: ${rulesCreated}`);
  console.log("\nSLA Demo Cases:");
  console.log("  SLA-OK-DEMO-001    - On track (LOW, 2 days old)");
  console.log("  SLA-WARN-DEMO-001  - Warning state (MEDIUM, 10 days old)");
  console.log("  SLA-BREACH-DEMO-001 - Breached (HIGH, 20 days old)");
  console.log("  SLA-CRIT-DEMO-001  - Critical (HIGH, 25 days old)");
  console.log("\nEscalation Rules:");
  console.log(
    "  1. High Severity Unassigned Escalation (sla.warning, priority 10)",
  );
  console.log("  2. SLA Breach Escalation (sla.breached, priority 5)");
  console.log("  3. Critical SLA Escalation to CCO (sla.critical, priority 1)");
  console.log("========================================\n");
}

// Run if executed directly
if (require.main === module) {
  seedAcmePhase41()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
