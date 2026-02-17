import { Test, TestingModule } from "@nestjs/testing";
import { PolicyCaseAssociationService } from "./policy-case-association.service";
import { AssociationCrudService, ViolationAnalyticsService } from "./services";
import { PolicyCaseLinkType, PolicyType } from "@prisma/client";

describe("PolicyCaseAssociationService", () => {
  let service: PolicyCaseAssociationService;
  let crudService: jest.Mocked<AssociationCrudService>;
  let analyticsService: jest.Mocked<ViolationAnalyticsService>;

  // Test fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockPolicyId = "policy-test-123";
  const mockCaseId = "case-test-123";
  const mockAssociationId = "assoc-test-123";

  const mockAssociation = {
    id: mockAssociationId,
    organizationId: mockOrgId,
    policyId: mockPolicyId,
    caseId: mockCaseId,
    linkType: PolicyCaseLinkType.VIOLATION,
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
  const mockCrudService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByPolicy: jest.fn(),
    findByCase: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
  };

  const mockAnalyticsService = {
    getViolationStats: jest.fn(),
    getViolationsByCategory: jest.fn(),
    getViolationTrends: jest.fn(),
    getViolationSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyCaseAssociationService,
        { provide: AssociationCrudService, useValue: mockCrudService },
        { provide: ViolationAnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    service = module.get<PolicyCaseAssociationService>(
      PolicyCaseAssociationService,
    );
    crudService = module.get(AssociationCrudService);
    analyticsService = module.get(ViolationAnalyticsService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should delegate to crud service", async () => {
      // Arrange
      const dto = {
        policyId: mockPolicyId,
        caseId: mockCaseId,
        linkType: PolicyCaseLinkType.VIOLATION,
      };
      mockCrudService.create.mockResolvedValue(mockAssociation);

      // Act
      const result = await service.create(dto, mockUserId, mockOrgId);

      // Assert
      expect(result).toEqual(mockAssociation);
      expect(crudService.create).toHaveBeenCalledWith(
        dto,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("update", () => {
    it("should delegate to crud service", async () => {
      // Arrange
      const dto = { linkType: PolicyCaseLinkType.REFERENCE };
      const updatedAssociation = {
        ...mockAssociation,
        linkType: PolicyCaseLinkType.REFERENCE,
      };
      mockCrudService.update.mockResolvedValue(updatedAssociation);

      // Act
      const result = await service.update(
        mockAssociationId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(updatedAssociation);
      expect(crudService.update).toHaveBeenCalledWith(
        mockAssociationId,
        dto,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("delete", () => {
    it("should delegate to crud service", async () => {
      // Arrange
      mockCrudService.delete.mockResolvedValue(undefined);

      // Act
      await service.delete(mockAssociationId, mockUserId, mockOrgId);

      // Assert
      expect(crudService.delete).toHaveBeenCalledWith(
        mockAssociationId,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("findByPolicy", () => {
    it("should delegate to crud service", async () => {
      // Arrange
      mockCrudService.findByPolicy.mockResolvedValue([mockAssociation]);

      // Act
      const result = await service.findByPolicy(mockPolicyId, mockOrgId);

      // Assert
      expect(result).toEqual([mockAssociation]);
      expect(crudService.findByPolicy).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });
  });

  describe("findByCase", () => {
    it("should delegate to crud service", async () => {
      // Arrange
      mockCrudService.findByCase.mockResolvedValue([mockAssociation]);

      // Act
      const result = await service.findByCase(mockCaseId, mockOrgId);

      // Assert
      expect(result).toEqual([mockAssociation]);
      expect(crudService.findByCase).toHaveBeenCalledWith(
        mockCaseId,
        mockOrgId,
      );
    });
  });

  describe("findById", () => {
    it("should delegate to crud service", async () => {
      // Arrange
      mockCrudService.findById.mockResolvedValue(mockAssociation);

      // Act
      const result = await service.findById(mockAssociationId, mockOrgId);

      // Assert
      expect(result).toEqual(mockAssociation);
      expect(crudService.findById).toHaveBeenCalledWith(
        mockAssociationId,
        mockOrgId,
      );
    });
  });

  describe("findAll", () => {
    it("should delegate to crud service", async () => {
      // Arrange
      const query = { page: 1, limit: 20 };
      mockCrudService.findAll.mockResolvedValue({
        data: [mockAssociation],
        total: 1,
      });

      // Act
      const result = await service.findAll(query, mockOrgId);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(crudService.findAll).toHaveBeenCalledWith(query, mockOrgId);
    });
  });

  describe("getViolationStats", () => {
    it("should delegate to analytics service", async () => {
      // Arrange
      mockAnalyticsService.getViolationStats.mockResolvedValue(
        mockViolationStats,
      );

      // Act
      const result = await service.getViolationStats(mockOrgId);

      // Assert
      expect(result).toEqual(mockViolationStats);
      expect(analyticsService.getViolationStats).toHaveBeenCalledWith(
        mockOrgId,
        undefined,
      );
    });

    it("should pass filters to analytics service", async () => {
      // Arrange
      const filters = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        policyType: PolicyType.CODE_OF_CONDUCT,
      };
      mockAnalyticsService.getViolationStats.mockResolvedValue(
        mockViolationStats,
      );

      // Act
      await service.getViolationStats(mockOrgId, filters);

      // Assert
      expect(analyticsService.getViolationStats).toHaveBeenCalledWith(
        mockOrgId,
        filters,
      );
    });
  });

  describe("getViolationsByCategory", () => {
    it("should delegate to analytics service", async () => {
      // Arrange
      const categoryBreakdown = [
        {
          policyType: PolicyType.CODE_OF_CONDUCT,
          violationCount: 10,
          policies: [],
        },
      ];
      mockAnalyticsService.getViolationsByCategory.mockResolvedValue(
        categoryBreakdown,
      );

      // Act
      const result = await service.getViolationsByCategory(mockOrgId);

      // Assert
      expect(result).toEqual(categoryBreakdown);
      expect(analyticsService.getViolationsByCategory).toHaveBeenCalledWith(
        mockOrgId,
        undefined,
      );
    });
  });

  describe("getViolationTrends", () => {
    it("should delegate to analytics service", async () => {
      // Arrange
      const options = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        periodType: "monthly" as const,
      };
      const trends = [
        { period: "2026-01", violationCount: 5, policyBreakdown: [] },
      ];
      mockAnalyticsService.getViolationTrends.mockResolvedValue(trends);

      // Act
      const result = await service.getViolationTrends(mockOrgId, options);

      // Assert
      expect(result).toEqual(trends);
      expect(analyticsService.getViolationTrends).toHaveBeenCalledWith(
        mockOrgId,
        options,
      );
    });
  });

  describe("getViolationSummary", () => {
    it("should delegate to analytics service", async () => {
      // Arrange
      const summary = {
        totalViolations: 15,
        openCaseViolations: 10,
        closedCaseViolations: 5,
        topViolatedPolicy: null,
        violationsByPolicyType: {} as Record<PolicyType, number>,
      };
      mockAnalyticsService.getViolationSummary.mockResolvedValue(summary);

      // Act
      const result = await service.getViolationSummary(mockOrgId);

      // Assert
      expect(result).toEqual(summary);
      expect(analyticsService.getViolationSummary).toHaveBeenCalledWith(
        mockOrgId,
        undefined,
      );
    });
  });

  describe("linkPolicyToCase", () => {
    it("should create association with convenience method", async () => {
      // Arrange
      mockCrudService.create.mockResolvedValue(mockAssociation);

      // Act
      const result = await service.linkPolicyToCase(
        mockPolicyId,
        mockCaseId,
        "VIOLATION",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mockAssociation);
      expect(crudService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          policyId: mockPolicyId,
          caseId: mockCaseId,
          linkType: "VIOLATION",
        }),
        mockUserId,
        mockOrgId,
      );
    });

    it("should pass options to create dto", async () => {
      // Arrange
      mockCrudService.create.mockResolvedValue(mockAssociation);
      const options = {
        linkReason: "Violated section 3.2",
        violationDate: "2026-01-15",
        policyVersionId: "version-123",
      };

      // Act
      await service.linkPolicyToCase(
        mockPolicyId,
        mockCaseId,
        "VIOLATION",
        mockUserId,
        mockOrgId,
        options,
      );

      // Assert
      expect(crudService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          linkReason: options.linkReason,
          violationDate: options.violationDate,
          policyVersionId: options.policyVersionId,
        }),
        mockUserId,
        mockOrgId,
      );
    });
  });
});
