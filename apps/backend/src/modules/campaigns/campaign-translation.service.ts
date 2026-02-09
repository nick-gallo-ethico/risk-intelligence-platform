import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Campaign, CampaignStatus } from "@prisma/client";
import {
  CreateCampaignTranslationDto,
  TranslationStatusDto,
  CampaignWithTranslationsDto,
  LanguageRouteResult,
} from "./dto/campaign-translation.dto";

/**
 * Service for managing campaign translations.
 *
 * Implements RS.52:
 * - Parent-child translation model
 * - Stale translation detection when parent updated
 * - Language preference routing for employees
 */
@Injectable()
export class CampaignTranslationService {
  private readonly logger = new Logger(CampaignTranslationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================
  // Translation Creation
  // ===========================================

  /**
   * Creates a translation of a campaign.
   * Links to parent and records the parent version.
   */
  async createTranslation(
    dto: CreateCampaignTranslationDto,
    organizationId: string,
    userId: string,
  ): Promise<Campaign> {
    // Validate parent exists and is in same org
    const parent = await this.prisma.campaign.findFirst({
      where: { id: dto.sourceCampaignId, organizationId },
    });

    if (!parent) {
      throw new NotFoundException(
        `Source campaign ${dto.sourceCampaignId} not found`,
      );
    }

    // Check for existing translation in this language
    const existingTranslation = await this.prisma.campaign.findFirst({
      where: {
        parentCampaignId: dto.sourceCampaignId,
        language: dto.targetLanguage,
      },
    });

    if (existingTranslation) {
      throw new BadRequestException(
        `Translation already exists for language ${dto.targetLanguage}`,
      );
    }

    // Create translation campaign
    const translation = await this.prisma.campaign.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description ?? parent.description,
        type: parent.type,
        status: CampaignStatus.DRAFT,
        language: dto.targetLanguage,
        parentCampaignId: parent.id,
        parentVersionAtCreation: parent.version,
        // Copy dates from parent
        launchAt: parent.launchAt,
        dueDate: parent.dueDate,
        // Link to translated form if provided
        disclosureFormTemplateId:
          dto.formTemplateId ?? parent.disclosureFormTemplateId,
        // Copy audience settings
        audienceMode: parent.audienceMode,
        segmentId: parent.segmentId,
        // Copy reminder settings
        reminderConfig: parent.reminderConfig ?? undefined,
        reminderDays: parent.reminderDays,
        // Copy rollout settings
        rolloutStrategy: parent.rolloutStrategy,
        rolloutConfig: parent.rolloutConfig ?? undefined,
        // Audit
        createdById: userId,
      },
    });

    this.logger.log(
      `Created ${dto.targetLanguage} translation of campaign ${parent.name}`,
    );

    return translation;
  }

  // ===========================================
  // Translation Status
  // ===========================================

  /**
   * Gets translation status for all translations of a parent campaign.
   * Includes stale detection.
   */
  async getTranslationStatus(
    parentCampaignId: string,
    organizationId: string,
  ): Promise<TranslationStatusDto[]> {
    const parent = await this.prisma.campaign.findFirst({
      where: { id: parentCampaignId, organizationId },
    });

    if (!parent) {
      throw new NotFoundException(`Campaign ${parentCampaignId} not found`);
    }

    const translations = await this.prisma.campaign.findMany({
      where: { parentCampaignId },
      select: {
        id: true,
        language: true,
        name: true,
        status: true,
        parentVersionAtCreation: true,
        updatedAt: true,
      },
    });

    return translations.map((t) => {
      const isStale = (t.parentVersionAtCreation ?? 0) < parent.version;
      const staleFields: string[] = [];

      // Determine which fields may be stale
      if (isStale) {
        staleFields.push("content_may_be_outdated");
      }

      return {
        id: t.id,
        language: t.language,
        name: t.name,
        status: t.status,
        basedOnVersion: t.parentVersionAtCreation ?? 1,
        currentParentVersion: parent.version,
        isStale,
        staleFields: staleFields.length > 0 ? staleFields : undefined,
        lastSyncedAt: t.updatedAt,
      };
    });
  }

  /**
   * Marks a translation as updated (clears stale flag).
   * Used after manual review confirms translation is current.
   */
  async markAsUpdated(
    translationId: string,
    organizationId: string,
  ): Promise<void> {
    const translation = await this.prisma.campaign.findFirst({
      where: { id: translationId, organizationId },
      include: { parentCampaign: true },
    });

    if (!translation) {
      throw new NotFoundException(`Translation ${translationId} not found`);
    }

    if (!translation.parentCampaignId) {
      throw new BadRequestException("Campaign is not a translation");
    }

    const parentVersion = translation.parentCampaign?.version ?? 1;

    await this.prisma.campaign.update({
      where: { id: translationId },
      data: {
        parentVersionAtCreation: parentVersion,
      },
    });

    this.logger.log(
      `Marked translation ${translationId} as updated to parent v${parentVersion}`,
    );
  }

  // ===========================================
  // Language Routing
  // ===========================================

  /**
   * Gets available languages for a campaign.
   * Returns languages that have translations.
   */
  async getAvailableLanguages(
    campaignId: string,
    organizationId: string,
  ): Promise<string[]> {
    // First check if this IS a translation
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      select: { parentCampaignId: true, language: true },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Get parent ID (either this campaign or its parent)
    const parentId = campaign.parentCampaignId ?? campaignId;

    // Get all translations
    const translations = await this.prisma.campaign.findMany({
      where: { parentCampaignId: parentId },
      select: { language: true },
    });

    // Get parent language
    const parent = await this.prisma.campaign.findUnique({
      where: { id: parentId },
      select: { language: true },
    });

    const languages = new Set<string>();
    languages.add(parent?.language ?? "en");
    translations.forEach((t) => {
      languages.add(t.language);
    });

    return Array.from(languages).sort();
  }

  /**
   * Gets the appropriate campaign version for an employee based on language preference.
   * Falls back to org default, then parent (English).
   */
  async getCampaignForEmployee(
    campaignId: string,
    employeeId: string,
    organizationId: string,
  ): Promise<LanguageRouteResult> {
    // Get campaign
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Get employee's preferred language (primaryLanguage in schema)
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { primaryLanguage: true },
    });

    // Get org default language
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { defaultLanguage: true },
    });

    const preferredLanguage =
      employee?.primaryLanguage ?? org?.defaultLanguage ?? "en";

    // Get parent ID
    const parentId = campaign.parentCampaignId ?? campaignId;

    // Check if we're already in the preferred language
    if (campaign.language === preferredLanguage) {
      return {
        campaign,
        matchedLanguage: preferredLanguage,
        wasFallback: false,
        originalCampaignId: campaignId,
      };
    }

    // Look for translation in preferred language
    const translation = await this.prisma.campaign.findFirst({
      where: {
        parentCampaignId: parentId,
        language: preferredLanguage,
        status: { not: CampaignStatus.CANCELLED },
      },
    });

    if (translation) {
      return {
        campaign: translation,
        matchedLanguage: preferredLanguage,
        wasFallback: false,
        originalCampaignId: campaignId,
      };
    }

    // Fall back to org default language
    const orgDefault = org?.defaultLanguage ?? "en";
    if (orgDefault !== preferredLanguage) {
      const defaultTranslation = await this.prisma.campaign.findFirst({
        where: {
          parentCampaignId: parentId,
          language: orgDefault,
          status: { not: CampaignStatus.CANCELLED },
        },
      });

      if (defaultTranslation) {
        return {
          campaign: defaultTranslation,
          matchedLanguage: orgDefault,
          wasFallback: true,
          originalCampaignId: campaignId,
          requestedLanguage: preferredLanguage,
        };
      }
    }

    // Return parent (original) campaign
    const parent = await this.prisma.campaign.findUnique({
      where: { id: parentId },
    });

    return {
      campaign: parent ?? campaign,
      matchedLanguage: parent?.language ?? "en",
      wasFallback: true,
      originalCampaignId: campaignId,
      requestedLanguage: preferredLanguage,
    };
  }

  // ===========================================
  // Dashboard Queries
  // ===========================================

  /**
   * Gets all campaigns with stale translations.
   * For compliance dashboard monitoring.
   */
  async getStaleTranslations(organizationId: string): Promise<
    Array<{
      campaignId: string;
      campaignName: string;
      staleLanguages: string[];
      staleSince: Date | null;
    }>
  > {
    // Get all parent campaigns
    const parents = await this.prisma.campaign.findMany({
      where: {
        organizationId,
        parentCampaignId: null,
        status: {
          in: [
            CampaignStatus.ACTIVE,
            CampaignStatus.DRAFT,
            CampaignStatus.SCHEDULED,
          ],
        },
      },
      include: {
        translations: {
          select: {
            id: true,
            language: true,
            parentVersionAtCreation: true,
            updatedAt: true,
          },
        },
      },
    });

    const staleResults: Array<{
      campaignId: string;
      campaignName: string;
      staleLanguages: string[];
      staleSince: Date | null;
    }> = [];

    for (const parent of parents) {
      const staleTranslations = parent.translations.filter(
        (t) => (t.parentVersionAtCreation ?? 0) < parent.version,
      );

      if (staleTranslations.length > 0) {
        staleResults.push({
          campaignId: parent.id,
          campaignName: parent.name,
          staleLanguages: staleTranslations.map((t) => t.language),
          staleSince: staleTranslations.reduce(
            (oldest: Date | null, t) =>
              oldest === null || t.updatedAt < oldest ? t.updatedAt : oldest,
            null,
          ),
        });
      }
    }

    return staleResults;
  }

  /**
   * Gets campaign with full translation info.
   */
  async getCampaignWithTranslations(
    campaignId: string,
    organizationId: string,
  ): Promise<CampaignWithTranslationsDto> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      include: {
        translations: {
          select: {
            id: true,
            language: true,
            name: true,
            status: true,
            parentVersionAtCreation: true,
            updatedAt: true,
          },
        },
        parentCampaign: {
          select: {
            id: true,
            version: true,
            language: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const translations = campaign.translations.map((t) => ({
      id: t.id,
      language: t.language,
      name: t.name,
      status: t.status,
      basedOnVersion: t.parentVersionAtCreation ?? 1,
      currentParentVersion: campaign.version,
      isStale: (t.parentVersionAtCreation ?? 0) < campaign.version,
      lastSyncedAt: t.updatedAt,
    }));

    const availableLanguages = new Set<string>();
    availableLanguages.add(campaign.language);
    campaign.translations.forEach((t) => {
      availableLanguages.add(t.language);
    });

    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description ?? undefined,
      type: campaign.type,
      status: campaign.status,
      sourceLanguage: campaign.language,
      version: campaign.version,
      translations,
      availableLanguages: Array.from(availableLanguages).sort(),
      staleTranslationCount: translations.filter((t) => t.isStale).length,
    };
  }
}
