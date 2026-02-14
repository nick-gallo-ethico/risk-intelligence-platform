import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { QaMode, CategoryModule, Severity } from "@prisma/client";
import {
  ClientProfile,
  HotlineNumberInfo,
  QaConfigInfo,
  CategoryInfo,
  BrandingInfo,
  QaCheckResult,
  QaCheckReason,
  ClientListResult,
  ClientListItem,
} from "./types/client-profile.types";
import {
  CreateHotlineNumberDto,
  UpdateQaConfigDto,
} from "./dto/client-profile.dto";

/**
 * Service for managing client profiles for operator console.
 *
 * Enables operators to:
 * - Look up clients by incoming phone number
 * - Load full client configuration (QA settings, categories, branding)
 * - Determine if a report requires QA review
 */
@Injectable()
export class ClientProfileService {
  private readonly logger = new Logger(ClientProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a client by incoming phone number.
   *
   * Phone number is normalized to E.164 format before lookup.
   * Returns null if no client found with that number.
   */
  async findByPhoneNumber(phoneNumber: string): Promise<ClientProfile | null> {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    this.logger.debug(`Looking up client by phone: ${normalized}`);

    // Bypass RLS - operators need cross-tenant access for phone lookup
    const hotlineNumber = await this.prisma.withBypassRLS(async () => {
      return this.prisma.hotlineNumber.findFirst({
        where: {
          phoneNumber: normalized,
          isActive: true,
        },
        include: {
          organization: true,
        },
      });
    });

    if (!hotlineNumber) {
      this.logger.debug(`No client found for phone: ${normalized}`);
      return null;
    }

    // Load full profile for the organization
    return this.getClientProfile(hotlineNumber.organizationId);
  }

  /**
   * Get full client profile by organization ID.
   *
   * Includes:
   * - Organization details
   * - QA configuration
   * - Active hotline numbers
   * - Active categories (for intake form)
   * - Branding (for operator console theming)
   */
  async getClientProfile(organizationId: string): Promise<ClientProfile> {
    // Bypass RLS - operators need cross-tenant access
    const org = await this.prisma.withBypassRLS(async () => {
      return this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          clientQaConfig: true,
          hotlineNumbers: {
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
          },
          categories: {
            where: {
              isActive: true,
              // Only include categories that apply to case management (hotline reports)
              module: {
                in: [CategoryModule.CASE, CategoryModule.ALL],
              },
            },
            orderBy: [{ level: "asc" }, { name: "asc" }],
          },
          tenantBranding: true,
        },
      });
    });

    if (!org) {
      throw new NotFoundException(`Organization not found: ${organizationId}`);
    }

    // Build client profile response
    const hotlineNumbers: HotlineNumberInfo[] = org.hotlineNumbers.map((h) => ({
      id: h.id,
      phoneNumber: h.phoneNumber,
      displayName: h.displayName,
      isActive: h.isActive,
    }));

    const qaConfig: QaConfigInfo | null = org.clientQaConfig
      ? {
          id: org.clientQaConfig.id,
          defaultMode: org.clientQaConfig.defaultMode,
          samplePercentage: org.clientQaConfig.samplePercentage,
          highRiskCategories: org.clientQaConfig.highRiskCategories,
          keywordTriggers: org.clientQaConfig.keywordTriggers,
          categoryOverrides:
            (org.clientQaConfig.categoryOverrides as Record<string, QaMode>) ||
            {},
        }
      : null;

    const highRiskSet = new Set(qaConfig?.highRiskCategories || []);

    const categories: CategoryInfo[] = org.categories.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      parentId: c.parentCategoryId,
      defaultSeverity: c.severityDefault,
      isHighRiskForQa: highRiskSet.has(c.id),
    }));

    const branding: BrandingInfo | null = org.tenantBranding
      ? {
          primaryColor: org.tenantBranding.primaryColor,
          secondaryColor: null, // TenantBranding doesn't have secondaryColor
          logoUrl: org.tenantBranding.logoUrl,
          companyName: org.name,
        }
      : null;

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      isActive: org.isActive,
      hotlineNumbers,
      qaConfig,
      categories,
      branding,
    };
  }

  /**
   * Check if a report requires QA review based on client configuration.
   *
   * Logic:
   * 1. If mode is ALL, always requires QA
   * 2. If mode is NONE, never requires QA (unless keyword trigger)
   * 3. Check category overrides first
   * 4. For RISK_BASED: Check if category is in highRiskCategories
   * 5. For SAMPLE: Return random based on samplePercentage
   * 6. Check keywordTriggers in content for any mode except NONE
   */
  async requiresQaReview(
    organizationId: string,
    categoryId: string,
    content: string,
  ): Promise<QaCheckResult> {
    // Bypass RLS for QA config access
    const qaConfig = await this.prisma.withBypassRLS(async () => {
      return this.prisma.clientQaConfig.findUnique({
        where: { organizationId },
      });
    });

    // If no QA config, default to ALL (most restrictive)
    if (!qaConfig) {
      return {
        requiresQa: true,
        reason: "mode_all",
        details: "No QA configuration found, defaulting to ALL",
      };
    }

    // Check category overrides first
    const categoryOverrides =
      (qaConfig.categoryOverrides as Record<string, string>) || {};
    if (categoryId && categoryOverrides[categoryId]) {
      const overrideMode = categoryOverrides[categoryId] as QaMode;
      return this.evaluateQaMode(
        overrideMode,
        categoryId,
        content,
        qaConfig,
        "category_override",
      );
    }

    // Check for keyword triggers (applies to all modes except NONE)
    if (
      qaConfig.defaultMode !== QaMode.NONE &&
      qaConfig.keywordTriggers.length > 0
    ) {
      const contentLower = content.toLowerCase();
      for (const keyword of qaConfig.keywordTriggers) {
        if (contentLower.includes(keyword.toLowerCase())) {
          return {
            requiresQa: true,
            reason: "keyword_trigger",
            details: `Content contains trigger keyword: "${keyword}"`,
          };
        }
      }
    }

    // Evaluate based on default mode
    return this.evaluateQaMode(
      qaConfig.defaultMode,
      categoryId,
      content,
      qaConfig,
    );
  }

  /**
   * Evaluate QA requirement based on mode.
   */
  private evaluateQaMode(
    mode: QaMode,
    categoryId: string,
    content: string,
    qaConfig: {
      samplePercentage: number | null;
      highRiskCategories: string[];
    },
    overrideReason?: QaCheckReason,
  ): QaCheckResult {
    switch (mode) {
      case QaMode.ALL:
        return {
          requiresQa: true,
          reason: overrideReason || "mode_all",
          details: overrideReason
            ? `Category override requires ALL QA`
            : "QA mode is ALL - all reports require review",
        };

      case QaMode.NONE:
        return {
          requiresQa: false,
          reason: overrideReason || "mode_none",
          details: overrideReason
            ? `Category override disables QA`
            : "QA mode is NONE - no review required",
        };

      case QaMode.RISK_BASED:
        if (categoryId && qaConfig.highRiskCategories.includes(categoryId)) {
          return {
            requiresQa: true,
            reason: "high_risk_category",
            details: "Category is marked as high-risk",
          };
        }
        return {
          requiresQa: false,
          reason: "sample_skipped",
          details: "Category is not high-risk",
        };

      case QaMode.SAMPLE:
        const percentage = qaConfig.samplePercentage || 0;
        const random = Math.random() * 100;
        if (random < percentage) {
          return {
            requiresQa: true,
            reason: "sample_selected",
            details: `Selected for QA sampling (${percentage}% rate)`,
          };
        }
        return {
          requiresQa: false,
          reason: "sample_skipped",
          details: `Not selected for QA sampling (${percentage}% rate)`,
        };

      default:
        // Unknown mode, default to require QA
        return {
          requiresQa: true,
          reason: "mode_all",
          details: `Unknown QA mode "${mode}", defaulting to require QA`,
        };
    }
  }

  /**
   * Normalize a phone number to E.164 format.
   *
   * Supported input formats:
   * - +18005551234 (E.164, returned as-is)
   * - (800) 555-1234 (US with parens)
   * - 800-555-1234 (US with dashes)
   * - 800.555.1234 (US with dots)
   * - 8005551234 (US plain 10-digit)
   * - 18005551234 (US with country code, no plus)
   */
  normalizePhoneNumber(phone: string): string {
    // Strip all non-numeric characters except leading +
    const hasPlus = phone.startsWith("+");
    const digitsOnly = phone.replace(/\D/g, "");

    // If already in E.164 with +
    if (hasPlus && digitsOnly.length >= 10) {
      return `+${digitsOnly}`;
    }

    // If 10 digits (US without country code), add +1
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }

    // If 11 digits starting with 1 (US with country code), add +
    if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
      return `+${digitsOnly}`;
    }

    // Return as-is with + prefix for other international numbers
    return `+${digitsOnly}`;
  }

  /**
   * Validate phone number is in E.164 format.
   */
  isValidE164(phone: string): boolean {
    return /^\+[1-9]\d{6,14}$/.test(phone);
  }

  /**
   * List all client organizations for manual lookup.
   */
  async listClients(
    search?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ClientListResult> {
    const offset = (page - 1) * limit;

    // Bypass RLS for client listing
    const result = await this.prisma.withBypassRLS(async () => {
      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { slug: { contains: search, mode: "insensitive" as const } },
            ],
            isActive: true,
          }
        : { isActive: true };

      const [orgs, total] = await Promise.all([
        this.prisma.organization.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            hotlineNumbers: {
              where: { isActive: true },
              select: { phoneNumber: true },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
            _count: {
              select: { hotlineNumbers: { where: { isActive: true } } },
            },
          },
          orderBy: { name: "asc" },
          skip: offset,
          take: limit,
        }),
        this.prisma.organization.count({ where }),
      ]);

      return { orgs, total };
    });

    const data: ClientListItem[] = result.orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      isActive: org.isActive,
      hotlineCount: org._count.hotlineNumbers,
      primaryHotlineNumber: org.hotlineNumbers[0]?.phoneNumber || null,
    }));

    return {
      data,
      total: result.total,
      limit,
      offset,
    };
  }

  /**
   * Add a hotline number to a client organization.
   */
  async addHotlineNumber(
    organizationId: string,
    dto: CreateHotlineNumberDto,
  ): Promise<HotlineNumberInfo> {
    const normalized = this.normalizePhoneNumber(dto.phoneNumber);

    if (!this.isValidE164(normalized)) {
      throw new ConflictException(
        `Invalid phone number format: ${dto.phoneNumber}. Must be in E.164 format.`,
      );
    }

    // Bypass RLS for cross-tenant operation
    const result = await this.prisma.withBypassRLS(async () => {
      // Verify organization exists
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new NotFoundException(
          `Organization not found: ${organizationId}`,
        );
      }

      // Check if phone number already exists
      const existing = await this.prisma.hotlineNumber.findUnique({
        where: { phoneNumber: normalized },
      });

      if (existing) {
        throw new ConflictException(
          `Phone number ${normalized} is already assigned to an organization`,
        );
      }

      // Create the hotline number
      return this.prisma.hotlineNumber.create({
        data: {
          organizationId,
          phoneNumber: normalized,
          displayName: dto.displayName || null,
        },
      });
    });

    return {
      id: result.id,
      phoneNumber: result.phoneNumber,
      displayName: result.displayName,
      isActive: result.isActive,
    };
  }

  /**
   * Remove a hotline number from a client organization.
   */
  async removeHotlineNumber(
    organizationId: string,
    numberId: string,
  ): Promise<void> {
    await this.prisma.withBypassRLS(async () => {
      // Verify the hotline number exists and belongs to the organization
      const hotlineNumber = await this.prisma.hotlineNumber.findFirst({
        where: {
          id: numberId,
          organizationId,
        },
      });

      if (!hotlineNumber) {
        throw new NotFoundException(
          `Hotline number not found: ${numberId} for organization ${organizationId}`,
        );
      }

      await this.prisma.hotlineNumber.delete({
        where: { id: numberId },
      });
    });

    this.logger.log(
      `Removed hotline number ${numberId} from organization ${organizationId}`,
    );
  }

  /**
   * Update QA configuration for a client organization.
   */
  async updateQaConfig(
    organizationId: string,
    dto: UpdateQaConfigDto,
  ): Promise<QaConfigInfo> {
    const result = await this.prisma.withBypassRLS(async () => {
      // Verify organization exists
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        throw new NotFoundException(
          `Organization not found: ${organizationId}`,
        );
      }

      // Upsert QA config
      return this.prisma.clientQaConfig.upsert({
        where: { organizationId },
        create: {
          organizationId,
          defaultMode: dto.defaultMode || QaMode.ALL,
          samplePercentage: dto.samplePercentage,
          highRiskCategories: dto.highRiskCategories || [],
          keywordTriggers: dto.keywordTriggers || [],
          categoryOverrides: dto.categoryOverrides || {},
        },
        update: {
          ...(dto.defaultMode !== undefined && {
            defaultMode: dto.defaultMode,
          }),
          ...(dto.samplePercentage !== undefined && {
            samplePercentage: dto.samplePercentage,
          }),
          ...(dto.highRiskCategories !== undefined && {
            highRiskCategories: dto.highRiskCategories,
          }),
          ...(dto.keywordTriggers !== undefined && {
            keywordTriggers: dto.keywordTriggers,
          }),
          ...(dto.categoryOverrides !== undefined && {
            categoryOverrides: dto.categoryOverrides,
          }),
        },
      });
    });

    this.logger.log(`Updated QA config for organization ${organizationId}`);

    return {
      id: result.id,
      defaultMode: result.defaultMode,
      samplePercentage: result.samplePercentage,
      highRiskCategories: result.highRiskCategories,
      keywordTriggers: result.keywordTriggers,
      categoryOverrides:
        (result.categoryOverrides as Record<string, QaMode>) || {},
    };
  }
}
