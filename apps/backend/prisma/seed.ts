import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

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

  // Hash passwords
  const passwordHash = await bcrypt.hash('Password123!', BCRYPT_ROUNDS);

  // Create System Admin user
  const adminUser = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: 'admin@acme.local',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'admin@acme.local',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.SYSTEM_ADMIN,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Created admin user: ${adminUser.email} (${adminUser.role})`);

  // Create Compliance Officer user
  const complianceUser = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: 'compliance@acme.local',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'compliance@acme.local',
      passwordHash,
      firstName: 'Compliance',
      lastName: 'Officer',
      role: UserRole.COMPLIANCE_OFFICER,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Created compliance user: ${complianceUser.email} (${complianceUser.role})`);

  // Create Investigator user
  const investigatorUser = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: 'investigator@acme.local',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'investigator@acme.local',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Investigator',
      role: UserRole.INVESTIGATOR,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Created investigator user: ${investigatorUser.email} (${investigatorUser.role})`);

  // Create Employee user
  const employeeUser = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: 'employee@acme.local',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'employee@acme.local',
      passwordHash,
      firstName: 'John',
      lastName: 'Employee',
      role: UserRole.EMPLOYEE,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Created employee user: ${employeeUser.email} (${employeeUser.role})`);

  console.log('\nSeed completed successfully!');
  console.log('\nTest credentials:');
  console.log('  Email: admin@acme.local | Password: Password123! | Role: SYSTEM_ADMIN');
  console.log('  Email: compliance@acme.local | Password: Password123! | Role: COMPLIANCE_OFFICER');
  console.log('  Email: investigator@acme.local | Password: Password123! | Role: INVESTIGATOR');
  console.log('  Email: employee@acme.local | Password: Password123! | Role: EMPLOYEE');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
