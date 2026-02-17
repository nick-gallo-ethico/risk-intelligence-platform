import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CaseQueryService } from "./case-query.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CaseStatus,
  SourceChannel,
  CaseType,
  Severity,
  ReporterType,
} from "@prisma/client";

describe("CaseQueryService", () => {
  let service: CaseQueryService;
  let prisma: jest.Mocked<PrismaService>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockCaseId = "case-test-123";
  const mockReferenceNumber = "ETH-2026-00001";

  const mockCase = {
    id: mockCaseId,
    referenceNumber: mockReferenceNumber,
    organizationId: mockOrgId,
    status: CaseStatus.OPEN,
    sourceChannel: SourceChannel.WEB_FORM,
    caseType: CaseType.REPORT,
    details: "Test case details",
    summary: "Test summary",
    reporterType: ReporterType.ANONYMOUS,
    severity: Severity.MEDIUM,
    primaryCategoryId: "cat-001",
    secondaryCategoryId: null,
    createdById: mockUserId,
    updatedById: mockUserId,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
    createdBy: {
      id: mockUserId,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
    },
  };

  // Mock Setup
  const mockPrismaService = {
    case: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseQueryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CaseQueryService>(CaseQueryService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated list of cases", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([mockCase]);
      mockPrismaService.case.count.mockResolvedValue(1);

      // Act
      const result = await service.findAll({ limit: 20, offset: 0 }, mockOrgId);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("should include organizationId in where clause", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({}, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        }),
      );
    });

    it("should apply status filter", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({ status: CaseStatus.OPEN }, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CaseStatus.OPEN,
          }),
        }),
      );
    });

    it("should apply severity filter", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({ severity: Severity.HIGH }, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            severity: Severity.HIGH,
          }),
        }),
      );
    });

    it("should apply sourceChannel filter", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll(
        { sourceChannel: SourceChannel.HOTLINE },
        mockOrgId,
      );

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sourceChannel: SourceChannel.HOTLINE,
          }),
        }),
      );
    });

    it("should apply caseType filter", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({ caseType: CaseType.RFI }, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            caseType: CaseType.RFI,
          }),
        }),
      );
    });

    it("should apply date range filter", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);
      const createdAfter = "2026-01-01";
      const createdBefore = "2026-01-31";

      // Act
      await service.findAll({ createdAfter, createdBefore }, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it("should apply createdById filter", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({ createdById: mockUserId }, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdById: mockUserId,
          }),
        }),
      );
    });

    it("should apply pagination with limit and offset", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({ limit: 10, offset: 20 }, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it("should use default pagination values", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({}, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        }),
      );
    });

    it("should apply sorting", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll(
        { sortBy: "severity", sortOrder: "asc" },
        mockOrgId,
      );

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { severity: "asc" },
        }),
      );
    });

    it("should use default sorting by createdAt desc", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({}, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("should include createdBy and primaryCategory relations", async () => {
      // Arrange
      mockPrismaService.case.findMany.mockResolvedValue([]);
      mockPrismaService.case.count.mockResolvedValue(0);

      // Act
      await service.findAll({}, mockOrgId);

      // Assert
      expect(prisma.case.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            createdBy: expect.any(Object),
            primaryCategory: expect.any(Object),
          }),
        }),
      );
    });

    it("should delegate to full-text search when search query provided", async () => {
      // Arrange - Mock findAllWithFullTextSearch behavior
      const searchResult = { data: [mockCase], total: 1, limit: 20, offset: 0 };
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([mockCase]);
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([
        { total: BigInt(1) },
      ]);

      // Act
      const result = await service.findAll({ search: "harassment" }, mockOrgId);

      // Assert
      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });
  });

  describe("findOne", () => {
    it("should return case by id", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);

      // Act
      const result = await service.findOne(mockCaseId, mockOrgId);

      // Assert
      expect(result).toEqual(mockCase);
    });

    it("should include organizationId in query for tenant isolation", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);

      // Act
      await service.findOne(mockCaseId, mockOrgId);

      // Assert
      expect(prisma.case.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: mockCaseId,
            organizationId: mockOrgId,
          },
        }),
      );
    });

    it("should throw NotFoundException when case not found", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne("non-existent", mockOrgId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne("non-existent", mockOrgId)).rejects.toThrow(
        "Case with ID non-existent not found",
      );
    });

    it("should throw NotFoundException for case in different org", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne(mockCaseId, "different-org"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should include user relations", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);

      // Act
      await service.findOne(mockCaseId, mockOrgId);

      // Assert
      expect(prisma.case.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            createdBy: expect.any(Object),
            updatedBy: expect.any(Object),
            intakeOperator: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe("findByReferenceNumber", () => {
    it("should return case by reference number", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);

      // Act
      const result = await service.findByReferenceNumber(
        mockReferenceNumber,
        mockOrgId,
      );

      // Assert
      expect(result).toEqual(mockCase);
    });

    it("should include organizationId in query", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);

      // Act
      await service.findByReferenceNumber(mockReferenceNumber, mockOrgId);

      // Assert
      expect(prisma.case.findFirst).toHaveBeenCalledWith({
        where: {
          referenceNumber: mockReferenceNumber,
          organizationId: mockOrgId,
        },
      });
    });

    it("should throw NotFoundException when case not found", async () => {
      // Arrange
      mockPrismaService.case.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findByReferenceNumber("ETH-2026-99999", mockOrgId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findByReferenceNumber("ETH-2026-99999", mockOrgId),
      ).rejects.toThrow("Case ETH-2026-99999 not found");
    });
  });

  describe("findAllWithFullTextSearch", () => {
    it("should use PostgreSQL full-text search", async () => {
      // Arrange
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([mockCase]);
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([
        { total: BigInt(1) },
      ]);

      // Act
      const result = await service.findAllWithFullTextSearch(
        { search: "harassment" },
        mockOrgId,
      );

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should include organization filter in raw query", async () => {
      // Arrange
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([]);
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([
        { total: BigInt(0) },
      ]);

      // Act
      await service.findAllWithFullTextSearch({ search: "test" }, mockOrgId);

      // Assert
      const dataCall = mockPrismaService.$queryRawUnsafe.mock.calls[0];
      expect(dataCall[0]).toContain("organization_id = $1");
      expect(dataCall[1]).toBe(mockOrgId);
    });

    it("should convert search words to tsquery format with prefix matching", async () => {
      // Arrange
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([]);
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([
        { total: BigInt(0) },
      ]);

      // Act
      await service.findAllWithFullTextSearch(
        { search: "policy violation" },
        mockOrgId,
      );

      // Assert
      const dataCall = mockPrismaService.$queryRawUnsafe.mock.calls[0];
      // Check that query params include the tsquery with prefix matching
      expect(dataCall).toContain("policy:* & violation:*");
    });

    it("should return empty results for empty search words", async () => {
      // Act
      const result = await service.findAllWithFullTextSearch(
        { search: "   " },
        mockOrgId,
      );

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should apply additional filters along with search", async () => {
      // Arrange
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([]);
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([
        { total: BigInt(0) },
      ]);

      // Act
      await service.findAllWithFullTextSearch(
        { search: "test", status: CaseStatus.OPEN },
        mockOrgId,
      );

      // Assert
      const dataCall = mockPrismaService.$queryRawUnsafe.mock.calls[0];
      expect(dataCall[0]).toContain("c.status = $");
    });

    it("should order by search rank", async () => {
      // Arrange
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([]);
      mockPrismaService.$queryRawUnsafe.mockResolvedValueOnce([
        { total: BigInt(0) },
      ]);

      // Act
      await service.findAllWithFullTextSearch({ search: "test" }, mockOrgId);

      // Assert
      const dataCall = mockPrismaService.$queryRawUnsafe.mock.calls[0];
      expect(dataCall[0]).toContain("ORDER BY search_rank DESC");
    });
  });

  describe("buildWhereClause", () => {
    it("should always include organizationId", () => {
      // Act
      const where = service.buildWhereClause({}, mockOrgId);

      // Assert
      expect(where.organizationId).toBe(mockOrgId);
    });

    it("should parse JSON filters", () => {
      // Arrange
      const filters = JSON.stringify([
        { propertyId: "status", operator: "is", value: "OPEN" },
      ]);

      // Act
      const where = service.buildWhereClause({ filters }, mockOrgId);

      // Assert
      expect(where.status).toBe("OPEN");
    });

    it("should handle invalid JSON filters gracefully", () => {
      // Act - Should not throw
      const where = service.buildWhereClause(
        { filters: "not-valid-json" },
        mockOrgId,
      );

      // Assert
      expect(where.organizationId).toBe(mockOrgId);
    });
  });

  describe("applyFilterCondition", () => {
    it("should handle is operator", () => {
      // Arrange
      const where: Record<string, unknown> = { organizationId: mockOrgId };

      // Act
      service.applyFilterCondition(where, {
        propertyId: "status",
        operator: "is",
        value: "OPEN",
      });

      // Assert
      expect(where.status).toBe("OPEN");
    });

    it("should handle is_not operator", () => {
      // Arrange
      const where: Record<string, unknown> = { organizationId: mockOrgId };

      // Act
      service.applyFilterCondition(where, {
        propertyId: "status",
        operator: "is_not",
        value: "CLOSED",
      });

      // Assert
      expect(where.status).toEqual({ not: "CLOSED" });
    });

    it("should handle is_any_of operator", () => {
      // Arrange
      const where: Record<string, unknown> = { organizationId: mockOrgId };

      // Act
      service.applyFilterCondition(where, {
        propertyId: "status",
        operator: "is_any_of",
        value: ["OPEN", "NEW"],
      });

      // Assert
      expect(where.status).toEqual({ in: ["OPEN", "NEW"] });
    });

    it("should handle is_none_of operator", () => {
      // Arrange
      const where: Record<string, unknown> = { organizationId: mockOrgId };

      // Act
      service.applyFilterCondition(where, {
        propertyId: "status",
        operator: "is_none_of",
        value: ["CLOSED"],
      });

      // Assert
      expect(where.status).toEqual({ notIn: ["CLOSED"] });
    });

    it("should handle contains operator", () => {
      // Arrange
      const where: Record<string, unknown> = { organizationId: mockOrgId };

      // Act
      service.applyFilterCondition(where, {
        propertyId: "details",
        operator: "contains",
        value: "harassment",
      });

      // Assert
      expect(where.details).toEqual({
        contains: "harassment",
        mode: "insensitive",
      });
    });

    it("should handle is_empty operator", () => {
      // Arrange
      const where: Record<string, unknown> = { organizationId: mockOrgId };

      // Act
      service.applyFilterCondition(where, {
        propertyId: "summary",
        operator: "is_empty",
        value: null,
      });

      // Assert
      expect(where.summary).toBeNull();
    });

    it("should handle is_not_empty operator", () => {
      // Arrange
      const where: Record<string, unknown> = { organizationId: mockOrgId };

      // Act
      service.applyFilterCondition(where, {
        propertyId: "summary",
        operator: "is_not_empty",
        value: null,
      });

      // Assert
      expect(where.summary).toEqual({ not: null });
    });

    it("should map property IDs to field names", () => {
      // Arrange
      const where: Record<string, unknown> = { organizationId: mockOrgId };

      // Act
      service.applyFilterCondition(where, {
        propertyId: "createdBy",
        operator: "is",
        value: mockUserId,
      });

      // Assert
      expect(where.createdById).toBe(mockUserId);
    });
  });

  describe("buildOrderByClause", () => {
    it("should handle direct field sort", () => {
      // Act
      const orderBy = service.buildOrderByClause("status", "asc");

      // Assert
      expect(orderBy).toEqual({ status: "asc" });
    });

    it("should handle relation field sort for primaryCategory", () => {
      // Act
      const orderBy = service.buildOrderByClause("primaryCategory", "desc");

      // Assert
      expect(orderBy).toEqual({ primaryCategory: { name: "desc" } });
    });

    it("should handle relation field sort for createdBy", () => {
      // Act
      const orderBy = service.buildOrderByClause("createdBy", "asc");

      // Assert
      expect(orderBy).toEqual({ createdBy: { firstName: "asc" } });
    });
  });
});
