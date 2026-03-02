import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CaseSlaConfig, DEFAULT_CASE_SLA_CONFIG } from "./sla.types";
import { UpdateCaseSlaConfigDto } from "./dto/sla-config.dto";

/**
 * SlaConfigService manages case-level SLA configuration per organization.
 *
 * Responsibilities:
 * - CRUD operations for organization SLA configuration
 * - Calculate SLA due dates based on org config
 * - Provide default configuration when none exists
 *
 * Configuration is stored in Organization.caseSlaConfig JSON field.
 */
@Injectable()
export class SlaConfigService {
  private readonly logger = new Logger(SlaConfigService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get case SLA config for an organization.
   * Returns default config if none configured.
   *
   * @param organizationId - The organization ID
   * @returns The case SLA configuration
   */
  async getConfig(organizationId: string): Promise<CaseSlaConfig> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { caseSlaConfig: true },
    });

    if (!org?.caseSlaConfig) {
      this.logger.debug(
        `No SLA config for org ${organizationId}, using defaults`,
      );
      return DEFAULT_CASE_SLA_CONFIG;
    }

    return org.caseSlaConfig as unknown as CaseSlaConfig;
  }

  /**
   * Update case SLA config for an organization.
   * Merges with existing config (partial update).
   *
   * @param organizationId - The organization ID
   * @param dto - The configuration updates
   * @returns The updated configuration
   */
  async updateConfig(
    organizationId: string,
    dto: UpdateCaseSlaConfigDto,
  ): Promise<CaseSlaConfig> {
    const currentConfig = await this.getConfig(organizationId);

    const newConfig: CaseSlaConfig = {
      ...currentConfig,
      ...dto,
      // Deep merge severity overrides
      severityOverrides: {
        ...currentConfig.severityOverrides,
        ...dto.severityOverrides,
      },
      // Deep merge category overrides
      categoryOverrides: {
        ...currentConfig.categoryOverrides,
        ...dto.categoryOverrides,
      },
    };

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        caseSlaConfig: newConfig as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Updated SLA config for org ${organizationId}`);

    return newConfig;
  }

  /**
   * Reset case SLA config to defaults for an organization.
   *
   * @param organizationId - The organization ID
   * @returns The default configuration
   */
  async resetConfig(organizationId: string): Promise<CaseSlaConfig> {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        caseSlaConfig:
          DEFAULT_CASE_SLA_CONFIG as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Reset SLA config to defaults for org ${organizationId}`);

    return DEFAULT_CASE_SLA_CONFIG;
  }

  /**
   * Calculate SLA due date for a case based on org config.
   *
   * Priority order:
   * 1. Category override (if categoryId provided and configured)
   * 2. Severity override (if severity configured)
   * 3. Default days
   *
   * @param config - The organization's SLA configuration
   * @param severity - The case severity (HIGH, MEDIUM, LOW)
   * @param categoryId - Optional category ID for category-specific override
   * @param createdAt - The case creation timestamp (defaults to now)
   * @returns The calculated due date
   */
  calculateDueDate(
    config: CaseSlaConfig,
    severity: string,
    categoryId?: string,
    createdAt: Date = new Date(),
  ): Date {
    let days = config.defaultDays;

    // Category override takes precedence
    if (categoryId && config.categoryOverrides?.[categoryId]) {
      days = config.categoryOverrides[categoryId];
    }
    // Then severity override
    else if (
      severity &&
      config.severityOverrides?.[
        severity as keyof NonNullable<typeof config.severityOverrides>
      ]
    ) {
      days =
        config.severityOverrides[
          severity as keyof NonNullable<typeof config.severityOverrides>
        ]!;
    }

    const dueDate = new Date(createdAt);
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate;
  }

  /**
   * Get the SLA days for a specific case based on org config.
   *
   * @param config - The organization's SLA configuration
   * @param severity - The case severity
   * @param categoryId - Optional category ID
   * @returns Number of days for the SLA
   */
  getSlaDays(
    config: CaseSlaConfig,
    severity: string,
    categoryId?: string,
  ): number {
    // Category override takes precedence
    if (categoryId && config.categoryOverrides?.[categoryId]) {
      return config.categoryOverrides[categoryId];
    }

    // Then severity override
    if (
      severity &&
      config.severityOverrides?.[
        severity as keyof NonNullable<typeof config.severityOverrides>
      ]
    ) {
      return config.severityOverrides[
        severity as keyof NonNullable<typeof config.severityOverrides>
      ]!;
    }

    return config.defaultDays;
  }
}
