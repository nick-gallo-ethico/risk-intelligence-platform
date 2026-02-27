import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InvestigationStatusListener } from "./investigation-status.listener";
import { PrismaService } from "../../prisma/prisma.service";
import { InvestigationStatusChangedEvent } from "../../events/events/investigation.events";
import { CaseStatusChangedEvent } from "../../events/events/case.events";

describe("InvestigationStatusListener", () => {
  let listener: InvestigationStatusListener;
  let prismaService: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const createMockEvent = (
    overrides: Partial<InvestigationStatusChangedEvent> = {},
  ): InvestigationStatusChangedEvent => {
    return new InvestigationStatusChangedEvent({
      organizationId: "org-1",
      investigationId: "inv-1",
      caseId: "case-1",
      previousStatus: "INVESTIGATING",
      newStatus: "CLOSED",
      actorUserId: "user-1",
      ...overrides,
    });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestigationStatusListener,
        {
          provide: PrismaService,
          useValue: {
            case: {
              findFirst: jest.fn(),
            },
            investigation: {
              findMany: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
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

    listener = module.get<InvestigationStatusListener>(
      InvestigationStatusListener,
    );
    prismaService = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(listener).toBeDefined();
  });

  describe("handleInvestigationStatusChanged", () => {
    describe("when new status is not closed", () => {
      it("should skip processing if new status is IN_PROGRESS", async () => {
        const event = createMockEvent({ newStatus: "IN_PROGRESS" });

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.case.findFirst).not.toHaveBeenCalled();
        expect(prismaService.investigation.findMany).not.toHaveBeenCalled();
      });

      it("should skip processing if new status is INVESTIGATING", async () => {
        const event = createMockEvent({ newStatus: "INVESTIGATING" });

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.case.findFirst).not.toHaveBeenCalled();
      });

      it("should skip processing if new status is ON_HOLD", async () => {
        const event = createMockEvent({ newStatus: "ON_HOLD" });

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.case.findFirst).not.toHaveBeenCalled();
      });

      it("should skip processing if new status is NEW", async () => {
        const event = createMockEvent({ newStatus: "NEW" });

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.case.findFirst).not.toHaveBeenCalled();
      });
    });

    describe("when case is not in derivable status", () => {
      it("should skip if case is already CLOSED", async () => {
        const event = createMockEvent({ newStatus: "CLOSED" });

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue({
          id: "case-1",
          status: "CLOSED",
          referenceNumber: "CASE-001",
        });

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.investigation.findMany).not.toHaveBeenCalled();
        expect(prismaService.auditLog.create).not.toHaveBeenCalled();
      });

      it("should skip if case is not found", async () => {
        const event = createMockEvent({ newStatus: "CLOSED" });

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue(null);

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.investigation.findMany).not.toHaveBeenCalled();
      });
    });

    describe("when some investigations are still open", () => {
      it("should not flag for review if some investigations are still open", async () => {
        const event = createMockEvent({ newStatus: "CLOSED" });

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue({
          id: "case-1",
          status: "OPEN",
          referenceNumber: "CASE-001",
        });

        (prismaService.investigation.findMany as jest.Mock).mockResolvedValue([
          { status: "CLOSED" },
          { status: "INVESTIGATING" }, // Still open
        ]);

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.auditLog.create).not.toHaveBeenCalled();
        expect(eventEmitter.emit).not.toHaveBeenCalled();
      });

      it("should not flag for review if all investigations are open", async () => {
        const event = createMockEvent({ newStatus: "CLOSED" });

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue({
          id: "case-1",
          status: "OPEN",
          referenceNumber: "CASE-001",
        });

        (prismaService.investigation.findMany as jest.Mock).mockResolvedValue([
          { status: "INVESTIGATING" },
          { status: "NEW" },
        ]);

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.auditLog.create).not.toHaveBeenCalled();
      });
    });

    describe("when all investigations are closed", () => {
      it("should flag case for review when all investigations are CLOSED", async () => {
        const event = createMockEvent({ newStatus: "CLOSED" });

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue({
          id: "case-1",
          status: "OPEN",
          referenceNumber: "CASE-001",
        });

        (prismaService.investigation.findMany as jest.Mock).mockResolvedValue([
          { status: "CLOSED" },
          { status: "CLOSED" },
        ]);

        (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            entityType: "CASE",
            entityId: "case-1",
            action: "investigations_completed",
            actionCategory: "SYSTEM",
            actionDescription: expect.stringContaining(
              "All investigations closed",
            ),
            actorType: "SYSTEM",
          }),
        });
      });

      it("should emit CaseStatusChangedEvent after flagging", async () => {
        const event = createMockEvent({ newStatus: "CLOSED" });

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue({
          id: "case-1",
          status: "OPEN",
          referenceNumber: "CASE-001",
        });

        (prismaService.investigation.findMany as jest.Mock).mockResolvedValue([
          { status: "CLOSED" },
        ]);

        (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

        await listener.handleInvestigationStatusChanged(event);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          CaseStatusChangedEvent.eventName,
          expect.objectContaining({
            caseId: "case-1",
            previousStatus: "OPEN",
            newStatus: "OPEN", // Status unchanged, rationale signals completion
            rationale: expect.stringContaining("All investigations completed"),
          }),
        );
      });

      it("should create audit log entry with autoDerivation flag", async () => {
        const event = createMockEvent({ newStatus: "CLOSED" });

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue({
          id: "case-1",
          status: "NEW",
          referenceNumber: "CASE-002",
        });

        (prismaService.investigation.findMany as jest.Mock).mockResolvedValue([
          { status: "CLOSED" },
        ]);

        (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            context: expect.objectContaining({
              autoDerivation: true,
              reason: "All investigations completed",
            }),
          }),
        });
      });

      it("should handle case status NEW as derivable", async () => {
        const event = createMockEvent({ newStatus: "CLOSED" });

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue({
          id: "case-1",
          status: "NEW",
          referenceNumber: "CASE-003",
        });

        (prismaService.investigation.findMany as jest.Mock).mockResolvedValue([
          { status: "CLOSED" },
        ]);

        (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.auditLog.create).toHaveBeenCalled();
        expect(eventEmitter.emit).toHaveBeenCalled();
      });
    });

    describe("edge cases", () => {
      it("should not flag if case has no investigations", async () => {
        const event = createMockEvent({ newStatus: "CLOSED" });

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue({
          id: "case-1",
          status: "OPEN",
          referenceNumber: "CASE-001",
        });

        (prismaService.investigation.findMany as jest.Mock).mockResolvedValue(
          [],
        );

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.auditLog.create).not.toHaveBeenCalled();
      });

      it("should handle case-insensitive status comparison", async () => {
        const event = createMockEvent({ newStatus: "closed" }); // lowercase

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue({
          id: "case-1",
          status: "OPEN",
          referenceNumber: "CASE-001",
        });

        (prismaService.investigation.findMany as jest.Mock).mockResolvedValue([
          { status: "CLOSED" },
        ]);

        (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

        await listener.handleInvestigationStatusChanged(event);

        expect(prismaService.auditLog.create).toHaveBeenCalled();
      });

      it("should handle errors gracefully without throwing", async () => {
        const event = createMockEvent({ newStatus: "CLOSED" });

        (prismaService.case.findFirst as jest.Mock).mockRejectedValue(
          new Error("Database error"),
        );

        // Should not throw
        await expect(
          listener.handleInvestigationStatusChanged(event),
        ).resolves.not.toThrow();
      });

      it("should filter by organizationId for tenant isolation", async () => {
        const event = createMockEvent({
          newStatus: "CLOSED",
          organizationId: "org-specific",
        });

        (prismaService.case.findFirst as jest.Mock).mockResolvedValue({
          id: "case-1",
          status: "OPEN",
          referenceNumber: "CASE-001",
        });

        (prismaService.investigation.findMany as jest.Mock).mockResolvedValue([
          { status: "CLOSED" },
        ]);

        (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

        await listener.handleInvestigationStatusChanged(event);

        // Verify case lookup includes organizationId
        expect(prismaService.case.findFirst).toHaveBeenCalledWith({
          where: {
            id: "case-1",
            organizationId: "org-specific",
          },
          select: expect.any(Object),
        });

        // Verify investigation lookup includes organizationId
        expect(prismaService.investigation.findMany).toHaveBeenCalledWith({
          where: {
            caseId: "case-1",
            organizationId: "org-specific",
          },
          select: { status: true },
        });
      });
    });
  });
});
