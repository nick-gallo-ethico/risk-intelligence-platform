import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { HrisSyncService } from "./hris-sync.service";
import { PrismaService } from "../prisma/prisma.service";
import { PersonsService } from "../persons/persons.service";
import { MergeClientService } from "./merge-client.service";

describe("HrisSyncService", () => {
  let service: HrisSyncService;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockAccountToken = "merge-account-token-xyz";

  const mockMergeEmployee = {
    id: "merge-emp-1",
    remote_id: "emp-001",
    first_name: "Alice",
    last_name: "Smith",
    work_email: "alice@example.com",
    mobile_phone_number: "+1-555-123-4567",
    job_title: "Software Engineer",
    employment_status: "ACTIVE",
    manager: null,
  };

  const mockDbEmployee = {
    id: "db-employee-1",
    organizationId: mockOrgId,
    hrisEmployeeId: "emp-001",
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    phone: "+1-555-123-4567",
    jobTitle: "Software Engineer",
    employmentStatus: "ACTIVE",
    managerId: null,
    managerName: null,
    sourceSystem: "MERGE_DEV",
    syncedAt: new Date(),
    rawHrisData: mockMergeEmployee,
  };

  const mockPrismaService = {
    employee: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPersonsService = {
    findByEmployeeId: jest.fn(),
    createFromEmployee: jest.fn(),
    syncFromEmployee: jest.fn(),
  };

  const mockMergeClientService = {
    getEmployees: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrisSyncService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PersonsService, useValue: mockPersonsService },
        { provide: MergeClientService, useValue: mockMergeClientService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<HrisSyncService>(HrisSyncService);
    jest.clearAllMocks();
  });

  describe("syncEmployees", () => {
    it("should create new person when employee does not exist", async () => {
      mockMergeClientService.getEmployees.mockResolvedValue([
        mockMergeEmployee,
      ]);
      mockPrismaService.employee.findFirst.mockResolvedValue(null);
      mockPrismaService.employee.create.mockResolvedValue(mockDbEmployee);
      mockPersonsService.findByEmployeeId.mockResolvedValue(null);
      mockPersonsService.createFromEmployee.mockResolvedValue({
        id: "person-1",
      });

      const result = await service.syncEmployees(
        mockAccountToken,
        mockOrgId,
        mockUserId,
      );

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockPersonsService.createFromEmployee).toHaveBeenCalled();
    });

    it("should update existing person when employee already exists", async () => {
      mockMergeClientService.getEmployees.mockResolvedValue([
        mockMergeEmployee,
      ]);
      mockPrismaService.employee.findFirst.mockResolvedValue(mockDbEmployee);
      mockPrismaService.employee.update.mockResolvedValue(mockDbEmployee);
      mockPersonsService.findByEmployeeId.mockResolvedValue({ id: "person-1" });
      mockPersonsService.syncFromEmployee.mockResolvedValue({ id: "person-1" });

      const result = await service.syncEmployees(
        mockAccountToken,
        mockOrgId,
        mockUserId,
      );

      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockPersonsService.syncFromEmployee).toHaveBeenCalled();
    });

    it("should collect errors without stopping sync for failed employees", async () => {
      const emp1 = { ...mockMergeEmployee, id: "emp-1", remote_id: "emp-001" };
      const emp2 = {
        ...mockMergeEmployee,
        id: "emp-2",
        remote_id: "emp-002",
        work_email: "bob@example.com",
      };

      mockMergeClientService.getEmployees.mockResolvedValue([emp1, emp2]);

      // First employee fails, second succeeds
      mockPrismaService.employee.findFirst
        .mockRejectedValueOnce(new Error("DB error for emp1"))
        .mockResolvedValueOnce(null);

      mockPrismaService.employee.create.mockResolvedValue({
        ...mockDbEmployee,
        hrisEmployeeId: "emp-002",
      });
      mockPersonsService.findByEmployeeId.mockResolvedValue(null);
      mockPersonsService.createFromEmployee.mockResolvedValue({
        id: "person-2",
      });

      const result = await service.syncEmployees(
        mockAccountToken,
        mockOrgId,
        mockUserId,
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].employeeId).toBe("emp-1");
      expect(result.created).toBe(1);
    });

    it("should emit hris.sync.completed event after sync", async () => {
      mockMergeClientService.getEmployees.mockResolvedValue([]);

      await service.syncEmployees(mockAccountToken, mockOrgId, mockUserId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "hris.sync.completed",
        expect.objectContaining({
          organizationId: mockOrgId,
          userId: mockUserId,
        }),
      );
    });

    it("should return durationMs in result", async () => {
      mockMergeClientService.getEmployees.mockResolvedValue([]);

      const result = await service.syncEmployees(
        mockAccountToken,
        mockOrgId,
        mockUserId,
      );

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty employee list gracefully", async () => {
      mockMergeClientService.getEmployees.mockResolvedValue([]);

      const result = await service.syncEmployees(
        mockAccountToken,
        mockOrgId,
        mockUserId,
      );

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
