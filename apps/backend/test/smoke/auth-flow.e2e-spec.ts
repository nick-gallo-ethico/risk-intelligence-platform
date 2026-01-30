// =============================================================================
// SMOKE TEST: AUTHENTICATION FLOW
// =============================================================================
//
// End-to-end test validating the complete authentication journey:
// - Login with valid credentials
// - Receive JWT tokens (access + refresh)
// - Access protected endpoints with token
// - Refresh token when expired
// - Logout clears session
//
// This is a smoke test - it validates the happy path works correctly.
// Detailed edge case testing is in the module-specific test files.
// =============================================================================

import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

describe('Smoke Test: Authentication Flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test organization and user
  let testOrgId: string;
  let testUserId: string;
  const testUserEmail = `smoke-auth-${randomUUID().substring(0, 8)}@test.local`;
  const testUserPassword = 'SmokeTestPassword123!';

  // Tokens received during login
  let accessToken: string;
  let refreshToken: string;
  let sessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Seed test data with RLS bypass
    await prisma.enableBypassRLS();
    try {
      const uniqueId = randomUUID().substring(0, 8);
      const passwordHash = await bcrypt.hash(testUserPassword, 10);

      // Create test organization
      const org = await prisma.organization.create({
        data: {
          name: 'Smoke Test Auth Org',
          slug: `smoke-auth-org-${uniqueId}`,
          isActive: true,
        },
      });
      testOrgId = org.id;

      // Create test user
      const user = await prisma.user.create({
        data: {
          organizationId: testOrgId,
          email: testUserEmail,
          passwordHash,
          firstName: 'Smoke',
          lastName: 'Tester',
          role: 'SYSTEM_ADMIN',
          isActive: true,
        },
      });
      testUserId = user.id;
    } finally {
      await prisma.disableBypassRLS();
    }
  }, 30000);

  afterAll(async () => {
    // Cleanup test data
    await prisma.enableBypassRLS();
    try {
      await prisma.session.deleteMany({
        where: { organizationId: testOrgId },
      });
      await prisma.user.deleteMany({
        where: { organizationId: testOrgId },
      });
      await prisma.organization.deleteMany({
        where: { id: testOrgId },
      });
    } finally {
      await prisma.disableBypassRLS();
    }

    await app.close();
  });

  // =========================================================================
  // STEP 1: Login with valid credentials
  // =========================================================================
  describe('Step 1: Login', () => {
    it('should authenticate with valid email and password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(200);

      // Verify response contains tokens
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body).toHaveProperty('user');

      // Verify user data
      expect(response.body.user.email).toBe(testUserEmail);
      expect(response.body.user.organizationId).toBe(testOrgId);
      expect(response.body.user.role).toBe('SYSTEM_ADMIN');

      // Store tokens for subsequent tests
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;

      // Decode token to get sessionId
      const decoded = jwtService.decode(accessToken) as any;
      sessionId = decoded.sessionId;

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(sessionId).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.local',
          password: testUserPassword,
        })
        .expect(401);
    });
  });

  // =========================================================================
  // STEP 2: Access protected endpoints with token
  // =========================================================================
  describe('Step 2: Access Protected Endpoints', () => {
    it('should access /auth/me with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testUserId);
      expect(response.body.email).toBe(testUserEmail);
      expect(response.body.organizationId).toBe(testOrgId);
    });

    it('should reject protected endpoints without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should reject protected endpoints with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject protected endpoints with malformed header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', accessToken) // Missing "Bearer " prefix
        .expect(401);
    });
  });

  // =========================================================================
  // STEP 3: Refresh token
  // =========================================================================
  describe('Step 3: Refresh Token', () => {
    let newAccessToken: string;
    let newRefreshToken: string;

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(200);

      // Verify new tokens returned
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body).toHaveProperty('user');

      newAccessToken = response.body.accessToken;
      newRefreshToken = response.body.refreshToken;

      // New tokens should be different (token rotation)
      expect(newAccessToken).not.toBe(accessToken);
      expect(newRefreshToken).not.toBe(refreshToken);
    });

    it('should be able to use new access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testUserId);
    });

    it('should reject old refresh token after rotation', async () => {
      // Old refresh token should be invalidated
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: refreshToken, // Old token
        })
        .expect(401);
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });

    // Update tokens for subsequent tests
    afterAll(() => {
      accessToken = newAccessToken;
      refreshToken = newRefreshToken;
    });
  });

  // =========================================================================
  // STEP 4: Logout
  // =========================================================================
  describe('Step 4: Logout', () => {
    it('should successfully logout (single device)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('should reject access with revoked session token', async () => {
      // After logout, the same token should be rejected
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should reject refresh with revoked session', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(401);
    });
  });

  // =========================================================================
  // STEP 5: Logout All Sessions
  // =========================================================================
  describe('Step 5: Logout All Sessions', () => {
    let session1Token: string;
    let session2Token: string;

    beforeAll(async () => {
      // Login twice to create 2 sessions
      const login1 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(200);
      session1Token = login1.body.accessToken;

      const login2 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(200);
      session2Token = login2.body.accessToken;
    });

    it('both sessions should be active initially', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${session1Token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${session2Token}`)
        .expect(200);
    });

    it('should logout all sessions', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${session1Token}`)
        .expect(204);
    });

    it('all sessions should be revoked after logout-all', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${session1Token}`)
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${session2Token}`)
        .expect(401);
    });
  });

  // =========================================================================
  // VERIFICATION: Session stored in database
  // =========================================================================
  describe('Session Database Verification', () => {
    it('login creates session record in database', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(200);

      const decoded = jwtService.decode(loginResponse.body.accessToken) as any;

      // Verify session exists in database
      await prisma.enableBypassRLS();
      try {
        const session = await prisma.session.findUnique({
          where: { id: decoded.sessionId },
        });

        expect(session).toBeDefined();
        expect(session?.userId).toBe(testUserId);
        expect(session?.organizationId).toBe(testOrgId);
        expect(session?.revokedAt).toBeNull();
      } finally {
        await prisma.disableBypassRLS();
      }
    });
  });
});
