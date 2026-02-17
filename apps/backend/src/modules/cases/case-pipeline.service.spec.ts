import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CasePipelineService } from "./case-pipeline.service";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import { CaseOutcome, Severity, AuditEntityType } from "@prisma/client";

describe("CasePipelineService", () => {
  let service: CasePipelineService;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockCaseId = "case-test-123";
  const mockReferenceNumber = "ETH-2026-00001";

  const mockCase = {
    id: mockCaseId,
    referenceNumber: mockReferenceNumber,
    organizationId: mockOrgId,
    pipelineStage: "new",
    pipelineStageAt: new Date("2026-01-15T10:00:00Z"),
    pipelineStageById: mockUserId,
    outcome: null,
    outcomeNotes: null,
    outcomeAt: null,
    outcomeById: null,
    primaryCategoryId: "cat-001",
    secondaryCategoryId: null,
    severity: Severity.MEDIUM,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  };

  // Mock Setup
  const mockPrismaService = {
    case: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
  };

  const mockActivityService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasePipelineService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<CasePipelineService>(CasePipelineService);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe("moveToStage", () => {
    describe("validation", () => {
      it("should throw NotFoundException when case not found", async () => {
        // Arrange
        mockPrismaService.case.findFirst.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.moveToStage({
            caseId: "non-existent",
            stage: "assigned",
            userId: mockUserId,
            organizationId: mockOrgId,
          }),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.moveToStage({
            caseId: "non-existent",
            stage: "assigned",
            userId: mockUserId,
            organizationId: mockOrgId,
          }),
        ).rejects.toThrow("Case with ID non-existent not found");
      });

      it("should throw BadRequestException when already in target stage", async () => {
        // Arrange
        mockPrismaService.case.findFirst.mockResolvedValue({
          ...mockCase,
          pipelineStage: "assigned",
        });

        // Act & Assert
        await expect(
          service.moveToStage({
            caseId: mockCaseId,
            stage: "assigned",
            userId: mockUserId,
            organizationId: mockOrgId,
          }),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.moveToStage({
            caseId: mockCaseId,
            stage: "assigned",
            userId: mockUserId,
            organizationId: mockOrgId,
          }),
        ).rejects.toThrow("Case is already in stage: assigned");
      });
    });

    describe("successful stage transition", () => {
      beforeEach(() => {
        mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
        mockPrismaService.case.update.mockResolvedValue({
          ...mockCase,
          pipelineStage: "assigned",
        });
      });

      it("should update case with new pipeline stage", async () => {
        // Act
        await service.moveToStage({
          caseId: mockCaseId,
          stage: "assigned",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(prisma.case.update).toHaveBeenCalledWith({
          where: { id: mockCaseId },
          data: expect.objectContaining({
            pipelineStage: "assigned",
            pipelineStageById: mockUserId,
            updatedById: mockUserId,
          }),
        });
      });

      it("should set pipelineStageAt timestamp", async () => {
        // Act
        await service.moveToStage({
          caseId: mockCaseId,
          stage: "assigned",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(prisma.case.update).toHaveBeenCalledWith({
          where: { id: mockCaseId },
          data: expect.objectContaining({
            pipelineStageAt: expect.any(Date),
          }),
        });
      });

      it("should log activity with stage change description", async () => {
        // Act
        await service.moveToStage({
          caseId: mockCaseId,
          stage: "assigned",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(activityService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: AuditEntityType.CASE,
            entityId: mockCaseId,
            action: "pipeline_stage_changed",
            actionDescription: expect.stringContaining(
              'from stage "new" to "assigned"',
            ),
            actorUserId: mockUserId,
            organizationId: mockOrgId,
          }),
        );
      });

      it("should log activity with set description when no previous stage", async () => {
        // Arrange
        mockPrismaService.case.findFirst.mockResolvedValue({
          ...mockCase,
          pipelineStage: null,
        });

        // Act
        await service.moveToStage({
          caseId: mockCaseId,
          stage: "new",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(activityService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            actionDescription: expect.stringContaining('to stage "new"'),
          }),
        );
      });

      it("should emit case.pipeline_stage_changed event", async () => {
        // Act
        await service.moveToStage({
          caseId: mockCaseId,
          stage: "assigned",
          notes: "Starting assignment",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          "case.pipeline_stage_changed",
          expect.objectContaining({
            organizationId: mockOrgId,
            actorUserId: mockUserId,
            caseId: mockCaseId,
            referenceNumber: mockReferenceNumber,
            previousStage: "new",
            newStage: "assigned",
            notes: "Starting assignment",
          }),
        );
      });

      it("should return updated case", async () => {
        // Arrange
        const updatedCase = { ...mockCase, pipelineStage: "assigned" };
        mockPrismaService.case.update.mockResolvedValue(updatedCase);

        // Act
        const result = await service.moveToStage({
          caseId: mockCaseId,
          stage: "assigned",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(result.pipelineStage).toBe("assigned");
      });
    });
  });

  describe("setOutcome", () => {
    describe("validation", () => {
      it("should throw NotFoundException when case not found", async () => {
        // Arrange
        mockPrismaService.case.findFirst.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.setOutcome({
            caseId: "non-existent",
            outcome: CaseOutcome.SUBSTANTIATED,
            notes: "Evidence confirmed",
            userId: mockUserId,
            organizationId: mockOrgId,
          }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe("successful outcome setting", () => {
      beforeEach(() => {
        mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
        mockPrismaService.case.update.mockResolvedValue({
          ...mockCase,
          outcome: CaseOutcome.SUBSTANTIATED,
          outcomeNotes: "Evidence confirmed policy violation",
        });
      });

      it("should update case with outcome and notes", async () => {
        // Act
        await service.setOutcome({
          caseId: mockCaseId,
          outcome: CaseOutcome.SUBSTANTIATED,
          notes: "Evidence confirmed policy violation",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(prisma.case.update).toHaveBeenCalledWith({
          where: { id: mockCaseId },
          data: expect.objectContaining({
            outcome: CaseOutcome.SUBSTANTIATED,
            outcomeNotes: "Evidence confirmed policy violation",
            outcomeById: mockUserId,
            updatedById: mockUserId,
          }),
        });
      });

      it("should set outcomeAt timestamp", async () => {
        // Act
        await service.setOutcome({
          caseId: mockCaseId,
          outcome: CaseOutcome.SUBSTANTIATED,
          notes: "Evidence confirmed",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(prisma.case.update).toHaveBeenCalledWith({
          where: { id: mockCaseId },
          data: expect.objectContaining({
            outcomeAt: expect.any(Date),
          }),
        });
      });

      it("should log activity for new outcome", async () => {
        // Act
        await service.setOutcome({
          caseId: mockCaseId,
          outcome: CaseOutcome.SUBSTANTIATED,
          notes: "Evidence confirmed",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(activityService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: AuditEntityType.CASE,
            entityId: mockCaseId,
            action: "outcome_set",
            actionDescription: expect.stringContaining(
              "outcome to SUBSTANTIATED",
            ),
            actorUserId: mockUserId,
            organizationId: mockOrgId,
          }),
        );
      });

      it("should log activity for outcome change with previous value", async () => {
        // Arrange
        mockPrismaService.case.findFirst.mockResolvedValue({
          ...mockCase,
          outcome: CaseOutcome.UNSUBSTANTIATED,
        });

        // Act
        await service.setOutcome({
          caseId: mockCaseId,
          outcome: CaseOutcome.SUBSTANTIATED,
          notes: "New evidence found",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(activityService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            actionDescription: expect.stringContaining(
              "from UNSUBSTANTIATED to SUBSTANTIATED",
            ),
          }),
        );
      });

      it("should emit case.outcome_set event", async () => {
        // Act
        await service.setOutcome({
          caseId: mockCaseId,
          outcome: CaseOutcome.SUBSTANTIATED,
          notes: "Evidence confirmed",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          "case.outcome_set",
          expect.objectContaining({
            organizationId: mockOrgId,
            actorUserId: mockUserId,
            caseId: mockCaseId,
            referenceNumber: mockReferenceNumber,
            previousOutcome: null,
            newOutcome: CaseOutcome.SUBSTANTIATED,
            notes: "Evidence confirmed",
          }),
        );
      });

      it("should return updated case with outcome", async () => {
        // Arrange
        const updatedCase = {
          ...mockCase,
          outcome: CaseOutcome.SUBSTANTIATED,
        };
        mockPrismaService.case.update.mockResolvedValue(updatedCase);

        // Act
        const result = await service.setOutcome({
          caseId: mockCaseId,
          outcome: CaseOutcome.SUBSTANTIATED,
          notes: "Evidence confirmed",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(result.outcome).toBe(CaseOutcome.SUBSTANTIATED);
      });
    });
  });

  describe("updateClassification", () => {
    describe("validation", () => {
      it("should throw NotFoundException when case not found", async () => {
        // Arrange
        mockPrismaService.case.findFirst.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.updateClassification({
            caseId: "non-existent",
            primaryCategoryId: "cat-002",
            notes: "Reclassification",
            userId: mockUserId,
            organizationId: mockOrgId,
          }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe("successful classification update", () => {
      beforeEach(() => {
        mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
        mockPrismaService.case.update.mockResolvedValue({
          ...mockCase,
          primaryCategoryId: "cat-002",
        });
      });

      it("should update primary category", async () => {
        // Act
        await service.updateClassification({
          caseId: mockCaseId,
          primaryCategoryId: "cat-002",
          notes: "Reclassified after review",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(prisma.case.update).toHaveBeenCalledWith({
          where: { id: mockCaseId },
          data: expect.objectContaining({
            primaryCategoryId: "cat-002",
            classificationNotes: "Reclassified after review",
            classificationChangedById: mockUserId,
            updatedById: mockUserId,
          }),
        });
      });

      it("should update secondary category", async () => {
        // Act
        await service.updateClassification({
          caseId: mockCaseId,
          secondaryCategoryId: "cat-003",
          notes: "Added secondary category",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(prisma.case.update).toHaveBeenCalledWith({
          where: { id: mockCaseId },
          data: expect.objectContaining({
            secondaryCategoryId: "cat-003",
          }),
        });
      });

      it("should update severity", async () => {
        // Act
        await service.updateClassification({
          caseId: mockCaseId,
          severity: Severity.HIGH,
          notes: "Escalated due to new information",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(prisma.case.update).toHaveBeenCalledWith({
          where: { id: mockCaseId },
          data: expect.objectContaining({
            severity: Severity.HIGH,
          }),
        });
      });

      it("should set classificationChangedAt timestamp", async () => {
        // Act
        await service.updateClassification({
          caseId: mockCaseId,
          primaryCategoryId: "cat-002",
          notes: "Reclassified",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(prisma.case.update).toHaveBeenCalledWith({
          where: { id: mockCaseId },
          data: expect.objectContaining({
            classificationChangedAt: expect.any(Date),
          }),
        });
      });

      it("should log activity with changed fields", async () => {
        // Act
        await service.updateClassification({
          caseId: mockCaseId,
          primaryCategoryId: "cat-002",
          severity: Severity.HIGH,
          notes: "Multiple changes",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(activityService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: AuditEntityType.CASE,
            entityId: mockCaseId,
            action: "classification_updated",
            actionDescription: expect.stringContaining(
              "Updated classification",
            ),
            actorUserId: mockUserId,
            organizationId: mockOrgId,
          }),
        );
      });

      it("should log activity for notes-only update", async () => {
        // Act
        await service.updateClassification({
          caseId: mockCaseId,
          notes: "Just adding notes",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(activityService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            actionDescription: expect.stringContaining(
              "Added classification notes",
            ),
          }),
        );
      });

      it("should emit case.classification_updated event", async () => {
        // Act
        await service.updateClassification({
          caseId: mockCaseId,
          primaryCategoryId: "cat-002",
          notes: "Reclassified",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          "case.classification_updated",
          expect.objectContaining({
            organizationId: mockOrgId,
            actorUserId: mockUserId,
            caseId: mockCaseId,
            referenceNumber: mockReferenceNumber,
            notes: "Reclassified",
          }),
        );
      });

      it("should allow setting category to null", async () => {
        // Act
        await service.updateClassification({
          caseId: mockCaseId,
          primaryCategoryId: null,
          notes: "Removing category",
          userId: mockUserId,
          organizationId: mockOrgId,
        });

        // Assert
        expect(prisma.case.update).toHaveBeenCalledWith({
          where: { id: mockCaseId },
          data: expect.objectContaining({
            primaryCategoryId: null,
          }),
        });
      });
    });
  });

  describe("getPipelineHistory", () => {
    it("should throw NotFoundException when case not found", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getPipelineHistory("non-existent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return empty array when no history exists", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getPipelineHistory(mockCaseId, mockOrgId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return pipeline history with stage transitions", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          id: "log-1",
          createdAt: new Date("2026-01-16T10:00:00Z"),
          changes: {
            newValue: {
              pipelineStage: "assigned",
              notes: "Initial assignment",
            },
          },
          actorUser: { id: mockUserId, firstName: "John", lastName: "Doe" },
        },
        {
          id: "log-2",
          createdAt: new Date("2026-01-15T10:00:00Z"),
          changes: { newValue: { pipelineStage: "new" } },
          actorUser: { id: mockUserId, firstName: "John", lastName: "Doe" },
        },
      ]);

      // Act
      const result = await service.getPipelineHistory(mockCaseId, mockOrgId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        stage: "assigned",
        notes: "Initial assignment",
        changedBy: { id: mockUserId, firstName: "John", lastName: "Doe" },
      });
      expect(result[1]).toMatchObject({
        stage: "new",
      });
    });

    it("should query audit logs with correct filters", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await service.getPipelineHistory(mockCaseId, mockOrgId);

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrgId,
          entityType: AuditEntityType.CASE,
          entityId: mockCaseId,
          action: "pipeline_stage_changed",
        },
        orderBy: { createdAt: "desc" },
        include: {
          actorUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    });

    it("should handle missing stage in changes gracefully", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          id: "log-1",
          createdAt: new Date("2026-01-16T10:00:00Z"),
          changes: { newValue: {} },
          actorUser: null,
        },
      ]);

      // Act
      const result = await service.getPipelineHistory(mockCaseId, mockOrgId);

      // Assert
      expect(result[0].stage).toBe("Unknown");
    });
  });

  describe("event emission error handling", () => {
    it("should not fail moveToStage if event emission throws", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue({
        ...mockCase,
        pipelineStage: "assigned",
      });
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error("Event emission failed");
      });

      // Act - Should not throw
      const result = await service.moveToStage({
        caseId: mockCaseId,
        stage: "assigned",
        userId: mockUserId,
        organizationId: mockOrgId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.pipelineStage).toBe("assigned");
    });

    it("should not fail setOutcome if event emission throws", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue({
        ...mockCase,
        outcome: CaseOutcome.SUBSTANTIATED,
      });
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error("Event emission failed");
      });

      // Act - Should not throw
      const result = await service.setOutcome({
        caseId: mockCaseId,
        outcome: CaseOutcome.SUBSTANTIATED,
        notes: "Test",
        userId: mockUserId,
        organizationId: mockOrgId,
      });

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe("tenant isolation", () => {
    it("should include organizationId in all case queries", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.case.update.mockResolvedValue(mockCase);

      // Act
      await service.moveToStage({
        caseId: mockCaseId,
        stage: "assigned",
        userId: mockUserId,
        organizationId: mockOrgId,
      });

      // Assert
      expect(prisma.case.findFirst).toHaveBeenCalledWith({
        where: { id: mockCaseId, organizationId: mockOrgId },
      });
    });

    it("should include organizationId in audit log queries", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await service.getPipelineHistory(mockCaseId, mockOrgId);

      // Assert
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        }),
      );
    });
  });
});
