import { Test, TestingModule } from "@nestjs/testing";
import { PolicyApprovalController } from "./policy-approval.controller";
import { PolicyApprovalService } from "./policy-approval.service";
import {
  PolicyStatus,
  WorkflowEntityType,
  WorkflowInstanceStatus,
} from "@prisma/client";

describe("PolicyApprovalController", () => {
  let controller: PolicyApprovalController;
  let approvalService: jest.Mocked<PolicyApprovalService>;

  // Test fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockPolicyId = "policy-test-123";
  const mockWorkflowInstanceId = "workflow-instance-123";

  const mockUser = {
    id: mockUserId,
    organizationId: mockOrgId,
    email: "test@example.com",
    roles: ["COMPLIANCE_OFFICER"],
  };

  const mockPolicy = {
    id: mockPolicyId,
    organizationId: mockOrgId,
    title: "Code of Conduct",
    status: PolicyStatus.DRAFT,
    draftContent: "<p>Policy content</p>",
  };

  const mockSubmitResult = {
    policy: { ...mockPolicy, status: PolicyStatus.PENDING_APPROVAL },
    workflowInstanceId: mockWorkflowInstanceId,
  };

  const mockApprovalStatus = {
    policy: mockPolicy,
    workflowInstance: {
      id: mockWorkflowInstanceId,
      status: WorkflowInstanceStatus.ACTIVE,
      currentStage: "review",
      template: { name: "Policy Approval" },
    },
    currentStep: { stageId: "review", stageName: "Review Stage" },
    reviewers: [],
    isActive: true,
  };

  const mockWorkflowTemplate = {
    id: "template-123",
    name: "Policy Approval",
    entityType: WorkflowEntityType.POLICY,
    isDefault: true,
  };

  // Mocks
  const mockApprovalService = {
    submitForApproval: jest.fn(),
    cancelApproval: jest.fn(),
    getApprovalStatus: jest.fn(),
    getAvailableWorkflowTemplates: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PolicyApprovalController],
      providers: [
        { provide: PolicyApprovalService, useValue: mockApprovalService },
      ],
    }).compile();

    controller = module.get<PolicyApprovalController>(PolicyApprovalController);
    approvalService = module.get(PolicyApprovalService);

    jest.clearAllMocks();
  });

  describe("submitForApproval", () => {
    it("should submit policy for approval", async () => {
      // Arrange
      const dto = {
        workflowTemplateId: "template-123",
        submissionNotes: "Please review",
      };
      mockApprovalService.submitForApproval.mockResolvedValue(mockSubmitResult);

      // Act
      const result = await controller.submitForApproval(
        mockPolicyId,
        dto,
        mockUser as any,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mockSubmitResult);
      expect(approvalService.submitForApproval).toHaveBeenCalledWith(
        mockPolicyId,
        dto.workflowTemplateId,
        dto.submissionNotes,
        mockUserId,
        mockOrgId,
      );
    });

    it("should pass null for workflowTemplateId when not provided", async () => {
      // Arrange
      const dto = { submissionNotes: "Please review" };
      mockApprovalService.submitForApproval.mockResolvedValue(mockSubmitResult);

      // Act
      await controller.submitForApproval(
        mockPolicyId,
        dto,
        mockUser as any,
        mockOrgId,
      );

      // Assert
      expect(approvalService.submitForApproval).toHaveBeenCalledWith(
        mockPolicyId,
        null,
        dto.submissionNotes,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("cancelApproval", () => {
    it("should cancel approval workflow", async () => {
      // Arrange
      const dto = { reason: "Additional changes needed" };
      const cancelledPolicy = { ...mockPolicy, status: PolicyStatus.DRAFT };
      mockApprovalService.cancelApproval.mockResolvedValue(cancelledPolicy);

      // Act
      const result = await controller.cancelApproval(
        mockPolicyId,
        dto,
        mockUser as any,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(cancelledPolicy);
      expect(approvalService.cancelApproval).toHaveBeenCalledWith(
        mockPolicyId,
        dto.reason,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("getApprovalStatus", () => {
    it("should return approval status", async () => {
      // Arrange
      mockApprovalService.getApprovalStatus.mockResolvedValue(
        mockApprovalStatus,
      );

      // Act
      const result = await controller.getApprovalStatus(
        mockPolicyId,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mockApprovalStatus);
      expect(approvalService.getApprovalStatus).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });
  });

  describe("getWorkflowTemplates", () => {
    it("should return available workflow templates", async () => {
      // Arrange
      const templates = [mockWorkflowTemplate];
      mockApprovalService.getAvailableWorkflowTemplates.mockResolvedValue(
        templates,
      );

      // Act
      const result = await controller.getWorkflowTemplates(mockOrgId);

      // Assert
      expect(result).toEqual(templates);
      expect(
        approvalService.getAvailableWorkflowTemplates,
      ).toHaveBeenCalledWith(mockOrgId);
    });
  });
});
