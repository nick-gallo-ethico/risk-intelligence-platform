/**
 * Demo Tenant Seeder Orchestrator
 *
 * Main entry point for seeding the Acme Co. demo tenant with realistic
 * 3-year historical data. Uses deterministic seeding for reproducibility.
 *
 * Usage:
 *   npx ts-node prisma/seeders/index.ts
 *
 * Or via npm script:
 *   npm run db:seed:demo
 */

import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { SEED_CONFIG } from "./config";
import { logSection, logInfo, logComplete } from "./utils";
import { seedPolicies } from "./policy.seeder";

/**
 * Initialize faker with deterministic seed and reference date.
 *
 * IMPORTANT: Call this at the start of seeding to ensure reproducibility.
 * faker.seed() makes all faker calls deterministic.
 * faker.setDefaultRefDate() ensures date-relative calls are consistent.
 */
function initializeFaker(): void {
  faker.seed(SEED_CONFIG.masterSeed);
  faker.setDefaultRefDate(SEED_CONFIG.currentDate);

  logInfo(`Faker seed: ${SEED_CONFIG.masterSeed}`);
  logInfo(`Reference date: ${SEED_CONFIG.currentDate.toISOString()}`);
}

/**
 * Verify deterministic seeding is working correctly.
 *
 * Generates the same data twice and confirms they match.
 * This catches issues with seed initialization early.
 */
function verifyDeterministicSeeding(): void {
  // First run
  faker.seed(SEED_CONFIG.masterSeed);
  const run1 = [
    faker.person.firstName(),
    faker.person.lastName(),
    faker.company.name(),
  ];

  // Second run with same seed
  faker.seed(SEED_CONFIG.masterSeed);
  const run2 = [
    faker.person.firstName(),
    faker.person.lastName(),
    faker.company.name(),
  ];

  // Verify they match
  const isMatch =
    run1[0] === run2[0] && run1[1] === run2[1] && run1[2] === run2[2];

  if (!isMatch) {
    throw new Error(
      `Deterministic seeding verification failed!\n` +
        `Run 1: ${run1.join(", ")}\n` +
        `Run 2: ${run2.join(", ")}`,
    );
  }

  logInfo(`Deterministic seeding verified: ${run1[0]} ${run1[1]}, ${run1[2]}`);
}

/**
 * Seed the demo tenant with all required data.
 *
 * This function orchestrates all individual seeders in the correct order,
 * respecting dependencies between entity types.
 *
 * Seeding order (planned - to be implemented in subsequent plans):
 * 1. Organization structure (divisions, business units, departments, teams)
 * 2. Locations
 * 3. Employees and managers
 * 4. Demo user accounts
 * 5. Categories and case types
 * 6. Policies
 * 7. RIUs (Risk Intelligence Units)
 * 8. Cases and investigations
 * 9. Campaigns and responses
 * 10. Search index pre-population
 *
 * @param prisma PrismaClient instance
 */
export async function seedDemoTenant(prisma: PrismaClient): Promise<void> {
  logSection("Demo Tenant Seed");
  logInfo(`Initializing demo tenant seed with seed: ${SEED_CONFIG.masterSeed}`);

  // Initialize faker for deterministic data generation
  initializeFaker();

  // Verify determinism is working
  verifyDeterministicSeeding();

  // Re-initialize faker after verification (verification consumed some random values)
  initializeFaker();

  logInfo("");
  logInfo("Seed configuration:");
  logInfo(`  Employees: ${SEED_CONFIG.volumes.employees.toLocaleString()}`);
  logInfo(`  RIUs: ${SEED_CONFIG.volumes.rius.toLocaleString()}`);
  logInfo(`  Cases: ${SEED_CONFIG.volumes.cases.toLocaleString()}`);
  logInfo(`  Campaigns: ${SEED_CONFIG.volumes.campaigns}`);
  logInfo(`  Policies: ${SEED_CONFIG.volumes.policies}`);
  logInfo(`  History: ${SEED_CONFIG.historyYears} years`);
  logInfo(`  Open case ratio: ${SEED_CONFIG.volumes.openCaseRatio * 100}%`);
  logInfo("");

  // ============================================================
  // PLACEHOLDER: Seeder calls will be added in subsequent plans
  // ============================================================

  // Plan 02-02: Organization Structure
  // await seedOrganizationStructure(prisma);

  // Plan 02-03: Employees
  // await seedEmployees(prisma);

  // Plan 02-04: Demo Users
  // await seedDemoUsers(prisma);

  // Plan 02-05: Policies
  // Note: In the main orchestrator (seed.ts), policies are seeded with:
  //   const ccoUser = await prisma.user.findFirst({ where: { email: 'demo-cco@acme.local', organizationId } });
  //   await seedPolicies(prisma, organizationId, ccoUser.id);
  // This placeholder shows the intended pattern for this legacy orchestrator.
  // Actual policy seeding is done via seed.ts.

  // Plan 02-06: RIUs and Cases
  // await seedRiusAndCases(prisma);

  // Plan 02-07: Campaigns
  // await seedCampaigns(prisma);

  // ============================================================

  logComplete("Demo tenant seed complete!");
}

/**
 * Standalone execution entry point.
 *
 * Creates a PrismaClient, runs the seed, and disconnects.
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    await seedDemoTenant(prisma);
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly (not imported as module)
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
