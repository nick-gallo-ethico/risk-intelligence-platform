/**
 * E2E Test Setup with Environment Configuration
 *
 * IMPORTANT: Environment variables must be set BEFORE any module imports.
 * This ensures ConfigService has correct values when NestJS compiles modules.
 */

import * as fs from "fs";
import * as path from "path";

// Set environment variables BEFORE any NestJS imports
process.env.NODE_ENV = "development";
process.env.STORAGE_PROVIDER = "local";

// Set JWT secrets for token generation in tests (must be at least 32 chars)
// Always set unconditionally to ensure tests work regardless of .env file
process.env.JWT_SECRET = "test-jwt-secret-for-e2e-tests-only-minimum-32-chars";
process.env.JWT_REFRESH_SECRET =
  "test-jwt-refresh-secret-for-e2e-tests-min32ch";

// Debug: log env vars to verify they're set before module compilation
console.log(
  "[Test Setup] JWT_SECRET set:",
  process.env.JWT_SECRET?.slice(0, 20) + "...",
);

// Set LOCAL_STORAGE_PATH to an absolute path
const uploadsDir = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
process.env.LOCAL_STORAGE_PATH = uploadsDir;

// Now import NestJS modules (after env vars are set)
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import * as jwt from "jsonwebtoken";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/modules/prisma/prisma.service";
import { JwtKeyService } from "../../src/modules/auth/services/jwt-key.service";
import * as bcrypt from "bcrypt";

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
  // Debug: verify env vars are still set before module compilation
  console.log("[createTestContext] NODE_ENV:", process.env.NODE_ENV);
  console.log(
    "[createTestContext] JWT_SECRET:",
    process.env.JWT_SECRET?.slice(0, 20) + "...",
  );

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication({
    logger: ["log", "error", "warn", "debug"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix("api/v1", {
    exclude: ["health"],
  });

  await app.init();

  const prisma = app.get(PrismaService);
  const jwtService = app.get(JwtService);
  const jwtKeyService = app.get(JwtKeyService);

  // Debug: log key status
  const keyStatus = jwtKeyService.getKeyStatus();
  console.log(
    "[createTestContext] JwtKeyService status:",
    JSON.stringify(keyStatus),
  );

  // Seed test organizations
  const { orgA, orgB } = await seedTestOrganizations(prisma, jwtKeyService);

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
  jwtKeyService: JwtKeyService,
): Promise<{ orgA: TestOrg; orgB: TestOrg }> {
  // Bypass RLS for seeding
  await prisma.enableBypassRLS();

  try {
    const passwordHash = await bcrypt.hash("TestPassword123!", 10);

    // Use UUID for guaranteed uniqueness when tests run in parallel
    const uniqueId = randomUUID().substring(0, 8);

    // Create Organization A
    const orgARecord = await prisma.organization.create({
      data: {
        name: "Test Org Alpha",
        slug: `test-org-alpha-${uniqueId}`,
        isActive: true,
      },
    });

    // Create Organization B
    const orgBRecord = await prisma.organization.create({
      data: {
        name: "Test Org Beta",
        slug: `test-org-beta-${uniqueId}`,
        isActive: true,
      },
    });

    // Create users for Org A
    const userA1 = await prisma.user.create({
      data: {
        organizationId: orgARecord.id,
        email: "admin@testalpha.local",
        passwordHash,
        firstName: "Alpha",
        lastName: "Admin",
        role: "SYSTEM_ADMIN",
        isActive: true,
      },
    });

    const userA2 = await prisma.user.create({
      data: {
        organizationId: orgARecord.id,
        email: "investigator@testalpha.local",
        passwordHash,
        firstName: "Alpha",
        lastName: "Investigator",
        role: "INVESTIGATOR",
        isActive: true,
      },
    });

    // Create users for Org B
    const userB1 = await prisma.user.create({
      data: {
        organizationId: orgBRecord.id,
        email: "admin@testbeta.local",
        passwordHash,
        firstName: "Beta",
        lastName: "Admin",
        role: "SYSTEM_ADMIN",
        isActive: true,
      },
    });

    // Generate tokens for users (creates real sessions)
    const tokenA1 = await generateTestToken(
      jwtKeyService,
      prisma,
      userA1,
      orgARecord.id,
    );
    const tokenA2 = await generateTestToken(
      jwtKeyService,
      prisma,
      userA2,
      orgARecord.id,
    );
    const tokenB1 = await generateTestToken(
      jwtKeyService,
      prisma,
      userB1,
      orgBRecord.id,
    );

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
      users: [{ ...userB1, token: tokenB1 }],
    };

    return { orgA, orgB };
  } finally {
    await prisma.disableBypassRLS();
  }
}

/**
 * Generates a JWT access token for testing with a real session.
 * Uses JwtKeyService to get the signing key and algorithm used by the app.
 */
async function generateTestToken(
  jwtKeyService: JwtKeyService,
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
      userAgent: "test-agent",
      ipAddress: "127.0.0.1",
    },
  });

  // Get signing options from JwtKeyService (handles RS256/HS256 automatically)
  const signingOptions = jwtKeyService.getSigningOptions();
  console.log(
    "[generateTestToken] algorithm:",
    signingOptions.algorithm,
    "kid:",
    signingOptions.kid,
  );

  const payload = {
    sub: user.id,
    email: user.email,
    organizationId,
    role: user.role,
    sessionId: session.id,
    type: "access",
  };

  // Sign using jsonwebtoken directly with the correct algorithm
  const token = jwt.sign(payload, signingOptions.key, {
    algorithm: signingOptions.algorithm,
    expiresIn: "1d",
    ...(signingOptions.kid && { keyid: signingOptions.kid }),
  });

  // Debug: Verify the token can be decoded and verified
  const decoded = jwt.decode(token, { complete: true });
  console.log(
    "[generateTestToken] token header:",
    JSON.stringify(decoded?.header),
  );

  // Verify the token works with our key
  try {
    const verificationKey = jwtKeyService.getVerificationKey(
      signingOptions.kid,
    );
    jwt.verify(token, verificationKey, { algorithms: ["RS256"] });
    console.log("[generateTestToken] Token verification OK");
  } catch (verifyError) {
    console.error(
      "[generateTestToken] Token verification FAILED:",
      (verifyError as Error).message,
    );
  }

  return token;
}

/**
 * Helper to get auth header for a test user.
 */
export function authHeader(user: TestUser): { Authorization: string } {
  // Debug: Check token exists
  if (!user.token) {
    console.error("[authHeader] WARNING: User has no token!", user.email);
  }
  return { Authorization: `Bearer ${user.token}` };
}
