import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConflictDetectionService } from "./conflict-detection.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  ConflictMatchingService,
  DetectedConflict,
} from "./services/conflict-matching.service";
import { ConflictExclusionService } from "./services/conflict-exclusion.service";
import {
  ConflictType,
  ConflictSeverity,
  ConflictStatus,
  ExclusionScope,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";
import { DismissalCategory } from "./dto/conflict.dto";

describe("ConflictDetectionService", () => {
  let service: ConflictDetectionService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let matchingService: jest.Mocked<ConflictMatchingService>;
  let exclusionService: jest.Mocked<ConflictExclusionService>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockDisclosureId = "disclosure-123";
  const mockPersonId = "person-123";
  const mockAlertId = "alert-123";

  const mockDisclosure = {
    riuId: mockDisclosureId,
    organizationId: mockOrgId,
    relatedCompany: "Acme Corp",
    relatedPersonName: "John Smith",
    disclosureType: "FINANCIAL_INTEREST",
    disclosureValue: 50000,
    createdAt: new Date("2026-01-15"),
    riu: {
      id: mockDisclosureId,
      referenceNumber: "DIS-2026-00001",
      details: "Financial interest in vendor company",
      createdById: mockPersonId,
    },
  };

  const mockSelfDealingConflict: DetectedConflict = {
    conflictType: ConflictType.SELF_DEALING,
    severity: ConflictSeverity.HIGH,
    summary: 'Prior disclosure to "Acme Corp" found (85% match)',
    matchedEntity: "Acme Corp",
    matchConfidence: 85,
    matchDetails: {
      disclosureContext: {
        priorDisclosureIds: ["disclosure-previous"],
        totalValue: 25000,
        disclosureTypes: ["FINANCIAL_INTEREST"],
      },
    },
    severityFactors: {
      factors: ["Prior disclosure with same entity"],
      matchConfidence: 85,
    },
  };

  const mockHrisMatchConflict: DetectedConflict = {
    conflictType: ConflictType.HRIS_MATCH,
    severity: ConflictSeverity.MEDIUM,
    summary: 'Name matches employee "John Smith" (90% match)',
    matchedEntity: "John Smith",
    matchConfidence: 90,
    matchDetails: {
      employeeContext: {
        employeeId: "emp-456",
        name: "John Smith",
        department: "Engineering",
        jobTitle: "Senior Engineer",
      },
    },
    severityFactors: {
      factors: ["Name matches active employee"],
      matchConfidence: 90,
    },
  };

  const mockPriorCaseConflict: DetectedConflict = {
    conflictType: ConflictType.PRIOR_CASE_HISTORY,
    severity: ConflictSeverity.HIGH,
    summary: "Entity appears in 3 prior case(s)",
    matchedEntity: "Acme Corp",
    matchConfidence: 85,
    matchDetails: {
      caseContext: {
        caseIds: ["case-1", "case-2", "case-3"],
        caseTypes: ["OPEN", "CLOSED", "CLOSED"],
        outcomes: ["SUBSTANTIATED", "UNSUBSTANTIATED"],
        roles: ["SUBJECT", "WITNESS"],
      },
    },
    severityFactors: {
      factors: ["Appeared in 3 prior cases"],
      historicalOccurrences: 3,
    },
  };

  const mockRelationshipPatternConflict: DetectedConflict = {
    conflictType: ConflictType.RELATIONSHIP_PATTERN,
    severity: ConflictSeverity.MEDIUM,
    summary: '4 employees have disclosed relationships with "Acme Corp"',
    matchedEntity: "Acme Corp",
    matchConfidence: 80,
    matchDetails: {
      disclosureContext: {
        priorDisclosureIds: ["dis-1", "dis-2", "dis-3"],
      },
    },
    severityFactors: {
      factors: ["Multiple employees (4) involved"],
      historicalOccurrences: 4,
    },
  };

  const mockConflictAlert = {
    id: mockAlertId,
    organizationId: mockOrgId,
    disclosureId: mockDisclosureId,
    conflictType: ConflictType.SELF_DEALING,
    severity: ConflictSeverity.HIGH,
    status: ConflictStatus.OPEN,
    summary: 'Prior disclosure to "Acme Corp" found',
    matchedEntity: "Acme Corp",
    matchConfidence: 85,
    matchDetails: {},
    severityFactors: null,
    dismissedCategory: null,
    dismissedReason: null,
    dismissedBy: null,
    dismissedAt: null,
    escalatedToCaseId: null,
    exclusionId: null,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
  };

  // Create mock services
  const createMockPrisma = () => ({
    riuDisclosureExtension: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    conflictAlert: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    conflictExclusion: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    person: {
      findFirst: jest.fn(),
    },
    subject: {
      findMany: jest.fn(),
    },
    case: {
      findMany: jest.fn(),
    },
  });

  const createMockMatchingService = () => ({
    checkSelfDealing: jest.fn().mockResolvedValue([]),
    checkHrisMatch: jest.fn().mockResolvedValue([]),
    checkPriorCases: jest.fn().mockResolvedValue([]),
    checkRelationshipPatterns: jest.fn().mockResolvedValue([]),
    fuzzyMatch: jest.fn(),
    calculateSimilarity: jest.fn(),
    determineSeverity: jest.fn(),
  });

  const createMockExclusionService = () => ({
    isExcluded: jest.fn().mockResolvedValue({ excluded: false }),
    createExclusion: jest.fn(),
    findExclusions: jest.fn(),
    deactivateExclusion: jest.fn(),
    mapExclusionToDto: jest.fn(),
  });

  const createMockAuditService = () => ({
    log: jest.fn().mockResolvedValue(undefined),
  });

  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockMatchingService: ReturnType<typeof createMockMatchingService>;
  let mockExclusionService: ReturnType<typeof createMockExclusionService>;
  let mockAuditService: ReturnType<typeof createMockAuditService>;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockMatchingService = createMockMatchingService();
    mockExclusionService = createMockExclusionService();
    mockAuditService = createMockAuditService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConflictDetectionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ConflictMatchingService, useValue: mockMatchingService },
        { provide: ConflictExclusionService, useValue: mockExclusionService },
      ],
    }).compile();

    service = module.get<ConflictDetectionService>(ConflictDetectionService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
    eventEmitter = module.get(EventEmitter2);
    matchingService = module.get(ConflictMatchingService);
    exclusionService = module.get(ConflictExclusionService);

    jest.clearAllMocks();
  });

  // detectConflicts() Tests - Main detection entry point

  describe("detectConflicts()", () => {
    beforeEach(() => {
      mockPrisma.riuDisclosureExtension.findUnique.mockResolvedValue(
        mockDisclosure,
      );
      mockPrisma.conflictAlert.create.mockImplementation((args: any) => ({
        ...args.data,
        id: `alert-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    });

    it("should throw NotFoundException when disclosure not found", async () => {
      // Arrange
      mockPrisma.riuDisclosureExtension.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.detectConflicts(mockDisclosureId, mockPersonId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.detectConflicts(mockDisclosureId, mockPersonId, mockOrgId),
      ).rejects.toThrow(`Disclosure ${mockDisclosureId} not found`);
    });

    it("should return empty conflicts when no conflicts detected", async () => {
      // Arrange - all checks return empty
      mockMatchingService.checkSelfDealing.mockResolvedValue([]);
      mockMatchingService.checkHrisMatch.mockResolvedValue([]);
      mockMatchingService.checkPriorCases.mockResolvedValue([]);
      mockMatchingService.checkRelationshipPatterns.mockResolvedValue([]);

      // Act
      const result = await service.detectConflicts(
        mockDisclosureId,
        mockPersonId,
        mockOrgId,
      );

      // Assert
      expect(result.conflictCount).toBe(0);
      expect(result.conflicts).toHaveLength(0);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("should detect SELF_DEALING conflict from prior disclosures", async () => {
      // Arrange - disclosure with only company (not person name) to simplify
      const singleEntityDisclosure = {
        ...mockDisclosure,
        relatedPersonName: null, // Only check company
      };
      mockPrisma.riuDisclosureExtension.findUnique.mockResolvedValue(
        singleEntityDisclosure,
      );
      mockMatchingService.checkSelfDealing.mockResolvedValue([
        mockSelfDealingConflict,
      ]);

      // Act
      const result = await service.detectConflicts(
        mockDisclosureId,
        mockPersonId,
        mockOrgId,
      );

      // Assert
      expect(result.conflictCount).toBe(1);
      expect(result.conflicts[0].conflictType).toBe(ConflictType.SELF_DEALING);
      expect(result.conflicts[0].matchedEntity).toBe("Acme Corp");
      expect(mockPrisma.conflictAlert.create).toHaveBeenCalled();
    });

    it("should detect HRIS_MATCH conflict when disclosed name matches employee", async () => {
      // Arrange - disclosure with only person name
      const personOnlyDisclosure = {
        ...mockDisclosure,
        relatedCompany: null, // Only check person name
      };
      mockPrisma.riuDisclosureExtension.findUnique.mockResolvedValue(
        personOnlyDisclosure,
      );
      mockMatchingService.checkHrisMatch.mockResolvedValue([
        mockHrisMatchConflict,
      ]);

      // Act
      const result = await service.detectConflicts(
        mockDisclosureId,
        mockPersonId,
        mockOrgId,
      );

      // Assert
      expect(result.conflictCount).toBe(1);
      expect(result.conflicts[0].conflictType).toBe(ConflictType.HRIS_MATCH);
      expect(result.conflicts[0].matchedEntity).toBe("John Smith");
    });

    it("should detect PRIOR_CASE_HISTORY conflict when entity appears in cases", async () => {
      // Arrange
      const singleEntityDisclosure = {
        ...mockDisclosure,
        relatedPersonName: null,
      };
      mockPrisma.riuDisclosureExtension.findUnique.mockResolvedValue(
        singleEntityDisclosure,
      );
      mockMatchingService.checkPriorCases.mockResolvedValue([
        mockPriorCaseConflict,
      ]);

      // Act
      const result = await service.detectConflicts(
        mockDisclosureId,
        mockPersonId,
        mockOrgId,
      );

      // Assert
      expect(result.conflictCount).toBe(1);
      expect(result.conflicts[0].conflictType).toBe(
        ConflictType.PRIOR_CASE_HISTORY,
      );
      expect(result.conflicts[0].matchDetails.caseContext).toBeDefined();
    });

    it("should detect RELATIONSHIP_PATTERN conflict when multiple employees involved", async () => {
      // Arrange
      const singleEntityDisclosure = {
        ...mockDisclosure,
        relatedPersonName: null,
      };
      mockPrisma.riuDisclosureExtension.findUnique.mockResolvedValue(
        singleEntityDisclosure,
      );
      mockMatchingService.checkRelationshipPatterns.mockResolvedValue([
        mockRelationshipPatternConflict,
      ]);

      // Act
      const result = await service.detectConflicts(
        mockDisclosureId,
        mockPersonId,
        mockOrgId,
      );

      // Assert
      expect(result.conflictCount).toBe(1);
      expect(result.conflicts[0].conflictType).toBe(
        ConflictType.RELATIONSHIP_PATTERN,
      );
    });

    it("should detect multiple conflicts in single disclosure", async () => {
      // Arrange - disclosure with only company to get predictable conflict count
      const singleEntityDisclosure = {
        ...mockDisclosure,
        relatedPersonName: null,
      };
      mockPrisma.riuDisclosureExtension.findUnique.mockResolvedValue(
        singleEntityDisclosure,
      );
      mockMatchingService.checkSelfDealing.mockResolvedValue([
        mockSelfDealingConflict,
      ]);
      mockMatchingService.checkHrisMatch.mockResolvedValue([
        mockHrisMatchConflict,
      ]);
      mockMatchingService.checkPriorCases.mockResolvedValue([
        mockPriorCaseConflict,
      ]);

      // Act
      const result = await service.detectConflicts(
        mockDisclosureId,
        mockPersonId,
        mockOrgId,
      );

      // Assert
      expect(result.conflictCount).toBe(3);
      const conflictTypes = result.conflicts.map((c: any) => c.conflictType);
      expect(conflictTypes).toContain(ConflictType.SELF_DEALING);
      expect(conflictTypes).toContain(ConflictType.HRIS_MATCH);
      expect(conflictTypes).toContain(ConflictType.PRIOR_CASE_HISTORY);
    });

    it("should emit conflict.detected event when conflicts found", async () => {
      // Arrange
      const singleEntityDisclosure = {
        ...mockDisclosure,
        relatedPersonName: null,
      };
      mockPrisma.riuDisclosureExtension.findUnique.mockResolvedValue(
        singleEntityDisclosure,
      );
      mockMatchingService.checkSelfDealing.mockResolvedValue([
        mockSelfDealingConflict,
      ]);

      // Act
      await service.detectConflicts(mockDisclosureId, mockPersonId, mockOrgId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "conflict.detected",
        expect.objectContaining({
          organizationId: mockOrgId,
          disclosureId: mockDisclosureId,
          personId: mockPersonId,
          conflictCount: 1,
        }),
      );
    });

    it("should exclude conflicts that match existing exclusions", async () => {
      // Arrange
      const singleEntityDisclosure = {
        ...mockDisclosure,
        relatedPersonName: null,
      };
      mockPrisma.riuDisclosureExtension.findUnique.mockResolvedValue(
        singleEntityDisclosure,
      );
      mockMatchingService.checkSelfDealing.mockResolvedValue([
        mockSelfDealingConflict,
      ]);
      mockExclusionService.isExcluded.mockResolvedValue({
        excluded: true,
        exclusionId: "exclusion-123",
      });

      // Act
      const result = await service.detectConflicts(
        mockDisclosureId,
        mockPersonId,
        mockOrgId,
      );

      // Assert
      expect(result.conflictCount).toBe(0);
      expect(result.excludedConflictCount).toBe(1);
      expect(result.appliedExclusionIds).toContain("exclusion-123");
    });

    it("should use custom fuzzy match config when provided", async () => {
      // Arrange
      const customConfig = {
        minThreshold: 80,
        lowConfidenceThreshold: 85,
        highConfidenceThreshold: 95,
        exactMatchThreshold: 100,
      };

      // Act
      await service.detectConflicts(
        mockDisclosureId,
        mockPersonId,
        mockOrgId,
        customConfig,
      );

      // Assert
      expect(mockMatchingService.checkSelfDealing).toHaveBeenCalledWith(
        expect.any(String),
        mockPersonId,
        mockDisclosureId,
        mockOrgId,
        expect.objectContaining(customConfig),
      );
    });
  });

  // dismissConflict() Tests - Dismissal workflow

  describe("dismissConflict()", () => {
    beforeEach(() => {
      mockPrisma.conflictAlert.findFirst.mockResolvedValue(mockConflictAlert);
      mockPrisma.conflictAlert.update.mockImplementation((args: any) => ({
        ...mockConflictAlert,
        ...args.data,
      }));
    });

    it("should throw NotFoundException when alert not found", async () => {
      // Arrange
      mockPrisma.conflictAlert.findFirst.mockResolvedValue(null);

      const dto = {
        category: DismissalCategory.FALSE_MATCH_DIFFERENT_ENTITY,
        reason: "Not a real conflict",
      };

      // Act & Assert
      await expect(
        service.dismissConflict(mockAlertId, dto, mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when alert not in OPEN status", async () => {
      // Arrange
      mockPrisma.conflictAlert.findFirst.mockResolvedValue({
        ...mockConflictAlert,
        status: ConflictStatus.DISMISSED,
      });

      const dto = {
        category: DismissalCategory.FALSE_MATCH_DIFFERENT_ENTITY,
        reason: "Not a real conflict",
      };

      // Act & Assert
      await expect(
        service.dismissConflict(mockAlertId, dto, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.dismissConflict(mockAlertId, dto, mockUserId, mockOrgId),
      ).rejects.toThrow("Cannot dismiss alert with status DISMISSED");
    });

    it("should throw BadRequestException for invalid dismissal category", async () => {
      // Arrange
      const dto = {
        category: "INVALID_CATEGORY" as DismissalCategory,
        reason: "Test reason",
      };

      // Act & Assert
      await expect(
        service.dismissConflict(mockAlertId, dto, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.dismissConflict(mockAlertId, dto, mockUserId, mockOrgId),
      ).rejects.toThrow("Invalid dismissal category");
    });

    it("should dismiss conflict with FALSE_MATCH_DIFFERENT_ENTITY category", async () => {
      // Arrange
      const dto = {
        category: DismissalCategory.FALSE_MATCH_DIFFERENT_ENTITY,
        reason: "Entity names match but are different companies",
      };

      // Act
      const result = await service.dismissConflict(
        mockAlertId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(mockPrisma.conflictAlert.update).toHaveBeenCalledWith({
        where: { id: mockAlertId },
        data: expect.objectContaining({
          status: ConflictStatus.DISMISSED,
          dismissedCategory: DismissalCategory.FALSE_MATCH_DIFFERENT_ENTITY,
          dismissedReason: dto.reason,
          dismissedBy: mockUserId,
        }),
      });
      expect(result.status).toBe(ConflictStatus.DISMISSED);
    });

    it("should dismiss conflict with PRE_APPROVED_EXCEPTION category", async () => {
      // Arrange
      const dto = {
        category: DismissalCategory.PRE_APPROVED_EXCEPTION,
        reason: "This relationship was pre-approved by compliance",
      };

      // Act
      await service.dismissConflict(mockAlertId, dto, mockUserId, mockOrgId);

      // Assert
      expect(mockPrisma.conflictAlert.update).toHaveBeenCalledWith({
        where: { id: mockAlertId },
        data: expect.objectContaining({
          dismissedCategory: DismissalCategory.PRE_APPROVED_EXCEPTION,
        }),
      });
    });

    it("should dismiss conflict with ALREADY_REVIEWED category", async () => {
      // Arrange
      const dto = {
        category: DismissalCategory.ALREADY_REVIEWED,
        reason: "This conflict was already reviewed in prior disclosure",
      };

      // Act
      await service.dismissConflict(mockAlertId, dto, mockUserId, mockOrgId);

      // Assert
      expect(mockPrisma.conflictAlert.update).toHaveBeenCalledWith({
        where: { id: mockAlertId },
        data: expect.objectContaining({
          dismissedCategory: DismissalCategory.ALREADY_REVIEWED,
        }),
      });
    });

    it("should log audit entry when dismissing conflict", async () => {
      // Arrange
      const dto = {
        category: DismissalCategory.FALSE_MATCH_DIFFERENT_ENTITY,
        reason: "Not a real conflict",
      };

      // Act
      await service.dismissConflict(mockAlertId, dto, mockUserId, mockOrgId);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: mockOrgId,
          entityType: AuditEntityType.DISCLOSURE,
          entityId: mockDisclosureId,
          action: "conflict_dismissed",
          actionCategory: AuditActionCategory.UPDATE,
          actorUserId: mockUserId,
          actorType: ActorType.USER,
        }),
      );
    });

    it("should create exclusion when requested", async () => {
      // Arrange
      mockPrisma.riuDisclosureExtension.findUnique.mockResolvedValue({
        riuId: mockDisclosureId,
        riu: { createdById: mockPersonId },
      });
      mockPrisma.person.findFirst.mockResolvedValue({
        id: mockPersonId,
        email: "test@example.com",
      });
      mockExclusionService.createExclusion.mockResolvedValue({
        id: "exclusion-new",
        personId: mockPersonId,
        matchedEntity: "Acme Corp",
        conflictType: ConflictType.SELF_DEALING,
      });

      const dto = {
        category: DismissalCategory.PRE_APPROVED_EXCEPTION,
        reason: "Pre-approved relationship",
        createExclusion: true,
        exclusionScope: ExclusionScope.PERMANENT,
      };

      // Act
      await service.dismissConflict(mockAlertId, dto, mockUserId, mockOrgId);

      // Assert
      expect(mockExclusionService.createExclusion).toHaveBeenCalled();
      expect(mockPrisma.conflictAlert.update).toHaveBeenCalledWith({
        where: { id: mockAlertId },
        data: expect.objectContaining({
          exclusionId: "exclusion-new",
        }),
      });
    });
  });

  // escalateConflict() Tests

  describe("escalateConflict()", () => {
    beforeEach(() => {
      mockPrisma.conflictAlert.findFirst.mockResolvedValue(mockConflictAlert);
      mockPrisma.conflictAlert.update.mockImplementation((args: any) => ({
        ...mockConflictAlert,
        ...args.data,
      }));
    });

    it("should throw NotFoundException when alert not found", async () => {
      // Arrange
      mockPrisma.conflictAlert.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.escalateConflict(mockAlertId, {}, mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when alert not in OPEN status", async () => {
      // Arrange
      mockPrisma.conflictAlert.findFirst.mockResolvedValue({
        ...mockConflictAlert,
        status: ConflictStatus.ESCALATED,
      });

      // Act & Assert
      await expect(
        service.escalateConflict(mockAlertId, {}, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should escalate conflict to ESCALATED status", async () => {
      // Act
      const result = await service.escalateConflict(
        mockAlertId,
        {},
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(mockPrisma.conflictAlert.update).toHaveBeenCalledWith({
        where: { id: mockAlertId },
        data: expect.objectContaining({
          status: ConflictStatus.ESCALATED,
        }),
      });
      expect(result.status).toBe(ConflictStatus.ESCALATED);
    });

    it("should link to existing case when provided", async () => {
      // Arrange
      const existingCaseId = "case-existing-123";

      // Act
      await service.escalateConflict(
        mockAlertId,
        { existingCaseId },
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(mockPrisma.conflictAlert.update).toHaveBeenCalledWith({
        where: { id: mockAlertId },
        data: expect.objectContaining({
          escalatedToCaseId: existingCaseId,
        }),
      });
    });
  });

  // getEntityTimeline() Tests - RS.45

  describe("getEntityTimeline()", () => {
    it("should return timeline with disclosures involving entity", async () => {
      // Arrange
      mockPrisma.riuDisclosureExtension.findMany.mockResolvedValue([
        {
          riuId: "dis-1",
          relatedCompany: "Acme Corp",
          relatedPersonName: null,
          createdAt: new Date("2026-01-10"),
          riu: {
            id: "dis-1",
            referenceNumber: "DIS-001",
            createdAt: new Date("2026-01-10"),
            createdById: mockPersonId,
          },
        },
      ]);
      mockPrisma.conflictAlert.findMany.mockResolvedValue([]);
      mockPrisma.subject.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getEntityTimeline("Acme Corp", mockOrgId);

      // Assert
      expect(result.entityName).toBe("Acme Corp");
      expect(result.totalEvents).toBe(1);
      expect(result.events[0].eventType).toBe("DISCLOSURE_SUBMITTED");
      expect(result.statistics.totalDisclosures).toBe(1);
    });

    it("should include conflict alerts in timeline", async () => {
      // Arrange
      mockPrisma.riuDisclosureExtension.findMany.mockResolvedValue([]);
      mockPrisma.conflictAlert.findMany.mockResolvedValue([
        {
          id: mockAlertId,
          status: ConflictStatus.OPEN,
          summary: "Self-dealing conflict",
          createdAt: new Date("2026-01-15"),
          disclosureId: mockDisclosureId,
          escalatedToCaseId: null,
        },
      ]);
      mockPrisma.subject.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getEntityTimeline("Acme Corp", mockOrgId);

      // Assert
      expect(result.events[0].eventType).toBe("CONFLICT_DETECTED");
      expect(result.statistics.totalConflicts).toBe(1);
    });

    it("should include case involvements in timeline", async () => {
      // Arrange
      mockPrisma.riuDisclosureExtension.findMany.mockResolvedValue([]);
      mockPrisma.conflictAlert.findMany.mockResolvedValue([]);
      mockPrisma.subject.findMany.mockResolvedValue([
        {
          id: "subject-1",
          caseId: "case-1",
          externalName: "Acme Corp",
          role: "SUBJECT",
          createdAt: new Date("2026-01-12"),
          case: {
            id: "case-1",
            referenceNumber: "CASE-001",
            createdAt: new Date("2026-01-12"),
          },
        },
      ]);

      // Act
      const result = await service.getEntityTimeline("Acme Corp", mockOrgId);

      // Assert
      expect(result.events[0].eventType).toBe("CASE_INVOLVEMENT");
      expect(result.statistics.totalCases).toBe(1);
    });

    it("should sort events by date descending", async () => {
      // Arrange
      mockPrisma.riuDisclosureExtension.findMany.mockResolvedValue([
        {
          riuId: "dis-1",
          relatedCompany: "Acme Corp",
          relatedPersonName: null,
          createdAt: new Date("2026-01-05"),
          riu: {
            id: "dis-1",
            referenceNumber: "DIS-001",
            createdAt: new Date("2026-01-05"),
            createdById: mockPersonId,
          },
        },
      ]);
      mockPrisma.conflictAlert.findMany.mockResolvedValue([
        {
          id: mockAlertId,
          status: ConflictStatus.OPEN,
          summary: "Conflict",
          createdAt: new Date("2026-01-15"),
          disclosureId: mockDisclosureId,
          escalatedToCaseId: null,
        },
      ]);
      mockPrisma.subject.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getEntityTimeline("Acme Corp", mockOrgId);

      // Assert
      expect(result.events).toHaveLength(2);
      // Most recent first (conflict on Jan 15 before disclosure on Jan 5)
      expect(result.events[0].eventType).toBe("CONFLICT_DETECTED");
      expect(result.events[1].eventType).toBe("DISCLOSURE_SUBMITTED");
    });

    it("should calculate unique persons correctly", async () => {
      // Arrange
      mockPrisma.riuDisclosureExtension.findMany.mockResolvedValue([
        {
          riuId: "dis-1",
          relatedCompany: "Acme Corp",
          createdAt: new Date(),
          riu: { createdById: "person-1" },
        },
        {
          riuId: "dis-2",
          relatedCompany: "Acme Corp",
          createdAt: new Date(),
          riu: { createdById: "person-2" },
        },
        {
          riuId: "dis-3",
          relatedCompany: "Acme Corp",
          createdAt: new Date(),
          riu: { createdById: "person-1" }, // Duplicate
        },
      ]);
      mockPrisma.conflictAlert.findMany.mockResolvedValue([]);
      mockPrisma.subject.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getEntityTimeline("Acme Corp", mockOrgId);

      // Assert
      expect(result.statistics.uniquePersons).toBe(2);
    });
  });

  // findAlerts() Tests - Query methods

  describe("findAlerts()", () => {
    beforeEach(() => {
      mockPrisma.conflictAlert.findMany.mockResolvedValue([mockConflictAlert]);
      mockPrisma.conflictAlert.count.mockResolvedValue(1);
    });

    it("should return paginated results", async () => {
      // Act
      const result = await service.findAlerts(mockOrgId, {
        page: 1,
        pageSize: 10,
      });

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it("should filter by status", async () => {
      // Act
      await service.findAlerts(mockOrgId, {
        status: [ConflictStatus.OPEN, ConflictStatus.ESCALATED],
      });

      // Assert
      expect(mockPrisma.conflictAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [ConflictStatus.OPEN, ConflictStatus.ESCALATED] },
          }),
        }),
      );
    });

    it("should filter by conflict type", async () => {
      // Act
      await service.findAlerts(mockOrgId, {
        conflictType: [ConflictType.SELF_DEALING],
      });

      // Assert
      expect(mockPrisma.conflictAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            conflictType: { in: [ConflictType.SELF_DEALING] },
          }),
        }),
      );
    });

    it("should filter by severity", async () => {
      // Act
      await service.findAlerts(mockOrgId, {
        severity: [ConflictSeverity.HIGH, ConflictSeverity.CRITICAL],
      });

      // Assert
      expect(mockPrisma.conflictAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            severity: {
              in: [ConflictSeverity.HIGH, ConflictSeverity.CRITICAL],
            },
          }),
        }),
      );
    });

    it("should filter by minimum confidence", async () => {
      // Act
      await service.findAlerts(mockOrgId, { minConfidence: 80 });

      // Assert
      expect(mockPrisma.conflictAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matchConfidence: { gte: 80 },
          }),
        }),
      );
    });

    it("should filter by date range", async () => {
      // Act
      await service.findAlerts(mockOrgId, {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      });

      // Assert
      expect(mockPrisma.conflictAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date("2026-01-01"),
              lte: new Date("2026-01-31"),
            },
          }),
        }),
      );
    });
  });

  // findAlertById() Tests

  describe("findAlertById()", () => {
    it("should return null when alert not found", async () => {
      // Arrange
      mockPrisma.conflictAlert.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.findAlertById("nonexistent", mockOrgId);

      // Assert
      expect(result).toBeNull();
    });

    it("should return alert DTO when found", async () => {
      // Arrange
      mockPrisma.conflictAlert.findFirst.mockResolvedValue(mockConflictAlert);

      // Act
      const result = await service.findAlertById(mockAlertId, mockOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(mockAlertId);
      expect(result?.conflictType).toBe(ConflictType.SELF_DEALING);
    });
  });

  // Delegated methods tests

  describe("delegated exclusion methods", () => {
    it("should delegate createExclusion to exclusionService", async () => {
      // Arrange
      const dto = {
        personId: mockPersonId,
        matchedEntity: "Acme Corp",
        conflictType: ConflictType.SELF_DEALING,
        reason: "Pre-approved",
      };

      // Act
      await service.createExclusion(dto, mockUserId, mockOrgId);

      // Assert
      expect(mockExclusionService.createExclusion).toHaveBeenCalledWith(
        dto,
        mockUserId,
        mockOrgId,
        undefined,
      );
    });

    it("should delegate findExclusions to exclusionService", async () => {
      // Arrange
      mockExclusionService.findExclusions.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      // Act
      await service.findExclusions(mockOrgId, { activeOnly: true });

      // Assert
      expect(mockExclusionService.findExclusions).toHaveBeenCalledWith(
        mockOrgId,
        { activeOnly: true },
      );
    });

    it("should delegate deactivateExclusion to exclusionService", async () => {
      // Act
      await service.deactivateExclusion("exclusion-123", mockUserId, mockOrgId);

      // Assert
      expect(mockExclusionService.deactivateExclusion).toHaveBeenCalledWith(
        "exclusion-123",
        mockUserId,
        mockOrgId,
      );
    });
  });

  // Fuzzy match delegation tests

  describe("fuzzyMatch delegation", () => {
    it("should delegate fuzzyMatch to matchingService", () => {
      // Arrange
      mockMatchingService.fuzzyMatch.mockReturnValue({
        matched: true,
        confidence: 95,
        matchedEntity: "Acme Corp",
      });

      // Act
      const result = service.fuzzyMatch("Acme Corporation", "Acme Corp");

      // Assert
      expect(mockMatchingService.fuzzyMatch).toHaveBeenCalledWith(
        "Acme Corporation",
        "Acme Corp",
        undefined,
      );
      expect(result.matched).toBe(true);
    });

    it("should delegate calculateSimilarity to matchingService", () => {
      // Arrange
      mockMatchingService.calculateSimilarity.mockReturnValue(85);

      // Act
      const result = service.calculateSimilarity(
        "Acme Corp",
        "Acme Corporation",
      );

      // Assert
      expect(mockMatchingService.calculateSimilarity).toHaveBeenCalledWith(
        "Acme Corp",
        "Acme Corporation",
      );
      expect(result).toBe(85);
    });
  });

  // Tenant isolation tests

  describe("tenant isolation", () => {
    it("should always include organizationId in disclosure queries", async () => {
      // Arrange
      mockPrisma.riuDisclosureExtension.findUnique.mockResolvedValue(
        mockDisclosure,
      );

      // Act
      await service.detectConflicts(mockDisclosureId, mockPersonId, mockOrgId);

      // Assert
      expect(mockMatchingService.checkSelfDealing).toHaveBeenCalledWith(
        expect.any(String),
        mockPersonId,
        mockDisclosureId,
        mockOrgId,
        expect.any(Object),
      );
    });

    it("should filter alerts by organizationId", async () => {
      // Arrange
      mockPrisma.conflictAlert.findMany.mockResolvedValue([mockConflictAlert]);
      mockPrisma.conflictAlert.count.mockResolvedValue(1);

      // Act
      await service.findAlerts(mockOrgId, {});

      // Assert
      expect(mockPrisma.conflictAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        }),
      );
    });

    it("should filter single alert by organizationId", async () => {
      // Arrange
      mockPrisma.conflictAlert.findFirst.mockResolvedValue(mockConflictAlert);

      // Act
      await service.findAlertById(mockAlertId, mockOrgId);

      // Assert
      expect(mockPrisma.conflictAlert.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockAlertId, organizationId: mockOrgId },
        }),
      );
    });
  });
});
