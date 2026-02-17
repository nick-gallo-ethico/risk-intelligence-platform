/**
 * PROMPT SERVICE - UNIT TESTS
 *
 * Tests for the PromptService which manages versioned prompt templates using Handlebars.
 * Key test scenarios:
 * - Load prompt template by name
 * - Render template with Handlebars variables
 * - Handle missing template gracefully
 * - Support nested helpers in templates
 * - Escape HTML in variable values (Handlebars default)
 * - Cache compiled templates
 * - Version templates (getByVersion via history)
 * - Create new template
 * - List templates by category
 * - Throw on invalid template syntax
 */

import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PromptService, TemplateContext } from "./prompt.service";
import { PrismaService } from "../../prisma/prisma.service";
import * as fs from "fs";
import * as path from "path";

// Mock fs module
jest.mock("fs");
jest.mock("path");

// Helper to create mock Dirent - use any type due to Node.js fs type changes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockDirent = (name: string, isDir = false): any => ({
  name,
  isDirectory: () => isDir,
});

describe("PromptService", () => {
  let service: PromptService;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;

  // Define mock outside beforeEach for direct access
  const mockPrisma = {
    promptTemplate: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup path mock
    mockPath.join.mockImplementation((...args) => args.join("/"));

    // Setup fs mocks - simulate empty template directory
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readdirSync.mockReturnValue([]);
    mockFs.readFileSync.mockReturnValue("");

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PromptService>(PromptService);

    // Initialize the service (loads templates)
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("onModuleInit", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should load templates from filesystem on init", async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([createMockDirent("test.hbs")] as any);
      mockFs.readFileSync.mockReturnValue("Hello {{name}}");

      // Act
      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      // Assert
      expect(mockFs.existsSync).toHaveBeenCalled();
    });

    it("should handle missing template directory gracefully", async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      // Act
      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );

      // Should not throw
      await expect(testService.onModuleInit()).resolves.not.toThrow();
    });

    it("should register Handlebars helpers on init", async () => {
      // The service registers helpers in onModuleInit
      // We test this indirectly by using the helpers in render
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        createMockDirent("helpers-test.hbs"),
      ] as any);
      mockFs.readFileSync.mockReturnValue("{{#if (eq a b)}}equal{{/if}}");

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      // Helpers should be registered without error
      expect(testService).toBeDefined();
    });
  });

  describe("render", () => {
    it("should render template with Handlebars variables", async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        createMockDirent("greeting.hbs"),
      ] as any);
      mockFs.readFileSync.mockReturnValue(
        "Hello {{user.name}}, you are a {{user.role}}.",
      );

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      const context: TemplateContext = {
        user: { name: "John", role: "Compliance Officer" },
      };

      // Act
      const result = await testService.render("greeting", context);

      // Assert
      expect(result).toContain("Hello John");
      expect(result).toContain("Compliance Officer");
    });

    it("should add currentDateTime to context", async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        createMockDirent("timestamp.hbs"),
      ] as any);
      mockFs.readFileSync.mockReturnValue("Time: {{currentDateTime}}");

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      // Act
      const result = await testService.render("timestamp", {});

      // Assert - should contain ISO timestamp
      expect(result).toMatch(/Time: \d{4}-\d{2}-\d{2}T/);
    });

    it("should throw NotFoundException for missing template", async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      // Act & Assert
      await expect(testService.render("non-existent", {})).rejects.toThrow(
        NotFoundException,
      );
      await expect(testService.render("non-existent", {})).rejects.toThrow(
        "Prompt template not found: non-existent",
      );
    });

    it("should use database template override for organization", async () => {
      // Arrange
      const orgId = "org-123";
      const dbTemplate = {
        id: "template-1",
        organizationId: orgId,
        name: "greeting",
        version: 1,
        content: "Custom greeting for {{org.name}}",
        isActive: true,
        createdAt: new Date(),
      };

      mockPrisma.promptTemplate.findFirst.mockResolvedValue(dbTemplate);

      // Act
      const result = await service.render(
        "greeting",
        { org: { name: "Acme Corp" } },
        orgId,
      );

      // Assert
      expect(result).toBe("Custom greeting for Acme Corp");
      expect(mockPrisma.promptTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          name: "greeting",
          isActive: true,
        },
        orderBy: { version: "desc" },
      });
    });

    it("should escape HTML in variable values by default", async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        createMockDirent("escape.hbs"),
      ] as any);
      mockFs.readFileSync.mockReturnValue("Content: {{content}}");

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      // Act
      const result = await testService.render("escape", {
        content: "<script>alert('xss')</script>",
      });

      // Assert - HTML should be escaped
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;script&gt;");
    });

    it("should support nested helpers in templates", async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        createMockDirent("nested.hbs"),
      ] as any);
      mockFs.readFileSync.mockReturnValue(
        "{{#if (and isAdmin isVerified)}}Access granted{{else}}Access denied{{/if}}",
      );

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      // Act
      const result = await testService.render("nested", {
        isAdmin: true,
        isVerified: true,
      });

      // Assert
      expect(result).toBe("Access granted");
    });

    it("should support comparison helpers", async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        createMockDirent("compare.hbs"),
      ] as any);
      mockFs.readFileSync.mockReturnValue(
        "{{#if (gt count 5)}}High{{else}}Low{{/if}}",
      );

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      // Act
      const highResult = await testService.render("compare", { count: 10 });
      const lowResult = await testService.render("compare", { count: 3 });

      // Assert
      expect(highResult).toBe("High");
      expect(lowResult).toBe("Low");
    });
  });

  describe("getTemplate", () => {
    it("should return database template for organization", async () => {
      // Arrange
      const orgId = "org-123";
      const dbTemplate = {
        id: "template-1",
        organizationId: orgId,
        name: "custom",
        version: 2,
        content: "Custom template content",
        isActive: true,
        createdAt: new Date(),
      };

      mockPrisma.promptTemplate.findFirst.mockResolvedValue(dbTemplate);

      // Act
      const result = await service.getTemplate("custom", orgId);

      // Assert
      expect(result).toEqual({
        content: "Custom template content",
        source: "database",
        version: 2,
      });
    });

    it("should return file template when no database override", async () => {
      // Arrange
      mockPrisma.promptTemplate.findFirst.mockResolvedValue(null);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("File template content");

      // Act
      const result = await service.getTemplate("file-template");

      // Assert
      expect(result).toEqual({
        content: "File template content",
        source: "file",
      });
    });

    it("should throw NotFoundException when template not found anywhere", async () => {
      // Arrange
      mockPrisma.promptTemplate.findFirst.mockResolvedValue(null);
      mockFs.existsSync.mockReturnValue(false);

      // Act & Assert
      await expect(
        service.getTemplate("non-existent", "org-123"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("saveTemplate", () => {
    it("should create new template version", async () => {
      // Arrange
      mockPrisma.promptTemplate.findFirst.mockResolvedValue(null);
      mockPrisma.promptTemplate.create.mockResolvedValue({
        id: "new-template-id",
        organizationId: "org-123",
        name: "new-template",
        version: 1,
        content: "New content",
        description: "A new template",
        isActive: true,
        createdAt: new Date(),
      });

      // Act
      const result = await service.saveTemplate({
        organizationId: "org-123",
        name: "new-template",
        content: "New content",
        description: "A new template",
      });

      // Assert
      expect(result).toEqual({
        id: "new-template-id",
        version: 1,
      });
      expect(mockPrisma.promptTemplate.create).toHaveBeenCalledWith({
        data: {
          organizationId: "org-123",
          name: "new-template",
          version: 1,
          content: "New content",
          description: "A new template",
          isActive: true,
        },
      });
    });

    it("should increment version and deactivate previous versions", async () => {
      // Arrange
      const existingTemplate = {
        id: "existing-id",
        version: 2,
      };
      mockPrisma.promptTemplate.findFirst.mockResolvedValue(existingTemplate);
      mockPrisma.promptTemplate.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.promptTemplate.create.mockResolvedValue({
        id: "new-template-id",
        organizationId: "org-123",
        name: "existing",
        version: 3,
        content: "Updated content",
        isActive: true,
        createdAt: new Date(),
      });

      // Act
      const result = await service.saveTemplate({
        organizationId: "org-123",
        name: "existing",
        content: "Updated content",
      });

      // Assert
      expect(result.version).toBe(3);
      expect(mockPrisma.promptTemplate.updateMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-123",
          name: "existing",
        },
        data: { isActive: false },
      });
    });
  });

  describe("listTemplates", () => {
    it("should return array of loaded template names", async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        createMockDirent("template1.hbs"),
        createMockDirent("template2.hbs"),
      ] as any);
      mockFs.readFileSync.mockReturnValue("Content");

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      // Act
      const templates = testService.listTemplates();

      // Assert
      expect(templates).toContain("template1");
      expect(templates).toContain("template2");
    });

    it("should include templates from subdirectories", async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);

      // First call returns directory and file
      mockFs.readdirSync
        .mockReturnValueOnce([
          createMockDirent("skills", true),
          createMockDirent("base.hbs"),
        ] as any)
        .mockReturnValueOnce([createMockDirent("summarize.hbs")] as any);
      mockFs.readFileSync.mockReturnValue("Content");

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      // Act
      const templates = testService.listTemplates();

      // Assert
      expect(templates).toContain("base");
      expect(templates).toContain("skills/summarize");
    });
  });

  describe("getTemplateHistory", () => {
    it("should return version history for organization template", async () => {
      // Arrange
      const history = [
        { version: 3, createdAt: new Date("2024-03-15"), isActive: true },
        { version: 2, createdAt: new Date("2024-03-10"), isActive: false },
        { version: 1, createdAt: new Date("2024-03-01"), isActive: false },
      ];
      mockPrisma.promptTemplate.findMany.mockResolvedValue(history);

      // Act
      const result = await service.getTemplateHistory("custom", "org-123");

      // Assert
      expect(result).toEqual(history);
      expect(mockPrisma.promptTemplate.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-123",
          name: "custom",
        },
        orderBy: { version: "desc" },
        select: {
          version: true,
          createdAt: true,
          isActive: true,
        },
      });
    });

    it("should return empty array when no history exists", async () => {
      // Arrange
      mockPrisma.promptTemplate.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getTemplateHistory(
        "non-existent",
        "org-123",
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("revertToVersion", () => {
    it("should activate specified version and deactivate others", async () => {
      // Arrange
      const targetTemplate = {
        id: "template-v2",
        organizationId: "org-123",
        name: "custom",
        version: 2,
      };
      mockPrisma.promptTemplate.findFirst.mockResolvedValue(targetTemplate);
      mockPrisma.promptTemplate.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.promptTemplate.update.mockResolvedValue({
        ...targetTemplate,
        isActive: true,
      });

      // Act
      await service.revertToVersion("custom", "org-123", 2);

      // Assert
      expect(mockPrisma.promptTemplate.updateMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-123",
          name: "custom",
        },
        data: { isActive: false },
      });
      expect(mockPrisma.promptTemplate.update).toHaveBeenCalledWith({
        where: { id: "template-v2" },
        data: { isActive: true },
      });
    });

    it("should throw NotFoundException when version not found", async () => {
      // Arrange
      mockPrisma.promptTemplate.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.revertToVersion("custom", "org-123", 99),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.revertToVersion("custom", "org-123", 99),
      ).rejects.toThrow("Template version not found: custom v99");
    });
  });

  describe("deleteOrgTemplate", () => {
    it("should delete all versions of organization template", async () => {
      // Arrange
      mockPrisma.promptTemplate.deleteMany.mockResolvedValue({ count: 3 });

      // Act
      await service.deleteOrgTemplate("custom", "org-123");

      // Assert
      expect(mockPrisma.promptTemplate.deleteMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-123",
          name: "custom",
        },
      });
    });
  });

  describe("Handlebars helpers", () => {
    beforeEach(async () => {
      // Setup service with a template for testing helpers
      mockFs.existsSync.mockReturnValue(true);
    });

    it("should support eq helper for equality comparison", async () => {
      mockFs.readdirSync.mockReturnValue([createMockDirent("eq.hbs")] as any);
      mockFs.readFileSync.mockReturnValue(
        "{{#if (eq status 'OPEN')}}Open{{else}}Not Open{{/if}}",
      );

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      const openResult = await testService.render("eq", { status: "OPEN" });
      const closedResult = await testService.render("eq", { status: "CLOSED" });

      expect(openResult).toBe("Open");
      expect(closedResult).toBe("Not Open");
    });

    it("should support json helper for stringification", async () => {
      mockFs.readdirSync.mockReturnValue([createMockDirent("json.hbs")] as any);
      mockFs.readFileSync.mockReturnValue("Data: {{{json data}}}");

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      const result = await testService.render("json", {
        data: { key: "value" },
      });

      expect(result).toContain('"key": "value"');
    });

    it("should support truncate helper", async () => {
      mockFs.readdirSync.mockReturnValue([
        createMockDirent("truncate.hbs"),
      ] as any);
      mockFs.readFileSync.mockReturnValue("Text: {{truncate text 10}}");

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      const result = await testService.render("truncate", {
        text: "This is a long string that should be truncated",
      });

      expect(result).toBe("Text: This is a ...");
    });

    it("should support upper and lower helpers", async () => {
      mockFs.readdirSync.mockReturnValue([createMockDirent("case.hbs")] as any);
      mockFs.readFileSync.mockReturnValue(
        "Upper: {{upper text}}, Lower: {{lower text}}",
      );

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      const result = await testService.render("case", { text: "Hello" });

      expect(result).toBe("Upper: HELLO, Lower: hello");
    });

    it("should support default helper for fallback values", async () => {
      mockFs.readdirSync.mockReturnValue([
        createMockDirent("default.hbs"),
      ] as any);
      mockFs.readFileSync.mockReturnValue("Name: {{default name 'Unknown'}}");

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      const withName = await testService.render("default", { name: "John" });
      const withoutName = await testService.render("default", {});

      expect(withName).toBe("Name: John");
      expect(withoutName).toBe("Name: Unknown");
    });

    it("should support length helper for arrays", async () => {
      mockFs.readdirSync.mockReturnValue([
        createMockDirent("length.hbs"),
      ] as any);
      mockFs.readFileSync.mockReturnValue("Count: {{length items}}");

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      const result = await testService.render("length", {
        items: [1, 2, 3, 4, 5],
      });

      expect(result).toBe("Count: 5");
    });

    it("should support join helper for arrays", async () => {
      mockFs.readdirSync.mockReturnValue([createMockDirent("join.hbs")] as any);
      mockFs.readFileSync.mockReturnValue("Tags: {{join tags ', '}}");

      const testService = new PromptService(
        mockPrisma as unknown as PrismaService,
      );
      await testService.onModuleInit();

      const result = await testService.render("join", {
        tags: ["urgent", "review", "compliance"],
      });

      expect(result).toBe("Tags: urgent, review, compliance");
    });
  });
});
