import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InvestigationTemplateService } from "./template.service";
import { PrismaService } from "../../prisma/prisma.service";
import { TemplateTier } from "@prisma/client";

describe("InvestigationTemplateService", () => {
  let service: InvestigationTemplateService;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockOrganizationId = "org-123";
  const mockUserId = "user-456";
  const mockOtherUserId = "user-789";
  const mockTemplateId = "tpl-001";

  const mockTemplate = {
    id: mockTemplateId,
    organizationId: mockOrganizationId,
    createdById: mockUserId,
    name: "Investigation Checklist",
    description: "Standard investigation checklist",
    categoryId: null,
    tier: TemplateTier.OFFICIAL,
    sharedWithTeamId: null,
    sections: [
      {
        id: "sec-1",
        name: "Initial Review",
        order: 1,
        items: [
          { id: "item-1", text: "Review complaint", order: 1, required: true },
        ],
      },
    ],
    suggestedDurations: null,
    conditionalRules: null,
    isDefault: false,
    isActive: true,
    isArchived: false,
    version: 1,
    sourceTemplateId: null,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock Setup - define outside beforeEach
  const mockPrismaService = {
    investigationTemplate: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    investigationChecklistProgress: {
      count: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestigationTemplateService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<InvestigationTemplateService>(
      InvestigationTemplateService,
    );
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDto = {
      name: "New Template",
      description: "Description",
      sections: [
        {
          id: "sec-1",
          name: "Section 1",
          order: 1,
          items: [{ id: "item-1", text: "Item 1", order: 1, required: false }],
        },
      ],
    };

    it("should create a template", async () => {
      mockPrismaService.investigationTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      const result = await service.create(
        mockOrganizationId,
        mockUserId,
        createDto as never,
      );

      expect(mockPrismaService.investigationTemplate.create).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "investigation.template.created",
        expect.any(Object),
      );
      expect(result.name).toBe(mockTemplate.name);
    });

    it("should reject duplicate section IDs", async () => {
      const invalidDto = {
        ...createDto,
        sections: [
          { id: "sec-1", name: "Section 1", order: 1, items: [] },
          { id: "sec-1", name: "Section 2", order: 2, items: [] }, // Duplicate
        ],
      };

      await expect(
        service.create(mockOrganizationId, mockUserId, invalidDto as never),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject duplicate item IDs", async () => {
      const invalidDto = {
        ...createDto,
        sections: [
          {
            id: "sec-1",
            name: "Section 1",
            order: 1,
            items: [
              { id: "item-1", text: "Item 1", order: 1 },
              { id: "item-1", text: "Item 2", order: 2 }, // Duplicate
            ],
          },
        ],
      };

      await expect(
        service.create(mockOrganizationId, mockUserId, invalidDto as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findById", () => {
    it("should return template when found", async () => {
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );

      const result = await service.findById(mockOrganizationId, mockTemplateId);

      expect(result).toEqual(mockTemplate);
      expect(
        mockPrismaService.investigationTemplate.findFirst,
      ).toHaveBeenCalledWith({
        where: { id: mockTemplateId, organizationId: mockOrganizationId },
      });
    });

    it("should throw NotFoundException when not found", async () => {
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(mockOrganizationId, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAll", () => {
    it("should return paginated templates", async () => {
      mockPrismaService.investigationTemplate.findMany.mockResolvedValue([
        mockTemplate,
      ]);
      mockPrismaService.investigationTemplate.count.mockResolvedValue(1);

      const result = await service.findAll(mockOrganizationId, mockUserId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("should filter by tier when provided", async () => {
      mockPrismaService.investigationTemplate.findMany.mockResolvedValue([]);
      mockPrismaService.investigationTemplate.count.mockResolvedValue(0);

      await service.findAll(mockOrganizationId, mockUserId, {
        tier: TemplateTier.OFFICIAL,
      });

      expect(
        mockPrismaService.investigationTemplate.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tier: TemplateTier.OFFICIAL,
          }),
        }),
      );
    });
  });

  describe("update", () => {
    it("should update template", async () => {
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.investigationTemplate.update.mockResolvedValue({
        ...mockTemplate,
        name: "Updated Name",
      });

      const result = await service.update(
        mockOrganizationId,
        mockTemplateId,
        mockUserId,
        { name: "Updated Name" },
      );

      expect(mockPrismaService.investigationTemplate.update).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "investigation.template.updated",
        expect.any(Object),
      );
      expect(result.name).toBe("Updated Name");
    });

    it("should throw ForbiddenException when editing others PERSONAL template", async () => {
      const personalTemplate = {
        ...mockTemplate,
        tier: TemplateTier.PERSONAL,
        createdById: mockOtherUserId, // Different user
      };
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(
        personalTemplate,
      );

      await expect(
        service.update(mockOrganizationId, mockTemplateId, mockUserId, {
          name: "Updated",
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("publish", () => {
    it("should mark template as active", async () => {
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.investigationTemplate.update.mockResolvedValue({
        ...mockTemplate,
        isActive: true,
      });

      const result = await service.publish(
        mockOrganizationId,
        mockTemplateId,
        mockUserId,
      );

      expect(
        mockPrismaService.investigationTemplate.update,
      ).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
        data: { isActive: true },
      });
      expect(result.isActive).toBe(true);
    });
  });

  describe("archive", () => {
    it("should archive template", async () => {
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.investigationTemplate.update.mockResolvedValue({
        ...mockTemplate,
        isArchived: true,
        isActive: false,
      });

      const result = await service.archive(
        mockOrganizationId,
        mockTemplateId,
        mockUserId,
      );

      expect(
        mockPrismaService.investigationTemplate.update,
      ).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
        data: { isArchived: true, isActive: false },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "investigation.template.archived",
        expect.any(Object),
      );
      expect(result.isArchived).toBe(true);
    });
  });

  describe("unarchive", () => {
    it("should unarchive template", async () => {
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue({
        ...mockTemplate,
        isArchived: true,
      });
      mockPrismaService.investigationTemplate.update.mockResolvedValue({
        ...mockTemplate,
        isArchived: false,
      });

      const result = await service.unarchive(
        mockOrganizationId,
        mockTemplateId,
      );

      expect(
        mockPrismaService.investigationTemplate.update,
      ).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
        data: { isArchived: false },
      });
      expect(result.isArchived).toBe(false);
    });
  });

  describe("duplicate", () => {
    it("should create a copy of the template", async () => {
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.investigationTemplate.create.mockResolvedValue({
        ...mockTemplate,
        id: "tpl-002",
        name: "Investigation Checklist (Copy)",
        tier: TemplateTier.PERSONAL,
      });

      const result = await service.duplicate(
        mockOrganizationId,
        mockTemplateId,
        mockUserId,
      );

      expect(mockPrismaService.investigationTemplate.create).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "investigation.template.duplicated",
        expect.any(Object),
      );
      expect(result.tier).toBe(TemplateTier.PERSONAL);
    });

    it("should use custom name when provided", async () => {
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.investigationTemplate.create.mockResolvedValue({
        ...mockTemplate,
        id: "tpl-002",
        name: "My Custom Template",
      });

      await service.duplicate(
        mockOrganizationId,
        mockTemplateId,
        mockUserId,
        "My Custom Template",
      );

      expect(
        mockPrismaService.investigationTemplate.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "My Custom Template",
          }),
        }),
      );
    });
  });

  describe("exportTemplate", () => {
    it("should export template as JSON", async () => {
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );

      const result = await service.exportTemplate(
        mockOrganizationId,
        mockTemplateId,
      );

      const parsed = JSON.parse(result);
      expect(parsed.name).toBe(mockTemplate.name);
      expect(parsed.sections).toEqual(mockTemplate.sections);
      expect(parsed.exportedAt).toBeDefined();
    });
  });

  describe("importTemplate", () => {
    it("should import template from JSON", async () => {
      const templateJson = JSON.stringify({
        name: "Imported Template",
        sections: [
          {
            id: "sec-1",
            name: "Section 1",
            order: 1,
            items: [{ id: "item-1", text: "Item 1", order: 1 }],
          },
        ],
      });
      mockPrismaService.investigationTemplate.create.mockResolvedValue({
        ...mockTemplate,
        name: "Imported Template",
      });

      const result = await service.importTemplate(
        mockOrganizationId,
        mockUserId,
        templateJson,
      );

      expect(mockPrismaService.investigationTemplate.create).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "investigation.template.imported",
        expect.any(Object),
      );
      expect(result.name).toBe("Imported Template");
    });

    it("should throw BadRequestException for invalid JSON", async () => {
      await expect(
        service.importTemplate(mockOrganizationId, mockUserId, "invalid json"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for missing required fields", async () => {
      const invalidJson = JSON.stringify({ description: "No name" });

      await expect(
        service.importTemplate(mockOrganizationId, mockUserId, invalidJson),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("incrementUsageCount", () => {
    it("should increment usage count", async () => {
      mockPrismaService.investigationTemplate.update.mockResolvedValue({
        ...mockTemplate,
        usageCount: 1,
      });

      await service.incrementUsageCount(mockTemplateId);

      expect(
        mockPrismaService.investigationTemplate.update,
      ).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
        data: { usageCount: { increment: 1 } },
      });
    });
  });

  describe("getDefaultForCategory", () => {
    it("should return category-specific default template", async () => {
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );

      const result = await service.getDefaultForCategory(
        mockOrganizationId,
        "cat-001",
      );

      expect(
        mockPrismaService.investigationTemplate.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          categoryId: "cat-001",
          isDefault: true,
          isActive: true,
          isArchived: false,
        },
      });
      expect(result).toEqual(mockTemplate);
    });

    it("should fall back to org-wide default when no category default", async () => {
      mockPrismaService.investigationTemplate.findFirst
        .mockResolvedValueOnce(null) // No category-specific default
        .mockResolvedValueOnce(mockTemplate); // Org-wide default

      const result = await service.getDefaultForCategory(
        mockOrganizationId,
        "cat-001",
      );

      expect(
        mockPrismaService.investigationTemplate.findFirst,
      ).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockTemplate);
    });
  });
});
