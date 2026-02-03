/**
 * User Seeder for Demo Tenant
 *
 * Creates 9 permanent demo user accounts with distinct role presets.
 * These are sales rep accounts that can provision prospect accounts.
 *
 * All users have:
 * - Password: 'Password123!'
 * - Email verified
 * - Active status
 * - isSalesRep: true in metadata
 *
 * Usage:
 *   import { seedDemoUsers } from './user.seeder';
 *   const userIds = await seedDemoUsers(prisma, organizationId);
 */

import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Bcrypt rounds matching existing seed.ts
const BCRYPT_ROUNDS = 12;

// Default demo password
const DEMO_PASSWORD = 'Password123!';

/**
 * Demo user definition with role preset
 */
interface DemoUserDefinition {
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  isSalesRep: boolean;
}

/**
 * Permanent demo user accounts
 *
 * These are sales rep accounts with different role presets for demonstrations.
 * Uses @acme.local domain to distinguish from actual customer domains.
 */
const DEMO_USERS: DemoUserDefinition[] = [
  // Admin/System roles
  {
    email: 'demo-admin@acme.local',
    role: UserRole.SYSTEM_ADMIN,
    firstName: 'Alex',
    lastName: 'Admin',
    isSalesRep: true,
  },

  // Compliance roles
  {
    email: 'demo-cco@acme.local',
    role: UserRole.COMPLIANCE_OFFICER,
    firstName: 'Casey',
    lastName: 'Compliance',
    isSalesRep: true,
  },
  {
    email: 'demo-triage@acme.local',
    role: UserRole.TRIAGE_LEAD,
    firstName: 'Taylor',
    lastName: 'Triage',
    isSalesRep: true,
  },

  // Investigation roles
  {
    email: 'demo-investigator@acme.local',
    role: UserRole.INVESTIGATOR,
    firstName: 'Jordan',
    lastName: 'Investigator',
    isSalesRep: true,
  },
  {
    email: 'demo-investigator2@acme.local',
    role: UserRole.INVESTIGATOR,
    firstName: 'Jamie',
    lastName: 'Investigator Jr',
    isSalesRep: true,
  },

  // Policy roles
  {
    email: 'demo-policy@acme.local',
    role: UserRole.POLICY_AUTHOR,
    firstName: 'Pat',
    lastName: 'Policy',
    isSalesRep: true,
  },
  {
    email: 'demo-reviewer@acme.local',
    role: UserRole.POLICY_REVIEWER,
    firstName: 'Robin',
    lastName: 'Reviewer',
    isSalesRep: true,
  },

  // Line roles
  {
    email: 'demo-manager@acme.local',
    role: UserRole.MANAGER,
    firstName: 'Morgan',
    lastName: 'Manager',
    isSalesRep: true,
  },
  {
    email: 'demo-employee@acme.local',
    role: UserRole.EMPLOYEE,
    firstName: 'Sam',
    lastName: 'Staff',
    isSalesRep: true,
  },
];

/**
 * Emails of demo sales rep accounts (for permission checking)
 */
const SALES_REP_EMAILS = new Set(DEMO_USERS.filter(u => u.isSalesRep).map(u => u.email));

/**
 * Check if a user email is a demo sales rep
 *
 * Used for permission checking in DemoService - only sales reps
 * can provision prospect accounts.
 *
 * @param email - User email to check
 * @returns true if email belongs to a demo sales rep
 */
export function isDemoSalesRep(email: string): boolean {
  return SALES_REP_EMAILS.has(email);
}

/**
 * Seed demo users for a demo tenant
 *
 * Creates or updates 9 permanent demo user accounts with role presets.
 * Uses upsert for idempotent re-runs - won't duplicate users on re-seed.
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID to seed users for
 * @returns Array of created/updated user IDs
 */
export async function seedDemoUsers(
  prisma: PrismaClient,
  organizationId: string,
): Promise<string[]> {
  // Hash password once for all users
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  const userIds: string[] = [];

  for (const userDef of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: {
        organizationId_email: {
          organizationId,
          email: userDef.email,
        },
      },
      update: {
        // Only update role and name on re-run, preserve other data
        role: userDef.role,
        firstName: userDef.firstName,
        lastName: userDef.lastName,
      },
      create: {
        organizationId,
        email: userDef.email,
        passwordHash,
        firstName: userDef.firstName,
        lastName: userDef.lastName,
        role: userDef.role,
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    });

    userIds.push(user.id);
  }

  console.log(`  Created/updated ${userIds.length} demo users`);

  return userIds;
}

/**
 * Get demo user credentials for display
 *
 * Returns formatted list of demo user credentials for console output.
 *
 * @returns Array of { email, role, description } objects
 */
export function getDemoUserCredentials(): Array<{
  email: string;
  role: string;
  description: string;
}> {
  return DEMO_USERS.map(user => ({
    email: user.email,
    role: user.role,
    description: `${user.firstName} ${user.lastName} - ${user.role}`,
  }));
}
