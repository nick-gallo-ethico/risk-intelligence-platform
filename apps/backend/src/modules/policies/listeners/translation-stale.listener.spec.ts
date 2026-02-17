import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  TranslationStaleListener,
  TranslationsMarkedStaleEvent,
} from "./translation-stale.listener";
import { PrismaService } from "../../prisma/prisma.service";
import { PolicyPublishedEvent } from "../events/policy.events";

describe("TranslationStaleListener", () => {
  let listener: TranslationStaleListener;
  let prisma: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  // Test fixtures
  const mockOrgId = "org-test-123";
  const mockPolicyId = "policy-test-123";
  const mockVersionId = "version-test-123";
  const mockPreviousVersionId = "version-prev-123";
  const mockUserId = "user-test-123";

  // Mocks
  const mockPrismaService = {
    policyVersion: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    policyVersionTranslation: {
      updateMany: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationStaleListener,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    listener = module.get<TranslationStaleListener>(TranslationStaleListener);
    prisma = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe("onPolicyPublished", () => {
    it("should mark previous version translations as stale", async () => {
      // Arrange
      const event = new PolicyPublishedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        policyVersionId: mockVersionId,
        version: 2,
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policyVersion.findUnique.mockResolvedValue({
        version: 2,
      });
      mockPrismaService.policyVersion.findFirst.mockResolvedValue({
        id: mockPreviousVersionId,
      });
      mockPrismaService.policyVersionTranslation.updateMany.mockResolvedValue({
        count: 3,
      });

      // Act
      await listener.onPolicyPublished(event);

      // Assert
      expect(prisma.policyVersion.findUnique).toHaveBeenCalledWith({
        where: { id: mockVersionId },
        select: { version: true },
      });
      expect(prisma.policyVersion.findFirst).toHaveBeenCalledWith({
        where: {
          policyId: mockPolicyId,
          organizationId: mockOrgId,
          version: 1, // version - 1
        },
        select: { id: true },
      });
      expect(prisma.policyVersionTranslation.updateMany).toHaveBeenCalledWith({
        where: {
          policyVersionId: mockPreviousVersionId,
          organizationId: mockOrgId,
          isStale: false,
        },
        data: {
          isStale: true,
        },
      });
    });

    it("should emit TranslationsMarkedStaleEvent when translations marked stale", async () => {
      // Arrange
      const event = new PolicyPublishedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        policyVersionId: mockVersionId,
        version: 2,
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policyVersion.findUnique.mockResolvedValue({
        version: 2,
      });
      mockPrismaService.policyVersion.findFirst.mockResolvedValue({
        id: mockPreviousVersionId,
      });
      mockPrismaService.policyVersionTranslation.updateMany.mockResolvedValue({
        count: 2,
      });

      // Act
      await listener.onPolicyPublished(event);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        TranslationsMarkedStaleEvent.eventName,
        expect.objectContaining({
          organizationId: mockOrgId,
          policyId: mockPolicyId,
          previousVersionId: mockPreviousVersionId,
          newVersionId: mockVersionId,
          translationCount: 2,
        }),
      );
    });

    it("should not mark stale for version 1 (no previous version)", async () => {
      // Arrange
      const event = new PolicyPublishedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        policyVersionId: mockVersionId,
        version: 1,
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policyVersion.findUnique.mockResolvedValue({
        version: 1,
      });

      // Act
      await listener.onPolicyPublished(event);

      // Assert
      expect(prisma.policyVersion.findFirst).not.toHaveBeenCalled();
      expect(prisma.policyVersionTranslation.updateMany).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("should not throw when new version not found", async () => {
      // Arrange
      const event = new PolicyPublishedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        policyVersionId: mockVersionId,
        version: 2,
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policyVersion.findUnique.mockResolvedValue(null);

      // Act & Assert - should not throw
      await expect(listener.onPolicyPublished(event)).resolves.not.toThrow();
      expect(prisma.policyVersionTranslation.updateMany).not.toHaveBeenCalled();
    });

    it("should not throw when previous version not found", async () => {
      // Arrange
      const event = new PolicyPublishedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        policyVersionId: mockVersionId,
        version: 2,
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policyVersion.findUnique.mockResolvedValue({
        version: 2,
      });
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(null);

      // Act & Assert - should not throw
      await expect(listener.onPolicyPublished(event)).resolves.not.toThrow();
      expect(prisma.policyVersionTranslation.updateMany).not.toHaveBeenCalled();
    });

    it("should not emit event when no translations to mark stale", async () => {
      // Arrange
      const event = new PolicyPublishedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        policyVersionId: mockVersionId,
        version: 2,
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policyVersion.findUnique.mockResolvedValue({
        version: 2,
      });
      mockPrismaService.policyVersion.findFirst.mockResolvedValue({
        id: mockPreviousVersionId,
      });
      mockPrismaService.policyVersionTranslation.updateMany.mockResolvedValue({
        count: 0,
      });

      // Act
      await listener.onPolicyPublished(event);

      // Assert
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("should not throw on database error", async () => {
      // Arrange
      const event = new PolicyPublishedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        policyVersionId: mockVersionId,
        version: 2,
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policyVersion.findUnique.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert - should not throw
      await expect(listener.onPolicyPublished(event)).resolves.not.toThrow();
    });

    it("should not throw on event emitter error", async () => {
      // Arrange
      const event = new PolicyPublishedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        policyVersionId: mockVersionId,
        version: 2,
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policyVersion.findUnique.mockResolvedValue({
        version: 2,
      });
      mockPrismaService.policyVersion.findFirst.mockResolvedValue({
        id: mockPreviousVersionId,
      });
      mockPrismaService.policyVersionTranslation.updateMany.mockResolvedValue({
        count: 1,
      });
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error("Emit failed");
      });

      // Act & Assert - should not throw
      await expect(listener.onPolicyPublished(event)).resolves.not.toThrow();
    });

    it("should handle version 0 edge case (no previous)", async () => {
      // Arrange
      const event = new PolicyPublishedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        policyVersionId: mockVersionId,
        version: 0,
        actorUserId: mockUserId,
        actorType: "USER",
      });

      mockPrismaService.policyVersion.findUnique.mockResolvedValue({
        version: 0,
      });

      // Act
      await listener.onPolicyPublished(event);

      // Assert - should not try to find previous version
      expect(prisma.policyVersion.findFirst).not.toHaveBeenCalled();
      expect(prisma.policyVersionTranslation.updateMany).not.toHaveBeenCalled();
    });
  });
});
