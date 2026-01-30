// =============================================================================
// GLOBAL E2E TEST SETUP
// =============================================================================
//
// Runs once before all E2E test suites.
// Ensures clean database state for deterministic tests.
// =============================================================================

import { PrismaClient } from '@prisma/client';

module.exports = async () => {
  const prisma = new PrismaClient();

  try {
    // Clean up any leftover test data from previous runs
    // This ensures a fresh state even if a previous test run crashed
    console.log('\n[Global Setup] Cleaning up leftover test data...');

    // Bypass RLS for cleanup
    await prisma.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'on'`);

    // Delete in order of dependencies (child tables first)
    // Using LIKE to match test org slugs that contain 'test-org-'
    const testOrgIds = await prisma.organization.findMany({
      where: {
        slug: { contains: 'test-org-' },
      },
      select: { id: true },
    });

    const orgIds = testOrgIds.map(o => o.id);

    if (orgIds.length > 0) {
      console.log(`[Global Setup] Found ${orgIds.length} test organizations to clean up`);

      // Delete in order of foreign key dependencies
      await prisma.investigationNote.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await prisma.investigation.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await prisma.case.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await prisma.session.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await prisma.user.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: orgIds } },
      });

      console.log('[Global Setup] Cleanup complete');
    } else {
      console.log('[Global Setup] No leftover test data found');
    }
  } catch (error) {
    console.error('[Global Setup] Error during cleanup:', error);
    // Don't fail the test run for cleanup errors
  } finally {
    await prisma.$disconnect();
  }
};
