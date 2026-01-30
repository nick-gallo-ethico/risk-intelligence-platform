// =============================================================================
// GLOBAL E2E TEST TEARDOWN
// =============================================================================
//
// Runs once after all E2E test suites complete.
// Ensures clean database state after tests.
// =============================================================================

import { PrismaClient } from '@prisma/client';

module.exports = async () => {
  const prisma = new PrismaClient();

  try {
    console.log('\n[Global Teardown] Final cleanup of test data...');

    // Bypass RLS for cleanup
    await prisma.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'on'`);

    // Find and delete all test organizations
    const testOrgIds = await prisma.organization.findMany({
      where: {
        slug: { contains: 'test-org-' },
      },
      select: { id: true },
    });

    const orgIds = testOrgIds.map(o => o.id);

    if (orgIds.length > 0) {
      console.log(`[Global Teardown] Cleaning up ${orgIds.length} test organizations`);

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

      console.log('[Global Teardown] Cleanup complete');
    }
  } catch (error) {
    console.error('[Global Teardown] Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
};
