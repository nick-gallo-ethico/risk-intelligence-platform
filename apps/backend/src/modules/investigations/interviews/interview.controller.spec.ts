import { Test, TestingModule } from "@nestjs/testing";
import { InvestigationInterviewController } from "./interview.controller";
import { InvestigationInterviewService } from "./interview.service";
import { InterviewStatus, IntervieweeType } from "@prisma/client";

describe("InvestigationInterviewController", () => {
  let controller: InvestigationInterviewController;
  let interviewService: jest.Mocked<InvestigationInterviewService>;

  const mockOrganizationId = "org-123";
  const mockUserId = "user-456";
  const mockInterviewId = "int-001";
  const mockInvestigationId = "inv-001";
  const mockTemplateId = "tpl-001";
  const mockPersonId = "person-001";

  const mockUser = {
    id: mockUserId,
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    organizationId: mockOrganizationId,
    role: "INVESTIGATOR",
  };

  const mockInterview = {
    id: mockInterviewId,
    organizationId: mockOrganizationId,
    investigationId: mockInvestigationId,
    intervieweeType: IntervieweeType.PERSON,
    intervieweeName: "Jane Smith",
    status: InterviewStatus.SCHEDULED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTemplate = {
    id: mockTemplateId,
    name: "Standard Template",
    organizationId: mockOrganizationId,
    isActive: true,
  };

  const mockInterviewService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    start: jest.fn(),
    complete: jest.fn(),
    cancel: jest.fn(),
    delete: jest.fn(),
    createTemplate: jest.fn(),
    findAllTemplates: jest.fn(),
    findTemplateById: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    findInterviewsByPerson: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestigationInterviewController],
      providers: [
        {
          provide: InvestigationInterviewService,
          useValue: mockInterviewService,
        },
      ],
    }).compile();

    controller = module.get<InvestigationInterviewController>(
      InvestigationInterviewController,
    );
    interviewService = module.get(InvestigationInterviewService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create an interview", async () => {
      const dto = {
        investigationId: mockInvestigationId,
        intervieweeType: IntervieweeType.PERSON,
        intervieweeName: "Jane Smith",
      };
      mockInterviewService.create.mockResolvedValue(mockInterview);

      const result = await controller.create(
        mockOrganizationId,
        mockUser as never,
        dto as never,
      );

      expect(interviewService.create).toHaveBeenCalledWith(
        mockOrganizationId,
        mockUserId,
        dto,
      );
      expect(result).toEqual(mockInterview);
    });
  });

  describe("findAll", () => {
    it("should return paginated interviews", async () => {
      const mockResult = {
        data: [mockInterview],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockInterviewService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockOrganizationId, {} as never);

      expect(interviewService.findAll).toHaveBeenCalledWith(
        mockOrganizationId,
        {},
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("findOne", () => {
    it("should return a single interview", async () => {
      mockInterviewService.findById.mockResolvedValue(mockInterview);

      const result = await controller.findOne(
        mockOrganizationId,
        mockInterviewId,
      );

      expect(interviewService.findById).toHaveBeenCalledWith(
        mockOrganizationId,
        mockInterviewId,
      );
      expect(result).toEqual(mockInterview);
    });
  });

  describe("update", () => {
    it("should update interview", async () => {
      const dto = { location: "Conference Room B" };
      const updatedInterview = {
        ...mockInterview,
        location: "Conference Room B",
      };
      mockInterviewService.update.mockResolvedValue(updatedInterview);

      const result = await controller.update(
        mockOrganizationId,
        mockUser as never,
        mockInterviewId,
        dto as never,
      );

      expect(interviewService.update).toHaveBeenCalledWith(
        mockOrganizationId,
        mockInterviewId,
        mockUserId,
        dto,
      );
      expect(result).toEqual(updatedInterview);
    });
  });

  describe("start", () => {
    it("should start interview", async () => {
      const startedInterview = {
        ...mockInterview,
        status: InterviewStatus.IN_PROGRESS,
      };
      mockInterviewService.start.mockResolvedValue(startedInterview);

      const result = await controller.start(
        mockOrganizationId,
        mockUser as never,
        mockInterviewId,
      );

      expect(interviewService.start).toHaveBeenCalledWith(
        mockOrganizationId,
        mockInterviewId,
        mockUserId,
      );
      expect(result.status).toBe(InterviewStatus.IN_PROGRESS);
    });
  });

  describe("complete", () => {
    it("should complete interview with summary", async () => {
      const completedInterview = {
        ...mockInterview,
        status: InterviewStatus.COMPLETED,
        summary: "Interview summary",
      };
      mockInterviewService.complete.mockResolvedValue(completedInterview);

      const result = await controller.complete(
        mockOrganizationId,
        mockUser as never,
        mockInterviewId,
        "Interview summary",
      );

      expect(interviewService.complete).toHaveBeenCalledWith(
        mockOrganizationId,
        mockInterviewId,
        mockUserId,
        "Interview summary",
      );
      expect(result.status).toBe(InterviewStatus.COMPLETED);
    });
  });

  describe("cancel", () => {
    it("should cancel interview", async () => {
      const cancelledInterview = {
        ...mockInterview,
        status: InterviewStatus.CANCELLED,
      };
      mockInterviewService.cancel.mockResolvedValue(cancelledInterview);

      const result = await controller.cancel(
        mockOrganizationId,
        mockUser as never,
        mockInterviewId,
      );

      expect(interviewService.cancel).toHaveBeenCalledWith(
        mockOrganizationId,
        mockInterviewId,
        mockUserId,
      );
      expect(result.status).toBe(InterviewStatus.CANCELLED);
    });
  });

  describe("delete", () => {
    it("should delete interview", async () => {
      mockInterviewService.delete.mockResolvedValue(undefined);

      await controller.delete(
        mockOrganizationId,
        mockUser as never,
        mockInterviewId,
      );

      expect(interviewService.delete).toHaveBeenCalledWith(
        mockOrganizationId,
        mockInterviewId,
        mockUserId,
      );
    });
  });

  // Interview Templates

  describe("createTemplate", () => {
    it("should create interview template", async () => {
      const dto = { name: "New Template", questions: [] };
      mockInterviewService.createTemplate.mockResolvedValue(mockTemplate);

      const result = await controller.createTemplate(
        mockOrganizationId,
        mockUser as never,
        dto as never,
      );

      expect(interviewService.createTemplate).toHaveBeenCalledWith(
        mockOrganizationId,
        mockUserId,
        dto,
      );
      expect(result).toEqual(mockTemplate);
    });
  });

  describe("findAllTemplates", () => {
    it("should return all templates", async () => {
      mockInterviewService.findAllTemplates.mockResolvedValue([mockTemplate]);

      const result = await controller.findAllTemplates(mockOrganizationId);

      expect(interviewService.findAllTemplates).toHaveBeenCalledWith(
        mockOrganizationId,
        undefined,
      );
      expect(result).toHaveLength(1);
    });

    it("should filter by categoryId when provided", async () => {
      mockInterviewService.findAllTemplates.mockResolvedValue([]);

      await controller.findAllTemplates(mockOrganizationId, "cat-001");

      expect(interviewService.findAllTemplates).toHaveBeenCalledWith(
        mockOrganizationId,
        "cat-001",
      );
    });
  });

  describe("findTemplateById", () => {
    it("should return template by id", async () => {
      mockInterviewService.findTemplateById.mockResolvedValue(mockTemplate);

      const result = await controller.findTemplateById(
        mockOrganizationId,
        mockTemplateId,
      );

      expect(interviewService.findTemplateById).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
      );
      expect(result).toEqual(mockTemplate);
    });
  });

  describe("updateTemplate", () => {
    it("should update template", async () => {
      const dto = { name: "Updated Template" };
      const updatedTemplate = { ...mockTemplate, name: "Updated Template" };
      mockInterviewService.updateTemplate.mockResolvedValue(updatedTemplate);

      const result = await controller.updateTemplate(
        mockOrganizationId,
        mockTemplateId,
        dto as never,
      );

      expect(interviewService.updateTemplate).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
        dto,
      );
      expect(result.name).toBe("Updated Template");
    });
  });

  describe("deleteTemplate", () => {
    it("should delete template", async () => {
      mockInterviewService.deleteTemplate.mockResolvedValue(undefined);

      await controller.deleteTemplate(mockOrganizationId, mockTemplateId);

      expect(interviewService.deleteTemplate).toHaveBeenCalledWith(
        mockOrganizationId,
        mockTemplateId,
      );
    });
  });

  describe("findByPerson", () => {
    it("should return interviews for a person", async () => {
      mockInterviewService.findInterviewsByPerson.mockResolvedValue([
        mockInterview,
      ]);

      const result = await controller.findByPerson(
        mockOrganizationId,
        mockPersonId,
      );

      expect(interviewService.findInterviewsByPerson).toHaveBeenCalledWith(
        mockOrganizationId,
        mockPersonId,
      );
      expect(result).toHaveLength(1);
    });
  });
});
