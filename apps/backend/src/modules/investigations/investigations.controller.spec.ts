import { Test, TestingModule } from "@nestjs/testing";
import {
  CaseInvestigationsController,
  InvestigationsController,
} from "./investigations.controller";
import { InvestigationsService } from "./investigations.service";
import { ExcelExportService } from "../analytics/exports/excel-export.service";
import { InvestigationStatus } from "@prisma/client";
import { Response } from "express";

describe("CaseInvestigationsController", () => {
  let controller: CaseInvestigationsController;
  let investigationsService: jest.Mocked<InvestigationsService>;

  const mockOrganizationId = "org-123";
  const mockUserId = "user-456";
  const mockCaseId = "case-789";
  const mockUser = {
    id: mockUserId,
    organizationId: mockOrganizationId,
    role: "INVESTIGATOR",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  };

  const mockInvestigation = {
    id: "inv-001",
    caseId: mockCaseId,
    organizationId: mockOrganizationId,
    investigationNumber: 1,
    status: InvestigationStatus.NEW,
    assignedTo: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockInvestigationsService = {
      create: jest.fn(),
      findAllForCase: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CaseInvestigationsController],
      providers: [
        { provide: InvestigationsService, useValue: mockInvestigationsService },
      ],
    }).compile();

    controller = module.get<CaseInvestigationsController>(
      CaseInvestigationsController,
    );
    investigationsService = module.get(InvestigationsService);
  });

  describe("create", () => {
    it("should create an investigation for a case", async () => {
      const createDto = {
        investigationType: "Full",
        department: "HR",
      };
      investigationsService.create.mockResolvedValue(
        mockInvestigation as never,
      );

      const result = await controller.create(
        mockCaseId,
        createDto as never,
        mockUser as never,
        mockOrganizationId,
      );

      expect(investigationsService.create).toHaveBeenCalledWith(
        createDto,
        mockCaseId,
        mockUserId,
        mockOrganizationId,
      );
      expect(result).toEqual(mockInvestigation);
    });
  });

  describe("findAllForCase", () => {
    it("should return paginated investigations for a case", async () => {
      const query = { page: 1, limit: 20 };
      const mockResult = {
        data: [mockInvestigation],
        total: 1,
        limit: 20,
        page: 1,
      };
      investigationsService.findAllForCase.mockResolvedValue(
        mockResult as never,
      );

      const result = await controller.findAllForCase(
        mockCaseId,
        query as never,
        mockOrganizationId,
      );

      expect(investigationsService.findAllForCase).toHaveBeenCalledWith(
        mockCaseId,
        query,
        mockOrganizationId,
      );
      expect(result).toEqual(mockResult);
    });
  });
});

