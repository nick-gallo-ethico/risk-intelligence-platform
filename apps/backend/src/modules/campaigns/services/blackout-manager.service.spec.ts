import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { BlackoutManagerService } from "./blackout-manager.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";

describe("BlackoutManagerService", () => {
  let service: BlackoutManagerService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";

  const mockBlackout = {
    id: "blackout-123",
    organizationId: mockOrgId,
    name: "Holiday Freeze",
    description: "Year-end holiday",
    startDate: new Date("2026-12-24"),
    endDate: new Date("2026-12-26"),
    affectsLocations: [],
    isRecurring: false,
    recurringPattern: null,
    isActive: true,
    createdById: mockUserId,
  };

  const mockPrismaService = {
    orgBlackoutDate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlackoutManagerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<BlackoutManagerService>(BlackoutManagerService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe("checkBlackouts", () => {
    it("should return true if date falls in blackout", async () => {
      mockPrismaService.orgBlackoutDate.findMany.mockResolvedValue([
        mockBlackout,
      ]);

      const result = await service.checkBlackouts(
        new Date("2026-12-25"),
        mockOrgId,
      );

      expect(result).toBe(true);
    });

    it("should return false if date is not in blackout", async () => {
      mockPrismaService.orgBlackoutDate.findMany.mockResolvedValue([
        mockBlackout,
      ]);

      const result = await service.checkBlackouts(
        new Date("2026-12-20"),
        mockOrgId,
      );

      expect(result).toBe(false);
    });

    it("should respect location scope", async () => {
      mockPrismaService.orgBlackoutDate.findMany.mockResolvedValue([
        { ...mockBlackout, affectsLocations: ["loc-1"] },
      ]);

      // Different location, should not be in blackout
      const result = await service.checkBlackouts(
        new Date("2026-12-25"),
        mockOrgId,
        "loc-2",
      );

      expect(result).toBe(false);
    });
  });

  describe("getNextAvailableDate", () => {
    it("should return same date if not in blackout", async () => {
      mockPrismaService.orgBlackoutDate.findMany.mockResolvedValue([]);
      const fromDate = new Date("2026-03-15");

      const result = await service.getNextAvailableDate(fromDate, mockOrgId);

      expect(result.getTime()).toBe(fromDate.getTime());
    });

    it("should skip blackout period", async () => {
      mockPrismaService.orgBlackoutDate.findMany.mockResolvedValue([
        mockBlackout,
      ]);
      const fromDate = new Date("2026-12-24");

      const result = await service.getNextAvailableDate(fromDate, mockOrgId);

      expect(result.getTime()).toBeGreaterThan(mockBlackout.endDate.getTime());
    });
  });

  describe("isDateInBlackout", () => {
    it("should return false for dates outside range", () => {
      const result = service.isDateInBlackout(
        new Date("2026-12-23"),
        mockBlackout as never,
      );
      expect(result).toBe(false);
    });

    it("should return true for dates within range", () => {
      const result = service.isDateInBlackout(
        new Date("2026-12-25"),
        mockBlackout as never,
      );
      expect(result).toBe(true);
    });

    it("should respect location scope", () => {
      const blackoutWithLocation = {
        ...mockBlackout,
        affectsLocations: ["loc-1"],
      };

      // Wrong location
      const result = service.isDateInBlackout(
        new Date("2026-12-25"),
        blackoutWithLocation as never,
        "loc-2",
      );
      expect(result).toBe(false);
    });

    it("should handle YEARLY recurring pattern", () => {
      const yearlyBlackout = {
        ...mockBlackout,
        isRecurring: true,
        recurringPattern: "YEARLY",
      };

      // Check next year
      const result = service.isDateInBlackout(
        new Date("2027-12-25"),
        yearlyBlackout as never,
      );
      expect(result).toBe(true);
    });

    it("should handle MONTHLY recurring pattern", () => {
      const monthlyBlackout = {
        ...mockBlackout,
        startDate: new Date("2026-01-15"),
        endDate: new Date("2026-01-17"),
        isRecurring: true,
        recurringPattern: "MONTHLY",
      };

      // Check different month, same day
      const result = service.isDateInBlackout(
        new Date("2026-05-16"),
        monthlyBlackout as never,
      );
      expect(result).toBe(true);
    });
  });

  describe("createBlackout", () => {
    it("should create blackout and log audit", async () => {
      mockPrismaService.orgBlackoutDate.create.mockResolvedValue(mockBlackout);

      const input = {
        name: "Holiday Freeze",
        startDate: new Date("2026-12-24"),
        endDate: new Date("2026-12-26"),
      };

      const result = await service.createBlackout(input, mockUserId, mockOrgId);

      expect(result).toEqual(mockBlackout);
      expect(auditService.log).toHaveBeenCalled();
    });

    it("should throw BadRequestException when start >= end", async () => {
      const input = {
        name: "Invalid",
        startDate: new Date("2026-12-26"),
        endDate: new Date("2026-12-24"),
      };

      await expect(
        service.createBlackout(input, mockUserId, mockOrgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateBlackout", () => {
    it("should update blackout fields", async () => {
      mockPrismaService.orgBlackoutDate.findFirst.mockResolvedValue(
        mockBlackout,
      );
      mockPrismaService.orgBlackoutDate.update.mockResolvedValue({
        ...mockBlackout,
        name: "Updated Name",
      });

      const result = await service.updateBlackout(
        "blackout-123",
        { name: "Updated Name" },
        mockUserId,
        mockOrgId,
      );

      expect(result.name).toBe("Updated Name");
      expect(auditService.log).toHaveBeenCalled();
    });

    it("should throw NotFoundException when blackout not found", async () => {
      mockPrismaService.orgBlackoutDate.findFirst.mockResolvedValue(null);

      await expect(
        service.updateBlackout(
          "nonexistent",
          { name: "Test" },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for invalid dates", async () => {
      mockPrismaService.orgBlackoutDate.findFirst.mockResolvedValue(
        mockBlackout,
      );

      await expect(
        service.updateBlackout(
          "blackout-123",
          {
            startDate: new Date("2026-12-30"),
            endDate: new Date("2026-12-24"),
          },
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("deleteBlackout", () => {
    it("should soft delete blackout", async () => {
      mockPrismaService.orgBlackoutDate.findFirst.mockResolvedValue(
        mockBlackout,
      );
      mockPrismaService.orgBlackoutDate.update.mockResolvedValue({});

      await service.deleteBlackout("blackout-123", mockUserId, mockOrgId);

      expect(prisma.orgBlackoutDate.update).toHaveBeenCalledWith({
        where: { id: "blackout-123" },
        data: { isActive: false },
      });
      expect(auditService.log).toHaveBeenCalled();
    });

    it("should throw NotFoundException when blackout not found", async () => {
      mockPrismaService.orgBlackoutDate.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteBlackout("nonexistent", mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("listBlackouts", () => {
    it("should return active blackouts by default", async () => {
      mockPrismaService.orgBlackoutDate.findMany.mockResolvedValue([
        mockBlackout,
      ]);

      await service.listBlackouts(mockOrgId);

      expect(prisma.orgBlackoutDate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: mockOrgId, isActive: true },
        }),
      );
    });

    it("should include inactive when option set", async () => {
      mockPrismaService.orgBlackoutDate.findMany.mockResolvedValue([]);

      await service.listBlackouts(mockOrgId, { includeInactive: true });

      expect(prisma.orgBlackoutDate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: mockOrgId },
        }),
      );
    });
  });

  describe("getBlackout", () => {
    it("should return blackout by ID", async () => {
      mockPrismaService.orgBlackoutDate.findFirst.mockResolvedValue(
        mockBlackout,
      );

      const result = await service.getBlackout("blackout-123", mockOrgId);

      expect(result).toEqual(mockBlackout);
    });

    it("should throw NotFoundException when not found", async () => {
      mockPrismaService.orgBlackoutDate.findFirst.mockResolvedValue(null);

      await expect(
        service.getBlackout("nonexistent", mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
