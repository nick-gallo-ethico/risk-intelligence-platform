import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * Test organization data for tenant isolation testing.
 * We create 2 organizations to verify RLS prevents cross-tenant access.
 */
export interface TestOrg {
  id: string;
  name: string;
  slug: string;
  users: TestUser[];
}

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  token?: string;
}

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  jwtService: JwtService;
  orgA: TestOrg;
  orgB: TestOrg;
}

/**
 * Creates a fully configured test application with 2 test organizations.
 * Use this for any e2e tests requiring tenant isolation verification.
 */
export async function createTestContext(): Promise<TestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  await app.init();

  const prisma = app.get(PrismaService);
  const jwtService = app.get(JwtService);

  // Seed test organizations
  const { orgA, orgB } = await seedTestOrganizations(prisma, jwtService);

  return {
    app,
    prisma,
    jwtService,
    orgA,
    orgB,
  };
}

/**
 * Cleans up test context after tests complete.
 */
export async function destroyTestContext(ctx: TestContext): Promise<void> {
  const { prisma, orgA, orgB } = ctx;

  // Clean up in reverse order of creation (due to FK constraints)
  // Use RLS bypass for cleanup
  await prisma.enableBypassRLS();

  try {
    // Delete sessions
    await prisma.session.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });

    // Delete users
    await prisma.user.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } },
    });

    // Delete organizations
    await prisma.organization.deleteMany({
      where: { id: { in: [orgA.id, orgB.id] } },
    });
  } finally {
    await prisma.disableBypassRLS();
  }

  await ctx.app.close();
}

/**
 * Seeds 2 test organizations with users for isolation testing.
 */
async function seedTestOrganizations(
  prisma: PrismaService,
  jwtService: JwtService,
): Promise<{ orgA: TestOrg; orgB: TestOrg }> {
  // Bypass RLS for seeding
  await prisma.enableBypassRLS();

  try {
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    // Use UUID for guaranteed uniqueness when tests run in parallel
    const uniqueId = randomUUID().substring(0, 8);

    // Create Organization A
    const orgARecord = await prisma.organization.create({
      data: {
        name: 'Test Org Alpha',
        slug: `test-org-alpha-${uniqueId}`,
        isActive: true,
      },
    });

    // Create Organization B
    const orgBRecord = await prisma.organization.create({
      data: {
        name: 'Test Org Beta',
        slug: `test-org-beta-${uniqueId}`,
        isActive: true,
      },
    });

    // Create users for Org A
    const userA1 = await prisma.user.create({
      data: {
        organizationId: orgARecord.id,
        email: 'admin@testalpha.local',
        passwordHash,
        firstName: 'Alpha',
        lastName: 'Admin',
        role: 'SYSTEM_ADMIN',
        isActive: true,
      },
    });

    const userA2 = await prisma.user.create({
      data: {
        organizationId: orgARecord.id,
        email: 'investigator@testalpha.local',
        passwordHash,
        firstName: 'Alpha',
        lastName: 'Investigator',
        role: 'INVESTIGATOR',
        isActive: true,
      },
    });

    // Create users for Org B
    const userB1 = await prisma.user.create({
      data: {
        organizationId: orgBRecord.id,
        email: 'admin@testbeta.local',
        passwordHash,
        firstName: 'Beta',
        lastName: 'Admin',
        role: 'SYSTEM_ADMIN',
        isActive: true,
      },
    });

    // Generate tokens for users (creates real sessions)
    const tokenA1 = await generateTestToken(jwtService, prisma, userA1, orgARecord.id);
    const tokenA2 = await generateTestToken(jwtService, prisma, userA2, orgARecord.id);
    const tokenB1 = await generateTestToken(jwtService, prisma, userB1, orgBRecord.id);

    const orgA: TestOrg = {
      id: orgARecord.id,
      name: orgARecord.name,
      slug: orgARecord.slug,
      users: [
        { ...userA1, token: tokenA1 },
        { ...userA2, token: tokenA2 },
      ],
    };

    const orgB: TestOrg = {
      id: orgBRecord.id,
      name: orgBRecord.name,
      slug: orgBRecord.slug,
      users: [
        { ...userB1, token: tokenB1 },
      ],
    };

    return { orgA, orgB };
  } finally {
    await prisma.disableBypassRLS();
  }
}

/**
 * Generates a JWT access token for testing with a real session.
 */
async function generateTestToken(
  jwtService: JwtService,
  prisma: PrismaService,
  user: { id: string; email: string; role: string },
  organizationId: string,
): Promise<string> {
  // Create a real session in the database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      organizationId,
      expiresAt,
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
    },
  });

  return jwtService.sign({
    sub: user.id,
    email: user.email,
    organizationId,
    role: user.role,
    sessionId: session.id,
    type: 'access',
  });
}

/**
 * Helper to get auth header for a test user.
 */
export function authHeader(user: TestUser): { Authorization: string } {
  return { Authorization: `Bearer ${user.token}` };
}
