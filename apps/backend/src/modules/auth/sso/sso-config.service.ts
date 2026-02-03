import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { UpdateSsoConfigDto, SsoConfigResponseDto } from "./dto/sso.dto";
import { SamlConfig } from "../interfaces";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  UserRole,
} from "@prisma/client";

/**
 * Service for managing per-tenant SSO configuration.
 *
 * Each organization has one TenantSsoConfig that controls:
 * - Which SSO provider is active (Azure AD, Google, SAML)
 * - Whether SSO is enabled/required
 * - JIT provisioning settings
 * - MFA requirements
 * - Provider-specific settings (Azure tenant ID, SAML IdP config)
 */
@Injectable()
export class SsoConfigService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private configService: ConfigService,
  ) {}

  /**
   * Get SSO configuration for an organization.
   * Creates default config if none exists.
   */
  async getConfig(organizationId: string): Promise<SsoConfigResponseDto> {
    let config = await this.prisma.tenantSsoConfig.findUnique({
      where: { organizationId },
    });

    // Create default config if none exists
    if (!config) {
      config = await this.prisma.tenantSsoConfig.create({
        data: {
          organizationId,
          ssoProvider: null,
          ssoEnabled: false,
          jitProvisioningEnabled: true,
          defaultRole: UserRole.EMPLOYEE,
          mfaRequired: false,
        },
      });
    }

    return this.toResponseDto(config);
  }

  /**
   * Update SSO configuration for an organization.
   */
  async updateConfig(
    organizationId: string,
    dto: UpdateSsoConfigDto,
    userId: string,
  ): Promise<SsoConfigResponseDto> {
    // Ensure config exists
    await this.getConfig(organizationId);

    const config = await this.prisma.tenantSsoConfig.update({
      where: { organizationId },
      data: {
        ssoProvider: dto.ssoProvider,
        ssoEnabled: dto.ssoEnabled,
        jitProvisioningEnabled: dto.jitProvisioningEnabled,
        defaultRole: dto.defaultRole as UserRole,
        mfaRequired: dto.mfaRequired,
        azureTenantId: dto.azureTenantId,
        samlIdpEntityId: dto.samlIdpEntityId,
        samlIdpEntryPoint: dto.samlIdpEntryPoint,
        samlIdpCertificate: dto.samlIdpCertificate,
        samlSpEntityId: dto.samlSpEntityId,
      },
    });

    await this.auditService.log({
      entityType: AuditEntityType.ORGANIZATION,
      entityId: organizationId,
      organizationId,
      action: "SSO_CONFIG_UPDATED",
      actionDescription: `SSO configuration updated: provider=${dto.ssoProvider}, enabled=${dto.ssoEnabled}`,
      actionCategory: AuditActionCategory.SECURITY,
      actorUserId: userId,
      actorType: ActorType.USER,
      changes: {
        ssoProvider: { old: null, new: dto.ssoProvider },
        ssoEnabled: { old: null, new: dto.ssoEnabled },
        jitProvisioningEnabled: { old: null, new: dto.jitProvisioningEnabled },
      },
    });

    return this.toResponseDto(config);
  }

  /**
   * Check if SSO is enabled for an organization.
   */
  async isSsoEnabled(organizationId: string): Promise<boolean> {
    const config = await this.prisma.tenantSsoConfig.findUnique({
      where: { organizationId },
      select: { ssoEnabled: true },
    });
    return config?.ssoEnabled ?? false;
  }

  /**
   * Get SAML configuration for a tenant slug.
   * Used by SAML strategy for per-tenant IdP settings.
   */
  async getSamlConfig(organizationSlug: string): Promise<SamlConfig> {
    const org = await this.prisma.organization.findUnique({
      where: { slug: organizationSlug },
      include: { tenantSsoConfig: true },
    });

    if (!org || !org.tenantSsoConfig) {
      throw new NotFoundException("Organization or SSO config not found");
    }

    const config = org.tenantSsoConfig;
    if (config.ssoProvider !== "saml" || !config.ssoEnabled) {
      throw new NotFoundException(
        "SAML SSO not configured for this organization",
      );
    }

    if (!config.samlIdpEntryPoint || !config.samlIdpCertificate) {
      throw new NotFoundException("SAML configuration incomplete");
    }

    const apiUrl = this.configService.get<string>(
      "API_URL",
      "http://localhost:3000",
    );

    return {
      callbackUrl: `${apiUrl}/api/v1/auth/saml/${organizationSlug}/callback`,
      entryPoint: config.samlIdpEntryPoint,
      issuer: config.samlSpEntityId || `${apiUrl}/saml/${organizationSlug}`,
      cert: config.samlIdpCertificate,
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: true,
      signatureAlgorithm: "sha256",
    };
  }

  /**
   * Convert database model to response DTO.
   * Redacts sensitive fields like SAML certificate content.
   */
  private toResponseDto(config: {
    id: string;
    organizationId: string;
    ssoProvider: string | null;
    ssoEnabled: boolean;
    jitProvisioningEnabled: boolean;
    defaultRole: UserRole;
    mfaRequired: boolean;
    azureTenantId: string | null;
    samlIdpEntityId: string | null;
    samlIdpEntryPoint: string | null;
    samlIdpCertificate: string | null;
    samlSpEntityId: string | null;
  }): SsoConfigResponseDto {
    return {
      id: config.id,
      organizationId: config.organizationId,
      ssoProvider: config.ssoProvider,
      ssoEnabled: config.ssoEnabled,
      jitProvisioningEnabled: config.jitProvisioningEnabled,
      // Cast Prisma UserRole to decorator UserRole (same values, different enums)
      defaultRole: config.defaultRole as unknown as SsoConfigResponseDto["defaultRole"],
      mfaRequired: config.mfaRequired,
      azureTenantId: config.azureTenantId,
      samlIdpEntityId: config.samlIdpEntityId,
      samlIdpEntryPoint: config.samlIdpEntryPoint,
      samlCertificateConfigured: !!config.samlIdpCertificate,
      samlSpEntityId: config.samlSpEntityId,
    };
  }
}
