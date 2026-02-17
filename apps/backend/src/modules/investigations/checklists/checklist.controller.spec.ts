import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { InvestigationChecklistController } from "./checklist.controller";
import { InvestigationChecklistService } from "./checklist.service";

describe("InvestigationChecklistController", () => {
  let controller: InvestigationChecklistController;
  let checklistService: jest.Mocked<InvestigationChecklistService>;

  const mockOrganizationId = "org-123";
  const mockUserId = "user-456";
  const mockInvestigationId = "inv-001";

  const mockUser = {
    id: mockUserId,
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    organizationId: mockOrganizationId,
    role: "INVESTIGATOR",
  };

  const mockChecklistProgress = {
    id: "chk-001",
    investigationId: mockInvestigationId,
    templateId: "tpl-001",
    templateVersion: 1,
    template: {
      name: "Test Template",
      sections: [],
    },
    itemStates: {},
    sectionStates: {},
    customItems: [],
    skippedItems: [],
    totalItems: 2,
    completedItems: 0,
    skippedCount: 0,
    customCount: 0,
    progressPercent: 0,
  };

  const mockChecklistService = {
    applyTemplate: jest.fn(),
    getProgress: jest.fn(),
    completeItem: jest.fn(),
    skipItem: jest.fn(),
    uncompleteItem: jest.fn(),
    addCustomItem: jest.fn(),
    deleteChecklist: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestigationChecklistController],
      providers: [
        {
          provide: InvestigationChecklistService,
          useValue: mockChecklistService,
        },
      ],
    }).compile();

    controller = module.get<InvestigationChecklistController>(
      InvestigationChecklistController,
    );
    checklistService = module.get(InvestigationChecklistService);

    jest.clearAllMocks();
  });

  describe("applyTemplate", () => {
    it("should apply template to investigation", async () => {
      const dto = {
        investigationId: mockInvestigationId,
        templateId: "tpl-001",
      };
      mockChecklistService.applyTemplate.mockResolvedValue(
        mockChecklistProgress,
      );

      const result = await controller.applyTemplate(
        dto,
        mockUser as never,
        mockOrganizationId,
      );

      expect(checklistService.applyTemplate).toHaveBeenCalledWith(
        mockOrganizationId,
        mockUserId,
        "John Doe",
        dto,
      );
      expect(result).toEqual(mockChecklistProgress);
    });
  });

  describe("getProgress", () => {
    it("should return checklist progress", async () => {
      mockChecklistService.getProgress.mockResolvedValue(mockChecklistProgress);

      const result = await controller.getProgress(
        mockInvestigationId,
        mockOrganizationId,
      );

      expect(checklistService.getProgress).toHaveBeenCalledWith(
        mockOrganizationId,
        mockInvestigationId,
      );
      expect(result).toEqual(mockChecklistProgress);
    });

    it("should throw NotFoundException when checklist not found", async () => {
      mockChecklistService.getProgress.mockResolvedValue(null);

      await expect(
        controller.getProgress(mockInvestigationId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("completeItem", () => {
    it("should mark item as complete", async () => {
      const dto = { completionNotes: "Done" };
      const updatedProgress = {
        ...mockChecklistProgress,
        completedItems: 1,
      };
      mockChecklistService.completeItem.mockResolvedValue(updatedProgress);

      const result = await controller.completeItem(
        mockInvestigationId,
        "item-1",
        dto,
        mockUser as never,
        mockOrganizationId,
      );

      expect(checklistService.completeItem).toHaveBeenCalledWith(
        mockOrganizationId,
        mockInvestigationId,
        "item-1",
        mockUserId,
        "John Doe",
        dto,
      );
      expect(result.completedItems).toBe(1);
    });
  });

  describe("skipItem", () => {
    it("should skip item with reason", async () => {
      const dto = { reason: "Not applicable" };
      const updatedProgress = {
        ...mockChecklistProgress,
        skippedCount: 1,
      };
      mockChecklistService.skipItem.mockResolvedValue(updatedProgress);

      const result = await controller.skipItem(
        mockInvestigationId,
        "item-1",
        dto,
        mockUser as never,
        mockOrganizationId,
      );

      expect(checklistService.skipItem).toHaveBeenCalledWith(
        mockOrganizationId,
        mockInvestigationId,
        "item-1",
        mockUserId,
        "John Doe",
        dto,
      );
      expect(result.skippedCount).toBe(1);
    });
  });

  describe("uncompleteItem", () => {
    it("should revert completed item", async () => {
      mockChecklistService.uncompleteItem.mockResolvedValue(
        mockChecklistProgress,
      );

      const result = await controller.uncompleteItem(
        mockInvestigationId,
        "item-1",
        mockUser as never,
        mockOrganizationId,
      );

      expect(checklistService.uncompleteItem).toHaveBeenCalledWith(
        mockOrganizationId,
        mockInvestigationId,
        "item-1",
        mockUserId,
      );
      expect(result).toEqual(mockChecklistProgress);
    });
  });

  describe("addCustomItem", () => {
    it("should add custom item", async () => {
      const dto = {
        sectionId: "sec-1",
        text: "Custom item",
        required: false,
      };
      const updatedProgress = {
        ...mockChecklistProgress,
        customCount: 1,
        totalItems: 3,
      };
      mockChecklistService.addCustomItem.mockResolvedValue(updatedProgress);

      const result = await controller.addCustomItem(
        mockInvestigationId,
        dto,
        mockUser as never,
        mockOrganizationId,
      );

      expect(checklistService.addCustomItem).toHaveBeenCalledWith(
        mockOrganizationId,
        mockInvestigationId,
        mockUserId,
        "John Doe",
        dto,
      );
      expect(result.customCount).toBe(1);
    });
  });

  describe("deleteChecklist", () => {
    it("should delete checklist", async () => {
      mockChecklistService.deleteChecklist.mockResolvedValue(undefined);

      await controller.deleteChecklist(
        mockInvestigationId,
        mockUser as never,
        mockOrganizationId,
      );

      expect(checklistService.deleteChecklist).toHaveBeenCalledWith(
        mockOrganizationId,
        mockInvestigationId,
        mockUserId,
      );
    });
  });
});
