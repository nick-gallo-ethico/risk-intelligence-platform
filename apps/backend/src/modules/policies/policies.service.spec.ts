import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PoliciesService } from "./policies.service";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import { PolicyStatus, PolicyType } from "@prisma/client";
import {
  PolicyCreatedEvent,
  PolicyUpdatedEvent,
  PolicyPublishedEvent,
  PolicyRetiredEvent,
} from "./events/policy.events";

describe("PoliciesService", () => {
  let service: PoliciesService;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  //
  // Test Data Fixtures
  //
  const mockOrgId = "org-test-123";
  const mockOtherOrgId = "org-other-456";
  const mockUserId = "user-test-123";
  const mockPolicyId = "policy-test-123";
  const mockVersionId = "version-test-123";

  const mockPolicy = {
    id: mockPolicyId,
    organizationId: mockOrgId,
    title: "Code of Conduct",
    slug: "code-of-conduct",
    policyType: PolicyType.CODE_OF_CONDUCT,
    category: "Corporate Governance",
    status: PolicyStatus.DRAFT,
    currentVersion: 0,
    ownerId: mockUserId,
    draftContent: "<p>Policy content here</p>",
    draftUpdatedAt: new Date(),
    draftUpdatedById: mockUserId,
    effectiveDate: null,
    reviewDate: null,
    retiredAt: null,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
      id: mockUserId,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
    },
    versions: [],
  };

  const mockPolicyVersion = {
    id: mockVersionId,
    organizationId: mockOrgId,
    policyId: mockPolicyId,
    version: 1,
    versionLabel: "v1",
    content: "<p>Policy content here</p>",
    plainText: "Policy content here",
    summary: null,
    changeNotes: null,
    publishedAt: new Date(),
    publishedById: mockUserId,
    effectiveDate: new Date(),
    isLatest: true,
    publishedBy: {
      id: mockUserId,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
    },
  };

  const mockCreateDto = {
    title: "Code of Conduct",
    policyType: PolicyType.CODE_OF_CONDUCT,
    category: "Corporate Governance",
    content: "<p>Policy content here</p>",
  };

  //
  // Mock Setup
  //
  const mockPrismaService = {
    policy: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    policyVersion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  //
  // Module Setup
  //
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PoliciesService>(PoliciesService);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);
    eventEmitter = module.get(EventEmitter2);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  //
  // describe('create')
  //
  describe("create", () => {
    it("should create policy with correct organizationId", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(null); // For slug generation
      mockPrismaService.policy.create.mockResolvedValue(mockPolicy);

      // Act
      const result = await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.policy.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId, // CRITICAL: Org from parameter
          title: mockCreateDto.title,
          policyType: mockCreateDto.policyType,
          createdById: mockUserId,
        }),
        include: expect.any(Object),
      });
      expect(result).toEqual(mockPolicy);
    });

    it("should set status to DRAFT by default", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(null);
      mockPrismaService.policy.create.mockResolvedValue(mockPolicy);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.policy.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: PolicyStatus.DRAFT,
        }),
        include: expect.any(Object),
      });
    });

    it("should set version to 0 (no published versions yet)", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(null);
      mockPrismaService.policy.create.mockResolvedValue(mockPolicy);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.policy.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currentVersion: 0,
        }),
        include: expect.any(Object),
      });
    });

    it("should log activity on create", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(null);
      mockPrismaService.policy.create.mockResolvedValue(mockPolicy);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: mockPolicyId,
          action: "created",
          actorUserId: mockUserId,
          organizationId: mockOrgId,
        }),
      );
    });

    it("should emit policy.created event", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(null);
      mockPrismaService.policy.create.mockResolvedValue(mockPolicy);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyCreatedEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
          policyId: mockPolicyId,
          title: mockPolicy.title,
        }),
      );
    });

    it("should generate unique slug within organization", async () => {
      // Arrange - First slug check returns existing, second returns null
      mockPrismaService.policy.findFirst
        .mockResolvedValueOnce({ slug: "code-of-conduct" })
        .mockResolvedValueOnce(null);
      mockPrismaService.policy.create.mockResolvedValue({
        ...mockPolicy,
        slug: "code-of-conduct-1",
      });

      // Act
      const result = await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(result.slug).toBe("code-of-conduct-1");
    });
  });

  //
  // describe('findById')
  //
  describe("findById", () => {
    it("should return policy when found in organization", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);

      // Act
      const result = await service.findById(mockPolicyId, mockOrgId);

      // Assert
      expect(result).toEqual(mockPolicy);
      expect(prisma.policy.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockPolicyId,
          organizationId: mockOrgId, // CRITICAL: Must filter by org
        },
        include: expect.any(Object),
      });
    });

    it("should return null when policy does not exist", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.findById("non-existent-id", mockOrgId);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when policy belongs to different org", async () => {
      // Arrange - Policy exists but query returns null due to org filter
      mockPrismaService.policy.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.findById(mockPolicyId, mockOtherOrgId);

      // Assert
      expect(result).toBeNull();
      expect(prisma.policy.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOtherOrgId,
          }),
        }),
      );
    });
  });

  //
  // describe('findByIdOrFail')
  //
  describe("findByIdOrFail", () => {
    it("should return policy when found", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);

      // Act
      const result = await service.findByIdOrFail(mockPolicyId, mockOrgId);

      // Assert
      expect(result).toEqual(mockPolicy);
    });

    it("should throw NotFoundException when policy does not exist", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findByIdOrFail("non-existent-id", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  //
  // describe('findAll')
  //
  describe("findAll", () => {
    it("should return paginated results", async () => {
      // Arrange
      mockPrismaService.policy.findMany.mockResolvedValue([mockPolicy]);
      mockPrismaService.policy.count.mockResolvedValue(1);

      // Act
      const result = await service.findAll({ page: 1, limit: 20 }, mockOrgId);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should always filter by organizationId", async () => {
      // Arrange
      mockPrismaService.policy.findMany.mockResolvedValue([]);
      mockPrismaService.policy.count.mockResolvedValue(0);

      // Act
      await service.findAll({}, mockOrgId);

      // Assert - CRITICAL: Must always include org filter
      expect(prisma.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        }),
      );
    });

    it("should filter by status when provided", async () => {
      // Arrange
      mockPrismaService.policy.findMany.mockResolvedValue([]);
      mockPrismaService.policy.count.mockResolvedValue(0);

      // Act
      await service.findAll({ status: PolicyStatus.PUBLISHED }, mockOrgId);

      // Assert
      expect(prisma.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PolicyStatus.PUBLISHED,
          }),
        }),
      );
    });

    it("should filter by policyType when provided", async () => {
      // Arrange
      mockPrismaService.policy.findMany.mockResolvedValue([]);
      mockPrismaService.policy.count.mockResolvedValue(0);

      // Act
      await service.findAll(
        { policyType: PolicyType.CODE_OF_CONDUCT },
        mockOrgId,
      );

      // Assert
      expect(prisma.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            policyType: PolicyType.CODE_OF_CONDUCT,
          }),
        }),
      );
    });

    it("should filter by ownerId when provided", async () => {
      // Arrange
      mockPrismaService.policy.findMany.mockResolvedValue([]);
      mockPrismaService.policy.count.mockResolvedValue(0);

      // Act
      await service.findAll({ ownerId: mockUserId }, mockOrgId);

      // Assert
      expect(prisma.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: mockUserId,
          }),
        }),
      );
    });

    it("should support search by title", async () => {
      // Arrange
      mockPrismaService.policy.findMany.mockResolvedValue([]);
      mockPrismaService.policy.count.mockResolvedValue(0);

      // Act
      await service.findAll({ search: "conduct" }, mockOrgId);

      // Assert
      expect(prisma.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: expect.objectContaining({
              contains: "conduct",
              mode: "insensitive",
            }),
          }),
        }),
      );
    });
  });

  //
  // describe('updateDraft')
  //
  describe("updateDraft", () => {
    it("should update draft policy fields", async () => {
      // Arrange
      const updateDto = { title: "Updated Code of Conduct" };
      const updatedPolicy = { ...mockPolicy, ...updateDto };

      mockPrismaService.policy.findFirst
        .mockResolvedValueOnce(mockPolicy) // For findByIdOrFail
        .mockResolvedValueOnce(null); // For slug generation
      mockPrismaService.policy.update.mockResolvedValue(updatedPolicy);

      // Act
      const result = await service.updateDraft(
        mockPolicyId,
        updateDto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.title).toBe("Updated Code of Conduct");
    });

    it("should throw BadRequestException if status is PENDING_APPROVAL", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.PENDING_APPROVAL,
      });

      // Act & Assert
      await expect(
        service.updateDraft(
          mockPolicyId,
          { title: "New Title" },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should log activity with changes", async () => {
      // Arrange
      const updateDto = { title: "Updated Title" };
      mockPrismaService.policy.findFirst
        .mockResolvedValueOnce(mockPolicy)
        .mockResolvedValueOnce(null);
      mockPrismaService.policy.update.mockResolvedValue({
        ...mockPolicy,
        ...updateDto,
      });

      // Act
      await service.updateDraft(mockPolicyId, updateDto, mockUserId, mockOrgId);

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "updated",
          changes: expect.objectContaining({
            oldValue: expect.objectContaining({ title: "Code of Conduct" }),
            newValue: expect.objectContaining({ title: "Updated Title" }),
          }),
        }),
      );
    });

    it("should emit policy.updated event when changes made", async () => {
      // Arrange
      const updateDto = { title: "Updated Title" };
      mockPrismaService.policy.findFirst
        .mockResolvedValueOnce(mockPolicy)
        .mockResolvedValueOnce(null);
      mockPrismaService.policy.update.mockResolvedValue({
        ...mockPolicy,
        ...updateDto,
      });

      // Act
      await service.updateDraft(mockPolicyId, updateDto, mockUserId, mockOrgId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyUpdatedEvent.eventName,
        expect.objectContaining({
          policyId: mockPolicyId,
        }),
      );
    });

    it("should copy latest version to draft when updating published policy without draft", async () => {
      // Arrange
      const publishedPolicy = {
        ...mockPolicy,
        status: PolicyStatus.PUBLISHED,
        draftContent: null,
      };
      const latestVersion = {
        ...mockPolicyVersion,
        content: "<p>Published content</p>",
      };

      mockPrismaService.policy.findFirst.mockResolvedValue(publishedPolicy);
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        latestVersion,
      );
      mockPrismaService.policy.update.mockResolvedValue({
        ...publishedPolicy,
        draftContent: latestVersion.content,
      });

      // Act
      await service.updateDraft(
        mockPolicyId,
        { content: "<p>New draft content</p>" },
        mockUserId,
        mockOrgId,
      );

      // Assert - First update copies version to draft
      expect(prisma.policy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            draftContent: latestVersion.content,
          }),
        }),
      );
    });
  });

  //
  // describe('publish') - VERSION-ON-PUBLISH PATTERN
  //
  describe("publish", () => {
    it("should transition status from DRAFT to PUBLISHED", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          policyVersion: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            create: jest.fn().mockResolvedValue(mockPolicyVersion),
          },
          policy: {
            update: jest.fn().mockResolvedValue({
              ...mockPolicy,
              status: PolicyStatus.PUBLISHED,
              currentVersion: 1,
            }),
          },
        };
        return callback(tx);
      });

      // Act
      const result = await service.publish(
        mockPolicyId,
        {},
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.version).toBe(1);
    });

    it("should create version record on publish", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);

      const mockTx = {
        policyVersion: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue(mockPolicyVersion),
        },
        policy: {
          update: jest.fn().mockResolvedValue({
            ...mockPolicy,
            status: PolicyStatus.PUBLISHED,
            currentVersion: 1,
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      // Act
      await service.publish(mockPolicyId, {}, mockUserId, mockOrgId);

      // Assert
      expect(mockTx.policyVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          policyId: mockPolicyId,
          version: 1,
          content: mockPolicy.draftContent,
          isLatest: true,
        }),
        include: expect.any(Object),
      });
    });

    it("should increment version number on each publish", async () => {
      // Arrange - Policy already has version 2 published
      const policyWithVersions = {
        ...mockPolicy,
        currentVersion: 2,
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(policyWithVersions);

      const mockTx = {
        policyVersion: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({
            ...mockPolicyVersion,
            version: 3,
          }),
        },
        policy: {
          update: jest.fn().mockResolvedValue({
            ...policyWithVersions,
            status: PolicyStatus.PUBLISHED,
            currentVersion: 3,
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      // Act
      const result = await service.publish(
        mockPolicyId,
        {},
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.version).toBe(3);
      expect(mockTx.policyVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          version: 3,
        }),
        include: expect.any(Object),
      });
    });

    it("should mark previous versions as not latest", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue({
        ...mockPolicy,
        currentVersion: 1,
      });

      const mockTx = {
        policyVersion: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({
            ...mockPolicyVersion,
            version: 2,
          }),
        },
        policy: {
          update: jest.fn().mockResolvedValue({
            ...mockPolicy,
            status: PolicyStatus.PUBLISHED,
            currentVersion: 2,
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      // Act
      await service.publish(mockPolicyId, {}, mockUserId, mockOrgId);

      // Assert
      expect(mockTx.policyVersion.updateMany).toHaveBeenCalledWith({
        where: {
          policyId: mockPolicyId,
          organizationId: mockOrgId,
          isLatest: true,
        },
        data: {
          isLatest: false,
        },
      });
    });

    it("should clear draft content after publish", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);

      const mockTx = {
        policyVersion: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue(mockPolicyVersion),
        },
        policy: {
          update: jest.fn().mockResolvedValue({
            ...mockPolicy,
            status: PolicyStatus.PUBLISHED,
            currentVersion: 1,
            draftContent: null,
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      // Act
      await service.publish(mockPolicyId, {}, mockUserId, mockOrgId);

      // Assert
      expect(mockTx.policy.update).toHaveBeenCalledWith({
        where: { id: mockPolicyId },
        data: expect.objectContaining({
          draftContent: null,
          draftUpdatedAt: null,
          draftUpdatedById: null,
        }),
      });
    });

    it("should emit policy.published event", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);

      const mockTx = {
        policyVersion: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue(mockPolicyVersion),
        },
        policy: {
          update: jest.fn().mockResolvedValue({
            ...mockPolicy,
            status: PolicyStatus.PUBLISHED,
            currentVersion: 1,
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      // Act
      await service.publish(mockPolicyId, {}, mockUserId, mockOrgId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyPublishedEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
          policyId: mockPolicyId,
          policyVersionId: mockVersionId,
          version: 1,
        }),
      );
    });

    it("should throw BadRequestException if no draft content", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue({
        ...mockPolicy,
        draftContent: null,
      });

      // Act & Assert
      await expect(
        service.publish(mockPolicyId, {}, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should log activity with version information", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);

      const mockTx = {
        policyVersion: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue(mockPolicyVersion),
        },
        policy: {
          update: jest.fn().mockResolvedValue({
            ...mockPolicy,
            status: PolicyStatus.PUBLISHED,
            currentVersion: 1,
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      // Act
      await service.publish(mockPolicyId, {}, mockUserId, mockOrgId);

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "published",
          actionDescription: expect.stringContaining("version 1"),
        }),
      );
    });
  });

  //
  // describe('retire')
  //
  describe("retire", () => {
    it("should transition status to RETIRED", async () => {
      // Arrange
      const publishedPolicy = {
        ...mockPolicy,
        status: PolicyStatus.PUBLISHED,
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(publishedPolicy);
      mockPrismaService.policy.update.mockResolvedValue({
        ...publishedPolicy,
        status: PolicyStatus.RETIRED,
        retiredAt: new Date(),
      });

      // Act
      const result = await service.retire(mockPolicyId, mockUserId, mockOrgId);

      // Assert
      expect(result.status).toBe(PolicyStatus.RETIRED);
    });

    it("should set retiredAt timestamp", async () => {
      // Arrange
      const publishedPolicy = {
        ...mockPolicy,
        status: PolicyStatus.PUBLISHED,
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(publishedPolicy);
      mockPrismaService.policy.update.mockResolvedValue({
        ...publishedPolicy,
        status: PolicyStatus.RETIRED,
        retiredAt: new Date(),
      });

      // Act
      await service.retire(mockPolicyId, mockUserId, mockOrgId);

      // Assert
      expect(prisma.policy.update).toHaveBeenCalledWith({
        where: { id: mockPolicyId },
        data: expect.objectContaining({
          status: PolicyStatus.RETIRED,
          retiredAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it("should emit policy.retired event", async () => {
      // Arrange
      const publishedPolicy = {
        ...mockPolicy,
        status: PolicyStatus.PUBLISHED,
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(publishedPolicy);
      mockPrismaService.policy.update.mockResolvedValue({
        ...publishedPolicy,
        status: PolicyStatus.RETIRED,
        retiredAt: new Date(),
      });

      // Act
      await service.retire(mockPolicyId, mockUserId, mockOrgId);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PolicyRetiredEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
          policyId: mockPolicyId,
        }),
      );
    });

    it("should throw BadRequestException if already RETIRED", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.RETIRED,
      });

      // Act & Assert
      await expect(
        service.retire(mockPolicyId, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should log activity on retire", async () => {
      // Arrange
      const publishedPolicy = {
        ...mockPolicy,
        status: PolicyStatus.PUBLISHED,
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(publishedPolicy);
      mockPrismaService.policy.update.mockResolvedValue({
        ...publishedPolicy,
        status: PolicyStatus.RETIRED,
      });

      // Act
      await service.retire(mockPolicyId, mockUserId, mockOrgId);

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "retired",
        }),
      );
    });
  });

  //
  // describe('getVersions')
  //
  describe("getVersions", () => {
    it("should return all versions for a policy", async () => {
      // Arrange
      const versions = [
        { ...mockPolicyVersion, version: 2, isLatest: true },
        { ...mockPolicyVersion, version: 1, isLatest: false },
      ];
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.policyVersion.findMany.mockResolvedValue(versions);

      // Act
      const result = await service.getVersions(mockPolicyId, mockOrgId);

      // Assert
      expect(result).toHaveLength(2);
    });

    it("should order by version number descending", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.policyVersion.findMany.mockResolvedValue([]);

      // Act
      await service.getVersions(mockPolicyId, mockOrgId);

      // Assert
      expect(prisma.policyVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { version: "desc" },
        }),
      );
    });

    it("should filter by organizationId", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.policyVersion.findMany.mockResolvedValue([]);

      // Act
      await service.getVersions(mockPolicyId, mockOrgId);

      // Assert
      expect(prisma.policyVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        }),
      );
    });

    it("should throw NotFoundException if policy does not exist", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getVersions(mockPolicyId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  //
  // describe('getVersion')
  //
  describe("getVersion", () => {
    it("should return specific version by ID", async () => {
      // Arrange
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );

      // Act
      const result = await service.getVersion(mockVersionId, mockOrgId);

      // Assert
      expect(result).toEqual(mockPolicyVersion);
    });

    it("should throw NotFoundException if version does not exist", async () => {
      // Arrange
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getVersion("non-existent-id", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should filter by organizationId for tenant isolation", async () => {
      // Arrange
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getVersion(mockVersionId, mockOtherOrgId),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.policyVersion.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOtherOrgId,
          }),
        }),
      );
    });
  });

  //
  // describe('workflow transitions - state machine verification')
  //
  describe("workflow transitions", () => {
    it("should support DRAFT -> PUBLISHED transition via publish", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);

      const mockTx = {
        policyVersion: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue(mockPolicyVersion),
        },
        policy: {
          update: jest.fn().mockResolvedValue({
            ...mockPolicy,
            status: PolicyStatus.PUBLISHED,
            currentVersion: 1,
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      // Act
      const result = await service.publish(
        mockPolicyId,
        {},
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result).toBeDefined();
    });

    it("should support PUBLISHED -> RETIRED transition via retire", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.PUBLISHED,
      });
      mockPrismaService.policy.update.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.RETIRED,
      });

      // Act
      const result = await service.retire(mockPolicyId, mockUserId, mockOrgId);

      // Assert
      expect(result.status).toBe(PolicyStatus.RETIRED);
    });

    it("should allow DRAFT -> RETIRED transition via retire", async () => {
      // Arrange - Draft policies can be retired too
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);
      mockPrismaService.policy.update.mockResolvedValue({
        ...mockPolicy,
        status: PolicyStatus.RETIRED,
      });

      // Act
      const result = await service.retire(mockPolicyId, mockUserId, mockOrgId);

      // Assert
      expect(result.status).toBe(PolicyStatus.RETIRED);
    });
  });

  //
  // describe('version-on-publish pattern verification')
  //
  describe("version-on-publish pattern", () => {
    it("should create immutable version snapshot with content", async () => {
      // Arrange
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);

      const mockTx = {
        policyVersion: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue(mockPolicyVersion),
        },
        policy: {
          update: jest.fn().mockResolvedValue({
            ...mockPolicy,
            status: PolicyStatus.PUBLISHED,
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      // Act
      await service.publish(mockPolicyId, {}, mockUserId, mockOrgId);

      // Assert - Version contains full content snapshot
      expect(mockTx.policyVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: mockPolicy.draftContent,
          plainText: expect.any(String), // Extracted plain text
          publishedById: mockUserId,
          publishedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it("should maintain version chain with isLatest flag", async () => {
      // Arrange - Already has version 1
      const policyWithVersion = {
        ...mockPolicy,
        currentVersion: 1,
      };
      mockPrismaService.policy.findFirst.mockResolvedValue(policyWithVersion);

      const mockTx = {
        policyVersion: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({
            ...mockPolicyVersion,
            version: 2,
            isLatest: true,
          }),
        },
        policy: {
          update: jest.fn().mockResolvedValue({
            ...policyWithVersion,
            status: PolicyStatus.PUBLISHED,
            currentVersion: 2,
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      // Act
      await service.publish(mockPolicyId, {}, mockUserId, mockOrgId);

      // Assert - Previous versions marked as not latest
      expect(mockTx.policyVersion.updateMany).toHaveBeenCalledWith({
        where: {
          policyId: mockPolicyId,
          organizationId: mockOrgId,
          isLatest: true,
        },
        data: { isLatest: false },
      });

      // New version marked as latest
      expect(mockTx.policyVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isLatest: true,
        }),
        include: expect.any(Object),
      });
    });
  });
});
