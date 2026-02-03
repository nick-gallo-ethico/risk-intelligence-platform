/**
 * Demo Reset CLI Script
 *
 * Admin tool for resetting demo user changes or cleaning up expired data.
 * Users should use the API endpoint for normal resets - this is for admin use.
 *
 * Usage:
 *   npm run seed:reset <userId>      - Reset a specific user's demo changes
 *   npm run seed:reset --cleanup     - Cleanup expired archives and stale sessions
 *   npm run seed:reset --stats       - Show demo data statistics
 */

import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

const prisma = new PrismaClient();
const DEMO_ORG_SLUG = 'acme-corp';

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log(chalk.blue.bold('Demo Reset CLI'));
  console.log(
    chalk.gray(
      'This script is for admin use. Users should use the API endpoint.\n',
    ),
  );

  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    printUsage();
    process.exit(1);
  }

  // Find demo organization
  const org = await prisma.organization.findUnique({
    where: { slug: DEMO_ORG_SLUG },
  });

  if (!org) {
    console.error(chalk.red(`Demo organization '${DEMO_ORG_SLUG}' not found!`));
    console.log(
      chalk.yellow('Run "npm run db:seed" first to create the demo tenant.'),
    );
    process.exit(1);
  }

  if (command === '--cleanup') {
    await runCleanup(org.id);
  } else if (command === '--stats') {
    await showStats(org.id);
  } else {
    await resetUser(org.id, command);
  }
}

/**
 * Print usage instructions
 */
function printUsage(): void {
  console.log(chalk.yellow('Usage: npm run seed:reset <userId>'));
  console.log(chalk.gray('  Resets demo changes for a specific user.\n'));

  console.log(chalk.yellow('Usage: npm run seed:reset --cleanup'));
  console.log(chalk.gray('  Cleans up expired archives and stale sessions.\n'));

  console.log(chalk.yellow('Usage: npm run seed:reset --stats'));
  console.log(chalk.gray('  Shows demo data statistics.\n'));
}

/**
 * Reset a specific user's demo changes
 */
async function resetUser(orgId: string, userId: string): Promise<void> {
  // Find user's session
  const session = await prisma.demoUserSession.findUnique({
    where: {
      organizationId_userId: { organizationId: orgId, userId },
    },
    include: { user: { select: { email: true } } },
  });

  if (!session) {
    console.log(chalk.yellow(`No demo session found for user ${userId}.`));
    console.log(chalk.gray('User has no changes to reset.'));
    process.exit(0);
  }

  console.log(chalk.cyan(`Found session for ${session.user.email}`));
  console.log(
    chalk.gray(`  Created: ${session.createdAt.toLocaleDateString()}`),
  );
  console.log(
    chalk.gray(`  Last activity: ${session.lastActivityAt.toLocaleDateString()}`),
  );

  // Count what will be deleted
  const [cases, investigations, rius] = await Promise.all([
    prisma.case.count({
      where: { demoUserSessionId: session.id, isBaseData: false },
    }),
    prisma.investigation.count({
      where: { demoUserSessionId: session.id, isBaseData: false },
    }),
    prisma.riskIntelligenceUnit.count({
      where: { demoUserSessionId: session.id, isBaseData: false },
    }),
  ]);

  console.log(chalk.cyan('\nChanges to delete:'));
  console.log(chalk.white(`  Cases:          ${cases}`));
  console.log(chalk.white(`  Investigations: ${investigations}`));
  console.log(chalk.white(`  RIUs:           ${rius}`));

  if (cases + investigations + rius === 0) {
    console.log(chalk.green('\nNo user changes to delete.'));
    process.exit(0);
  }

  // Delete user changes (skip archiving for CLI - this is admin tool)
  console.log(chalk.yellow('\nDeleting user changes...'));

  const startTime = Date.now();

  // Get IDs first
  const userCaseIds = (
    await prisma.case.findMany({
      where: { demoUserSessionId: session.id, isBaseData: false },
      select: { id: true },
    })
  ).map((c) => c.id);

  const userInvestigationIds = (
    await prisma.investigation.findMany({
      where: { demoUserSessionId: session.id, isBaseData: false },
      select: { id: true },
    })
  ).map((i) => i.id);

  const userRiuIds = (
    await prisma.riskIntelligenceUnit.findMany({
      where: { demoUserSessionId: session.id, isBaseData: false },
      select: { id: true },
    })
  ).map((r) => r.id);

  // Delete in order
  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entityType: 'CASE', entityId: { in: userCaseIds } },
          { entityType: 'INVESTIGATION', entityId: { in: userInvestigationIds } },
          { entityType: 'RIU', entityId: { in: userRiuIds } },
        ],
      },
    }),
    prisma.caseMessage.deleteMany({
      where: { caseId: { in: userCaseIds } },
    }),
    prisma.investigationNote.deleteMany({
      where: { investigationId: { in: userInvestigationIds } },
    }),
    prisma.subject.deleteMany({
      where: { caseId: { in: userCaseIds } },
    }),
    prisma.investigation.deleteMany({
      where: { demoUserSessionId: session.id, isBaseData: false },
    }),
    prisma.riuCaseAssociation.deleteMany({
      where: {
        OR: [
          { riuId: { in: userRiuIds } },
          { caseId: { in: userCaseIds } },
        ],
      },
    }),
    prisma.case.deleteMany({
      where: { demoUserSessionId: session.id, isBaseData: false },
    }),
    prisma.riskIntelligenceUnit.deleteMany({
      where: { demoUserSessionId: session.id, isBaseData: false },
    }),
  ]);

  const durationMs = Date.now() - startTime;

  console.log(chalk.blue.bold(`\nReset complete in ${durationMs}ms`));
  console.log(chalk.gray('Base data preserved. User can start fresh.'));
}

