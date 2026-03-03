import { Test, TestingModule } from "@nestjs/testing";
import { AudienceQueryService } from "./audience-query.service";
import { PrismaService } from "../../prisma/prisma.service";
import { TargetingMode } from "../dto/campaign-targeting.dto";

describe("AudienceQueryService", () => {
  let service: AudienceQueryService;
  let prisma: jest.Mocked<PrismaService>;

  const mockOrgId = "org-test-123";

  const mockPrismaService = {
    employee: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudienceQueryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AudienceQueryService>(AudienceQueryService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe("buildWhereClause", () => {
    it("should return base where for ALL mode", async () => {
      const result = await service.buildWhereClause(
        { mode: TargetingMode.ALL },
        mockOrgId,
      );

      expect(result).toEqual({
        organizationId: mockOrgId,
        employmentStatus: "ACTIVE",
      });
    });

    it("should add simple conditions", async () => {
      const result = await service.buildWhereClause(
        {
          mode: TargetingMode.SIMPLE,
          simple: { departments: ["dept-1", "dept-2"] },
        },
        mockOrgId,
      );

      expect(result).toHaveProperty("AND");
      const conditions = (result as { AND: object[] }).AND;
      expect(conditions).toContainEqual({
        departmentId: { in: ["dept-1", "dept-2"] },
      });
    });

    it("should add advanced conditions", async () => {
      const result = await service.buildWhereClause(
        {
          mode: TargetingMode.ADVANCED,
          advanced: { tenureMinDays: 90 },
        },
        mockOrgId,
      );

      expect(result).toHaveProperty("AND");
    });
  });

  describe("buildSimpleConditions", () => {
    it("should build department filter", async () => {
      const result = await service.buildSimpleConditions(
        { departments: ["dept-1"] },
        mockOrgId,
      );

      expect(result).toContainEqual({ departmentId: { in: ["dept-1"] } });
    });

    it("should build business unit filter", async () => {
      const result = await service.buildSimpleConditions(
        { businessUnits: ["bu-1"] },
        mockOrgId,
      );

      expect(result).toContainEqual({ businessUnitId: { in: ["bu-1"] } });
    });

    it("should build division filter", async () => {
      const result = await service.buildSimpleConditions(
        { divisions: ["div-1"] },
        mockOrgId,
      );

      expect(result).toContainEqual({ divisionId: { in: ["div-1"] } });
    });

    it("should build location filter", async () => {
      const result = await service.buildSimpleConditions(
        { locations: ["loc-1"] },
        mockOrgId,
      );

      expect(result).toContainEqual({ locationId: { in: ["loc-1"] } });
    });

    it("should expand with subordinates when flag is set", async () => {
      mockPrismaService.employee.findMany
        .mockResolvedValueOnce([{ id: "mgr-1" }]) // Matched managers from expandWithSubordinates
        .mockResolvedValueOnce([{ id: "sub-1" }]) // First level subordinates from getAllSubordinates
        .mockResolvedValueOnce([]); // No more subordinates (end of recursion)

      const result = await service.buildSimpleConditions(
        { departments: ["dept-1"], includeSubordinates: true },
        mockOrgId,
      );

      expect(result).toContainEqual({
        id: { in: expect.arrayContaining(["mgr-1", "sub-1"]) },
      });
    });
  });

  describe("buildDepartmentFilter", () => {
    it("should create department IN clause", () => {
      const result = service.buildDepartmentFilter(["dept-1", "dept-2"]);
      expect(result).toEqual({ departmentId: { in: ["dept-1", "dept-2"] } });
    });
  });

  describe("buildAdvancedConditions", () => {
    it("should build job title filter with OR conditions", async () => {
      const result = await service.buildAdvancedConditions(
        { jobTitles: ["Manager", "Director"] },
        mockOrgId,
      );

      expect(result).toContainEqual({
        OR: [
          { jobTitle: { contains: "Manager", mode: "insensitive" } },
          { jobTitle: { contains: "Director", mode: "insensitive" } },
        ],
      });
    });

    it("should build tenure min filter", async () => {
      const result = await service.buildAdvancedConditions(
        { tenureMinDays: 90 },
        mockOrgId,
      );

      expect(result).toContainEqual({
        hireDate: { lte: expect.any(Date) },
      });
    });

    it("should build tenure max filter", async () => {
      const result = await service.buildAdvancedConditions(
        { tenureMaxDays: 30 },
        mockOrgId,
      );

      expect(result).toContainEqual({
        hireDate: { gte: expect.any(Date) },
      });
    });

    it("should build compliance role filter", async () => {
      const result = await service.buildAdvancedConditions(
        { complianceRoles: ["CCO", "INVESTIGATOR"] },
        mockOrgId,
      );

      expect(result).toContainEqual({
        complianceRole: { in: ["CCO", "INVESTIGATOR"] },
      });
    });

    it("should build job level filter", async () => {
      const result = await service.buildAdvancedConditions(
        { jobLevels: ["MANAGER", "DIRECTOR"] },
        mockOrgId,
      );

      expect(result).toContainEqual({
        jobLevel: { in: ["MANAGER", "DIRECTOR"] },
      });
    });

    it("should build exclusion filter", async () => {
      const result = await service.buildAdvancedConditions(
        { exclusions: ["emp-1", "emp-2"] },
        mockOrgId,
      );

      expect(result).toContainEqual({
        id: { notIn: ["emp-1", "emp-2"] },
      });
    });
  });

  describe("getAllSubordinates", () => {
    it("should recursively find subordinates", async () => {
      mockPrismaService.employee.findMany
        .mockResolvedValueOnce([{ id: "sub-1" }, { id: "sub-2" }]) // Level 1
        .mockResolvedValueOnce([{ id: "sub-3" }]) // Level 2
        .mockResolvedValueOnce([]); // No more

      const result = await service.getAllSubordinates(["mgr-1"], mockOrgId);

      expect(result).toContain("sub-1");
      expect(result).toContain("sub-2");
      expect(result).toContain("sub-3");
    });

    it("should not include duplicates", async () => {
      mockPrismaService.employee.findMany
        .mockResolvedValueOnce([{ id: "sub-1" }])
        .mockResolvedValueOnce([{ id: "sub-1" }]) // Duplicate
        .mockResolvedValueOnce([]);

      const result = await service.getAllSubordinates(["mgr-1"], mockOrgId);

      const uniqueIds = new Set(result);
      expect(result.length).toBe(uniqueIds.size);
    });
  });

  describe("buildCustomAttributeFilter", () => {
    it("should handle equals operator", () => {
      const result = service.buildCustomAttributeFilter(
        "department",
        "equals",
        "dept-1",
      );
      expect(result).toEqual({ departmentId: "dept-1" });
    });

    it("should handle not_equals operator", () => {
      const result = service.buildCustomAttributeFilter(
        "department",
        "not_equals",
        "dept-1",
      );
      expect(result).toEqual({ departmentId: { not: "dept-1" } });
    });

    it("should handle in operator", () => {
      const result = service.buildCustomAttributeFilter("department", "in", [
        "d1",
        "d2",
      ]);
      expect(result).toEqual({ departmentId: { in: ["d1", "d2"] } });
    });

    it("should handle contains operator", () => {
      const result = service.buildCustomAttributeFilter(
        "jobTitle",
        "contains",
        "Manager",
      );
      expect(result).toEqual({
        jobTitle: { contains: "Manager", mode: "insensitive" },
      });
    });

    it("should handle greater_than operator", () => {
      const result = service.buildCustomAttributeFilter(
        "hireDate",
        "greater_than",
        "2026-01-01",
      );
      expect(result).toEqual({ hireDate: { gt: "2026-01-01" } });
    });

    it("should return null for unknown attribute", () => {
      const result = service.buildCustomAttributeFilter(
        "unknown",
        "equals",
        "value",
      );
      expect(result).toBeNull();
    });

    it("should return null for unknown operator", () => {
      const result = service.buildCustomAttributeFilter(
        "department",
        "unknown",
        "value",
      );
      expect(result).toBeNull();
    });
  });

  describe("resolveAttributePath", () => {
    it("should resolve standard fields", () => {
      expect(service.resolveAttributePath("department")).toBe("departmentId");
      expect(service.resolveAttributePath("businessUnit")).toBe(
        "businessUnitId",
      );
      expect(service.resolveAttributePath("jobTitle")).toBe("jobTitle");
    });

    it("should return null for unknown fields", () => {
      expect(service.resolveAttributePath("unknown")).toBeNull();
    });
  });
});
