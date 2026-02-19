import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { ReportTemplateService } from "./report-template.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReportDataSource } from "@prisma/client";

describe("ReportTemplateService", () => {
  let service: ReportTemplateService;

  const mockOrgId = "org-test-123";
  const mockOtherOrgId = "org-other-456";
  const mockTemplateId = "template-test-123";
  const mockUserId = "user-test-123";

  const mockColumns = [
    { field: "status", label: "Status", type: "string" as const },
  ];

  const mockTemplate = {
    id: mockTemplateId,
    organizationId: mockOrgId,
    name: "Case Report",
    description: "A report on cases",
    category: "cases",
    dataSource: ReportDataSource.CASES,
    columns: mockColumns,
    filters: null,
    aggregations: null,
    sortBy: "createdAt",
    sortOrder: "desc",
    chartType: null,
    chartConfig: null,
    allowedRoles: [],
    isPublic: false,
    isSystem: false,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSystemTemplate = {
    ...mockTemplate,
    id: "system-template-1",
    isSystem: true,
    organizationId: null,
  };

  const mockPrismaService = {
    reportTemplate: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportTemplateService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReportTemplateService>(ReportTemplateService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a report template", async () => {
      mockPrismaService.reportTemplate.create.mockResolvedValue(mockTemplate);

      const result = await service.create(
        mockOrgId,
        {
          name: "Case Report",
          dataSource: ReportDataSource.CASES,
          columns: mockColumns,
        },
        mockUserId,
      );

      expect(result).toEqual(mockTemplate);
      expect(mockPrismaService.reportTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId,
            name: "Case Report",
            dataSource: ReportDataSource.CASES,
          }),
        }),
      );
    });
  });

  describe("findById", () => {
    it("should return template for own organization", async () => {
      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );

      const result = await service.findById(mockOrgId, mockTemplateId);

      expect(result).toEqual(mockTemplate);
    });

    it("should return system template for any organization", async () => {
      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(
        mockSystemTemplate,
      );

      const result = await service.findById(mockOrgId, "system-template-1");

      expect(result.isSystem).toBe(true);
    });

    it("should throw NotFoundException when template not found", async () => {
      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockOrgId, "non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("should return org templates and system templates", async () => {
      mockPrismaService.reportTemplate.findMany.mockResolvedValue([
        mockTemplate,
        mockSystemTemplate,
      ]);

      const result = await service.findAll(mockOrgId);

      expect(result).toHaveLength(2);
    });

    it("should filter by category when provided", async () => {
      mockPrismaService.reportTemplate.findMany.mockResolvedValue([
        mockTemplate,
      ]);

      await service.findAll(mockOrgId, "cases");

      expect(mockPrismaService.reportTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "cases" }),
        }),
      );
    });
  });

  describe("update", () => {
    it("should update org template successfully", async () => {
      const updatedTemplate = { ...mockTemplate, name: "Updated Name" };
      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.reportTemplate.update.mockResolvedValue(
        updatedTemplate,
      );

      const result = await service.update(mockOrgId, mockTemplateId, {
        name: "Updated Name",
      });

      expect(result.name).toBe("Updated Name");
    });

    it("should throw ForbiddenException when updating system template", async () => {
      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(
        mockSystemTemplate,
      );

      await expect(
        service.update(mockOrgId, "system-template-1", { name: "Hacked" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException when updating another org template", async () => {
      const otherOrgTemplate = {
        ...mockTemplate,
        organizationId: mockOtherOrgId,
      };
      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(
        otherOrgTemplate,
      );

      await expect(
        service.update(mockOrgId, mockTemplateId, { name: "Hacked" }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("delete", () => {
    it("should delete org template successfully", async () => {
      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.reportTemplate.delete.mockResolvedValue(mockTemplate);

      await expect(
        service.delete(mockOrgId, mockTemplateId),
      ).resolves.not.toThrow();
    });

    it("should throw ForbiddenException when deleting system template", async () => {
      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(
        mockSystemTemplate,
      );

      await expect(
        service.delete(mockOrgId, "system-template-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("duplicate", () => {
    it("should create a new template based on existing one", async () => {
      const duplicatedTemplate = {
        ...mockTemplate,
        id: "duplicate-id",
        name: "Case Report (Copy)",
        isSystem: false,
      };

      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.reportTemplate.create.mockResolvedValue(
        duplicatedTemplate,
      );

      const result = await service.duplicate(
        mockOrgId,
        mockTemplateId,
        "Case Report (Copy)",
      );

      expect(result.name).toBe("Case Report (Copy)");
      expect(result.isSystem).toBe(false);
    });

    it("should allow duplicating system templates", async () => {
      const duplicatedTemplate = {
        ...mockTemplate,
        id: "duplicate-id",
        name: "My Custom Report",
        isSystem: false,
        organizationId: mockOrgId,
      };

      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(
        mockSystemTemplate,
      );
      mockPrismaService.reportTemplate.create.mockResolvedValue(
        duplicatedTemplate,
      );

      const result = await service.duplicate(
        mockOrgId,
        "system-template-1",
        "My Custom Report",
      );

      expect(result.organizationId).toBe(mockOrgId);
      expect(result.isSystem).toBe(false);
    });
  });
});
