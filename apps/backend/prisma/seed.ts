import { PrismaClient } from '@prisma/client';
import { seedCategories } from './seeders/category.seeder';
import { seedLocations, LOCATIONS } from './seeders/location.seeder';
import { seedDivisions } from './seeders/division.seeder';
import { seedEmployees } from './seeders/employee.seeder';
import { seedDemoUsers } from './seeders/user.seeder';
import { seedRius } from './seeders/riu.seeder';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');
  const startTime = Date.now();

  // Create test organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      settings: {
        timezone: 'America/New_York',
        locale: 'en-US',
        features: {
          caseManagement: true,
          policyManagement: true,
          disclosures: true,
          analytics: true,
        },
      },
    },
  });

  console.log(`Created organization: ${organization.name} (${organization.id})`);

  // Seed categories (required for RIUs and Cases)
  console.log('\nSeeding categories...');
  const categoryNameToId = await seedCategories(prisma, organization.id);
  console.log(`Created ${categoryNameToId.size} categories`);

  // Seed locations (52 global locations across US, EMEA, APAC)
  console.log('\nSeeding locations...');
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
  console.log('\nSeeding divisions and org structure...');
  const orgStructure = await seedDivisions(prisma, organization.id);
  console.log(`Created ${orgStructure.divisions.size} divisions, ${orgStructure.businessUnits.size} BUs, ${orgStructure.departments.size} departments, ${orgStructure.teams.size} teams`);

  // Seed employees (20,000 with full hierarchy - this takes a few minutes)
  console.log('\nSeeding employees (this may take a few minutes)...');
  const employeeEmailToId = await seedEmployees(prisma, organization.id, locationCodeToId, orgStructure);
  console.log(`Created ${employeeEmailToId.size} employees`);

  // Seed demo users (9 permanent sales rep accounts with role presets)
  console.log('\nSeeding demo users...');
  const demoUserIds = await seedDemoUsers(prisma, organization.id);
  console.log(`Created ${demoUserIds.length} demo users`);

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
  const categoryMap = new Map<string, { id: string; code: string; name?: string }>();
  for (const cat of categories) {
    // Key by name for easy lookup
    categoryMap.set(cat.name, { id: cat.id, code: cat.code || cat.name, name: cat.name });
    // Also key by code for direct lookup
    if (cat.code) {
      categoryMap.set(cat.code, { id: cat.id, code: cat.code, name: cat.name });
    }
  }

  // Build employee map with locationId for regional timestamp adjustment
  const employees = await prisma.employee.findMany({
    where: { organizationId: organization.id },
    select: { id: true, email: true, locationId: true },
  });
  const employeeMap = new Map<string, { id: string; locationId: string | null }>();
  for (const emp of employees) {
    employeeMap.set(emp.email, { id: emp.id, locationId: emp.locationId });
  }

  // ========================================
  // Seed RIUs (5,000 historical intake records)
  // ========================================
  console.log('\nSeeding RIUs (5,000 historical intake records)...');
  const { riuIds, linkedIncidents } = await seedRius(
    prisma,
    organization.id,
    userIds,
    categoryMap,
    employeeMap,
    locationIdToRegion,
  );
  console.log(`Created ${riuIds.length} RIUs (${linkedIncidents.filter((i) => i.riusCreated > 0).length} linked incidents)`);

  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log(`\nSeed completed successfully in ${duration} seconds!`);

  console.log('\n========================================');
  console.log('DEMO DATA SUMMARY');
  console.log('========================================');
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
  console.log(`Linked Incidents: ${linkedIncidents.filter((i) => i.riusCreated > 0).length}`);

  console.log('\n========================================');
  console.log('DEMO CREDENTIALS');
  console.log('========================================');
  console.log('\nPassword for all accounts: Password123!');
  console.log('\nPermanent Sales Rep Accounts (role presets):');
  console.log('  demo-admin@acme.local         - SYSTEM_ADMIN');
  console.log('  demo-cco@acme.local           - COMPLIANCE_OFFICER');
  console.log('  demo-triage@acme.local        - TRIAGE_LEAD');
  console.log('  demo-investigator@acme.local  - INVESTIGATOR');
  console.log('  demo-investigator2@acme.local - INVESTIGATOR');
  console.log('  demo-policy@acme.local        - POLICY_AUTHOR');
  console.log('  demo-reviewer@acme.local      - POLICY_REVIEWER');
  console.log('  demo-manager@acme.local       - MANAGER');
  console.log('  demo-employee@acme.local      - EMPLOYEE');
  console.log('\nSales reps can provision prospect accounts via:');
  console.log('  POST /api/v1/demo/prospects');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