describe("InvestigationsController", () => {
  let controller: InvestigationsController;
  let investigationsService: jest.Mocked<InvestigationsService>;
  let excelExportService: jest.Mocked<ExcelExportService>;

  const mockOrganizationId = "org-123";
  const mockUserId = "user-456";
  const mockInvestigationId = "inv-001";
  const mockUser = {
    id: mockUserId,
    organizationId: mockOrganizationId,
    role: "INVESTIGATOR",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  };

  const mockInvestigation = {
    id: mockInvestigationId,
    caseId: "case-789",
    organizationId: mockOrganizationId,
    investigationNumber: 1,
    status: InvestigationStatus.NEW,
    assignedTo: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockInvestigationsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      assign: jest.fn(),
      transition: jest.fn(),
      recordFindings: jest.fn(),
      close: jest.fn(),
    };

    const mockExcelExportService = {
      generateBuffer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestigationsController],
      providers: [
        { provide: InvestigationsService, useValue: mockInvestigationsService },
        { provide: ExcelExportService, useValue: mockExcelExportService },
      ],
    }).compile();

    controller = module.get<InvestigationsController>(InvestigationsController);
    investigationsService = module.get(InvestigationsService);
    excelExportService = module.get(ExcelExportService);
  });

  describe("findAll", () => {
    it("should return paginated investigations", async () => {
      const query = { page: 1, limit: 25 };
      const mockResult = {
        data: [mockInvestigation],
        total: 1,
        limit: 25,
        page: 1,
        pageSize: 25,
      };
      investigationsService.findAll.mockResolvedValue(mockResult as never);

      const result = await controller.findAll(
        query as never,
        mockOrganizationId,
      );

      expect(investigationsService.findAll).toHaveBeenCalledWith(
        query,
        mockOrganizationId,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("findOne", () => {
    it("should return a single investigation", async () => {
      investigationsService.findOne.mockResolvedValue(
        mockInvestigation as never,
      );

      const result = await controller.findOne(
        mockInvestigationId,
        mockOrganizationId,
      );

      expect(investigationsService.findOne).toHaveBeenCalledWith(
        mockInvestigationId,
        mockOrganizationId,
      );
      expect(result).toEqual(mockInvestigation);
    });
  });

  describe("update", () => {
    it("should update investigation fields", async () => {
      const updateDto = { department: "Legal" };
      const updatedInvestigation = {
        ...mockInvestigation,
        department: "Legal",
      };
      investigationsService.update.mockResolvedValue(
        updatedInvestigation as never,
      );

      const result = await controller.update(
        mockInvestigationId,
        updateDto as never,
        mockUser as never,
        mockOrganizationId,
      );

      expect(investigationsService.update).toHaveBeenCalledWith(
        mockInvestigationId,
        updateDto,
        mockUserId,
        mockOrganizationId,
      );
      expect(result).toEqual(updatedInvestigation);
    });
  });

  describe("assign", () => {
    it("should assign investigators", async () => {
      const assignDto = {
        assignedTo: ["user-1"],
        primaryInvestigatorId: "user-1",
      };
      const assignedInvestigation = {
        ...mockInvestigation,
        assignedTo: ["user-1"],
        status: InvestigationStatus.ASSIGNED,
      };
      investigationsService.assign.mockResolvedValue(
        assignedInvestigation as never,
      );

      const result = await controller.assign(
        mockInvestigationId,
        assignDto as never,
        mockUser as never,
        mockOrganizationId,
      );

      expect(investigationsService.assign).toHaveBeenCalledWith(
        mockInvestigationId,
        assignDto,
        mockUserId,
        mockOrganizationId,
      );
      expect(result.assignedTo).toContain("user-1");
    });
  });

  describe("transition", () => {
    it("should transition investigation status", async () => {
      const transitionDto = {
        status: InvestigationStatus.INVESTIGATING,
        rationale: "Starting investigation",
      };
      const transitionedInvestigation = {
        ...mockInvestigation,
        status: InvestigationStatus.INVESTIGATING,
      };
      investigationsService.transition.mockResolvedValue(
        transitionedInvestigation as never,
      );

      const result = await controller.transition(
        mockInvestigationId,
        transitionDto as never,
        mockUser as never,
        mockOrganizationId,
      );

      expect(investigationsService.transition).toHaveBeenCalledWith(
        mockInvestigationId,
        transitionDto,
        mockUserId,
        mockOrganizationId,
      );
      expect(result.status).toBe(InvestigationStatus.INVESTIGATING);
    });
  });

  describe("recordFindings", () => {
    it("should record findings", async () => {
      const findingsDto = {
        findingsSummary: "Findings summary",
        outcome: "SUBSTANTIATED",
      };
      const investigationWithFindings = {
        ...mockInvestigation,
        ...findingsDto,
      };
      investigationsService.recordFindings.mockResolvedValue(
        investigationWithFindings as never,
      );

      const result = await controller.recordFindings(
        mockInvestigationId,
        findingsDto as never,
        mockUser as never,
        mockOrganizationId,
      );

      expect(investigationsService.recordFindings).toHaveBeenCalledWith(
        mockInvestigationId,
        findingsDto,
        mockUserId,
        mockOrganizationId,
      );
      expect(result.findingsSummary).toBe(findingsDto.findingsSummary);
    });
  });

  describe("close", () => {
    it("should close an investigation", async () => {
      const closeDto = {
        findingsSummary: "Investigation complete",
        outcome: "NOT_SUBSTANTIATED",
      };
      const closedInvestigation = {
        ...mockInvestigation,
        status: InvestigationStatus.CLOSED,
        ...closeDto,
      };
      investigationsService.close.mockResolvedValue(
        closedInvestigation as never,
      );

      const result = await controller.close(
        mockInvestigationId,
        closeDto as never,
        mockUser as never,
        mockOrganizationId,
      );

      expect(investigationsService.close).toHaveBeenCalledWith(
        mockInvestigationId,
        closeDto,
        mockUserId,
        mockOrganizationId,
      );
      expect(result.status).toBe(InvestigationStatus.CLOSED);
    });
  });

  describe("exportInvestigations", () => {
    it("should export investigations to Excel", async () => {
      const mockBuffer = Buffer.from("test");
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      investigationsService.findAll.mockResolvedValue({
        data: [mockInvestigation],
        total: 1,
        limit: 25,
        page: 1,
        pageSize: 25,
      } as never);
      excelExportService.generateBuffer.mockResolvedValue(mockBuffer);

      await controller.exportInvestigations(
        { format: "excel" },
        {} as never,
        mockOrganizationId,
        mockResponse,
      );

      expect(investigationsService.findAll).toHaveBeenCalled();
      expect(excelExportService.generateBuffer).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockBuffer);
    });
  });
});
