import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InvestigationInterviewService } from "./interview.service";
import { PrismaService } from "../../prisma/prisma.service";
import { InterviewStatus, IntervieweeType } from "@prisma/client";

describe("InvestigationInterviewService", () => {
  let service: InvestigationInterviewService;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockOrganizationId = "org-123";
  const mockUserId = "user-456";
  const mockInvestigationId = "inv-001";
  const mockInterviewId = "int-001";
  const mockTemplateId = "tpl-001";
  const mockPersonId = "person-001";

  const mockInterview = {
    id: mockInterviewId,
    organizationId: mockOrganizationId,
    investigationId: mockInvestigationId,
    intervieweeType: IntervieweeType.PERSON,
    intervieweePersonId: mockPersonId,
    intervieweeName: "Jane Smith",
    intervieweeTitle: "Manager",
    intervieweeEmail: "jane@example.com",
    intervieweePhone: "123-456-7890",
    scheduledAt: new Date(),
    startedAt: null,
    completedAt: null,
    duration: null,
    location: "Conference Room A",
    purpose: "Gather facts",
    status: InterviewStatus.SCHEDULED,
    notes: null,
    summary: null,
    keyFindings: null,
    templateId: null,
    questions: null,
    hasRecording: false,
    recordingUrl: null,
    transcriptUrl: null,
    consentObtained: false,
    consentNotes: null,
    conductedById: mockUserId,
    secondaryInterviewerIds: [],
    checklistItemId: null,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    investigation: {
      id: mockInvestigationId,
      caseId: "case-001",
      investigationNumber: 1,
    },
  };

  const mockTemplate = {
    id: mockTemplateId,
    organizationId: mockOrganizationId,
    name: "Standard Interview Template",
    description: "Basic interview questions",
    categoryId: null,
    questions: [{ id: "q1", text: "What did you observe?", required: true }],
    isActive: true,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock Setup - define outside beforeEach
  const mockPrismaService = {
    investigationInterview: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    interviewTemplate: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestigationInterviewService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<InvestigationInterviewService>(
      InvestigationInterviewService,
    );
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDto = {
      investigationId: mockInvestigationId,
      intervieweeType: IntervieweeType.PERSON,
      intervieweePersonId: mockPersonId,
      intervieweeName: "Jane Smith",
      scheduledAt: new Date().toISOString(),
      location: "Conference Room A",
      purpose: "Gather facts",
    };

    it("should create an interview", async () => {
      mockPrismaService.investigationInterview.create.mockResolvedValue(
        mockInterview,
      );

      const result = await service.create(
        mockOrganizationId,
        mockUserId,
        createDto as never,
      );

      expect(
        mockPrismaService.investigationInterview.create,
      ).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "investigation.interview.created",
        expect.any(Object),
      );
      expect(result.id).toBe(mockInterviewId);
    });

    it("should throw BadRequestException when PERSON type without personId", async () => {
      const invalidDto = {
        ...createDto,
        intervieweePersonId: undefined,
      };

      await expect(
        service.create(mockOrganizationId, mockUserId, invalidDto as never),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when EXTERNAL type without name", async () => {
      const invalidDto = {
        investigationId: mockInvestigationId,
        intervieweeType: IntervieweeType.EXTERNAL,
        intervieweeName: undefined,
      };

      await expect(
        service.create(mockOrganizationId, mockUserId, invalidDto as never),
      ).rejects.toThrow(BadRequestException);
    });

    it("should load questions from template when templateId provided", async () => {
      const dtoWithTemplate = {
        ...createDto,
        templateId: mockTemplateId,
      };
      mockPrismaService.interviewTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.investigationInterview.create.mockResolvedValue({
        ...mockInterview,
        templateId: mockTemplateId,
        questions: mockTemplate.questions,
      });

      await service.create(
        mockOrganizationId,
        mockUserId,
        dtoWithTemplate as never,
      );

      expect(
        mockPrismaService.interviewTemplate.findFirst,
      ).toHaveBeenCalledWith({
        where: { id: mockTemplateId, organizationId: mockOrganizationId },
      });
    });
  });

  describe("findById", () => {
    it("should return interview when found", async () => {
      mockPrismaService.investigationInterview.findFirst.mockResolvedValue(
        mockInterview,
      );

      const result = await service.findById(
        mockOrganizationId,
        mockInterviewId,
      );

      expect(result).toEqual(mockInterview);
      expect(
        mockPrismaService.investigationInterview.findFirst,
      ).toHaveBeenCalledWith({
        where: { id: mockInterviewId, organizationId: mockOrganizationId },
        include: expect.any(Object),
      });
    });

    it("should throw NotFoundException when not found", async () => {
      mockPrismaService.investigationInterview.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.findById(mockOrganizationId, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByInvestigation", () => {
    it("should return interviews for investigation", async () => {
      mockPrismaService.investigationInterview.findMany.mockResolvedValue([
        mockInterview,
      ]);

      const result = await service.findByInvestigation(
        mockOrganizationId,
        mockInvestigationId,
      );

      expect(result).toHaveLength(1);
      expect(
        mockPrismaService.investigationInterview.findMany,
      ).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          investigationId: mockInvestigationId,
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("findAll", () => {
    it("should return paginated interviews", async () => {
      mockPrismaService.investigationInterview.findMany.mockResolvedValue([
        mockInterview,
      ]);
      mockPrismaService.investigationInterview.count.mockResolvedValue(1);

      const result = await service.findAll(mockOrganizationId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("should filter by status when provided", async () => {
      mockPrismaService.investigationInterview.findMany.mockResolvedValue([]);
      mockPrismaService.investigationInterview.count.mockResolvedValue(0);

      await service.findAll(mockOrganizationId, {
        status: InterviewStatus.COMPLETED,
      });

      expect(
        mockPrismaService.investigationInterview.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: InterviewStatus.COMPLETED,
          }),
        }),
      );
    });
  });

  describe("update", () => {
    it("should update interview fields", async () => {
      mockPrismaService.investigationInterview.findFirst.mockResolvedValue(
        mockInterview,
      );
      mockPrismaService.investigationInterview.update.mockResolvedValue({
        ...mockInterview,
        location: "Conference Room B",
      });

      const result = await service.update(
        mockOrganizationId,
        mockInterviewId,
        mockUserId,
        { location: "Conference Room B" },
      );

      expect(
        mockPrismaService.investigationInterview.update,
      ).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "investigation.interview.updated",
        expect.any(Object),
      );
      expect(result.location).toBe("Conference Room B");
    });
  });

  describe("start", () => {
    it("should start interview from SCHEDULED status", async () => {
      mockPrismaService.investigationInterview.findFirst.mockResolvedValue(
        mockInterview,
      );
      mockPrismaService.investigationInterview.update.mockResolvedValue({
        ...mockInterview,
        status: InterviewStatus.IN_PROGRESS,
        startedAt: new Date(),
      });

      const result = await service.start(
        mockOrganizationId,
        mockInterviewId,
        mockUserId,
      );

      expect(result.status).toBe(InterviewStatus.IN_PROGRESS);
    });

    it("should throw BadRequestException if not SCHEDULED", async () => {
      mockPrismaService.investigationInterview.findFirst.mockResolvedValue({
        ...mockInterview,
        status: InterviewStatus.IN_PROGRESS,
      });

      await expect(
        service.start(mockOrganizationId, mockInterviewId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("complete", () => {
    it("should complete interview from IN_PROGRESS status", async () => {
      const inProgressInterview = {
        ...mockInterview,
        status: InterviewStatus.IN_PROGRESS,
        startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      };
      mockPrismaService.investigationInterview.findFirst.mockResolvedValue(
        inProgressInterview,
      );
      mockPrismaService.investigationInterview.update.mockResolvedValue({
        ...inProgressInterview,
        status: InterviewStatus.COMPLETED,
        completedAt: new Date(),
        duration: 60,
      });

      const result = await service.complete(
        mockOrganizationId,
        mockInterviewId,
        mockUserId,
        "Summary of interview",
      );

      expect(result.status).toBe(InterviewStatus.COMPLETED);
    });

    it("should throw BadRequestException if not IN_PROGRESS", async () => {
      mockPrismaService.investigationInterview.findFirst.mockResolvedValue(
        mockInterview,
      ); // Status is SCHEDULED

      await expect(
        service.complete(mockOrganizationId, mockInterviewId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("cancel", () => {
    it("should cancel interview", async () => {
      mockPrismaService.investigationInterview.findFirst.mockResolvedValue(
        mockInterview,
      );
      mockPrismaService.investigationInterview.update.mockResolvedValue({
        ...mockInterview,
        status: InterviewStatus.CANCELLED,
      });

      const result = await service.cancel(
        mockOrganizationId,
        mockInterviewId,
        mockUserId,
      );

      expect(result.status).toBe(InterviewStatus.CANCELLED);
    });
  });

  describe("delete", () => {
    it("should delete interview", async () => {
      mockPrismaService.investigationInterview.findFirst.mockResolvedValue(
        mockInterview,
      );
      mockPrismaService.investigationInterview.delete.mockResolvedValue(
        mockInterview,
      );

      await service.delete(mockOrganizationId, mockInterviewId, mockUserId);

      expect(
        mockPrismaService.investigationInterview.delete,
      ).toHaveBeenCalledWith({
        where: { id: mockInterviewId },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "investigation.interview.deleted",
        expect.any(Object),
      );
    });
  });

  // Interview Templates

  describe("createTemplate", () => {
    const createTemplateDto = {
      name: "Standard Template",
      description: "Basic questions",
      questions: [{ id: "q1", text: "What happened?", required: true }],
    };

    it("should create interview template", async () => {
      mockPrismaService.interviewTemplate.create.mockResolvedValue(
        mockTemplate,
      );

      const result = await service.createTemplate(
        mockOrganizationId,
        mockUserId,
        createTemplateDto as never,
      );

      expect(mockPrismaService.interviewTemplate.create).toHaveBeenCalled();
      expect(result.name).toBe(mockTemplate.name);
    });
  });

  describe("findTemplateById", () => {
    it("should return template when found", async () => {
      mockPrismaService.interviewTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );

      const result = await service.findTemplateById(
        mockOrganizationId,
        mockTemplateId,
      );

      expect(result).toEqual(mockTemplate);
    });

    it("should throw NotFoundException when not found", async () => {
      mockPrismaService.interviewTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.findTemplateById(mockOrganizationId, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAllTemplates", () => {
    it("should return active templates", async () => {
      mockPrismaService.interviewTemplate.findMany.mockResolvedValue([
        mockTemplate,
      ]);

      const result = await service.findAllTemplates(mockOrganizationId);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.interviewTemplate.findMany).toHaveBeenCalledWith(
        {
          where: { organizationId: mockOrganizationId, isActive: true },
          orderBy: { name: "asc" },
        },
      );
    });

    it("should filter by categoryId when provided", async () => {
      mockPrismaService.interviewTemplate.findMany.mockResolvedValue([]);

      await service.findAllTemplates(mockOrganizationId, "cat-001");

      expect(mockPrismaService.interviewTemplate.findMany).toHaveBeenCalledWith(
        {
          where: {
            organizationId: mockOrganizationId,
            isActive: true,
            categoryId: "cat-001",
          },
          orderBy: { name: "asc" },
        },
      );
    });
  });

  describe("updateTemplate", () => {
    it("should update template", async () => {
      mockPrismaService.interviewTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.interviewTemplate.update.mockResolvedValue({
        ...mockTemplate,
        name: "Updated Name",
      });

      const result = await service.updateTemplate(
        mockOrganizationId,
        mockTemplateId,
        { name: "Updated Name" },
      );

      expect(result.name).toBe("Updated Name");
    });
  });

  describe("deleteTemplate", () => {
    it("should soft delete template by deactivating", async () => {
      mockPrismaService.interviewTemplate.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.interviewTemplate.update.mockResolvedValue({
        ...mockTemplate,
        isActive: false,
      });

      const result = await service.deleteTemplate(
        mockOrganizationId,
        mockTemplateId,
      );

      expect(mockPrismaService.interviewTemplate.update).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });
  });

  describe("findInterviewsByPerson", () => {
    it("should return interviews for a person", async () => {
      mockPrismaService.investigationInterview.findMany.mockResolvedValue([
        mockInterview,
      ]);

      const result = await service.findInterviewsByPerson(
        mockOrganizationId,
        mockPersonId,
      );

      expect(result).toHaveLength(1);
      expect(
        mockPrismaService.investigationInterview.findMany,
      ).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          intervieweePersonId: mockPersonId,
        },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
    });
  });
});
