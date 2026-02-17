import { Test, TestingModule } from "@nestjs/testing";
import { InvestigationTemplateController } from "./template.controller";
import { InvestigationTemplateService } from "./template.service";
import { TemplateAssignmentService } from "./template-assignment.service";
import { TemplateTier, TemplateRequirement } from "@prisma/client";

describe("InvestigationTemplateController", () => {
  let controller: InvestigationTemplateController;
  let templateService: jest.Mocked<InvestigationTemplateService>;
  let assignmentService: jest.Mocked<TemplateAssignmentService>;

  const mockOrganizationId = "org-123";
  const mockUserId = "user-456";
  const mockTemplateId = "tpl-001";
  const mockCategoryId = "cat-001";
  const mockMappingId = "map-001";

  const mockUser = {
    id: mockUserId,
    email: "test@example.com",
    organizationId: mockOrganizationId,
    role: "COMPLIANCE_OFFICER",
  };

  const mockTemplate = {
    id: mockTemplateId,
    organizationId: mockOrganizationId,
    name: "Investigation Template",
    tier: TemplateTier.OFFICIAL,
    isActive: true,
    isArchived: false,
    version: 1,
  };

  const mockMapping = {
    id: mockMappingId,
    organizationId: mockOrganizationId,
    categoryId: mockCategoryId,
    templateId: mockTemplateId,
    requirement: TemplateRequirement.RECOMMENDED,
    priority: 0,
    isActive: true,
    category: { id: mockCategoryId, name: "Category 1", path: "Category 1" },
    template: {
      id: mockTemplateId,
      name: "Template 1",
      tier: TemplateTier.OFFICIAL,
    },
  };

  const mockTemplateService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    publish: jest.fn(),
    archive: jest.fn(),
    unarchive: jest.fn(),
    duplicate: jest.fn(),
    exportTemplate: jest.fn(),
    importTemplate: jest.fn(),
  };

  const mockAssignmentService = {
    createMapping: jest.fn(),
    findAllMappings: jest.fn(),
    findMappingsByCategory: jest.fn(),
    findMappingsByTemplate: jest.fn(),
    updateMapping: jest.fn(),
    deleteMapping: jest.fn(),
    getTemplateForCase: jest.fn(),
    isTemplateRequired: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestigationTemplateController],
      providers: [
        {
          provide: InvestigationTemplateService,
          useValue: mockTemplateService,
        },
        { provide: TemplateAssignmentService, useValue: mockAssignmentService },
      ],
    }).compile();

    controller = module.get<InvestigationTemplateController>(
      InvestigationTemplateController,
    );
    templateService = module.get(InvestigationTemplateService);
    assignmentService = module.get(TemplateAssignmentService);

    jest.clearAllMocks();
  });

  // Template CRUD

  describe("create", () => {
    it("should create a template", async () => {
      const dto = { name: "New Template", sections: [] };
      mockTemplateService.create.mockResolvedValue(mockTemplate);

      const result = await controller.create(mockUser as never, dto as never);

      expect(templateService.create).toHaveBeenCalledWith(
        mockOrganizationId,
        mockUserId,
        dto,
      );
      expect(result).toEqual(mockTemplate);
    });
  });

  describe("findAll", () => {
    it("should return paginated templates", async () => {
      const mockResult = {
        data: [mockTemplate],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockTemplateService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser as never, {} as never);

      expect(templateService.findAll).toHaveBeenCalledWith(
        mockOrganizationId,
        mockUserId,
        {},
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("findOne", () => {
    it("should return a template by id", async () => {
      mockTemplateService.findById.mockResolvedValue(mockTemplate);

      const result = await controller.findOne(
        mockUser as never,
        mockTemplateId,
      );

      expect(templateService.findById).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
      );
      expect(result).toEqual(mockTemplate);
    });
  });

  describe("update", () => {
    it("should update a template", async () => {
      const dto = { name: "Updated Template" };
      const updatedTemplate = { ...mockTemplate, name: "Updated Template" };
      mockTemplateService.update.mockResolvedValue(updatedTemplate);

      const result = await controller.update(
        mockUser as never,
        mockTemplateId,
        dto as never,
      );

      expect(templateService.update).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
        mockUserId,
        dto,
      );
      expect(result.name).toBe("Updated Template");
    });
  });

  describe("publish", () => {
    it("should publish a template", async () => {
      const publishedTemplate = { ...mockTemplate, isActive: true };
      mockTemplateService.publish.mockResolvedValue(publishedTemplate);

      const result = await controller.publish(
        mockUser as never,
        mockTemplateId,
      );

      expect(templateService.publish).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
        mockUserId,
        false,
      );
      expect(result.isActive).toBe(true);
    });

    it("should create new version when requested", async () => {
      mockTemplateService.publish.mockResolvedValue(mockTemplate);

      await controller.publish(mockUser as never, mockTemplateId, "true");

      expect(templateService.publish).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
        mockUserId,
        true,
      );
    });
  });

  describe("archive", () => {
    it("should archive a template", async () => {
      const archivedTemplate = { ...mockTemplate, isArchived: true };
      mockTemplateService.archive.mockResolvedValue(archivedTemplate);

      const result = await controller.archive(
        mockUser as never,
        mockTemplateId,
      );

      expect(templateService.archive).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
        mockUserId,
      );
      expect(result.isArchived).toBe(true);
    });
  });

  describe("unarchive", () => {
    it("should unarchive a template", async () => {
      const unarchivedTemplate = { ...mockTemplate, isArchived: false };
      mockTemplateService.unarchive.mockResolvedValue(unarchivedTemplate);

      const result = await controller.unarchive(
        mockUser as never,
        mockTemplateId,
      );

      expect(templateService.unarchive).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
      );
      expect(result.isArchived).toBe(false);
    });
  });

  describe("duplicate", () => {
    it("should duplicate a template", async () => {
      const dto = { name: "Duplicated Template" };
      const duplicatedTemplate = {
        ...mockTemplate,
        id: "tpl-002",
        name: "Duplicated Template",
      };
      mockTemplateService.duplicate.mockResolvedValue(duplicatedTemplate);

      const result = await controller.duplicate(
        mockUser as never,
        mockTemplateId,
        dto as never,
      );

      expect(templateService.duplicate).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
        mockUserId,
        "Duplicated Template",
      );
      expect(result.name).toBe("Duplicated Template");
    });
  });

  describe("exportTemplate", () => {
    it("should export template as JSON", async () => {
      const templateJson = JSON.stringify({ name: "Template" });
      mockTemplateService.exportTemplate.mockResolvedValue(templateJson);

      const result = await controller.exportTemplate(
        mockUser as never,
        mockTemplateId,
      );

      expect(templateService.exportTemplate).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
      );
      expect(result.template).toBe(templateJson);
    });
  });

  describe("importTemplate", () => {
    it("should import template from JSON", async () => {
      const dto = {
        templateJson: JSON.stringify({ name: "Imported", sections: [] }),
        importAsOfficial: false,
      };
      mockTemplateService.importTemplate.mockResolvedValue(mockTemplate);

      const result = await controller.importTemplate(
        mockUser as never,
        dto as never,
      );

      expect(templateService.importTemplate).toHaveBeenCalledWith(
        mockOrganizationId,
        mockUserId,
        dto.templateJson,
        dto.importAsOfficial,
      );
      expect(result).toEqual(mockTemplate);
    });
  });

  // Category Mappings

  describe("createMapping", () => {
    it("should create a category mapping", async () => {
      const dto = {
        categoryId: mockCategoryId,
        templateId: mockTemplateId,
        requirement: TemplateRequirement.RECOMMENDED,
      };
      mockAssignmentService.createMapping.mockResolvedValue(mockMapping);

      const result = await controller.createMapping(
        mockUser as never,
        dto as never,
      );

      expect(assignmentService.createMapping).toHaveBeenCalledWith(
        mockOrganizationId,
        mockUserId,
        dto,
      );
      expect(result).toEqual(mockMapping);
    });
  });

  describe("findAllMappings", () => {
    it("should return all mappings", async () => {
      mockAssignmentService.findAllMappings.mockResolvedValue([mockMapping]);

      const result = await controller.findAllMappings(mockUser as never);

      expect(assignmentService.findAllMappings).toHaveBeenCalledWith(
        mockOrganizationId,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("findMappingsByCategory", () => {
    it("should return mappings for a category", async () => {
      mockAssignmentService.findMappingsByCategory.mockResolvedValue([
        mockMapping,
      ]);

      const result = await controller.findMappingsByCategory(
        mockUser as never,
        mockCategoryId,
      );

      expect(assignmentService.findMappingsByCategory).toHaveBeenCalledWith(
        mockOrganizationId,
        mockCategoryId,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("findMappingsByTemplate", () => {
    it("should return mappings for a template", async () => {
      mockAssignmentService.findMappingsByTemplate.mockResolvedValue([
        mockMapping,
      ]);

      const result = await controller.findMappingsByTemplate(
        mockUser as never,
        mockTemplateId,
      );

      expect(assignmentService.findMappingsByTemplate).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("updateMapping", () => {
    it("should update a mapping", async () => {
      const dto = { requirement: TemplateRequirement.REQUIRED };
      const updatedMapping = {
        ...mockMapping,
        requirement: TemplateRequirement.REQUIRED,
      };
      mockAssignmentService.updateMapping.mockResolvedValue(updatedMapping);

      const result = await controller.updateMapping(
        mockUser as never,
        mockMappingId,
        dto as never,
      );

      expect(assignmentService.updateMapping).toHaveBeenCalledWith(
        mockOrganizationId,
        mockMappingId,
        dto,
      );
      expect(result.requirement).toBe(TemplateRequirement.REQUIRED);
    });
  });

  describe("deleteMapping", () => {
    it("should delete a mapping", async () => {
      mockAssignmentService.deleteMapping.mockResolvedValue(undefined);

      await controller.deleteMapping(mockUser as never, mockMappingId);

      expect(assignmentService.deleteMapping).toHaveBeenCalledWith(
        mockOrganizationId,
        mockMappingId,
      );
    });
  });

  // Template Recommendations

  describe("getRecommendation", () => {
    it("should return template recommendations", async () => {
      const mockResult = {
        templates: [
          {
            template: mockTemplate,
            requirement: TemplateRequirement.RECOMMENDED,
            reason: "Mapped to category",
          },
        ],
        defaultTemplate: null,
      };
      mockAssignmentService.getTemplateForCase.mockResolvedValue(mockResult);

      const result = await controller.getRecommendation(
        mockUser as never,
        mockCategoryId,
      );

      expect(assignmentService.getTemplateForCase).toHaveBeenCalledWith(
        mockOrganizationId,
        mockCategoryId,
      );
      expect(result.templates).toHaveLength(1);
    });
  });

  describe("isRequired", () => {
    it("should check if template is required", async () => {
      mockAssignmentService.isTemplateRequired.mockResolvedValue(true);

      const result = await controller.isRequired(
        mockUser as never,
        mockCategoryId,
      );

      expect(assignmentService.isTemplateRequired).toHaveBeenCalledWith(
        mockOrganizationId,
        mockCategoryId,
      );
      expect(result.required).toBe(true);
    });
  });
});
