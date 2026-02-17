import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { PipelineService, DEFAULT_CASE_STAGES } from "./pipeline.service";
import { PrismaService } from "../prisma/prisma.service";
import { PipelineStageDto } from "./dto/pipeline.dto";

describe("PipelineService", () => {
  let service: PipelineService;
  let prisma: jest.Mocked<PrismaService>;

  // Test Data Fixtures
  const mockTenantId = "tenant-test-123";

  // Mock Setup
  const mockPrismaService = {
    // Future: Pipeline config storage
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PipelineService>(PipelineService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return default pipeline configuration", async () => {
      // Act
      const result = await service.findAll(mockTenantId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "default-case-pipeline",
        moduleType: "cases",
        name: "Default Case Pipeline",
        isDefault: true,
      });
    });

    it("should return pipeline with all default stages", async () => {
      // Act
      const result = await service.findAll(mockTenantId);

      // Assert
      expect(result[0].stages).toEqual(DEFAULT_CASE_STAGES);
      expect(result[0].stages).toHaveLength(7);
    });

    it("should include correct stage properties", async () => {
      // Act
      const result = await service.findAll(mockTenantId);
      const stages = result[0].stages;

      // Assert - Check first stage has all required properties
      const newStage = stages.find((s) => s.id === "new");
      expect(newStage).toMatchObject({
        id: "new",
        name: "New",
        order: 0,
        color: expect.any(String),
        isClosed: false,
        allowedTransitions: expect.any(Array),
      });
    });

    it("should have closed stages marked correctly", async () => {
      // Act
      const result = await service.findAll(mockTenantId);
      const stages = result[0].stages;

      // Assert
      const closedStage = stages.find((s) => s.id === "closed");
      const archivedStage = stages.find((s) => s.id === "archived");
      expect(closedStage?.isClosed).toBe(true);
      expect(archivedStage?.isClosed).toBe(true);

      const newStage = stages.find((s) => s.id === "new");
      expect(newStage?.isClosed).toBe(false);
    });

    it("should return same default for different tenants", async () => {
      // Act
      const result1 = await service.findAll("tenant-1");
      const result2 = await service.findAll("tenant-2");

      // Assert
      expect(result1).toEqual(result2);
    });
  });

  describe("findOne", () => {
    it("should return default pipeline when id matches", async () => {
      // Act
      const result = await service.findOne(
        "default-case-pipeline",
        mockTenantId,
      );

      // Assert
      expect(result).toMatchObject({
        id: "default-case-pipeline",
        moduleType: "cases",
        name: "Default Case Pipeline",
        isDefault: true,
      });
    });

    it("should return pipeline with all stages", async () => {
      // Act
      const result = await service.findOne(
        "default-case-pipeline",
        mockTenantId,
      );

      // Assert
      expect(result.stages).toEqual(DEFAULT_CASE_STAGES);
    });

    it("should throw NotFoundException for unknown pipeline id", async () => {
      // Act & Assert
      await expect(
        service.findOne("unknown-pipeline", mockTenantId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findOne("unknown-pipeline", mockTenantId),
      ).rejects.toThrow("Pipeline with ID unknown-pipeline not found");
    });

    it("should throw NotFoundException for empty id", async () => {
      // Act & Assert
      await expect(service.findOne("", mockTenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should return updated pipeline with new name", async () => {
      // Act
      const result = await service.update(
        "default-case-pipeline",
        { name: "Custom Pipeline Name" },
        mockTenantId,
      );

      // Assert
      expect(result.name).toBe("Custom Pipeline Name");
      expect(result.id).toBe("default-case-pipeline");
    });

    it("should return updated pipeline with new stages", async () => {
      // Arrange
      const customStages: PipelineStageDto[] = [
        {
          id: "start",
          name: "Start",
          order: 0,
          color: "#000000",
          isClosed: false,
          allowedTransitions: ["end"],
        },
        {
          id: "end",
          name: "End",
          order: 1,
          color: "#FFFFFF",
          isClosed: true,
          allowedTransitions: [],
        },
      ];

      // Act
      const result = await service.update(
        "default-case-pipeline",
        { stages: customStages },
        mockTenantId,
      );

      // Assert
      expect(result.stages).toEqual(customStages);
    });

    it("should preserve existing values when partial update", async () => {
      // Act
      const result = await service.update(
        "default-case-pipeline",
        { name: "New Name" },
        mockTenantId,
      );

      // Assert
      expect(result.name).toBe("New Name");
      expect(result.stages).toEqual(DEFAULT_CASE_STAGES);
    });

    it("should throw BadRequestException for duplicate stage IDs", async () => {
      // Arrange
      const invalidStages: PipelineStageDto[] = [
        {
          id: "stage1",
          name: "Stage 1",
          order: 0,
          color: "#000000",
          isClosed: false,
          allowedTransitions: [],
        },
        {
          id: "stage1", // Duplicate
          name: "Stage 1 Again",
          order: 1,
          color: "#FFFFFF",
          isClosed: false,
          allowedTransitions: [],
        },
      ];

      // Act & Assert
      await expect(
        service.update(
          "default-case-pipeline",
          { stages: invalidStages },
          mockTenantId,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(
          "default-case-pipeline",
          { stages: invalidStages },
          mockTenantId,
        ),
      ).rejects.toThrow("Pipeline stages must have unique IDs");
    });

    it("should throw BadRequestException for invalid transition target", async () => {
      // Arrange
      const invalidStages: PipelineStageDto[] = [
        {
          id: "stage1",
          name: "Stage 1",
          order: 0,
          color: "#000000",
          isClosed: false,
          allowedTransitions: ["non-existent-stage"],
        },
      ];

      // Act & Assert
      await expect(
        service.update(
          "default-case-pipeline",
          { stages: invalidStages },
          mockTenantId,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(
          "default-case-pipeline",
          { stages: invalidStages },
          mockTenantId,
        ),
      ).rejects.toThrow("references non-existent transition target");
    });

    it("should throw BadRequestException for non-sequential order", async () => {
      // Arrange
      const invalidStages: PipelineStageDto[] = [
        {
          id: "stage1",
          name: "Stage 1",
          order: 0,
          color: "#000000",
          isClosed: false,
          allowedTransitions: [],
        },
        {
          id: "stage2",
          name: "Stage 2",
          order: 2, // Should be 1
          color: "#FFFFFF",
          isClosed: false,
          allowedTransitions: [],
        },
      ];

      // Act & Assert
      await expect(
        service.update(
          "default-case-pipeline",
          { stages: invalidStages },
          mockTenantId,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(
          "default-case-pipeline",
          { stages: invalidStages },
          mockTenantId,
        ),
      ).rejects.toThrow("Stage orders must be sequential starting from 0");
    });

    it("should throw NotFoundException for unknown pipeline", async () => {
      // Act & Assert
      await expect(
        service.update("unknown-pipeline", { name: "New Name" }, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getStage", () => {
    it("should return stage by id", async () => {
      // Act
      const result = await service.getStage(
        "default-case-pipeline",
        "new",
        mockTenantId,
      );

      // Assert
      expect(result).toMatchObject({
        id: "new",
        name: "New",
        order: 0,
        isClosed: false,
      });
    });

    it("should return null for non-existent stage", async () => {
      // Act
      const result = await service.getStage(
        "default-case-pipeline",
        "non-existent",
        mockTenantId,
      );

      // Assert
      expect(result).toBeNull();
    });

    it("should throw NotFoundException for unknown pipeline", async () => {
      // Act & Assert
      await expect(
        service.getStage("unknown-pipeline", "new", mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return closed stage correctly", async () => {
      // Act
      const result = await service.getStage(
        "default-case-pipeline",
        "closed",
        mockTenantId,
      );

      // Assert
      expect(result?.isClosed).toBe(true);
    });

    it("should return stage with allowed transitions", async () => {
      // Act
      const result = await service.getStage(
        "default-case-pipeline",
        "new",
        mockTenantId,
      );

      // Assert
      expect(result?.allowedTransitions).toContain("assigned");
    });
  });

  describe("validateTransition", () => {
    it("should return true for valid transition", async () => {
      // Act
      const result = await service.validateTransition(
        "default-case-pipeline",
        "new",
        "assigned",
        mockTenantId,
      );

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for invalid transition", async () => {
      // Act - "new" cannot go directly to "closed"
      const result = await service.validateTransition(
        "default-case-pipeline",
        "new",
        "closed",
        mockTenantId,
      );

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for non-existent from stage", async () => {
      // Act
      const result = await service.validateTransition(
        "default-case-pipeline",
        "non-existent",
        "assigned",
        mockTenantId,
      );

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when archived has no transitions", async () => {
      // Act - "archived" has no allowed transitions
      const result = await service.validateTransition(
        "default-case-pipeline",
        "archived",
        "new",
        mockTenantId,
      );

      // Assert
      expect(result).toBe(false);
    });

    it("should validate multi-hop transitions correctly", async () => {
      // Act - Test various stages
      const assignedToActive = await service.validateTransition(
        "default-case-pipeline",
        "assigned",
        "active",
        mockTenantId,
      );
      const activeToReview = await service.validateTransition(
        "default-case-pipeline",
        "active",
        "review",
        mockTenantId,
      );
      const reviewToClosed = await service.validateTransition(
        "default-case-pipeline",
        "review",
        "closed",
        mockTenantId,
      );

      // Assert
      expect(assignedToActive).toBe(true);
      expect(activeToReview).toBe(true);
      expect(reviewToClosed).toBe(true);
    });

    it("should validate backward transitions where allowed", async () => {
      // Act - Some stages allow going back
      const assignedToNew = await service.validateTransition(
        "default-case-pipeline",
        "assigned",
        "new",
        mockTenantId,
      );
      const activeToAssigned = await service.validateTransition(
        "default-case-pipeline",
        "active",
        "assigned",
        mockTenantId,
      );

      // Assert
      expect(assignedToNew).toBe(true);
      expect(activeToAssigned).toBe(true);
    });

    it("should throw NotFoundException for unknown pipeline", async () => {
      // Act & Assert
      await expect(
        service.validateTransition(
          "unknown-pipeline",
          "new",
          "assigned",
          mockTenantId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("DEFAULT_CASE_STAGES", () => {
    it("should have correct number of stages", () => {
      expect(DEFAULT_CASE_STAGES).toHaveLength(7);
    });

    it("should have sequential order starting from 0", () => {
      const orders = DEFAULT_CASE_STAGES.map((s) => s.order).sort(
        (a, b) => a - b,
      );
      expect(orders).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it("should have unique IDs", () => {
      const ids = DEFAULT_CASE_STAGES.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("should have valid transition targets", () => {
      const stageIds = DEFAULT_CASE_STAGES.map((s) => s.id);

      for (const stage of DEFAULT_CASE_STAGES) {
        for (const target of stage.allowedTransitions) {
          expect(stageIds).toContain(target);
        }
      }
    });

    it("should have at least one closed stage", () => {
      const closedStages = DEFAULT_CASE_STAGES.filter((s) => s.isClosed);
      expect(closedStages.length).toBeGreaterThan(0);
    });

    it("should have 'new' as first stage", () => {
      const firstStage = DEFAULT_CASE_STAGES.find((s) => s.order === 0);
      expect(firstStage?.id).toBe("new");
    });

    it("should have 'archived' as final stage", () => {
      const lastOrder = Math.max(...DEFAULT_CASE_STAGES.map((s) => s.order));
      const lastStage = DEFAULT_CASE_STAGES.find((s) => s.order === lastOrder);
      expect(lastStage?.id).toBe("archived");
    });
  });
});
