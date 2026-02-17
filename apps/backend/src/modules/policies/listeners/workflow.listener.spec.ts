import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  PolicyWorkflowListener,
  PolicyApprovedEvent,
  PolicyRejectedEvent,
  PolicyApprovalStepCompletedEvent,
} from "./workflow.listener";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import {
  WorkflowCompletedEvent,
  WorkflowCancelledEvent,
  WorkflowTransitionedEvent,
} from "../../workflow/events/workflow.events";
import {
  PolicyStatus,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";

describe("PolicyWorkflowListener", () => {
  let listener: PolicyWorkflowListener;
  let prisma: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let auditService: jest.Mocked<AuditService>;

  // Test fixtures
  const mockOrgId = "org-test-123";
  const mockPolicyId = "policy-test-123";
  const mockUserId = "user-test-123";
  const mockInstanceId = "instance-test-123";

  const mockPolicy = {
    id: mockPolicyId,
    title: "Code of Conduct",
    organizationId: mockOrgId,
    status: PolicyStatus.PENDING_APPROVAL,
  };

  // Mocks
  const mockPrismaService = {
    policy: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyWorkflowListener,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    listener = module.get<PolicyWorkflowListener>(PolicyWorkflowListener);
    prisma = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
    auditService = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe("onWorkflowCompleted", () => {
    it("should update policy status to APPROVED when workflow completes", async () => {
      // Arrange
      const event = new WorkflowCompletedEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        outcome: "approved",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockResolvedValue(mockPolicy);
      mockPrismaService.policy.update.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.APPROVED,
      });

      // Act
      await listener.onWorkflowCompleted(event);

      // Assert
      expect(prisma.policy.update).toHaveBeenCalledWith({
        where: { id: mockPolicyId },
        data: {
          status: PolicyStatus.APPROVED,
          updatedAt: expect.any(Date),
        },
      });
    });

    it("should emit PolicyApprovedEvent", async () => {
      // Arrange
      const event = new WorkflowCompletedEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        outcome: "approved",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockResolvedValue(mockPolicy);
      mockPrismaService.policy.update.mockResolvedValue(mockPolicy);

      // Act
      await listener.onWorkflowCompleted(event);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyApprovedEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
          policyId: mockPolicyId,
          policyTitle: mockPolicy.title,
          workflowInstanceId: mockInstanceId,
        }),
      );
    });

    it("should log audit activity", async () => {
      // Arrange
      const event = new WorkflowCompletedEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        outcome: "approved",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockResolvedValue(mockPolicy);
      mockPrismaService.policy.update.mockResolvedValue(mockPolicy);

      // Act
      await listener.onWorkflowCompleted(event);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: mockOrgId,
          entityType: AuditEntityType.POLICY,
          entityId: mockPolicyId,
          action: "approved",
          actionCategory: AuditActionCategory.SYSTEM,
          actorUserId: mockUserId,
        }),
      );
    });

    it("should skip non-POLICY entity types", async () => {
      // Arrange
      const event = new WorkflowCompletedEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "CASE", // Not POLICY
        entityId: "case-123",
        outcome: "approved",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      // Act
      await listener.onWorkflowCompleted(event);

      // Assert
      expect(prisma.policy.findUnique).not.toHaveBeenCalled();
      expect(prisma.policy.update).not.toHaveBeenCalled();
    });

    it("should not throw when policy not found", async () => {
      // Arrange
      const event = new WorkflowCompletedEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        outcome: "approved",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(listener.onWorkflowCompleted(event)).resolves.not.toThrow();
      expect(prisma.policy.update).not.toHaveBeenCalled();
    });

    it("should not throw on database error", async () => {
      // Arrange
      const event = new WorkflowCompletedEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        outcome: "approved",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockRejectedValue(
        new Error("DB error"),
      );

      // Act & Assert
      await expect(listener.onWorkflowCompleted(event)).resolves.not.toThrow();
    });
  });

  describe("onWorkflowCancelled", () => {
    it("should update policy status to DRAFT when workflow cancelled", async () => {
      // Arrange
      const event = new WorkflowCancelledEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        reason: "User cancelled",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockResolvedValue(mockPolicy);
      mockPrismaService.policy.update.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.DRAFT,
      });

      // Act
      await listener.onWorkflowCancelled(event);

      // Assert
      expect(prisma.policy.update).toHaveBeenCalledWith({
        where: { id: mockPolicyId },
        data: {
          status: PolicyStatus.DRAFT,
          updatedAt: expect.any(Date),
        },
      });
    });

    it("should emit PolicyRejectedEvent", async () => {
      // Arrange
      const event = new WorkflowCancelledEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        reason: "User cancelled",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockResolvedValue(mockPolicy);
      mockPrismaService.policy.update.mockResolvedValue(mockPolicy);

      // Act
      await listener.onWorkflowCancelled(event);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyRejectedEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
          policyId: mockPolicyId,
          policyTitle: mockPolicy.title,
          workflowInstanceId: mockInstanceId,
          reason: "User cancelled",
        }),
      );
    });

    it("should not update if policy already DRAFT", async () => {
      // Arrange
      const event = new WorkflowCancelledEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        reason: "Already cancelled",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.DRAFT,
      });

      // Act
      await listener.onWorkflowCancelled(event);

      // Assert
      expect(prisma.policy.update).not.toHaveBeenCalled();
      // Should still emit rejected event
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyRejectedEvent.eventName,
        expect.anything(),
      );
    });

    it("should skip non-POLICY entity types", async () => {
      // Arrange
      const event = new WorkflowCancelledEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "INVESTIGATION",
        entityId: "inv-123",
        reason: "User cancelled",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      // Act
      await listener.onWorkflowCancelled(event);

      // Assert
      expect(prisma.policy.findUnique).not.toHaveBeenCalled();
    });

    it("should not throw when policy not found", async () => {
      // Arrange
      const event = new WorkflowCancelledEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        reason: "User cancelled",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(listener.onWorkflowCancelled(event)).resolves.not.toThrow();
    });

    it("should not throw on database error", async () => {
      // Arrange
      const event = new WorkflowCancelledEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        reason: "User cancelled",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockRejectedValue(
        new Error("Connection lost"),
      );

      // Act & Assert
      await expect(listener.onWorkflowCancelled(event)).resolves.not.toThrow();
    });
  });

  describe("onWorkflowTransitioned", () => {
    it("should log audit activity for workflow transition", async () => {
      // Arrange
      const event = new WorkflowTransitionedEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        previousStage: "Legal Review",
        newStage: "Final Approval",
        triggeredBy: "approval",
        reason: "Approved by legal",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockResolvedValue(mockPolicy);

      // Act
      await listener.onWorkflowTransitioned(event);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: mockOrgId,
          entityType: AuditEntityType.POLICY,
          entityId: mockPolicyId,
          action: "approval_step_completed",
          actionCategory: AuditActionCategory.SYSTEM,
          actorUserId: mockUserId,
          context: expect.objectContaining({
            previousStage: "Legal Review",
            newStage: "Final Approval",
          }),
        }),
      );
    });

    it("should emit PolicyApprovalStepCompletedEvent", async () => {
      // Arrange
      const event = new WorkflowTransitionedEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        previousStage: "Draft",
        newStage: "Review",
        triggeredBy: "approval",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockResolvedValue(mockPolicy);

      // Act
      await listener.onWorkflowTransitioned(event);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyApprovalStepCompletedEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
          policyId: mockPolicyId,
          policyTitle: mockPolicy.title,
          previousStage: "Draft",
          newStage: "Review",
          completedById: mockUserId,
        }),
      );
    });

    it("should skip non-POLICY entity types", async () => {
      // Arrange
      const event = new WorkflowTransitionedEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "REMEDIATION",
        entityId: "rem-123",
        previousStage: "Open",
        newStage: "In Progress",
        triggeredBy: "manual",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      // Act
      await listener.onWorkflowTransitioned(event);

      // Assert
      expect(prisma.policy.findUnique).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it("should not throw when policy not found", async () => {
      // Arrange
      const event = new WorkflowTransitionedEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        previousStage: "Draft",
        newStage: "Review",
        triggeredBy: "manual",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        listener.onWorkflowTransitioned(event),
      ).resolves.not.toThrow();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it("should not throw on database error", async () => {
      // Arrange
      const event = new WorkflowTransitionedEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        previousStage: "Draft",
        newStage: "Review",
        triggeredBy: "manual",
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policy.findUnique.mockRejectedValue(
        new Error("Query timeout"),
      );

      // Act & Assert
      await expect(
        listener.onWorkflowTransitioned(event),
      ).resolves.not.toThrow();
    });

    it("should handle missing actorUserId", async () => {
      // Arrange
      const event = new WorkflowTransitionedEvent({
        organizationId: mockOrgId,
        instanceId: mockInstanceId,
        entityType: "POLICY",
        entityId: mockPolicyId,
        previousStage: "Draft",
        newStage: "Review",
        triggeredBy: "system",
        actorUserId: null,
        actorType: "SYSTEM",
      });

      mockPrismaService.policy.findUnique.mockResolvedValue(mockPolicy);

      // Act
      await listener.onWorkflowTransitioned(event);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: null,
          actorType: ActorType.SYSTEM,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyApprovalStepCompletedEvent.eventName,
        expect.objectContaining({
          completedById: undefined,
        }),
      );
    });
  });
});
