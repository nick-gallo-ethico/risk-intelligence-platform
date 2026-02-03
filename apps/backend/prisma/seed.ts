import { PrismaClient } from '@prisma/client';
import { seedCategories } from './seeders/category.seeder';
import { seedDemoUsers } from './seeders/user.seeder';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

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

  // Seed demo users (9 permanent sales rep accounts with role presets)
  console.log('\nSeeding demo users...');
  const demoUserIds = await seedDemoUsers(prisma, organization.id);
  console.log(`Created ${demoUserIds.length} demo users`);

  console.log('\nSeed completed successfully!');

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
