import { Test, TestingModule } from "@nestjs/testing";
import { PolicySearchIndexListener } from "./search-index.listener";
import { PolicyIndexer } from "../../search/indexing/indexers";
import {
  PolicyCreatedEvent,
  PolicyUpdatedEvent,
  PolicyPublishedEvent,
  PolicyRetiredEvent,
} from "../events/policy.events";

describe("PolicySearchIndexListener", () => {
  let listener: PolicySearchIndexListener;
  let policyIndexer: jest.Mocked<PolicyIndexer>;

  // Test fixtures
  const mockOrgId = "org-test-123";
  const mockPolicyId = "policy-test-123";
  const mockVersionId = "version-test-123";
  const mockUserId = "user-test-123";
  const mockCaseId = "case-test-123";

  // Mocks
  const mockPolicyIndexer = {
    indexPolicy: jest.fn(),
    deletePolicy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicySearchIndexListener,
        { provide: PolicyIndexer, useValue: mockPolicyIndexer },
      ],
    }).compile();

    listener = module.get<PolicySearchIndexListener>(PolicySearchIndexListener);
    policyIndexer = module.get(PolicyIndexer);

    jest.clearAllMocks();
  });

  describe("onPolicyCreated", () => {
    it("should index new policy", async () => {
      // Arrange
      const event = new PolicyCreatedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        title: "Code of Conduct",
        ownerId: mockUserId,
        actorUserId: mockUserId,
        actorType: "USER",
      });
      mockPolicyIndexer.indexPolicy.mockResolvedValue(undefined);

      // Act
      await listener.onPolicyCreated(event);

      // Assert
      expect(policyIndexer.indexPolicy).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });

    it("should not throw on indexing error", async () => {
      // Arrange
      const event = new PolicyCreatedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        title: "Code of Conduct",
        ownerId: mockUserId,
        actorUserId: mockUserId,
        actorType: "USER",
      });
      mockPolicyIndexer.indexPolicy.mockRejectedValue(
        new Error("ES unavailable"),
      );

      // Act & Assert - should not throw
      await expect(listener.onPolicyCreated(event)).resolves.not.toThrow();
    });
  });

  describe("onPolicyUpdated", () => {
    it("should re-index updated policy", async () => {
      // Arrange
      const event = new PolicyUpdatedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        changes: { title: { old: "Old Title", new: "New Title" } },
        actorUserId: mockUserId,
        actorType: "USER",
      });
      mockPolicyIndexer.indexPolicy.mockResolvedValue(undefined);

      // Act
      await listener.onPolicyUpdated(event);

      // Assert
      expect(policyIndexer.indexPolicy).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });

    it("should not throw on indexing error", async () => {
      // Arrange
      const event = new PolicyUpdatedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        changes: { title: { old: "Old Title", new: "New Title" } },
        actorUserId: mockUserId,
        actorType: "USER",
      });
      mockPolicyIndexer.indexPolicy.mockRejectedValue(new Error("ES timeout"));

      // Act & Assert
      await expect(listener.onPolicyUpdated(event)).resolves.not.toThrow();
    });
  });

  describe("onPolicyPublished", () => {
    it("should re-index published policy", async () => {
      // Arrange
      const event = new PolicyPublishedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        policyVersionId: mockVersionId,
        version: 2,
        actorUserId: mockUserId,
        actorType: "USER",
      });
      mockPolicyIndexer.indexPolicy.mockResolvedValue(undefined);

      // Act
      await listener.onPolicyPublished(event);

      // Assert
      expect(policyIndexer.indexPolicy).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });

    it("should not throw on indexing error", async () => {
      // Arrange
      const event = new PolicyPublishedEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        policyVersionId: mockVersionId,
        version: 1,
        actorUserId: mockUserId,
        actorType: "USER",
      });
      mockPolicyIndexer.indexPolicy.mockRejectedValue(
        new Error("Connection refused"),
      );

      // Act & Assert
      await expect(listener.onPolicyPublished(event)).resolves.not.toThrow();
    });
  });

  describe("onPolicyRetired", () => {
    it("should re-index retired policy", async () => {
      // Arrange
      const event = new PolicyRetiredEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        actorUserId: mockUserId,
        actorType: "USER",
      });
      mockPolicyIndexer.indexPolicy.mockResolvedValue(undefined);

      // Act
      await listener.onPolicyRetired(event);

      // Assert
      expect(policyIndexer.indexPolicy).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });

    it("should not throw on indexing error", async () => {
      // Arrange
      const event = new PolicyRetiredEvent({
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        actorUserId: mockUserId,
        actorType: "USER",
      });
      mockPolicyIndexer.indexPolicy.mockRejectedValue(
        new Error("Network error"),
      );

      // Act & Assert
      await expect(listener.onPolicyRetired(event)).resolves.not.toThrow();
    });
  });

  describe("onTranslationCreated", () => {
    it("should re-index policy after translation created", async () => {
      // Arrange
      const event = {
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        languageCode: "es",
      };
      mockPolicyIndexer.indexPolicy.mockResolvedValue(undefined);

      // Act
      await listener.onTranslationCreated(event);

      // Assert
      expect(policyIndexer.indexPolicy).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });

    it("should not throw on indexing error", async () => {
      // Arrange
      const event = {
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        languageCode: "es",
      };
      mockPolicyIndexer.indexPolicy.mockRejectedValue(new Error("Failed"));

      // Act & Assert
      await expect(listener.onTranslationCreated(event)).resolves.not.toThrow();
    });
  });

  describe("onTranslationUpdated", () => {
    it("should re-index policy after translation updated", async () => {
      // Arrange
      const event = {
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        languageCode: "fr",
      };
      mockPolicyIndexer.indexPolicy.mockResolvedValue(undefined);

      // Act
      await listener.onTranslationUpdated(event);

      // Assert
      expect(policyIndexer.indexPolicy).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });

    it("should not throw on indexing error", async () => {
      // Arrange
      const event = {
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        languageCode: "fr",
      };
      mockPolicyIndexer.indexPolicy.mockRejectedValue(new Error("Failed"));

      // Act & Assert
      await expect(listener.onTranslationUpdated(event)).resolves.not.toThrow();
    });
  });

  describe("onPolicyCaseLinked", () => {
    it("should re-index policy after case linked", async () => {
      // Arrange
      const event = {
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        caseId: mockCaseId,
      };
      mockPolicyIndexer.indexPolicy.mockResolvedValue(undefined);

      // Act
      await listener.onPolicyCaseLinked(event);

      // Assert
      expect(policyIndexer.indexPolicy).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });

    it("should not throw on indexing error", async () => {
      // Arrange
      const event = {
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        caseId: mockCaseId,
      };
      mockPolicyIndexer.indexPolicy.mockRejectedValue(new Error("ES error"));

      // Act & Assert
      await expect(listener.onPolicyCaseLinked(event)).resolves.not.toThrow();
    });
  });

  describe("onPolicyCaseUnlinked", () => {
    it("should re-index policy after case unlinked", async () => {
      // Arrange
      const event = {
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        caseId: mockCaseId,
      };
      mockPolicyIndexer.indexPolicy.mockResolvedValue(undefined);

      // Act
      await listener.onPolicyCaseUnlinked(event);

      // Assert
      expect(policyIndexer.indexPolicy).toHaveBeenCalledWith(
        mockPolicyId,
        mockOrgId,
      );
    });

    it("should not throw on indexing error", async () => {
      // Arrange
      const event = {
        organizationId: mockOrgId,
        policyId: mockPolicyId,
        caseId: mockCaseId,
      };
      mockPolicyIndexer.indexPolicy.mockRejectedValue(new Error("Failed"));

      // Act & Assert
      await expect(listener.onPolicyCaseUnlinked(event)).resolves.not.toThrow();
    });
  });
});
