import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { FormSchemaService } from "./form-schema.service";
import { PrismaService } from "../prisma/prisma.service";
import { FormValidationService } from "./form-validation.service";
import { FormType } from "@prisma/client";

describe("FormSchemaService", () => {
  let service: FormSchemaService;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockFormId = "form-test-123";

  const mockSchema = {
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
  };

  const mockForm = {
    id: mockFormId,
    organizationId: mockOrgId,
    name: "Test Form",
    description: "A test form",
    formType: FormType.INTAKE,
    schema: mockSchema,
    uiSchema: null,
    defaultValues: null,
    allowAnonymous: false,
    requiresApproval: false,
    notifyOnSubmit: false,
    isPublished: false,
    isActive: true,
    version: 1,
    publishedAt: null,
    categoryId: null,
    tags: [],
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    formDefinition: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    formSubmission: {
      count: jest.fn(),
    },
  };

  const mockValidationService = {
    validateSchema: jest.fn(),
    validate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormSchemaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FormValidationService, useValue: mockValidationService },
      ],
    }).compile();

    service = module.get<FormSchemaService>(FormSchemaService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a form definition with valid schema", async () => {
      mockValidationService.validateSchema.mockReturnValue({
        valid: true,
        errors: [],
      });
      mockPrismaService.formDefinition.findFirst.mockResolvedValue(null);
      mockPrismaService.formDefinition.create.mockResolvedValue(mockForm);

      const result = await service.create(
        mockOrgId,
        {
          name: "Test Form",
          formType: FormType.INTAKE,
          schema: mockSchema as any,
        },
        mockUserId,
      );

      expect(result).toEqual(mockForm);
      expect(mockPrismaService.formDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId,
            name: "Test Form",
            formType: FormType.INTAKE,
          }),
        }),
      );
    });

    it("should throw BadRequestException for invalid schema", async () => {
      mockValidationService.validateSchema.mockReturnValue({
        valid: false,
        errors: [
          { field: "schema", message: "Invalid schema", keyword: "schema" },
        ],
      });

      await expect(
        service.create(mockOrgId, {
          name: "Test Form",
          formType: FormType.INTAKE,
          schema: mockSchema as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if form name already exists", async () => {
      mockValidationService.validateSchema.mockReturnValue({
        valid: true,
        errors: [],
      });
      mockPrismaService.formDefinition.findFirst.mockResolvedValue(mockForm);

      await expect(
        service.create(mockOrgId, {
          name: "Test Form",
          formType: FormType.INTAKE,
          schema: mockSchema as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findById", () => {
    it("should return form when found", async () => {
      mockPrismaService.formDefinition.findFirst.mockResolvedValue(mockForm);

      const result = await service.findById(mockOrgId, mockFormId);

      expect(result).toEqual(mockForm);
      expect(mockPrismaService.formDefinition.findFirst).toHaveBeenCalledWith({
        where: { id: mockFormId, organizationId: mockOrgId },
      });
    });

    it("should throw NotFoundException when form not found", async () => {
      mockPrismaService.formDefinition.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockOrgId, "non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("should return all active forms for organization", async () => {
      mockPrismaService.formDefinition.findMany.mockResolvedValue([mockForm]);

      const result = await service.findAll(mockOrgId);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.formDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
            isActive: true,
          }),
        }),
      );
    });

    it("should filter by formType when provided", async () => {
      mockPrismaService.formDefinition.findMany.mockResolvedValue([mockForm]);

      await service.findAll(mockOrgId, { formType: FormType.INTAKE });

      expect(mockPrismaService.formDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ formType: FormType.INTAKE }),
        }),
      );
    });
  });

  describe("publish", () => {
    it("should publish an unpublished form", async () => {
      const unpublishedForm = { ...mockForm, isPublished: false };
      const publishedForm = { ...mockForm, isPublished: true };

      mockPrismaService.formDefinition.findFirst.mockResolvedValue(
        unpublishedForm,
      );
      mockPrismaService.formDefinition.update.mockResolvedValue(publishedForm);

      const result = await service.publish(mockOrgId, mockFormId);

      expect(result.id).toBe(mockFormId);
      expect(mockPrismaService.formDefinition.update).toHaveBeenCalledWith({
        where: { id: mockFormId },
        data: expect.objectContaining({ isPublished: true }),
      });
    });

    it("should create new version when published form has submissions", async () => {
      const publishedForm = { ...mockForm, isPublished: true, version: 1 };
      const newVersionForm = {
        ...mockForm,
        id: "new-form-id",
        version: 2,
        isPublished: true,
      };

      mockPrismaService.formDefinition.findFirst.mockResolvedValue(
        publishedForm,
      );
      mockPrismaService.formSubmission.count.mockResolvedValue(5);
      mockPrismaService.formDefinition.create.mockResolvedValue(newVersionForm);
      mockPrismaService.formDefinition.update.mockResolvedValue({
        ...publishedForm,
        isActive: false,
      });

      const result = await service.publish(mockOrgId, mockFormId);

      expect(result.version).toBe(2);
      expect(mockPrismaService.formDefinition.create).toHaveBeenCalled();
    });
  });

  describe("deactivate", () => {
    it("should set isActive to false", async () => {
      mockPrismaService.formDefinition.findFirst.mockResolvedValue(mockForm);
      mockPrismaService.formDefinition.update.mockResolvedValue({
        ...mockForm,
        isActive: false,
      });

      await service.deactivate(mockOrgId, mockFormId);

      expect(mockPrismaService.formDefinition.update).toHaveBeenCalledWith({
        where: { id: mockFormId },
        data: { isActive: false },
      });
    });
  });

  describe("clone", () => {
    it("should clone form with new name", async () => {
      const clonedForm = {
        ...mockForm,
        id: "cloned-form-id",
        name: "Cloned Form",
      };

      mockPrismaService.formDefinition.findFirst.mockResolvedValue(mockForm);
      mockPrismaService.formDefinition.create.mockResolvedValue(clonedForm);

      const result = await service.clone(
        mockOrgId,
        mockFormId,
        "Cloned Form",
        mockUserId,
      );

      expect(result.name).toBe("Cloned Form");
      expect(mockPrismaService.formDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId,
            name: "Cloned Form",
            version: 1,
            isPublished: false,
          }),
        }),
      );
    });
  });
});
