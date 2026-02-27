import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RoundRobinTeamAction } from "./round-robin-team.action";
import { PrismaService } from "../../../prisma/prisma.service";
import { CaseAssignedEvent } from "../../../events/events/case.events";
import type { ActionContext } from "./base.action";

describe("RoundRobinTeamAction", () => {
  let action: RoundRobinTeamAction;
  let prismaService: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockContext: ActionContext = {
    organizationId: "org-1",
    entityType: "CASE",
    entityId: "case-1",
    triggeredByRuleId: "rule-1",
    actorType: "SYSTEM",
  };

  const mockTeam = {
    id: "team-1",
    name: "Compliance Team",
    code: "COMPLIANCE",
  };

  const mockCase = {
    id: "case-1",
    referenceNumber: "CASE-001",
  };

  const mockEmployees = [
    { email: "alice@example.com" },
    { email: "bob@example.com" },
    { email: "charlie@example.com" },
  ];

  const mockUsers = [
    {
      id: "user-alice",
      firstName: "Alice",
      lastName: "Smith",
      createdAt: new Date("2026-01-01"),
    },
    {
      id: "user-bob",
      firstName: "Bob",
      lastName: "Jones",
      createdAt: new Date("2026-01-02"),
    },
    {
      id: "user-charlie",
      firstName: "Charlie",
      lastName: "Brown",
      createdAt: new Date("2026-01-03"),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoundRobinTeamAction,
        {
          provide: PrismaService,
          useValue: {
            team: {
              findFirst: jest.fn(),
            },
            employee: {
              findMany: jest.fn(),
            },
            user: {
              findMany: jest.fn(),
            },
            case: {
              findFirst: jest.fn(),
            },
            ruleExecutionLog: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    action = module.get<RoundRobinTeamAction>(RoundRobinTeamAction);
    prismaService = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
  });

  it("should be defined", () => {
    expect(action).toBeDefined();
    expect(action.type).toBe("round_robin");
  });

  describe("execute", () => {
    describe("validation", () => {
      it("should fail if teamId is missing", async () => {
        const result = await action.execute({}, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Missing teamId parameter");
        expect(result.actionType).toBe("round_robin");
      });

      it("should fail if team is not found", async () => {
        (prismaService.team.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await action.execute({ teamId: "team-1" }, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Team not found in this organization");
        expect(result.details).toEqual({ teamId: "team-1" });
      });

      it("should fail if no eligible team members found", async () => {
        (prismaService.team.findFirst as jest.Mock).mockResolvedValue(mockTeam);
        (prismaService.employee.findMany as jest.Mock).mockResolvedValue([]);

        const result = await action.execute({ teamId: "team-1" }, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toBe("No eligible team members found");
        expect(result.details).toEqual({
          teamId: "team-1",
          teamName: "Compliance Team",
        });
      });

      it("should fail if case is not found", async () => {
        (prismaService.team.findFirst as jest.Mock).mockResolvedValue(mockTeam);
        (prismaService.employee.findMany as jest.Mock).mockResolvedValue(
          mockEmployees,
        );
        (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await action.execute({ teamId: "team-1" }, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Case not found");
      });
    });

    describe("round-robin assignment", () => {
      beforeEach(() => {
        (prismaService.team.findFirst as jest.Mock).mockResolvedValue(mockTeam);
        (prismaService.employee.findMany as jest.Mock).mockResolvedValue(
          mockEmployees,
        );
        (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(mockCase);
      });

      it("should assign to first member when no prior assignments", async () => {
        (
          prismaService.ruleExecutionLog.findFirst as jest.Mock
        ).mockResolvedValue(null);

        const result = await action.execute({ teamId: "team-1" }, mockContext);

        expect(result.success).toBe(true);
        expect(result.details.userId).toBe("user-alice");
        expect(result.details.userName).toBe("Alice Smith");
        expect(result.details.memberIndex).toBe(1);
        expect(result.details.totalMembers).toBe(3);
      });

      it("should assign to next member in sequence", async () => {
        // Last assignment was to Alice (user-alice)
        (
          prismaService.ruleExecutionLog.findFirst as jest.Mock
        ).mockResolvedValue({
          actionsTaken: [
            {
              actionType: "round_robin",
              success: true,
              details: { teamId: "team-1", userId: "user-alice" },
            },
          ],
        });

        const result = await action.execute({ teamId: "team-1" }, mockContext);

        expect(result.success).toBe(true);
        expect(result.details.userId).toBe("user-bob");
        expect(result.details.userName).toBe("Bob Jones");
        expect(result.details.memberIndex).toBe(2);
      });

      it("should wrap around to first member after last", async () => {
        // Last assignment was to Charlie (user-charlie, last in list)
        (
          prismaService.ruleExecutionLog.findFirst as jest.Mock
        ).mockResolvedValue({
          actionsTaken: [
            {
              actionType: "round_robin",
              success: true,
              details: { teamId: "team-1", userId: "user-charlie" },
            },
          ],
        });

        const result = await action.execute({ teamId: "team-1" }, mockContext);

        expect(result.success).toBe(true);
        expect(result.details.userId).toBe("user-alice");
        expect(result.details.userName).toBe("Alice Smith");
        expect(result.details.memberIndex).toBe(1);
      });

      it("should start with first member if last assignee is no longer eligible", async () => {
        // Last assignment was to a user no longer in the team
        (
          prismaService.ruleExecutionLog.findFirst as jest.Mock
        ).mockResolvedValue({
          actionsTaken: [
            {
              actionType: "round_robin",
              success: true,
              details: { teamId: "team-1", userId: "user-removed" },
            },
          ],
        });

        const result = await action.execute({ teamId: "team-1" }, mockContext);

        expect(result.success).toBe(true);
        expect(result.details.userId).toBe("user-alice");
        expect(result.details.memberIndex).toBe(1);
      });
    });

    describe("event emission", () => {
      beforeEach(() => {
        (prismaService.team.findFirst as jest.Mock).mockResolvedValue(mockTeam);
        (prismaService.employee.findMany as jest.Mock).mockResolvedValue(
          mockEmployees,
        );
        (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(mockCase);
        (
          prismaService.ruleExecutionLog.findFirst as jest.Mock
        ).mockResolvedValue(null);
      });

      it("should emit CaseAssignedEvent on success", async () => {
        const result = await action.execute({ teamId: "team-1" }, mockContext);

        expect(result.success).toBe(true);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          CaseAssignedEvent.eventName,
          expect.objectContaining({
            organizationId: "org-1",
            caseId: "case-1",
            previousAssigneeId: null,
            newAssigneeId: "user-alice",
            actorType: "SYSTEM",
          }),
        );
      });
    });

    describe("result details", () => {
      beforeEach(() => {
        (prismaService.team.findFirst as jest.Mock).mockResolvedValue(mockTeam);
        (prismaService.employee.findMany as jest.Mock).mockResolvedValue(
          mockEmployees,
        );
        (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(mockCase);
        (
          prismaService.ruleExecutionLog.findFirst as jest.Mock
        ).mockResolvedValue(null);
      });

      it("should include complete details on success", async () => {
        const result = await action.execute({ teamId: "team-1" }, mockContext);

        expect(result.success).toBe(true);
        expect(result.actionType).toBe("round_robin");
        expect(result.details).toMatchObject({
          teamId: "team-1",
          teamName: "Compliance Team",
          teamCode: "COMPLIANCE",
          userId: "user-alice",
          userName: "Alice Smith",
          memberIndex: 1,
          totalMembers: 3,
          caseId: "case-1",
          caseReferenceNumber: "CASE-001",
          reason: expect.stringContaining("Round-robin assignment"),
        });
      });
    });

    describe("error handling", () => {
      it("should handle database errors gracefully", async () => {
        (prismaService.team.findFirst as jest.Mock).mockRejectedValue(
          new Error("Database connection failed"),
        );

        const result = await action.execute({ teamId: "team-1" }, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Database connection failed");
        expect(result.details).toEqual({ teamId: "team-1" });
      });
    });
  });

  describe("team member eligibility", () => {
    beforeEach(() => {
      (prismaService.team.findFirst as jest.Mock).mockResolvedValue(mockTeam);
      (prismaService.case.findFirst as jest.Mock).mockResolvedValue(mockCase);
      (prismaService.ruleExecutionLog.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
    });

    it("should filter for ACTIVE employees only", async () => {
      (prismaService.employee.findMany as jest.Mock).mockResolvedValue(
        mockEmployees,
      );
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      await action.execute({ teamId: "team-1" }, mockContext);

      expect(prismaService.employee.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          teamId: "team-1",
          employmentStatus: "ACTIVE",
        },
        select: { email: true },
      });
    });

    it("should filter for active users only", async () => {
      (prismaService.employee.findMany as jest.Mock).mockResolvedValue(
        mockEmployees,
      );
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      await action.execute({ teamId: "team-1" }, mockContext);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          isActive: true,
          email: {
            in: ["alice@example.com", "bob@example.com", "charlie@example.com"],
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });
    });

    it("should return no eligible members if employees exist but no matching users", async () => {
      (prismaService.employee.findMany as jest.Mock).mockResolvedValue(
        mockEmployees,
      );
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await action.execute({ teamId: "team-1" }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No eligible team members found");
    });
  });
});
