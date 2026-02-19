import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PersonsService } from "./persons.service";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import {
  PersonType,
  PersonSource,
  AnonymityTier,
  PersonStatus,
} from "@prisma/client";

describe("PersonsService", () => {
  let service: PersonsService;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockPersonId = "person-test-123";

  const mockPerson: Record<string, unknown> = {
    id: mockPersonId,
    organizationId: mockOrgId,
    type: PersonType.EMPLOYEE,
    source: PersonSource.MANUAL,
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    phone: null,
    employeeId: null,
    businessUnitId: null,
    businessUnitName: null,
    jobTitle: "Compliance Officer",
    employmentStatus: null,
    locationId: null,
    locationName: null,
    managerId: null,
    managerName: null,
    company: null,
    title: null,
    relationship: null,
    anonymityTier: AnonymityTier.OPEN,
    status: PersonStatus.ACTIVE,
    mergedIntoPrimaryId: null,
    mergedAt: null,
    mergedById: null,
    notes: null,
    createdById: mockUserId,
    updatedById: mockUserId,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  };

  const mockCreateDto = {
    type: PersonType.EMPLOYEE,
    source: PersonSource.MANUAL,
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    anonymityTier: AnonymityTier.OPEN,
  };

  const mockPrisma = {
    person: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    businessUnit: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    location: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PersonsService>(PersonsService);
    jest.resetAllMocks();
  });

  describe("create", () => {
    it("should create a person with correct organizationId", async () => {
      mockPrisma.person.findFirst.mockResolvedValue(null); // No duplicate email
      mockPrisma.person.create.mockResolvedValue(mockPerson);
      mockActivityService.log.mockResolvedValue(undefined);
      mockEventEmitter.emit.mockReturnValue(undefined);

      const result = await service.create(mockCreateDto, mockUserId, mockOrgId);

      expect(result.id).toBe(mockPersonId);
      expect(mockPrisma.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId,
          createdById: mockUserId,
          email: "jane.doe@example.com",
        }),
      });
    });

    it("should throw ConflictException when email already exists in org", async () => {
      mockPrisma.person.findFirst.mockResolvedValue(mockPerson);

      await expect(
        service.create(mockCreateDto, mockUserId, mockOrgId),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.person.create).not.toHaveBeenCalled();
    });

    it("should log activity on creation", async () => {
      mockPrisma.person.findFirst.mockResolvedValue(null);
      mockPrisma.person.create.mockResolvedValue(mockPerson);
      mockActivityService.log.mockResolvedValue(undefined);
      mockEventEmitter.emit.mockReturnValue(undefined);

      await service.create(mockCreateDto, mockUserId, mockOrgId);

      expect(mockActivityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "created",
          actorUserId: mockUserId,
          organizationId: mockOrgId,
        }),
      );
    });

    it("should emit person.created event", async () => {
      mockPrisma.person.findFirst.mockResolvedValue(null);
      mockPrisma.person.create.mockResolvedValue(mockPerson);
      mockActivityService.log.mockResolvedValue(undefined);
      mockEventEmitter.emit.mockReturnValue(undefined);

      await service.create(mockCreateDto, mockUserId, mockOrgId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "person.created",
        expect.objectContaining({
          organizationId: mockOrgId,
          personId: mockPersonId,
        }),
      );
    });

    it("should allow creating person without email (no uniqueness check)", async () => {
      const dtoNoEmail = { ...mockCreateDto, email: undefined };
      mockPrisma.person.create.mockResolvedValue({
        ...mockPerson,
        email: null,
      });
      mockActivityService.log.mockResolvedValue(undefined);
      mockEventEmitter.emit.mockReturnValue(undefined);

      await service.create(dtoNoEmail, mockUserId, mockOrgId);

      // findFirst for email check should NOT be called when no email provided
      expect(mockPrisma.person.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.person.create).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("should return paginated persons scoped to organization", async () => {
      mockPrisma.person.findMany.mockResolvedValue([mockPerson]);
      mockPrisma.person.count.mockResolvedValue(1);

      const result = await service.findAll({}, mockOrgId);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: mockOrgId }),
        }),
      );
    });

    it("should apply type filter when specified", async () => {
      mockPrisma.person.findMany.mockResolvedValue([]);
      mockPrisma.person.count.mockResolvedValue(0);

      await service.findAll({ type: PersonType.EXTERNAL_CONTACT }, mockOrgId);

      expect(mockPrisma.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: PersonType.EXTERNAL_CONTACT,
          }),
        }),
      );
    });

    it("should apply search filter across name and email fields", async () => {
      mockPrisma.person.findMany.mockResolvedValue([]);
      mockPrisma.person.count.mockResolvedValue(0);

      await service.findAll({ search: "Jane" }, mockOrgId);

      expect(mockPrisma.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                firstName: { contains: "Jane", mode: "insensitive" },
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return person when found in org", async () => {
      mockPrisma.person.findFirst.mockResolvedValue(mockPerson);

      const result = await service.findOne(mockPersonId, mockOrgId);

      expect(result.id).toBe(mockPersonId);
      expect(mockPrisma.person.findFirst).toHaveBeenCalledWith({
        where: { id: mockPersonId, organizationId: mockOrgId },
      });
    });

    it("should throw NotFoundException when person not found", async () => {
      mockPrisma.person.findFirst.mockResolvedValue(null);

      await expect(service.findOne("non-existent", mockOrgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return 404 for cross-tenant access (DB returns null)", async () => {
      mockPrisma.person.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockPersonId, "other-org")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByEmail", () => {
    it("should return person found by email", async () => {
      mockPrisma.person.findFirst.mockResolvedValue(mockPerson);

      const result = await service.findByEmail(
        "jane.doe@example.com",
        mockOrgId,
      );

      expect(result).toEqual(mockPerson);
      expect(mockPrisma.person.findFirst).toHaveBeenCalledWith({
        where: {
          email: "jane.doe@example.com",
          organizationId: mockOrgId,
        },
      });
    });

    it("should return null when email not found", async () => {
      mockPrisma.person.findFirst.mockResolvedValue(null);

      const result = await service.findByEmail(
        "notfound@example.com",
        mockOrgId,
      );

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update person and log activity", async () => {
      mockPrisma.person.findFirst
        .mockResolvedValueOnce(mockPerson) // findOne check
        .mockResolvedValueOnce(null); // email check (no duplicate)
      mockPrisma.person.update.mockResolvedValue({
        ...mockPerson,
        firstName: "Jane Updated",
      });
      mockActivityService.log.mockResolvedValue(undefined);
      mockEventEmitter.emit.mockReturnValue(undefined);

      const result = await service.update(
        mockPersonId,
        { firstName: "Jane Updated" },
        mockUserId,
        mockOrgId,
      );

      expect(result.firstName).toBe("Jane Updated");
      expect(mockActivityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "updated",
          entityId: mockPersonId,
        }),
      );
    });

    it("should throw ConflictException when new email already used by another person", async () => {
      const otherPerson = { ...mockPerson, id: "other-person-id" };
      mockPrisma.person.findFirst
        .mockResolvedValueOnce(mockPerson) // findOne check
        .mockResolvedValueOnce(otherPerson); // email taken by other person

      await expect(
        service.update(
          mockPersonId,
          { email: "taken@example.com" },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("getOrCreateAnonymousPlaceholder", () => {
    it("should return existing placeholder if one exists", async () => {
      const placeholder = {
        ...mockPerson,
        type: PersonType.ANONYMOUS_PLACEHOLDER,
      };
      mockPrisma.person.findFirst.mockResolvedValue(placeholder);

      const result = await service.getOrCreateAnonymousPlaceholder(mockOrgId);

      expect(result.type).toBe(PersonType.ANONYMOUS_PLACEHOLDER);
      expect(mockPrisma.person.create).not.toHaveBeenCalled();
    });

    it("should create a new placeholder when none exists", async () => {
      mockPrisma.person.findFirst.mockResolvedValue(null);
      const newPlaceholder = {
        ...mockPerson,
        type: PersonType.ANONYMOUS_PLACEHOLDER,
        anonymityTier: AnonymityTier.ANONYMOUS,
      };
      mockPrisma.person.create.mockResolvedValue(newPlaceholder);
      mockActivityService.log.mockResolvedValue(undefined);

      const result = await service.getOrCreateAnonymousPlaceholder(
        mockOrgId,
        mockUserId,
      );

      expect(result.type).toBe(PersonType.ANONYMOUS_PLACEHOLDER);
      expect(mockPrisma.person.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId,
            type: PersonType.ANONYMOUS_PLACEHOLDER,
            anonymityTier: AnonymityTier.ANONYMOUS,
          }),
        }),
      );
    });
  });

  describe("getDirectReports", () => {
    it("should return active direct reports for a person", async () => {
      const directReport = {
        ...mockPerson,
        managerId: mockPersonId,
      };
      mockPrisma.person.findMany.mockResolvedValue([directReport]);

      const result = await service.getDirectReports(mockPersonId, mockOrgId);

      expect(result).toHaveLength(1);
      expect(mockPrisma.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            managerId: mockPersonId,
            organizationId: mockOrgId,
            status: PersonStatus.ACTIVE,
          }),
          take: 100,
        }),
      );
    });

    it("should respect custom limit option", async () => {
      mockPrisma.person.findMany.mockResolvedValue([]);

      await service.getDirectReports(mockPersonId, mockOrgId, { limit: 10 });

      expect(mockPrisma.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe("createFromEmployeeBatch", () => {
    it("should return empty array when no employees provided", async () => {
      const result = await service.createFromEmployeeBatch(
        [],
        mockUserId,
        mockOrgId,
      );

      expect(result).toEqual([]);
      expect(mockPrisma.person.create).not.toHaveBeenCalled();
    });

    it("should skip employees who already have Person records", async () => {
      const employee = {
        id: "emp-1",
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        phone: null,
        managerId: null,
        businessUnitId: null,
        locationId: null,
        jobTitle: "Engineer",
        employmentStatus: "ACTIVE",
        organizationId: mockOrgId,
      };

      // All employees already exist
      mockPrisma.person.findMany.mockResolvedValue([
        { id: mockPersonId, employeeId: "emp-1" },
      ]);

      const result = await service.createFromEmployeeBatch(
        [employee as any],
        mockUserId,
        mockOrgId,
      );

      expect(result).toEqual([]);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
