import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { UserTableService } from "./user-table.service";
import { TableCrudService } from "./services/table-crud.service";
import { TableQueryService } from "./services/table-query.service";
import { TableDeliveryService } from "./services/table-delivery.service";

describe("UserTableService", () => {
  let service: UserTableService;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockTableId = "table-test-123";

  const mockTable = {
    id: mockTableId,
    organizationId: mockOrgId,
    name: "My Cases Table",
    description: "Shows all my cases",
    dataSource: "CASES",
    columns: [{ field: "status", header: "Status", type: "text" }],
    filters: [],
    sortBy: "createdAt",
    sortOrder: "desc",
    visibility: "private",
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    scheduleConfig: null,
    nextRunAt: null,
    isDeleted: false,
  };

  const mockQueryResult = {
    data: [{ id: "case-1", status: "OPEN" }],
    total: 1,
    columns: [{ field: "status", header: "Status", type: "text" }],
    executedAt: new Date(),
    cachedAt: null,
  };

  const mockTableCrudService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    findByIdWithPermissionCheck: jest.fn(),
    findMany: jest.fn(),
    share: jest.fn(),
    clone: jest.fn(),
  };

  const mockTableQueryService = {
    execute: jest.fn(),
    refreshAndCache: jest.fn(),
  };

  const mockTableDeliveryService = {
    calculateNextRun: jest.fn(),
    createScheduledJobForTable: jest.fn(),
    removeScheduledJobForTable: jest.fn(),
    schedule: jest.fn(),
    generateCsv: jest.fn(),
    generateExcel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserTableService,
        { provide: TableCrudService, useValue: mockTableCrudService },
        { provide: TableQueryService, useValue: mockTableQueryService },
        { provide: TableDeliveryService, useValue: mockTableDeliveryService },
      ],
    }).compile();

    service = module.get<UserTableService>(UserTableService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a table and return it", async () => {
      mockTableCrudService.create.mockResolvedValue(mockTable);

      const result = await service.create(
        {
          name: "My Cases Table",
          dataSources: ["CASES"] as any,
          columns: [] as any,
        },
        mockUserId,
        mockOrgId,
      );

      expect(result).toEqual(mockTable);
      expect(mockTableCrudService.create).toHaveBeenCalled();
    });

    it("should create scheduled job when scheduleConfig provided", async () => {
      const tableWithSchedule = {
        ...mockTable,
        scheduleConfig: { frequency: "daily", hour: 8 },
      };
      mockTableCrudService.create.mockResolvedValue(tableWithSchedule);
      mockTableDeliveryService.createScheduledJobForTable.mockResolvedValue(
        undefined,
      );

      await service.create(
        {
          name: "My Cases Table",
          dataSources: ["CASES"] as any,
          columns: [] as any,
          scheduleConfig: { frequency: "daily", hour: 8 } as any,
        },
        mockUserId,
        mockOrgId,
      );

      expect(
        mockTableDeliveryService.createScheduledJobForTable,
      ).toHaveBeenCalled();
    });
  });

  describe("execute", () => {
    it("should delegate to TableQueryService", async () => {
      mockTableCrudService.findByIdWithPermissionCheck.mockResolvedValue(
        mockTable,
      );
      mockTableQueryService.execute.mockResolvedValue(mockQueryResult);

      const result = await service.execute(mockTableId, mockUserId, mockOrgId);

      expect(result).toEqual(mockQueryResult);
      expect(
        mockTableCrudService.findByIdWithPermissionCheck,
      ).toHaveBeenCalledWith(mockTableId, mockUserId, mockOrgId, "view");
    });
  });

  describe("refresh", () => {
    it("should refresh cache and return new results", async () => {
      mockTableCrudService.findByIdWithPermissionCheck.mockResolvedValue(
        mockTable,
      );
      mockTableQueryService.refreshAndCache.mockResolvedValue(mockQueryResult);

      const result = await service.refresh(mockTableId, mockUserId, mockOrgId);

      expect(result).toEqual(mockQueryResult);
      expect(mockTableQueryService.refreshAndCache).toHaveBeenCalled();
    });
  });

  describe("export", () => {
    it("should generate CSV export", async () => {
      mockTableCrudService.findByIdWithPermissionCheck.mockResolvedValue(
        mockTable,
      );
      mockTableQueryService.execute.mockResolvedValue(mockQueryResult);
      mockTableDeliveryService.generateCsv.mockReturnValue(
        "id,status\ncase-1,OPEN",
      );

      const result = await service.export(
        mockTableId,
        { format: "csv" as any },
        mockUserId,
        mockOrgId,
      );

      expect(result.content).toBe("id,status\ncase-1,OPEN");
      expect(result.filename).toContain(".csv");
    });

    it("should generate Excel export", async () => {
      mockTableCrudService.findByIdWithPermissionCheck.mockResolvedValue(
        mockTable,
      );
      mockTableQueryService.execute.mockResolvedValue(mockQueryResult);
      mockTableDeliveryService.generateExcel.mockResolvedValue(
        Buffer.from("excel content"),
      );

      const result = await service.export(
        mockTableId,
        { format: "excel" as any },
        mockUserId,
        mockOrgId,
      );

      expect(result.buffer).toBeDefined();
      expect(result.filename).toContain(".xlsx");
    });

    it("should throw BadRequestException for unsupported format", async () => {
      mockTableCrudService.findByIdWithPermissionCheck.mockResolvedValue(
        mockTable,
      );
      mockTableQueryService.execute.mockResolvedValue(mockQueryResult);

      await expect(
        service.export(
          mockTableId,
          { format: "xml" as any },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findById", () => {
    it("should delegate to TableCrudService", async () => {
      mockTableCrudService.findById.mockResolvedValue(mockTable);

      const result = await service.findById(mockTableId, mockUserId, mockOrgId);

      expect(result).toEqual(mockTable);
      expect(mockTableCrudService.findById).toHaveBeenCalledWith(
        mockTableId,
        mockUserId,
        mockOrgId,
      );
    });
  });

  describe("findMany", () => {
    it("should return paginated table list", async () => {
      const paginatedResult = { data: [mockTable], total: 1 };
      mockTableCrudService.findMany.mockResolvedValue(paginatedResult);

      const result = await service.findMany({} as any, mockUserId, mockOrgId);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("delete", () => {
    it("should delete table and remove scheduled job", async () => {
      mockTableCrudService.delete.mockResolvedValue(mockTable);
      mockTableDeliveryService.removeScheduledJobForTable.mockResolvedValue(
        undefined,
      );

      await service.delete(mockTableId, mockUserId, mockOrgId);

      expect(mockTableCrudService.delete).toHaveBeenCalledWith(
        mockTableId,
        mockUserId,
        mockOrgId,
      );
      expect(
        mockTableDeliveryService.removeScheduledJobForTable,
      ).toHaveBeenCalledWith(mockTable.id);
    });
  });
});
