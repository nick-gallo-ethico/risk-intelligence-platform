import { Test, TestingModule } from "@nestjs/testing";
import { TargetingAttributesService } from "./targeting-attributes.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AudienceDescriptionService } from "./audience-description.service";

describe("TargetingAttributesService", () => {
  let service: TargetingAttributesService;
  let prisma: jest.Mocked<PrismaService>;

  const mockOrgId = "org-test-123";

  const mockPrismaService = {
    division: {
      findMany: jest.fn(),
    },
    businessUnit: {
      findMany: jest.fn(),
    },
    department: {
      findMany: jest.fn(),
    },
    location: {
      findMany: jest.fn(),
    },
    employee: {
      groupBy: jest.fn(),
    },
  };

  const mockAudienceDescriptionService = {
    getLanguageLabel: jest.fn((code: string) => {
      const map: Record<string, string> = { en: "English", es: "Spanish" };
      return map[code] || code.toUpperCase();
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TargetingAttributesService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: AudienceDescriptionService,
          useValue: mockAudienceDescriptionService,
        },
      ],
    }).compile();

    service = module.get<TargetingAttributesService>(
      TargetingAttributesService,
    );
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe("getAvailableAttributes", () => {
    beforeEach(() => {
      mockPrismaService.division.findMany.mockResolvedValue([
        { id: "div-1", name: "North America" },
      ]);
      mockPrismaService.businessUnit.findMany.mockResolvedValue([
        { id: "bu-1", name: "Healthcare" },
      ]);
      mockPrismaService.department.findMany.mockResolvedValue([
        { id: "dept-1", name: "Engineering" },
        { id: "dept-2", name: "Finance" },
      ]);
      mockPrismaService.location.findMany.mockResolvedValue([
        { id: "loc-1", name: "NYC" },
      ]);
      mockPrismaService.employee.groupBy
        .mockResolvedValueOnce([
          { jobTitle: "Engineer" },
          { jobTitle: "Manager" },
        ]) // jobTitles
        .mockResolvedValueOnce([
          { primaryLanguage: "en" },
          { primaryLanguage: "es" },
        ]); // languages
    });

    it("should return organization structure attributes", async () => {
      const result = await service.getAvailableAttributes(mockOrgId);

      const divisionAttr = result.find((a) => a.key === "divisionId");
      expect(divisionAttr).toBeDefined();
      expect(divisionAttr?.category).toBe("Organization Structure");
      expect(divisionAttr?.options).toHaveLength(1);

      const deptAttr = result.find((a) => a.key === "departmentId");
      expect(deptAttr?.options).toHaveLength(2);
    });

    it("should return position attributes", async () => {
      const result = await service.getAvailableAttributes(mockOrgId);

      const jobTitleAttr = result.find((a) => a.key === "jobTitle");
      expect(jobTitleAttr).toBeDefined();
      expect(jobTitleAttr?.category).toBe("Position");
      expect(jobTitleAttr?.type).toBe("multiselect");

      const jobLevelAttr = result.find((a) => a.key === "jobLevel");
      expect(jobLevelAttr?.options).toContainEqual(
        expect.objectContaining({ value: "MANAGER" }),
      );
    });

    it("should return employment attributes", async () => {
      const result = await service.getAvailableAttributes(mockOrgId);

      const workModeAttr = result.find((a) => a.key === "workMode");
      expect(workModeAttr).toBeDefined();
      expect(workModeAttr?.category).toBe("Employment");
      expect(workModeAttr?.options).toContainEqual(
        expect.objectContaining({ value: "REMOTE", label: "Remote" }),
      );

      const tenureAttr = result.find((a) => a.key === "tenure");
      expect(tenureAttr?.type).toBe("number");
    });

    it("should return compliance role attribute", async () => {
      const result = await service.getAvailableAttributes(mockOrgId);

      const complianceAttr = result.find((a) => a.key === "complianceRole");
      expect(complianceAttr).toBeDefined();
      expect(complianceAttr?.category).toBe("Compliance");
      expect(complianceAttr?.options).toContainEqual(
        expect.objectContaining({ value: "CCO" }),
      );
    });

    it("should return language attribute with translated labels", async () => {
      const result = await service.getAvailableAttributes(mockOrgId);

      const langAttr = result.find((a) => a.key === "primaryLanguage");
      expect(langAttr).toBeDefined();
      expect(langAttr?.category).toBe("Employee Preferences");
      expect(langAttr?.options).toContainEqual(
        expect.objectContaining({ value: "en", label: "English" }),
      );
    });

    it("should return include subordinates toggle", async () => {
      const result = await service.getAvailableAttributes(mockOrgId);

      const subordinatesAttr = result.find(
        (a) => a.key === "includeSubordinates",
      );
      expect(subordinatesAttr).toBeDefined();
      expect(subordinatesAttr?.type).toBe("boolean");
      expect(subordinatesAttr?.category).toBe("Hierarchy");
    });

    it("should filter out null job titles", async () => {
      mockPrismaService.employee.groupBy
        .mockReset()
        .mockResolvedValueOnce([{ jobTitle: null }, { jobTitle: "Manager" }])
        .mockResolvedValueOnce([]);

      const result = await service.getAvailableAttributes(mockOrgId);

      const jobTitleAttr = result.find((a) => a.key === "jobTitle");
      expect(jobTitleAttr?.options).toHaveLength(1);
      expect(jobTitleAttr?.options?.[0]?.value).toBe("Manager");
    });
  });
});
