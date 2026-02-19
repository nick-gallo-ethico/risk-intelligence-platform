import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { QueryBuilderService } from "./query-builder.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReportDataSource } from "@prisma/client";

describe("QueryBuilderService", () => {
  let service: QueryBuilderService;

  const mockOrgId = "org-test-123";
  const mockColumns = [
    { field: "status", label: "Status", type: "string" as const },
  ];

  const mockCaseDelegate = {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  };

  const mockPrismaService = {
    case: mockCaseDelegate,
    riskIntelligenceUnit: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryBuilderService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<QueryBuilderService>(QueryBuilderService);
    jest.clearAllMocks();
  });

  describe("executeQuery", () => {
    it("should execute query for CASES data source", async () => {
      const mockData = [{ id: "case-1", status: "OPEN" }];
      mockCaseDelegate.findMany.mockResolvedValue(mockData);
      mockCaseDelegate.count.mockResolvedValue(1);

      const result = await service.executeQuery({
        organizationId: mockOrgId,
        dataSource: ReportDataSource.CASES,
        columns: mockColumns,
      });

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
      expect(mockCaseDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: mockOrgId }),
        }),
      );
    });

    it("should always include organizationId in where clause", async () => {
      mockCaseDelegate.findMany.mockResolvedValue([]);
      mockCaseDelegate.count.mockResolvedValue(0);

      await service.executeQuery({
        organizationId: mockOrgId,
        dataSource: ReportDataSource.CASES,
        columns: mockColumns,
      });

      expect(mockCaseDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: mockOrgId }),
        }),
      );
    });

    it("should apply eq filter correctly", async () => {
      mockCaseDelegate.findMany.mockResolvedValue([]);
      mockCaseDelegate.count.mockResolvedValue(0);

      await service.executeQuery({
        organizationId: mockOrgId,
        dataSource: ReportDataSource.CASES,
        columns: mockColumns,
        filters: [{ field: "status", operator: "eq", value: "OPEN" }],
      });

      expect(mockCaseDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "OPEN" }),
        }),
      );
    });

    it("should apply contains filter with case-insensitive mode", async () => {
      mockCaseDelegate.findMany.mockResolvedValue([]);
      mockCaseDelegate.count.mockResolvedValue(0);

      await service.executeQuery({
        organizationId: mockOrgId,
        dataSource: ReportDataSource.CASES,
        columns: mockColumns,
        filters: [{ field: "details", operator: "contains", value: "fraud" }],
      });

      expect(mockCaseDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            details: { contains: "fraud", mode: "insensitive" },
          }),
        }),
      );
    });

    it("should apply pagination with limit and offset", async () => {
      mockCaseDelegate.findMany.mockResolvedValue([]);
      mockCaseDelegate.count.mockResolvedValue(100);

      await service.executeQuery({
        organizationId: mockOrgId,
        dataSource: ReportDataSource.CASES,
        columns: mockColumns,
        limit: 20,
        offset: 40,
      });

      expect(mockCaseDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40,
        }),
      );
    });

    it("should throw BadRequestException for unsupported data source", async () => {
      await expect(
        service.executeQuery({
          organizationId: mockOrgId,
          dataSource: "UNSUPPORTED" as ReportDataSource,
          columns: mockColumns,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should apply neq filter correctly", async () => {
      mockCaseDelegate.findMany.mockResolvedValue([]);
      mockCaseDelegate.count.mockResolvedValue(0);

      await service.executeQuery({
        organizationId: mockOrgId,
        dataSource: ReportDataSource.CASES,
        columns: mockColumns,
        filters: [{ field: "status", operator: "neq", value: "CLOSED" }],
      });

      expect(mockCaseDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: "CLOSED" },
          }),
        }),
      );
    });
  });

  describe("executeAggregation", () => {
    it("should execute group by aggregation", async () => {
      const mockGroupByResult = [
        { status: "OPEN", _count: { id: 5 } },
        { status: "CLOSED", _count: { id: 10 } },
      ];
      mockCaseDelegate.groupBy = jest.fn().mockResolvedValue(mockGroupByResult);

      const result = await service.executeAggregation({
        organizationId: mockOrgId,
        dataSource: ReportDataSource.CASES,
        groupBy: ["status"],
        aggregations: [{ field: "id", type: "count" }],
      });

      expect(result).toEqual(mockGroupByResult);
    });
  });
});
