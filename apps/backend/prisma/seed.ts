import {
  PrismaClient,
  CaseStatus,
  InvestigationStatus,
  InvestigationOutcome,
} from "@prisma/client";
import { seedCategories } from "./seeders/category.seeder";
import { seedLocations, LOCATIONS } from "./seeders/location.seeder";
import { seedDivisions } from "./seeders/division.seeder";
import { seedEmployees } from "./seeders/employee.seeder";
import { seedDemoUsers } from "./seeders/user.seeder";
import { seedRius } from "./seeders/riu.seeder";
import { seedCases, createRecentUnreadCases } from "./seeders/case.seeder";
import { seedPolicies } from "./seeders/policy.seeder";
import {
  seedInvestigations,
  getInvestigationStats,
} from "./seeders/investigation.seeder";
import {
  generateRepeatSubjectPool,
  generateManagerHotspots,
  generateRetaliationPatterns,
  FLAGSHIP_CASES,
  getFlagshipStats,
  getRetaliationStats,
  getHotspotStats,
} from "./seeders/patterns";
import { seedSavedViews } from "./seeders/saved-views.seeder";
import { seedActivityTimelines } from "./seeders/activity.seeder";
import { seedNotifications } from "./seeders/notification.seeder";
import { seedAcmePhase09 } from "./seeders/acme-phase-09";
import { seedAcmePhase12 } from "./seeders/acme-phase-12";
import { seedPhase17 } from "./seeders/acme-phase-17";
import { seedPhase18 } from "./seeders/acme-phase-18";
import { seedPhase19 } from "./seeders/acme-phase-19";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");
  const startTime = Date.now();

  // Create test organization
  const organization = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corporation",
      slug: "acme-corp",
      settings: {
        timezone: "America/New_York",
        locale: "en-US",
        features: {
          caseManagement: true,
          policyManagement: true,
          disclosures: true,
          analytics: true,
        },
      },
    },
  });

  console.log(
    `Created organization: ${organization.name} (${organization.id})`,
  );

  // Seed categories (required for RIUs and Cases)
  console.log("\nSeeding categories...");
  const categoryNameToId = await seedCategories(prisma, organization.id);
  console.log(`Created ${categoryNameToId.size} categories`);

  // Seed locations (52 global locations across US, EMEA, APAC)
  console.log("\nSeeding locations...");
  const locationCodeToId = await seedLocations(prisma, organization.id);
  console.log(`Created ${locationCodeToId.size} locations`);

  // Build location ID to region map for RIU timezone adjustment
  const locationIdToRegion = new Map<string, string>();
  const allLocations = [...LOCATIONS.US, ...LOCATIONS.EMEA, ...LOCATIONS.APAC];
  for (const loc of allLocations) {
    const locationId = locationCodeToId.get(loc.code);
    if (locationId) {
      locationIdToRegion.set(locationId, loc.region);
    }
  }

  // Seed divisions and org structure (4 divisions, ~10 BUs, ~25 depts, ~60 teams)
  console.log("\nSeeding divisions and org structure...");
  const orgStructure = await seedDivisions(prisma, organization.id);
  console.log(
    `Created ${orgStructure.divisions.size} divisions, ${orgStructure.businessUnits.size} BUs, ${orgStructure.departments.size} departments, ${orgStructure.teams.size} teams`,
  );

  // Seed employees (20,000 with full hierarchy - this takes a few minutes)
  console.log("\nSeeding employees (this may take a few minutes)...");
  const employeeEmailToId = await seedEmployees(
    prisma,
    organization.id,
    locationCodeToId,
    orgStructure,
  );
  console.log(`Created ${employeeEmailToId.size} employees`);

  // Seed demo users (9 permanent sales rep accounts with role presets)
  console.log("\nSeeding demo users...");
  const demoUserIds = await seedDemoUsers(prisma, organization.id);
  console.log(`Created ${demoUserIds.length} demo users`);

  // Get CCO user for policy ownership
  const ccoUser = await prisma.user.findFirst({
    where: {
      organizationId: organization.id,
      email: "demo-cco@acme.local",
    },
    select: { id: true },
  });

  if (!ccoUser) {
    throw new Error("Demo CCO user not found. Cannot seed policies.");
  }

  // Seed policies (50 compliance policies with translations)
  console.log("\nSeeding policies (50 with translations)...");
  const policyResult = await seedPolicies(prisma, organization.id, ccoUser.id);
  console.log(
    `Created ${policyResult.policyCount} policies with ${policyResult.translationCount} translations`,
  );

  // ========================================
  // Prepare data for RIU seeding
  // ========================================

  // Get all user IDs for createdBy field
  const users = await prisma.user.findMany({
    where: { organizationId: organization.id },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  // Build category map with id and code for RIU seeder
  // Fetch categories from DB to get both id and code
  const categories = await prisma.category.findMany({
    where: { organizationId: organization.id },
    select: { id: true, code: true, name: true },
  });
  const categoryMap = new Map<
    string,
    { id: string; code: string; name?: string }
  >();
  for (const cat of categories) {
    // Key by name for easy lookup
    categoryMap.set(cat.name, {
      id: cat.id,
      code: cat.code || cat.name,
      name: cat.name,
    });
    // Also key by code for direct lookup
    if (cat.code) {
      categoryMap.set(cat.code, { id: cat.id, code: cat.code, name: cat.name });
    }
  }

  // Build category name to ID map for pattern generation
  const categoryNameToIdMap = new Map<string, string>();
  for (const cat of categories) {
    categoryNameToIdMap.set(cat.name, cat.id);
  }

  // Build employee map with locationId for regional timestamp adjustment
  const employees = await prisma.employee.findMany({
    where: { organizationId: organization.id },
    select: { id: true, email: true, locationId: true },
  });
  const employeeMap = new Map<
    string,
    { id: string; locationId: string | null }
  >();
  const employeeIds: string[] = [];
  for (const emp of employees) {
    employeeMap.set(emp.email, { id: emp.id, locationId: emp.locationId });
    employeeIds.push(emp.id);
  }

  // Get manager IDs for hotspot pattern
  const managers = await prisma.employee.findMany({
    where: {
      organizationId: organization.id,
      jobLevel: { in: ["MANAGER", "DIRECTOR", "VP"] },
    },
    select: { id: true },
  });
  const managerIds = managers.map((m) => m.id);

  // ========================================
  // Seed RIUs (5,000 historical intake records)
  // ========================================
  console.log("\nSeeding RIUs (5,000 historical intake records)...");
  const { riuIds, linkedIncidents } = await seedRius(
    prisma,
    organization.id,
    userIds,
    categoryMap,
    employeeMap,
    locationIdToRegion,
  );
  console.log(
    `Created ${riuIds.length} RIUs (${linkedIncidents.filter((i) => i.riusCreated > 0).length} linked incidents)`,
  );

  // ========================================
  // Generate patterns for realistic data
  // ========================================
  console.log("\nGenerating data patterns...");

  // Generate repeat subjects pool (~50 employees appearing in multiple cases)
  const categoryIds = Array.from(categoryNameToIdMap.values());
  const repeatSubjects = generateRepeatSubjectPool(
    employeeIds,
    categoryIds,
    50,
  );
  console.log(`  Repeat subjects pool: ${repeatSubjects.length} employees`);

  // Generate manager hotspots (~15 managers with elevated team case rates)
  const managerHotspots = generateManagerHotspots(
    managerIds,
    15,
    categoryNameToIdMap,
  );
  console.log(`  Manager hotspots: ${managerHotspots.length} managers`);

  // Flagship cases are predefined
  console.log(`  Flagship cases: ${FLAGSHIP_CASES.length} named cases`);

  // ========================================
  // Seed Cases (4,500 from RIUs with patterns)
  // ========================================
  console.log("\nSeeding Cases (4,500 from RIUs with patterns)...");
  const { caseIds, caseData } = await seedCases(
    prisma,
    organization.id,
    riuIds,
    userIds,
    employeeIds,
    categoryMap,
    {
      repeatSubjects,
      managerHotspots,
      flagshipCases: FLAGSHIP_CASES,
    },
  );
  console.log(`Created ${caseIds.length} Cases (target: 4,500)`);

  // Create recent unread cases for live triage demo
  const recentUnreadCount = await createRecentUnreadCases(
    prisma,
    organization.id,
    caseIds,
  );
  console.log(`  Recent unread cases: ${recentUnreadCount}`);

  // Generate retaliation patterns from closed cases
  const closedCaseIds = caseData
    .filter((c) => c.status === CaseStatus.CLOSED)
    .map((c) => c.id);
  const retaliationChains = generateRetaliationPatterns(closedCaseIds, 50);
  console.log(`  Retaliation patterns planned: ${retaliationChains.length}`);

  // ========================================
  // Seed Investigations (~5,000)
  // ========================================
  console.log(
    "\nSeeding Investigations (~5,000 with outcomes and timelines)...",
  );
  await seedInvestigations(
    prisma,
    organization.id,
    caseData.map((c) => ({
      id: c.id,
      status: c.status,
      createdAt: c.createdAt,
      categoryId: c.categoryId,
      priority: c.priority,
      isFlagship: c.isFlagship,
    })),
    userIds,
  );

  // ========================================
  // Seed Activity Timeline (AuditLog entries)
  // ========================================
  console.log("\nSeeding activity timeline (~15,000 audit entries)...");
  await seedActivityTimelines(prisma, organization.id);

  // ========================================
  // Seed Saved Views (HubSpot-style views for all modules)
  // ========================================
  console.log("\nSeeding saved views...");
  await seedSavedViews(prisma, organization.id);

  // ========================================
  // Seed Notifications for demo users
  // ========================================
  console.log("\nSeeding notifications...");
  const notificationCount = await seedNotifications(
    prisma,
    organization.id,
    demoUserIds,
    caseIds,
  );
  console.log(`Created ${notificationCount} notifications for demo users`);

  // ========================================
  // Phase Seeders (cumulative, order matters)
  // ========================================
  console.log("\nRunning phase seeders...");

  // Phase 09: Policies & Disclosures
  await seedAcmePhase09();

  // Phase 12: Project Management
  await seedAcmePhase12();

  // Phase 17: Campaigns Hub
  await seedPhase17();

  // Phase 18: Reports & Data Management
  await seedPhase18();

  // Phase 19: Workflow Engine UI
  await seedPhase19();

  // ========================================
  // Calculate Demo Metrics
  // ========================================
  console.log("\nCalculating demo metrics...");

  // Case metrics
  const totalCases = await prisma.case.count({
    where: { organizationId: organization.id },
  });
  const openCases = await prisma.case.count({
    where: {
      organizationId: organization.id,
      status: { in: [CaseStatus.NEW, CaseStatus.OPEN] },
    },
  });
  const closedCases = await prisma.case.count({
    where: { organizationId: organization.id, status: CaseStatus.CLOSED },
  });
  const openCasePercent = Math.round((openCases / totalCases) * 100);

  // Investigation metrics
  const investigationStats = await getInvestigationStats(
    prisma,
    organization.id,
  );

  // Pattern metrics
  const flagshipStats = getFlagshipStats();
  const hotspotStats = getHotspotStats(managerHotspots);
  const retaliationStats = getRetaliationStats(retaliationChains);

  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log(`\nSeed completed successfully in ${duration} seconds!`);

  // ========================================
  // Demo Data Summary
  // ========================================
  console.log("\n========================================");
  console.log("DEMO DATA SUMMARY");
  console.log("========================================");
  console.log(`\nOrganization: ${organization.name}`);
  console.log(`Categories: ${categoryMap.size}`);
  console.log(`Locations: ${locationCodeToId.size}`);
  console.log(`Divisions: ${orgStructure.divisions.size}`);
  console.log(`Business Units: ${orgStructure.businessUnits.size}`);
  console.log(`Departments: ${orgStructure.departments.size}`);
  console.log(`Teams: ${orgStructure.teams.size}`);
  console.log(`Employees: ${employeeMap.size}`);
  console.log(`Demo Users: ${demoUserIds.length}`);
  console.log(`RIUs: ${riuIds.length}`);
  console.log(
    `Linked Incidents: ${linkedIncidents.filter((i) => i.riusCreated > 0).length}`,
  );

  console.log("\n--- CASES ---");
  console.log(`Total Cases: ${totalCases} (target: 4,500)`);
  console.log(`Open Cases: ${openCases} (~${openCasePercent}%, target: ~10%)`);
  console.log(
    `Closed Cases: ${closedCases} (~${100 - openCasePercent}%, target: ~90%)`,
  );
  console.log(`Recent Unread: ${recentUnreadCount}`);

  console.log("\n--- INVESTIGATIONS ---");
  console.log(
    `Total Investigations: ${investigationStats.total} (target: ~5,000)`,
  );
  console.log(`Open Investigations: ${investigationStats.open}`);
  console.log(`Closed Investigations: ${investigationStats.closed}`);
  console.log(
    `Substantiation Rate: ${investigationStats.substantiationRate}% (target: ~60%)`,
  );
  console.log(
    `Avg Duration: ${investigationStats.avgDuration} days (target: <22)`,
  );

  console.log("\n--- AUDIT LOG ---");
  const auditLogCount = await prisma.auditLog.count({
    where: { organizationId: organization.id },
  });
  console.log(`Audit Log Entries: ${auditLogCount}`);

  console.log("\n--- NOTIFICATIONS ---");
  console.log(`Notifications: ${notificationCount}`);

  console.log("\n--- PATTERNS ---");
  console.log(
    `Repeat Subjects: ${repeatSubjects.length} employees in 2-5 cases each`,
  );
  console.log(
    `Manager Hotspots: ${hotspotStats.totalHotspots} managers with ${hotspotStats.avgTeamCaseRate}x case rate`,
  );
  console.log(
    `Retaliation Chains: ${retaliationStats.total} follow-up cases planned`,
  );
  console.log(
    `Flagship Cases: ${flagshipStats.total} (${flagshipStats.open} open, ${flagshipStats.closed} closed)`,
  );
  console.log(`  - With CCO Escalation: ${flagshipStats.withEscalation}`);
  console.log(`  - With External Party: ${flagshipStats.withExternalParty}`);
  console.log(`  - Avg Risk Score: ${flagshipStats.avgRiskScore}`);

  console.log("\n--- SAVED VIEWS ---");
  console.log("Default views created for all modules:");
  console.log(
    "  Cases: All Cases, Open Cases, High Priority, Pipeline (board)",
  );
  console.log("  Investigations: All Investigations, Active, Board");
  console.log("  Policies: All Policies, Published, Review Needed");
  console.log("  Disclosures: All Disclosures, Pending Review, High Risk");
  console.log("  Intake Forms: All Submissions, Pending Review, Anonymous");

  console.log("\n========================================");
  console.log("DEMO CREDENTIALS");
  console.log("========================================");
  console.log("\nPassword for all accounts: Password123!");
  console.log("\nPermanent Sales Rep Accounts (role presets):");
  console.log("  demo-admin@acme.local         - SYSTEM_ADMIN");
  console.log("  demo-cco@acme.local           - COMPLIANCE_OFFICER");
  console.log("  demo-triage@acme.local        - TRIAGE_LEAD");
  console.log("  demo-investigator@acme.local  - INVESTIGATOR");
  console.log("  demo-investigator2@acme.local - INVESTIGATOR");
  console.log("  demo-policy@acme.local        - POLICY_AUTHOR");
  console.log("  demo-reviewer@acme.local      - POLICY_REVIEWER");
  console.log("  demo-manager@acme.local       - MANAGER");
  console.log("  demo-employee@acme.local      - EMPLOYEE");
  console.log("\nSales reps can provision prospect accounts via:");
  console.log("  POST /api/v1/demo/prospects");
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
