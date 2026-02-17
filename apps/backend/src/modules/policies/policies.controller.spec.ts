import { Test, TestingModule } from "@nestjs/testing";
import { PoliciesController } from "./policies.controller";
import { PoliciesService } from "./policies.service";
import { ExcelExportService } from "../analytics/exports/excel-export.service";
import { PolicyStatus, PolicyType } from "@prisma/client";
import { Response } from "express";

describe("PoliciesController", () => {
  let controller: PoliciesController;
  let policiesService: jest.Mocked<PoliciesService>;
  let excelExportService: jest.Mocked<ExcelExportService>;

  // Test fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockPolicyId = "policy-test-123";
  const mockVersionId = "version-test-123";

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
    slug: "code-of-conduct",
    policyType: PolicyType.CODE_OF_CONDUCT,
    category: "Corporate Governance",
    status: PolicyStatus.DRAFT,
    currentVersion: 0,
    ownerId: mockUserId,
    draftContent: "<p>Policy content</p>",
    draftUpdatedAt: new Date(),
    draftUpdatedById: mockUserId,
    effectiveDate: null,
    reviewDate: null,
    retiredAt: null,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPolicyVersion = {
    id: mockVersionId,
    organizationId: mockOrgId,
    policyId: mockPolicyId,
    version: 1,
    versionLabel: "v1",
    content: "<p>Policy content</p>",
    plainText: "Policy content",
    summary: null,
    changeNotes: null,
    publishedAt: new Date(),
    publishedById: mockUserId,
    effectiveDate: new Date(),
    isLatest: true,
  };

  // Mocks
  const mockPoliciesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdOrFail: jest.fn(),
    updateDraft: jest.fn(),
    publish: jest.fn(),
    retire: jest.fn(),
    getVersions: jest.fn(),
    getVersion: jest.fn(),
  };

  const mockExcelExportService = {
    generateBuffer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PoliciesController],
      providers: [
        { provide: PoliciesService, useValue: mockPoliciesService },
        { provide: ExcelExportService, useValue: mockExcelExportService },
      ],
    }).compile();

    controller = module.get<PoliciesController>(PoliciesController);
    policiesService = module.get(PoliciesService);
    excelExportService = module.get(ExcelExportService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a policy and return it", async () => {
      // Arrange
      const createDto = {
        title: "Code of Conduct",
        policyType: PolicyType.CODE_OF_CONDUCT,
        category: "Corporate Governance",
        content: "<p>Policy content</p>",
      };
      mockPoliciesService.create.mockResolvedValue(mockPolicy);

      // Act
      const result = await controller.create(
        createDto,
        mockUser as any,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mockPolicy);
      expect(policiesService.create).toHaveBeenCalledWith(
        createDto,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated list of policies", async () => {
      // Arrange
      const query = { page: 1, limit: 20 };
      const paginatedResult = {
        data: [mockPolicy],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockPoliciesService.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await controller.findAll(query, mockOrgId);

      // Assert
      expect(result).toEqual(paginatedResult);
      expect(policiesService.findAll).toHaveBeenCalledWith(query, mockOrgId);
    });

    it("should pass filter parameters to service", async () => {
      // Arrange
      const query = {
        status: PolicyStatus.PUBLISHED,
        policyType: PolicyType.CODE_OF_CONDUCT,
      };
      mockPoliciesService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      // Act
      await controller.findAll(query, mockOrgId);

      // Assert
      expect(policiesService.findAll).toHaveBeenCalledWith(query, mockOrgId);
    });
  });

  describe("findOne", () => {
    it("should return a single policy by ID", async () => {
      // Arrange
      mockPoliciesService.findByIdOrFail.mockResolvedValue(mockPolicy);

      // Act
      const result = await controller.findOne(mockPolicyId, mockOrgId);

      // Assert
      expect(result).toEqual(mockPolicy);
      expect(policiesService.findByIdOrFail).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });
  });

  describe("update", () => {
    it("should update policy draft and return updated policy", async () => {
      // Arrange
      const updateDto = { title: "Updated Title" };
      const updatedPolicy = { ...mockPolicy, title: "Updated Title" };
      mockPoliciesService.updateDraft.mockResolvedValue(updatedPolicy);

      // Act
      const result = await controller.update(
        mockPolicyId,
        updateDto,
        mockUser as any,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(updatedPolicy);
      expect(policiesService.updateDraft).toHaveBeenCalledWith(
        mockPolicyId,
        updateDto,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("publish", () => {
    it("should publish policy and return new version", async () => {
      // Arrange
      const publishDto = { versionLabel: "v1", summary: "Initial release" };
      mockPoliciesService.publish.mockResolvedValue(mockPolicyVersion);

      // Act
      const result = await controller.publish(
        mockPolicyId,
        publishDto,
        mockUser as any,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mockPolicyVersion);
      expect(policiesService.publish).toHaveBeenCalledWith(
        mockPolicyId,
        publishDto,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("retire", () => {
    it("should retire policy and return updated policy", async () => {
      // Arrange
      const retiredPolicy = { ...mockPolicy, status: PolicyStatus.RETIRED };
      mockPoliciesService.retire.mockResolvedValue(retiredPolicy);

      // Act
      const result = await controller.retire(
        mockPolicyId,
        mockUser as any,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(retiredPolicy);
      expect(policiesService.retire).toHaveBeenCalledWith(
        mockPolicyId,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("getVersions", () => {
    it("should return all versions for a policy", async () => {
      // Arrange
      const versions = [mockPolicyVersion];
      mockPoliciesService.getVersions.mockResolvedValue(versions);

      // Act
      const result = await controller.getVersions(mockPolicyId, mockOrgId);

      // Assert
      expect(result).toEqual(versions);
      expect(policiesService.getVersions).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });
  });

  describe("getVersion", () => {
    it("should return a specific version by ID", async () => {
      // Arrange
      mockPoliciesService.getVersion.mockResolvedValue(mockPolicyVersion);

      // Act
      const result = await controller.getVersion(mockVersionId, mockOrgId);

      // Assert
      expect(result).toEqual(mockPolicyVersion);
      expect(policiesService.getVersion).toHaveBeenCalledWith(
        mockVersionId,
        mockOrgId,
      );
    });
  });

  describe("exportPolicies", () => {
    it("should export policies to Excel", async () => {
      // Arrange
      const query = { page: 1, limit: 100 };
      const body = { format: "excel" as const };
      const paginatedResult = {
        data: [mockPolicy],
        total: 1,
        page: 1,
        limit: 100,
      };
      const excelBuffer = Buffer.from("mock-excel-data");

      mockPoliciesService.findAll.mockResolvedValue(paginatedResult);
      mockExcelExportService.generateBuffer.mockResolvedValue(excelBuffer);

      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      // Act
      await controller.exportPolicies(body, query, mockOrgId, mockResponse);

      // Assert
      expect(policiesService.findAll).toHaveBeenCalledWith(query, mockOrgId);
      expect(excelExportService.generateBuffer).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(mockResponse.send).toHaveBeenCalledWith(excelBuffer);
    });
  });
});
