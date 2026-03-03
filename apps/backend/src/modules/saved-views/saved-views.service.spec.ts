import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { SavedViewsService } from "./saved-views.service";
import { PrismaService } from "../prisma/prisma.service";
import { ViewEntityType } from "@prisma/client";

describe("SavedViewsService", () => {
  let service: SavedViewsService;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockOtherUserId = "user-other-456";
  const mockViewId = "view-test-123";

  const mockView = {
    id: mockViewId,
    organizationId: mockOrgId,
    createdById: mockUserId,
    name: "My Open Cases",
    description: "Shows all open cases",
    entityType: ViewEntityType.CASES,
    filters: { status: ["OPEN", "IN_REVIEW"] },
    sortBy: "createdAt",
    sortOrder: "desc",
    columns: null,
    isShared: false,
    sharedWithTeamId: null,
    isDefault: false,
    isPinned: false,
    displayOrder: 0,
    color: null,
    frozenColumnCount: 0,
    viewMode: "table",
    boardGroupBy: null,
    lastUsedAt: null,
    useCount: 0,
    recordCount: null,
    recordCountAt: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  };

  const mockPrisma = {
    savedView: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedViewsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SavedViewsService>(SavedViewsService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    const mockCreateDto = {
      name: "My Open Cases",
      entityType: ViewEntityType.CASES,
      filters: { status: ["OPEN"] },
    };

    it("should create a saved view with correct organization and user", async () => {
      mockPrisma.savedView.create.mockResolvedValue(mockView);

      const result = await service.create(mockOrgId, mockUserId, mockCreateDto);

      expect(result.id).toBe(mockViewId);
      expect(mockPrisma.savedView.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId,
            createdById: mockUserId,
            name: "My Open Cases",
            entityType: ViewEntityType.CASES,
          }),
        }),
      );
    });

    it("should throw BadRequestException for invalid filter values", async () => {
      await expect(
        service.create(mockOrgId, mockUserId, {
          ...mockCreateDto,
          filters: { status: ["INVALID_STATUS"] },
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.savedView.create).not.toHaveBeenCalled();
    });

    it("should unset other defaults when isDefault is true", async () => {
      mockPrisma.savedView.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.savedView.create.mockResolvedValue({
        ...mockView,
        isDefault: true,
      });

      await service.create(mockOrgId, mockUserId, {
        ...mockCreateDto,
        isDefault: true,
      });

      expect(mockPrisma.savedView.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
            createdById: mockUserId,
            entityType: ViewEntityType.CASES,
            isDefault: true,
          }),
          data: { isDefault: false },
        }),
      );
    });

    it("should not call updateMany when isDefault is false", async () => {
      mockPrisma.savedView.create.mockResolvedValue(mockView);

      await service.create(mockOrgId, mockUserId, mockCreateDto);

      expect(mockPrisma.savedView.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("should return view when user owns it", async () => {
      mockPrisma.savedView.findFirst.mockResolvedValue(mockView);

      const result = await service.findById(mockOrgId, mockUserId, mockViewId);

      expect(result.id).toBe(mockViewId);
      expect(mockPrisma.savedView.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockViewId,
          organizationId: mockOrgId,
          OR: [{ createdById: mockUserId }, { isShared: true }],
        },
      });
    });

    it("should throw NotFoundException when view not found", async () => {
      mockPrisma.savedView.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(mockOrgId, mockUserId, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAll", () => {
    it("should return views grouped by entity type", async () => {
      const caseView = { ...mockView, entityType: ViewEntityType.CASES };
      const riuView = {
        ...mockView,
        id: "view-2",
        entityType: ViewEntityType.RIUS,
      };
      mockPrisma.savedView.findMany.mockResolvedValue([caseView, riuView]);

      const result = await service.findAll(mockOrgId, mockUserId, {});

      expect(result.data).toHaveLength(2);
      expect(result.grouped[ViewEntityType.CASES]).toHaveLength(1);
      expect(result.grouped[ViewEntityType.RIUS]).toHaveLength(1);
      expect(result.total).toBe(2);
    });

    it("should filter by entityType when provided", async () => {
      mockPrisma.savedView.findMany.mockResolvedValue([mockView]);

      await service.findAll(mockOrgId, mockUserId, {
        entityType: ViewEntityType.CASES,
      });

      expect(mockPrisma.savedView.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: ViewEntityType.CASES,
          }),
        }),
      );
    });

    it("should filter pinned views when pinnedOnly is true", async () => {
      mockPrisma.savedView.findMany.mockResolvedValue([]);

      await service.findAll(mockOrgId, mockUserId, { pinnedOnly: true });

      expect(mockPrisma.savedView.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPinned: true }),
        }),
      );
    });
  });

  describe("update", () => {
    it("should update view when user is owner", async () => {
      mockPrisma.savedView.findFirst.mockResolvedValue(mockView);
      mockPrisma.savedView.update.mockResolvedValue({
        ...mockView,
        name: "Updated View",
      });

      const result = await service.update(mockOrgId, mockUserId, mockViewId, {
        name: "Updated View",
      });

      expect(result.name).toBe("Updated View");
    });

    it("should throw ForbiddenException when non-owner tries to update", async () => {
      mockPrisma.savedView.findFirst.mockResolvedValue(mockView); // view owned by mockUserId

      await expect(
        service.update(mockOrgId, mockOtherUserId, mockViewId, {
          name: "Attempt to modify",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException for invalid filter values on update", async () => {
      mockPrisma.savedView.findFirst.mockResolvedValue(mockView);

      await expect(
        service.update(mockOrgId, mockUserId, mockViewId, {
          filters: { status: ["TOTALLY_INVALID_STATUS"] },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("delete", () => {
    it("should delete view when user is owner", async () => {
      mockPrisma.savedView.findFirst.mockResolvedValue(mockView);
      mockPrisma.savedView.delete.mockResolvedValue(mockView);

      await service.delete(mockOrgId, mockUserId, mockViewId);

      expect(mockPrisma.savedView.delete).toHaveBeenCalledWith({
        where: { id: mockViewId },
      });
    });

    it("should throw ForbiddenException when non-owner tries to delete", async () => {
      mockPrisma.savedView.findFirst.mockResolvedValue(mockView); // owned by mockUserId

      await expect(
        service.delete(mockOrgId, mockOtherUserId, mockViewId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("applyView", () => {
    it("should apply view and track usage", async () => {
      mockPrisma.savedView.findFirst.mockResolvedValue(mockView);
      mockPrisma.savedView.update.mockResolvedValue({
        ...mockView,
        useCount: 1,
        lastUsedAt: new Date(),
      });

      const result = await service.applyView(mockOrgId, mockUserId, mockViewId);

      expect(result.filters).toBeDefined();
      expect(mockPrisma.savedView.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockViewId },
          data: expect.objectContaining({
            lastUsedAt: expect.any(Date),
            useCount: { increment: 1 },
          }),
        }),
      );
    });

    it("should return sortBy and sortOrder from the view", async () => {
      mockPrisma.savedView.findFirst.mockResolvedValue(mockView);
      mockPrisma.savedView.update.mockResolvedValue(mockView);

      const result = await service.applyView(mockOrgId, mockUserId, mockViewId);

      expect(result.sortBy).toBe("createdAt");
      expect(result.sortOrder).toBe("desc");
    });
  });

  describe("duplicate", () => {
    it("should create a copy with default name suffixed (Copy)", async () => {
      mockPrisma.savedView.findFirst.mockResolvedValue(mockView);
      const duplicateView = {
        ...mockView,
        id: "view-copy-1",
        name: "My Open Cases (Copy)",
        isShared: false,
        isPinned: false,
        isDefault: false,
      };
      mockPrisma.savedView.create.mockResolvedValue(duplicateView);

      const result = await service.duplicate(mockOrgId, mockUserId, mockViewId);

      expect(result.name).toBe("My Open Cases (Copy)");
      expect(mockPrisma.savedView.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isShared: false,
            isPinned: false,
            isDefault: false,
          }),
        }),
      );
    });

    it("should use custom name when provided", async () => {
      mockPrisma.savedView.findFirst.mockResolvedValue(mockView);
      const duplicateView = {
        ...mockView,
        id: "view-copy-1",
        name: "Custom Name",
      };
      mockPrisma.savedView.create.mockResolvedValue(duplicateView);

      const result = await service.duplicate(
        mockOrgId,
        mockUserId,
        mockViewId,
        "Custom Name",
      );

      expect(result.name).toBe("Custom Name");
    });
  });

  describe("getDefaultView", () => {
    it("should return default view for entity type", async () => {
      const defaultView = { ...mockView, isDefault: true };
      mockPrisma.savedView.findFirst.mockResolvedValue(defaultView);

      const result = await service.getDefaultView(
        mockOrgId,
        mockUserId,
        ViewEntityType.CASES,
      );

      expect(result).toEqual(defaultView);
      expect(mockPrisma.savedView.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrgId,
          createdById: mockUserId,
          entityType: ViewEntityType.CASES,
          isDefault: true,
        },
      });
    });
  });
});
