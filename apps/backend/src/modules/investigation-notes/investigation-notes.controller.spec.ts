import { Test, TestingModule } from "@nestjs/testing";
import { InvestigationNotesController } from "./investigation-notes.controller";
import { InvestigationNotesService } from "./investigation-notes.service";
import { NoteType, NoteVisibility, UserRole } from "@prisma/client";

describe("InvestigationNotesController", () => {
  let controller: InvestigationNotesController;
  let notesService: jest.Mocked<InvestigationNotesService>;

  const mockOrganizationId = "org-123";
  const mockUserId = "user-456";
  const mockInvestigationId = "inv-001";
  const mockNoteId = "note-001";

  const mockUser = {
    id: mockUserId,
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    organizationId: mockOrganizationId,
    role: UserRole.INVESTIGATOR,
  };

  const mockNote = {
    id: mockNoteId,
    investigationId: mockInvestigationId,
    organizationId: mockOrganizationId,
    content: "<p>Test note</p>",
    contentPlainText: "Test note",
    noteType: NoteType.GENERAL,
    visibility: NoteVisibility.TEAM,
    author: {
      id: mockUserId,
      name: "John Doe",
      email: "test@example.com",
    },
    isEdited: false,
    editCount: 0,
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    investigation: {
      id: mockInvestigationId,
      investigationNumber: 1,
    },
  };

  const mockNotesService = {
    create: jest.fn(),
    findAllForInvestigation: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestigationNotesController],
      providers: [
        { provide: InvestigationNotesService, useValue: mockNotesService },
      ],
    }).compile();

    controller = module.get<InvestigationNotesController>(
      InvestigationNotesController,
    );
    notesService = module.get(InvestigationNotesService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a note", async () => {
      const dto = {
        content: "<p>New note</p>",
        noteType: NoteType.GENERAL,
        visibility: NoteVisibility.TEAM,
      };
      mockNotesService.create.mockResolvedValue(mockNote);

      const result = await controller.create(
        mockInvestigationId,
        dto as never,
        mockUser as never,
        mockOrganizationId,
      );

      expect(notesService.create).toHaveBeenCalledWith(
        dto,
        mockInvestigationId,
        mockUserId,
        mockOrganizationId,
      );
      expect(result).toEqual(mockNote);
    });
  });

  describe("findAll", () => {
    it("should return paginated notes", async () => {
      const mockResult = {
        items: [mockNote],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };
      mockNotesService.findAllForInvestigation.mockResolvedValue(mockResult);

      const result = await controller.findAll(
        mockInvestigationId,
        {} as never,
        mockUser as never,
        mockOrganizationId,
      );

      expect(notesService.findAllForInvestigation).toHaveBeenCalledWith(
        mockInvestigationId,
        {},
        mockUserId,
        mockUser.role,
        mockOrganizationId,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("findOne", () => {
    it("should return a single note", async () => {
      mockNotesService.findOne.mockResolvedValue(mockNote);

      const result = await controller.findOne(
        mockInvestigationId,
        mockNoteId,
        mockUser as never,
        mockOrganizationId,
      );

      expect(notesService.findOne).toHaveBeenCalledWith(
        mockNoteId,
        mockUserId,
        mockUser.role,
        mockOrganizationId,
      );
      expect(result).toEqual(mockNote);
    });
  });

  describe("update", () => {
    it("should update a note", async () => {
      const dto = { content: "<p>Updated note</p>" };
      const updatedNote = {
        ...mockNote,
        content: "<p>Updated note</p>",
        isEdited: true,
        editCount: 1,
      };
      mockNotesService.update.mockResolvedValue(updatedNote);

      const result = await controller.update(
        mockInvestigationId,
        mockNoteId,
        dto as never,
        mockUser as never,
        mockOrganizationId,
      );

      expect(notesService.update).toHaveBeenCalledWith(
        mockNoteId,
        dto,
        mockUserId,
        mockUser.role,
        mockOrganizationId,
      );
      expect(result.isEdited).toBe(true);
    });
  });

  describe("delete", () => {
    it("should delete a note", async () => {
      mockNotesService.delete.mockResolvedValue(undefined);

      await controller.delete(
        mockInvestigationId,
        mockNoteId,
        mockUser as never,
        mockOrganizationId,
      );

      expect(notesService.delete).toHaveBeenCalledWith(
        mockNoteId,
        mockUserId,
        mockUser.role,
        mockOrganizationId,
      );
    });
  });
});
