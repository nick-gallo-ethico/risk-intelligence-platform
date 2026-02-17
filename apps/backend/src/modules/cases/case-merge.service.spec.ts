import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CaseMergeService } from "./case-merge.service";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import {
  CaseStatus,
  RiuAssociationType,
  AuditEntityType,
} from "@prisma/client";

describe("CaseMergeService", () => {
  let service: CaseMergeService;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockSourceCaseId = "source-case-123";
  const mockTargetCaseId = "target-case-456";

  const mockSourceCase = {
    id: mockSourceCaseId,
    referenceNumber: "ETH-2026-00001",
    organizationId: mockOrgId,
    status: CaseStatus.OPEN,
    isMerged: false,
    mergedIntoCaseId: null,
    mergedAt: null,
    mergedById: null,
    mergedReason: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  };

  const mockTargetCase = {
    id: mockTargetCaseId,
    referenceNumber: "ETH-2026-00002",
    organizationId: mockOrgId,
    status: CaseStatus.OPEN,
    isMerged: false,
    mergedIntoCaseId: null,
    createdAt: new Date("2026-01-14T10:00:00Z"),
    updatedAt: new Date("2026-01-14T10:00:00Z"),
  };

  // Mock Prisma with transaction support
  const createMockPrisma = () => {
    const mockTx = {
      riuCaseAssociation: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      subject: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      investigation: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      caseMessage: {
        updateMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
      interaction: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      case: {
        update: jest.fn().mockResolvedValue(mockSourceCase),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    return {
      case: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      // Transaction mock - executes callback with mock tx
      $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) =>
        cb(mockTx),
      ),
      _mockTx: mockTx, // Expose for test assertions
    };
  };

  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const mockActivityService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseMergeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<CaseMergeService>(CaseMergeService);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  // Test merge() method

  describe("merge()", () => {
    describe("validation", () => {
      it("should reject merging case into itself", async () => {
        // Arrange
        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockSourceCaseId, // Same as source
          reason: "Test merge reason",
        };

        // Act & Assert
        await expect(service.merge(dto, mockUserId, mockOrgId)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.merge(dto, mockUserId, mockOrgId)).rejects.toThrow(
          "Cannot merge a case into itself",
        );
      });

      it("should reject when source case not found", async () => {
        // Arrange - Implementation uses Promise.all, so mock based on call args
        mockPrisma.case.findFirst.mockImplementation(({ where }) => {
          if (where.id === "non-existent-source") return Promise.resolve(null);
          if (where.id === mockTargetCaseId)
            return Promise.resolve(mockTargetCase);
          return Promise.resolve(null);
        });

        const dto = {
          sourceCaseId: "non-existent-source",
          targetCaseId: mockTargetCaseId,
          reason: "Test merge reason",
        };

        // Act & Assert
        await expect(service.merge(dto, mockUserId, mockOrgId)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.merge(dto, mockUserId, mockOrgId)).rejects.toThrow(
          "Source case with ID non-existent-source not found",
        );
      });

      it("should reject when target case not found", async () => {
        // Arrange - Implementation uses Promise.all, so mock based on call args
        mockPrisma.case.findFirst.mockImplementation(({ where }) => {
          if (where.id === mockSourceCaseId)
            return Promise.resolve(mockSourceCase);
          if (where.id === "non-existent-target") return Promise.resolve(null);
          return Promise.resolve(null);
        });

        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: "non-existent-target",
          reason: "Test merge reason",
        };

        // Act & Assert
        await expect(service.merge(dto, mockUserId, mockOrgId)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.merge(dto, mockUserId, mockOrgId)).rejects.toThrow(
          "Target case with ID non-existent-target not found",
        );
      });

      it("should reject when source case already merged", async () => {
        // Arrange
        const alreadyMergedCase = {
          ...mockSourceCase,
          isMerged: true,
          mergedIntoCaseId: "other-case-id",
        };
        mockPrisma.case.findFirst.mockImplementation(({ where }) => {
          if (where.id === mockSourceCaseId)
            return Promise.resolve(alreadyMergedCase);
          if (where.id === mockTargetCaseId)
            return Promise.resolve(mockTargetCase);
          return Promise.resolve(null);
        });

        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Test merge reason",
        };

        // Act & Assert
        await expect(service.merge(dto, mockUserId, mockOrgId)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.merge(dto, mockUserId, mockOrgId)).rejects.toThrow(
          "has already been merged",
        );
      });

      it("should reject when target case is already a tombstone", async () => {
        // Arrange
        const tombstoneTarget = {
          ...mockTargetCase,
          isMerged: true,
          mergedIntoCaseId: "another-case",
        };
        mockPrisma.case.findFirst.mockImplementation(({ where }) => {
          if (where.id === mockSourceCaseId)
            return Promise.resolve(mockSourceCase);
          if (where.id === mockTargetCaseId)
            return Promise.resolve(tombstoneTarget);
          return Promise.resolve(null);
        });

        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Test merge reason",
        };

        // Act & Assert
        await expect(service.merge(dto, mockUserId, mockOrgId)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.merge(dto, mockUserId, mockOrgId)).rejects.toThrow(
          "already merged into another case",
        );
      });
    });

    describe("successful merge", () => {
      beforeEach(() => {
        // Setup for successful merge scenarios - use mockImplementation for Promise.all
        mockPrisma.case.findFirst.mockImplementation(({ where }) => {
          if (where.id === mockSourceCaseId)
            return Promise.resolve(mockSourceCase);
          if (where.id === mockTargetCaseId)
            return Promise.resolve(mockTargetCase);
          return Promise.resolve(null);
        });
      });

      it("should move all RIU associations from source to target", async () => {
        // Arrange
        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Related reports consolidated",
        };

        // Act
        await service.merge(dto, mockUserId, mockOrgId);

        // Assert
        expect(
          mockPrisma._mockTx.riuCaseAssociation.updateMany,
        ).toHaveBeenCalledWith({
          where: { caseId: mockSourceCaseId },
          data: {
            caseId: mockTargetCaseId,
            associationType: RiuAssociationType.MERGED_FROM,
          },
        });
      });

      it("should move all Subject associations from source to target", async () => {
        // Arrange
        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Related reports consolidated",
        };

        // Act
        await service.merge(dto, mockUserId, mockOrgId);

        // Assert
        expect(mockPrisma._mockTx.subject.updateMany).toHaveBeenCalledWith({
          where: { caseId: mockSourceCaseId },
          data: { caseId: mockTargetCaseId },
        });
      });

      it("should move all Investigation links from source to target", async () => {
        // Arrange
        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Related reports consolidated",
        };

        // Act
        await service.merge(dto, mockUserId, mockOrgId);

        // Assert
        expect(
          mockPrisma._mockTx.investigation.updateMany,
        ).toHaveBeenCalledWith({
          where: { caseId: mockSourceCaseId },
          data: { caseId: mockTargetCaseId },
        });
      });

      it("should move all CaseMessage records from source to target", async () => {
        // Arrange
        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Related reports consolidated",
        };

        // Act
        await service.merge(dto, mockUserId, mockOrgId);

        // Assert
        expect(mockPrisma._mockTx.caseMessage.updateMany).toHaveBeenCalledWith({
          where: { caseId: mockSourceCaseId },
          data: { caseId: mockTargetCaseId },
        });
      });

      it("should move all Interaction records from source to target", async () => {
        // Arrange
        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Related reports consolidated",
        };

        // Act
        await service.merge(dto, mockUserId, mockOrgId);

        // Assert
        expect(mockPrisma._mockTx.interaction.updateMany).toHaveBeenCalledWith({
          where: { caseId: mockSourceCaseId },
          data: { caseId: mockTargetCaseId },
        });
      });

      it("should update source case status to CLOSED", async () => {
        // Arrange
        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Related reports consolidated",
        };

        // Act
        await service.merge(dto, mockUserId, mockOrgId);

        // Assert
        expect(mockPrisma._mockTx.case.update).toHaveBeenCalledWith({
          where: { id: mockSourceCaseId },
          data: expect.objectContaining({
            status: CaseStatus.CLOSED,
          }),
        });
      });

      it("should set mergedIntoCaseId on source case", async () => {
        // Arrange
        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Related reports consolidated",
        };

        // Act
        await service.merge(dto, mockUserId, mockOrgId);

        // Assert
        expect(mockPrisma._mockTx.case.update).toHaveBeenCalledWith({
          where: { id: mockSourceCaseId },
          data: expect.objectContaining({
            isMerged: true,
            mergedIntoCaseId: mockTargetCaseId,
            mergedReason: "Related reports consolidated",
            mergedById: mockUserId,
          }),
        });
      });

      it("should log activity on source case", async () => {
        // Arrange
        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Related reports consolidated",
        };

        // Act
        await service.merge(dto, mockUserId, mockOrgId);

        // Assert
        expect(activityService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: AuditEntityType.CASE,
            entityId: mockSourceCaseId,
            action: "merged",
            actorUserId: mockUserId,
            organizationId: mockOrgId,
          }),
        );
      });

      it("should log activity on target case", async () => {
        // Arrange
        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Related reports consolidated",
        };

        // Act
        await service.merge(dto, mockUserId, mockOrgId);

        // Assert
        expect(activityService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: AuditEntityType.CASE,
            entityId: mockTargetCaseId,
            action: "received_merge",
            actorUserId: mockUserId,
            organizationId: mockOrgId,
          }),
        );
      });

      it("should emit case.merged event with correct payload", async () => {
        // Arrange
        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Related reports consolidated",
        };

        // Act
        await service.merge(dto, mockUserId, mockOrgId);

        // Assert
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          "case.merged",
          expect.objectContaining({
            organizationId: mockOrgId,
            actorUserId: mockUserId,
            sourceCaseId: mockSourceCaseId,
            targetCaseId: mockTargetCaseId,
            reason: "Related reports consolidated",
            riuAssociationsMoved: 2,
            subjectsMoved: 3,
            investigationsMoved: 1,
          }),
        );
      });

      it("should return correct merge result DTO", async () => {
        // Arrange
        const dto = {
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          reason: "Related reports consolidated",
        };

        // Act
        const result = await service.merge(dto, mockUserId, mockOrgId);

        // Assert
        expect(result).toMatchObject({
          sourceCaseId: mockSourceCaseId,
          targetCaseId: mockTargetCaseId,
          sourceReferenceNumber: "ETH-2026-00001",
          targetReferenceNumber: "ETH-2026-00002",
          riuAssociationsMoved: 2,
          subjectsMoved: 3,
          investigationsMoved: 1,
        });
        expect(result.mergedAt).toBeInstanceOf(Date);
      });
    });
  });

  // Test getMergeHistory() method

  describe("getMergeHistory()", () => {
    it("should throw NotFoundException when case not found", async () => {
      // Arrange
      mockPrisma.case.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getMergeHistory(mockTargetCaseId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return empty array when no merged cases exist", async () => {
      // Arrange
      mockPrisma.case.findFirst.mockResolvedValue(mockTargetCase);
      mockPrisma.case.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getMergeHistory(mockTargetCaseId, mockOrgId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return merge history with merged case details", async () => {
      // Arrange
      const mergedCase = {
        id: mockSourceCaseId,
        referenceNumber: "ETH-2026-00001",
        mergedReason: "Related reports consolidated",
        mergedAt: new Date("2026-01-20T10:00:00Z"),
        mergedBy: {
          id: mockUserId,
          firstName: "John",
          lastName: "Doe",
        },
      };
      mockPrisma.case.findFirst.mockResolvedValue(mockTargetCase);
      mockPrisma.case.findMany.mockResolvedValue([mergedCase]);

      // Act
      const result = await service.getMergeHistory(mockTargetCaseId, mockOrgId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        mergedCaseId: mockSourceCaseId,
        mergedCaseReferenceNumber: "ETH-2026-00001",
        reason: "Related reports consolidated",
        mergedBy: { id: mockUserId, firstName: "John", lastName: "Doe" },
      });
    });

    it("should provide default reason when mergedReason is null", async () => {
      // Arrange
      const mergedCase = {
        id: mockSourceCaseId,
        referenceNumber: "ETH-2026-00001",
        mergedReason: null,
        mergedAt: new Date("2026-01-20T10:00:00Z"),
        mergedBy: null,
      };
      mockPrisma.case.findFirst.mockResolvedValue(mockTargetCase);
      mockPrisma.case.findMany.mockResolvedValue([mergedCase]);

      // Act
      const result = await service.getMergeHistory(mockTargetCaseId, mockOrgId);

      // Assert
      expect(result[0].reason).toBe("No reason provided");
    });
  });

  // Test getPrimaryCase() method

  describe("getPrimaryCase()", () => {
    it("should throw NotFoundException when initial case not found", async () => {
      // Arrange
      mockPrisma.case.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getPrimaryCase(mockSourceCaseId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return the same case if not merged", async () => {
      // Arrange
      mockPrisma.case.findFirst.mockResolvedValue(mockSourceCase);

      // Act
      const result = await service.getPrimaryCase(mockSourceCaseId, mockOrgId);

      // Assert
      expect(result).toEqual(mockSourceCase);
    });

    it("should follow merge chain to find primary case", async () => {
      // Arrange - Source merged into intermediate, intermediate merged into primary
      const mergedSource = {
        ...mockSourceCase,
        isMerged: true,
        mergedIntoCaseId: "intermediate-case-id",
      };
      const intermediateCase = {
        id: "intermediate-case-id",
        referenceNumber: "ETH-2026-00002",
        organizationId: mockOrgId,
        isMerged: true,
        mergedIntoCaseId: "primary-case-id",
      };
      const primaryCase = {
        id: "primary-case-id",
        referenceNumber: "ETH-2026-00003",
        organizationId: mockOrgId,
        isMerged: false,
        mergedIntoCaseId: null,
      };

      mockPrisma.case.findFirst
        .mockResolvedValueOnce(mergedSource)
        .mockResolvedValueOnce(intermediateCase)
        .mockResolvedValueOnce(primaryCase);

      // Act
      const result = await service.getPrimaryCase(mockSourceCaseId, mockOrgId);

      // Assert
      expect(result).toEqual(primaryCase);
      expect(mockPrisma.case.findFirst).toHaveBeenCalledTimes(3);
    });

    it("should handle broken merge chain gracefully", async () => {
      // Arrange - Source merged into non-existent case
      const mergedSource = {
        ...mockSourceCase,
        isMerged: true,
        mergedIntoCaseId: "missing-case-id",
      };

      mockPrisma.case.findFirst
        .mockResolvedValueOnce(mergedSource)
        .mockResolvedValueOnce(null); // Next case in chain not found

      // Act
      const result = await service.getPrimaryCase(mockSourceCaseId, mockOrgId);

      // Assert - Should return the current case when chain is broken
      expect(result).toEqual(mergedSource);
    });
  });

  // Test canMerge() method

  describe("canMerge()", () => {
    it("should return false when merging case into itself", async () => {
      // Act
      const result = await service.canMerge(
        mockSourceCaseId,
        mockSourceCaseId,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual({
        canMerge: false,
        reason: "Cannot merge a case into itself",
      });
    });

    it("should return false when source case not found", async () => {
      // Arrange
      mockPrisma.case.findFirst.mockResolvedValueOnce(null);
      mockPrisma.case.findFirst.mockResolvedValueOnce(mockTargetCase);

      // Act
      const result = await service.canMerge(
        mockSourceCaseId,
        mockTargetCaseId,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual({
        canMerge: false,
        reason: "Source case not found",
      });
    });

    it("should return false when target case not found", async () => {
      // Arrange
      mockPrisma.case.findFirst.mockResolvedValueOnce(mockSourceCase);
      mockPrisma.case.findFirst.mockResolvedValueOnce(null);

      // Act
      const result = await service.canMerge(
        mockSourceCaseId,
        mockTargetCaseId,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual({
        canMerge: false,
        reason: "Target case not found",
      });
    });

    it("should return false when source case already merged", async () => {
      // Arrange
      const alreadyMergedSource = { ...mockSourceCase, isMerged: true };
      mockPrisma.case.findFirst.mockResolvedValueOnce(alreadyMergedSource);
      mockPrisma.case.findFirst.mockResolvedValueOnce(mockTargetCase);

      // Act
      const result = await service.canMerge(
        mockSourceCaseId,
        mockTargetCaseId,
        mockOrgId,
      );

      // Assert
      expect(result.canMerge).toBe(false);
      expect(result.reason).toContain("has already been merged");
    });

    it("should return false when target case is a tombstone", async () => {
      // Arrange
      const tombstoneTarget = { ...mockTargetCase, isMerged: true };
      mockPrisma.case.findFirst.mockResolvedValueOnce(mockSourceCase);
      mockPrisma.case.findFirst.mockResolvedValueOnce(tombstoneTarget);

      // Act
      const result = await service.canMerge(
        mockSourceCaseId,
        mockTargetCaseId,
        mockOrgId,
      );

      // Assert
      expect(result.canMerge).toBe(false);
      expect(result.reason).toContain("is a tombstone");
    });

    it("should return true when both cases can be merged", async () => {
      // Arrange
      mockPrisma.case.findFirst.mockResolvedValueOnce(mockSourceCase);
      mockPrisma.case.findFirst.mockResolvedValueOnce(mockTargetCase);

      // Act
      const result = await service.canMerge(
        mockSourceCaseId,
        mockTargetCaseId,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual({ canMerge: true });
    });
  });

  // Test error handling for event emission

  describe("event emission error handling", () => {
    it("should not fail merge if event emission throws", async () => {
      // Arrange
      mockPrisma.case.findFirst.mockResolvedValueOnce(mockSourceCase);
      mockPrisma.case.findFirst.mockResolvedValueOnce(mockTargetCase);
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error("Event emission failed");
      });

      const dto = {
        sourceCaseId: mockSourceCaseId,
        targetCaseId: mockTargetCaseId,
        reason: "Test merge reason",
      };

      // Act - Should not throw despite event emission failure
      const result = await service.merge(dto, mockUserId, mockOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(result.sourceCaseId).toBe(mockSourceCaseId);
    });
  });

  // Test tenant isolation via organization scoping

  describe("tenant isolation", () => {
    it("should only query cases within the same organization", async () => {
      // Arrange
      const dto = {
        sourceCaseId: mockSourceCaseId,
        targetCaseId: mockTargetCaseId,
        reason: "Test merge reason",
      };
      mockPrisma.case.findFirst.mockResolvedValueOnce(mockSourceCase);
      mockPrisma.case.findFirst.mockResolvedValueOnce(mockTargetCase);

      // Act
      await service.merge(dto, mockUserId, mockOrgId);

      // Assert - Both queries should include organizationId filter
      expect(mockPrisma.case.findFirst).toHaveBeenCalledWith({
        where: { id: mockSourceCaseId, organizationId: mockOrgId },
      });
      expect(mockPrisma.case.findFirst).toHaveBeenCalledWith({
        where: { id: mockTargetCaseId, organizationId: mockOrgId },
      });
    });
  });
});
