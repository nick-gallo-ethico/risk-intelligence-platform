import { Test, TestingModule } from "@nestjs/testing";
import { CaseRoutingListener } from "./case-routing.listener";
import { PrismaService } from "../../prisma/prisma.service";
import { RulesEngineService } from "../engine/rules-engine.service";
import { CaseCreatedEvent } from "../../events/events/case.events";

describe("CaseRoutingListener", () => {
  let listener: CaseRoutingListener;
  let prismaService: jest.Mocked<PrismaService>;
  let rulesEngineService: jest.Mocked<RulesEngineService>;

  const mockCase = {
    id: "case-123",
    referenceNumber: "CASE-2026-001",
    severity: "HIGH",
    primaryCategoryId: "cat-fraud",
    secondaryCategoryId: null,
    sourceChannel: "PHONE",
    caseType: "REPORT",
    status: "NEW",
    reporterType: "ANONYMOUS",
    locationName: "New York Office",
    locationCity: "New York",
    locationState: "NY",
    locationCountry: "US",
    tags: ["urgent"],
    primaryCategory: {
      id: "cat-fraud",
      name: "Fraud",
      parentCategoryId: null,
    },
    secondaryCategory: null,
  };

  const createMockEvent = (
    overrides: Partial<CaseCreatedEvent> = {},
  ): CaseCreatedEvent => {
    return new CaseCreatedEvent({
      organizationId: "org-1",
      caseId: "case-123",
      referenceNumber: "CASE-2026-001",
      sourceChannel: "PHONE",
      severity: "HIGH",
      ...overrides,
    });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseRoutingListener,
        {
          provide: PrismaService,
          useValue: {
            case: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
            },
            investigation: {
              findFirst: jest.fn(),
            },
            ruleDefinition: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: RulesEngineService,
          useValue: {
            evaluate: jest.fn(),
            executeActions: jest.fn(),
            logExecution: jest.fn(),
          },
        },
      ],
    }).compile();

    listener = module.get<CaseRoutingListener>(CaseRoutingListener);
    prismaService = module.get(PrismaService);
    rulesEngineService = module.get(RulesEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(listener).toBeDefined();
  });

  describe("handleCaseCreated", () => {
    describe("when case already has assigned investigation", () => {
      it("should skip routing if case has primary investigator", async () => {
        const event = createMockEvent();

        (prismaService.case.findUnique as jest.Mock).mockResolvedValue({
          id: "case-123",
          referenceNumber: "CASE-2026-001",
        });

        (prismaService.investigation.findFirst as jest.Mock).mockResolvedValue({
          primaryInvestigatorId: "user-123",
        });

        await listener.handleCaseCreated(event);

        expect(rulesEngineService.evaluate).not.toHaveBeenCalled();
      });
    });

    describe("when case is unassigned", () => {
      beforeEach(() => {
        (prismaService.case.findUnique as jest.Mock).mockResolvedValue({
          id: "case-123",
          referenceNumber: "CASE-2026-001",
        });

        (prismaService.investigation.findFirst as jest.Mock).mockResolvedValue(
          null,
        );
      });

      it("should evaluate rules for unassigned case", async () => {
        const event = createMockEvent();

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(mockCase);

        rulesEngineService.evaluate.mockResolvedValue({
          matched: true,
          matchedRuleId: "rule-1",
          matchedRuleName: "Route HIGH to CCO",
          triggeredActions: [
            { type: "assign_user", params: { userId: "user-cco" } },
          ],
          executionTimeMs: 15,
          facts: {},
        });

        rulesEngineService.executeActions.mockResolvedValue({
          ruleId: "rule-1",
          actions: [{ success: true, actionType: "assign_user", details: {} }],
          allSuccessful: true,
        });

        await listener.handleCaseCreated(event);

        expect(rulesEngineService.evaluate).toHaveBeenCalledWith(
          "org-1",
          "case.created",
          expect.objectContaining({
            caseId: "case-123",
            severity: "HIGH",
            categoryId: "cat-fraud",
            categoryName: "Fraud",
          }),
        );

        expect(rulesEngineService.executeActions).toHaveBeenCalledWith(
          [{ type: "assign_user", params: { userId: "user-cco" } }],
          expect.objectContaining({
            organizationId: "org-1",
            entityType: "CASE",
            entityId: "case-123",
            triggeredByRuleId: "rule-1",
            actorType: "SYSTEM",
          }),
        );

        expect(rulesEngineService.logExecution).toHaveBeenCalled();
      });

      it("should include location facts in evaluation", async () => {
        const event = createMockEvent();

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(mockCase);

        rulesEngineService.evaluate.mockResolvedValue({
          matched: false,
          triggeredActions: [],
          executionTimeMs: 5,
          facts: {},
        });

        (prismaService.ruleDefinition.findFirst as jest.Mock).mockResolvedValue(
          null,
        );

        await listener.handleCaseCreated(event);

        expect(rulesEngineService.evaluate).toHaveBeenCalledWith(
          "org-1",
          "case.created",
          expect.objectContaining({
            locationName: "New York Office",
            locationCity: "New York",
            locationState: "NY",
            locationCountry: "US",
          }),
        );
      });

      it("should log evaluation even when no rules match", async () => {
        const event = createMockEvent();

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(mockCase);

        rulesEngineService.evaluate.mockResolvedValue({
          matched: false,
          triggeredActions: [],
          executionTimeMs: 5,
          facts: {},
        });

        (prismaService.ruleDefinition.findFirst as jest.Mock).mockResolvedValue(
          {
            id: "rule-1",
          },
        );

        await listener.handleCaseCreated(event);

        expect(rulesEngineService.executeActions).not.toHaveBeenCalled();
        expect(rulesEngineService.logExecution).toHaveBeenCalledWith(
          "org-1",
          "rule-1",
          "CASE",
          "case-123",
          expect.objectContaining({ matched: false }),
        );
      });

      it("should not log if no active rules exist and no match", async () => {
        const event = createMockEvent();

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(mockCase);

        rulesEngineService.evaluate.mockResolvedValue({
          matched: false,
          triggeredActions: [],
          executionTimeMs: 5,
          facts: {},
        });

        (prismaService.ruleDefinition.findFirst as jest.Mock).mockResolvedValue(
          null,
        );

        await listener.handleCaseCreated(event);

        expect(rulesEngineService.logExecution).not.toHaveBeenCalled();
      });
    });

    describe("when case is not found", () => {
      it("should skip routing if case not found", async () => {
        const event = createMockEvent();

        (prismaService.case.findUnique as jest.Mock).mockResolvedValue({
          id: "case-123",
          referenceNumber: "CASE-2026-001",
        });

        (prismaService.investigation.findFirst as jest.Mock).mockResolvedValue(
          null,
        );

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(null);

        await listener.handleCaseCreated(event);

        expect(rulesEngineService.evaluate).not.toHaveBeenCalled();
      });
    });

    describe("error handling", () => {
      it("should handle errors gracefully without throwing", async () => {
        const event = createMockEvent();

        (prismaService.case.findUnique as jest.Mock).mockRejectedValue(
          new Error("Database error"),
        );

        // Should not throw
        await expect(listener.handleCaseCreated(event)).resolves.not.toThrow();
      });

      it("should handle rule evaluation errors gracefully", async () => {
        const event = createMockEvent();

        (prismaService.case.findUnique as jest.Mock).mockResolvedValue({
          id: "case-123",
          referenceNumber: "CASE-2026-001",
        });

        (prismaService.investigation.findFirst as jest.Mock).mockResolvedValue(
          null,
        );

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(mockCase);

        rulesEngineService.evaluate.mockRejectedValue(
          new Error("Rule engine error"),
        );

        // Should not throw
        await expect(listener.handleCaseCreated(event)).resolves.not.toThrow();
      });
    });

    describe("tenant isolation", () => {
      it("should filter by organizationId for tenant isolation", async () => {
        const event = createMockEvent({
          organizationId: "org-specific",
        });

        (prismaService.case.findUnique as jest.Mock).mockResolvedValue({
          id: "case-123",
          referenceNumber: "CASE-2026-001",
        });

        (prismaService.investigation.findFirst as jest.Mock).mockResolvedValue(
          null,
        );

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(mockCase);

        rulesEngineService.evaluate.mockResolvedValue({
          matched: false,
          triggeredActions: [],
          executionTimeMs: 5,
          facts: {},
        });

        (prismaService.ruleDefinition.findFirst as jest.Mock).mockResolvedValue(
          null,
        );

        await listener.handleCaseCreated(event);

        // Verify case lookup includes organizationId
        expect(prismaService.case.findFirst).toHaveBeenCalledWith({
          where: {
            id: "case-123",
            organizationId: "org-specific",
          },
          select: expect.any(Object),
        });

        // Verify rule evaluation uses correct organizationId
        expect(rulesEngineService.evaluate).toHaveBeenCalledWith(
          "org-specific",
          "case.created",
          expect.any(Object),
        );
      });
    });

    describe("facts structure", () => {
      it("should build nested facts structure for path-based conditions", async () => {
        const event = createMockEvent();

        (prismaService.case.findUnique as jest.Mock).mockResolvedValue({
          id: "case-123",
          referenceNumber: "CASE-2026-001",
        });

        (prismaService.investigation.findFirst as jest.Mock).mockResolvedValue(
          null,
        );

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(mockCase);

        rulesEngineService.evaluate.mockResolvedValue({
          matched: false,
          triggeredActions: [],
          executionTimeMs: 5,
          facts: {},
        });

        (prismaService.ruleDefinition.findFirst as jest.Mock).mockResolvedValue(
          null,
        );

        await listener.handleCaseCreated(event);

        const evaluateCall = rulesEngineService.evaluate.mock.calls[0];
        const facts = evaluateCall[2];

        // Verify nested structures exist
        expect(facts.case).toEqual(
          expect.objectContaining({
            id: "case-123",
            severity: "HIGH",
            categoryId: "cat-fraud",
          }),
        );

        expect(facts.category).toEqual(
          expect.objectContaining({
            id: "cat-fraud",
            name: "Fraud",
          }),
        );

        expect(facts.location).toEqual(
          expect.objectContaining({
            name: "New York Office",
            city: "New York",
            state: "NY",
            country: "US",
          }),
        );
      });
    });
  });
});
