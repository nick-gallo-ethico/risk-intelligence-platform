/**
 * Projects Tenant Isolation E2E Tests
 *
 * Verifies that Row-Level Security correctly prevents cross-tenant access
 * for project management endpoints (Milestone/Project entities).
 *
 * CRITICAL: All cross-tenant access attempts must return 404 (not 403)
 * to prevent enumeration attacks.
 *
 * Pattern:
 * 1. Create project with tasks, groups in Org A
 * 2. Query/mutate as Org B user
 * 3. Verify Org B cannot see or modify Org A's data
 */

import * as request from "supertest";
import {
  createTestContext,
  destroyTestContext,
  TestContext,
  authHeader,
} from "../helpers/test-setup";
import {
  MilestoneStatus,
  MilestoneCategory,
  ProjectTaskStatus,
  ProjectTaskPriority,
} from "@prisma/client";

describe("Projects Tenant Isolation (E2E)", () => {
  let ctx: TestContext;

  // Test data created in Org A
  let orgAProjectId: string;
  let orgATaskId: string;
  let orgAGroupId: string;

  // Test data created in Org B
  let orgBProjectId: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Create test data in both orgs
    await ctx.prisma.enableBypassRLS();
    try {
      // Create project (milestone) in Org A
      const projectA = await ctx.prisma.milestone.create({
        data: {
          organization: { connect: { id: ctx.orgA.id } },
          name: "Org A Implementation Project",
          description: "Confidential project for Org A",
          category: MilestoneCategory.PROJECT,
          status: MilestoneStatus.IN_PROGRESS,
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdBy: { connect: { id: ctx.orgA.users[0].id } },
          owner: { connect: { id: ctx.orgA.users[0].id } },
        },
      });
      orgAProjectId = projectA.id;

      // Create group in Org A project
      const groupA = await ctx.prisma.projectGroup.create({
        data: {
          organization: { connect: { id: ctx.orgA.id } },
          milestone: { connect: { id: orgAProjectId } },
          name: "Sprint 1",
          color: "#3B82F6",
          sortOrder: 0,
        },
      });
      orgAGroupId = groupA.id;

      // Create task in Org A project
      const taskA = await ctx.prisma.projectTask.create({
        data: {
          organization: { connect: { id: ctx.orgA.id } },
          milestone: { connect: { id: orgAProjectId } },
          group: { connect: { id: orgAGroupId } },
          title: "Confidential Task for Org A",
          description: "Secret task details",
          status: ProjectTaskStatus.NOT_STARTED,
          priority: ProjectTaskPriority.HIGH,
          sortOrder: 0,
          createdBy: { connect: { id: ctx.orgA.users[0].id } },
        },
      });
      orgATaskId = taskA.id;

      // Create project in Org B
      const projectB = await ctx.prisma.milestone.create({
        data: {
          organization: { connect: { id: ctx.orgB.id } },
          name: "Org B Project",
          description: "Project for Org B",
          category: MilestoneCategory.PROJECT,
          status: MilestoneStatus.IN_PROGRESS,
          targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          createdBy: { connect: { id: ctx.orgB.users[0].id } },
          owner: { connect: { id: ctx.orgB.users[0].id } },
        },
      });
      orgBProjectId = projectB.id;
    } finally {
      await ctx.prisma.disableBypassRLS();
    }
  }, 30000);

  afterAll(async () => {
    // Clean up test data in reverse order of dependencies
    await ctx.prisma.enableBypassRLS();
    try {
      await ctx.prisma.projectTask.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
      await ctx.prisma.projectGroup.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
      await ctx.prisma.milestoneItem.deleteMany({
        where: {
          milestone: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
        },
      });
      await ctx.prisma.milestone.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    await destroyTestContext(ctx);
  });

  // =========================================================================
  // PROJECT LISTING ISOLATION
  // =========================================================================
  describe("Project Listing Isolation (GET /api/v1/projects)", () => {
    it("Org B cannot see Org A projects in list", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/projects")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not contain any Org A projects
      const projects = response.body.data || response.body;
      const orgAProjects = projects.filter(
        (p: any) => p.organizationId === ctx.orgA.id,
      );
      expect(orgAProjects).toHaveLength(0);

      // All returned projects should belong to Org B
      projects.forEach((p: any) => {
        expect(p.organizationId).toBe(ctx.orgB.id);
      });
    });

    it("Org A can see their own projects", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/projects")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should see at least our test project
      const projects = response.body.data || response.body;
      expect(projects.length).toBeGreaterThan(0);

      // All returned projects should belong to Org A
      projects.forEach((p: any) => {
        expect(p.organizationId).toBe(ctx.orgA.id);
      });
    });
  });

  // =========================================================================
  // PROJECT ACCESS BY ID ISOLATION
  // =========================================================================
  describe("Project Access by ID Isolation (GET /api/v1/projects/:id)", () => {
    it("Org B cannot access Org A project by ID (returns 404)", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/projects/${orgAProjectId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("Org A can access their own project", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/projects/${orgAProjectId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(orgAProjectId);
      expect(response.body.organizationId).toBe(ctx.orgA.id);
    });
  });

  // =========================================================================
  // PROJECT UPDATE ISOLATION
  // =========================================================================
  describe("Project Update Isolation (PUT /api/v1/projects/:id)", () => {
    it("Org B cannot update Org A project (returns 404)", async () => {
      await request(ctx.app.getHttpServer())
        .put(`/api/v1/projects/${orgAProjectId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          name: "Hacked Project Name",
          description: "Unauthorized modification",
        })
        .expect(404);

      // Verify project was NOT modified
      await ctx.prisma.enableBypassRLS();
      try {
        const project = await ctx.prisma.milestone.findUnique({
          where: { id: orgAProjectId },
        });
        expect(project?.name).toBe("Org A Implementation Project");
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it("Org A can update their own project", async () => {
      const response = await request(ctx.app.getHttpServer())
        .put(`/api/v1/projects/${orgAProjectId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ description: "Updated description by owner" })
        .expect(200);

      expect(response.body.description).toBe("Updated description by owner");
    });
  });

  // =========================================================================
  // PROJECT DELETE ISOLATION
  // =========================================================================
  describe("Project Delete Isolation (DELETE /api/v1/projects/:id)", () => {
    it("Org B cannot delete Org A project (returns 404)", async () => {
      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/projects/${orgAProjectId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);

      // Verify project still exists
      await ctx.prisma.enableBypassRLS();
      try {
        const project = await ctx.prisma.milestone.findUnique({
          where: { id: orgAProjectId },
        });
        expect(project).not.toBeNull();
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });

  // =========================================================================
  // PROJECT TASKS ISOLATION
  // =========================================================================
  describe("Project Tasks Isolation (GET /api/v1/projects/:id/tasks)", () => {
    it("Org B cannot see Org A project tasks (returns 404)", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/projects/${orgAProjectId}/tasks`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("Org A can see their own project tasks", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/projects/${orgAProjectId}/tasks`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const tasks = response.body.data || response.body;
      expect(tasks.length).toBeGreaterThan(0);

      // All tasks should belong to Org A
      tasks.forEach((t: any) => {
        expect(t.organizationId).toBe(ctx.orgA.id);
      });
    });
  });

  // =========================================================================
  // TASK CREATION ISOLATION
  // =========================================================================
  describe("Task Creation Isolation (POST /api/v1/projects/:id/tasks)", () => {
    it("Org B cannot add task to Org A project (returns 404)", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/projects/${orgAProjectId}/tasks`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          title: "Injected Task",
          description: "Unauthorized task creation",
        })
        .expect(404);

      // Verify no task was created
      await ctx.prisma.enableBypassRLS();
      try {
        const tasks = await ctx.prisma.projectTask.findMany({
          where: {
            milestoneId: orgAProjectId,
            title: "Injected Task",
          },
        });
        expect(tasks).toHaveLength(0);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it("Org A can add task to their own project", async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/projects/${orgAProjectId}/tasks`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          title: "New Legitimate Task",
          description: "Created by project owner",
        })
        .expect(201);

      expect(response.body.title).toBe("New Legitimate Task");
      expect(response.body.organizationId).toBe(ctx.orgA.id);

      // Clean up
      await ctx.prisma.enableBypassRLS();
      await ctx.prisma.projectTask.delete({ where: { id: response.body.id } });
      await ctx.prisma.disableBypassRLS();
    });
  });

  // =========================================================================
  // TASK UPDATE ISOLATION
  // =========================================================================
  describe("Task Update Isolation (PUT /api/v1/projects/:id/tasks/:taskId)", () => {
    it("Org B cannot update Org A task (returns 404)", async () => {
      await request(ctx.app.getHttpServer())
        .put(`/api/v1/projects/${orgAProjectId}/tasks/${orgATaskId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ title: "Hacked Task Title" })
        .expect(404);

      // Verify task was NOT modified
      await ctx.prisma.enableBypassRLS();
      try {
        const task = await ctx.prisma.projectTask.findUnique({
          where: { id: orgATaskId },
        });
        expect(task?.title).toBe("Confidential Task for Org A");
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });

  // =========================================================================
  // PROJECT GROUPS ISOLATION
  // =========================================================================
  describe("Project Groups Isolation (GET /api/v1/projects/:id/groups)", () => {
    it("Org B cannot see Org A project groups (returns 404)", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/projects/${orgAProjectId}/groups`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("Org A can see their own project groups", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/projects/${orgAProjectId}/groups`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const groups = response.body || [];
      expect(groups.length).toBeGreaterThan(0);

      // All groups should belong to Org A
      groups.forEach((g: any) => {
        expect(g.organizationId).toBe(ctx.orgA.id);
      });
    });
  });

  // =========================================================================
  // GROUP CREATION ISOLATION
  // =========================================================================
  describe("Group Creation Isolation (POST /api/v1/projects/:id/groups)", () => {
    it("Org B cannot add group to Org A project (returns 404)", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/projects/${orgAProjectId}/groups`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          name: "Injected Group",
          color: "#FF0000",
        })
        .expect(404);

      // Verify no group was created
      await ctx.prisma.enableBypassRLS();
      try {
        const groups = await ctx.prisma.projectGroup.findMany({
          where: {
            milestoneId: orgAProjectId,
            name: "Injected Group",
          },
        });
        expect(groups).toHaveLength(0);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });

  // =========================================================================
  // PROJECT STATS ISOLATION
  // =========================================================================
  describe("Project Stats Isolation (GET /api/v1/projects/:id/stats)", () => {
    it("Org B cannot access Org A project stats (returns 404)", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/projects/${orgAProjectId}/stats`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("Org A can access their own project stats", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/projects/${orgAProjectId}/stats`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  // =========================================================================
  // DATABASE-LEVEL VERIFICATION
  // =========================================================================
  describe("Database-Level Isolation Verification", () => {
    it("Projects are properly tenant-scoped", async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const projects = await ctx.prisma.milestone.findMany({
          where: {
            organizationId: { in: [ctx.orgA.id, ctx.orgB.id] },
          },
        });

        // Should have projects in both orgs
        const orgAProjects = projects.filter(
          (p) => p.organizationId === ctx.orgA.id,
        );
        const orgBProjects = projects.filter(
          (p) => p.organizationId === ctx.orgB.id,
        );

        expect(orgAProjects.length).toBeGreaterThan(0);
        expect(orgBProjects.length).toBeGreaterThan(0);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it("Tasks reference projects within same organization", async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const task = await ctx.prisma.projectTask.findUnique({
          where: { id: orgATaskId },
          include: { milestone: true },
        });

        // Task should be in same org as project
        expect(task?.organizationId).toBe(ctx.orgA.id);
        expect(task?.milestone?.organizationId).toBe(ctx.orgA.id);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it("Groups reference projects within same organization", async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const group = await ctx.prisma.projectGroup.findUnique({
          where: { id: orgAGroupId },
          include: { milestone: true },
        });

        // Group should be in same org as project
        expect(group?.organizationId).toBe(ctx.orgA.id);
        expect(group?.milestone?.organizationId).toBe(ctx.orgA.id);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it("Cross-tenant update attempt leaves database unchanged", async () => {
      // Capture current state
      await ctx.prisma.enableBypassRLS();
      const beforeProject = await ctx.prisma.milestone.findUnique({
        where: { id: orgAProjectId },
      });
      await ctx.prisma.disableBypassRLS();

      // Attempt cross-tenant update
      await request(ctx.app.getHttpServer())
        .put(`/api/v1/projects/${orgAProjectId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          name: "Attempted Hack",
          description: "This should not be saved",
        })
        .expect(404);

      // Verify state unchanged
      await ctx.prisma.enableBypassRLS();
      const afterProject = await ctx.prisma.milestone.findUnique({
        where: { id: orgAProjectId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(afterProject?.name).toBe(beforeProject?.name);
      expect(afterProject?.description).not.toBe("This should not be saved");
      expect(afterProject?.updatedAt.getTime()).toBe(
        beforeProject?.updatedAt.getTime(),
      );
    });
  });

  // =========================================================================
  // AUTHENTICATION TESTS
  // =========================================================================
  describe("Authentication", () => {
    it("should reject requests without token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/projects")
        .expect(401);
    });

    it("should reject requests with invalid token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/projects")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });

    it("should reject project access without token", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/projects/${orgAProjectId}`)
        .expect(401);
    });

    it("should reject task access without token", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/projects/${orgAProjectId}/tasks`)
        .expect(401);
    });
  });
});
