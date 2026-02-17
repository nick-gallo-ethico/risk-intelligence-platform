import { Test, TestingModule } from "@nestjs/testing";
import { PolicyCaseAssociationController } from "./policy-case-association.controller";
import { PolicyCaseAssociationService } from "./policy-case-association.service";
import { PolicyCaseLinkType, PolicyType } from "@prisma/client";

describe("PolicyCaseAssociationController", () => {
  let controller: PolicyCaseAssociationController;
  let service: jest.Mocked<PolicyCaseAssociationService>;

  // Test fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockPolicyId = "policy-test-123";
  const mockCaseId = "case-test-123";
  const mockAssociationId = "assoc-test-123";

  const mockUser = {
    id: mockUserId,
    organizationId: mockOrgId,
    email: "test@example.com",
    roles: ["COMPLIANCE_OFFICER"],
  };

  const mockAssociation = {
    id: mockAssociationId,
    organizationId: mockOrgId,
    policyId: mockPolicyId,
    caseId: mockCaseId,
    linkType: PolicyCaseLinkType.VIOLATION,
    linkReason: "Violated section 3.2",
    violationDate: new Date("2026-01-15"),
    createdById: mockUserId,
    createdAt: new Date(),
  };

  const mockViolationStats = [
    {
      policyId: mockPolicyId,
      policyTitle: "Code of Conduct",
      policyType: PolicyType.CODE_OF_CONDUCT,
      violationCount: 5,
    },
  ];

  // Mocks
  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByPolicy: jest.fn(),
    findByCase: jest.fn(),
    getViolationStats: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PolicyCaseAssociationController],
      providers: [
        { provide: PolicyCaseAssociationService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<PolicyCaseAssociationController>(
      PolicyCaseAssociationController,
    );
    service = module.get(PolicyCaseAssociationService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create policy-case association", async () => {
      // Arrange
      const dto = {
        policyId: mockPolicyId,
        caseId: mockCaseId,
        linkType: PolicyCaseLinkType.VIOLATION,
        linkReason: "Violated section 3.2",
      };
      mockService.create.mockResolvedValue(mockAssociation);

      // Act
      const result = await controller.create(dto, mockUser as any, mockOrgId);

      // Assert
      expect(result).toEqual(mockAssociation);
      expect(service.create).toHaveBeenCalledWith(dto, mockUserId, mockOrgId);
    });
  });

  describe("findAll", () => {
    it("should return paginated associations", async () => {
      // Arrange
      const query = { page: 1, limit: 20 };
      mockService.findAll.mockResolvedValue({
        data: [mockAssociation],
        total: 1,
      });

      // Act
      const result = await controller.findAll(query, mockOrgId);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(service.findAll).toHaveBeenCalledWith(query, mockOrgId);
    });

    it("should pass filter parameters", async () => {
      // Arrange
      const query = {
        policyId: mockPolicyId,
        linkType: PolicyCaseLinkType.VIOLATION,
      };
      mockService.findAll.mockResolvedValue({ data: [], total: 0 });

      // Act
      await controller.findAll(query, mockOrgId);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(query, mockOrgId);
    });
  });

  describe("findOne", () => {
    it("should return association by ID", async () => {
      // Arrange
      mockService.findById.mockResolvedValue(mockAssociation);

      // Act
      const result = await controller.findOne(mockAssociationId, mockOrgId);

      // Assert
      expect(result).toEqual(mockAssociation);
      expect(service.findById).toHaveBeenCalledWith(
        mockAssociationId,
        mockOrgId,
      );
    });
  });

  describe("findByPolicy", () => {
    it("should return associations for a policy", async () => {
      // Arrange
      mockService.findByPolicy.mockResolvedValue([mockAssociation]);

      // Act
      const result = await controller.findByPolicy(mockPolicyId, mockOrgId);

      // Assert
      expect(result).toEqual([mockAssociation]);
      expect(service.findByPolicy).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });
  });

  describe("findByCase", () => {
    it("should return associations for a case", async () => {
      // Arrange
      mockService.findByCase.mockResolvedValue([mockAssociation]);

      // Act
      const result = await controller.findByCase(mockCaseId, mockOrgId);

      // Assert
      expect(result).toEqual([mockAssociation]);
      expect(service.findByCase).toHaveBeenCalledWith(mockCaseId, mockOrgId);
    });
  });

  describe("getViolationStats", () => {
    it("should return violation statistics", async () => {
      // Arrange
      const query = {};
      mockService.getViolationStats.mockResolvedValue(mockViolationStats);

      // Act
      const result = await controller.getViolationStats(query, mockOrgId);

      // Assert
      expect(result).toEqual(mockViolationStats);
    });

    it("should pass date filters", async () => {
      // Arrange
      const query = {
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        policyType: PolicyType.CODE_OF_CONDUCT,
      };
      mockService.getViolationStats.mockResolvedValue(mockViolationStats);

      // Act
      await controller.getViolationStats(query, mockOrgId);

      // Assert
      expect(service.getViolationStats).toHaveBeenCalledWith(
        mockOrgId,
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          policyType: PolicyType.CODE_OF_CONDUCT,
        }),
      );
    });
  });

  describe("update", () => {
    it("should update association", async () => {
      // Arrange
      const dto = { linkType: PolicyCaseLinkType.REFERENCE };
      const updatedAssociation = {
        ...mockAssociation,
        linkType: PolicyCaseLinkType.REFERENCE,
      };
      mockService.update.mockResolvedValue(updatedAssociation);

      // Act
      const result = await controller.update(
        mockAssociationId,
        dto,
        mockUser as any,
        mockOrgId,
      );

      // Assert
      expect(result.linkType).toBe(PolicyCaseLinkType.REFERENCE);
      expect(service.update).toHaveBeenCalledWith(
        mockAssociationId,
        dto,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("delete", () => {
    it("should delete association", async () => {
      // Arrange
      mockService.delete.mockResolvedValue(undefined);

      // Act
      await controller.delete(mockAssociationId, mockUser as any, mockOrgId);

      // Assert
      expect(service.delete).toHaveBeenCalledWith(
        mockAssociationId,
        mockUserId,
        mockOrgId,
      );
    });
  });
});
