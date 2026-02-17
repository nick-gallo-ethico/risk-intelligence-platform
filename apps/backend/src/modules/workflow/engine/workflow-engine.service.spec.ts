import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { WorkflowEngineService } from "./workflow-engine.service";
import { PrismaService } from "../../prisma/prisma.service";
import { WorkflowEntityType, WorkflowInstanceStatus } from "@prisma/client";
import {
  WorkflowInstanceCreatedEvent,
  WorkflowTransitionedEvent,
  WorkflowCompletedEvent,
  WorkflowCancelledEvent,
  WorkflowPausedEvent,
  WorkflowResumedEvent,
} from "../events/workflow.events";

describe("WorkflowEngineService", () => {
  let service: WorkflowEngineService;

  // Test data fixtures
  const orgId = "org-123";
  const userId = "user-123";
  const entityId = "case-456";
  const templateId = "template-789";
  const instanceId = "instance-111";

  const mockStages = [
    { id: "new", name: "New", steps: [], slaDays: 5 },
    { id: "triage", name: "Triage", steps: [], slaDays: 3 },
    {
      id: "investigation",
      name: "Investigation",
      steps: [],
      gates: [
        { type: "required_fields", config: {}, errorMessage: "Missing fields" },
      ],
    },
    { id: "closed", name: "Closed", steps: [], isTerminal: true },
  ];

  const mockTransitions = [
    { from: "new", to: "triage", label: "Start Triage" },
    { from: "triage", to: "investigation", label: "Begin Investigation" },
    { from: "investigation", to: "closed", label: "Close Case" },
    { from: "*", to: "closed", label: "Force Close" }, // Wildcard transition
  ];

  const mockTemplate = {
    id: templateId,
    organizationId: orgId,
    name: "Default Case Workflow",
    entityType: WorkflowEntityType.CASE,
    version: 1,
    isActive: true,
    isDefault: true,
    initialStage: "new",
    stages: mockStages,
    transitions: mockTransitions,
    defaultSlaDays: 30,
  };

  const mockInstance = {
    id: instanceId,
    organizationId: orgId,
    templateId,
    templateVersion: 1,
    entityType: WorkflowEntityType.CASE,
    entityId,
    currentStage: "new",
    status: WorkflowInstanceStatus.ACTIVE,
    stepStates: {},
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    startedById: userId,
    template: mockTemplate,
  };

  // Define mocks outside beforeEach for direct access
  const mockPrismaService = {
    workflowTemplate: {
      findFirst: jest.fn(),
    },
    workflowInstance: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("startWorkflow", () => {
    it("should start workflow instance at initial stage", async () => {
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(
        mockTemplate as any,
      );
      mockPrismaService.workflowInstance.create.mockResolvedValue(
        mockInstance as any,
      );

      const result = await service.startWorkflow({
        organizationId: orgId,
        entityType: "CASE",
        entityId,
        actorUserId: userId,
      });

      expect(result).toBe(instanceId);
      expect(mockPrismaService.workflowInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: orgId,
          templateId,
          templateVersion: 1,
          entityType: WorkflowEntityType.CASE,
          entityId,
          currentStage: "new",
          status: WorkflowInstanceStatus.ACTIVE,
          startedById: userId,
        }),
      });
    });

    it("should emit WorkflowInstanceCreatedEvent", async () => {
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(
        mockTemplate as any,
      );
      mockPrismaService.workflowInstance.create.mockResolvedValue(
        mockInstance as any,
      );

      await service.startWorkflow({
        organizationId: orgId,
        entityType: "CASE",
        entityId,
        actorUserId: userId,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WorkflowInstanceCreatedEvent.eventName,
        expect.objectContaining({
          organizationId: orgId,
          instanceId,
          templateId,
          entityType: "CASE",
          entityId,
          initialStage: "new",
        }),
      );
    });

    it("should find template by ID when provided", async () => {
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(
        mockTemplate as any,
      );
      mockPrismaService.workflowInstance.create.mockResolvedValue(
        mockInstance as any,
      );

      await service.startWorkflow({
        organizationId: orgId,
        entityType: "CASE",
        entityId,
        templateId,
        actorUserId: userId,
      });

      expect(mockPrismaService.workflowTemplate.findFirst).toHaveBeenCalledWith(
        {
          where: { id: templateId, organizationId: orgId, isActive: true },
        },
      );
    });

    it("should find default template when no templateId provided", async () => {
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(
        mockTemplate as any,
      );
      mockPrismaService.workflowInstance.create.mockResolvedValue(
        mockInstance as any,
      );

      await service.startWorkflow({
        organizationId: orgId,
        entityType: "CASE",
        entityId,
      });

      expect(mockPrismaService.workflowTemplate.findFirst).toHaveBeenCalledWith(
        {
          where: {
            organizationId: orgId,
            entityType: WorkflowEntityType.CASE,
            isDefault: true,
            isActive: true,
          },
        },
      );
    });

    it("should throw NotFoundException when no template found", async () => {
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.startWorkflow({
          organizationId: orgId,
          entityType: "CASE",
          entityId,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when initial stage not found", async () => {
      const invalidTemplate = {
        ...mockTemplate,
        initialStage: "nonexistent",
      };
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(
        invalidTemplate as any,
      );

      await expect(
        service.startWorkflow({
          organizationId: orgId,
          entityType: "CASE",
          entityId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should calculate due date from defaultSlaDays", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(
        mockTemplate as any,
      );
      mockPrismaService.workflowInstance.create.mockResolvedValue(
        mockInstance as any,
      );

      await service.startWorkflow({
        organizationId: orgId,
        entityType: "CASE",
        entityId,
      });

      const expectedDueDate = new Date(now + 30 * 24 * 60 * 60 * 1000);
      expect(mockPrismaService.workflowInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dueDate: expectedDueDate,
        }),
      });

      jest.restoreAllMocks();
    });

    it("should set null due date when no defaultSlaDays", async () => {
      const templateNoSla = { ...mockTemplate, defaultSlaDays: null };
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(
        templateNoSla as any,
      );
      mockPrismaService.workflowInstance.create.mockResolvedValue(
        mockInstance as any,
      );

      await service.startWorkflow({
        organizationId: orgId,
        entityType: "CASE",
        entityId,
      });

      expect(mockPrismaService.workflowInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dueDate: null,
        }),
      });
    });
  });

  describe("transition", () => {
    it("should transition to next stage on valid action", async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        mockInstance as any,
      );
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        currentStage: "triage",
      } as any);

      const result = await service.transition({
        instanceId,
        toStage: "triage",
        actorUserId: userId,
      });

      expect(result.success).toBe(true);
      expect(result.previousStage).toBe("new");
      expect(result.newStage).toBe("triage");
    });

    it("should emit WorkflowTransitionedEvent", async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        mockInstance as any,
      );
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        currentStage: "triage",
      } as any);

      await service.transition({
        instanceId,
        toStage: "triage",
        actorUserId: userId,
        reason: "Initial triage needed",
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WorkflowTransitionedEvent.eventName,
        expect.objectContaining({
          instanceId,
          previousStage: "new",
          newStage: "triage",
          triggeredBy: userId,
          reason: "Initial triage needed",
        }),
      );
    });

    it("should reject invalid transition (not in allowed transitions)", async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        mockInstance as any,
      );

      const result = await service.transition({
        instanceId,
        toStage: "investigation", // Cannot go directly from 'new' to 'investigation'
        actorUserId: userId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not allowed");
      expect(mockPrismaService.workflowInstance.update).not.toHaveBeenCalled();
    });

    it("should allow wildcard transition from any stage", async () => {
      const instanceInTriage = {
        ...mockInstance,
        currentStage: "triage",
      };
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        instanceInTriage as any,
      );
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...instanceInTriage,
        currentStage: "closed",
      } as any);

      const result = await service.transition({
        instanceId,
        toStage: "closed", // Wildcard allows from any stage
        actorUserId: userId,
      });

      expect(result.success).toBe(true);
      expect(result.newStage).toBe("closed");
    });

    it("should return error when instance not found", async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(null);

      const result = await service.transition({
        instanceId: "nonexistent",
        toStage: "triage",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Instance not found");
    });

    it("should return error when workflow not active", async () => {
      const cancelledInstance = {
        ...mockInstance,
        status: WorkflowInstanceStatus.CANCELLED,
      };
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        cancelledInstance as any,
      );

      const result = await service.transition({
        instanceId,
        toStage: "triage",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Workflow not active");
    });

    it("should update step states on transition", async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        mockInstance as any,
      );
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        currentStage: "triage",
      } as any);

      await service.transition({
        instanceId,
        toStage: "triage",
        actorUserId: userId,
      });

      expect(mockPrismaService.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: instanceId },
        data: expect.objectContaining({
          currentStage: "triage",
          stepStates: expect.objectContaining({
            new: expect.objectContaining({
              status: "completed",
              completedBy: userId,
            }),
          }),
        }),
      });
    });

    it("should update due date when target stage has SLA", async () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        mockInstance as any,
      );
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        currentStage: "triage",
      } as any);

      await service.transition({
        instanceId,
        toStage: "triage", // Has slaDays: 3
        actorUserId: userId,
      });

      const expectedDueDate = new Date(now + 3 * 24 * 60 * 60 * 1000);
      expect(mockPrismaService.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: instanceId },
        data: expect.objectContaining({
          dueDate: expectedDueDate,
        }),
      });

      jest.restoreAllMocks();
    });

    it("should skip gate validation when validateGates is false", async () => {
      const instanceInInvestigation = {
        ...mockInstance,
        currentStage: "investigation", // Has gates
      };
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        instanceInInvestigation as any,
      );
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...instanceInInvestigation,
        currentStage: "closed",
      } as any);

      const result = await service.transition({
        instanceId,
        toStage: "closed",
        validateGates: false,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("complete", () => {
    it("should complete workflow when reaching terminal stage", async () => {
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        status: WorkflowInstanceStatus.COMPLETED,
        outcome: "resolved",
      } as any);

      await service.complete({
        instanceId,
        outcome: "resolved",
        actorUserId: userId,
      });

      expect(mockPrismaService.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: instanceId },
        data: expect.objectContaining({
          status: WorkflowInstanceStatus.COMPLETED,
          outcome: "resolved",
        }),
      });
    });

    it("should emit WorkflowCompletedEvent", async () => {
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        status: WorkflowInstanceStatus.COMPLETED,
      } as any);

      await service.complete({
        instanceId,
        outcome: "substantiated",
        actorUserId: userId,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WorkflowCompletedEvent.eventName,
        expect.objectContaining({
          instanceId,
          outcome: "substantiated",
        }),
      );
    });
  });

  describe("cancel", () => {
    it("should cancel workflow instance", async () => {
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        status: WorkflowInstanceStatus.CANCELLED,
      } as any);

      await service.cancel(instanceId, userId, "No longer needed");

      expect(mockPrismaService.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: instanceId },
        data: { status: WorkflowInstanceStatus.CANCELLED },
      });
    });

    it("should emit WorkflowCancelledEvent", async () => {
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        status: WorkflowInstanceStatus.CANCELLED,
      } as any);

      await service.cancel(instanceId, userId, "Duplicate case");

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WorkflowCancelledEvent.eventName,
        expect.objectContaining({
          instanceId,
          reason: "Duplicate case",
        }),
      );
    });
  });

  describe("pause and resume", () => {
    it("should pause workflow instance", async () => {
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        status: WorkflowInstanceStatus.PAUSED,
      } as any);

      await service.pause(instanceId, userId, "Pending external input");

      expect(mockPrismaService.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: instanceId },
        data: { status: WorkflowInstanceStatus.PAUSED },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WorkflowPausedEvent.eventName,
        expect.any(Object),
      );
    });

    it("should resume paused workflow", async () => {
      const pausedInstance = {
        ...mockInstance,
        status: WorkflowInstanceStatus.PAUSED,
      };
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        pausedInstance as any,
      );
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...pausedInstance,
        status: WorkflowInstanceStatus.ACTIVE,
      } as any);

      await service.resume(instanceId, userId);

      expect(mockPrismaService.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: instanceId },
        data: { status: WorkflowInstanceStatus.ACTIVE },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WorkflowResumedEvent.eventName,
        expect.any(Object),
      );
    });

    it("should throw NotFoundException when resuming nonexistent instance", async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(null);

      await expect(service.resume("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when resuming non-paused workflow", async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        mockInstance as any,
      );

      await expect(service.resume(instanceId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("getInstanceByEntity", () => {
    it("should return workflow instance with template", async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        mockInstance as any,
      );

      const result = await service.getInstanceByEntity(
        orgId,
        WorkflowEntityType.CASE,
        entityId,
      );

      expect(result).toEqual(mockInstance);
      expect(
        mockPrismaService.workflowInstance.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          entityType_entityId: {
            entityType: WorkflowEntityType.CASE,
            entityId,
          },
        },
        include: { template: true },
      });
    });

    it("should return null when instance not found", async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(null);

      const result = await service.getInstanceByEntity(
        orgId,
        WorkflowEntityType.CASE,
        "nonexistent",
      );

      expect(result).toBeNull();
    });
  });

  describe("getInstance", () => {
    it("should return instance by ID with template", async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        mockInstance as any,
      );

      const result = await service.getInstance(instanceId);

      expect(result).toEqual(mockInstance);
      expect(
        mockPrismaService.workflowInstance.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: instanceId },
        include: { template: true },
      });
    });
  });

  describe("getAllowedTransitions", () => {
    it("should return allowed transitions from current stage", async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        mockInstance as any,
      );

      const result = await service.getAllowedTransitions(instanceId);

      expect(result).toEqual([
        { to: "triage", label: "Start Triage" },
        { to: "closed", label: "Force Close" }, // Wildcard
      ]);
    });

    it("should return empty array when instance not found", async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(null);

      const result = await service.getAllowedTransitions("nonexistent");

      expect(result).toEqual([]);
    });

    it("should return empty array when workflow not active", async () => {
      const cancelledInstance = {
        ...mockInstance,
        status: WorkflowInstanceStatus.CANCELLED,
      };
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(
        cancelledInstance as any,
      );

      const result = await service.getAllowedTransitions(instanceId);

      expect(result).toEqual([]);
    });
  });

  describe("event emission error handling", () => {
    it("should log error and continue when event emission fails", async () => {
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(
        mockTemplate as any,
      );
      mockPrismaService.workflowInstance.create.mockResolvedValue(
        mockInstance as any,
      );
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error("Event emission failed");
      });

      // Should not throw
      const result = await service.startWorkflow({
        organizationId: orgId,
        entityType: "CASE",
        entityId,
      });

      expect(result).toBe(instanceId);
    });
  });
});
