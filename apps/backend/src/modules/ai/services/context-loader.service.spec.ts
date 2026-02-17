import { Test, TestingModule } from "@nestjs/testing";
import { ContextLoaderService } from "./context-loader.service";
import { ContextCacheService } from "./context-cache.service";
import { HierarchyLoaderService } from "./hierarchy-loader.service";
import { PromptBuilderService } from "./prompt-builder.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  LoadContextDto,
  AIContext,
  OrganizationContext,
  UserContext,
  TeamContext,
  EntityContext,
  PlatformContext,
} from "../dto/context.dto";

describe("ContextLoaderService", () => {
  let service: ContextLoaderService;
  let prismaService: jest.Mocked<PrismaService>;
  let contextCacheService: jest.Mocked<ContextCacheService>;
  let hierarchyLoaderService: jest.Mocked<HierarchyLoaderService>;
  let promptBuilderService: jest.Mocked<PromptBuilderService>;

  const mockPlatformContext: PlatformContext = {
    name: "Ethico Risk Intelligence Platform",
    version: "1.0.0",
    capabilities: ["Case Management", "Investigation"],
    guidelines: "Professional compliance assistance",
  };

  const mockOrgContext: OrganizationContext = {
    id: "org-123",
    name: "Acme Corp",
    categories: [{ id: "cat-1", name: "Ethics" }],
    settings: {
      aiEnabled: true,
      formalityLevel: "professional",
      noteCleanupStyle: "light",
      summaryDefaultLength: "standard",
    },
    contextFile: "This is the organization context file.",
    terminology: { Whistleblower: "Person who reports wrongdoing" },
  };

  const mockUserContext: UserContext = {
    id: "user-123",
    name: "John Doe",
    role: "INVESTIGATOR",
    preferences: {
      formalityLevel: "professional",
      responseLength: "standard",
    },
  };

  const mockTeamContext: TeamContext = {
    id: "team-123",
    name: "Ethics Team",
    focusArea: "Ethics investigations",
  };

  const mockEntityContext: EntityContext = {
    type: "case",
    id: "case-123",
    referenceNumber: "CASE-001",
    status: "OPEN",
    category: "Harassment",
  };

  const mockAiContextFile = {
    id: "context-file-1",
    organizationId: "org-123",
    userId: null,
    teamId: null,
    name: "CONTEXT.md",
    content: "Organization context content",
    description: "Org-level context",
    scope: "org",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrisma = {
      aiContextFile: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const mockContextCache = {
      invalidate: jest.fn().mockResolvedValue(undefined),
      getOrgContext: jest.fn(),
      setOrgContext: jest.fn(),
      getUserContext: jest.fn(),
      setUserContext: jest.fn(),
      getTeamContext: jest.fn(),
      setTeamContext: jest.fn(),
      getEntityContext: jest.fn(),
      setEntityContext: jest.fn(),
    };

    const mockHierarchyLoader = {
      loadOrganizationContext: jest.fn().mockResolvedValue(mockOrgContext),
      loadUserContext: jest.fn().mockResolvedValue(mockUserContext),
      loadTeamContext: jest.fn().mockResolvedValue(mockTeamContext),
      loadEntityContext: jest.fn().mockResolvedValue(mockEntityContext),
      getFallbackOrgContext: jest.fn().mockReturnValue({
        id: "org-123",
        name: "Unknown Organization",
        categories: [],
        settings: {
          aiEnabled: true,
          formalityLevel: "professional",
          noteCleanupStyle: "light",
          summaryDefaultLength: "standard",
        },
      }),
      getFallbackUserContext: jest.fn().mockReturnValue({
        id: "user-123",
        name: "Unknown User",
        role: "EMPLOYEE",
      }),
    };

    const mockPromptBuilder = {
      getPlatformContext: jest.fn().mockReturnValue(mockPlatformContext),
      buildSystemPrompt: jest.fn().mockResolvedValue("System prompt content"),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextLoaderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ContextCacheService, useValue: mockContextCache },
        { provide: HierarchyLoaderService, useValue: mockHierarchyLoader },
        { provide: PromptBuilderService, useValue: mockPromptBuilder },
      ],
    }).compile();

    service = module.get<ContextLoaderService>(ContextLoaderService);
    prismaService = module.get(PrismaService);
    contextCacheService = module.get(ContextCacheService);
    hierarchyLoaderService = module.get(HierarchyLoaderService);
    promptBuilderService = module.get(PromptBuilderService);
  });

  describe("loadContext", () => {
    it("should load platform-level context", async () => {
      const params: LoadContextDto = {
        organizationId: "org-123",
        userId: "user-123",
      };

      const result = await service.loadContext(params);

      expect(result.platform).toBeDefined();
      expect(result.platform.name).toBe("Ethico Risk Intelligence Platform");
      expect(promptBuilderService.getPlatformContext).toHaveBeenCalled();
    });

    it("should load organization-level context for tenant", async () => {
      const params: LoadContextDto = {
        organizationId: "org-123",
        userId: "user-123",
      };

      const result = await service.loadContext(params);

      expect(result.organization).toBeDefined();
      expect(result.organization.id).toBe("org-123");
      expect(result.organization.name).toBe("Acme Corp");
      expect(
        hierarchyLoaderService.loadOrganizationContext,
      ).toHaveBeenCalledWith("org-123");
    });

    it("should load team-level context when team provided", async () => {
      const params: LoadContextDto = {
        organizationId: "org-123",
        userId: "user-123",
        teamId: "team-123",
      };

      const result = await service.loadContext(params);

      expect(result.team).toBeDefined();
      expect(result.team?.id).toBe("team-123");
      expect(hierarchyLoaderService.loadTeamContext).toHaveBeenCalledWith(
        "team-123",
        "org-123",
      );
    });

    it("should load user-level context (preferences, history)", async () => {
      const params: LoadContextDto = {
        organizationId: "org-123",
        userId: "user-123",
      };

      const result = await service.loadContext(params);

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe("user-123");
      expect(result.user.role).toBe("INVESTIGATOR");
      expect(hierarchyLoaderService.loadUserContext).toHaveBeenCalledWith(
        "user-123",
        "org-123",
      );
    });

    it("should load entity-specific context (case, investigation)", async () => {
      const params: LoadContextDto = {
        organizationId: "org-123",
        userId: "user-123",
        entityType: "case",
        entityId: "case-123",
      };

      const result = await service.loadContext(params);

      expect(result.entity).toBeDefined();
      expect(result.entity?.type).toBe("case");
      expect(result.entity?.id).toBe("case-123");
      expect(hierarchyLoaderService.loadEntityContext).toHaveBeenCalledWith(
        "case",
        "case-123",
        "org-123",
      );
    });

    it("should merge context hierarchy correctly", async () => {
      const params: LoadContextDto = {
        organizationId: "org-123",
        userId: "user-123",
        teamId: "team-123",
        entityType: "case",
        entityId: "case-123",
      };

      const result = await service.loadContext(params);

      // All levels should be present
      expect(result.platform).toBeDefined();
      expect(result.organization).toBeDefined();
      expect(result.team).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.entity).toBeDefined();
      expect(result.currentDateTime).toBeDefined();
    });

    it("should exclude cross-tenant data (CRITICAL - tenant isolation)", async () => {
      // Ensure that context loading for org-123 doesn't include data from org-456
      const params: LoadContextDto = {
        organizationId: "org-123",
        userId: "user-123",
      };

      const result = await service.loadContext(params);

      // Organization ID in the context should match request
      expect(result.organization.id).toBe("org-123");

      // Verify that the hierarchy loader was called with the correct orgId
      expect(
        hierarchyLoaderService.loadOrganizationContext,
      ).toHaveBeenCalledWith("org-123");
      expect(hierarchyLoaderService.loadUserContext).toHaveBeenCalledWith(
        "user-123",
        "org-123",
      );
    });

    it("should handle missing context levels gracefully", async () => {
      // Team context fails
      hierarchyLoaderService.loadTeamContext.mockRejectedValueOnce(
        new Error("Team not found"),
      );

      const params: LoadContextDto = {
        organizationId: "org-123",
        userId: "user-123",
        teamId: "non-existent-team",
      };

      const result = await service.loadContext(params);

      // Should still return context, with team as null/undefined
      expect(result.platform).toBeDefined();
      expect(result.organization).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.team).toBeUndefined();
    });

    it("should use fallback context when organization loading fails", async () => {
      hierarchyLoaderService.loadOrganizationContext.mockRejectedValueOnce(
        new Error("Org not found"),
      );

      const params: LoadContextDto = {
        organizationId: "non-existent-org",
        userId: "user-123",
      };

      const result = await service.loadContext(params);

      // Should return fallback org context
      expect(hierarchyLoaderService.getFallbackOrgContext).toHaveBeenCalledWith(
        "non-existent-org",
      );
      expect(result.organization.name).toBe("Unknown Organization");
    });

    it("should use fallback context when user loading fails", async () => {
      hierarchyLoaderService.loadUserContext.mockRejectedValueOnce(
        new Error("User not found"),
      );

      const params: LoadContextDto = {
        organizationId: "org-123",
        userId: "non-existent-user",
      };

      const result = await service.loadContext(params);

      // Should return fallback user context
      expect(
        hierarchyLoaderService.getFallbackUserContext,
      ).toHaveBeenCalledWith("non-existent-user");
      expect(result.user.name).toBe("Unknown User");
    });

    it("should not include entity context when not provided", async () => {
      const params: LoadContextDto = {
        organizationId: "org-123",
        userId: "user-123",
      };

      const result = await service.loadContext(params);

      expect(result.entity).toBeUndefined();
      expect(hierarchyLoaderService.loadEntityContext).not.toHaveBeenCalled();
    });

    it("should not include team context when not provided", async () => {
      const params: LoadContextDto = {
        organizationId: "org-123",
        userId: "user-123",
      };

      const result = await service.loadContext(params);

      expect(result.team).toBeUndefined();
      expect(hierarchyLoaderService.loadTeamContext).not.toHaveBeenCalled();
    });
  });

  describe("buildSystemPrompt", () => {
    it("should build system prompt from context and agent type", async () => {
      const context: AIContext = {
        platform: mockPlatformContext,
        organization: mockOrgContext,
        user: mockUserContext,
        currentDateTime: new Date().toISOString(),
      };

      const prompt = await service.buildSystemPrompt(context, "investigation");

      expect(promptBuilderService.buildSystemPrompt).toHaveBeenCalledWith(
        context,
        "investigation",
      );
      expect(prompt).toBe("System prompt content");
    });

    it("should pass agent type to prompt builder", async () => {
      const context: AIContext = {
        platform: mockPlatformContext,
        organization: mockOrgContext,
        user: mockUserContext,
        currentDateTime: new Date().toISOString(),
      };

      await service.buildSystemPrompt(context, "compliance-manager");

      expect(promptBuilderService.buildSystemPrompt).toHaveBeenCalledWith(
        context,
        "compliance-manager",
      );
    });
  });

  describe("saveContextFile", () => {
    beforeEach(() => {
      prismaService.aiContextFile.findFirst = jest.fn().mockResolvedValue(null);
      prismaService.aiContextFile.create = jest.fn().mockResolvedValue({
        ...mockAiContextFile,
        id: "new-context-file",
      });
    });

    it("should create new context file when none exists", async () => {
      const result = await service.saveContextFile({
        organizationId: "org-123",
        name: "CONTEXT.md",
        content: "New context content",
        description: "Description",
      });

      expect(result.id).toBeDefined();
      expect(prismaService.aiContextFile.create).toHaveBeenCalled();
      expect(contextCacheService.invalidate).toHaveBeenCalledWith({
        organizationId: "org-123",
        teamId: undefined,
        userId: undefined,
      });
    });

    it("should update existing context file", async () => {
      prismaService.aiContextFile.findFirst = jest
        .fn()
        .mockResolvedValue(mockAiContextFile);
      prismaService.aiContextFile.update = jest.fn().mockResolvedValue({
        ...mockAiContextFile,
        content: "Updated content",
      });

      const result = await service.saveContextFile({
        organizationId: "org-123",
        name: "CONTEXT.md",
        content: "Updated content",
      });

      expect(result.id).toBeDefined();
      expect(prismaService.aiContextFile.update).toHaveBeenCalled();
    });

    it("should invalidate cache after saving", async () => {
      await service.saveContextFile({
        organizationId: "org-123",
        name: "CONTEXT.md",
        content: "New content",
      });

      expect(contextCacheService.invalidate).toHaveBeenCalled();
    });

    it("should set scope to user when userId provided", async () => {
      await service.saveContextFile({
        organizationId: "org-123",
        userId: "user-123",
        name: "CONTEXT.md",
        content: "User context",
      });

      expect(prismaService.aiContextFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scope: "user",
          userId: "user-123",
        }),
      });
    });

    it("should set scope to team when teamId provided", async () => {
      await service.saveContextFile({
        organizationId: "org-123",
        teamId: "team-123",
        name: "CONTEXT.md",
        content: "Team context",
      });

      expect(prismaService.aiContextFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scope: "team",
          teamId: "team-123",
        }),
      });
    });
  });

  describe("getContextFile", () => {
    it("should return context file when found", async () => {
      prismaService.aiContextFile.findFirst = jest
        .fn()
        .mockResolvedValue(mockAiContextFile);

      const result = await service.getContextFile({
        organizationId: "org-123",
        name: "CONTEXT.md",
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe("context-file-1");
      expect(result?.content).toBe("Organization context content");
    });

    it("should return null when context file not found", async () => {
      prismaService.aiContextFile.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.getContextFile({
        organizationId: "org-123",
        name: "NON-EXISTENT.md",
      });

      expect(result).toBeNull();
    });

    it("should filter by userId when provided", async () => {
      prismaService.aiContextFile.findFirst = jest.fn().mockResolvedValue(null);

      await service.getContextFile({
        organizationId: "org-123",
        userId: "user-123",
        name: "CONTEXT.md",
      });

      expect(prismaService.aiContextFile.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: "org-123",
          userId: "user-123",
          name: "CONTEXT.md",
          isActive: true,
        },
      });
    });
  });

  describe("listContextFiles", () => {
    it("should list context files for organization", async () => {
      prismaService.aiContextFile.findMany = jest
        .fn()
        .mockResolvedValue([mockAiContextFile]);

      const result = await service.listContextFiles({
        organizationId: "org-123",
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("CONTEXT.md");
    });

    it("should filter by scope when provided", async () => {
      prismaService.aiContextFile.findMany = jest.fn().mockResolvedValue([]);

      await service.listContextFiles({
        organizationId: "org-123",
        scope: "team",
      });

      expect(prismaService.aiContextFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scope: "team",
          }),
        }),
      );
    });
  });

  describe("deleteContextFile", () => {
    it("should soft delete context file", async () => {
      prismaService.aiContextFile.updateMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      const result = await service.deleteContextFile(
        "context-file-1",
        "org-123",
      );

      expect(result).toBe(true);
      expect(prismaService.aiContextFile.updateMany).toHaveBeenCalledWith({
        where: { id: "context-file-1", organizationId: "org-123" },
        data: { isActive: false },
      });
    });

    it("should return false when file not found", async () => {
      prismaService.aiContextFile.updateMany = jest
        .fn()
        .mockResolvedValue({ count: 0 });

      const result = await service.deleteContextFile("non-existent", "org-123");

      expect(result).toBe(false);
    });
  });

  describe("invalidateCache", () => {
    it("should delegate to cache service", async () => {
      await service.invalidateCache({
        organizationId: "org-123",
        teamId: "team-123",
        userId: "user-123",
      });

      expect(contextCacheService.invalidate).toHaveBeenCalledWith({
        organizationId: "org-123",
        teamId: "team-123",
        userId: "user-123",
      });
    });
  });
});
