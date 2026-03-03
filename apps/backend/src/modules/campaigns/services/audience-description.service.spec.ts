import { Test, TestingModule } from "@nestjs/testing";
import { AudienceDescriptionService } from "./audience-description.service";
import { PrismaService } from "../../prisma/prisma.service";
import { TargetingMode } from "../dto/campaign-targeting.dto";

describe("AudienceDescriptionService", () => {
  let service: AudienceDescriptionService;
  let prisma: jest.Mocked<PrismaService>;

  const mockOrgId = "org-test-123";

  const mockPrismaService = {
    department: {
      findMany: jest.fn(),
    },
    businessUnit: {
      findMany: jest.fn(),
    },
    division: {
      findMany: jest.fn(),
    },
    location: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudienceDescriptionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AudienceDescriptionService>(
      AudienceDescriptionService,
    );
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe("buildCriteriaDescription", () => {
    it("should return 'All active employees' for ALL mode", async () => {
      const result = await service.buildCriteriaDescription(
        { mode: TargetingMode.ALL },
        mockOrgId,
      );
      expect(result).toBe("All active employees");
    });

    it("should return 'All active employees' when no parts generated", async () => {
      const result = await service.buildCriteriaDescription(
        { mode: TargetingMode.SIMPLE, simple: {} },
        mockOrgId,
      );
      expect(result).toBe("All active employees");
    });

    it("should build description from simple criteria", async () => {
      mockPrismaService.department.findMany.mockResolvedValue([
        { name: "Engineering" },
      ]);

      const result = await service.buildCriteriaDescription(
        {
          mode: TargetingMode.SIMPLE,
          simple: { departments: ["dept-1"] },
        },
        mockOrgId,
      );

      expect(result).toContain("Engineering");
    });
  });

  describe("describeSimpleCriteria", () => {
    it("should describe departments", async () => {
      mockPrismaService.department.findMany.mockResolvedValue([
        { name: "HR" },
        { name: "Finance" },
      ]);

      const result = await service.describeSimpleCriteria(
        { departments: ["d1", "d2"] },
        mockOrgId,
      );

      expect(result).toContain("HR, Finance departments");
    });

    it("should describe business units", async () => {
      mockPrismaService.businessUnit.findMany.mockResolvedValue([
        { name: "Healthcare" },
      ]);

      const result = await service.describeSimpleCriteria(
        { businessUnits: ["bu-1"] },
        mockOrgId,
      );

      expect(result).toContain("Healthcare business unit");
    });

    it("should describe locations", async () => {
      mockPrismaService.location.findMany.mockResolvedValue([
        { name: "NYC" },
        { name: "LA" },
        { name: "Chicago" },
      ]);

      const result = await service.describeSimpleCriteria(
        { locations: ["l1", "l2", "l3"] },
        mockOrgId,
      );

      expect(result).toContain("NYC, LA, Chicago locations");
    });

    it("should indicate when subordinates are included", async () => {
      const result = await service.describeSimpleCriteria(
        { includeSubordinates: true },
        mockOrgId,
      );

      expect(result).toContain("including all subordinates");
    });
  });

  describe("describeAdvancedCriteria", () => {
    it("should describe job titles", () => {
      const result = service.describeAdvancedCriteria({
        jobTitles: ["Manager", "Director"],
      });
      expect(result).toContain("job titles containing Manager, Director");
    });

    it("should describe hierarchy filter", () => {
      const result = service.describeAdvancedCriteria({
        managerHierarchyDepth: 2,
      });
      expect(result).toContain("managers with 2+ reports");
    });

    it("should describe tenure range", () => {
      const result = service.describeAdvancedCriteria({
        tenureMinDays: 30,
        tenureMaxDays: 90,
      });
      expect(result).toContain("between 30-90 days tenure");
    });

    it("should describe minimum tenure only", () => {
      const result = service.describeAdvancedCriteria({
        tenureMinDays: 90,
      });
      expect(result).toContain("90+ days tenure");
    });

    it("should describe maximum tenure only", () => {
      const result = service.describeAdvancedCriteria({
        tenureMaxDays: 30,
      });
      expect(result).toContain("less than 30 days tenure");
    });

    it("should describe compliance roles", () => {
      const result = service.describeAdvancedCriteria({
        complianceRoles: ["CCO", "INVESTIGATOR"],
      });
      expect(result).toContain("compliance roles: CCO, INVESTIGATOR");
    });

    it("should describe exclusions count", () => {
      const result = service.describeAdvancedCriteria({
        exclusions: ["emp-1", "emp-2", "emp-3"],
      });
      expect(result).toContain("excluding 3 employees");
    });
  });

  describe("describeDepartmentFilter", () => {
    it("should return null when no names found", async () => {
      mockPrismaService.department.findMany.mockResolvedValue([]);
      const result = await service.describeDepartmentFilter(["d1"], mockOrgId);
      expect(result).toBeNull();
    });

    it("should use singular for single department", async () => {
      mockPrismaService.department.findMany.mockResolvedValue([{ name: "HR" }]);
      const result = await service.describeDepartmentFilter(["d1"], mockOrgId);
      expect(result).toBe("HR department");
    });

    it("should use plural for multiple departments", async () => {
      mockPrismaService.department.findMany.mockResolvedValue([
        { name: "HR" },
        { name: "Legal" },
      ]);
      const result = await service.describeDepartmentFilter(
        ["d1", "d2"],
        mockOrgId,
      );
      expect(result).toBe("HR, Legal departments");
    });

    it("should use count for more than 3 departments", async () => {
      mockPrismaService.department.findMany.mockResolvedValue([
        { name: "HR" },
        { name: "Legal" },
        { name: "Finance" },
        { name: "IT" },
      ]);
      const result = await service.describeDepartmentFilter(
        ["d1", "d2", "d3", "d4"],
        mockOrgId,
      );
      expect(result).toBe("4 selected departments");
    });
  });

  describe("describeHierarchyFilter", () => {
    it("should return 'managers only' for depth 1", () => {
      expect(service.describeHierarchyFilter(1)).toBe("managers only");
    });

    it("should return depth description for depth > 1", () => {
      expect(service.describeHierarchyFilter(3)).toBe(
        "managers with 3+ reports",
      );
    });

    it("should return 'all employees' for depth 0", () => {
      expect(service.describeHierarchyFilter(0)).toBe("all employees");
    });
  });

  describe("describeTenureFilter", () => {
    it("should handle range", () => {
      expect(service.describeTenureFilter(30, 90)).toBe(
        "between 30-90 days tenure",
      );
    });

    it("should handle min only", () => {
      expect(service.describeTenureFilter(90, undefined)).toBe(
        "90+ days tenure",
      );
    });

    it("should handle max only", () => {
      expect(service.describeTenureFilter(undefined, 30)).toBe(
        "less than 30 days tenure",
      );
    });

    it("should return empty string when both undefined", () => {
      expect(service.describeTenureFilter(undefined, undefined)).toBe("");
    });
  });

  describe("getLanguageLabel", () => {
    it("should return language name for known codes", () => {
      expect(service.getLanguageLabel("en")).toBe("English");
      expect(service.getLanguageLabel("es")).toBe("Spanish");
      expect(service.getLanguageLabel("fr")).toBe("French");
    });

    it("should return uppercase code for unknown languages", () => {
      expect(service.getLanguageLabel("xx")).toBe("XX");
    });
  });
});