/**
 * Cleanup expired archives and stale sessions
 */
async function runCleanup(orgId: string): Promise<void> {
  console.log(chalk.cyan('Running cleanup...\n'));

  // Cleanup expired archives
  const expiredArchives = await prisma.demoArchivedChange.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log(
    chalk.green(`Deleted ${expiredArchives.count} expired archive records`),
  );

  // Find stale sessions (>30 days inactive)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const staleSessions = await prisma.demoUserSession.findMany({
    where: {
      organizationId: orgId,
      lastActivityAt: { lt: cutoff },
    },
    include: { user: { select: { email: true } } },
  });

  if (staleSessions.length > 0) {
    console.log(
      chalk.yellow(
        `\nFound ${staleSessions.length} stale sessions (>30 days inactive):`,
      ),
    );
    for (const session of staleSessions) {
      console.log(
        chalk.gray(
          `  - ${session.user.email}: last active ${session.lastActivityAt.toLocaleDateString()}`,
        ),
      );
    }
    console.log(
      chalk.gray(
        '\nTo clean these up, run: npm run seed:reset <userId> for each user',
      ),
    );
  } else {
    console.log(chalk.green('\nNo stale sessions found.'));
  }

  console.log(chalk.blue.bold('\nCleanup complete!'));
}

/**
 * Show demo data statistics
 */
async function showStats(orgId: string): Promise<void> {
  console.log(chalk.cyan('Demo Data Statistics\n'));

  // Base data counts
  const [baseRius, baseCases, baseInvestigations] = await Promise.all([
    prisma.riskIntelligenceUnit.count({
      where: { organizationId: orgId, isBaseData: true },
    }),
    prisma.case.count({
      where: { organizationId: orgId, isBaseData: true },
    }),
    prisma.investigation.count({
      where: { organizationId: orgId, isBaseData: true },
    }),
  ]);

  console.log(chalk.white.bold('Base Data (Immutable):'));
  console.log(chalk.white(`  RIUs:           ${baseRius.toLocaleString()}`));
  console.log(chalk.white(`  Cases:          ${baseCases.toLocaleString()}`));
  console.log(
    chalk.white(`  Investigations: ${baseInvestigations.toLocaleString()}`),
  );

  // User-created data counts
  const [userRius, userCases, userInvestigations] = await Promise.all([
    prisma.riskIntelligenceUnit.count({
      where: { organizationId: orgId, isBaseData: false },
    }),
    prisma.case.count({
      where: { organizationId: orgId, isBaseData: false },
    }),
    prisma.investigation.count({
      where: { organizationId: orgId, isBaseData: false },
    }),
  ]);

  console.log(chalk.white.bold('\nUser-Created Data:'));
  console.log(chalk.white(`  RIUs:           ${userRius.toLocaleString()}`));
  console.log(chalk.white(`  Cases:          ${userCases.toLocaleString()}`));
  console.log(
    chalk.white(`  Investigations: ${userInvestigations.toLocaleString()}`),
  );

  // Session counts
  const sessions = await prisma.demoUserSession.count({
    where: { organizationId: orgId },
  });
  const activeSessions = await prisma.demoUserSession.count({
    where: {
      organizationId: orgId,
      lastActivityAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });

  console.log(chalk.white.bold('\nSessions:'));
  console.log(chalk.white(`  Total:          ${sessions}`));
  console.log(chalk.white(`  Active (7d):    ${activeSessions}`));

  // Archive counts
  const pendingArchives = await prisma.demoArchivedChange.count({
    where: {
      expiresAt: { gt: new Date() },
      restoredAt: null,
    },
  });

  console.log(chalk.white.bold('\nArchives:'));
  console.log(chalk.white(`  Pending undo:   ${pendingArchives}`));
}

// Run main
main()
  .catch((e) => {
    console.error(chalk.red('Error:'), e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
