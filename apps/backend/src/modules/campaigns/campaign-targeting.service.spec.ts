import { Test, TestingModule } from "@nestjs/testing";
import { CampaignTargetingService } from "./campaign-targeting.service";
import { PrismaService } from "../prisma/prisma.service";
import { SegmentQueryBuilder } from "./targeting/segment-query.builder";
import { AudienceQueryService } from "./services/audience-query.service";
import { AudienceDescriptionService } from "./services/audience-description.service";
import { TargetingAttributesService } from "./services/targeting-attributes.service";
import { SegmentConverterService } from "./services/segment-converter.service";
import { TargetingMode } from "./dto/campaign-targeting.dto";

describe("CampaignTargetingService", () => {
  let service: CampaignTargetingService;
  let prisma: jest.Mocked<PrismaService>;
  let audienceQueryService: jest.Mocked<AudienceQueryService>;
  let audienceDescriptionService: jest.Mocked<AudienceDescriptionService>;
  let targetingAttributesService: jest.Mocked<TargetingAttributesService>;
  let segmentConverterService: jest.Mocked<SegmentConverterService>;

  const mockOrgId = "org-test-123";

  const mockPrismaService = {
    employee: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    department: {
      count: jest.fn(),
    },
    businessUnit: {
      count: jest.fn(),
    },
    division: {
      count: jest.fn(),
    },
    location: {
      count: jest.fn(),
    },
  };

  const mockAudienceQueryService = {
    buildWhereClause: jest.fn(),
  };

  const mockAudienceDescriptionService = {
    buildCriteriaDescription: jest.fn(),
  };

  const mockTargetingAttributesService = {
    getAvailableAttributes: jest.fn(),
  };

  const mockSegmentConverterService = {
    convertToSegmentCriteria: jest.fn(),
  };

  const mockSegmentQueryBuilder = {
    buildWhereClause: jest.fn(),
    validateCriteria: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignTargetingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SegmentQueryBuilder, useValue: mockSegmentQueryBuilder },
        { provide: AudienceQueryService, useValue: mockAudienceQueryService },
        {
          provide: AudienceDescriptionService,
          useValue: mockAudienceDescriptionService,
        },
        {
          provide: TargetingAttributesService,
          useValue: mockTargetingAttributesService,
        },
        {
          provide: SegmentConverterService,
          useValue: mockSegmentConverterService,
        },
      ],
    }).compile();

    service = module.get<CampaignTargetingService>(CampaignTargetingService);
    prisma = module.get(PrismaService);
    audienceQueryService = module.get(AudienceQueryService);
    audienceDescriptionService = module.get(AudienceDescriptionService);
    targetingAttributesService = module.get(TargetingAttributesService);
    segmentConverterService = module.get(SegmentConverterService);

    jest.clearAllMocks();
  });

  describe("previewAudience", () => {
    it("should return audience preview with count and employees", async () => {
      const criteria = { mode: TargetingMode.ALL };
      mockAudienceQueryService.buildWhereClause.mockResolvedValue({
        organizationId: mockOrgId,
      });
      mockPrismaService.employee.count.mockResolvedValue(100);
      mockPrismaService.employee.findMany.mockResolvedValue([
        {
          id: "emp-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          jobTitle: "Engineer",
          department: "Engineering",
          location: "NYC",
        },
      ]);
      mockAudienceDescriptionService.buildCriteriaDescription.mockResolvedValue(
        "All active employees",
      );

      const result = await service.previewAudience(criteria, mockOrgId);

      expect(result.totalCount).toBe(100);
      expect(result.employees).toHaveLength(1);
      expect(result.criteriaDescription).toBe("All active employees");
      expect(result.totalPages).toBe(5); // 100 / 20
      expect(result.currentPage).toBe(1);
    });

    it("should support pagination", async () => {
      mockAudienceQueryService.buildWhereClause.mockResolvedValue({});
      mockPrismaService.employee.count.mockResolvedValue(50);
      mockPrismaService.employee.findMany.mockResolvedValue([]);
      mockAudienceDescriptionService.buildCriteriaDescription.mockResolvedValue(
        "",
      );

      await service.previewAudience({ mode: TargetingMode.ALL }, mockOrgId, {
        page: 3,
        pageSize: 10,
      });

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        }),
      );
    });
  });

  describe("getTargetEmployeeIds", () => {
    it("should return employee IDs matching criteria", async () => {
      mockAudienceQueryService.buildWhereClause.mockResolvedValue({});
      mockPrismaService.employee.findMany.mockResolvedValue([
        { id: "emp-1" },
        { id: "emp-2" },
        { id: "emp-3" },
      ]);

      const result = await service.getTargetEmployeeIds(
        { mode: TargetingMode.ALL },
        mockOrgId,
      );

      expect(result).toEqual(["emp-1", "emp-2", "emp-3"]);
    });
  });

  describe("validateCriteria", () => {
    it("should return valid result for ALL mode", async () => {
      mockAudienceQueryService.buildWhereClause.mockResolvedValue({});
      mockPrismaService.employee.count.mockResolvedValue(100);

      const result = await service.validateCriteria(
        { mode: TargetingMode.ALL },
        mockOrgId,
      );

      expect(result.isValid).toBe(true);
      expect(result.estimatedCount).toBe(100);
    });

    it("should return error when simple mode missing simple criteria", async () => {
      const result = await service.validateCriteria(
        { mode: TargetingMode.SIMPLE },
        mockOrgId,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Simple targeting mode requires simple criteria",
      );
    });

    it("should return error when advanced mode missing advanced criteria", async () => {
      const result = await service.validateCriteria(
        { mode: TargetingMode.ADVANCED },
        mockOrgId,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Advanced targeting mode requires advanced criteria",
      );
    });

    it("should warn when criteria matches 0 employees", async () => {
      mockAudienceQueryService.buildWhereClause.mockResolvedValue({});
      mockPrismaService.employee.count.mockResolvedValue(0);

      const result = await service.validateCriteria(
        { mode: TargetingMode.ALL },
        mockOrgId,
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Criteria matches 0 employees");
    });

    it("should validate department IDs exist", async () => {
      mockPrismaService.department.count.mockResolvedValue(1); // Only 1 found of 2
      mockAudienceQueryService.buildWhereClause.mockResolvedValue({});
      mockPrismaService.employee.count.mockResolvedValue(10);

      const result = await service.validateCriteria(
        {
          mode: TargetingMode.SIMPLE,
          simple: { departments: ["dept-1", "dept-2"] },
        },
        mockOrgId,
      );

      expect(result.errors).toContain("1 department(s) not found");
    });
  });

  describe("getAvailableAttributes", () => {
    it("should delegate to TargetingAttributesService", async () => {
      const mockAttributes = [
        { key: "department", label: "Department", type: "multiselect" },
      ];
      mockTargetingAttributesService.getAvailableAttributes.mockResolvedValue(
        mockAttributes,
      );

      const result = await service.getAvailableAttributes(mockOrgId);

      expect(result).toEqual(mockAttributes);
      expect(
        targetingAttributesService.getAvailableAttributes,
      ).toHaveBeenCalledWith(mockOrgId);
    });
  });

  describe("convertToSegmentCriteria", () => {
    it("should delegate to SegmentConverterService", () => {
      const criteria = { mode: TargetingMode.ALL };
      const expected = { logic: "AND", conditions: [] };
      mockSegmentConverterService.convertToSegmentCriteria.mockReturnValue(
        expected,
      );

      const result = service.convertToSegmentCriteria(criteria);

      expect(result).toEqual(expected);
      expect(
        segmentConverterService.convertToSegmentCriteria,
      ).toHaveBeenCalledWith(criteria);
    });
  });
});
