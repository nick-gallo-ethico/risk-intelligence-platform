/**
 * Phase 18 Demo Data Seeder - Reports & Data Management
 *
 * Seeds Acme Co. with Phase 18 specific data:
 * - 10 pre-built report templates for common compliance reporting needs
 * - 5 sample saved reports for the demo CCO user
 *
 * Report templates cover:
 * - Case Volume by Category (bar chart)
 * - Time-to-Close Trends (line chart)
 * - SLA Compliance Rate (KPI)
 * - Disclosure Completion Rates (stacked bar)
 * - Open Cases by Priority (bar chart)
 * - Anonymous vs Named Reports (pie chart)
 * - Cases by Location/Region (bar chart)
 * - Investigator Workload (bar chart)
 * - RIU Intake Trends (line chart)
 * - Quarterly Board Summary (table)
 *
 * Usage:
 *   npx ts-node prisma/seeders/acme-phase-18.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// ===========================================
// Types
// ===========================================

interface ReportConfig {
  name: string;
  description: string;
  entityType: string;
  columns: string[];
  filters?: Prisma.InputJsonValue;
  groupBy?: Prisma.InputJsonValue;
  aggregation?: Prisma.InputJsonValue;
  visualization: string;
  chartConfig?: Prisma.InputJsonValue;
  sortBy?: string;
  sortOrder?: string;
  isTemplate: boolean;
  templateCategory?: string;
  visibility: string;
}

interface AcmeContext {
  organizationId: string;
  complianceOfficerId: string;
}

// ===========================================
// Helper Functions
// ===========================================

function generateUUID(): string {
  return faker.string.uuid();
}

// ===========================================
// Report Template Configurations
// ===========================================

const REPORT_TEMPLATES: ReportConfig[] = [
  // 1. Case Volume by Category (bar chart)
  {
    name: "Case Volume by Category",
    description:
      "Bar chart showing the distribution of cases across compliance categories. Useful for identifying high-volume areas requiring additional resources.",
    entityType: "cases",
    columns: ["categoryName", "status", "createdAt"],
    filters: [],
    groupBy: ["categoryId"],
    aggregation: { function: "count", field: "id" },
    visualization: "bar",
    chartConfig: {
      xAxis: "categoryName",
      yAxis: "count",
      colors: ["#3b82f6"],
      showLegend: true,
    },
    isTemplate: true,
    templateCategory: "compliance",
    visibility: "EVERYONE",
  },

  // 2. Time-to-Close Trends (line chart)
  {
    name: "Time-to-Close Trends",
    description:
      "Monthly trend line showing average case closure time. Tracks operational efficiency and helps identify bottlenecks in case processing.",
    entityType: "cases",
    columns: ["createdAt", "outcomeAt", "categoryName"],
    filters: [{ field: "status", operator: "eq", value: "CLOSED" }],
    groupBy: ["createdAt"],
    aggregation: {
      function: "avg",
      field: "daysToClose",
      dateTruncate: "month",
    },
    visualization: "line",
    chartConfig: {
      xAxis: "month",
      yAxis: "avgDaysToClose",
      colors: ["#10b981"],
      showTrend: true,
    },
    isTemplate: true,
    templateCategory: "compliance",
    visibility: "EVERYONE",
  },

  // 3. SLA Compliance Rate (KPI)
  {
    name: "SLA Compliance Rate",
    description:
      "Key performance indicator showing percentage of cases meeting SLA targets. Critical metric for compliance program health.",
    entityType: "cases",
    columns: ["status", "severity", "slaDueAt", "slaStatus"],
    filters: [],
    aggregation: {
      function: "percentage",
      field: "slaStatus",
      condition: { slaStatus: { in: ["ON_TRACK", "COMPLETED"] } },
    },
    visualization: "kpi",
    chartConfig: {
      format: "percentage",
      thresholds: { good: 90, warning: 75 },
      comparison: "previous_period",
    },
    isTemplate: true,
    templateCategory: "compliance",
    visibility: "EVERYONE",
  },

  // 4. Disclosure Completion Rates (stacked bar)
  {
    name: "Disclosure Completion Rates",
    description:
      "Stacked bar chart showing campaign completion status by campaign. Helps track disclosure program effectiveness.",
    entityType: "campaigns",
    columns: ["name", "status", "totalAssignments", "completedAssignments"],
    filters: [{ field: "type", operator: "in", value: ["DISCLOSURE"] }],
    groupBy: ["name"],
    aggregation: {
      function: "sum",
      fields: ["completedAssignments", "overdueAssignments"],
    },
    visualization: "stacked_bar",
    chartConfig: {
      xAxis: "campaignName",
      yAxis: "count",
      stackBy: "status",
      colors: ["#22c55e", "#eab308", "#ef4444"],
    },
    isTemplate: true,
    templateCategory: "compliance",
    visibility: "EVERYONE",
  },

  // 5. Open Cases by Priority (bar)
  {
    name: "Open Cases by Priority",
    description:
      "Bar chart displaying open cases grouped by severity/priority level. Essential for workload management and resource allocation.",
    entityType: "cases",
    columns: ["severity", "status", "pipelineStage"],
    filters: [
      {
        field: "status",
        operator: "in",
        value: ["NEW", "IN_PROGRESS", "PENDING"],
      },
    ],
    groupBy: ["severity"],
    aggregation: { function: "count", field: "id" },
    visualization: "bar",
    chartConfig: {
      xAxis: "severity",
      yAxis: "count",
      colors: {
        CRITICAL: "#ef4444",
        HIGH: "#f97316",
        MEDIUM: "#eab308",
        LOW: "#22c55e",
      },
      sortBy: "severity",
    },
    isTemplate: true,
    templateCategory: "operations",
    visibility: "EVERYONE",
  },

  // 6. Anonymous vs Named Reports (pie)
  {
    name: "Anonymous vs Named Reports",
    description:
      "Pie chart showing the proportion of anonymous versus identified reports. Indicates reporter comfort level with the reporting system.",
    entityType: "rius",
    columns: ["reporterType", "createdAt"],
    filters: [],
    groupBy: ["reporterType"],
    aggregation: { function: "count", field: "id" },
    visualization: "pie",
    chartConfig: {
      labelField: "reporterType",
      valueField: "count",
      colors: {
        ANONYMOUS: "#6366f1",
        CONFIDENTIAL: "#8b5cf6",
        IDENTIFIED: "#a855f7",
      },
      showPercentage: true,
    },
    isTemplate: true,
    templateCategory: "compliance",
    visibility: "EVERYONE",
  },

  // 7. Cases by Location/Region (bar)
  {
    name: "Cases by Location/Region",
    description:
      "Bar chart showing case distribution across business units and regions. Helps identify geographic patterns and regional compliance needs.",
    entityType: "cases",
    columns: ["locationName", "businessUnitName", "status"],
    filters: [],
    groupBy: ["businessUnitName"],
    aggregation: { function: "count", field: "id" },
    visualization: "bar",
    chartConfig: {
      xAxis: "businessUnitName",
      yAxis: "count",
      colors: ["#0ea5e9"],
      orientation: "horizontal",
    },
    isTemplate: true,
    templateCategory: "operations",
    visibility: "EVERYONE",
  },

  // 8. Investigator Workload (bar)
  {
    name: "Investigator Workload",
    description:
      "Bar chart showing active investigation count per investigator. Critical for balanced workload distribution and capacity planning.",
    entityType: "investigations",
    columns: ["assigneeName", "status", "createdAt"],
    filters: [
      { field: "status", operator: "in", value: ["PENDING", "IN_PROGRESS"] },
    ],
    groupBy: ["assigneeId"],
    aggregation: { function: "count", field: "id" },
    visualization: "bar",
    chartConfig: {
      xAxis: "assigneeName",
      yAxis: "count",
      colors: ["#14b8a6"],
      showAverage: true,
    },
    isTemplate: true,
    templateCategory: "operations",
    visibility: "EVERYONE",
  },

  // 9. RIU Intake Trends (line)
  {
    name: "RIU Intake Trends",
    description:
      "Monthly line chart tracking risk intelligence unit intake volume. Useful for identifying seasonal patterns and predicting resource needs.",
    entityType: "rius",
    columns: ["type", "sourceChannel", "createdAt"],
    filters: [],
    groupBy: ["createdAt"],
    aggregation: { function: "count", field: "id", dateTruncate: "month" },
    visualization: "line",
    chartConfig: {
      xAxis: "month",
      yAxis: "count",
      colors: ["#f59e0b"],
      showTrend: true,
      showYearOverYear: true,
    },
    isTemplate: true,
    templateCategory: "compliance",
    visibility: "EVERYONE",
  },

  // 10. Quarterly Board Summary (table)
  {
    name: "Quarterly Board Summary",
    description:
      "Comprehensive table report for quarterly board presentations. Includes key case details, outcomes, and metrics for executive review.",
    entityType: "cases",
    columns: [
      "referenceNumber",
      "title",
      "categoryName",
      "status",
      "severity",
      "outcome",
      "assigneeName",
      "createdAt",
      "outcomeAt",
    ],
    filters: [],
    visualization: "table",
    chartConfig: {
      pageSize: 25,
      showSummary: true,
      exportable: true,
    },
    sortBy: "createdAt",
    sortOrder: "desc",
    isTemplate: true,
    templateCategory: "executive",
    visibility: "EVERYONE",
  },
];

// ===========================================
// Sample User Reports
// ===========================================

const SAMPLE_USER_REPORTS: ReportConfig[] = [
  // 1. My Open Cases
  {
    name: "My Open Cases",
    description:
      "Table of all open cases for quick status review and prioritization.",
    entityType: "cases",
    columns: [
      "referenceNumber",
      "title",
      "categoryName",
      "severity",
      "status",
      "slaDueAt",
      "assigneeName",
      "createdAt",
    ],
    filters: [
      { field: "status", operator: "in", value: ["NEW", "IN_PROGRESS"] },
    ],
    visualization: "table",
    sortBy: "severity",
    sortOrder: "desc",
    isTemplate: false,
    visibility: "PRIVATE",
  },

  // 2. Q4 2025 Harassment Cases
  {
    name: "Q4 2025 Harassment Cases",
    description:
      "Filtered view of harassment-related cases from Q4 2025 for trend analysis.",
    entityType: "cases",
    columns: [
      "referenceNumber",
      "title",
      "subcategoryName",
      "status",
      "severity",
      "outcome",
      "createdAt",
      "outcomeAt",
    ],
    filters: [
      { field: "categoryName", operator: "contains", value: "Harassment" },
      { field: "createdAt", operator: "gte", value: "2025-10-01" },
      { field: "createdAt", operator: "lte", value: "2025-12-31" },
    ],
    visualization: "table",
    sortBy: "createdAt",
    sortOrder: "desc",
    isTemplate: false,
    visibility: "PRIVATE",
  },

  // 3. Monthly RIU Volume
  {
    name: "Monthly RIU Volume",
    description:
      "Line chart tracking monthly intake volume for trend monitoring.",
    entityType: "rius",
    columns: ["type", "sourceChannel", "createdAt"],
    filters: [],
    groupBy: ["createdAt"],
    aggregation: { function: "count", field: "id", dateTruncate: "month" },
    visualization: "line",
    chartConfig: {
      xAxis: "month",
      yAxis: "count",
      colors: ["#6366f1"],
    },
    isTemplate: false,
    visibility: "PRIVATE",
  },

  // 4. Top 10 Repeat Subjects
  {
    name: "Top 10 Repeat Subjects",
    description:
      "Table identifying individuals appearing in multiple cases for pattern detection.",
    entityType: "persons",
    columns: [
      "displayName",
      "email",
      "businessUnitName",
      "caseCount",
      "lastCaseDate",
    ],
    filters: [{ field: "caseCount", operator: "gte", value: 2 }],
    visualization: "table",
    chartConfig: { pageSize: 10 },
    sortBy: "caseCount",
    sortOrder: "desc",
    isTemplate: false,
    visibility: "PRIVATE",
  },

  // 5. Campaign Compliance Score
  {
    name: "Campaign Compliance Score",
    description:
      "Bar chart showing completion rates across all active campaigns.",
    entityType: "campaigns",
    columns: ["name", "type", "status", "completionPercentage"],
    filters: [
      { field: "status", operator: "in", value: ["ACTIVE", "COMPLETED"] },
    ],
    groupBy: ["status"],
    aggregation: { function: "avg", field: "completionPercentage" },
    visualization: "bar",
    chartConfig: {
      xAxis: "campaignName",
      yAxis: "completionPercentage",
      colors: ["#22c55e"],
    },
    isTemplate: false,
    visibility: "PRIVATE",
  },
];

// ===========================================
// Seeder Functions
// ===========================================

async function seedReportTemplates(ctx: AcmeContext): Promise<number> {
  console.log("\n1. Creating pre-built report templates...");
  let createdCount = 0;

  for (const config of REPORT_TEMPLATES) {
    // Check if template already exists (idempotent)
    const existing = await prisma.savedReport.findFirst({
      where: {
        organizationId: ctx.organizationId,
        name: config.name,
        isTemplate: true,
      },
    });

    if (existing) {
      console.log(`  - Template already exists: ${config.name}`);
      continue;
    }

    await prisma.savedReport.create({
      data: {
        id: generateUUID(),
        organizationId: ctx.organizationId,
        name: config.name,
        description: config.description,
        entityType: config.entityType,
        columns: config.columns as unknown as Prisma.InputJsonValue,
        filters: config.filters || [],
        groupBy: config.groupBy ?? Prisma.JsonNull,
        aggregation: config.aggregation ?? Prisma.JsonNull,
        visualization: config.visualization,
        chartConfig: config.chartConfig ?? Prisma.JsonNull,
        sortBy: config.sortBy ?? null,
        sortOrder: config.sortOrder ?? null,
        isTemplate: true,
        templateCategory: config.templateCategory ?? null,
        visibility: config.visibility,
        createdById: ctx.complianceOfficerId,
      },
    });

    createdCount++;
    console.log(
      `  + Created template: ${config.name} (${config.visualization}, ${config.templateCategory})`,
    );
  }

  return createdCount;
}

async function seedUserReports(ctx: AcmeContext): Promise<number> {
  console.log("\n2. Creating sample user reports for demo CCO...");
  let createdCount = 0;

  for (const config of SAMPLE_USER_REPORTS) {
    // Check if report already exists (idempotent)
    const existing = await prisma.savedReport.findFirst({
      where: {
        organizationId: ctx.organizationId,
        name: config.name,
        createdById: ctx.complianceOfficerId,
        isTemplate: false,
      },
    });

    if (existing) {
      console.log(`  - Report already exists: ${config.name}`);
      continue;
    }

    await prisma.savedReport.create({
      data: {
        id: generateUUID(),
        organizationId: ctx.organizationId,
        name: config.name,
        description: config.description,
        entityType: config.entityType,
        columns: config.columns as unknown as Prisma.InputJsonValue,
        filters: config.filters || [],
        groupBy: config.groupBy ?? Prisma.JsonNull,
        aggregation: config.aggregation ?? Prisma.JsonNull,
        visualization: config.visualization,
        chartConfig: config.chartConfig ?? Prisma.JsonNull,
        sortBy: config.sortBy ?? null,
        sortOrder: config.sortOrder ?? null,
        isTemplate: false,
        templateCategory: null,
        visibility: config.visibility,
        createdById: ctx.complianceOfficerId,
      },
    });

    createdCount++;
    console.log(`  + Created report: ${config.name} (${config.visualization})`);
  }

  return createdCount;
}

// ===========================================
// Main Seeder
// ===========================================

/**
 * Main seeder function for Phase 18 Acme Co. demo data.
 * Cumulative - adds to existing Acme data.
 */
