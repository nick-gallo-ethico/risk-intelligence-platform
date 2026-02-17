import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InvestigationChecklistService } from "./checklist.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("InvestigationChecklistService", () => {
  let service: InvestigationChecklistService;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockOrganizationId = "org-123";
  const mockUserId = "user-456";
  const mockUserName = "John Doe";
  const mockInvestigationId = "inv-001";
  const mockTemplateId = "tpl-001";
  const mockChecklistId = "chk-001";

  const mockInvestigation = {
    id: mockInvestigationId,
    organizationId: mockOrganizationId,
  };

  const mockTemplate = {
    id: mockTemplateId,
    name: "Standard Investigation Template",
    version: 1,
    organizationId: mockOrganizationId,
    sections: [
      {
        id: "sec-1",
        name: "Initial Review",
        order: 1,
        items: [
          { id: "item-1", text: "Review complaint", order: 1, required: true },
          { id: "item-2", text: "Identify parties", order: 2, required: false },
        ],
      },
    ],
  };

  const mockChecklistProgress = {
    id: mockChecklistId,
    organizationId: mockOrganizationId,
    investigationId: mockInvestigationId,
    templateId: mockTemplateId,
    templateVersion: 1,
    itemStates: {
      "item-1": { status: "pending" },
      "item-2": { status: "pending" },
    },
    sectionStates: {
      "sec-1": { status: "pending", completedItems: 0, totalItems: 2 },
    },
    customItems: [],
    skippedItems: [],
    totalItems: 2,
    completedItems: 0,
    skippedCount: 0,
    customCount: 0,
    progressPercent: 0,
    startedAt: null,
    completedAt: null,
    lastActivityAt: null,
  };

  // Mock Setup - define outside beforeEach so references work
  const mockPrismaService = {
    investigation: {
      findFirst: jest.fn(),
    },
    investigationChecklistProgress: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    investigationTemplate: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestigationChecklistService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<InvestigationChecklistService>(
      InvestigationChecklistService,
    );
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe("applyTemplate", () => {
    const applyDto = {
      investigationId: mockInvestigationId,
      templateId: mockTemplateId,
    };

    it("should apply template and create checklist progress", async () => {
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation as never,
      );
      mockPrismaService.investigationChecklistProgress.findUnique.mockResolvedValue(
        null as never,
      );
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(
        mockTemplate as never,
      );
      mockPrismaService.investigationChecklistProgress.create.mockResolvedValue(
        mockChecklistProgress as never,
      );
      mockPrismaService.investigationTemplate.update.mockResolvedValue(
        mockTemplate as never,
      );

      const result = await service.applyTemplate(
        mockOrganizationId,
        mockUserId,
        mockUserName,
        applyDto,
      );

      expect(mockPrismaService.investigation.findFirst).toHaveBeenCalledWith({
        where: { id: mockInvestigationId, organizationId: mockOrganizationId },
      });
      expect(
        mockPrismaService.investigationChecklistProgress.create,
      ).toHaveBeenCalled();
      expect(
        mockPrismaService.investigationTemplate.update,
      ).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
        data: { usageCount: { increment: 1 } },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "investigation.checklist.applied",
        expect.any(Object),
      );
      expect(result.templateId).toBe(mockTemplateId);
    });

    it("should throw NotFoundException when investigation not found", async () => {
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        null as never,
      );

      await expect(
        service.applyTemplate(
          mockOrganizationId,
          mockUserId,
          mockUserName,
          applyDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when checklist already exists", async () => {
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation as never,
      );
      mockPrismaService.investigationChecklistProgress.findUnique.mockResolvedValue(
        mockChecklistProgress as never,
      );

      await expect(
        service.applyTemplate(
          mockOrganizationId,
          mockUserId,
          mockUserName,
          applyDto,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException when template not found", async () => {
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation as never,
      );
      mockPrismaService.investigationChecklistProgress.findUnique.mockResolvedValue(
        null as never,
      );
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(
        null as never,
      );

      await expect(
        service.applyTemplate(
          mockOrganizationId,
          mockUserId,
          mockUserName,
          applyDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getProgress", () => {
    it("should return checklist progress when found", async () => {
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        mockChecklistProgress as never,
      );
      mockPrismaService.investigationTemplate.findUnique.mockResolvedValue(
        mockTemplate as never,
      );

      const result = await service.getProgress(
        mockOrganizationId,
        mockInvestigationId,
      );

      expect(result).not.toBeNull();
      expect(result!.investigationId).toBe(mockInvestigationId);
    });

    it("should return null when no checklist found", async () => {
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        null as never,
      );

      const result = await service.getProgress(
        mockOrganizationId,
        mockInvestigationId,
      );

      expect(result).toBeNull();
    });
  });

  describe("completeItem", () => {
    const completeDto = {
      completionNotes: "Reviewed the complaint thoroughly",
    };

    it("should mark item as completed", async () => {
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        mockChecklistProgress as never,
      );
      mockPrismaService.investigationTemplate.findUnique.mockResolvedValue(
        mockTemplate as never,
      );
      const updatedProgress = {
        ...mockChecklistProgress,
        completedItems: 1,
        itemStates: {
          "item-1": { status: "completed" },
          "item-2": { status: "pending" },
        },
      };
      mockPrismaService.investigationChecklistProgress.update.mockResolvedValue(
        updatedProgress as never,
      );

      const result = await service.completeItem(
        mockOrganizationId,
        mockInvestigationId,
        "item-1",
        mockUserId,
        mockUserName,
        completeDto,
      );

      expect(
        mockPrismaService.investigationChecklistProgress.update,
      ).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "investigation.checklist.item.completed",
        expect.any(Object),
      );
      expect(result.completedItems).toBe(1);
    });

    it("should throw BadRequestException when item not found", async () => {
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        mockChecklistProgress as never,
      );
      mockPrismaService.investigationTemplate.findUnique.mockResolvedValue(
        mockTemplate as never,
      );

      await expect(
        service.completeItem(
          mockOrganizationId,
          mockInvestigationId,
          "non-existent-item",
          mockUserId,
          mockUserName,
          completeDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when item already completed", async () => {
      const progressWithCompletedItem = {
        ...mockChecklistProgress,
        itemStates: {
          "item-1": { status: "completed" },
          "item-2": { status: "pending" },
        },
      };
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        progressWithCompletedItem as never,
      );
      mockPrismaService.investigationTemplate.findUnique.mockResolvedValue(
        mockTemplate as never,
      );

      await expect(
        service.completeItem(
          mockOrganizationId,
          mockInvestigationId,
          "item-1",
          mockUserId,
          mockUserName,
          completeDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("skipItem", () => {
    const skipDto = {
      reason: "Not applicable for this investigation",
    };

    it("should mark optional item as skipped", async () => {
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        mockChecklistProgress as never,
      );
      mockPrismaService.investigationTemplate.findUnique.mockResolvedValue(
        mockTemplate as never,
      );
      const updatedProgress = {
        ...mockChecklistProgress,
        skippedCount: 1,
        itemStates: {
          "item-1": { status: "pending" },
          "item-2": { status: "skipped" },
        },
      };
      mockPrismaService.investigationChecklistProgress.update.mockResolvedValue(
        updatedProgress as never,
      );

      const result = await service.skipItem(
        mockOrganizationId,
        mockInvestigationId,
        "item-2",
        mockUserId,
        mockUserName,
        skipDto,
      );

      expect(
        mockPrismaService.investigationChecklistProgress.update,
      ).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "investigation.checklist.item.skipped",
        expect.any(Object),
      );
      expect(result.skippedCount).toBe(1);
    });

    it("should throw BadRequestException when trying to skip required item", async () => {
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        mockChecklistProgress as never,
      );
      mockPrismaService.investigationTemplate.findUnique.mockResolvedValue(
        mockTemplate as never,
      );

      await expect(
        service.skipItem(
          mockOrganizationId,
          mockInvestigationId,
          "item-1", // This is a required item
          mockUserId,
          mockUserName,
          skipDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("uncompleteItem", () => {
    it("should revert completed item to pending", async () => {
      const progressWithCompletedItem = {
        ...mockChecklistProgress,
        completedItems: 1,
        itemStates: {
          "item-1": { status: "completed" },
          "item-2": { status: "pending" },
        },
        sectionStates: {
          "sec-1": { status: "in_progress", completedItems: 1, totalItems: 2 },
        },
      };
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        progressWithCompletedItem as never,
      );
      mockPrismaService.investigationTemplate.findUnique.mockResolvedValue(
        mockTemplate as never,
      );
      mockPrismaService.investigationChecklistProgress.update.mockResolvedValue(
        mockChecklistProgress as never,
      );

      const result = await service.uncompleteItem(
        mockOrganizationId,
        mockInvestigationId,
        "item-1",
        mockUserId,
      );

      expect(
        mockPrismaService.investigationChecklistProgress.update,
      ).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "investigation.checklist.item.uncompleted",
        expect.any(Object),
      );
      expect(result).toBeDefined();
    });

    it("should throw BadRequestException when item is pending", async () => {
      // Create a fresh progress with all items pending
      const freshProgress = {
        ...mockChecklistProgress,
        itemStates: {
          "item-1": { status: "pending" },
          "item-2": { status: "pending" },
        },
        sectionStates: {
          "sec-1": { status: "pending", completedItems: 0, totalItems: 2 },
        },
        skippedItems: [],
      };
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        freshProgress as never,
      );
      mockPrismaService.investigationTemplate.findUnique.mockResolvedValue(
        mockTemplate as never,
      );

      await expect(
        service.uncompleteItem(
          mockOrganizationId,
          mockInvestigationId,
          "item-1",
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("addCustomItem", () => {
    const addCustomDto = {
      sectionId: "sec-1",
      text: "Custom checklist item",
      required: false,
    };

    it("should add custom item to section", async () => {
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        mockChecklistProgress as never,
      );
      mockPrismaService.investigationTemplate.findUnique.mockResolvedValue(
        mockTemplate as never,
      );
      const updatedProgress = {
        ...mockChecklistProgress,
        totalItems: 3,
        customCount: 1,
      };
      mockPrismaService.investigationChecklistProgress.update.mockResolvedValue(
        updatedProgress as never,
      );

      const result = await service.addCustomItem(
        mockOrganizationId,
        mockInvestigationId,
        mockUserId,
        mockUserName,
        addCustomDto,
      );

      expect(
        mockPrismaService.investigationChecklistProgress.update,
      ).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "investigation.checklist.item.added",
        expect.any(Object),
      );
      expect(result.customCount).toBe(1);
    });

    it("should throw BadRequestException when section not found", async () => {
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        mockChecklistProgress as never,
      );
      mockPrismaService.investigationTemplate.findUnique.mockResolvedValue(
        mockTemplate as never,
      );

      const invalidDto = { ...addCustomDto, sectionId: "non-existent" };

      await expect(
        service.addCustomItem(
          mockOrganizationId,
          mockInvestigationId,
          mockUserId,
          mockUserName,
          invalidDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("deleteChecklist", () => {
    it("should delete checklist progress", async () => {
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        mockChecklistProgress as never,
      );
      mockPrismaService.investigationChecklistProgress.delete.mockResolvedValue(
        mockChecklistProgress as never,
      );

      await service.deleteChecklist(
        mockOrganizationId,
        mockInvestigationId,
        mockUserId,
      );

      expect(
        mockPrismaService.investigationChecklistProgress.delete,
      ).toHaveBeenCalledWith({
        where: { id: mockChecklistId },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "investigation.checklist.deleted",
        expect.any(Object),
      );
    });

    it("should throw NotFoundException when checklist not found", async () => {
      mockPrismaService.investigationChecklistProgress.findFirst.mockResolvedValue(
        null as never,
      );

      await expect(
        service.deleteChecklist(
          mockOrganizationId,
          mockInvestigationId,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("hasActiveInstances", () => {
    it("should return true when active instances exist", async () => {
      mockPrismaService.investigationChecklistProgress.count.mockResolvedValue(
        3 as never,
      );

      const result = await service.hasActiveInstances(
        mockOrganizationId,
        mockTemplateId,
      );

      expect(result).toBe(true);
      expect(
        mockPrismaService.investigationChecklistProgress.count,
      ).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          templateId: mockTemplateId,
          completedAt: null,
        },
      });
    });

    it("should return false when no active instances", async () => {
      mockPrismaService.investigationChecklistProgress.count.mockResolvedValue(
        0 as never,
      );

      const result = await service.hasActiveInstances(
        mockOrganizationId,
        mockTemplateId,
      );

      expect(result).toBe(false);
    });
  });
});
