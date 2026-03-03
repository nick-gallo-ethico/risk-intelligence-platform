import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CampaignAssignmentService } from "./campaign-assignment.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { AssignmentStatus } from "@prisma/client";

describe("CampaignAssignmentService", () => {
  let service: CampaignAssignmentService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockCampaignId = "campaign-test-123";
  const mockAssignmentId = "assignment-test-123";
  const mockEmployeeId = "employee-test-123";

  const mockEmployee = {
    id: mockEmployeeId,
    organizationId: mockOrgId,
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    jobTitle: "Software Engineer",
    department: "Engineering",
    departmentCode: "ENG",
    location: "New York",
    managerName: "Jane Smith",
    locationAssignment: { name: "NY Office" },
  };

  const mockAssignment = {
    id: mockAssignmentId,
    organizationId: mockOrgId,
    campaignId: mockCampaignId,
    employeeId: mockEmployeeId,
    status: AssignmentStatus.PENDING,
    dueDate: new Date("2026-03-31"),
    assignedAt: new Date(),
    notifiedAt: null,
    startedAt: null,
    completedAt: null,
    reminderCount: 0,
    lastReminderSentAt: null,
    skippedBy: null,
    skipReason: null,
    riuId: null,
    formSubmissionId: null,
    employeeSnapshot: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      jobTitle: "Software Engineer",
    },
  };

  const createMockPrisma = () => {
    const mockTx = {
      employee: {
        findMany: jest.fn(),
      },
      campaignAssignment: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      campaign: {
        update: jest.fn(),
      },
    };

    return {
      ...mockTx,
      $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) =>
        cb(mockTx),
      ),
    };
  };

  let mockPrismaService: ReturnType<typeof createMockPrisma>;

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    mockPrismaService = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignAssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<CampaignAssignmentService>(CampaignAssignmentService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe("generateAssignments", () => {
    it("should return empty array when no employee IDs provided", async () => {
      const result = await service.generateAssignments(
        mockCampaignId,
        [],
        new Date(),
        mockOrgId,
        mockUserId,
      );

      expect(result).toEqual([]);
      expect(prisma.employee.findMany).not.toHaveBeenCalled();
    });

    it("should create assignments with employee snapshots", async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([mockEmployee]);
      mockPrismaService.campaignAssignment.createMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([
        mockAssignment,
      ]);

      const result = await service.generateAssignments(
        mockCampaignId,
        [mockEmployeeId],
        new Date("2026-03-31"),
        mockOrgId,
        mockUserId,
      );

      expect(result).toHaveLength(1);
      expect(prisma.campaignAssignment.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            organizationId: mockOrgId,
            campaignId: mockCampaignId,
            employeeId: mockEmployeeId,
            status: AssignmentStatus.PENDING,
          }),
        ]),
        skipDuplicates: true,
      });
      expect(auditService.log).toHaveBeenCalled();
    });

    it("should skip employees not found in database", async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([]);
      mockPrismaService.campaignAssignment.createMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([]);

      const result = await service.generateAssignments(
        mockCampaignId,
        ["nonexistent-emp"],
        new Date(),
        mockOrgId,
        mockUserId,
      );

      expect(result).toHaveLength(0);
    });
  });

  describe("completeAssignment", () => {
    it("should mark assignment as completed", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.campaignAssignment.update.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.COMPLETED,
        completedAt: new Date(),
      });
      mockPrismaService.campaignAssignment.count.mockResolvedValue(0);
      mockPrismaService.campaign.update.mockResolvedValue({});

      const result = await service.completeAssignment(
        mockAssignmentId,
        mockOrgId,
      );

      expect(result.status).toBe(AssignmentStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
    });

    it("should throw NotFoundException when assignment not found", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.completeAssignment("nonexistent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update campaign statistics after completion", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.campaignAssignment.update.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.COMPLETED,
      });
      mockPrismaService.campaignAssignment.count.mockResolvedValue(1);
      mockPrismaService.campaign.update.mockResolvedValue({});

      await service.completeAssignment(mockAssignmentId, mockOrgId);

      expect(prisma.campaign.update).toHaveBeenCalled();
    });
  });

  describe("markNotified", () => {
    it("should set status to NOTIFIED and timestamp", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.campaignAssignment.update.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.NOTIFIED,
        notifiedAt: new Date(),
      });

      const result = await service.markNotified(mockAssignmentId, mockOrgId);

      expect(result.status).toBe(AssignmentStatus.NOTIFIED);
      expect(result.notifiedAt).toBeDefined();
    });

    it("should throw NotFoundException when assignment not found", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.markNotified("nonexistent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("markStarted", () => {
    it("should set status to IN_PROGRESS and timestamp", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.campaignAssignment.update.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.IN_PROGRESS,
        startedAt: new Date(),
      });

      const result = await service.markStarted(mockAssignmentId, mockOrgId);

      expect(result.status).toBe(AssignmentStatus.IN_PROGRESS);
      expect(result.startedAt).toBeDefined();
    });

    it("should throw NotFoundException when assignment not found", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.markStarted("nonexistent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("skipAssignment", () => {
    it("should mark assignment as SKIPPED with reason", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.campaignAssignment.update.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.SKIPPED,
        skippedBy: mockUserId,
        skipReason: "Employee on leave",
      });
      mockPrismaService.campaignAssignment.count.mockResolvedValue(0);
      mockPrismaService.campaign.update.mockResolvedValue({});

      const result = await service.skipAssignment(
        mockAssignmentId,
        mockOrgId,
        mockUserId,
        "Employee on leave",
      );

      expect(result.status).toBe(AssignmentStatus.SKIPPED);
      expect(result.skipReason).toBe("Employee on leave");
      expect(result.skippedBy).toBe(mockUserId);
    });

    it("should throw NotFoundException when assignment not found", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.skipAssignment("nonexistent", mockOrgId, mockUserId, "reason"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should log audit event", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.campaignAssignment.update.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.SKIPPED,
      });
      mockPrismaService.campaignAssignment.count.mockResolvedValue(0);
      mockPrismaService.campaign.update.mockResolvedValue({});

      await service.skipAssignment(
        mockAssignmentId,
        mockOrgId,
        mockUserId,
        "reason",
      );

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "skipped",
          actorUserId: mockUserId,
        }),
      );
    });
  });

  describe("recordReminderSent", () => {
    it("should increment reminder count", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.campaignAssignment.update.mockResolvedValue({
        ...mockAssignment,
        reminderCount: 1,
        lastReminderSentAt: new Date(),
      });

      const result = await service.recordReminderSent(
        mockAssignmentId,
        mockOrgId,
      );

      expect(prisma.campaignAssignment.update).toHaveBeenCalledWith({
        where: { id: mockAssignmentId },
        data: {
          reminderCount: { increment: 1 },
          lastReminderSentAt: expect.any(Date),
        },
      });
    });

    it("should throw NotFoundException when assignment not found", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.recordReminderSent("nonexistent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByCampaign", () => {
    it("should return paginated assignments with employee data", async () => {
      const assignmentWithEmployee = {
        ...mockAssignment,
        employee: {
          id: mockEmployeeId,
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          jobTitle: "Engineer",
        },
      };
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([
        assignmentWithEmployee,
      ]);
      mockPrismaService.campaignAssignment.count.mockResolvedValue(1);

      const result = await service.findByCampaign(mockCampaignId, mockOrgId);

      expect(result.assignments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.campaignAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            campaignId: mockCampaignId,
            organizationId: mockOrgId,
          },
        }),
      );
    });

    it("should filter by status when provided", async () => {
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([]);
      mockPrismaService.campaignAssignment.count.mockResolvedValue(0);

      await service.findByCampaign(mockCampaignId, mockOrgId, {
        status: AssignmentStatus.COMPLETED,
      });

      expect(prisma.campaignAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AssignmentStatus.COMPLETED,
          }),
        }),
      );
    });
  });

  describe("findByEmployee", () => {
    it("should return assignments for an employee", async () => {
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([
        mockAssignment,
      ]);
      mockPrismaService.campaignAssignment.count.mockResolvedValue(1);

      const result = await service.findByEmployee(mockEmployeeId, mockOrgId);

      expect(result.assignments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.campaignAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            employeeId: mockEmployeeId,
            organizationId: mockOrgId,
          },
        }),
      );
    });

    it("should filter active assignments only when requested", async () => {
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([]);
      mockPrismaService.campaignAssignment.count.mockResolvedValue(0);

      await service.findByEmployee(mockEmployeeId, mockOrgId, {
        activeOnly: true,
      });

      expect(prisma.campaignAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              in: [
                AssignmentStatus.PENDING,
                AssignmentStatus.NOTIFIED,
                AssignmentStatus.IN_PROGRESS,
              ],
            },
          }),
        }),
      );
    });
  });

  describe("findOverdue", () => {
    it("should return overdue assignments", async () => {
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([
        mockAssignment,
      ]);

      const result = await service.findOverdue(mockCampaignId, mockOrgId);

      expect(prisma.campaignAssignment.findMany).toHaveBeenCalledWith({
        where: {
          campaignId: mockCampaignId,
          organizationId: mockOrgId,
          dueDate: { lt: expect.any(Date) },
          status: {
            in: [
              AssignmentStatus.PENDING,
              AssignmentStatus.NOTIFIED,
              AssignmentStatus.IN_PROGRESS,
            ],
          },
        },
        orderBy: { dueDate: "asc" },
      });
    });
  });

  describe("syncOverdueStatus", () => {
    it("should mark overdue assignments with OVERDUE status", async () => {
      mockPrismaService.campaignAssignment.updateMany.mockResolvedValue({
        count: 5,
      });
      mockPrismaService.campaignAssignment.count.mockResolvedValue(0);
      mockPrismaService.campaign.update.mockResolvedValue({});

      const result = await service.syncOverdueStatus(mockCampaignId, mockOrgId);

      expect(result).toBe(5);
      expect(prisma.campaignAssignment.updateMany).toHaveBeenCalledWith({
        where: {
          campaignId: mockCampaignId,
          organizationId: mockOrgId,
          dueDate: { lt: expect.any(Date) },
          status: {
            in: [
              AssignmentStatus.PENDING,
              AssignmentStatus.NOTIFIED,
              AssignmentStatus.IN_PROGRESS,
            ],
          },
        },
        data: {
          status: AssignmentStatus.OVERDUE,
        },
      });
    });

    it("should update campaign statistics when assignments marked overdue", async () => {
      mockPrismaService.campaignAssignment.updateMany.mockResolvedValue({
        count: 3,
      });
      mockPrismaService.campaignAssignment.count.mockResolvedValue(5);
      mockPrismaService.campaign.update.mockResolvedValue({});

      await service.syncOverdueStatus(mockCampaignId, mockOrgId);

      expect(prisma.campaign.update).toHaveBeenCalled();
    });

    it("should not update statistics when no assignments marked overdue", async () => {
      mockPrismaService.campaignAssignment.updateMany.mockResolvedValue({
        count: 0,
      });

      await service.syncOverdueStatus(mockCampaignId, mockOrgId);

      expect(prisma.campaign.update).not.toHaveBeenCalled();
    });
  });
});
