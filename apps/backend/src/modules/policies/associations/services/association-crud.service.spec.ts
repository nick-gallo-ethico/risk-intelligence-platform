import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  AssociationCrudService,
  PolicyLinkedToCaseEvent,
  PolicyUnlinkedFromCaseEvent,
} from "./association-crud.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { ActivityService } from "../../../../common/services/activity.service";
import { PolicyCaseLinkType, PolicyStatus, CaseStatus } from "@prisma/client";

describe("AssociationCrudService", () => {
  let service: AssociationCrudService;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  // Test fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockPolicyId = "policy-test-123";
  const mockCaseId = "case-test-123";
  const mockAssociationId = "assoc-test-123";
  const mockVersionId = "version-test-123";

  const mockPolicy = {
    id: mockPolicyId,
    organizationId: mockOrgId,
    title: "Code of Conduct",
    status: PolicyStatus.PUBLISHED,
  };

  const mockCase = {
    id: mockCaseId,
    organizationId: mockOrgId,
    referenceNumber: "ETH-2026-00001",
    status: CaseStatus.OPEN,
  };

  const mockPolicyVersion = {
    id: mockVersionId,
    policyId: mockPolicyId,
    organizationId: mockOrgId,
    version: 1,
    isLatest: true,
  };

  const mockAssociation = {
    id: mockAssociationId,
    organizationId: mockOrgId,
    policyId: mockPolicyId,
    policyVersionId: mockVersionId,
    caseId: mockCaseId,
    linkType: PolicyCaseLinkType.VIOLATION,
    linkReason: "Violated section 3.2",
    violationDate: new Date("2026-01-15"),
    createdById: mockUserId,
    createdAt: new Date(),
    policy: {
      id: mockPolicyId,
      title: "Code of Conduct",
      policyType: "CODE_OF_CONDUCT",
      status: "PUBLISHED",
    },
    case: { id: mockCaseId, referenceNumber: "ETH-2026-00001", status: "OPEN" },
    policyVersion: { id: mockVersionId, version: 1, versionLabel: "v1" },
    createdBy: {
      id: mockUserId,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
    },
  };

  // Mocks
  const mockPrismaService = {
    policy: {
      findFirst: jest.fn(),
    },
    case: {
      findFirst: jest.fn(),
    },
    policyVersion: {
      findFirst: jest.fn(),
    },
    policyCaseAssociation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssociationCrudService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AssociationCrudService>(AssociationCrudService);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create policy-case association", async () => {
      // Arrange
      const dto = {
        policyId: mockPolicyId,
        caseId: mockCaseId,
        linkType: PolicyCaseLinkType.VIOLATION,
        linkReason: "Violated section 3.2",
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(null);
      mockPrismaService.policyCaseAssociation.create.mockResolvedValue(
        mockAssociation,
      );

      // Act
      const result = await service.create(dto, mockUserId, mockOrgId);

      // Assert
      expect(result).toEqual(mockAssociation);
      expect(prisma.policyCaseAssociation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId,
          policyId: mockPolicyId,
          caseId: mockCaseId,
          linkType: PolicyCaseLinkType.VIOLATION,
        }),
        include: expect.any(Object),
      });
    });

    it("should throw NotFoundException when policy not found", async () => {
      // Arrange
      const dto = {
        policyId: mockPolicyId,
        caseId: mockCaseId,
        linkType: PolicyCaseLinkType.VIOLATION,
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(dto, mockUserId, mockOrgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException when case not found", async () => {
      // Arrange
      const dto = {
        policyId: mockPolicyId,
        caseId: mockCaseId,
        linkType: PolicyCaseLinkType.VIOLATION,
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.case.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(dto, mockUserId, mockOrgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ConflictException when association already exists", async () => {
      // Arrange
      const dto = {
        policyId: mockPolicyId,
        caseId: mockCaseId,
        linkType: PolicyCaseLinkType.VIOLATION,
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(
        mockAssociation,
      );

      // Act & Assert
      await expect(service.create(dto, mockUserId, mockOrgId)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should emit PolicyLinkedToCaseEvent", async () => {
      // Arrange
      const dto = {
        policyId: mockPolicyId,
        caseId: mockCaseId,
        linkType: PolicyCaseLinkType.VIOLATION,
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(null);
      mockPrismaService.policyCaseAssociation.create.mockResolvedValue(
        mockAssociation,
      );

      // Act
      await service.create(dto, mockUserId, mockOrgId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyLinkedToCaseEvent.eventName,
        expect.objectContaining({
          policyId: mockPolicyId,
          caseId: mockCaseId,
          linkType: PolicyCaseLinkType.VIOLATION,
        }),
      );
    });

    it("should log activity on both case and policy", async () => {
      // Arrange
      const dto = {
        policyId: mockPolicyId,
        caseId: mockCaseId,
        linkType: PolicyCaseLinkType.VIOLATION,
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(null);
      mockPrismaService.policyCaseAssociation.create.mockResolvedValue(
        mockAssociation,
      );

      // Act
      await service.create(dto, mockUserId, mockOrgId);

      // Assert
      expect(activityService.log).toHaveBeenCalledTimes(2);
    });

    it("should use provided policyVersionId", async () => {
      // Arrange
      const customVersionId = "custom-version-123";
      const dto = {
        policyId: mockPolicyId,
        caseId: mockCaseId,
        linkType: PolicyCaseLinkType.VIOLATION,
        policyVersionId: customVersionId,
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.policyVersion.findFirst.mockResolvedValue({
        ...mockPolicyVersion,
        id: customVersionId,
      });
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(null);
      mockPrismaService.policyCaseAssociation.create.mockResolvedValue(
        mockAssociation,
      );

      // Act
      await service.create(dto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.policyCaseAssociation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          policyVersionId: customVersionId,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe("update", () => {
    it("should update association fields", async () => {
      // Arrange
      const dto = { linkType: PolicyCaseLinkType.REFERENCE };
      const updatedAssociation = {
        ...mockAssociation,
        linkType: PolicyCaseLinkType.REFERENCE,
      };
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(
        mockAssociation,
      );
      mockPrismaService.policyCaseAssociation.update.mockResolvedValue(
        updatedAssociation,
      );

      // Act
      const result = await service.update(
        mockAssociationId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.linkType).toBe(PolicyCaseLinkType.REFERENCE);
    });

    it("should throw NotFoundException when association not found", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update(
          mockAssociationId,
          { linkType: PolicyCaseLinkType.REFERENCE },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return existing when no changes", async () => {
      // Arrange
      const dto = {}; // No changes
      mockPrismaService.policyCaseAssociation.findFirst
        .mockResolvedValueOnce(mockAssociation)
        .mockResolvedValueOnce(mockAssociation);

      // Act
      const result = await service.update(
        mockAssociationId,
        dto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(prisma.policyCaseAssociation.update).not.toHaveBeenCalled();
    });

    it("should log activity when changes made", async () => {
      // Arrange
      const dto = { linkReason: "Updated reason" };
      const updatedAssociation = {
        ...mockAssociation,
        linkReason: "Updated reason",
      };
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(
        mockAssociation,
      );
      mockPrismaService.policyCaseAssociation.update.mockResolvedValue(
        updatedAssociation,
      );

      // Act
      await service.update(mockAssociationId, dto, mockUserId, mockOrgId);

      // Assert
      expect(activityService.log).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete association", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(
        mockAssociation,
      );
      mockPrismaService.policyCaseAssociation.delete.mockResolvedValue(
        mockAssociation,
      );

      // Act
      await service.delete(mockAssociationId, mockUserId, mockOrgId);

      // Assert
      expect(prisma.policyCaseAssociation.delete).toHaveBeenCalledWith({
        where: { id: mockAssociationId },
      });
    });

    it("should throw NotFoundException when association not found", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.delete(mockAssociationId, mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should emit PolicyUnlinkedFromCaseEvent", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(
        mockAssociation,
      );
      mockPrismaService.policyCaseAssociation.delete.mockResolvedValue(
        mockAssociation,
      );

      // Act
      await service.delete(mockAssociationId, mockUserId, mockOrgId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyUnlinkedFromCaseEvent.eventName,
        expect.objectContaining({
          associationId: mockAssociationId,
          policyId: mockPolicyId,
          caseId: mockCaseId,
        }),
      );
    });

    it("should log activity on both case and policy", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(
        mockAssociation,
      );
      mockPrismaService.policyCaseAssociation.delete.mockResolvedValue(
        mockAssociation,
      );

      // Act
      await service.delete(mockAssociationId, mockUserId, mockOrgId);

      // Assert
      expect(activityService.log).toHaveBeenCalledTimes(2);
    });
  });

  describe("findByPolicy", () => {
    it("should return associations for a policy", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([
        mockAssociation,
      ]);

      // Act
      const result = await service.findByPolicy(mockPolicyId, mockOrgId);

      // Assert
      expect(result).toHaveLength(1);
      expect(prisma.policyCaseAssociation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { policyId: mockPolicyId, organizationId: mockOrgId },
        }),
      );
    });

    it("should throw NotFoundException when policy not found", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findByPolicy(mockPolicyId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByCase", () => {
    it("should return associations for a case sorted by link type priority", async () => {
      // Arrange
      const referenceAssoc = {
        ...mockAssociation,
        linkType: PolicyCaseLinkType.REFERENCE,
        id: "ref-1",
      };
      const violationAssoc = {
        ...mockAssociation,
        linkType: PolicyCaseLinkType.VIOLATION,
        id: "viol-1",
      };
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([
        referenceAssoc,
        violationAssoc,
      ]);

      // Act
      const result = await service.findByCase(mockCaseId, mockOrgId);

      // Assert
      expect(result).toHaveLength(2);
      // VIOLATION should come before REFERENCE
      expect(result[0].linkType).toBe(PolicyCaseLinkType.VIOLATION);
      expect(result[1].linkType).toBe(PolicyCaseLinkType.REFERENCE);
    });

    it("should throw NotFoundException when case not found", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByCase(mockCaseId, mockOrgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findById", () => {
    it("should return association by ID", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(
        mockAssociation,
      );

      // Act
      const result = await service.findById(mockAssociationId, mockOrgId);

      // Assert
      expect(result).toEqual(mockAssociation);
    });

    it("should throw NotFoundException when not found", async () => {
      // Arrange
      mockPrismaService.policyCaseAssociation.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findById(mockAssociationId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAll", () => {
    it("should return paginated associations", async () => {
      // Arrange
      const query = { page: 1, limit: 20 };
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([
        mockAssociation,
      ]);
      mockPrismaService.policyCaseAssociation.count.mockResolvedValue(1);

      // Act
      const result = await service.findAll(query, mockOrgId);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should filter by policyId", async () => {
      // Arrange
      const query = { policyId: mockPolicyId };
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([]);
      mockPrismaService.policyCaseAssociation.count.mockResolvedValue(0);

      // Act
      await service.findAll(query, mockOrgId);

      // Assert
      expect(prisma.policyCaseAssociation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            policyId: mockPolicyId,
          }),
        }),
      );
    });

    it("should filter by caseId", async () => {
      // Arrange
      const query = { caseId: mockCaseId };
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([]);
      mockPrismaService.policyCaseAssociation.count.mockResolvedValue(0);

      // Act
      await service.findAll(query, mockOrgId);

      // Assert
      expect(prisma.policyCaseAssociation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            caseId: mockCaseId,
          }),
        }),
      );
    });

    it("should filter by linkType", async () => {
      // Arrange
      const query = { linkType: PolicyCaseLinkType.VIOLATION };
      mockPrismaService.policyCaseAssociation.findMany.mockResolvedValue([]);
      mockPrismaService.policyCaseAssociation.count.mockResolvedValue(0);

      // Act
      await service.findAll(query, mockOrgId);

      // Assert
      expect(prisma.policyCaseAssociation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            linkType: PolicyCaseLinkType.VIOLATION,
          }),
        }),
      );
    });
  });
});
