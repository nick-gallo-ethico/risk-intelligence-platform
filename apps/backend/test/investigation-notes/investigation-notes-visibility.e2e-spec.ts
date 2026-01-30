// =============================================================================
// INVESTIGATION NOTES VISIBILITY E2E TESTS
// =============================================================================
//
// Tests for visibility-based access control:
// - PRIVATE: Only the author can see the note
// - TEAM: Only assigned investigators can see the note
// - ALL: All org users with case access can see the note
//
// These tests verify that visibility settings are enforced correctly on:
// - List endpoints (notes not visible should be filtered out)
// - Get single note endpoints (404 for inaccessible notes)
//
// Admin role overrides (SYSTEM_ADMIN, COMPLIANCE_OFFICER, TRIAGE_LEAD)
// can see all notes regardless of visibility settings.
// =============================================================================

import * as request from 'supertest';
import {
  createTestContext,
  destroyTestContext,
  TestContext,
  authHeader,
  TestUser,
} from '../helpers/test-setup';
import {
  NoteType,
  NoteVisibility,
  SourceChannel,
  InvestigationType,
} from '@prisma/client';

describe('InvestigationNotes Visibility (e2e)', () => {
  let ctx: TestContext;
  let testCaseId: string;
  let testInvestigationId: string;

  // Users with different roles
  let adminUser: TestUser; // SYSTEM_ADMIN - can see all
  let investigatorUser: TestUser; // INVESTIGATOR - assigned to investigation
  let employeeUser: TestUser; // EMPLOYEE - not assigned, but same org

  // Notes with different visibility
  let privateNoteId: string;
  let teamNoteId: string;
  let allNoteId: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Map existing users from test context
    adminUser = ctx.orgA.users[0]; // SYSTEM_ADMIN
    investigatorUser = ctx.orgA.users[1]; // INVESTIGATOR

    // Create additional users for visibility testing
    await ctx.prisma.enableBypassRLS();
    try {
      // Create an EMPLOYEE user (not an investigator)
      const employeeRecord = await ctx.prisma.user.create({
        data: {
          organizationId: ctx.orgA.id,
          email: 'employee@testalpha.local',
          passwordHash: 'not-used',
          firstName: 'Regular',
          lastName: 'Employee',
          role: 'EMPLOYEE',
          isActive: true,
        },
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const employeeSession = await ctx.prisma.session.create({
        data: {
          userId: employeeRecord.id,
          organizationId: ctx.orgA.id,
          expiresAt,
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1',
        },
      });

      const employeeToken = ctx.jwtService.sign({
        sub: employeeRecord.id,
        email: employeeRecord.email,
        organizationId: ctx.orgA.id,
        role: employeeRecord.role,
        sessionId: employeeSession.id,
        type: 'access',
      });

      employeeUser = {
        id: employeeRecord.id,
        email: employeeRecord.email,
        firstName: employeeRecord.firstName,
        lastName: employeeRecord.lastName,
        role: employeeRecord.role,
        organizationId: ctx.orgA.id,
        token: employeeToken,
      };

      // Create case and investigation
      const testCase = await ctx.prisma.case.create({
        data: {
          organizationId: ctx.orgA.id,
          referenceNumber: `TEST-VIS-${Date.now()}`,
          sourceChannel: SourceChannel.DIRECT_ENTRY,
          details: 'Test case for visibility tests',
          createdById: adminUser.id,
          updatedById: adminUser.id,
        },
      });
      testCaseId = testCase.id;

      // Investigation with only investigatorUser assigned (not employeeUser)
      const investigation = await ctx.prisma.investigation.create({
        data: {
          caseId: testCase.id,
          organizationId: ctx.orgA.id,
          investigationNumber: 1,
          investigationType: InvestigationType.FULL,
          createdById: adminUser.id,
          updatedById: adminUser.id,
          assignedTo: [investigatorUser.id], // Only investigator is assigned
        },
      });
      testInvestigationId = investigation.id;
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    // Create test notes with different visibility settings (as investigator)
    // PRIVATE note - only the author (investigator) should see it
    const privateResponse = await request(ctx.app.getHttpServer())
      .post(`/api/v1/investigations/${testInvestigationId}/notes`)
      .set(authHeader(investigatorUser))
      .send({
        content: '<p>Private note - author eyes only</p>',
        noteType: NoteType.GENERAL,
        visibility: NoteVisibility.PRIVATE,
      })
      .expect(201);
    privateNoteId = privateResponse.body.id;

    // TEAM note - only assigned investigators should see it
    const teamResponse = await request(ctx.app.getHttpServer())
      .post(`/api/v1/investigations/${testInvestigationId}/notes`)
      .set(authHeader(investigatorUser))
      .send({
        content: '<p>Team note - investigators only</p>',
        noteType: NoteType.INTERVIEW,
        visibility: NoteVisibility.TEAM,
      })
      .expect(201);
    teamNoteId = teamResponse.body.id;

    // ALL note - everyone in org with case access can see it
    const allResponse = await request(ctx.app.getHttpServer())
      .post(`/api/v1/investigations/${testInvestigationId}/notes`)
      .set(authHeader(investigatorUser))
      .send({
        content: '<p>Public note - all can see</p>',
        noteType: NoteType.FINDING,
        visibility: NoteVisibility.ALL,
      })
      .expect(201);
    allNoteId = allResponse.body.id;
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await ctx.prisma.enableBypassRLS();
    try {
      await ctx.prisma.investigationNote.deleteMany({
        where: { organizationId: ctx.orgA.id },
      });

      await ctx.prisma.investigation.deleteMany({
        where: { organizationId: ctx.orgA.id },
      });

      await ctx.prisma.auditLog.deleteMany({
        where: { organizationId: ctx.orgA.id },
      });

      await ctx.prisma.case.deleteMany({
        where: { organizationId: ctx.orgA.id },
      });

      // Clean up sessions for created users
      await ctx.prisma.session.deleteMany({
        where: { userId: employeeUser.id },
      });

      await ctx.prisma.user.delete({
        where: { id: employeeUser.id },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    await destroyTestContext(ctx);
  });

  // =========================================================================
  // PRIVATE VISIBILITY TESTS
  // =========================================================================
  describe('PRIVATE Visibility', () => {
    describe('Author Access', () => {
      it('author can see their own PRIVATE note', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes/${privateNoteId}`)
          .set(authHeader(investigatorUser))
          .expect(200);

        expect(response.body.id).toBe(privateNoteId);
        expect(response.body.visibility).toBe(NoteVisibility.PRIVATE);
      });

      it('author sees PRIVATE notes in list', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes`)
          .set(authHeader(investigatorUser))
          .expect(200);

        const privateNote = response.body.items.find(
          (n: any) => n.id === privateNoteId,
        );
        expect(privateNote).toBeDefined();
      });
    });

    describe('Non-Author Access (EMPLOYEE user)', () => {
      it('non-author cannot access PRIVATE note by ID (returns 404)', async () => {
        await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes/${privateNoteId}`)
          .set(authHeader(employeeUser))
          .expect(404);
      });

      it('PRIVATE notes are filtered from list for non-author', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes`)
          .set(authHeader(employeeUser))
          .expect(200);

        const privateNote = response.body.items.find(
          (n: any) => n.id === privateNoteId,
        );
        expect(privateNote).toBeUndefined();
      });
    });

    describe('Admin Override', () => {
      it('SYSTEM_ADMIN can see any PRIVATE note', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes/${privateNoteId}`)
          .set(authHeader(adminUser))
          .expect(200);

        expect(response.body.id).toBe(privateNoteId);
      });
    });
  });

  // =========================================================================
  // TEAM VISIBILITY TESTS
  // =========================================================================
  describe('TEAM Visibility', () => {
    describe('Assigned Investigator Access', () => {
      it('assigned investigator can see TEAM note', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes/${teamNoteId}`)
          .set(authHeader(investigatorUser))
          .expect(200);

        expect(response.body.id).toBe(teamNoteId);
        expect(response.body.visibility).toBe(NoteVisibility.TEAM);
      });

      it('assigned investigator sees TEAM notes in list', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes`)
          .set(authHeader(investigatorUser))
          .expect(200);

        const teamNote = response.body.items.find((n: any) => n.id === teamNoteId);
        expect(teamNote).toBeDefined();
      });
    });

    describe('Non-Assigned User Access (EMPLOYEE user)', () => {
      it('non-assigned user cannot access TEAM note by ID (returns 404)', async () => {
        await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes/${teamNoteId}`)
          .set(authHeader(employeeUser))
          .expect(404);
      });

      it('TEAM notes are filtered from list for non-assigned users', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes`)
          .set(authHeader(employeeUser))
          .expect(200);

        const teamNote = response.body.items.find((n: any) => n.id === teamNoteId);
        expect(teamNote).toBeUndefined();
      });
    });

    describe('Admin Override', () => {
      it('SYSTEM_ADMIN can see any TEAM note (not assigned)', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes/${teamNoteId}`)
          .set(authHeader(adminUser))
          .expect(200);

        expect(response.body.id).toBe(teamNoteId);
      });
    });
  });

  // =========================================================================
  // ALL VISIBILITY TESTS
  // =========================================================================
  describe('ALL Visibility', () => {
    describe('Any Org User Access', () => {
      it('author can see ALL visibility note', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes/${allNoteId}`)
          .set(authHeader(investigatorUser))
          .expect(200);

        expect(response.body.id).toBe(allNoteId);
        expect(response.body.visibility).toBe(NoteVisibility.ALL);
      });

      it('non-assigned user can see ALL visibility note', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes/${allNoteId}`)
          .set(authHeader(employeeUser))
          .expect(200);

        expect(response.body.id).toBe(allNoteId);
      });

      it('ALL notes appear in list for any org user', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationId}/notes`)
          .set(authHeader(employeeUser))
          .expect(200);

        const allNote = response.body.items.find((n: any) => n.id === allNoteId);
        expect(allNote).toBeDefined();
      });
    });
  });

  // =========================================================================
  // COMBINED VISIBILITY SCENARIOS
  // =========================================================================
  describe('Combined Visibility Scenarios', () => {
    it('author (investigator) sees all 3 notes with different visibility', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}/notes`)
        .set(authHeader(investigatorUser))
        .expect(200);

      const noteIds = response.body.items.map((n: any) => n.id);
      expect(noteIds).toContain(privateNoteId);
      expect(noteIds).toContain(teamNoteId);
      expect(noteIds).toContain(allNoteId);
    });

    it('EMPLOYEE user (non-assigned) sees only ALL visibility notes', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}/notes`)
        .set(authHeader(employeeUser))
        .expect(200);

      const noteIds = response.body.items.map((n: any) => n.id);
      expect(noteIds).not.toContain(privateNoteId); // No PRIVATE
      expect(noteIds).not.toContain(teamNoteId); // No TEAM (not assigned)
      expect(noteIds).toContain(allNoteId); // Only ALL
    });

    it('SYSTEM_ADMIN sees all notes regardless of visibility', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}/notes`)
        .set(authHeader(adminUser))
        .expect(200);

      const noteIds = response.body.items.map((n: any) => n.id);
      expect(noteIds).toContain(privateNoteId);
      expect(noteIds).toContain(teamNoteId);
      expect(noteIds).toContain(allNoteId);
    });

    it('pagination total counts only visible notes', async () => {
      // READ_ONLY should see only 1 note (ALL visibility)
      const readOnlyResponse = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}/notes`)
        .set(authHeader(employeeUser))
        .expect(200);

      // Admin should see all 3 notes
      const adminResponse = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}/notes`)
        .set(authHeader(adminUser))
        .expect(200);

      expect(readOnlyResponse.body.pagination.total).toBeLessThan(
        adminResponse.body.pagination.total,
      );
    });
  });

  // =========================================================================
  // VISIBILITY CHANGE TESTS
  // =========================================================================
  describe('Visibility Changes', () => {
    let changeableNoteId: string;

    beforeAll(async () => {
      // Create a note we can change visibility on
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/notes`)
        .set(authHeader(investigatorUser))
        .send({
          content: '<p>Note for visibility change tests</p>',
          noteType: NoteType.GENERAL,
          visibility: NoteVisibility.PRIVATE,
        })
        .expect(201);

      changeableNoteId = response.body.id;
    });

    it('changing visibility from PRIVATE to ALL makes note visible to all', async () => {
      // Verify READ_ONLY can't see it first (PRIVATE)
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}/notes/${changeableNoteId}`)
        .set(authHeader(employeeUser))
        .expect(404);

      // Author changes visibility to ALL
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${testInvestigationId}/notes/${changeableNoteId}`)
        .set(authHeader(investigatorUser))
        .send({ visibility: NoteVisibility.ALL })
        .expect(200);

      // Now READ_ONLY should be able to see it
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}/notes/${changeableNoteId}`)
        .set(authHeader(employeeUser))
        .expect(200);

      expect(response.body.visibility).toBe(NoteVisibility.ALL);
    });

    it('changing visibility from ALL to PRIVATE hides note from non-authors', async () => {
      // Author changes visibility back to PRIVATE
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${testInvestigationId}/notes/${changeableNoteId}`)
        .set(authHeader(investigatorUser))
        .send({ visibility: NoteVisibility.PRIVATE })
        .expect(200);

      // READ_ONLY should no longer see it
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}/notes/${changeableNoteId}`)
        .set(authHeader(employeeUser))
        .expect(404);

      // But author can still see it
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}/notes/${changeableNoteId}`)
        .set(authHeader(investigatorUser))
        .expect(200);

      expect(response.body.visibility).toBe(NoteVisibility.PRIVATE);
    });
  });

  // =========================================================================
  // TRIAGE_LEAD ADMIN OVERRIDE TEST
  // =========================================================================
  describe('TRIAGE_LEAD Admin Override', () => {
    let triageLeadUser: TestUser;

    beforeAll(async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const triageRecord = await ctx.prisma.user.create({
          data: {
            organizationId: ctx.orgA.id,
            email: 'triage-lead@testalpha.local',
            passwordHash: 'not-used',
            firstName: 'Triage',
            lastName: 'Lead',
            role: 'TRIAGE_LEAD',
            isActive: true,
          },
        });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const triageSession = await ctx.prisma.session.create({
          data: {
            userId: triageRecord.id,
            organizationId: ctx.orgA.id,
            expiresAt,
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1',
          },
        });

        const triageToken = ctx.jwtService.sign({
          sub: triageRecord.id,
          email: triageRecord.email,
          organizationId: ctx.orgA.id,
          role: triageRecord.role,
          sessionId: triageSession.id,
          type: 'access',
        });

        triageLeadUser = {
          id: triageRecord.id,
          email: triageRecord.email,
          firstName: triageRecord.firstName,
          lastName: triageRecord.lastName,
          role: triageRecord.role,
          organizationId: ctx.orgA.id,
          token: triageToken,
        };
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    afterAll(async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        await ctx.prisma.session.deleteMany({ where: { userId: triageLeadUser.id } });
        await ctx.prisma.user.delete({ where: { id: triageLeadUser.id } });
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it('TRIAGE_LEAD can see PRIVATE notes (admin override)', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}/notes/${privateNoteId}`)
        .set(authHeader(triageLeadUser))
        .expect(200);

      expect(response.body.id).toBe(privateNoteId);
    });

    it('TRIAGE_LEAD can see all notes in list', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}/notes`)
        .set(authHeader(triageLeadUser))
        .expect(200);

      const noteIds = response.body.items.map((n: any) => n.id);
      expect(noteIds).toContain(privateNoteId);
      expect(noteIds).toContain(teamNoteId);
      expect(noteIds).toContain(allNoteId);
    });
  });
});
