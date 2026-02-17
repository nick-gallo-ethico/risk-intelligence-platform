import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  PolicyApprovalService,
  PolicySubmittedForApprovalEvent,
  PolicyApprovalCancelledEvent,
} from "./policy-approval.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { WorkflowEngineService } from "../../workflow/engine/workflow-engine.service";
import {
  PolicyStatus,
  WorkflowEntityType,
  WorkflowInstanceStatus,
} from "@prisma/client";

describe("PolicyApprovalService", () => {
  let service: PolicyApprovalService;
  let prisma: jest.Mocked<PrismaService>;
  let workflowEngine: jest.Mocked<WorkflowEngineService>;
  let auditService: jest.Mocked<AuditService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  // Test fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockPolicyId = "policy-test-123";
  const mockWorkflowInstanceId = "workflow-instance-123";
  const mockTemplateId = "template-123";

  const mockPolicy = {
    id: mockPolicyId,
    organizationId: mockOrgId,
    title: "Code of Conduct",
    status: PolicyStatus.DRAFT,
    draftContent: "<p>Policy content</p>",
    currentVersion: 0,
  };

  const mockWorkflowTemplate = {
    id: mockTemplateId,
    organizationId: mockOrgId,
    name: "Policy Approval",
    entityType: WorkflowEntityType.POLICY,
    isDefault: true,
    isActive: true,
    stages: [{ id: "stage-1", name: "Review" }],
  };

  const mockWorkflowInstance = {
    id: mockWorkflowInstanceId,
    organizationId: mockOrgId,
    entityType: WorkflowEntityType.POLICY,
    entityId: mockPolicyId,
    status: WorkflowInstanceStatus.ACTIVE,
    currentStage: "stage-1",
    stepStates: {},
    template: mockWorkflowTemplate,
    createdAt: new Date(),
  };

  // Mocks
  const mockPrismaService = {
    policy: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    workflowTemplate: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    workflowInstance: {
      findFirst: jest.fn(),
    },
  };

  const mockWorkflowEngineService = {
    startWorkflow: jest.fn(),
    cancel: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyApprovalService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WorkflowEngineService, useValue: mockWorkflowEngineService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PolicyApprovalService>(PolicyApprovalService);
    prisma = module.get(PrismaService);
    workflowEngine = module.get(WorkflowEngineService);
    auditService = module.get(AuditService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe("submitForApproval", () => {
    it("should submit policy for approval and start workflow", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(
        mockWorkflowTemplate,
      );
      mockWorkflowEngineService.startWorkflow.mockResolvedValue(
        mockWorkflowInstanceId,
      );
      mockPrismaService.policy.update.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.PENDING_APPROVAL,
      });

      // Act
      const result = await service.submitForApproval(
        mockPolicyId,
        null,
        "Please review",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.policy.status).toBe(PolicyStatus.PENDING_APPROVAL);
      expect(result.workflowInstanceId).toBe(mockWorkflowInstanceId);
      expect(workflowEngine.startWorkflow).toHaveBeenCalledWith({
        organizationId: mockOrgId,
        entityType: WorkflowEntityType.POLICY,
        entityId: mockPolicyId,
        templateId: mockTemplateId,
        actorUserId: mockUserId,
      });
    });

    it("should throw NotFoundException when policy not found", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.submitForApproval(
          mockPolicyId,
          null,
          undefined,
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when policy is not in DRAFT status", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.PUBLISHED,
      });

      // Act & Assert
      await expect(
        service.submitForApproval(
          mockPolicyId,
          null,
          undefined,
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when policy has no draft content", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue({
        ...mockPolicy,
        draftContent: null,
      });

      // Act & Assert
      await expect(
        service.submitForApproval(
          mockPolicyId,
          null,
          undefined,
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when no workflow template configured", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.submitForApproval(
          mockPolicyId,
          null,
          undefined,
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should use provided workflow template ID", async () => {
      // Arrange
      const customTemplateId = "custom-template-123";
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockWorkflowEngineService.startWorkflow.mockResolvedValue(
        mockWorkflowInstanceId,
      );
      mockPrismaService.policy.update.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.PENDING_APPROVAL,
      });

      // Act
      await service.submitForApproval(
        mockPolicyId,
        customTemplateId,
        undefined,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(workflowEngine.startWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: customTemplateId,
        }),
      );
    });

    it("should emit PolicySubmittedForApprovalEvent", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(
        mockWorkflowTemplate,
      );
      mockWorkflowEngineService.startWorkflow.mockResolvedValue(
        mockWorkflowInstanceId,
      );
      mockPrismaService.policy.update.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.PENDING_APPROVAL,
      });

      // Act
      await service.submitForApproval(
        mockPolicyId,
        null,
        "Review notes",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicySubmittedForApprovalEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
          policyId: mockPolicyId,
          workflowInstanceId: mockWorkflowInstanceId,
        }),
      );
    });

    it("should log audit activity", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(
        mockWorkflowTemplate,
      );
      mockWorkflowEngineService.startWorkflow.mockResolvedValue(
        mockWorkflowInstanceId,
      );
      mockPrismaService.policy.update.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.PENDING_APPROVAL,
      });

      // Act
      await service.submitForApproval(
        mockPolicyId,
        null,
        undefined,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "submitted_for_approval",
          entityId: mockPolicyId,
        }),
      );
    });
  });

  describe("cancelApproval", () => {
    it("should cancel approval and return policy to DRAFT status", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.workflowInstance.findFirst.mockResolvedValue(
        mockWorkflowInstance,
      );
      mockWorkflowEngineService.cancel.mockResolvedValue(undefined);
      mockPrismaService.policy.update.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.DRAFT,
      });

      // Act
      const result = await service.cancelApproval(
        mockPolicyId,
        "Additional changes needed",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(PolicyStatus.DRAFT);
      expect(workflowEngine.cancel).toHaveBeenCalledWith(
        mockWorkflowInstanceId,
        mockUserId,
        "Additional changes needed",
      );
    });

    it("should throw NotFoundException when policy not found", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.cancelApproval(mockPolicyId, "reason", mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when no active workflow", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.workflowInstance.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.cancelApproval(mockPolicyId, "reason", mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should emit PolicyApprovalCancelledEvent", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.workflowInstance.findFirst.mockResolvedValue(
        mockWorkflowInstance,
      );
      mockWorkflowEngineService.cancel.mockResolvedValue(undefined);
      mockPrismaService.policy.update.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.DRAFT,
      });

      // Act
      await service.cancelApproval(
        mockPolicyId,
        "reason",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyApprovalCancelledEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
          policyId: mockPolicyId,
          reason: "reason",
        }),
      );
    });
  });

  describe("getApprovalStatus", () => {
    it("should return approval status with workflow details", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.workflowInstance.findFirst.mockResolvedValue(
        mockWorkflowInstance,
      );

      // Act
      const result = await service.getApprovalStatus(mockPolicyId, mockOrgId);

      // Assert
      expect(result.policy).toEqual(mockPolicy);
      expect(result.workflowInstance).toEqual(mockWorkflowInstance);
      expect(result.isActive).toBe(true);
    });

    it("should return null workflow when no submission exists", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.workflowInstance.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.getApprovalStatus(mockPolicyId, mockOrgId);

      // Assert
      expect(result.policy).toEqual(mockPolicy);
      expect(result.workflowInstance).toBeNull();
      expect(result.currentStep).toBeNull();
      expect(result.reviewers).toEqual([]);
      expect(result.isActive).toBe(false);
    });

    it("should throw NotFoundException when policy not found", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getApprovalStatus(mockPolicyId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should parse current step from workflow template stages", async () => {
      // Arrange
      const instanceWithStages = {
        ...mockWorkflowInstance,
        currentStage: "stage-1",
        template: {
          ...mockWorkflowTemplate,
          stages: [
            {
              id: "stage-1",
              name: "Initial Review",
              description: "First review",
            },
            { id: "stage-2", name: "Final Approval" },
          ],
        },
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.workflowInstance.findFirst.mockResolvedValue(
        instanceWithStages,
      );

      // Act
      const result = await service.getApprovalStatus(mockPolicyId, mockOrgId);

      // Assert
      expect(result.currentStep).toEqual({
        stageId: "stage-1",
        stageName: "Initial Review",
        description: "First review",
      });
    });
  });

  describe("getDefaultWorkflowTemplate", () => {
    it("should return default workflow template for POLICY entity type", async () => {
      // Arrange
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(
        mockWorkflowTemplate,
      );

      // Act
      const result = await service.getDefaultWorkflowTemplate(mockOrgId);

      // Assert
      expect(result).toEqual(mockWorkflowTemplate);
      expect(prisma.workflowTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrgId,
          entityType: WorkflowEntityType.POLICY,
          isDefault: true,
          isActive: true,
        },
      });
    });

    it("should return null when no default template exists", async () => {
      // Arrange
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.getDefaultWorkflowTemplate(mockOrgId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("getAvailableWorkflowTemplates", () => {
    it("should return all active workflow templates for POLICY", async () => {
      // Arrange
      const templates = [
        mockWorkflowTemplate,
        { ...mockWorkflowTemplate, id: "template-2" },
      ];
      mockPrismaService.workflowTemplate.findMany.mockResolvedValue(templates);

      // Act
      const result = await service.getAvailableWorkflowTemplates(mockOrgId);

      // Assert
      expect(result).toEqual(templates);
      expect(prisma.workflowTemplate.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrgId,
          entityType: WorkflowEntityType.POLICY,
          isActive: true,
        },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
    });
  });
});
