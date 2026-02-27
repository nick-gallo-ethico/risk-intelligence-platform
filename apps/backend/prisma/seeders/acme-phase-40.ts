/**
 * Phase 40 Demo Data Seeder - Rules Engine Foundation
 *
 * Seeds Acme Co. with Phase 40 specific data:
 * - Demo routing rules for automatic case assignment
 * - Sample execution logs showing historical rule evaluations
 *
 * Rules seeded:
 * 1. Route HIGH/CRITICAL to CCO - Priority 10 (active)
 * 2. Route Fraud to Legal Review - Priority 20 (active if fraud category exists)
 * 3. Round-Robin General Cases - Priority 100 (active if team exists)
 * 4. Hotline Reports to Triage - Priority 15 (inactive - for testing)
 *
 * Usage:
 *   npx ts-node prisma/seeders/acme-phase-40.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import { PrismaClient, Prisma } from "@prisma/client";
import * as crypto from "crypto";

const prisma = new PrismaClient();

// ===========================================
// Helper Functions
// ===========================================

function generateUUID(): string {
  return crypto.randomUUID();
}

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
  investigationTeamId: string | null;
  fraudCategoryId: string | null;
}

interface RuleDefinitionInput {
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  triggerEvent: string;
  conditions: Record<string, unknown>;
  actions: Array<{ type: string; params: Record<string, unknown> }>;
}

// ===========================================
// Rule Definitions
// ===========================================

function buildDemoRules(ctx: AcmeContext): RuleDefinitionInput[] {
  const rules: RuleDefinitionInput[] = [];

  // Rule 1: Route HIGH/CRITICAL severity cases to CCO
  if (ctx.ccoUserId) {
    rules.push({
      name: "Route HIGH/CRITICAL to CCO",
      description:
        "High and critical severity cases go directly to the Chief Compliance Officer for immediate attention and oversight.",
      priority: 10,
      isActive: true,
      triggerEvent: "case.created",
      conditions: {
        any: [
          { fact: "severity", operator: "severityEquals", value: "HIGH" },
          { fact: "severity", operator: "severityEquals", value: "CRITICAL" },
        ],
      },
      actions: [{ type: "assign_user", params: { userId: ctx.ccoUserId } }],
    });
  }

  // Rule 2: Route Fraud category to Legal Review (CCO)
  if (ctx.fraudCategoryId && ctx.ccoUserId) {
    rules.push({
      name: "Route Fraud to Legal Review",
      description:
        "Fraud-related cases are routed to legal/compliance team for specialized review and potential legal action coordination.",
      priority: 20,
      isActive: true,
      triggerEvent: "case.created",
      conditions: {
        all: [
          {
            fact: "categoryId",
            operator: "categoryEquals",
            value: ctx.fraudCategoryId,
          },
        ],
      },
      actions: [{ type: "assign_user", params: { userId: ctx.ccoUserId } }],
    });
  }

  // Rule 3: Round-Robin General Cases to Investigation Team
  if (ctx.investigationTeamId) {
    rules.push({
      name: "Round-Robin General Cases",
      description:
        "Distribute general cases (LOW/MEDIUM severity) evenly across the investigation team for balanced workload.",
      priority: 100,
      isActive: true,
      triggerEvent: "case.created",
      conditions: {
        all: [
          {
            fact: "severity",
            operator: "severityIn",
            value: ["LOW", "MEDIUM"],
          },
        ],
      },
      actions: [
        {
          type: "round_robin",
          params: {
            teamId: ctx.investigationTeamId,
            maxOpenCases: 10,
          },
        },
      ],
    });
  }

  // Rule 4: Hotline Reports to Triage (INACTIVE - for testing)
  rules.push({
    name: "Hotline Reports to Triage",
    description:
      "Cases from hotline channel get priority routing to triage lead. Currently inactive - enable for hotline prioritization.",
    priority: 15,
    isActive: false, // Inactive for testing rule activation flow
    triggerEvent: "case.created",
    conditions: {
      all: [{ fact: "sourceChannel", operator: "equal", value: "hotline" }],
    },
    actions: [
      {
        type: "assign_team",
        params: { teamId: ctx.investigationTeamId || "team-triage" },
      },
    ],
  });

  return rules;
}

// ===========================================
// Seeder Functions
// ===========================================

async function seedRules(ctx: AcmeContext): Promise<number> {
  console.log("\n1. Creating Demo Routing Rules...");
  let createdCount = 0;

  const rules = buildDemoRules(ctx);

  for (const rule of rules) {
    // Skip rules with empty actions (dependencies not met)
    if (rule.actions.length === 0) {
      console.log(`  - Skipping rule "${rule.name}" - no valid actions`);
      continue;
    }

    // Generate deterministic ID based on rule name for idempotency
    const ruleId = `seed-rule-${rule.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

    // Check if rule already exists
    const existing = await prisma.ruleDefinition.findUnique({
      where: { id: ruleId },
    });

    if (existing) {
      // Update existing rule
      await prisma.ruleDefinition.update({
        where: { id: ruleId },
        data: {
          name: rule.name,
          description: rule.description,
          priority: rule.priority,
          isActive: rule.isActive,
          conditions: rule.conditions as Prisma.InputJsonValue,
          actions: rule.actions as unknown as Prisma.InputJsonValue,
        },
      });
      console.log(`  ~ Updated: ${rule.name} (priority: ${rule.priority})`);
    } else {
      // Create new rule
      await prisma.ruleDefinition.create({
        data: {
          id: ruleId,
          organizationId: ctx.organizationId,
          name: rule.name,
          description: rule.description,
          priority: rule.priority,
          isActive: rule.isActive,
          triggerEvent: rule.triggerEvent,
          conditions: rule.conditions as Prisma.InputJsonValue,
          actions: rule.actions as unknown as Prisma.InputJsonValue,
          createdById: ctx.systemAdminId,
        },
      });
      console.log(
        `  + Created: ${rule.name} (priority: ${rule.priority}, active: ${rule.isActive})`,
      );
      createdCount++;
    }
  }

  return createdCount;
}

async function seedExecutionLogs(ctx: AcmeContext): Promise<number> {
  console.log("\n2. Creating Sample Execution Logs...");

  // Get active rules for log generation
  const activeRules = await prisma.ruleDefinition.findMany({
    where: {
      organizationId: ctx.organizationId,
      isActive: true,
    },
    take: 3,
  });

  if (activeRules.length === 0) {
    console.log("  - No active rules found, skipping execution logs");
    return 0;
  }

  // Get recent cases for sample logs
  const recentCases = await prisma.case.findMany({
    where: {
      organizationId: ctx.organizationId,
    },
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      severity: true,
      primaryCategoryId: true,
      sourceChannel: true,
      createdAt: true,
    },
  });

  if (recentCases.length === 0) {
    console.log("  - No cases found, skipping execution logs");
    return 0;
  }

  let createdCount = 0;
  const now = new Date();

  // Create execution logs for demonstration
  for (let i = 0; i < Math.min(8, recentCases.length); i++) {
    const caseRecord = recentCases[i];
    const rule = activeRules[i % activeRules.length];

    // Check if log already exists for this case/rule combination
    const existingLog = await prisma.ruleExecutionLog.findFirst({
      where: {
        organizationId: ctx.organizationId,
        entityId: caseRecord.id,
        ruleId: rule.id,
      },
    });

    if (existingLog) {
      continue;
    }

    // Determine if this should be a match based on rule conditions and case data
    const matched = shouldMatch(rule, {
      severity: caseRecord.severity,
      categoryId: caseRecord.primaryCategoryId,
    });

    // Build facts snapshot (use categoryId as fact name for rule engine compatibility)
    const facts = {
      caseId: caseRecord.id,
      severity: caseRecord.severity,
      categoryId: caseRecord.primaryCategoryId,
      sourceChannel: caseRecord.sourceChannel || "web",
      case: {
        severity: caseRecord.severity,
        categoryId: caseRecord.primaryCategoryId,
        sourceChannel: caseRecord.sourceChannel || "web",
      },
    };

    // Build actions taken (only if matched)
    const actionsTaken = matched
      ? (
          rule.actions as Array<{
            type: string;
            params: Record<string, unknown>;
          }>
        ).map((action) => ({
          success: true,
          actionType: action.type,
          details: action.params,
        }))
      : null;

    // Create execution log with timestamp spread over past 7 days
    await prisma.ruleExecutionLog.create({
      data: {
        id: generateUUID(),
        organizationId: ctx.organizationId,
        ruleId: rule.id,
        entityType: "CASE",
        entityId: caseRecord.id,
        facts: facts as unknown as Prisma.InputJsonValue,
        matched,
        actionsTaken: actionsTaken as unknown as Prisma.InputJsonValue,
        executionTimeMs: Math.floor(Math.random() * 45) + 5, // 5-50ms
        executedAt: subDays(now, i), // Spread across past week
      },
    });

    createdCount++;
    console.log(
      `  + Log: ${rule.name} -> Case ${caseRecord.id.slice(0, 8)}... (matched: ${matched})`,
    );
  }

  return createdCount;
}

/**
 * Simple match determination based on rule conditions and case data
 */
