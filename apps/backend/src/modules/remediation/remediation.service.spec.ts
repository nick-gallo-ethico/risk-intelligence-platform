import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RemediationService } from "./remediation.service";
import { PrismaService } from "../prisma/prisma.service";
import { RemediationStatus } from "@prisma/client";

describe("RemediationService", () => {
  let service: RemediationService;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockPlanId = "plan-test-123";
  const mockCaseId = "case-test-123";

  const mockPlan = {
    id: mockPlanId,
    organizationId: mockOrgId,
    caseId: mockCaseId,
    title: "Remediation Plan for Case",
    description: "Detailed remediation plan",
    findingId: null,
    findingDescription: "Policy violation found",
    status: RemediationStatus.DRAFT,
    dueDate: null,
    ownerId: mockUserId,
    templateId: null,
    totalSteps: 0,
    completedSteps: 0,
    overdueSteps: 0,
    completedAt: null,
    completedById: null,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: [],
    case: {
      id: mockCaseId,
      referenceNumber: "ETH-2026-00001",
      status: "OPEN",
    },
  };

  const mockPrismaService = {
    remediationTemplate: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    remediationPlan: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    remediationStep: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemediationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<RemediationService>(RemediationService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a remediation plan", async () => {
      mockPrismaService.remediationPlan.create.mockResolvedValue({
        ...mockPlan,
        steps: [],
        case: mockPlan.case,
      });
      mockPrismaService.remediationPlan.findFirst.mockResolvedValue(mockPlan);

      const result = await service.create(mockOrgId, mockUserId, {
        caseId: mockCaseId,
        title: "Remediation Plan for Case",
        description: "Detailed remediation plan",
      });

      expect(result).toEqual(mockPlan);
      expect(mockPrismaService.remediationPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId,
            caseId: mockCaseId,
            createdById: mockUserId,
          }),
        }),
      );
    });

    it("should emit remediation.plan.created event", async () => {
      mockPrismaService.remediationPlan.create.mockResolvedValue(mockPlan);
      mockPrismaService.remediationPlan.findFirst.mockResolvedValue(mockPlan);

      await service.create(mockOrgId, mockUserId, {
        caseId: mockCaseId,
        title: "Plan",
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "remediation.plan.created",
        expect.objectContaining({
          organizationId: mockOrgId,
          planId: mockPlanId,
          userId: mockUserId,
        }),
      );
    });

    it("should create steps from template when templateId provided", async () => {
      const mockTemplate = {
        id: "template-1",
        organizationId: mockOrgId,
        name: "Standard Template",
        steps: [
          {
            order: 1,
            title: "Step 1",
            description: "Do this",
            requiresCoApproval: false,
          },
          {
            order: 2,
            title: "Step 2",
            description: "Then this",
            requiresCoApproval: true,
          },
        ],
      };

      mockPrismaService.remediationTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.remediationPlan.create.mockResolvedValue({
        ...mockPlan,
        templateId: "template-1",
        totalSteps: 2,
      });
      mockPrismaService.remediationStep.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.remediationPlan.findFirst.mockResolvedValue({
        ...mockPlan,
        steps: [
          { id: "step-1", title: "Step 1", order: 1 },
          { id: "step-2", title: "Step 2", order: 2 },
        ],
      });

      const result = await service.create(mockOrgId, mockUserId, {
        caseId: mockCaseId,
        title: "Plan with template",
        templateId: "template-1",
      });

      expect(mockPrismaService.remediationStep.createMany).toHaveBeenCalled();
      expect(result.steps).toHaveLength(2);
    });
  });

  describe("findById", () => {
    it("should return plan when found", async () => {
      mockPrismaService.remediationPlan.findFirst.mockResolvedValue(mockPlan);

      const result = await service.findById(mockOrgId, mockPlanId);

      expect(result).toEqual(mockPlan);
    });

    it("should throw NotFoundException when plan not found", async () => {
      mockPrismaService.remediationPlan.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockOrgId, "non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("activate", () => {
    it("should activate a draft plan", async () => {
      const activatedPlan = { ...mockPlan, status: RemediationStatus.ACTIVE };
      mockPrismaService.remediationPlan.findFirst.mockResolvedValue(mockPlan);
      mockPrismaService.remediationPlan.update.mockResolvedValue(activatedPlan);

      const result = await service.activate(mockOrgId, mockPlanId, mockUserId);

      expect(result.status).toBe(RemediationStatus.ACTIVE);
    });

    it("should throw BadRequestException when activating non-draft plan", async () => {
      const activePlan = { ...mockPlan, status: RemediationStatus.ACTIVE };
      mockPrismaService.remediationPlan.findFirst.mockResolvedValue(activePlan);

      await expect(
        service.activate(mockOrgId, mockPlanId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("complete", () => {
    it("should complete plan when all steps done", async () => {
      const planWithCompletedSteps = {
        ...mockPlan,
        status: RemediationStatus.ACTIVE,
        steps: [
          { id: "step-1", status: "COMPLETED" },
          { id: "step-2", status: "COMPLETED" },
        ],
      };
      const completedPlan = {
        ...planWithCompletedSteps,
        status: RemediationStatus.COMPLETED,
      };

      mockPrismaService.remediationPlan.findFirst.mockResolvedValue(
        planWithCompletedSteps,
      );
      mockPrismaService.remediationPlan.update.mockResolvedValue(completedPlan);

      const result = await service.complete(mockOrgId, mockPlanId, mockUserId);

      expect(result.status).toBe(RemediationStatus.COMPLETED);
    });

    it("should throw BadRequestException when incomplete steps exist", async () => {
      const planWithPendingSteps = {
        ...mockPlan,
        status: RemediationStatus.ACTIVE,
        steps: [
          { id: "step-1", status: "COMPLETED" },
          { id: "step-2", status: "PENDING" },
        ],
      };

      mockPrismaService.remediationPlan.findFirst.mockResolvedValue(
        planWithPendingSteps,
      );

      await expect(
        service.complete(mockOrgId, mockPlanId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("cancel", () => {
    it("should cancel a plan", async () => {
      const cancelledPlan = {
        ...mockPlan,
        status: RemediationStatus.CANCELLED,
      };
      mockPrismaService.remediationPlan.findFirst.mockResolvedValue(mockPlan);
      mockPrismaService.remediationPlan.update.mockResolvedValue(cancelledPlan);

      const result = await service.cancel(mockOrgId, mockPlanId, mockUserId);

      expect(result.status).toBe(RemediationStatus.CANCELLED);
    });
  });

  describe("findAll", () => {
    it("should return paginated plans", async () => {
      mockPrismaService.remediationPlan.findMany.mockResolvedValue([mockPlan]);
      mockPrismaService.remediationPlan.count.mockResolvedValue(1);

      const result = await service.findAll(mockOrgId, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("should filter by status when provided", async () => {
      mockPrismaService.remediationPlan.findMany.mockResolvedValue([]);
      mockPrismaService.remediationPlan.count.mockResolvedValue(0);

      await service.findAll(mockOrgId, { status: RemediationStatus.DRAFT });

      expect(mockPrismaService.remediationPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: RemediationStatus.DRAFT,
          }),
        }),
      );
    });
  });
});
