/**
 * E2E Test Helpers for WebSocket and Gateway Testing
 *
 * Provides utilities for creating test applications, users, and tokens
 * specifically designed for WebSocket E2E testing.
 */

import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/modules/prisma/prisma.service";
import * as bcrypt from "bcrypt";

/**
 * Test organization with users for E2E testing.
 */
export interface E2ETestOrg {
  id: string;
  name: string;
  slug: string;
}

/**
 * Test user with token for E2E testing.
 */
export interface E2ETestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  token: string;
  sessionId: string;
}

/**
 * Creates a fully configured test application for E2E testing.
 * Returns the app, prisma service, and jwt service.
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
  jwtService: JwtService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Apply same configuration as production
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

  // Initialize WebSocket adapter
  await app.init();

  const prisma = moduleFixture.get(PrismaService);
  const jwtService = moduleFixture.get(JwtService);

  return { app, prisma, jwtService };
}

/**
 * Creates a test user with organization and returns user data with valid JWT token.
 * This creates a complete test context with real database records.
 */
export async function createTestUser(
  prisma: PrismaService,
  jwtService: JwtService,
  overrides: Partial<{
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    role: string;
  }> = {},
): Promise<{ user: E2ETestUser; tenant: E2ETestOrg }> {
  // Use RLS bypass for test data creation
  await prisma.enableBypassRLS();

  try {
    const uniqueId = randomUUID().substring(0, 8);
    const passwordHash = await bcrypt.hash("TestPassword123!", 10);

    // Create organization
    const tenant = await prisma.organization.create({
      data: {
        name: overrides.name || `Test Org ${uniqueId}`,
        slug: `test-org-${uniqueId}`,
        isActive: true,
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email: overrides.email || `test-${uniqueId}@test.com`,
        firstName: overrides.firstName || "Test",
        lastName: overrides.lastName || "User",
        organizationId: tenant.id,
        role: (overrides.role as any) || "INVESTIGATOR",
        passwordHash,
        isActive: true,
      },
    });

    // Create session for the user
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        organizationId: tenant.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userAgent: "e2e-test-agent",
        ipAddress: "127.0.0.1",
      },
    });

    // Generate JWT token
    const token = jwtService.sign({
      sub: user.id,
      email: user.email,
      organizationId: tenant.id,
      role: user.role,
      sessionId: session.id,
      type: "access",
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: tenant.id,
        token,
        sessionId: session.id,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };
  } finally {
    await prisma.disableBypassRLS();
  }
}

/**
 * Generates a JWT token with custom payload for testing.
 * Useful for testing expired tokens, invalid claims, etc.
 */
export function generateToken(
  jwtService: JwtService,
  payload: {
    sub: string;
    organizationId: string;
    email: string;
    role?: string;
    sessionId?: string;
  },
  options?: { expiresIn?: string },
): string {
  return jwtService.sign(
    {
      ...payload,
      type: "access",
    },
    options,
  );
}

/**
 * Cleans up test data after tests complete.
 * Removes user, organization, and associated data.
 */
export async function cleanupTestData(
  prisma: PrismaService,
  userId: string,
  organizationId: string,
): Promise<void> {
  await prisma.enableBypassRLS();

  try {
    // Clean up in reverse order of creation (due to FK constraints)
    // Delete sessions
    await prisma.session.deleteMany({
      where: { userId },
    });

    // Delete any cases created during tests
    await prisma.case.deleteMany({
      where: { organizationId },
    });

    // Delete any notifications
    await prisma.notification.deleteMany({
      where: { organizationId },
    });

    // Delete user
    await prisma.user.deleteMany({
      where: { id: userId },
    });

    // Delete organization
    await prisma.organization.deleteMany({
      where: { id: organizationId },
    });
  } finally {
    await prisma.disableBypassRLS();
  }
}

/**
 * Waits for a WebSocket event with timeout.
 * Returns a promise that resolves with the event data or rejects on timeout.
 */
export function waitForEvent<T>(
  socket: any,
  eventName: string,
  timeoutMs: number = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeoutMs);

    socket.once(eventName, (data: T) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });
}

/**
 * Waits for a socket to connect.
 * Returns a promise that resolves when connected or rejects on error/timeout.
 */
export function waitForConnect(
  socket: any,
  timeoutMs: number = 5000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error("Timeout waiting for WebSocket connection"));
    }, timeoutMs);

    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.once("connect_error", (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Waits for a socket to disconnect.
 * Returns a promise that resolves when disconnected or rejects on timeout.
 */
export function waitForDisconnect(
  socket: any,
  timeoutMs: number = 5000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      resolve("already disconnected");
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error("Timeout waiting for WebSocket disconnection"));
    }, timeoutMs);

    socket.once("disconnect", (reason: string) => {
      clearTimeout(timeout);
      resolve(reason);
    });
  });
}

/**
 * Delays execution for specified milliseconds.
 * Useful for testing timing-sensitive scenarios.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
