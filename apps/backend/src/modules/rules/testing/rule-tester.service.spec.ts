import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { RuleTesterService } from "./rule-tester.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RulesEngineService } from "../engine/rules-engine.service";

describe("RuleTesterService", () => {
  let service: RuleTesterService;

  const mockRule = {
    id: "rule-1",
    organizationId: "org-1",
    name: "Route HIGH to CCO",
    priority: 1,
    conditions: {
      all: [{ fact: "severity", operator: "equal", value: "HIGH" }],
    },
    actions: [{ type: "assign_user", params: { userId: "user-cco" } }],
    lastTestedAt: null,
    testResults: null,
  };

  const mockCases = [
    {
      id: "case-1",
      referenceNumber: "CASE-001",
      severity: "HIGH",
      sourceChannel: "HOTLINE",
      primaryCategoryId: "cat-1",
      locationName: "New York Office",
      locationCity: "New York",
      locationState: "NY",
      locationCountry: "USA",
      createdAt: new Date("2026-01-01"),
      primaryCategory: { id: "cat-1", name: "Fraud", parentCategoryId: null },
    },
    {
      id: "case-2",
      referenceNumber: "CASE-002",
      severity: "LOW",
      sourceChannel: "WEB_FORM",
      primaryCategoryId: "cat-2",
      locationName: "LA Branch",
      locationCity: "Los Angeles",
      locationState: "CA",
      locationCountry: "USA",
      createdAt: new Date("2026-01-02"),
      primaryCategory: { id: "cat-2", name: "Inquiry", parentCategoryId: null },
    },
  ];

  const mockPrisma = {
    ruleDefinition: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    case: {
      findMany: jest.fn(),
    },
  };

  const mockRulesEngine = {
    evaluateRule: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleTesterService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RulesEngineService, useValue: mockRulesEngine },
      ],
    }).compile();

    service = module.get<RuleTesterService>(RuleTesterService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("testRule", () => {
    it("should throw NotFoundException if rule not found", async () => {
      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(null);

      await expect(service.testRule("rule-1", "org-1")).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.ruleDefinition.findFirst).toHaveBeenCalledWith({
        where: { id: "rule-1", organizationId: "org-1" },
      });
    });

    it("should return empty results if no historical cases", async () => {
      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue([]);

      const result = await service.testRule("rule-1", "org-1");

      expect(result.totalCases).toBe(0);
      expect(result.matchedCases).toBe(0);
      expect(result.matchRate).toBe(0);
      expect(result.samples).toHaveLength(0);
      expect(result.testedAt).toBeInstanceOf(Date);
    });

    it("should calculate match rate correctly", async () => {
      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue(mockCases);

      // First case (HIGH severity) matches, second (LOW) doesn't
      mockRulesEngine.evaluateRule
        .mockResolvedValueOnce(true) // case-1 matches
        .mockResolvedValueOnce(false); // case-2 doesn't match

      const result = await service.testRule("rule-1", "org-1");

      expect(result.totalCases).toBe(2);
      expect(result.matchedCases).toBe(1);
      expect(result.matchRate).toBe(50);
    });

    it("should include sample cases in results", async () => {
      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue(mockCases);

      mockRulesEngine.evaluateRule
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await service.testRule("rule-1", "org-1");

      expect(result.samples.length).toBeGreaterThan(0);
      expect(result.samples.some((s) => s.wouldMatch)).toBe(true);
      expect(result.samples.some((s) => !s.wouldMatch)).toBe(true);

      // Verify sample structure
      const matchedSample = result.samples.find((s) => s.wouldMatch);
      expect(matchedSample).toBeDefined();
      expect(matchedSample?.caseId).toBe("case-1");
      expect(matchedSample?.referenceNumber).toBe("CASE-001");
      expect(matchedSample?.caseDetails).toBeDefined();
      expect(matchedSample?.caseDetails.severity).toBe("HIGH");
    });

    it("should predict assignee based on actions", async () => {
      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue([mockCases[0]]);

      mockRulesEngine.evaluateRule.mockResolvedValue(true);

      const result = await service.testRule("rule-1", "org-1");

      const matchedSample = result.samples.find((s) => s.wouldMatch);
      expect(matchedSample?.predictedAssignee).toContain("User:");
      expect(matchedSample?.predictedAssignee).toContain("user-cco");
    });

    it("should return null predictedAssignee for non-matching cases", async () => {
      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue([mockCases[1]]);

      mockRulesEngine.evaluateRule.mockResolvedValue(false);

      const result = await service.testRule("rule-1", "org-1");

      const unmatchedSample = result.samples.find((s) => !s.wouldMatch);
      expect(unmatchedSample?.predictedAssignee).toBeNull();
    });

    it("should apply filter options correctly", async () => {
      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue([]);

      const dateFrom = new Date("2026-01-01");
      await service.testRule("rule-1", "org-1", {
        limit: 50,
        dateFrom,
        categoryIds: ["cat-1", "cat-2"],
        severities: ["HIGH"],
      });

      expect(mockPrisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            createdAt: { gte: dateFrom },
            primaryCategoryId: { in: ["cat-1", "cat-2"] },
            severity: { in: ["HIGH"] },
          }),
          take: 50,
        }),
      );
    });
  });

  describe("testRuleDefinition", () => {
    it("should test a rule definition without persisting", async () => {
      mockPrisma.case.findMany.mockResolvedValue(mockCases);
      mockRulesEngine.evaluateRule.mockResolvedValue(true);

      const ruleDefinition = {
        conditions: {
          all: [{ fact: "severity", operator: "equal", value: "HIGH" }],
        },
        actions: [
          { type: "assign_team" as const, params: { teamId: "team-1" } },
        ],
        priority: 1,
      };

      const result = await service.testRuleDefinition(
        ruleDefinition,
        "org-1",
        {},
      );

      expect(result.totalCases).toBe(2);
      expect(result.matchedCases).toBe(2);
      expect(result.matchRate).toBe(100);

      // Should not have called ruleDefinition.findFirst
      expect(mockPrisma.ruleDefinition.findFirst).not.toHaveBeenCalled();
    });

    it("should predict team assignment", async () => {
      mockPrisma.case.findMany.mockResolvedValue([mockCases[0]]);
      mockRulesEngine.evaluateRule.mockResolvedValue(true);

      const ruleDefinition = {
        conditions: {
          all: [{ fact: "severity", operator: "equal", value: "HIGH" }],
        },
        actions: [
          { type: "assign_team" as const, params: { teamId: "team-1" } },
        ],
      };

      const result = await service.testRuleDefinition(
        ruleDefinition,
        "org-1",
        {},
      );

      expect(result.samples[0].predictedAssignee).toContain("Team:");
    });

    it("should predict round-robin assignment", async () => {
      mockPrisma.case.findMany.mockResolvedValue([mockCases[0]]);
      mockRulesEngine.evaluateRule.mockResolvedValue(true);

      const ruleDefinition = {
        conditions: {
          all: [{ fact: "severity", operator: "equal", value: "HIGH" }],
        },
        actions: [
          { type: "round_robin" as const, params: { teamId: "team-1" } },
        ],
      };

      const result = await service.testRuleDefinition(
        ruleDefinition,
        "org-1",
        {},
      );

      expect(result.samples[0].predictedAssignee).toContain("Round-robin:");
    });
  });

  describe("testAndSaveResults", () => {
    it("should save test results to rule definition", async () => {
      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue(mockCases);
      mockPrisma.ruleDefinition.update.mockResolvedValue({});

      mockRulesEngine.evaluateRule.mockResolvedValue(true);

      const result = await service.testAndSaveResults("rule-1", "org-1");

      expect(mockPrisma.ruleDefinition.update).toHaveBeenCalledWith({
        where: { id: "rule-1" },
        data: expect.objectContaining({
          lastTestedAt: expect.any(Date),
          testResults: expect.objectContaining({
            totalCases: expect.any(Number),
            matchedCases: expect.any(Number),
            matchRate: expect.any(Number),
            samples: expect.any(Array),
          }),
        }),
      });

      expect(result.testedAt).toBeInstanceOf(Date);
    });

    it("should pass options through to testRule", async () => {
      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue([]);
      mockPrisma.ruleDefinition.update.mockResolvedValue({});

      await service.testAndSaveResults("rule-1", "org-1", { limit: 25 });

      expect(mockPrisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
        }),
      );
    });
  });

  describe("sample collection", () => {
    it("should limit matched samples to 10", async () => {
      // Create 15 cases that will all match
      const manyCases = Array.from({ length: 15 }, (_, i) => ({
        ...mockCases[0],
        id: `case-${i}`,
        referenceNumber: `CASE-${String(i).padStart(3, "0")}`,
      }));

      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue(manyCases);

      // All cases match
      mockRulesEngine.evaluateRule.mockResolvedValue(true);

      const result = await service.testRule("rule-1", "org-1");

      const matchedSamples = result.samples.filter((s) => s.wouldMatch);
      expect(matchedSamples.length).toBe(10);
      expect(result.matchedCases).toBe(15);
    });

    it("should limit unmatched samples to 10", async () => {
      // Create 15 cases that won't match
      const manyCases = Array.from({ length: 15 }, (_, i) => ({
        ...mockCases[1], // LOW severity - won't match
        id: `case-${i}`,
        referenceNumber: `CASE-${String(i).padStart(3, "0")}`,
      }));

      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue(manyCases);

      // No cases match
      mockRulesEngine.evaluateRule.mockResolvedValue(false);

      const result = await service.testRule("rule-1", "org-1");

      const unmatchedSamples = result.samples.filter((s) => !s.wouldMatch);
      expect(unmatchedSamples.length).toBe(10);
      expect(result.matchedCases).toBe(0);
    });

    it("should limit total samples to 20", async () => {
      // Create 30 cases - 15 will match, 15 won't
      const manyCases = Array.from({ length: 30 }, (_, i) => ({
        ...(i < 15 ? mockCases[0] : mockCases[1]),
        id: `case-${i}`,
        referenceNumber: `CASE-${String(i).padStart(3, "0")}`,
      }));

      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue(manyCases);

      // First 15 match, last 15 don't
      for (let i = 0; i < 30; i++) {
        mockRulesEngine.evaluateRule.mockResolvedValueOnce(i < 15);
      }

      const result = await service.testRule("rule-1", "org-1");

      expect(result.samples.length).toBeLessThanOrEqual(20);
    });
  });

  describe("caseDetails", () => {
    it("should include case details in samples", async () => {
      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue([mockCases[0]]);

      mockRulesEngine.evaluateRule.mockResolvedValue(true);

      const result = await service.testRule("rule-1", "org-1");

      const sample = result.samples[0];
      expect(sample.caseDetails).toEqual({
        severity: "HIGH",
        categoryName: "Fraud",
        locationName: "New York Office",
        createdAt: new Date("2026-01-01"),
      });
    });

    it("should handle null category gracefully", async () => {
      const caseWithoutCategory = {
        ...mockCases[0],
        primaryCategory: null,
        primaryCategoryId: null,
      };

      mockPrisma.ruleDefinition.findFirst.mockResolvedValue(mockRule);
      mockPrisma.case.findMany.mockResolvedValue([caseWithoutCategory]);

      mockRulesEngine.evaluateRule.mockResolvedValue(true);

      const result = await service.testRule("rule-1", "org-1");

      expect(result.samples[0].caseDetails.categoryName).toBeNull();
    });
  });
});
