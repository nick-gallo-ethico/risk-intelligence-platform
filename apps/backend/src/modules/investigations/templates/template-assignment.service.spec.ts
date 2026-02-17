import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { TemplateAssignmentService } from "./template-assignment.service";
import { InvestigationTemplateService } from "./template.service";
import { PrismaService } from "../../prisma/prisma.service";
import { TemplateTier, TemplateRequirement } from "@prisma/client";

describe("TemplateAssignmentService", () => {
  let service: TemplateAssignmentService;
  let templateService: jest.Mocked<InvestigationTemplateService>;

  const mockOrganizationId = "org-123";
  const mockUserId = "user-456";
  const mockCategoryId = "cat-001";
  const mockParentCategoryId = "cat-parent";
  const mockTemplateId = "tpl-001";
  const mockMappingId = "map-001";

  const mockTemplate = {
    id: mockTemplateId,
    organizationId: mockOrganizationId,
    name: "Investigation Template",
    tier: TemplateTier.OFFICIAL,
    isActive: true,
    isArchived: false,
    isDefault: false,
    version: 1,
  };

  const mockCategory = {
    id: mockCategoryId,
    organizationId: mockOrganizationId,
    name: "Category 1",
    path: "Category 1",
    parentCategoryId: mockParentCategoryId,
  };

  const mockMapping = {
    id: mockMappingId,
    organizationId: mockOrganizationId,
    categoryId: mockCategoryId,
    templateId: mockTemplateId,
    requirement: TemplateRequirement.RECOMMENDED,
    priority: 0,
    isActive: true,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    template: mockTemplate,
    category: { id: mockCategoryId, name: "Category 1", path: "Category 1" },
  };

  // Mock Setup - define outside beforeEach
  const mockPrismaService = {
    category: {
      findFirst: jest.fn(),
    },
    categoryTemplateMapping: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    investigationTemplate: {
      findFirst: jest.fn(),
    },
  };

  const mockTemplateService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateAssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: InvestigationTemplateService,
          useValue: mockTemplateService,
        },
      ],
    }).compile();

    service = module.get<TemplateAssignmentService>(TemplateAssignmentService);
    templateService = module.get(InvestigationTemplateService);

    jest.clearAllMocks();
  });

  describe("createMapping", () => {
    const createDto = {
      categoryId: mockCategoryId,
      templateId: mockTemplateId,
      requirement: TemplateRequirement.RECOMMENDED,
      priority: 0,
    };

    it("should create a category-template mapping", async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(mockCategory);
      mockTemplateService.findById.mockResolvedValue(mockTemplate);
      mockPrismaService.categoryTemplateMapping.create.mockResolvedValue(
        mockMapping,
      );

      const result = await service.createMapping(
        mockOrganizationId,
        mockUserId,
        createDto,
      );

      expect(mockPrismaService.category.findFirst).toHaveBeenCalledWith({
        where: { id: mockCategoryId, organizationId: mockOrganizationId },
      });
      expect(templateService.findById).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
      );
      expect(
        mockPrismaService.categoryTemplateMapping.create,
      ).toHaveBeenCalled();
      expect(result).toEqual(mockMapping);
    });

    it("should throw NotFoundException when category not found", async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(
        service.createMapping(mockOrganizationId, mockUserId, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when template not found", async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(mockCategory);
      mockTemplateService.findById.mockRejectedValue(
        new NotFoundException("Template not found"),
      );

      await expect(
        service.createMapping(mockOrganizationId, mockUserId, createDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findMappingsByCategory", () => {
    it("should return mappings for a category", async () => {
      mockPrismaService.categoryTemplateMapping.findMany.mockResolvedValue([
        mockMapping,
      ]);

      const result = await service.findMappingsByCategory(
        mockOrganizationId,
        mockCategoryId,
      );

      expect(
        mockPrismaService.categoryTemplateMapping.findMany,
      ).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          categoryId: mockCategoryId,
          isActive: true,
        },
        include: { template: true },
        orderBy: { priority: "asc" },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("findMappingsByTemplate", () => {
    it("should return mappings for a template", async () => {
      mockPrismaService.categoryTemplateMapping.findMany.mockResolvedValue([
        mockMapping,
      ]);

      const result = await service.findMappingsByTemplate(
        mockOrganizationId,
        mockTemplateId,
      );

      expect(
        mockPrismaService.categoryTemplateMapping.findMany,
      ).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          templateId: mockTemplateId,
          isActive: true,
        },
        include: {
          category: { select: { id: true, name: true, path: true } },
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("findAllMappings", () => {
    it("should return all mappings", async () => {
      mockPrismaService.categoryTemplateMapping.findMany.mockResolvedValue([
        mockMapping,
      ]);

      const result = await service.findAllMappings(mockOrganizationId);

      expect(
        mockPrismaService.categoryTemplateMapping.findMany,
      ).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId, isActive: true },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("updateMapping", () => {
    it("should update a mapping", async () => {
      const updateDto = { requirement: TemplateRequirement.REQUIRED };
      mockPrismaService.categoryTemplateMapping.findFirst.mockResolvedValue(
        mockMapping,
      );
      mockPrismaService.categoryTemplateMapping.update.mockResolvedValue({
        ...mockMapping,
        requirement: TemplateRequirement.REQUIRED,
      });

      const result = await service.updateMapping(
        mockOrganizationId,
        mockMappingId,
        updateDto,
      );

      expect(
        mockPrismaService.categoryTemplateMapping.update,
      ).toHaveBeenCalledWith({
        where: { id: mockMappingId },
        data: { requirement: TemplateRequirement.REQUIRED },
        include: expect.any(Object),
      });
      expect(result.requirement).toBe(TemplateRequirement.REQUIRED);
    });

    it("should throw NotFoundException when mapping not found", async () => {
      mockPrismaService.categoryTemplateMapping.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.updateMapping(mockOrganizationId, mockMappingId, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteMapping", () => {
    it("should delete a mapping", async () => {
      mockPrismaService.categoryTemplateMapping.findFirst.mockResolvedValue(
        mockMapping,
      );
      mockPrismaService.categoryTemplateMapping.delete.mockResolvedValue(
        mockMapping,
      );

      await service.deleteMapping(mockOrganizationId, mockMappingId);

      expect(
        mockPrismaService.categoryTemplateMapping.delete,
      ).toHaveBeenCalledWith({
        where: { id: mockMappingId },
      });
    });

    it("should throw NotFoundException when mapping not found", async () => {
      mockPrismaService.categoryTemplateMapping.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.deleteMapping(mockOrganizationId, mockMappingId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getTemplateForCase", () => {
    it("should return templates mapped to category", async () => {
      mockPrismaService.categoryTemplateMapping.findMany.mockResolvedValue([
        mockMapping,
      ]);

      const result = await service.getTemplateForCase(
        mockOrganizationId,
        mockCategoryId,
      );

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].reason).toBe("Mapped to category");
    });

    it("should check parent category when no direct mapping", async () => {
      mockPrismaService.categoryTemplateMapping.findMany
        .mockResolvedValueOnce([]) // No direct mapping
        .mockResolvedValueOnce([mockMapping]); // Parent mapping
      mockPrismaService.category.findFirst.mockResolvedValue({
        parentCategoryId: mockParentCategoryId,
      });

      const result = await service.getTemplateForCase(
        mockOrganizationId,
        mockCategoryId,
      );

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].reason).toBe("Inherited from parent category");
    });

    it("should return org default when no mappings found", async () => {
      mockPrismaService.categoryTemplateMapping.findMany.mockResolvedValue([]);
      mockPrismaService.category.findFirst.mockResolvedValue({
        parentCategoryId: null,
      });
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue({
        ...mockTemplate,
        isDefault: true,
      });

      const result = await service.getTemplateForCase(
        mockOrganizationId,
        mockCategoryId,
      );

      expect(result.templates).toHaveLength(0);
      expect(result.defaultTemplate).not.toBeNull();
      expect(result.defaultTemplate?.reason).toBe(
        "Organization default template",
      );
    });

    it("should return null when no mappings or default", async () => {
      mockPrismaService.categoryTemplateMapping.findMany.mockResolvedValue([]);
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue(null);

      const result = await service.getTemplateForCase(mockOrganizationId, null);

      expect(result.templates).toHaveLength(0);
      expect(result.defaultTemplate).toBeNull();
    });
  });

  describe("getRecommendedTemplate", () => {
    it("should return highest priority template", async () => {
      const mapping2 = {
        ...mockMapping,
        priority: 1,
        template: { ...mockTemplate, id: "tpl-002" },
      };
      mockPrismaService.categoryTemplateMapping.findMany.mockResolvedValue([
        mockMapping,
        mapping2,
      ]);

      const result = await service.getRecommendedTemplate(
        mockOrganizationId,
        mockCategoryId,
      );

      expect(result?.template.id).toBe(mockTemplateId); // First by priority
    });

    it("should fall back to default when no mappings", async () => {
      mockPrismaService.categoryTemplateMapping.findMany.mockResolvedValue([]);
      mockPrismaService.category.findFirst.mockResolvedValue(null);
      mockPrismaService.investigationTemplate.findFirst.mockResolvedValue({
        ...mockTemplate,
        isDefault: true,
      });

      const result = await service.getRecommendedTemplate(
        mockOrganizationId,
        mockCategoryId,
      );

      expect(result?.reason).toBe("Organization default template");
    });
  });

  describe("isTemplateRequired", () => {
    it("should return true when required mapping exists", async () => {
      mockPrismaService.categoryTemplateMapping.findFirst.mockResolvedValue({
        ...mockMapping,
        requirement: TemplateRequirement.REQUIRED,
      });

      const result = await service.isTemplateRequired(
        mockOrganizationId,
        mockCategoryId,
      );

      expect(result).toBe(true);
      expect(
        mockPrismaService.categoryTemplateMapping.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          categoryId: mockCategoryId,
          isActive: true,
          requirement: TemplateRequirement.REQUIRED,
        },
      });
    });

    it("should return false when no required mapping", async () => {
      mockPrismaService.categoryTemplateMapping.findFirst.mockResolvedValue(
        null,
      );

      const result = await service.isTemplateRequired(
        mockOrganizationId,
        mockCategoryId,
      );

      expect(result).toBe(false);
    });

    it("should return false when no categoryId provided", async () => {
      const result = await service.isTemplateRequired(mockOrganizationId, null);

      expect(result).toBe(false);
      expect(
        mockPrismaService.categoryTemplateMapping.findFirst,
      ).not.toHaveBeenCalled();
    });
  });
});
