import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CaseStatusService } from "./case-status.service";
import { CaseQueryService } from "./case-query.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivityService } from "../../../common/services/activity.service";
import {
  CaseStatus,
  SourceChannel,
  CaseType,
  Severity,
  ReporterType,
  AuditEntityType,
} from "@prisma/client";
import { CaseStatusChangedEvent } from "../../events/events";

describe("CaseStatusService", () => {
  let service: CaseStatusService;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let caseQueryService: jest.Mocked<CaseQueryService>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockCaseId = "case-test-123";
  const mockReferenceNumber = "ETH-2026-00001";

  const mockCase = {
    id: mockCaseId,
    referenceNumber: mockReferenceNumber,
    organizationId: mockOrgId,
    status: CaseStatus.NEW,
    sourceChannel: SourceChannel.WEB_FORM,
    caseType: CaseType.REPORT,
    details: "Test case details",
    reporterType: ReporterType.ANONYMOUS,
    severity: Severity.MEDIUM,
    primaryCategoryId: null,
    secondaryCategoryId: null,
    createdById: mockUserId,
    updatedById: mockUserId,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  };

  // Mock Setup
  const mockPrismaService = {
    case: {
      update: jest.fn(),
    },
  };

  const mockActivityService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockCaseQueryService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseStatusService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: CaseQueryService, useValue: mockCaseQueryService },
      ],
    }).compile();

    service = module.get<CaseStatusService>(CaseStatusService);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);
    eventEmitter = module.get(EventEmitter2);
    caseQueryService = module.get(CaseQueryService);

    jest.clearAllMocks();
  });

  describe("updateStatus", () => {
    describe("validation", () => {
      it("should throw NotFoundException when case not found", async () => {
        // Arrange
        mockCaseQueryService.findOne.mockRejectedValue(
          new NotFoundException(`Case with ID non-existent not found`),
        );

        // Act & Assert
        await expect(
          service.updateStatus(
            "non-existent",
            CaseStatus.OPEN,
            "Test rationale",
            mockUserId,
            mockOrgId,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it("should throw BadRequestException when transitioning to same status", async () => {
        // Arrange
        mockCaseQueryService.findOne.mockResolvedValue(mockCase);

        // Act & Assert
        await expect(
          service.updateStatus(
            mockCaseId,
            CaseStatus.NEW,
            "No change",
            mockUserId,
            mockOrgId,
          ),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.updateStatus(
            mockCaseId,
            CaseStatus.NEW,
            "No change",
            mockUserId,
            mockOrgId,
          ),
        ).rejects.toThrow("Case is already in NEW status");
      });
    });

    describe("successful status update", () => {
      beforeEach(() => {
        mockCaseQueryService.findOne.mockResolvedValue(mockCase);
        mockPrismaService.case.update.mockResolvedValue({
          ...mockCase,
          status: CaseStatus.OPEN,
        });
      });

      it("should update case status", async () => {
        // Act
        const result = await service.updateStatus(
          mockCaseId,
          CaseStatus.OPEN,
          "Starting investigation",
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(result.status).toBe(CaseStatus.OPEN);
      });

      it("should pass correct data to prisma update", async () => {
        // Act
        await service.updateStatus(
          mockCaseId,
          CaseStatus.OPEN,
          "Starting investigation",
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(prisma.case.update).toHaveBeenCalledWith({
          where: { id: mockCaseId },
          data: {
            status: CaseStatus.OPEN,
            statusRationale: "Starting investigation",
            updatedById: mockUserId,
          },
        });
      });

      it("should log activity with status change details", async () => {
        // Act
        await service.updateStatus(
          mockCaseId,
          CaseStatus.OPEN,
          "Opening case",
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(activityService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: AuditEntityType.CASE,
            entityId: mockCaseId,
            action: "status_changed",
            actionDescription: expect.stringContaining("from NEW to OPEN"),
            actorUserId: mockUserId,
            organizationId: mockOrgId,
            changes: {
              oldValue: { status: CaseStatus.NEW },
              newValue: { status: CaseStatus.OPEN, rationale: "Opening case" },
            },
          }),
        );
      });

      it("should emit case.status_changed event", async () => {
        // Act
        await service.updateStatus(
          mockCaseId,
          CaseStatus.OPEN,
          "Starting investigation",
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          CaseStatusChangedEvent.eventName,
          expect.objectContaining({
            organizationId: mockOrgId,
            actorUserId: mockUserId,
            actorType: "USER",
            caseId: mockCaseId,
            previousStatus: CaseStatus.NEW,
            newStatus: CaseStatus.OPEN,
            rationale: "Starting investigation",
          }),
        );
      });

      it("should allow undefined rationale", async () => {
        // Act
        await service.updateStatus(
          mockCaseId,
          CaseStatus.OPEN,
          undefined,
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(prisma.case.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              statusRationale: undefined,
            }),
          }),
        );
      });
    });
  });

  describe("close", () => {
    describe("validation", () => {
      it("should throw NotFoundException when case not found", async () => {
        // Arrange
        mockCaseQueryService.findOne.mockRejectedValue(
          new NotFoundException(`Case with ID non-existent not found`),
        );

        // Act & Assert
        await expect(
          service.close(
            "non-existent",
            "Closing reason",
            mockUserId,
            mockOrgId,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it("should throw BadRequestException when already closed", async () => {
        // Arrange
        mockCaseQueryService.findOne.mockResolvedValue({
          ...mockCase,
          status: CaseStatus.CLOSED,
        });

        // Act & Assert
        await expect(
          service.close(mockCaseId, "Already closed", mockUserId, mockOrgId),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.close(mockCaseId, "Already closed", mockUserId, mockOrgId),
        ).rejects.toThrow("Case is already in CLOSED status");
      });
    });

    describe("successful close", () => {
      beforeEach(() => {
        mockCaseQueryService.findOne.mockResolvedValue({
          ...mockCase,
          status: CaseStatus.OPEN,
        });
        mockPrismaService.case.update.mockResolvedValue({
          ...mockCase,
          status: CaseStatus.CLOSED,
        });
      });

      it("should update case status to CLOSED", async () => {
        // Act
        const result = await service.close(
          mockCaseId,
          "Investigation complete",
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(result.status).toBe(CaseStatus.CLOSED);
      });

      it("should pass CLOSED status to prisma", async () => {
        // Act
        await service.close(
          mockCaseId,
          "Investigation complete",
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(prisma.case.update).toHaveBeenCalledWith({
          where: { id: mockCaseId },
          data: {
            status: CaseStatus.CLOSED,
            statusRationale: "Investigation complete",
            updatedById: mockUserId,
          },
        });
      });

      it("should log activity with closed action", async () => {
        // Act
        await service.close(
          mockCaseId,
          "No violation found",
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(activityService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: AuditEntityType.CASE,
            entityId: mockCaseId,
            action: "closed",
            actionDescription: expect.stringContaining(
              `Closed case ${mockReferenceNumber}`,
            ),
            actorUserId: mockUserId,
            organizationId: mockOrgId,
          }),
        );
      });

      it("should emit case.status_changed event with CLOSED status", async () => {
        // Act
        await service.close(
          mockCaseId,
          "Investigation complete",
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          CaseStatusChangedEvent.eventName,
          expect.objectContaining({
            caseId: mockCaseId,
            previousStatus: CaseStatus.OPEN,
            newStatus: CaseStatus.CLOSED,
            rationale: "Investigation complete",
          }),
        );
      });

      it("should close case from NEW status", async () => {
        // Arrange
        mockCaseQueryService.findOne.mockResolvedValue(mockCase);

        // Act
        const result = await service.close(
          mockCaseId,
          "Closed without investigation",
          mockUserId,
          mockOrgId,
        );

        // Assert
        expect(result.status).toBe(CaseStatus.CLOSED);
      });
    });
  });

  describe("validateStatusTransition", () => {
    it("should throw BadRequestException for same status", () => {
      // Act & Assert
      expect(() => {
        service.validateStatusTransition(CaseStatus.NEW, CaseStatus.NEW);
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateStatusTransition(CaseStatus.NEW, CaseStatus.NEW);
      }).toThrow("Case is already in NEW status");
    });

    it("should not throw for different status", () => {
      // Act & Assert - Should not throw
      expect(() => {
        service.validateStatusTransition(CaseStatus.NEW, CaseStatus.OPEN);
      }).not.toThrow();
    });

    it("should validate all status values", () => {
      // Act & Assert
      expect(() => {
        service.validateStatusTransition(CaseStatus.OPEN, CaseStatus.OPEN);
      }).toThrow("Case is already in OPEN status");

      expect(() => {
        service.validateStatusTransition(CaseStatus.CLOSED, CaseStatus.CLOSED);
      }).toThrow("Case is already in CLOSED status");
    });
  });

  describe("event emission error handling", () => {
    it("should not fail updateStatus if event emission throws", async () => {
      // Arrange
      mockCaseQueryService.findOne.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.OPEN,
      });
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error("Event emission failed");
      });

      // Act - Should not throw
      const result = await service.updateStatus(
        mockCaseId,
        CaseStatus.OPEN,
        "Test",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(CaseStatus.OPEN);
    });

    it("should not fail close if event emission throws", async () => {
      // Arrange
      mockCaseQueryService.findOne.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.OPEN,
      });
      mockPrismaService.case.update.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.CLOSED,
      });
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error("Event emission failed");
      });

      // Act - Should not throw
      const result = await service.close(
        mockCaseId,
        "Closing",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(CaseStatus.CLOSED);
    });
  });

  describe("tenant isolation", () => {
    it("should pass organizationId to caseQueryService.findOne", async () => {
      // Arrange
      mockCaseQueryService.findOne.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.OPEN,
      });

      // Act
      await service.updateStatus(
        mockCaseId,
        CaseStatus.OPEN,
        "Test",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(caseQueryService.findOne).toHaveBeenCalledWith(
        mockCaseId,
        mockOrgId,
      );
    });

    it("should include organizationId in activity log", async () => {
      // Arrange
      mockCaseQueryService.findOne.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.OPEN,
      });

      // Act
      await service.updateStatus(
        mockCaseId,
        CaseStatus.OPEN,
        "Test",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: mockOrgId,
        }),
      );
    });

    it("should include organizationId in emitted event", async () => {
      // Arrange
      mockCaseQueryService.findOne.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue({
        ...mockCase,
        status: CaseStatus.OPEN,
      });

      // Act
      await service.updateStatus(
        mockCaseId,
        CaseStatus.OPEN,
        "Test",
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CaseStatusChangedEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
        }),
      );
    });
  });
});
