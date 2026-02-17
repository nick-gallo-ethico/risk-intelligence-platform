import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { PipelineController } from "./pipeline.controller";
import { PipelineService, DEFAULT_CASE_STAGES } from "./pipeline.service";
import { PipelineConfigDto, PipelineStageDto } from "./dto/pipeline.dto";

describe("PipelineController", () => {
  let controller: PipelineController;
  let pipelineService: jest.Mocked<PipelineService>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";

  const mockDefaultPipeline: PipelineConfigDto = {
    id: "default-case-pipeline",
    moduleType: "cases",
    name: "Default Case Pipeline",
    stages: DEFAULT_CASE_STAGES,
    isDefault: true,
  };

  // Mock Setup
  const mockPipelineService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    getStage: jest.fn(),
    validateTransition: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipelineController],
      providers: [{ provide: PipelineService, useValue: mockPipelineService }],
    }).compile();

    controller = module.get<PipelineController>(PipelineController);
    pipelineService = module.get(PipelineService);

    jest.clearAllMocks();
  });

  describe("listPipelines", () => {
    it("should return all pipelines for organization", async () => {
      // Arrange
      mockPipelineService.findAll.mockResolvedValue([mockDefaultPipeline]);

      // Act
      const result = await controller.listPipelines(mockOrgId);

      // Assert
      expect(result).toEqual([mockDefaultPipeline]);
      expect(pipelineService.findAll).toHaveBeenCalledWith(mockOrgId);
    });

    it("should pass organization id to service", async () => {
      // Arrange
      mockPipelineService.findAll.mockResolvedValue([mockDefaultPipeline]);

      // Act
      await controller.listPipelines(mockOrgId);

      // Assert
      expect(pipelineService.findAll).toHaveBeenCalledWith(mockOrgId);
    });

    it("should return empty array when no pipelines exist", async () => {
      // Arrange
      mockPipelineService.findAll.mockResolvedValue([]);

      // Act
      const result = await controller.listPipelines(mockOrgId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return multiple pipelines if available", async () => {
      // Arrange
      const customPipeline: PipelineConfigDto = {
        id: "custom-pipeline",
        moduleType: "cases",
        name: "Custom Pipeline",
        stages: [],
        isDefault: false,
      };
      mockPipelineService.findAll.mockResolvedValue([
        mockDefaultPipeline,
        customPipeline,
      ]);

      // Act
      const result = await controller.listPipelines(mockOrgId);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe("getPipeline", () => {
    it("should return pipeline by id", async () => {
      // Arrange
      mockPipelineService.findOne.mockResolvedValue(mockDefaultPipeline);

      // Act
      const result = await controller.getPipeline(
        "default-case-pipeline",
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mockDefaultPipeline);
      expect(pipelineService.findOne).toHaveBeenCalledWith(
        "default-case-pipeline",
        mockOrgId,
      );
    });

    it("should throw NotFoundException when pipeline not found", async () => {
      // Arrange
      mockPipelineService.findOne.mockRejectedValue(
        new NotFoundException("Pipeline with ID unknown not found"),
      );

      // Act & Assert
      await expect(
        controller.getPipeline("unknown", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should pass correct parameters to service", async () => {
      // Arrange
      mockPipelineService.findOne.mockResolvedValue(mockDefaultPipeline);

      // Act
      await controller.getPipeline("default-case-pipeline", mockOrgId);

      // Assert
      expect(pipelineService.findOne).toHaveBeenCalledWith(
        "default-case-pipeline",
        mockOrgId,
      );
    });
  });

  describe("updatePipeline", () => {
    it("should update pipeline name", async () => {
      // Arrange
      const updatedPipeline = {
        ...mockDefaultPipeline,
        name: "Updated Pipeline Name",
      };
      mockPipelineService.update.mockResolvedValue(updatedPipeline);

      // Act
      const result = await controller.updatePipeline(
        "default-case-pipeline",
        { name: "Updated Pipeline Name" },
        mockOrgId,
      );

      // Assert
      expect(result.name).toBe("Updated Pipeline Name");
    });

    it("should update pipeline stages", async () => {
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
      const updatedPipeline = { ...mockDefaultPipeline, stages: customStages };
      mockPipelineService.update.mockResolvedValue(updatedPipeline);

      // Act
      const result = await controller.updatePipeline(
        "default-case-pipeline",
        { stages: customStages },
        mockOrgId,
      );

      // Assert
      expect(result.stages).toEqual(customStages);
    });

    it("should pass correct parameters to service", async () => {
      // Arrange
      mockPipelineService.update.mockResolvedValue(mockDefaultPipeline);
      const updateDto = { name: "New Name" };

      // Act
      await controller.updatePipeline(
        "default-case-pipeline",
        updateDto,
        mockOrgId,
      );

      // Assert
      expect(pipelineService.update).toHaveBeenCalledWith(
        "default-case-pipeline",
        updateDto,
        mockOrgId,
      );
    });

    it("should throw BadRequestException for validation errors", async () => {
      // Arrange
      mockPipelineService.update.mockRejectedValue(
        new BadRequestException("Pipeline stages must have unique IDs"),
      );

      // Act & Assert
      await expect(
        controller.updatePipeline(
          "default-case-pipeline",
          { stages: [] },
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException for unknown pipeline", async () => {
      // Arrange
      mockPipelineService.update.mockRejectedValue(
        new NotFoundException("Pipeline with ID unknown not found"),
      );

      // Act & Assert
      await expect(
        controller.updatePipeline("unknown", { name: "New Name" }, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getStage", () => {
    it("should return stage by id", async () => {
      // Arrange
      const stage = DEFAULT_CASE_STAGES[0];
      mockPipelineService.getStage.mockResolvedValue(stage);

      // Act
      const result = await controller.getStage(
        "default-case-pipeline",
        "new",
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(stage);
    });

    it("should return null for non-existent stage", async () => {
      // Arrange
      mockPipelineService.getStage.mockResolvedValue(null);

      // Act
      const result = await controller.getStage(
        "default-case-pipeline",
        "non-existent",
        mockOrgId,
      );

      // Assert
      expect(result).toBeNull();
    });

    it("should pass correct parameters to service", async () => {
      // Arrange
      mockPipelineService.getStage.mockResolvedValue(null);

      // Act
      await controller.getStage("default-case-pipeline", "assigned", mockOrgId);

      // Assert
      expect(pipelineService.getStage).toHaveBeenCalledWith(
        "default-case-pipeline",
        "assigned",
        mockOrgId,
      );
    });

    it("should throw NotFoundException for unknown pipeline", async () => {
      // Arrange
      mockPipelineService.getStage.mockRejectedValue(
        new NotFoundException("Pipeline with ID unknown not found"),
      );

      // Act & Assert
      await expect(
        controller.getStage("unknown", "new", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("validateTransition", () => {
    it("should return valid: true for valid transition", async () => {
      // Arrange
      mockPipelineService.validateTransition.mockResolvedValue(true);

      // Act
      const result = await controller.validateTransition(
        "default-case-pipeline",
        "new",
        "assigned",
        mockOrgId,
      );

      // Assert
      expect(result).toEqual({ valid: true });
    });

    it("should return valid: false for invalid transition", async () => {
      // Arrange
      mockPipelineService.validateTransition.mockResolvedValue(false);

      // Act
      const result = await controller.validateTransition(
        "default-case-pipeline",
        "new",
        "closed",
        mockOrgId,
      );

      // Assert
      expect(result).toEqual({ valid: false });
    });

    it("should pass correct parameters to service", async () => {
      // Arrange
      mockPipelineService.validateTransition.mockResolvedValue(true);

      // Act
      await controller.validateTransition(
        "default-case-pipeline",
        "active",
        "review",
        mockOrgId,
      );

      // Assert
      expect(pipelineService.validateTransition).toHaveBeenCalledWith(
        "default-case-pipeline",
        "active",
        "review",
        mockOrgId,
      );
    });

    it("should throw NotFoundException for unknown pipeline", async () => {
      // Arrange
      mockPipelineService.validateTransition.mockRejectedValue(
        new NotFoundException("Pipeline with ID unknown not found"),
      );

      // Act & Assert
      await expect(
        controller.validateTransition("unknown", "new", "assigned", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