function shouldMatch(
  rule: { conditions: Prisma.JsonValue },
  caseRecord: { severity: string | null; categoryId: string | null },
): boolean {
  const conditions = rule.conditions as Record<string, unknown>;

  // Check for severity-based rules
  if (conditions.any && Array.isArray(conditions.any)) {
    for (const condition of conditions.any) {
      const cond = condition as { fact: string; value: string };
      if (
        cond.fact === "severity" &&
        (cond.value === caseRecord.severity ||
          (cond.value === "HIGH" && caseRecord.severity === "HIGH") ||
          (cond.value === "CRITICAL" && caseRecord.severity === "CRITICAL"))
      ) {
        return true;
      }
    }
  }

  if (conditions.all && Array.isArray(conditions.all)) {
    for (const condition of conditions.all) {
      const cond = condition as {
        fact: string;
        value: string | string[];
        operator: string;
      };
      if (cond.fact === "categoryId" && cond.value === caseRecord.categoryId) {
        return true;
      }
      if (
        cond.fact === "severity" &&
        cond.operator === "severityIn" &&
        Array.isArray(cond.value)
      ) {
        if (caseRecord.severity && cond.value.includes(caseRecord.severity)) {
          return true;
        }
      }
    }
  }

  // 40% chance of matching for other cases (for realistic demo data)
  return Math.random() < 0.4;
}

