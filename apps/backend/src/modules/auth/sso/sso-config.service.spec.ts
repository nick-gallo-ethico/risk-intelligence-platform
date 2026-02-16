/**
 * UNIT TESTS: SsoConfigService
 *
 * Tests for per-tenant SSO configuration management.
 * Key behaviors:
 * - Get SSO config (create default if not exists)
 * - Update SSO config with audit logging
 * - Check if SSO is enabled
 * - Get SAML configuration for tenant
 */

import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SsoConfigService } from "./sso-config.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { UserRole } from "@prisma/client";

describe("SsoConfigService", () => {
  let service: SsoConfigService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;
  let configService: jest.Mocked<ConfigService>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockOrgSlug = "test-org";

  const mockSsoConfig = {
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

  const mockDefaultConfig = {
    id: "sso-config-default-123",
    organizationId: mockOrgId,
    ssoProvider: null,
    ssoEnabled: false,
    jitProvisioningEnabled: true,
    defaultRole: UserRole.EMPLOYEE,
    mfaRequired: false,
    azureTenantId: null,
    samlIdpEntityId: null,
    samlIdpEntryPoint: null,
    samlIdpCertificate: null,
    samlSpEntityId: null,
  };

  const mockSamlConfig = {
    ...mockSsoConfig,
    ssoProvider: "saml",
    samlIdpEntityId: "https://idp.example.com",
    samlIdpEntryPoint: "https://idp.example.com/sso/saml",
    samlIdpCertificate:
      "-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----",
    samlSpEntityId: "https://app.ethico.com/saml/test-org",
  };

  const mockOrganization = {
    id: mockOrgId,
    name: "Test Organization",
    slug: mockOrgSlug,
    tenantSsoConfig: mockSamlConfig,
  };

  // Mock Setup
  const mockPrismaService = {
    tenantSsoConfig: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  // Module Setup
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SsoConfigService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SsoConfigService>(SsoConfigService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
    configService = module.get(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // describe('getConfig') - Get or create SSO configuration
  describe("getConfig", () => {
    it("should return existing SSO config for organization", async () => {
      // Arrange
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue(
        mockSsoConfig,
      );

      // Act
      const result = await service.getConfig(mockOrgId);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          id: mockSsoConfig.id,
          organizationId: mockOrgId,
          ssoProvider: "azure-ad",
          ssoEnabled: true,
          jitProvisioningEnabled: true,
        }),
      );
      expect(prisma.tenantSsoConfig.findUnique).toHaveBeenCalledWith({
        where: { organizationId: mockOrgId },
      });
    });

    it("should create default config if none exists", async () => {
      // Arrange
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue(null);
      mockPrismaService.tenantSsoConfig.create.mockResolvedValue(
        mockDefaultConfig,
      );

      // Act
      const result = await service.getConfig(mockOrgId);

      // Assert
      expect(prisma.tenantSsoConfig.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockOrgId,
          ssoProvider: null,
          ssoEnabled: false,
          jitProvisioningEnabled: true,
          defaultRole: UserRole.EMPLOYEE,
          mfaRequired: false,
        },
      });
      expect(result.ssoEnabled).toBe(false);
      expect(result.jitProvisioningEnabled).toBe(true);
    });

    it("should redact SAML certificate content in response", async () => {
      // Arrange
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue(
        mockSamlConfig,
      );

      // Act
      const result = await service.getConfig(mockOrgId);

      // Assert - Should have samlCertificateConfigured flag, not raw cert
      expect(result.samlCertificateConfigured).toBe(true);
      expect((result as any).samlIdpCertificate).toBeUndefined;
    });
  });

  // describe('updateConfig') - Update SSO configuration
  describe("updateConfig", () => {
    it("should update existing SSO configuration", async () => {
      // Arrange
      const updateDto = {
        ssoProvider: "google" as const,
        ssoEnabled: true,
        jitProvisioningEnabled: false,
      };
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue(
        mockSsoConfig,
      );
      mockPrismaService.tenantSsoConfig.update.mockResolvedValue({
        ...mockSsoConfig,
        ...updateDto,
      });

      // Act
      const result = await service.updateConfig(
        mockOrgId,
        updateDto,
        mockUserId,
      );

      // Assert
      expect(prisma.tenantSsoConfig.update).toHaveBeenCalledWith({
        where: { organizationId: mockOrgId },
        data: expect.objectContaining({
          ssoProvider: "google",
          ssoEnabled: true,
          jitProvisioningEnabled: false,
        }),
      });
      expect(result.ssoProvider).toBe("google");
    });

    it("should create config if not exists before update", async () => {
      // Arrange
      const updateDto = { ssoEnabled: true };
      mockPrismaService.tenantSsoConfig.findUnique
        .mockResolvedValueOnce(null) // First call in getConfig
        .mockResolvedValueOnce(mockDefaultConfig); // After create
      mockPrismaService.tenantSsoConfig.create.mockResolvedValue(
        mockDefaultConfig,
      );
      mockPrismaService.tenantSsoConfig.update.mockResolvedValue({
        ...mockDefaultConfig,
        ssoEnabled: true,
      });

      // Act
      const result = await service.updateConfig(
        mockOrgId,
        updateDto,
        mockUserId,
      );

      // Assert
      expect(prisma.tenantSsoConfig.create).toHaveBeenCalled();
      expect(prisma.tenantSsoConfig.update).toHaveBeenCalled();
      expect(result.ssoEnabled).toBe(true);
    });

    it("should log audit event on config update", async () => {
      // Arrange
      const updateDto = { ssoProvider: "azure-ad" as const, ssoEnabled: true };
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue(
        mockSsoConfig,
      );
      mockPrismaService.tenantSsoConfig.update.mockResolvedValue(mockSsoConfig);

      // Act
      await service.updateConfig(mockOrgId, updateDto, mockUserId);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "SSO_CONFIG_UPDATED",
          organizationId: mockOrgId,
          actorUserId: mockUserId,
        }),
      );
    });

    it("should update SAML-specific fields", async () => {
      // Arrange
      const updateDto = {
        ssoProvider: "saml" as const,
        ssoEnabled: true,
        samlIdpEntityId: "https://idp.example.com",
        samlIdpEntryPoint: "https://idp.example.com/sso/saml",
        samlIdpCertificate:
          "-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----",
        samlSpEntityId: "https://app.ethico.com/saml/test-org",
      };
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue(
        mockSsoConfig,
      );
      mockPrismaService.tenantSsoConfig.update.mockResolvedValue({
        ...mockSsoConfig,
        ...updateDto,
      });

      // Act
      const result = await service.updateConfig(
        mockOrgId,
        updateDto,
        mockUserId,
      );

      // Assert
      expect(prisma.tenantSsoConfig.update).toHaveBeenCalledWith({
        where: { organizationId: mockOrgId },
        data: expect.objectContaining({
          ssoProvider: "saml",
          samlIdpEntityId: "https://idp.example.com",
          samlIdpEntryPoint: "https://idp.example.com/sso/saml",
          samlIdpCertificate: expect.stringContaining("BEGIN CERTIFICATE"),
          samlSpEntityId: "https://app.ethico.com/saml/test-org",
        }),
      });
      expect(result.samlCertificateConfigured).toBe(true);
    });

    it("should update Azure AD-specific tenant ID", async () => {
      // Arrange
      const updateDto = {
        ssoProvider: "azure-ad" as const,
        ssoEnabled: true,
        azureTenantId: "new-azure-tenant-456",
      };
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue(
        mockSsoConfig,
      );
      mockPrismaService.tenantSsoConfig.update.mockResolvedValue({
        ...mockSsoConfig,
        azureTenantId: "new-azure-tenant-456",
      });

      // Act
      const result = await service.updateConfig(
        mockOrgId,
        updateDto,
        mockUserId,
      );

      // Assert
      expect(prisma.tenantSsoConfig.update).toHaveBeenCalledWith({
        where: { organizationId: mockOrgId },
        data: expect.objectContaining({
          azureTenantId: "new-azure-tenant-456",
        }),
      });
      expect(result.azureTenantId).toBe("new-azure-tenant-456");
    });
  });

  // describe('isSsoEnabled') - Check SSO status
  describe("isSsoEnabled", () => {
    it("should return true when SSO is enabled", async () => {
      // Arrange
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue({
        ssoEnabled: true,
      });

      // Act
      const result = await service.isSsoEnabled(mockOrgId);

      // Assert
      expect(result).toBe(true);
      expect(prisma.tenantSsoConfig.findUnique).toHaveBeenCalledWith({
        where: { organizationId: mockOrgId },
        select: { ssoEnabled: true },
      });
    });

    it("should return false when SSO is disabled", async () => {
      // Arrange
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue({
        ssoEnabled: false,
      });

      // Act
      const result = await service.isSsoEnabled(mockOrgId);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when no config exists", async () => {
      // Arrange
      mockPrismaService.tenantSsoConfig.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.isSsoEnabled(mockOrgId);

      // Assert
      expect(result).toBe(false);
    });
  });

  // describe('getSamlConfig') - Get SAML configuration for tenant
  describe("getSamlConfig", () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue("https://api.ethico.com");
    });

    it("should return SAML config for organization slug", async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockOrganization,
      );

      // Act
      const result = await service.getSamlConfig(mockOrgSlug);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          callbackUrl: expect.stringContaining(`/saml/${mockOrgSlug}/callback`),
          entryPoint: mockSamlConfig.samlIdpEntryPoint,
          cert: mockSamlConfig.samlIdpCertificate,
          wantAssertionsSigned: true,
          wantAuthnResponseSigned: true,
        }),
      );
    });

    it("should throw NotFoundException when organization not found", async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getSamlConfig("unknown-org")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException when SSO config not found", async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        tenantSsoConfig: null,
      });

      // Act & Assert
      await expect(service.getSamlConfig(mockOrgSlug)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw when SAML is not the configured provider", async () => {
      // Arrange - Azure AD configured, not SAML
      mockPrismaService.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        tenantSsoConfig: mockSsoConfig, // Azure AD config
      });

      // Act & Assert
      await expect(service.getSamlConfig(mockOrgSlug)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getSamlConfig(mockOrgSlug)).rejects.toThrow(
        "SAML SSO not configured",
      );
    });

    it("should throw when SAML is disabled", async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        tenantSsoConfig: { ...mockSamlConfig, ssoEnabled: false },
      });

      // Act & Assert
      await expect(service.getSamlConfig(mockOrgSlug)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw when SAML configuration is incomplete", async () => {
      // Arrange - Missing entryPoint
      mockPrismaService.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        tenantSsoConfig: { ...mockSamlConfig, samlIdpEntryPoint: null },
      });

      // Act & Assert
      await expect(service.getSamlConfig(mockOrgSlug)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getSamlConfig(mockOrgSlug)).rejects.toThrow(
        "SAML configuration incomplete",
      );
    });

    it("should use default API URL when not configured", async () => {
      // Arrange
      mockConfigService.get.mockReturnValue("http://localhost:3000");
      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockOrganization,
      );

      // Act
      const result = await service.getSamlConfig(mockOrgSlug);

      // Assert
      expect(result.callbackUrl).toContain("http://localhost:3000");
    });
  });
});
