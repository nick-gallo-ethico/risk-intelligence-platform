import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { SegmentService } from "./segment.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { SegmentQueryBuilder } from "./segment-query.builder";
import {
  SegmentLogic,
  SegmentOperator,
  SegmentField,
} from "../dto/segment-criteria.dto";

describe("SegmentService", () => {
  let service: SegmentService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;
  let queryBuilder: jest.Mocked<SegmentQueryBuilder>;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockSegmentId = "segment-test-123";

  const mockCriteria = {
    logic: SegmentLogic.AND,
    conditions: [
      {
        field: SegmentField.DEPARTMENT_ID,
        operator: SegmentOperator.IN,
        value: ["dept-1", "dept-2"],
      },
    ],
  };

  const mockSegment = {
    id: mockSegmentId,
    organizationId: mockOrgId,
    name: "Engineering Team",
    description: "All engineering employees",
    criteria: mockCriteria,
    isActive: true,
    estimatedAudienceSize: 50,
    audienceSizeUpdatedAt: new Date(),
    createdById: mockUserId,
    updatedById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEmployee = {
    id: "emp-1",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    jobTitle: "Engineer",
  };

  const mockPrismaService = {
    segment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    campaign: {
      count: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockQueryBuilder = {
    validateCriteria: jest.fn(),
    buildWhereClause: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SegmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: SegmentQueryBuilder, useValue: mockQueryBuilder },
      ],
    }).compile();

    service = module.get<SegmentService>(SegmentService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
    queryBuilder = module.get(SegmentQueryBuilder);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a segment with valid criteria", async () => {
      const createDto = {
        name: "Engineering Team",
        description: "All engineering employees",
        criteria: mockCriteria,
      };

      mockQueryBuilder.validateCriteria.mockReturnValue([]);
      mockQueryBuilder.buildWhereClause.mockReturnValue({
        organizationId: mockOrgId,
      });
      mockPrismaService.employee.count.mockResolvedValue(50);
      mockPrismaService.employee.findMany.mockResolvedValue([mockEmployee]);
      mockPrismaService.segment.create.mockResolvedValue(mockSegment);

      const result = await service.create(createDto, mockUserId, mockOrgId);

      expect(result).toEqual(mockSegment);
      expect(prisma.segment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId,
          name: createDto.name,
          criteria: mockCriteria,
          createdById: mockUserId,
        }),
      });
      expect(auditService.log).toHaveBeenCalled();
    });

    it("should throw BadRequestException for invalid criteria", async () => {
      const createDto = {
        name: "Invalid Segment",
        criteria: mockCriteria,
      };

      mockQueryBuilder.validateCriteria.mockReturnValue([
        "Invalid field: unknown",
      ]);

      await expect(
        service.create(createDto, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should calculate initial audience size", async () => {
      const createDto = {
        name: "Engineering Team",
        criteria: mockCriteria,
      };

      mockQueryBuilder.validateCriteria.mockReturnValue([]);
      mockQueryBuilder.buildWhereClause.mockReturnValue({});
      mockPrismaService.employee.count.mockResolvedValue(100);
      mockPrismaService.employee.findMany.mockResolvedValue([]);
      mockPrismaService.segment.create.mockResolvedValue({
        ...mockSegment,
        estimatedAudienceSize: 100,
      });

      const result = await service.create(createDto, mockUserId, mockOrgId);

      expect(result.estimatedAudienceSize).toBe(100);
    });
  });

  describe("findAll", () => {
    it("should return paginated segments", async () => {
      mockPrismaService.segment.findMany.mockResolvedValue([mockSegment]);
      mockPrismaService.segment.count.mockResolvedValue(1);

      const result = await service.findAll(mockOrgId, { skip: 0, take: 10 });

      expect(result.segments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.segment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: mockOrgId },
        }),
      );
    });

    it("should filter active only when requested", async () => {
      mockPrismaService.segment.findMany.mockResolvedValue([]);
      mockPrismaService.segment.count.mockResolvedValue(0);

      await service.findAll(mockOrgId, { activeOnly: true });

      expect(prisma.segment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: mockOrgId, isActive: true },
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return segment by ID", async () => {
      mockPrismaService.segment.findFirst.mockResolvedValue(mockSegment);

      const result = await service.findOne(mockSegmentId, mockOrgId);

      expect(result).toEqual(mockSegment);
      expect(prisma.segment.findFirst).toHaveBeenCalledWith({
        where: { id: mockSegmentId, organizationId: mockOrgId },
      });
    });

    it("should throw NotFoundException when segment not found", async () => {
      mockPrismaService.segment.findFirst.mockResolvedValue(null);

      await expect(service.findOne("nonexistent", mockOrgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update segment fields", async () => {
      const updateDto = { name: "Updated Name" };

      mockPrismaService.segment.findFirst.mockResolvedValue(mockSegment);
      mockPrismaService.segment.update.mockResolvedValue({
        ...mockSegment,
        name: "Updated Name",
      });

      const result = await service.update(
        mockSegmentId,
        updateDto,
        mockUserId,
        mockOrgId,
      );

      expect(result.name).toBe("Updated Name");
      expect(auditService.log).toHaveBeenCalled();
    });

    it("should validate and recalculate audience when criteria updated", async () => {
      const updateDto = {
        criteria: {
          logic: SegmentLogic.OR,
          conditions: [],
        },
      };

      mockPrismaService.segment.findFirst.mockResolvedValue(mockSegment);
      mockQueryBuilder.validateCriteria.mockReturnValue([]);
      mockQueryBuilder.buildWhereClause.mockReturnValue({});
      mockPrismaService.employee.count.mockResolvedValue(75);
      mockPrismaService.employee.findMany.mockResolvedValue([]);
      mockPrismaService.segment.update.mockResolvedValue({
        ...mockSegment,
        estimatedAudienceSize: 75,
      });

      const result = await service.update(
        mockSegmentId,
        updateDto,
        mockUserId,
        mockOrgId,
      );

      expect(result.estimatedAudienceSize).toBe(75);
    });

    it("should throw BadRequestException for invalid criteria", async () => {
      const updateDto = {
        criteria: mockCriteria,
      };

      mockPrismaService.segment.findFirst.mockResolvedValue(mockSegment);
      mockQueryBuilder.validateCriteria.mockReturnValue(["Invalid operator"]);

      await expect(
        service.update(mockSegmentId, updateDto, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should hard delete segment not used by campaigns", async () => {
      mockPrismaService.segment.findFirst.mockResolvedValue(mockSegment);
      mockPrismaService.campaign.count.mockResolvedValue(0);
      mockPrismaService.segment.delete.mockResolvedValue(mockSegment);

      await service.remove(mockSegmentId, mockUserId, mockOrgId);

      expect(prisma.segment.delete).toHaveBeenCalledWith({
        where: { id: mockSegmentId },
      });
    });

    it("should soft delete segment used by campaigns", async () => {
      mockPrismaService.segment.findFirst.mockResolvedValue(mockSegment);
      mockPrismaService.campaign.count.mockResolvedValue(5);
      mockPrismaService.segment.update.mockResolvedValue({
        ...mockSegment,
        isActive: false,
      });

      await service.remove(mockSegmentId, mockUserId, mockOrgId);

      expect(prisma.segment.update).toHaveBeenCalledWith({
        where: { id: mockSegmentId },
        data: { isActive: false, updatedById: mockUserId },
      });
      expect(prisma.segment.delete).not.toHaveBeenCalled();
    });

    it("should log appropriate audit event", async () => {
      mockPrismaService.segment.findFirst.mockResolvedValue(mockSegment);
      mockPrismaService.campaign.count.mockResolvedValue(0);
      mockPrismaService.segment.delete.mockResolvedValue(mockSegment);

      await service.remove(mockSegmentId, mockUserId, mockOrgId);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "deleted",
        }),
      );
    });
  });

  describe("previewAudience", () => {
    it("should return count and sample employees", async () => {
      mockQueryBuilder.buildWhereClause.mockReturnValue({
        organizationId: mockOrgId,
      });
      mockPrismaService.employee.count.mockResolvedValue(50);
      mockPrismaService.employee.findMany.mockResolvedValue([mockEmployee]);

      const result = await service.previewAudience(mockCriteria, mockOrgId);

      expect(result.totalCount).toBe(50);
      expect(result.sampleEmployees).toHaveLength(1);
    });

    it("should respect sample size parameter", async () => {
      mockQueryBuilder.buildWhereClause.mockReturnValue({});
      mockPrismaService.employee.count.mockResolvedValue(100);
      mockPrismaService.employee.findMany.mockResolvedValue([]);

      await service.previewAudience(mockCriteria, mockOrgId, 5);

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe("evaluateSegment", () => {
    it("should return matching employee IDs", async () => {
      mockPrismaService.segment.findFirst.mockResolvedValue(mockSegment);
      mockQueryBuilder.buildWhereClause.mockReturnValue({});
      mockPrismaService.employee.findMany.mockResolvedValue([
        { id: "emp-1" },
        { id: "emp-2" },
        { id: "emp-3" },
      ]);
      mockPrismaService.segment.update.mockResolvedValue(mockSegment);

      const result = await service.evaluateSegment(mockSegmentId, mockOrgId);

      expect(result).toEqual(["emp-1", "emp-2", "emp-3"]);
    });

    it("should update cached audience size", async () => {
      mockPrismaService.segment.findFirst.mockResolvedValue(mockSegment);
      mockQueryBuilder.buildWhereClause.mockReturnValue({});
      mockPrismaService.employee.findMany.mockResolvedValue([
        { id: "emp-1" },
        { id: "emp-2" },
      ]);
      mockPrismaService.segment.update.mockResolvedValue(mockSegment);

      await service.evaluateSegment(mockSegmentId, mockOrgId);

      expect(prisma.segment.update).toHaveBeenCalledWith({
        where: { id: mockSegmentId },
        data: {
          estimatedAudienceSize: 2,
          audienceSizeUpdatedAt: expect.any(Date),
        },
      });
    });
  });

  describe("refreshAudienceSize", () => {
    it("should update cached audience size", async () => {
      mockPrismaService.segment.findFirst.mockResolvedValue(mockSegment);
      mockQueryBuilder.buildWhereClause.mockReturnValue({});
      mockPrismaService.employee.count.mockResolvedValue(100);
      mockPrismaService.segment.update.mockResolvedValue(mockSegment);

      const result = await service.refreshAudienceSize(
        mockSegmentId,
        mockOrgId,
      );

      expect(result).toBe(100);
      expect(prisma.segment.update).toHaveBeenCalled();
    });
  });

  describe("getSegmentEmployees", () => {
    it("should return paginated employees matching segment", async () => {
      mockPrismaService.segment.findFirst.mockResolvedValue(mockSegment);
      mockQueryBuilder.buildWhereClause.mockReturnValue({});
      mockPrismaService.employee.findMany.mockResolvedValue([mockEmployee]);
      mockPrismaService.employee.count.mockResolvedValue(1);

      const result = await service.getSegmentEmployees(
        mockSegmentId,
        mockOrgId,
        { skip: 0, take: 20 },
      );

      expect(result.employees).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