// ===========================================
// Main Seeder
// ===========================================

/**
 * Main seeder function for Phase 40 Acme Co. demo data.
 * Creates demo routing rules and sample execution logs.
 */
export async function seedAcmePhase40(): Promise<void> {
  console.log("\n========================================");
  console.log("ACME PHASE 40 SEED - Rules Engine Foundation");
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

  // Get CCO user for rule assignment
  const ccoUser = await prisma.user.findFirst({
    where: {
      organizationId: acmeOrg.id,
      email: "demo-cco@acme.local",
    },
  });

  if (ccoUser) {
    console.log(`CCO User: ${ccoUser.email}`);
  }

  // Get an existing team for round-robin demo (Team requires departmentId, so we find one)
  const investigationTeam = await prisma.team.findFirst({
    where: {
      organizationId: acmeOrg.id,
    },
    orderBy: { name: "asc" },
  });

  if (investigationTeam) {
    console.log(
      `Using team for round-robin: ${investigationTeam.name} (${investigationTeam.id})`,
    );
  } else {
    console.log("No team found for round-robin demo - rule will be skipped");
  }

  // Get Fraud category for category-based routing
  const fraudCategory = await prisma.category.findFirst({
    where: {
      organizationId: acmeOrg.id,
      name: { contains: "Fraud", mode: "insensitive" },
    },
  });

  if (fraudCategory) {
    console.log(`Fraud Category: ${fraudCategory.name} (${fraudCategory.id})`);
  }

  // Build context
  const ctx: AcmeContext = {
    organizationId: acmeOrg.id,
    systemAdminId: systemAdmin.id,
    ccoUserId: ccoUser?.id || null,
    investigationTeamId: investigationTeam?.id || null,
    fraudCategoryId: fraudCategory?.id || null,
  };

  // Seed rules
  const rulesCreated = await seedRules(ctx);

  // Seed execution logs
  const logsCreated = await seedExecutionLogs(ctx);

  // Summary
  console.log("\n========================================");
  console.log("ACME PHASE 40 SEED COMPLETE");
  console.log("========================================");
  console.log(`\nSummary:`);
  console.log(`  - Routing rules created: ${rulesCreated}`);
  console.log(`  - Execution logs created: ${logsCreated}`);
  console.log(
    `  - Active rules: ${rulesCreated > 0 ? "Yes - new cases will be auto-routed" : "Check rule configuration"}`,
  );
  console.log("\nDemo rules configured:");
  console.log("  1. Route HIGH/CRITICAL to CCO (priority 10, active)");
  console.log("  2. Route Fraud to Legal Review (priority 20, active)");
  console.log("  3. Round-Robin General Cases (priority 100, active)");
  console.log("  4. Hotline Reports to Triage (priority 15, INACTIVE)");
  console.log("========================================\n");
}

// Run if executed directly
if (require.main === module) {
  seedAcmePhase40()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
