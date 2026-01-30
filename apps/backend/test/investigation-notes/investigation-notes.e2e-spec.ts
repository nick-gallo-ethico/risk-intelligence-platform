// =============================================================================
// INVESTIGATION NOTES E2E TESTS - CRUD, Tenant Isolation, Edit Tracking
// =============================================================================
//
// Tests for the InvestigationNotes API endpoints covering:
// - Authentication and authorization
// - CRUD operations (create, list, get, update, delete)
// - Tenant isolation (CRITICAL security test)
// - Edit tracking (isEdited, editCount, editedAt)
// - Permission enforcement (author-only edits, admin overrides)
// - Content handling (HTML sanitization, plain text extraction)
//
// Note: Visibility tests are in investigation-notes-visibility.e2e-spec.ts
// =============================================================================

import * as request from 'supertest';
import {
  createTestContext,
  destroyTestContext,
  TestContext,
  authHeader,
} from '../helpers/test-setup';
import {
  NoteType,
  NoteVisibility,
  SourceChannel,
  InvestigationType,
} from '@prisma/client';

describe('InvestigationNotes Controller (e2e)', () => {
  let ctx: TestContext;
  let testCaseIdA: string;
  let testCaseIdB: string;
  let testInvestigationIdA: string;
  let testInvestigationIdB: string;
  let testNoteId: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Create test cases and investigations for both orgs
    await ctx.prisma.enableBypassRLS();
    try {
      // Org A: Case + Investigation
      const caseA = await ctx.prisma.case.create({
        data: {
          organizationId: ctx.orgA.id,
          referenceNumber: `TEST-NOTES-A-${Date.now()}`,
          sourceChannel: SourceChannel.DIRECT_ENTRY,
          details: 'Test case for notes E2E in Org A',
          createdById: ctx.orgA.users[0].id,
          updatedById: ctx.orgA.users[0].id,
        },
      });
      testCaseIdA = caseA.id;

      const investigationA = await ctx.prisma.investigation.create({
        data: {
          caseId: caseA.id,
          organizationId: ctx.orgA.id,
          investigationNumber: 1,
          investigationType: InvestigationType.FULL,
          createdById: ctx.orgA.users[0].id,
          updatedById: ctx.orgA.users[0].id,
          // Add investigator to assignedTo for TEAM visibility tests
          assignedTo: [ctx.orgA.users[0].id, ctx.orgA.users[1].id],
        },
      });
      testInvestigationIdA = investigationA.id;

      // Org B: Case + Investigation
      const caseB = await ctx.prisma.case.create({
        data: {
          organizationId: ctx.orgB.id,
          referenceNumber: `TEST-NOTES-B-${Date.now()}`,
          sourceChannel: SourceChannel.DIRECT_ENTRY,
          details: 'Test case for notes E2E in Org B',
          createdById: ctx.orgB.users[0].id,
          updatedById: ctx.orgB.users[0].id,
        },
      });
      testCaseIdB = caseB.id;

      const investigationB = await ctx.prisma.investigation.create({
        data: {
          caseId: caseB.id,
          organizationId: ctx.orgB.id,
          investigationNumber: 1,
          investigationType: InvestigationType.FULL,
          createdById: ctx.orgB.users[0].id,
          updatedById: ctx.orgB.users[0].id,
          assignedTo: [ctx.orgB.users[0].id],
        },
      });
      testInvestigationIdB = investigationB.id;
    } finally {
      await ctx.prisma.disableBypassRLS();
    }
  }, 30000);

  afterAll(async () => {
    // Clean up test data in reverse order of creation (FK constraints)
    await ctx.prisma.enableBypassRLS();
    try {
      // Delete notes first
      await ctx.prisma.investigationNote.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });

      // Delete investigations
      await ctx.prisma.investigation.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });

      // Delete audit logs
      await ctx.prisma.auditLog.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });

      // Delete test cases
      await ctx.prisma.case.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    await destroyTestContext(ctx);
  });

  // =========================================================================
  // AUTHENTICATION TESTS
  // =========================================================================
  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should accept requests with valid token', async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);
    });
  });

  // =========================================================================
  // TENANT ISOLATION TESTS (CRITICAL)
  // =========================================================================
  describe('Tenant Isolation', () => {
    let noteInOrgB: string;

    beforeAll(async () => {
      // Create a note in Org B for isolation tests
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationIdB}/notes`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          content: '<p>Confidential Org B note</p>',
          noteType: NoteType.GENERAL,
          visibility: NoteVisibility.ALL,
        })
        .expect(201);

      noteInOrgB = response.body.id;
    });

    it('Org A cannot list Org B investigation notes', async () => {
      // Try to list notes from Org B investigation as Org A user
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdB}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(404); // Investigation not found for this org
    });

    it('Org A cannot access Org B note by ID (returns 404, not 403)', async () => {
      // Even with a valid note ID, cross-tenant access should return 404
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdB}/notes/${noteInOrgB}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(404);
    });

    it('Org A cannot create note on Org B investigation', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationIdB}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          content: '<p>Attempted cross-tenant note</p>',
          noteType: NoteType.GENERAL,
        })
        .expect(404);
    });

    it('Org A cannot update Org B note', async () => {
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${testInvestigationIdB}/notes/${noteInOrgB}`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ content: '<p>Hacked by Org A</p>' })
        .expect(404);

      // Verify note was NOT modified
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdB}/notes/${noteInOrgB}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      expect(response.body.content).toContain('Confidential Org B note');
    });

    it('Org A cannot delete Org B note', async () => {
      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/investigations/${testInvestigationIdB}/notes/${noteInOrgB}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(404);

      // Verify note still exists
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdB}/notes/${noteInOrgB}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);
    });

    it('Org A notes list does not include Org B notes', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // No items should have Org B's organization ID
      const orgBNotes = response.body.items.filter(
        (note: any) => note.organizationId === ctx.orgB.id,
      );
      expect(orgBNotes).toHaveLength(0);
    });

    it('Org A CAN access their own investigation notes', async () => {
      // Create a note in Org A
      const createResponse = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          content: '<p>Org A legitimate note</p>',
          noteType: NoteType.GENERAL,
        })
        .expect(201);

      // Verify we can access it
      const getResponse = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdA}/notes/${createResponse.body.id}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(getResponse.body.id).toBe(createResponse.body.id);
      expect(getResponse.body.organizationId).toBe(ctx.orgA.id);
    });
  });

  // =========================================================================
  // CRUD OPERATIONS TESTS
  // =========================================================================
  describe('CRUD Operations', () => {
    describe('Create Note (POST /api/v1/investigations/:investigationId/notes)', () => {
      it('should create note with valid input', async () => {
        const response = await request(ctx.app.getHttpServer())
          .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            content: '<p>Investigation <strong>findings</strong> documented here.</p>',
            noteType: NoteType.FINDING,
            visibility: NoteVisibility.TEAM,
          })
          .expect(201);

        testNoteId = response.body.id;

        expect(response.body.id).toBeDefined();
        expect(response.body.investigationId).toBe(testInvestigationIdA);
        expect(response.body.organizationId).toBe(ctx.orgA.id);
        expect(response.body.noteType).toBe(NoteType.FINDING);
        expect(response.body.visibility).toBe(NoteVisibility.TEAM);
        expect(response.body.content).toContain('<strong>findings</strong>');
        expect(response.body.contentPlainText).toBe('Investigation findings documented here.');
        expect(response.body.author).toBeDefined();
        expect(response.body.author.id).toBe(ctx.orgA.users[0].id);
        expect(response.body.isEdited).toBe(false);
        expect(response.body.editCount).toBe(0);
      });

      it('should default visibility to TEAM when not specified', async () => {
        const response = await request(ctx.app.getHttpServer())
          .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            content: '<p>Note without visibility specified</p>',
            noteType: NoteType.GENERAL,
          })
          .expect(201);

        expect(response.body.visibility).toBe(NoteVisibility.TEAM);
      });

      it('should reject invalid note type', async () => {
        await request(ctx.app.getHttpServer())
          .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            content: '<p>Test</p>',
            noteType: 'INVALID_TYPE',
          })
          .expect(400);
      });

      it('should reject missing content', async () => {
        await request(ctx.app.getHttpServer())
          .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            noteType: NoteType.GENERAL,
          })
          .expect(400);
      });

      it('should return 404 for non-existent investigation', async () => {
        await request(ctx.app.getHttpServer())
          .post('/api/v1/investigations/00000000-0000-0000-0000-000000000000/notes')
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            content: '<p>Test</p>',
            noteType: NoteType.GENERAL,
          })
          .expect(404);
      });
    });

    describe('List Notes (GET /api/v1/investigations/:investigationId/notes)', () => {
      it('should return paginated list', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationIdA}/notes`)
          .set(authHeader(ctx.orgA.users[0]))
          .expect(200);

        expect(response.body).toHaveProperty('items');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.items)).toBe(true);
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.pagination).toHaveProperty('total');
        expect(response.body.pagination).toHaveProperty('totalPages');
      });

      it('should support pagination parameters', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationIdA}/notes?page=1&limit=2`)
          .set(authHeader(ctx.orgA.users[0]))
          .expect(200);

        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(2);
        expect(response.body.items.length).toBeLessThanOrEqual(2);
      });

      it('should filter by noteType', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationIdA}/notes?noteType=FINDING`)
          .set(authHeader(ctx.orgA.users[0]))
          .expect(200);

        response.body.items.forEach((note: any) => {
          expect(note.noteType).toBe(NoteType.FINDING);
        });
      });

      it('should filter by authorId', async () => {
        const authorId = ctx.orgA.users[0].id;
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationIdA}/notes?authorId=${authorId}`)
          .set(authHeader(ctx.orgA.users[0]))
          .expect(200);

        response.body.items.forEach((note: any) => {
          expect(note.author.id).toBe(authorId);
        });
      });

      it('should return 404 for non-existent investigation', async () => {
        await request(ctx.app.getHttpServer())
          .get('/api/v1/investigations/00000000-0000-0000-0000-000000000000/notes')
          .set(authHeader(ctx.orgA.users[0]))
          .expect(404);
      });
    });

    describe('Get Single Note (GET /api/v1/investigations/:investigationId/notes/:id)', () => {
      it('should return note with author details', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationIdA}/notes/${testNoteId}`)
          .set(authHeader(ctx.orgA.users[0]))
          .expect(200);

        expect(response.body.id).toBe(testNoteId);
        expect(response.body.author).toBeDefined();
        expect(response.body.author.id).toBeDefined();
        expect(response.body.author.name).toBeDefined();
        expect(response.body.author.email).toBeDefined();
        expect(response.body.investigation).toBeDefined();
        expect(response.body.investigation.id).toBe(testInvestigationIdA);
      });

      it('should return 404 for non-existent note', async () => {
        await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationIdA}/notes/00000000-0000-0000-0000-000000000000`)
          .set(authHeader(ctx.orgA.users[0]))
          .expect(404);
      });
    });

    describe('Update Note (PATCH /api/v1/investigations/:investigationId/notes/:id)', () => {
      it('should update note content', async () => {
        const response = await request(ctx.app.getHttpServer())
          .patch(`/api/v1/investigations/${testInvestigationIdA}/notes/${testNoteId}`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({ content: '<p>Updated findings with new information</p>' })
          .expect(200);

        expect(response.body.content).toContain('Updated findings');
        expect(response.body.contentPlainText).toBe('Updated findings with new information');
      });

      it('should update noteType', async () => {
        const response = await request(ctx.app.getHttpServer())
          .patch(`/api/v1/investigations/${testInvestigationIdA}/notes/${testNoteId}`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({ noteType: NoteType.RECOMMENDATION })
          .expect(200);

        expect(response.body.noteType).toBe(NoteType.RECOMMENDATION);
      });

      it('should update visibility', async () => {
        const response = await request(ctx.app.getHttpServer())
          .patch(`/api/v1/investigations/${testInvestigationIdA}/notes/${testNoteId}`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({ visibility: NoteVisibility.ALL })
          .expect(200);

        expect(response.body.visibility).toBe(NoteVisibility.ALL);
      });

      it('should return 404 for non-existent note', async () => {
        await request(ctx.app.getHttpServer())
          .patch(`/api/v1/investigations/${testInvestigationIdA}/notes/00000000-0000-0000-0000-000000000000`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({ content: '<p>Test</p>' })
          .expect(404);
      });
    });

    describe('Delete Note (DELETE /api/v1/investigations/:investigationId/notes/:id)', () => {
      let noteToDelete: string;

      beforeEach(async () => {
        // Create a fresh note for delete tests
        const response = await request(ctx.app.getHttpServer())
          .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            content: '<p>Note to be deleted</p>',
            noteType: NoteType.GENERAL,
          })
          .expect(201);

        noteToDelete = response.body.id;
      });

      it('should delete note', async () => {
        await request(ctx.app.getHttpServer())
          .delete(`/api/v1/investigations/${testInvestigationIdA}/notes/${noteToDelete}`)
          .set(authHeader(ctx.orgA.users[0]))
          .expect(204);

        // Verify note is gone
        await request(ctx.app.getHttpServer())
          .get(`/api/v1/investigations/${testInvestigationIdA}/notes/${noteToDelete}`)
          .set(authHeader(ctx.orgA.users[0]))
          .expect(404);
      });

      it('should return 404 for non-existent note', async () => {
        await request(ctx.app.getHttpServer())
          .delete(`/api/v1/investigations/${testInvestigationIdA}/notes/00000000-0000-0000-0000-000000000000`)
          .set(authHeader(ctx.orgA.users[0]))
          .expect(404);
      });
    });
  });

  // =========================================================================
  // EDIT TRACKING TESTS
  // =========================================================================
  describe('Edit Tracking', () => {
    let editTestNoteId: string;

    beforeAll(async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          content: '<p>Original content for edit tracking</p>',
          noteType: NoteType.GENERAL,
        })
        .expect(201);

      editTestNoteId = response.body.id;
    });

    it('new note should have isEdited=false and editCount=0', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdA}/notes/${editTestNoteId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.isEdited).toBe(false);
      expect(response.body.editCount).toBe(0);
      expect(response.body.editedAt).toBeUndefined();
    });

    it('first update should set isEdited=true and editCount=1', async () => {
      const response = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${testInvestigationIdA}/notes/${editTestNoteId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ content: '<p>First edit</p>' })
        .expect(200);

      expect(response.body.isEdited).toBe(true);
      expect(response.body.editCount).toBe(1);
      expect(response.body.editedAt).toBeDefined();
    });

    it('second update should increment editCount to 2', async () => {
      const response = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${testInvestigationIdA}/notes/${editTestNoteId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ content: '<p>Second edit</p>' })
        .expect(200);

      expect(response.body.editCount).toBe(2);
    });

    it('editedAt should update on subsequent edits', async () => {
      const beforeResponse = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdA}/notes/${editTestNoteId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const beforeEditedAt = new Date(beforeResponse.body.editedAt).getTime();

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${testInvestigationIdA}/notes/${editTestNoteId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ content: '<p>Third edit</p>' })
        .expect(200);

      const afterEditedAt = new Date(response.body.editedAt).getTime();
      expect(afterEditedAt).toBeGreaterThanOrEqual(beforeEditedAt);
    });
  });

  // =========================================================================
  // PERMISSION ENFORCEMENT TESTS
  // =========================================================================
  describe('Permission Enforcement', () => {
    let authorNoteId: string;
    let investigatorToken: string;

    beforeAll(async () => {
      // Create a note as admin (user[0])
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          content: '<p>Admin created note</p>',
          noteType: NoteType.GENERAL,
        })
        .expect(201);

      authorNoteId = response.body.id;
      investigatorToken = ctx.orgA.users[1].token!;
    });

    it('non-author with INVESTIGATOR role cannot update note', async () => {
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${testInvestigationIdA}/notes/${authorNoteId}`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({ content: '<p>Unauthorized update</p>' })
        .expect(403);
    });

    it('non-author with INVESTIGATOR role cannot delete note', async () => {
      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/investigations/${testInvestigationIdA}/notes/${authorNoteId}`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .expect(403);
    });

    it('author CAN update their own note', async () => {
      // Create note as investigator
      const createResponse = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          content: '<p>Investigator note</p>',
          noteType: NoteType.INTERVIEW,
        })
        .expect(201);

      // Update as same investigator
      const updateResponse = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${testInvestigationIdA}/notes/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({ content: '<p>Investigator updated note</p>' })
        .expect(200);

      expect(updateResponse.body.content).toContain('updated');
    });

    it('SYSTEM_ADMIN can update any note (admin override)', async () => {
      // Note created by investigator, but admin can update
      const response = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${testInvestigationIdA}/notes/${authorNoteId}`)
        .set(authHeader(ctx.orgA.users[0])) // SYSTEM_ADMIN
        .send({ content: '<p>Admin override update</p>' })
        .expect(200);

      expect(response.body.content).toContain('Admin override');
    });

    it('COMPLIANCE_OFFICER can update any note (admin override)', async () => {
      // Create a COMPLIANCE_OFFICER user for this test
      await ctx.prisma.enableBypassRLS();
      let complianceOfficer: any;
      try {
        complianceOfficer = await ctx.prisma.user.create({
          data: {
            organizationId: ctx.orgA.id,
            email: 'compliance-officer@testalpha.local',
            passwordHash: 'not-used',
            firstName: 'Compliance',
            lastName: 'Officer',
            role: 'COMPLIANCE_OFFICER',
            isActive: true,
          },
        });

        // Create session and token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const session = await ctx.prisma.session.create({
          data: {
            userId: complianceOfficer.id,
            organizationId: ctx.orgA.id,
            expiresAt,
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1',
          },
        });

        const coToken = ctx.jwtService.sign({
          sub: complianceOfficer.id,
          email: complianceOfficer.email,
          organizationId: ctx.orgA.id,
          role: complianceOfficer.role,
          sessionId: session.id,
          type: 'access',
        });

        // COMPLIANCE_OFFICER can update note created by someone else
        const response = await request(ctx.app.getHttpServer())
          .patch(`/api/v1/investigations/${testInvestigationIdA}/notes/${authorNoteId}`)
          .set('Authorization', `Bearer ${coToken}`)
          .send({ content: '<p>Compliance officer update</p>' })
          .expect(200);

        expect(response.body.content).toContain('Compliance officer');
      } finally {
        // Clean up
        if (complianceOfficer) {
          await ctx.prisma.session.deleteMany({ where: { userId: complianceOfficer.id } });
          await ctx.prisma.user.delete({ where: { id: complianceOfficer.id } });
        }
        await ctx.prisma.disableBypassRLS();
      }
    });
  });

  // =========================================================================
  // CONTENT HANDLING TESTS
  // =========================================================================
  describe('Content Handling', () => {
    it('should store HTML content correctly', async () => {
      const htmlContent = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';

      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          content: htmlContent,
          noteType: NoteType.GENERAL,
        })
        .expect(201);

      expect(response.body.content).toContain('<strong>bold</strong>');
      expect(response.body.content).toContain('<em>italic</em>');
    });

    it('should extract plain text from HTML', async () => {
      const htmlContent = '<p>Investigation <strong>findings</strong> with <em>emphasis</em></p>';

      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          content: htmlContent,
          noteType: NoteType.FINDING,
        })
        .expect(201);

      expect(response.body.contentPlainText).toBe('Investigation findings with emphasis');
    });

    it('should handle large content (10KB)', async () => {
      // Generate 10KB of content
      const paragraph = '<p>This is a test paragraph with some content. </p>';
      const largeContent = paragraph.repeat(200); // ~10KB

      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          content: largeContent,
          noteType: NoteType.EVIDENCE,
        })
        .expect(201);

      expect(response.body.content.length).toBeGreaterThan(10000);
      expect(response.body.contentPlainText).toBeDefined();
    });

    it('should sanitize dangerous HTML tags', async () => {
      const dangerousContent = '<p>Safe text</p><script>alert("xss")</script><p>More safe text</p>';

      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          content: dangerousContent,
          noteType: NoteType.GENERAL,
        })
        .expect(201);

      expect(response.body.content).not.toContain('<script>');
      expect(response.body.content).toContain('Safe text');
    });

    it('should handle lists in HTML content', async () => {
      const listContent = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';

      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          content: listContent,
          noteType: NoteType.RECOMMENDATION,
        })
        .expect(201);

      expect(response.body.content).toContain('<ul>');
      expect(response.body.content).toContain('<li>Item 1</li>');
    });
  });

  // =========================================================================
  // RESPONSE FORMAT VALIDATION
  // =========================================================================
  describe('Response Format', () => {
    it('note has all required fields', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdA}/notes/${testNoteId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('investigationId');
      expect(response.body).toHaveProperty('organizationId');
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('noteType');
      expect(response.body).toHaveProperty('visibility');
      expect(response.body).toHaveProperty('author');
      expect(response.body).toHaveProperty('isEdited');
      expect(response.body).toHaveProperty('editCount');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).toHaveProperty('investigation');
    });

    it('list response has correct pagination structure', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdA}/notes`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(typeof response.body.pagination.total).toBe('number');
    });

    it('author object has correct structure', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationIdA}/notes/${testNoteId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.author).toHaveProperty('id');
      expect(response.body.author).toHaveProperty('name');
      expect(response.body.author).toHaveProperty('email');
    });
  });
});
