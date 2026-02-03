import { PrismaClient } from '@prisma/client';
import { seedCategories } from './seeders/category.seeder';
import { seedLocations } from './seeders/location.seeder';
import { seedDivisions } from './seeders/division.seeder';
import { seedEmployees } from './seeders/employee.seeder';
import { seedDemoUsers } from './seeders/user.seeder';

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
  const categoryMap = await seedCategories(prisma, organization.id);
  console.log(`Created ${categoryMap.size} categories`);

  // Seed locations (52 global locations across US, EMEA, APAC)
  console.log('\nSeeding locations...');
  const locationMap = await seedLocations(prisma, organization.id);
  console.log(`Created ${locationMap.size} locations`);

  // Seed divisions and org structure (4 divisions, ~10 BUs, ~25 depts, ~60 teams)
  console.log('\nSeeding divisions and org structure...');
  const orgStructure = await seedDivisions(prisma, organization.id);
  console.log(`Created ${orgStructure.divisions.size} divisions, ${orgStructure.businessUnits.size} BUs, ${orgStructure.departments.size} departments, ${orgStructure.teams.size} teams`);

  // Seed employees (20,000 with full hierarchy - this takes a few minutes)
  console.log('\nSeeding employees (this may take a few minutes)...');
  const employeeMap = await seedEmployees(prisma, organization.id, locationMap, orgStructure);
  console.log(`Created ${employeeMap.size} employees`);

  // Seed demo users (9 permanent sales rep accounts with role presets)
  console.log('\nSeeding demo users...');
  const demoUserIds = await seedDemoUsers(prisma, organization.id);
  console.log(`Created ${demoUserIds.length} demo users`);

  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log(`\nSeed completed successfully in ${duration} seconds!`);

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
