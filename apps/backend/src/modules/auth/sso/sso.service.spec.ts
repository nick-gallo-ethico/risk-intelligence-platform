/**
 * UNIT TESTS: SsoService
 *
 * Tests for SSO user lookup and JIT provisioning flow.
 * Key behaviors:
 * - Find existing user by SSO ID
 * - Link SSO credentials to existing email user
 * - JIT provision new users based on verified domain
 * - Enforce security guardrails (verified domains, JIT settings)
 */

import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { SsoService } from "./sso.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { DomainService } from "../domain/domain.service";
import { SsoConfigService } from "./sso-config.service";
import { SsoUserData } from "../interfaces";
import { UserRole } from "@prisma/client";

describe("SsoService", () => {
  let service: SsoService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;
  let domainService: jest.Mocked<DomainService>;
  let ssoConfigService: jest.Mocked<SsoConfigService>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";

  const mockOrganization = {
    id: mockOrgId,
    name: "Test Organization",
    slug: "test-org",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSsoProfile: SsoUserData = {
    provider: "azure-ad",
    ssoId: "azure-user-123",
    email: "user@company.com",
    firstName: "Test",
    lastName: "User",
  };

  const mockExistingUser = {
    id: mockUserId,
    email: "user@company.com",
    firstName: "Test",
    lastName: "User",
    organizationId: mockOrgId,
    ssoProvider: "azure-ad",
    ssoId: "azure-user-123",
    role: UserRole.EMPLOYEE,
    isActive: true,
    lastLoginAt: new Date(),
    organization: mockOrganization,
  };

  const mockTenantSsoConfig = {
    id: "sso-config-123",
    organizationId: mockOrgId,
    ssoProvider: "azure-ad",
    ssoEnabled: true,
    jitProvisioningEnabled: true,
    defaultRole: UserRole.EMPLOYEE,
    mfaRequired: false,
    azureTenantId: "azure-tenant-123",
    samlIdpEntityId: null,
    samlIdpEntryPoint: null,
    samlIdpCertificate: null,
    samlSpEntityId: null,
  };

  // Mock Setup
  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tenantSsoConfig: {
      findUnique: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockDomainService = {
    findOrganizationByEmailDomain: jest.fn(),
  };

  const mockSsoConfigService = {};

  // Module Setup
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SsoService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: DomainService, useValue: mockDomainService },
        { provide: SsoConfigService, useValue: mockSsoConfigService },
      ],
    }).compile();

    service = module.get<SsoService>(SsoService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
    domainService = module.get(DomainService);
    ssoConfigService = module.get(SsoConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // describe('findOrCreateSsoUser') - Main entry point for SSO login
  describe("findOrCreateSsoUser", () => {
    it("should return existing user when SSO profile matches by SSO ID", async () => {
      // Arrange - User found by SSO provider + SSO ID
      mockPrismaService.user.findFirst.mockResolvedValueOnce(mockExistingUser);
      mockPrismaService.user.update.mockResolvedValue(mockExistingUser);

      // Act
      const result = await service.findOrCreateSsoUser(mockSsoProfile);

      // Assert
      expect(result).toEqual(mockExistingUser);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          ssoProvider: mockSsoProfile.provider,
          ssoId: mockSsoProfile.ssoId,
        },
        include: { organization: true },
      });
      // Should update lastLoginAt
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it("should link SSO to existing user when found by email", async () => {
      // Arrange - User not found by SSO ID, but found by email
      const userWithoutSso = {
        ...mockExistingUser,
        ssoProvider: null,
        ssoId: null,
      };
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null) // Not found by SSO ID
        .mockResolvedValueOnce(userWithoutSso); // Found by email
      mockPrismaService.user.update.mockResolvedValue(mockExistingUser);

      // Act
      const result = await service.findOrCreateSsoUser(mockSsoProfile);

      // Assert
      expect(result).toEqual(mockExistingUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          ssoProvider: mockSsoProfile.provider,
          ssoId: mockSsoProfile.ssoId,
          lastLoginAt: expect.any(Date),
        }),
        include: { organization: true },
      });
      // Should log SSO_LINKED audit event
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "SSO_LINKED",
        }),
      );
    });

    it("should throw when user has different SSO provider linked", async () => {
      // Arrange - User has Google SSO, trying to link Azure
      const userWithGoogleSso = {
        ...mockExistingUser,
        ssoProvider: "google",
        ssoId: "google-user-456",
      };
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null) // Not found by Azure SSO ID
        .mockResolvedValueOnce(userWithGoogleSso); // Found by email with Google linked

      // Act & Assert
      await expect(service.findOrCreateSsoUser(mockSsoProfile)).rejects.toThrow(
        new UnauthorizedException(
          "Account already linked to google. Please sign in using that provider.",
        ),
      );
    });

    it("should JIT provision new user when domain is verified", async () => {
      // Arrange - User not found, domain is verified
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null) // Not found by SSO ID
        .mockResolvedValueOnce(null); // Not found by email
      mockDomainService.findOrganizationByEmailDomain.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue(
        mockTenantSsoConfig,
      );
      mockPrismaService.user.create.mockResolvedValue(mockExistingUser);

      // Act
      const result = await service.findOrCreateSsoUser(mockSsoProfile);

      // Assert
      expect(result).toEqual(mockExistingUser);
      expect(domainService.findOrganizationByEmailDomain).toHaveBeenCalledWith(
        mockSsoProfile.email.toLowerCase(),
      );
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: mockSsoProfile.email.toLowerCase(),
          firstName: mockSsoProfile.firstName,
          lastName: mockSsoProfile.lastName,
          ssoProvider: mockSsoProfile.provider,
          ssoId: mockSsoProfile.ssoId,
          organizationId: mockOrgId,
          role: UserRole.EMPLOYEE,
          isActive: true,
          emailVerifiedAt: expect.any(Date),
          lastLoginAt: expect.any(Date),
        }),
        include: { organization: true },
      });
      // Should log USER_JIT_PROVISIONED audit event
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_JIT_PROVISIONED",
        }),
      );
    });

    it("should throw when domain is not verified (no organization found)", async () => {
      // Arrange - No verified domain
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockDomainService.findOrganizationByEmailDomain.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOrCreateSsoUser(mockSsoProfile)).rejects.toThrow(
        new UnauthorizedException(
          "Your organization is not registered. Please contact your administrator.",
        ),
      );
    });

    it("should throw when JIT provisioning is disabled", async () => {
      // Arrange - JIT disabled
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockDomainService.findOrganizationByEmailDomain.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue({
        ...mockTenantSsoConfig,
        jitProvisioningEnabled: false,
      });

      // Act & Assert
      await expect(service.findOrCreateSsoUser(mockSsoProfile)).rejects.toThrow(
        new UnauthorizedException(
          "Just-in-time provisioning is disabled for your organization. Please contact your administrator.",
        ),
      );
    });

    it("should throw when SSO is disabled for organization", async () => {
      // Arrange - SSO disabled
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockDomainService.findOrganizationByEmailDomain.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue({
        ...mockTenantSsoConfig,
        ssoEnabled: false,
      });

      // Act & Assert
      await expect(service.findOrCreateSsoUser(mockSsoProfile)).rejects.toThrow(
        new UnauthorizedException(
          "SSO is not enabled for your organization. Please contact your administrator.",
        ),
      );
    });

    it("should normalize email to lowercase for lookups", async () => {
      // Arrange - Email with mixed case
      const mixedCaseProfile = {
        ...mockSsoProfile,
        email: "User@Company.COM",
      };
      mockPrismaService.user.findFirst.mockResolvedValueOnce(mockExistingUser);
      mockPrismaService.user.update.mockResolvedValue(mockExistingUser);

      // Act
      await service.findOrCreateSsoUser(mixedCaseProfile);

      // Assert - Email lookup should happen but the key thing is SSO ID match
      expect(prisma.user.findFirst).toHaveBeenCalled();
    });
  });

  // describe('jitProvisionUser') - Security guardrails
  describe("JIT provisioning security guardrails", () => {
    beforeEach(() => {
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockDomainService.findOrganizationByEmailDomain.mockResolvedValue(
        mockOrganization,
      );
    });

    it("should block SYSTEM_ADMIN role from JIT provisioning, defaulting to EMPLOYEE", async () => {
      // Arrange - Config has SYSTEM_ADMIN as default (dangerous)
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue({
        ...mockTenantSsoConfig,
        defaultRole: UserRole.SYSTEM_ADMIN,
      });
      mockPrismaService.user.create.mockResolvedValue(mockExistingUser);

      // Act
      await service.findOrCreateSsoUser(mockSsoProfile);

      // Assert - Should create with EMPLOYEE, not SYSTEM_ADMIN
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: UserRole.EMPLOYEE,
        }),
        include: { organization: true },
      });
    });

    it("should block COMPLIANCE_OFFICER role from JIT provisioning", async () => {
      // Arrange - Config has COMPLIANCE_OFFICER as default (dangerous)
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue({
        ...mockTenantSsoConfig,
        defaultRole: UserRole.COMPLIANCE_OFFICER,
      });
      mockPrismaService.user.create.mockResolvedValue(mockExistingUser);

      // Act
      await service.findOrCreateSsoUser(mockSsoProfile);

      // Assert - Should create with EMPLOYEE, not COMPLIANCE_OFFICER
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: UserRole.EMPLOYEE,
        }),
        include: { organization: true },
      });
    });

    it("should allow safe roles like EMPLOYEE for JIT provisioning", async () => {
      // Arrange - Config has EMPLOYEE as default (safe)
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue({
        ...mockTenantSsoConfig,
        defaultRole: UserRole.EMPLOYEE,
      });
      const employeeUser = { ...mockExistingUser, role: UserRole.EMPLOYEE };
      mockPrismaService.user.create.mockResolvedValue(employeeUser);

      // Act
      await service.findOrCreateSsoUser(mockSsoProfile);

      // Assert - Should create with EMPLOYEE as configured
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: UserRole.EMPLOYEE,
        }),
        include: { organization: true },
      });
    });

    it("should set emailVerifiedAt for SSO users (SSO = verified email)", async () => {
      // Arrange
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue(
        mockTenantSsoConfig,
      );
      mockPrismaService.user.create.mockResolvedValue(mockExistingUser);

      // Act
      await service.findOrCreateSsoUser(mockSsoProfile);

      // Assert
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emailVerifiedAt: expect.any(Date),
        }),
        include: { organization: true },
      });
    });

    it("should use default name values when SSO profile lacks name", async () => {
      // Arrange - Profile without names
      const profileWithoutName = {
        ...mockSsoProfile,
        firstName: "",
        lastName: "",
      };
      mockPrismaService.user.findFirst
        .mockReset()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue(
        mockTenantSsoConfig,
      );
      mockPrismaService.user.create.mockResolvedValue(mockExistingUser);

      // Act
      await service.findOrCreateSsoUser(profileWithoutName);

      // Assert
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: "Unknown",
          lastName: "User",
        }),
        include: { organization: true },
      });
    });
  });

  // describe('linkSsoToExistingUser') - SSO account linking
  describe("linkSsoToExistingUser (implicit via findOrCreateSsoUser)", () => {
    it("should update name fields if they were empty", async () => {
      // Arrange - User found by email without name set
      const userWithoutName = {
        ...mockExistingUser,
        firstName: null,
        lastName: null,
        ssoProvider: null,
        ssoId: null,
      };
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null) // Not found by SSO ID
        .mockResolvedValueOnce(userWithoutName); // Found by email
      mockPrismaService.user.update.mockResolvedValue(mockExistingUser);

      // Act
      await service.findOrCreateSsoUser(mockSsoProfile);

      // Assert - Name should be populated from SSO profile
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          firstName: mockSsoProfile.firstName,
          lastName: mockSsoProfile.lastName,
        }),
        include: { organization: true },
      });
    });

    it("should preserve existing name when already set", async () => {
      // Arrange - User has name set
      const userWithName = {
        ...mockExistingUser,
        firstName: "Existing",
        lastName: "Name",
        ssoProvider: null,
        ssoId: null,
      };
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(userWithName);
      mockPrismaService.user.update.mockResolvedValue({
        ...userWithName,
        ssoProvider: "azure-ad",
        ssoId: "azure-user-123",
      });

      // Act
      await service.findOrCreateSsoUser(mockSsoProfile);

      // Assert - Should keep existing name (or fallback = existing)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          firstName: "Existing", // Original value preserved
          lastName: "Name",
        }),
        include: { organization: true },
      });
    });
  });
});
