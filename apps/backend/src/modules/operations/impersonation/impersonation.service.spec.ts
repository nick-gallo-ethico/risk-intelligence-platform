/**
 * ImpersonationService - Unit Tests
 *
 * Tests for the ImpersonationService covering:
 * - Session creation (startSession)
 * - Session termination (endSession)
 * - Session validation (validateSession)
 * - Session time remaining (getRemainingSeconds)
 * - Session details retrieval (getSessionWithDetails)
 * - Active sessions listing (getActiveSessions)
 * - Audit logging (logAction, getSessionAuditLogs, getOrganizationAuditLogs)
 *
 * @see impersonation.service.ts for implementation
 * @see 36-03-PLAN.md for TEST-03 requirement
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ImpersonationService } from "./impersonation.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  InternalRole,
  ROLE_PERMISSIONS,
  InternalPermission,
} from "../types/internal-roles.types";
import { StartSessionDto } from "./dto/impersonation.dto";

describe("ImpersonationService", () => {
  let service: ImpersonationService;
  let prismaService: jest.Mocked<PrismaService>;

  // Test data
  const mockOperatorUserId = "operator-uuid-123";
  const mockTargetOrgId = "target-org-uuid-456";
  const mockSessionId = "session-uuid-789";
  const mockOrgName = "Acme Corp";
  const mockOperatorEmail = "support@ethico.com";

  // Mock operator with SUPPORT_L1 role (has IMPERSONATE permission)
  const mockOperatorWithPermission = {
    id: mockOperatorUserId,
    email: mockOperatorEmail,
    name: "Support User",
    role: InternalRole.SUPPORT_L1,
    isActive: true,
  };

  // Mock operator with CLIENT_SUCCESS role (lacks IMPERSONATE permission)
  const mockOperatorWithoutPermission = {
    id: mockOperatorUserId,
    email: mockOperatorEmail,
    name: "Success Manager",
    role: InternalRole.CLIENT_SUCCESS,
    isActive: true,
  };

  // Mock inactive operator
  const mockInactiveOperator = {
    id: mockOperatorUserId,
    email: mockOperatorEmail,
    name: "Inactive User",
    role: InternalRole.ADMIN,
    isActive: false,
  };

  // Mock organization
  const mockOrganization = {
    id: mockTargetOrgId,
    name: mockOrgName,
  };

  // Mock session
  const mockSession = {
    id: mockSessionId,
    organizationId: mockTargetOrgId,
    operatorUserId: mockOperatorUserId,
    operatorRole: InternalRole.SUPPORT_L1,
    targetOrganizationId: mockTargetOrgId,
    reason: "Testing impersonation for support ticket",
    ticketId: "TICKET-123",
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    startedAt: new Date(),
    endedAt: null,
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0",
  };

  // Mock ended session
  const mockEndedSession = {
    ...mockSession,
    endedAt: new Date(),
  };

  // Mock expired session
  const mockExpiredSession = {
    ...mockSession,
    expiresAt: new Date(Date.now() - 1000), // Already expired
  };

  // Helper to create StartSessionDto
  const createStartSessionDto = (): StartSessionDto => ({
    targetOrganizationId: mockTargetOrgId,
    reason: "Testing impersonation for support ticket",
    ticketId: "TICKET-123",
  });

  beforeEach(async () => {
    const mockPrismaService = {
      internalUser: {
        findUnique: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
      },
      impersonationSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      impersonationAuditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImpersonationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ImpersonationService>(ImpersonationService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("startSession", () => {
    it("should create impersonation session and return sessionId and expiresAt", async () => {
      // Arrange
      const dto = createStartSessionDto();
      (prismaService.internalUser.findUnique as jest.Mock).mockResolvedValue(
        mockOperatorWithPermission,
      );
      (prismaService.organization.findUnique as jest.Mock).mockResolvedValue(
        mockOrganization,
      );
      (
        prismaService.impersonationSession.create as jest.Mock
      ).mockResolvedValue(mockSession);
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(mockSession);
      (
        prismaService.impersonationAuditLog.create as jest.Mock
      ).mockResolvedValue({});

      // Act
      const result = await service.startSession(
        mockOperatorUserId,
        dto,
        "127.0.0.1",
        "Mozilla/5.0",
      );

      // Assert
      expect(result).toHaveProperty("sessionId");
      expect(result).toHaveProperty("expiresAt");
      expect(result.sessionId).toBe(mockSessionId);
      expect(prismaService.impersonationSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockTargetOrgId,
          operatorUserId: mockOperatorUserId,
          operatorRole: InternalRole.SUPPORT_L1,
          targetOrganizationId: mockTargetOrgId,
          reason: dto.reason,
          ticketId: dto.ticketId,
          ipAddress: "127.0.0.1",
          userAgent: "Mozilla/5.0",
        }),
      });
    });

    it("should store original operator context (id, role)", async () => {
      // Arrange
      const dto = createStartSessionDto();
      (prismaService.internalUser.findUnique as jest.Mock).mockResolvedValue(
        mockOperatorWithPermission,
      );
      (prismaService.organization.findUnique as jest.Mock).mockResolvedValue(
        mockOrganization,
      );
      (
        prismaService.impersonationSession.create as jest.Mock
      ).mockResolvedValue(mockSession);
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(mockSession);
      (
        prismaService.impersonationAuditLog.create as jest.Mock
      ).mockResolvedValue({});

      // Act
      await service.startSession(mockOperatorUserId, dto);

      // Assert
      const createCall = (
        prismaService.impersonationSession.create as jest.Mock
      ).mock.calls[0][0];
      expect(createCall.data.operatorUserId).toBe(mockOperatorUserId);
      expect(createCall.data.operatorRole).toBe(InternalRole.SUPPORT_L1);
    });

    it("should throw ForbiddenException when operator not found", async () => {
      // Arrange
      const dto = createStartSessionDto();
      (prismaService.internalUser.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      // Act & Assert
      await expect(
        service.startSession(mockOperatorUserId, dto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.startSession(mockOperatorUserId, dto),
      ).rejects.toThrow("Operator not found or inactive");
    });

    it("should throw ForbiddenException when operator is inactive", async () => {
      // Arrange
      const dto = createStartSessionDto();
      (prismaService.internalUser.findUnique as jest.Mock).mockResolvedValue(
        mockInactiveOperator,
      );

      // Act & Assert
      await expect(
        service.startSession(mockOperatorUserId, dto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.startSession(mockOperatorUserId, dto),
      ).rejects.toThrow("Operator not found or inactive");
    });

    it("should throw ForbiddenException when operator lacks IMPERSONATE permission", async () => {
      // Arrange
      const dto = createStartSessionDto();
      (prismaService.internalUser.findUnique as jest.Mock).mockResolvedValue(
        mockOperatorWithoutPermission,
      );

      // Act & Assert
      await expect(
        service.startSession(mockOperatorUserId, dto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.startSession(mockOperatorUserId, dto),
      ).rejects.toThrow("Insufficient permissions for impersonation");
    });

    it("should throw NotFoundException when target organization not found", async () => {
      // Arrange
      const dto = createStartSessionDto();
      (prismaService.internalUser.findUnique as jest.Mock).mockResolvedValue(
        mockOperatorWithPermission,
      );
      (prismaService.organization.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      // Act & Assert
      await expect(
        service.startSession(mockOperatorUserId, dto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.startSession(mockOperatorUserId, dto),
      ).rejects.toThrow("Target organization not found");
    });

    it("should log audit event for impersonation start", async () => {
      // Arrange
      const dto = createStartSessionDto();
      (prismaService.internalUser.findUnique as jest.Mock).mockResolvedValue(
        mockOperatorWithPermission,
      );
      (prismaService.organization.findUnique as jest.Mock).mockResolvedValue(
        mockOrganization,
      );
      (
        prismaService.impersonationSession.create as jest.Mock
      ).mockResolvedValue(mockSession);
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(mockSession);
      (
        prismaService.impersonationAuditLog.create as jest.Mock
      ).mockResolvedValue({});

      // Act
      await service.startSession(mockOperatorUserId, dto);

      // Assert
      expect(prismaService.impersonationAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: mockSessionId,
          action: "SESSION_STARTED",
          organizationId: mockTargetOrgId,
        }),
      });
    });

    it("should allow ADMIN role to impersonate (has ALL permission)", async () => {
      // Arrange
      const dto = createStartSessionDto();
      const adminOperator = {
        ...mockOperatorWithPermission,
        role: InternalRole.ADMIN,
      };
      (prismaService.internalUser.findUnique as jest.Mock).mockResolvedValue(
        adminOperator,
      );
      (prismaService.organization.findUnique as jest.Mock).mockResolvedValue(
        mockOrganization,
      );
      (
        prismaService.impersonationSession.create as jest.Mock
      ).mockResolvedValue({
        ...mockSession,
        operatorRole: InternalRole.ADMIN,
      });
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue({
        ...mockSession,
        operatorRole: InternalRole.ADMIN,
      });
      (
        prismaService.impersonationAuditLog.create as jest.Mock
      ).mockResolvedValue({});

      // Act
      const result = await service.startSession(mockOperatorUserId, dto);

      // Assert
      expect(result).toHaveProperty("sessionId");
      expect(prismaService.impersonationSession.create).toHaveBeenCalled();
    });
  });

  describe("endSession", () => {
    it("should set endedAt timestamp on session", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(mockSession);
      (
        prismaService.impersonationSession.update as jest.Mock
      ).mockResolvedValue({
        ...mockSession,
        endedAt: new Date(),
      });
      (
        prismaService.impersonationAuditLog.create as jest.Mock
      ).mockResolvedValue({});

      // Act
      await service.endSession(mockSessionId, "Session complete");

      // Assert
      expect(prismaService.impersonationSession.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: { endedAt: expect.any(Date) },
      });
    });

    it("should throw NotFoundException when session not found", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(null);

      // Act & Assert
      await expect(service.endSession(mockSessionId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.endSession(mockSessionId)).rejects.toThrow(
        "Session not found",
      );
    });

    it("should throw ForbiddenException when session already ended", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(mockEndedSession);

      // Act & Assert
      await expect(service.endSession(mockSessionId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.endSession(mockSessionId)).rejects.toThrow(
        "Session already ended",
      );
    });

    it("should log audit event for impersonation stop", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(mockSession);
      (
        prismaService.impersonationSession.update as jest.Mock
      ).mockResolvedValue({
        ...mockSession,
        endedAt: new Date(),
      });
      (
        prismaService.impersonationAuditLog.create as jest.Mock
      ).mockResolvedValue({});

      // Act
      await service.endSession(mockSessionId, "Completed troubleshooting");

      // Assert
      expect(prismaService.impersonationAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: mockSessionId,
          action: "SESSION_ENDED",
        }),
      });
    });
  });

  describe("validateSession", () => {
    it("should return ImpersonationContext for valid session", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(mockSession);

      // Act
      const result = await service.validateSession(mockSessionId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.sessionId).toBe(mockSessionId);
      expect(result?.operatorUserId).toBe(mockOperatorUserId);
      expect(result?.operatorRole).toBe(InternalRole.SUPPORT_L1);
      expect(result?.targetOrganizationId).toBe(mockTargetOrgId);
      expect(result?.reason).toBe(mockSession.reason);
      expect(result?.ticketId).toBe(mockSession.ticketId);
      expect(result?.expiresAt).toEqual(mockSession.expiresAt);
    });

    it("should return null when session not found", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(null);

      // Act
      const result = await service.validateSession(mockSessionId);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when session is ended", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(mockEndedSession);

      // Act
      const result = await service.validateSession(mockSessionId);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when session is expired", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(mockExpiredSession);

      // Act
      const result = await service.validateSession(mockSessionId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("getRemainingSeconds", () => {
    it("should return remaining seconds for active session", async () => {
      // Arrange
      const futureExpiry = new Date(Date.now() + 60 * 1000); // 60 seconds from now
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue({
        endedAt: null,
        expiresAt: futureExpiry,
      });

      // Act
      const result = await service.getRemainingSeconds(mockSessionId);

      // Assert
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(60);
    });

    it("should return 0 when session not found", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(null);

      // Act
      const result = await service.getRemainingSeconds(mockSessionId);

      // Assert
      expect(result).toBe(0);
    });

    it("should return 0 when session is ended", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue({
        endedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 1000),
      });

      // Act
      const result = await service.getRemainingSeconds(mockSessionId);

      // Assert
      expect(result).toBe(0);
    });

    it("should return 0 when session is expired", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue({
        endedAt: null,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      // Act
      const result = await service.getRemainingSeconds(mockSessionId);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe("getSessionWithDetails", () => {
    it("should return session with organization and operator details", async () => {
      // Arrange
      const sessionWithDetails = {
        ...mockSession,
        organization: { id: mockTargetOrgId, name: mockOrgName },
        operator: {
          id: mockOperatorUserId,
          email: mockOperatorEmail,
          name: "Support User",
        },
      };
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(sessionWithDetails);

      // Act
      const result = await service.getSessionWithDetails(mockSessionId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.organization?.name).toBe(mockOrgName);
      expect(result?.operator?.email).toBe(mockOperatorEmail);
      expect(
        prismaService.impersonationSession.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        include: {
          organization: { select: { id: true, name: true } },
          operator: { select: { id: true, email: true, name: true } },
        },
      });
    });
  });

  describe("getActiveSessions", () => {
    it("should return list of active sessions for operator", async () => {
      // Arrange
      const activeSessions = [
        {
          ...mockSession,
          organization: { id: mockTargetOrgId, name: mockOrgName },
        },
      ];
      (
        prismaService.impersonationSession.findMany as jest.Mock
      ).mockResolvedValue(activeSessions);

      // Act
      const result = await service.getActiveSessions(mockOperatorUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].organization?.name).toBe(mockOrgName);
      expect(prismaService.impersonationSession.findMany).toHaveBeenCalledWith({
        where: {
          operatorUserId: mockOperatorUserId,
          endedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        include: {
          organization: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: "desc" },
      });
    });

    it("should return empty array when no active sessions", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findMany as jest.Mock
      ).mockResolvedValue([]);

      // Act
      const result = await service.getActiveSessions(mockOperatorUserId);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe("logAction", () => {
    it("should create audit log entry with session context", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue({
        organizationId: mockTargetOrgId,
      });
      (
        prismaService.impersonationAuditLog.create as jest.Mock
      ).mockResolvedValue({});

      // Act
      await service.logAction(mockSessionId, "VIEW_CASE", "Case", "case-123", {
        caseNumber: "C-2024-001",
      });

      // Assert
      expect(prismaService.impersonationAuditLog.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockTargetOrgId,
          sessionId: mockSessionId,
          action: "VIEW_CASE",
          entityType: "Case",
          entityId: "case-123",
          details: { caseNumber: "C-2024-001" },
        },
      });
    });

    it("should skip logging when session not found", async () => {
      // Arrange
      (
        prismaService.impersonationSession.findUnique as jest.Mock
      ).mockResolvedValue(null);

      // Act
      await service.logAction(mockSessionId, "VIEW_CASE", "Case", "case-123");

      // Assert
      expect(prismaService.impersonationAuditLog.create).not.toHaveBeenCalled();
    });
  });

  describe("getSessionAuditLogs", () => {
    it("should return audit logs for a session with default limit", async () => {
      // Arrange
      const mockLogs = [
        { id: "log-1", action: "VIEW_CASE", sessionId: mockSessionId },
        { id: "log-2", action: "UPDATE_USER", sessionId: mockSessionId },
      ];
      (
        prismaService.impersonationAuditLog.findMany as jest.Mock
      ).mockResolvedValue(mockLogs);

      // Act
      const result = await service.getSessionAuditLogs(mockSessionId);

      // Assert
      expect(result).toHaveLength(2);
      expect(prismaService.impersonationAuditLog.findMany).toHaveBeenCalledWith(
        {
          where: { sessionId: mockSessionId },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      );
    });

    it("should respect custom limit parameter", async () => {
      // Arrange
      (
        prismaService.impersonationAuditLog.findMany as jest.Mock
      ).mockResolvedValue([]);

      // Act
      await service.getSessionAuditLogs(mockSessionId, 50);

      // Assert
      expect(prismaService.impersonationAuditLog.findMany).toHaveBeenCalledWith(
        {
          where: { sessionId: mockSessionId },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      );
    });
  });

  describe("getOrganizationAuditLogs", () => {
    it("should return all audit logs for an organization", async () => {
      // Arrange
      const mockLogs = [
        { id: "log-1", session: { operatorUserId: mockOperatorUserId } },
      ];
      (
        prismaService.impersonationAuditLog.findMany as jest.Mock
      ).mockResolvedValue(mockLogs);

      // Act
      const result = await service.getOrganizationAuditLogs(mockTargetOrgId);

      // Assert
      expect(result).toHaveLength(1);
      expect(prismaService.impersonationAuditLog.findMany).toHaveBeenCalledWith(
        {
          where: {
            session: { targetOrganizationId: mockTargetOrgId },
          },
          include: {
            session: {
              select: {
                operatorUserId: true,
                operatorRole: true,
                reason: true,
                ticketId: true,
                operator: { select: { email: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      );
    });

    it("should filter by date range when provided", async () => {
      // Arrange
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");
      (
        prismaService.impersonationAuditLog.findMany as jest.Mock
      ).mockResolvedValue([]);

      // Act
      await service.getOrganizationAuditLogs(
        mockTargetOrgId,
        startDate,
        endDate,
      );

      // Assert
      expect(prismaService.impersonationAuditLog.findMany).toHaveBeenCalledWith(
        {
          where: {
            session: { targetOrganizationId: mockTargetOrgId },
            createdAt: { gte: startDate, lte: endDate },
          },
          include: expect.any(Object),
          orderBy: { createdAt: "desc" },
        },
      );
    });

    it("should filter by start date only when endDate not provided", async () => {
      // Arrange
      const startDate = new Date("2024-01-01");
      (
        prismaService.impersonationAuditLog.findMany as jest.Mock
      ).mockResolvedValue([]);

      // Act
      await service.getOrganizationAuditLogs(mockTargetOrgId, startDate);

      // Assert
      expect(prismaService.impersonationAuditLog.findMany).toHaveBeenCalledWith(
        {
          where: {
            session: { targetOrganizationId: mockTargetOrgId },
            createdAt: { gte: startDate },
          },
          include: expect.any(Object),
          orderBy: { createdAt: "desc" },
        },
      );
    });
  });

  describe("permission checks", () => {
    it("should verify SUPPORT_L1 has IMPERSONATE permission", () => {
      // Verify the role mapping
      const permissions = ROLE_PERMISSIONS[InternalRole.SUPPORT_L1];
      expect(permissions).toContain(InternalPermission.IMPERSONATE);
    });

    it("should verify CLIENT_SUCCESS lacks IMPERSONATE permission", () => {
      // Verify the role mapping
      const permissions = ROLE_PERMISSIONS[InternalRole.CLIENT_SUCCESS];
      expect(permissions).not.toContain(InternalPermission.IMPERSONATE);
    });

    it("should verify ADMIN has ALL permission (can impersonate)", () => {
      // Verify the role mapping
      const permissions = ROLE_PERMISSIONS[InternalRole.ADMIN];
      expect(permissions).toContain(InternalPermission.ALL);
    });

    it("should verify HOTLINE_OPS lacks IMPERSONATE permission", () => {
      // Verify the role mapping
      const permissions = ROLE_PERMISSIONS[InternalRole.HOTLINE_OPS];
      expect(permissions).not.toContain(InternalPermission.IMPERSONATE);
    });
  });
});
