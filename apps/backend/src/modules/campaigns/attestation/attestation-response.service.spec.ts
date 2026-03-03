import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AttestationResponseService } from "./attestation-response.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RiusService } from "../../rius/rius.service";
import { CasesService } from "../../cases/cases.service";
import { CampaignAssignmentService } from "../assignments/campaign-assignment.service";
import {
  CampaignType,
  AttestationType,
  AssignmentStatus,
  RiuType,
  Severity,
} from "@prisma/client";

describe("AttestationResponseService", () => {
  let service: AttestationResponseService;
  let prisma: jest.Mocked<PrismaService>;
  let riusService: jest.Mocked<RiusService>;
  let casesService: jest.Mocked<CasesService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockEmployeeId = "employee-test-123";
  const mockAssignmentId = "assignment-test-123";
  const mockCampaignId = "campaign-test-123";
  const mockPolicyId = "policy-test-123";

  const mockEmployee = {
    id: mockEmployeeId,
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
  };

  const mockCampaign = {
    id: mockCampaignId,
    name: "Code of Conduct Attestation",
    type: CampaignType.ATTESTATION,
    attestationType: AttestationType.CHECKBOX,
    policy: {
      id: mockPolicyId,
      title: "Code of Conduct",
    },
    policyVersion: {
      id: "version-123",
      content: "Policy content here",
    },
    quizConfig: null,
    forceScroll: false,
    autoCreateCaseOnRefusal: false,
  };

  const mockAssignment = {
    id: mockAssignmentId,
    organizationId: mockOrgId,
    campaignId: mockCampaignId,
    employeeId: mockEmployeeId,
    status: AssignmentStatus.PENDING,
    attestedAt: null,
    refusedAt: null,
    quizAttempts: 0,
    quizScore: null,
    campaign: mockCampaign,
    employee: mockEmployee,
  };

  const mockRiu = {
    id: "riu-test-123",
    referenceNumber: "RIU-2026-001",
    type: RiuType.ATTESTATION_RESPONSE,
  };

  const mockPrismaService = {
    campaignAssignment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    campaign: {
      update: jest.fn(),
    },
  };

  const mockRiusService = {
    create: jest.fn(),
  };

  const mockCasesService = {
    create: jest.fn(),
  };

  const mockAssignmentService = {
    completeAssignment: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttestationResponseService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RiusService, useValue: mockRiusService },
        { provide: CasesService, useValue: mockCasesService },
        { provide: CampaignAssignmentService, useValue: mockAssignmentService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AttestationResponseService>(
      AttestationResponseService,
    );
    prisma = module.get(PrismaService);
    riusService = module.get(RiusService);
    casesService = module.get(CasesService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe("submitAttestation", () => {
    it("should submit checkbox attestation successfully", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(
        mockAssignment,
      );
      mockRiusService.create.mockResolvedValue(mockRiu);
      mockPrismaService.campaignAssignment.update.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.COMPLETED,
        attestedAt: new Date(),
      });
      mockPrismaService.campaignAssignment.count.mockResolvedValue(1);

      const result = await service.submitAttestation(
        { assignmentId: mockAssignmentId, acknowledged: true },
        mockEmployeeId,
        mockOrgId,
        mockUserId,
      );

      expect(result.assignment.status).toBe(AssignmentStatus.COMPLETED);
      expect(result.riu?.id).toBe(mockRiu.id);
      expect(riusService.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "attestation.submitted",
        expect.any(Object),
      );
    });

    it("should throw NotFoundException when assignment not found", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.submitAttestation(
          { assignmentId: "nonexistent", acknowledged: true },
          mockEmployeeId,
          mockOrgId,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when assignment belongs to different employee", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue({
        ...mockAssignment,
        employeeId: "different-employee",
      });

      await expect(
        service.submitAttestation(
          { assignmentId: mockAssignmentId, acknowledged: true },
          mockEmployeeId,
          mockOrgId,
          mockUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException for non-attestation campaign", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue({
        ...mockAssignment,
        campaign: { ...mockCampaign, type: CampaignType.DISCLOSURE },
      });

      await expect(
        service.submitAttestation(
          { assignmentId: mockAssignmentId, acknowledged: true },
          mockEmployeeId,
          mockOrgId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when already completed", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.COMPLETED,
        attestedAt: new Date(),
      });

      await expect(
        service.submitAttestation(
          { assignmentId: mockAssignmentId, acknowledged: true },
          mockEmployeeId,
          mockOrgId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when checkbox not acknowledged", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(
        mockAssignment,
      );

      await expect(
        service.submitAttestation(
          { assignmentId: mockAssignmentId, acknowledged: false },
          mockEmployeeId,
          mockOrgId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should require signature for signature attestation", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue({
        ...mockAssignment,
        campaign: {
          ...mockCampaign,
          attestationType: AttestationType.SIGNATURE,
        },
      });

      await expect(
        service.submitAttestation(
          { assignmentId: mockAssignmentId, acknowledged: true },
          mockEmployeeId,
          mockOrgId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should submit signature attestation successfully", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue({
        ...mockAssignment,
        campaign: {
          ...mockCampaign,
          attestationType: AttestationType.SIGNATURE,
        },
      });
      mockRiusService.create.mockResolvedValue(mockRiu);
      mockPrismaService.campaignAssignment.update.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.COMPLETED,
        attestedAt: new Date(),
      });
      mockPrismaService.campaignAssignment.count.mockResolvedValue(1);

      const result = await service.submitAttestation(
        {
          assignmentId: mockAssignmentId,
          acknowledged: true,
          signatureData: "data:image/png;base64,signature",
        },
        mockEmployeeId,
        mockOrgId,
        mockUserId,
      );

      expect(result.assignment.status).toBe(AssignmentStatus.COMPLETED);
    });

    it("should handle refusal with case creation", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue({
        ...mockAssignment,
        campaign: {
          ...mockCampaign,
          autoCreateCaseOnRefusal: true,
        },
      });
      mockRiusService.create.mockResolvedValue(mockRiu);
      mockPrismaService.campaignAssignment.update.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.COMPLETED,
        refusedAt: new Date(),
      });
      mockCasesService.create.mockResolvedValue({
        id: "case-123",
        referenceNumber: "CASE-2026-001",
      });
      mockPrismaService.campaignAssignment.count.mockResolvedValue(1);

      const result = await service.submitAttestation(
        {
          assignmentId: mockAssignmentId,
          refused: true,
          refusalReason: "Policy conflict",
        },
        mockEmployeeId,
        mockOrgId,
        mockUserId,
      );

      expect(result.case).toBeDefined();
      expect(result.case?.referenceNumber).toBe("CASE-2026-001");
      expect(casesService.create).toHaveBeenCalled();
    });

    it("should handle refusal without case creation", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue({
        ...mockAssignment,
        campaign: {
          ...mockCampaign,
          autoCreateCaseOnRefusal: false,
        },
      });
      mockRiusService.create.mockResolvedValue(mockRiu);
      mockPrismaService.campaignAssignment.update.mockResolvedValue({
        ...mockAssignment,
        status: AssignmentStatus.COMPLETED,
        refusedAt: new Date(),
      });
      mockPrismaService.campaignAssignment.count.mockResolvedValue(1);

      const result = await service.submitAttestation(
        {
          assignmentId: mockAssignmentId,
          refused: true,
          refusalReason: "Policy conflict",
        },
        mockEmployeeId,
        mockOrgId,
        mockUserId,
      );

      expect(result.case).toBeUndefined();
      expect(casesService.create).not.toHaveBeenCalled();
    });
  });

  describe("scoreQuiz", () => {
    const quizConfig = {
      questions: [
        {
          id: "q1",
          text: "Question 1",
          options: [
            { id: "a", text: "Option A" },
            { id: "b", text: "Option B" },
          ],
          correctOptionId: "a",
          explanation: "A is correct",
        },
        {
          id: "q2",
          text: "Question 2",
          options: [
            { id: "c", text: "Option C" },
            { id: "d", text: "Option D" },
          ],
          correctOptionId: "d",
          explanation: "D is correct",
        },
      ],
      passingScore: 50,
      maxAttempts: 3,
    };

    it("should score quiz correctly with all correct answers", () => {
      const answers = [
        { questionId: "q1", answerId: "a" },
        { questionId: "q2", answerId: "d" },
      ];

      const result = service.scoreQuiz(quizConfig, answers);

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.correctAnswers).toBe(2);
      expect(result.totalQuestions).toBe(2);
    });

    it("should score quiz correctly with some wrong answers", () => {
      const answers = [
        { questionId: "q1", answerId: "b" }, // wrong
        { questionId: "q2", answerId: "d" }, // correct
      ];

      const result = service.scoreQuiz(quizConfig, answers);

      expect(result.score).toBe(50);
      expect(result.passed).toBe(true); // 50% passes with passingScore 50
      expect(result.correctAnswers).toBe(1);
    });

    it("should fail quiz below passing score", () => {
      const answers = [
        { questionId: "q1", answerId: "b" }, // wrong
        { questionId: "q2", answerId: "c" }, // wrong
      ];

      const result = service.scoreQuiz(quizConfig, answers);

      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.correctAnswers).toBe(0);
    });

    it("should handle missing answers", () => {
      const answers = [
        { questionId: "q1", answerId: "a" },
        // q2 not answered
      ];

      const result = service.scoreQuiz(quizConfig, answers);

      expect(result.score).toBe(50);
      expect(result.results[1].isCorrect).toBe(false);
    });
  });

  describe("getAttestationHistory", () => {
    it("should return paginated attestation history", async () => {
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([
        mockAssignment,
      ]);
      mockPrismaService.campaignAssignment.count.mockResolvedValue(1);

      const result = await service.getAttestationHistory(
        mockEmployeeId,
        mockOrgId,
        { skip: 0, take: 10 },
      );

      expect(result.assignments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.campaignAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employeeId: mockEmployeeId,
            organizationId: mockOrgId,
          }),
        }),
      );
    });
  });

  describe("getPendingAttestations", () => {
    it("should return pending attestations for employee", async () => {
      mockPrismaService.campaignAssignment.findMany.mockResolvedValue([
        mockAssignment,
      ]);

      const result = await service.getPendingAttestations(
        mockEmployeeId,
        mockOrgId,
      );

      expect(result).toHaveLength(1);
      expect(prisma.campaignAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employeeId: mockEmployeeId,
            attestedAt: null,
            refusedAt: null,
          }),
        }),
      );
    });
  });

  describe("getAssignmentForAttestation", () => {
    it("should return assignment with policy and campaign details", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(
        mockAssignment,
      );

      const result = await service.getAssignmentForAttestation(
        mockAssignmentId,
        mockEmployeeId,
        mockOrgId,
      );

      expect(result.assignment).toBeDefined();
      expect(result.policy.title).toBe("Code of Conduct");
      expect(result.campaign.attestationType).toBe(AttestationType.CHECKBOX);
    });

    it("should throw NotFoundException when assignment not found", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.getAssignmentForAttestation(
          "nonexistent",
          mockEmployeeId,
          mockOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for non-attestation assignment", async () => {
      mockPrismaService.campaignAssignment.findFirst.mockResolvedValue({
        ...mockAssignment,
        campaign: { ...mockCampaign, type: CampaignType.DISCLOSURE },
      });

      await expect(
        service.getAssignmentForAttestation(
          mockAssignmentId,
          mockEmployeeId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
