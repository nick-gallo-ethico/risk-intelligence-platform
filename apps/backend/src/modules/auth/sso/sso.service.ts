import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  User,
  Organization,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { DomainService } from "../domain/domain.service";
import { SsoConfigService } from "./sso-config.service";
import { SsoUserData } from "../interfaces";

/**
 * Core SSO service that handles user lookup and JIT provisioning.
 * Used by all SSO strategies (Azure AD, Google, SAML).
 *
 * JIT Provisioning Flow:
 * 1. Try to find user by SSO provider + SSO ID (existing SSO user)
 * 2. If not found, try to find by email (link SSO to existing account)
 * 3. If not found, JIT provision new user based on verified domain
 *
 * Security: JIT provisioning ONLY works for verified domains.
 * This prevents attackers from claiming arbitrary domains.
 */
@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private domainService: DomainService,
    private ssoConfigService: SsoConfigService,
  ) {}

  /**
   * Find or create a user during SSO callback.
   * This is the main entry point for all SSO strategies.
   *
   * @param ssoUser - User data from SSO provider
   * @returns User entity with organization included
   * @throws UnauthorizedException if user cannot be found/created
   */
  async findOrCreateSsoUser(
    ssoUser: SsoUserData,
  ): Promise<User & { organization: Organization }> {
    const email = ssoUser.email.toLowerCase();

    this.logger.log(`SSO login attempt: ${email} via ${ssoUser.provider}`);

    // 1. Try to find user by SSO ID (same provider)
    let user = await this.prisma.user.findFirst({
      where: {
        ssoProvider: ssoUser.provider,
        ssoId: ssoUser.ssoId,
      },
      include: { organization: true },
    });

    if (user) {
      await this.updateLastLogin(user);
      await this.logSsoLogin(user, ssoUser.provider, "SSO_ID_MATCH");
      return user as User & { organization: Organization };
    }

    // 2. Try to find user by email (link SSO to existing account)
    user = await this.prisma.user.findFirst({
      where: { email },
      include: { organization: true },
    });

    if (user) {
      return this.linkSsoToExistingUser(user, ssoUser);
    }

    // 3. JIT Provisioning - find tenant by verified domain
    return this.jitProvisionUser(ssoUser);
  }

  /**
   * Link SSO credentials to an existing user account.
   * Called when user exists by email but hasn't used SSO before.
   */
  private async linkSsoToExistingUser(
    existingUser: User & { organization: Organization },
    ssoUser: SsoUserData,
  ): Promise<User & { organization: Organization }> {
    // Check if user already has different SSO linked
    if (
      existingUser.ssoProvider &&
      existingUser.ssoProvider !== ssoUser.provider
    ) {
      this.logger.warn(
        `User ${existingUser.email} already has ${existingUser.ssoProvider} linked, attempted ${ssoUser.provider}`,
      );
      throw new UnauthorizedException(
        `Account already linked to ${existingUser.ssoProvider}. Please sign in using that provider.`,
      );
    }

    const user = await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        ssoProvider: ssoUser.provider,
        ssoId: ssoUser.ssoId,
        lastLoginAt: new Date(),
        // Update name if empty
        firstName: existingUser.firstName || ssoUser.firstName,
        lastName: existingUser.lastName || ssoUser.lastName,
      },
      include: { organization: true },
    });

    await this.auditService.log({
      entityType: AuditEntityType.USER,
      entityId: user.id,
      organizationId: user.organizationId,
      action: "SSO_LINKED",
      actionDescription: `User ${user.email} linked ${ssoUser.provider} SSO to existing account`,
      actionCategory: AuditActionCategory.SECURITY,
      actorUserId: user.id,
      actorType: ActorType.USER,
    });

    this.logger.log(
      `Linked ${ssoUser.provider} SSO to existing user ${user.email}`,
    );
    return user as User & { organization: Organization };
  }

  /**
   * JIT provision a new user based on verified email domain.
   * Creates a new user account in the organization that owns the domain.
   *
   * Security guardrails:
   * - Only works for verified domains (prevents domain claiming attacks)
   * - JIT provisioning must be enabled for the organization
   * - SSO must be enabled for the organization
   * - Default role is configurable but cannot be SYSTEM_ADMIN
   */
  private async jitProvisionUser(
    ssoUser: SsoUserData,
  ): Promise<User & { organization: Organization }> {
    const email = ssoUser.email.toLowerCase();

    // Find organization by verified domain
    const organization =
      await this.domainService.findOrganizationByEmailDomain(email);

    if (!organization) {
      this.logger.warn(
        `JIT provisioning failed for ${email}: no verified domain found`,
      );
      throw new UnauthorizedException(
        "Your organization is not registered. Please contact your administrator.",
      );
    }

    // Check if JIT provisioning is enabled
    const ssoConfig = await this.prisma.tenantSsoConfig.findUnique({
      where: { organizationId: organization.id },
    });

    if (!ssoConfig?.jitProvisioningEnabled) {
      this.logger.warn(
        `JIT provisioning disabled for org ${organization.slug}`,
      );
      throw new UnauthorizedException(
        "Just-in-time provisioning is disabled for your organization. Please contact your administrator.",
      );
    }

    // Check if SSO is enabled
    if (!ssoConfig.ssoEnabled) {
      this.logger.warn(`SSO not enabled for org ${organization.slug}`);
      throw new UnauthorizedException(
        "SSO is not enabled for your organization. Please contact your administrator.",
      );
    }

    // Security guardrail: Block dangerous roles from JIT provisioning
    let defaultRole = ssoConfig.defaultRole;
    if (
      defaultRole === UserRole.SYSTEM_ADMIN ||
      defaultRole === UserRole.COMPLIANCE_OFFICER
    ) {
      this.logger.warn(
        `JIT provisioning blocked dangerous role ${defaultRole} for ${email}, defaulting to EMPLOYEE`,
      );
      defaultRole = UserRole.EMPLOYEE;
    }

    // Create new user
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: ssoUser.firstName || "Unknown",
        lastName: ssoUser.lastName || "User",
        ssoProvider: ssoUser.provider,
        ssoId: ssoUser.ssoId,
        organizationId: organization.id,
        role: defaultRole,
        isActive: true,
        emailVerifiedAt: new Date(), // SSO = verified email
        lastLoginAt: new Date(),
      },
      include: { organization: true },
    });

    await this.auditService.log({
      entityType: AuditEntityType.USER,
      entityId: user.id,
      organizationId: organization.id,
      action: "USER_JIT_PROVISIONED",
      actionDescription: `User ${email} provisioned via ${ssoUser.provider} SSO (JIT)`,
      actionCategory: AuditActionCategory.SECURITY,
      actorUserId: user.id,
      actorType: ActorType.SYSTEM,
    });

    this.logger.log(
      `JIT provisioned user ${email} to org ${organization.slug}`,
    );
    return user as User & { organization: Organization };
  }

  /**
   * Update last login timestamp for user.
   */
  private async updateLastLogin(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Log SSO login event to audit trail.
   */
  private async logSsoLogin(
    user: User,
    provider: string,
    matchType: string,
  ): Promise<void> {
    await this.auditService.log({
      entityType: AuditEntityType.USER,
      entityId: user.id,
      organizationId: user.organizationId,
      action: "SSO_LOGIN",
      actionDescription: `User ${user.email} logged in via ${provider} (${matchType})`,
      actionCategory: AuditActionCategory.SECURITY,
      actorUserId: user.id,
      actorType: ActorType.USER,
    });
  }
}
