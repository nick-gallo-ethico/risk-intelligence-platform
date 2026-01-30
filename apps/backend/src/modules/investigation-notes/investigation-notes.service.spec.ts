// =============================================================================
// INVESTIGATION NOTES SERVICE - Unit Tests
// =============================================================================
//
// Tests for InvestigationNotesService covering:
// - CRUD operations
// - Tenant isolation (organizationId filtering)
// - Visibility-based access control
// - Activity logging
// - HTML sanitization
// =============================================================================

import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { InvestigationNotesService } from "./investigation-notes.service";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import {
  NoteType,
  NoteVisibility,
  UserRole,
  AuditEntityType,
} from "@prisma/client";

describe("InvestigationNotesService", () => {
  let service: InvestigationNotesService;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;

  // -------------------------------------------------------------------------
  // Test Data Fixtures
  // -------------------------------------------------------------------------
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockOtherUserId = "user-other-456";
  const mockNoteId = "note-test-123";
  const mockInvestigationId = "investigation-test-123";

  const mockUser = {
    id: mockUserId,
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
  };

  const mockInvestigation = {
    id: mockInvestigationId,
    organizationId: mockOrgId,
    investigationNumber: 1,
    assignedTo: [mockUserId],
  };

  const mockNote = {
    id: mockNoteId,
    investigationId: mockInvestigationId,
    organizationId: mockOrgId,
    content: "<p>Test note content</p>",
    contentPlainText: "Test note content",
    noteType: NoteType.GENERAL,
    visibility: NoteVisibility.TEAM,
    authorId: mockUserId,
    authorName: "John Doe",
    isEdited: false,
    editedAt: null,
    editCount: 0,
    attachments: [],
    aiSummary: null,
    aiSummaryGeneratedAt: null,
    aiModelVersion: null,
    sourceSystem: null,
    sourceRecordId: null,
    migratedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: mockUser,
    investigation: { id: mockInvestigationId, investigationNumber: 1 },
  };

  const mockCreateDto = {
    content: "<p>New note content</p>",
    noteType: NoteType.GENERAL,
    visibility: NoteVisibility.TEAM,
  };

  // -------------------------------------------------------------------------
  // Mock Setup
  // -------------------------------------------------------------------------
  const mockPrismaService = {
    investigation: {
      findFirst: jest.fn(),
    },
    investigationNote: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  // -------------------------------------------------------------------------
  // Module Setup
  // -------------------------------------------------------------------------
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestigationNotesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    service = module.get<InvestigationNotesService>(InvestigationNotesService);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // describe('create')
  // -------------------------------------------------------------------------
  describe("create", () => {
    it("should create note with correct organization", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation,
      );
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.investigationNote.create.mockResolvedValue(mockNote);

      // Act
      const result = await service.create(
        mockCreateDto,
        mockInvestigationId,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(prisma.investigationNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId, // CRITICAL: Org from parameter
            investigationId: mockInvestigationId,
            authorId: mockUserId,
            authorName: "John Doe",
          }),
        }),
      );
      expect(result.id).toBe(mockNoteId);
    });

    it("should strip HTML to generate plain text", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation,
      );
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.investigationNote.create.mockResolvedValue(mockNote);

      const htmlDto = {
        ...mockCreateDto,
        content: "<p>Test <strong>bold</strong> content</p>",
      };

      // Act
      await service.create(htmlDto, mockInvestigationId, mockUserId, mockOrgId);

      // Assert
      expect(prisma.investigationNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contentPlainText: expect.stringContaining("Test bold content"),
          }),
        }),
      );
    });

    it("should log activity on note creation", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation,
      );
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.investigationNote.create.mockResolvedValue(mockNote);

      // Act
      await service.create(
        mockCreateDto,
        mockInvestigationId,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.INVESTIGATION,
          entityId: mockInvestigationId,
          action: "note_created",
          actionDescription: expect.stringContaining("John Doe"),
          actorUserId: mockUserId,
          organizationId: mockOrgId,
        }),
      );
    });

    it("should throw NotFoundException if investigation not found", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.create(
          mockCreateDto,
          mockInvestigationId,
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should sanitize XSS content", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation,
      );
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.investigationNote.create.mockResolvedValue(mockNote);

      const xssDto = {
        ...mockCreateDto,
        content: '<p>Safe content<script>alert("xss")</script></p>',
      };

      // Act
      await service.create(xssDto, mockInvestigationId, mockUserId, mockOrgId);

      // Assert - script tag should be removed
      expect(prisma.investigationNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: expect.not.stringContaining("<script>"),
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('findOne')
  // -------------------------------------------------------------------------
  describe("findOne", () => {
    it("should return note when found in organization", async () => {
      // Arrange
      const noteWithInvestigation = {
        ...mockNote,
        investigation: {
          ...mockNote.investigation,
          assignedTo: [mockUserId],
        },
      };
      mockPrismaService.investigationNote.findFirst.mockResolvedValue(
        noteWithInvestigation,
      );

      // Act
      const result = await service.findOne(
        mockNoteId,
        mockUserId,
        UserRole.INVESTIGATOR,
        mockOrgId,
      );

      // Assert
      expect(result.id).toBe(mockNoteId);
      expect(prisma.investigationNote.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockNoteId,
            organizationId: mockOrgId, // CRITICAL: Must filter by org
          }),
        }),
      );
    });

    it("should not find note from different org", async () => {
      // Arrange - Note exists but query with different org returns null
      mockPrismaService.investigationNote.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne(
          mockNoteId,
          mockUserId,
          UserRole.INVESTIGATOR,
          "other-org-id",
        ),
      ).rejects.toThrow(NotFoundException);

      // Verify query included org filter
      expect(prisma.investigationNote.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "other-org-id",
          }),
        }),
      );
    });

    it("should filter by visibility permissions - PRIVATE note not visible to non-author", async () => {
      // Arrange
      const privateNote = {
        ...mockNote,
        visibility: NoteVisibility.PRIVATE,
        authorId: mockOtherUserId, // Different author
        investigation: {
          ...mockNote.investigation,
          assignedTo: [mockUserId],
        },
      };
      mockPrismaService.investigationNote.findFirst.mockResolvedValue(
        privateNote,
      );

      // Act & Assert - Should throw because user is not author
      await expect(
        service.findOne(
          mockNoteId,
          mockUserId,
          UserRole.INVESTIGATOR,
          mockOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should allow admin to see PRIVATE notes", async () => {
      // Arrange
      const privateNote = {
        ...mockNote,
        visibility: NoteVisibility.PRIVATE,
        authorId: mockOtherUserId, // Different author
        investigation: {
          ...mockNote.investigation,
          assignedTo: [],
        },
      };
      mockPrismaService.investigationNote.findFirst.mockResolvedValue(
        privateNote,
      );

      // Act
      const result = await service.findOne(
        mockNoteId,
        mockUserId,
        UserRole.COMPLIANCE_OFFICER, // Admin role
        mockOrgId,
      );

      // Assert
      expect(result.id).toBe(mockNoteId);
    });
  });

  // -------------------------------------------------------------------------
  // describe('findAllForInvestigation')
  // -------------------------------------------------------------------------
  describe("findAllForInvestigation", () => {
    it("should return paginated notes", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation,
      );
      mockPrismaService.investigationNote.findMany.mockResolvedValue([
        mockNote,
      ]);
      mockPrismaService.investigationNote.count.mockResolvedValue(1);

      // Act
      const result = await service.findAllForInvestigation(
        mockInvestigationId,
        { page: 1, limit: 20 },
        mockUserId,
        UserRole.INVESTIGATOR,
        mockOrgId,
      );

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it("should always filter by organizationId", async () => {
      // Arrange
      mockPrismaService.investigation.findFirst.mockResolvedValue(
        mockInvestigation,
      );
      mockPrismaService.investigationNote.findMany.mockResolvedValue([]);
      mockPrismaService.investigationNote.count.mockResolvedValue(0);

      // Act
      await service.findAllForInvestigation(
        mockInvestigationId,
        {},
        mockUserId,
        UserRole.INVESTIGATOR,
        mockOrgId,
      );

      // Assert
      expect(prisma.investigationNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId, // CRITICAL
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('update')
  // -------------------------------------------------------------------------
  describe("update", () => {
    it("should mark note as edited on update", async () => {
      // Arrange
      mockPrismaService.investigationNote.findFirst.mockResolvedValue(mockNote);
      mockPrismaService.investigationNote.update.mockResolvedValue({
        ...mockNote,
        isEdited: true,
        editCount: 1,
      });
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      // Act
      await service.update(
        mockNoteId,
        { content: "Updated content" },
        mockUserId,
        UserRole.INVESTIGATOR,
        mockOrgId,
      );

      // Assert
      expect(prisma.investigationNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isEdited: true,
            editCount: { increment: 1 },
            editedAt: expect.any(Date),
          }),
        }),
      );
    });

    it("should only allow author or admin to update", async () => {
      // Arrange - Note owned by different user
      const otherUserNote = {
        ...mockNote,
        authorId: mockOtherUserId,
        investigation: mockNote.investigation,
      };
      mockPrismaService.investigationNote.findFirst.mockResolvedValue(
        otherUserNote,
      );

      // Act & Assert - Regular user trying to update someone else's note
      await expect(
        service.update(
          mockNoteId,
          { content: "Hack attempt" },
          mockUserId,
          UserRole.INVESTIGATOR,
          mockOrgId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should allow admin to update any note", async () => {
      // Arrange - Note owned by different user
      const otherUserNote = {
        ...mockNote,
        authorId: mockOtherUserId,
        investigation: mockNote.investigation,
      };
      mockPrismaService.investigationNote.findFirst.mockResolvedValue(
        otherUserNote,
      );
      mockPrismaService.investigationNote.update.mockResolvedValue({
        ...otherUserNote,
        content: "Admin updated",
      });
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      // Act - Admin user
      const result = await service.update(
        mockNoteId,
        { content: "Admin updated" },
        mockUserId,
        UserRole.COMPLIANCE_OFFICER,
        mockOrgId,
      );

      // Assert
      expect(result).toBeDefined();
    });

    it("should log activity on update", async () => {
      // Arrange
      mockPrismaService.investigationNote.findFirst.mockResolvedValue(mockNote);
      mockPrismaService.investigationNote.update.mockResolvedValue({
        ...mockNote,
        content: "Updated",
      });
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      // Act
      await service.update(
        mockNoteId,
        { content: "Updated" },
        mockUserId,
        UserRole.INVESTIGATOR,
        mockOrgId,
      );

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "note_updated",
          actorUserId: mockUserId,
          organizationId: mockOrgId,
        }),
      );
    });

    it("should regenerate plaintext when content changes", async () => {
      // Arrange
      mockPrismaService.investigationNote.findFirst.mockResolvedValue(mockNote);
      mockPrismaService.investigationNote.update.mockResolvedValue(mockNote);
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      // Act
      await service.update(
        mockNoteId,
        { content: "<p>New <em>content</em></p>" },
        mockUserId,
        UserRole.INVESTIGATOR,
        mockOrgId,
      );

      // Assert
      expect(prisma.investigationNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contentPlainText: expect.stringContaining("New content"),
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('delete')
  // -------------------------------------------------------------------------
  describe("delete", () => {
    it("should delete note and log activity", async () => {
      // Arrange
      mockPrismaService.investigationNote.findFirst.mockResolvedValue(mockNote);
      mockPrismaService.investigationNote.delete.mockResolvedValue(mockNote);
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      // Act
      await service.delete(
        mockNoteId,
        mockUserId,
        UserRole.INVESTIGATOR,
        mockOrgId,
      );

      // Assert
      expect(prisma.investigationNote.delete).toHaveBeenCalledWith({
        where: { id: mockNoteId },
      });
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "note_deleted",
          actorUserId: mockUserId,
          organizationId: mockOrgId,
        }),
      );
    });

    it("should only allow author or admin to delete", async () => {
      // Arrange - Note owned by different user
      const otherUserNote = {
        ...mockNote,
        authorId: mockOtherUserId,
        investigation: mockNote.investigation,
      };
      mockPrismaService.investigationNote.findFirst.mockResolvedValue(
        otherUserNote,
      );

      // Act & Assert
      await expect(
        service.delete(
          mockNoteId,
          mockUserId,
          UserRole.INVESTIGATOR,
          mockOrgId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException for non-existent note", async () => {
      // Arrange
      mockPrismaService.investigationNote.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.delete(
          "non-existent",
          mockUserId,
          UserRole.INVESTIGATOR,
          mockOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // describe('stripHtml')
  // -------------------------------------------------------------------------
  describe("stripHtml", () => {
    it("should remove HTML tags", () => {
      // Act
      const result = service.stripHtml("<p>Hello <strong>World</strong></p>");

      // Assert
      expect(result).toBe("Hello World");
    });

    it("should decode HTML entities", () => {
      // Act
      const result = service.stripHtml("Tom &amp; Jerry &lt;3");

      // Assert
      expect(result).toBe("Tom & Jerry <3");
    });

    it("should collapse whitespace", () => {
      // Act
      const result = service.stripHtml("<p>Hello</p>   <p>World</p>");

      // Assert
      expect(result).toBe("Hello World");
    });
  });
});
