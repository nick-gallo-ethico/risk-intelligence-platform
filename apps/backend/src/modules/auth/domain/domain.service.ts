import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { DomainVerificationService } from "./domain-verification.service";
import {
  AddDomainDto,
  DomainResponseDto,
  VerifyDomainResponseDto,
} from "./dto/domain.dto";
import { AuditEntityType, AuditActionCategory, ActorType } from "@prisma/client";

@Injectable()
export class DomainService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private verificationService: DomainVerificationService,
  ) {}

  /**
   * Find organization by verified email domain.
   * Used during SSO to route users to correct tenant.
   *
   * @param email - User's email address
   * @returns Organization if domain is verified, null otherwise
   */
  async findOrganizationByEmailDomain(email: string) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return null;

    const tenantDomain = await this.prisma.tenantDomain.findFirst({
      where: {
        domain,
        verified: true,
      },
      include: {
        organization: true,
      },
    });

    return tenantDomain?.organization ?? null;
  }

  /**
   * Get all domains for an organization.
   */
  async getDomainsForOrganization(
    organizationId: string,
  ): Promise<DomainResponseDto[]> {
    const domains = await this.prisma.tenantDomain.findMany({
      where: { organizationId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    return domains.map((d) => ({
      id: d.id,
      domain: d.domain,
      verified: d.verified,
      verifiedAt: d.verifiedAt,
      isPrimary: d.isPrimary,
      verificationInstructions: d.verified
        ? undefined
        : this.verificationService.getVerificationInstructions(
            d.domain,
            d.verificationToken,
          ),
    }));
  }

  /**
   * Add a new domain to an organization.
   * Domain starts unverified - must complete DNS verification.
   */
  async addDomain(
    organizationId: string,
    dto: AddDomainDto,
    userId: string,
  ): Promise<DomainResponseDto> {
    const normalizedDomain = dto.domain.toLowerCase();

    // Check if domain already claimed by any organization
    const existingDomain = await this.prisma.tenantDomain.findUnique({
      where: { domain: normalizedDomain },
    });

    if (existingDomain) {
      if (existingDomain.organizationId === organizationId) {
        throw new ConflictException("Domain already added to your organization");
      }
      throw new ConflictException(
        "Domain is already claimed by another organization",
      );
    }

    // If setting as primary, ensure only one primary per org
    if (dto.isPrimary) {
      await this.prisma.tenantDomain.updateMany({
        where: { organizationId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Generate verification token
    const verificationToken =
      this.verificationService.generateVerificationToken();

    // Create domain record
    const domain = await this.prisma.tenantDomain.create({
      data: {
        organizationId,
        domain: normalizedDomain,
        verificationToken,
        verificationMethod: "DNS_TXT",
        isPrimary: dto.isPrimary ?? false,
      },
    });

    // Audit log
    await this.auditService.log({
      entityType: AuditEntityType.ORGANIZATION,
      entityId: organizationId,
      organizationId,
      action: "DOMAIN_ADDED",
      actionDescription: `Domain ${normalizedDomain} added for verification`,
      actionCategory: AuditActionCategory.SECURITY,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return {
      id: domain.id,
      domain: domain.domain,
      verified: domain.verified,
      verifiedAt: domain.verifiedAt,
      isPrimary: domain.isPrimary,
      verificationInstructions:
        this.verificationService.getVerificationInstructions(
          domain.domain,
          domain.verificationToken,
        ),
    };
  }

  /**
   * Verify domain ownership via DNS TXT record.
   */
  async verifyDomain(
    organizationId: string,
    domainId: string,
    userId: string,
  ): Promise<VerifyDomainResponseDto> {
    const domain = await this.prisma.tenantDomain.findFirst({
      where: { id: domainId, organizationId },
    });

    if (!domain) {
      throw new NotFoundException("Domain not found");
    }

    if (domain.verified) {
      return { verified: true, message: "Domain is already verified" };
    }

    // Perform DNS verification
    const verified = await this.verificationService.verifyDnsTxtRecord(
      domain.domain,
      domain.verificationToken,
    );

    if (verified) {
      await this.prisma.tenantDomain.update({
        where: { id: domainId },
        data: {
          verified: true,
          verifiedAt: new Date(),
        },
      });

      await this.auditService.log({
        entityType: AuditEntityType.ORGANIZATION,
        entityId: organizationId,
        organizationId,
        action: "DOMAIN_VERIFIED",
        actionDescription: `Domain ${domain.domain} verified successfully`,
        actionCategory: AuditActionCategory.SECURITY,
        actorUserId: userId,
        actorType: ActorType.USER,
      });

      return { verified: true, message: "Domain verified successfully" };
    }

    return {
      verified: false,
      message:
        "DNS TXT record not found. Ensure the record is properly configured and DNS has propagated.",
    };
  }

  /**
   * Remove a domain from an organization.
   */
  async removeDomain(
    organizationId: string,
    domainId: string,
    userId: string,
  ): Promise<void> {
    const domain = await this.prisma.tenantDomain.findFirst({
      where: { id: domainId, organizationId },
    });

    if (!domain) {
      throw new NotFoundException("Domain not found");
    }

    await this.prisma.tenantDomain.delete({
      where: { id: domainId },
    });

    await this.auditService.log({
      entityType: AuditEntityType.ORGANIZATION,
      entityId: organizationId,
      organizationId,
      action: "DOMAIN_REMOVED",
      actionDescription: `Domain ${domain.domain} removed`,
      actionCategory: AuditActionCategory.SECURITY,
      actorUserId: userId,
      actorType: ActorType.USER,
    });
  }

  /**
   * Set a domain as primary for the organization.
   */
  async setPrimaryDomain(
    organizationId: string,
    domainId: string,
    userId: string,
  ): Promise<void> {
    const domain = await this.prisma.tenantDomain.findFirst({
      where: { id: domainId, organizationId, verified: true },
    });

    if (!domain) {
      throw new NotFoundException("Domain not found or not verified");
    }

    // Unset current primary
    await this.prisma.tenantDomain.updateMany({
      where: { organizationId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set new primary
    await this.prisma.tenantDomain.update({
      where: { id: domainId },
      data: { isPrimary: true },
    });

    await this.auditService.log({
      entityType: AuditEntityType.ORGANIZATION,
      entityId: organizationId,
      organizationId,
      action: "PRIMARY_DOMAIN_SET",
      actionDescription: `${domain.domain} set as primary domain`,
      actionCategory: AuditActionCategory.SECURITY,
      actorUserId: userId,
      actorType: ActorType.USER,
    });
  }
}