export async function seedPhase18(): Promise<void> {
  console.log("\n========================================");
  console.log("ACME PHASE 18 SEED - Reports & Data Management");
  console.log("========================================\n");

  // Initialize faker for reproducibility
  faker.seed(20260218);

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

  // Get compliance officer user (demo CCO)
  const complianceOfficer = await prisma.user.findFirst({
    where: {
      organizationId: acmeOrg.id,
      OR: [
        { email: "demo-cco@acme.local" },
        { email: { contains: "compliance" } },
        { role: "COMPLIANCE_OFFICER" },
      ],
    },
  });

  if (!complianceOfficer) {
    console.error("ERROR: Compliance officer user not found.");
    return;
  }

  console.log(`Compliance Officer: ${complianceOfficer.email}`);

  const ctx: AcmeContext = {
    organizationId: acmeOrg.id,
    complianceOfficerId: complianceOfficer.id,
  };

  // Seed report templates
  const templatesCreated = await seedReportTemplates(ctx);

  // Seed sample user reports
  const reportsCreated = await seedUserReports(ctx);

  // Summary
  console.log("\n========================================");
  console.log("ACME PHASE 18 SEED COMPLETE");
  console.log("========================================");
  console.log(`\nSummary:`);
  console.log(`  - Report templates created: ${templatesCreated}`);
  console.log(`  - User reports created: ${reportsCreated}`);
  console.log("\nTemplate Categories:");
  console.log("  - compliance: 6 templates");
  console.log("  - operations: 3 templates");
  console.log("  - executive: 1 template");
  console.log("========================================\n");
}

// Run if executed directly
if (require.main === module) {
  seedPhase18()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
