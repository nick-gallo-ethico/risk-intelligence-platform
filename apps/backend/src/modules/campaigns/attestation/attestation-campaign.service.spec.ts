import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AttestationCampaignService } from "./attestation-campaign.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CampaignsService } from "../campaigns.service";
import {
  CampaignType,
  CampaignStatus,
  AttestationType,
  AudienceMode,
  PolicyStatus,
} from "@prisma/client";

describe("AttestationCampaignService", () => {
  let service: AttestationCampaignService;
  let prisma: jest.Mocked<PrismaService>;
  let campaignsService: jest.Mocked<CampaignsService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockCampaignId = "campaign-test-123";
  const mockPolicyId = "policy-test-123";
  const mockPolicyVersionId = "policy-version-123";

  const mockPolicyVersion = {
    id: mockPolicyVersionId,
    policyId: mockPolicyId,
    organizationId: mockOrgId,
    version: 1,
    versionLabel: "v1.0",
    content: "Policy content here",
    publishedAt: new Date(),
    policy: {
      id: mockPolicyId,
      title: "Code of Conduct",
      status: PolicyStatus.PUBLISHED,
    },
  };

  const mockCampaign = {
    id: mockCampaignId,
    organizationId: mockOrgId,
    name: "Code of Conduct Attestation",
    type: CampaignType.ATTESTATION,
    status: CampaignStatus.DRAFT,
    policyId: mockPolicyId,
    policyVersionId: mockPolicyVersionId,
    attestationType: AttestationType.CHECKBOX,
    totalAssignments: 100,
    completedAssignments: 75,
  };

  const mockPrismaService = {
    policyVersion: {
      findFirst: jest.fn(),
    },
    campaign: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    campaignAssignment: {
      count: jest.fn(),
    },
  };

  const mockCampaignsService = {
    launch: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttestationCampaignService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CampaignsService, useValue: mockCampaignsService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AttestationCampaignService>(
      AttestationCampaignService,
    );
    prisma = module.get(PrismaService);
    campaignsService = module.get(CampaignsService);
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe("createFromPolicy", () => {
    const createDto = {
      policyVersionId: mockPolicyVersionId,
      dueDate: new Date("2026-03-31"),
      attestationType: AttestationType.CHECKBOX,
    };

    it("should create attestation campaign from published policy", async () => {
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.campaign.create.mockResolvedValue(mockCampaign);

      const result = await service.createFromPolicy(
        createDto,
        mockUserId,
        mockOrgId,
      );

      expect(result).toEqual(mockCampaign);
      expect(prisma.campaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId,
          type: CampaignType.ATTESTATION,
          policyId: mockPolicyId,
          policyVersionId: mockPolicyVersionId,
          attestationType: AttestationType.CHECKBOX,
        }),
      });
    });

    it("should throw NotFoundException when policy version not found", async () => {
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(null);

      await expect(
        service.createFromPolicy(createDto, mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for unpublished policy", async () => {
      mockPrismaService.policyVersion.findFirst.mockResolvedValue({
        ...mockPolicyVersion,
        policy: {
          ...mockPolicyVersion.policy,
          status: PolicyStatus.DRAFT,
        },
      });

      await expect(
        service.createFromPolicy(createDto, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for QUIZ type without quizConfig", async () => {
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );

      const quizDto = {
        ...createDto,
        attestationType: AttestationType.QUIZ,
        quizConfig: undefined,
      };

      await expect(
        service.createFromPolicy(quizDto, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should emit event on campaign creation", async () => {
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.campaign.create.mockResolvedValue(mockCampaign);

      await service.createFromPolicy(createDto, mockUserId, mockOrgId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "policy.attestation.campaign.created",
        expect.objectContaining({
          campaignId: mockCampaignId,
          policyId: mockPolicyId,
        }),
      );
    });

    it("should use default audience mode ALL when not specified", async () => {
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.campaign.create.mockResolvedValue(mockCampaign);

      await service.createFromPolicy(createDto, mockUserId, mockOrgId);

      expect(prisma.campaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          audienceMode: AudienceMode.ALL,
        }),
      });
    });
  });

  describe("createFromPublish", () => {
    it("should return null when no configuration provided", async () => {
      const result = await service.createFromPublish(
        mockPolicyVersionId,
        null,
        mockUserId,
        mockOrgId,
      );

      expect(result).toBeNull();
      expect(prisma.policyVersion.findFirst).not.toHaveBeenCalled();
    });

    it("should return null when empty configuration provided", async () => {
      const result = await service.createFromPublish(
        mockPolicyVersionId,
        {},
        mockUserId,
        mockOrgId,
      );

      expect(result).toBeNull();
    });

    it("should create campaign when configuration provided", async () => {
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.campaign.create.mockResolvedValue(mockCampaign);

      const result = await service.createFromPublish(
        mockPolicyVersionId,
        { attestationType: AttestationType.SIGNATURE },
        mockUserId,
        mockOrgId,
      );

      expect(result).toEqual(mockCampaign);
    });

    it("should set default 30 day due date when not provided", async () => {
      mockPrismaService.policyVersion.findFirst.mockResolvedValue(
        mockPolicyVersion,
      );
      mockPrismaService.campaign.create.mockResolvedValue(mockCampaign);

      await service.createFromPublish(
        mockPolicyVersionId,
        { attestationType: AttestationType.CHECKBOX },
        mockUserId,
        mockOrgId,
      );

      expect(prisma.campaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dueDate: expect.any(Date),
        }),
      });
    });
  });

  describe("getPolicyCampaigns", () => {
    it("should return attestation campaigns for policy", async () => {
      const campaignWithStats = {
        ...mockCampaign,
        _count: { assignments: 100 },
        policyVersion: {
          id: mockPolicyVersionId,
          version: 1,
          versionLabel: "v1.0",
          publishedAt: new Date(),
        },
      };
      mockPrismaService.campaign.findMany.mockResolvedValue([
        campaignWithStats,
      ]);

      const result = await service.getPolicyCampaigns(mockPolicyId, mockOrgId);

      expect(result).toHaveLength(1);
      expect(result[0].completionRate).toBe(75);
      expect(prisma.campaign.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrgId,
          policyId: mockPolicyId,
          type: CampaignType.ATTESTATION,
        },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
    });

    it("should calculate completion rate correctly", async () => {
      const campaignWithStats = {
        ...mockCampaign,
        totalAssignments: 200,
        completedAssignments: 50,
        _count: { assignments: 200 },
        policyVersion: {},
      };
      mockPrismaService.campaign.findMany.mockResolvedValue([
        campaignWithStats,
      ]);

      const result = await service.getPolicyCampaigns(mockPolicyId, mockOrgId);

      expect(result[0].completionRate).toBe(25);
    });

    it("should handle zero assignments", async () => {
      const campaignWithStats = {
        ...mockCampaign,
        totalAssignments: 0,
        completedAssignments: 0,
        _count: { assignments: 0 },
        policyVersion: {},
      };
      mockPrismaService.campaign.findMany.mockResolvedValue([
        campaignWithStats,
      ]);

      const result = await service.getPolicyCampaigns(mockPolicyId, mockOrgId);

      expect(result[0].completionRate).toBe(0);
    });
  });

  describe("getCampaignById", () => {
    it("should return campaign with policy details", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        policy: {
          id: mockPolicyId,
          title: "Code of Conduct",
          slug: "code-of-conduct",
          policyType: "COMPLIANCE",
        },
        policyVersion: mockPolicyVersion,
        _count: { assignments: 100 },
      });

      const result = await service.getCampaignById(mockCampaignId, mockOrgId);

      expect(result.id).toBe(mockCampaignId);
      expect(prisma.campaign.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockCampaignId,
          organizationId: mockOrgId,
          type: CampaignType.ATTESTATION,
        },
        include: expect.any(Object),
      });
    });

    it("should throw NotFoundException when campaign not found", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.getCampaignById("nonexistent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("launchCampaign", () => {
    it("should delegate to CampaignsService", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        type: CampaignType.ATTESTATION,
      });
      mockCampaignsService.launch.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.ACTIVE,
      });

      const result = await service.launchCampaign(
        mockCampaignId,
        mockUserId,
        mockOrgId,
      );

      expect(result.status).toBe(CampaignStatus.ACTIVE);
      expect(campaignsService.launch).toHaveBeenCalledWith(
        mockCampaignId,
        {},
        mockUserId,
        mockOrgId,
      );
    });

    it("should throw BadRequestException for non-attestation campaign", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        type: CampaignType.DISCLOSURE,
      });

      await expect(
        service.launchCampaign(mockCampaignId, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getCampaignStatistics", () => {
    it("should return attestation-specific statistics", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrismaService.campaignAssignment.count.mockResolvedValueOnce(100); // total
      mockPrismaService.campaignAssignment.count.mockResolvedValueOnce(75); // completed
      mockPrismaService.campaignAssignment.count.mockResolvedValueOnce(5); // refused
      mockPrismaService.campaignAssignment.count.mockResolvedValueOnce(10); // overdue

      const result = await service.getCampaignStatistics(
        mockCampaignId,
        mockOrgId,
      );

      expect(result.total).toBe(100);
      expect(result.completed).toBe(75);
      expect(result.refused).toBe(5);
      expect(result.overdue).toBe(10);
      expect(result.pending).toBe(20); // 100 - 75 - 5
      expect(result.completionPercentage).toBe(75);
      expect(result.refusalRate).toBe(5);
    });

    it("should handle zero total assignments", async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrismaService.campaignAssignment.count.mockResolvedValue(0);

      const result = await service.getCampaignStatistics(
        mockCampaignId,
        mockOrgId,
      );

      expect(result.completionPercentage).toBe(0);
      expect(result.refusalRate).toBe(0);
    });
  });
});
