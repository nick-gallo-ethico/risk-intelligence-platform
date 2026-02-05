// =============================================================================
// POLICY TRANSLATION SERVICE - AI and manual translation management
// =============================================================================
//
// This service manages translations for policy versions using either:
// - AI translation via the existing translate skill from Phase 5
// - Manual translation with human-provided content
//
// KEY BEHAVIORS:
// - Translations are linked to specific PolicyVersion (immutable source)
// - AI translation uses SkillRegistry.executeSkill('translate', ...)
// - When source policy updates, translations marked stale (handled by listener)
// - Side-by-side editing preserves original while editing translation
// - Review workflow: PENDING_REVIEW -> APPROVED/NEEDS_REVISION -> PUBLISHED
// =============================================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Prisma,
  PolicyVersionTranslation,
  TranslationSource,
  TranslationReviewStatus,
  AuditEntityType,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivityService } from "../../../common/services/activity.service";
import { SkillRegistry } from "../../ai/skills/skill.registry";
import { SkillContext } from "../../ai/skills/skill.types";
import {
  CreateTranslationDto,
  UpdateTranslationDto,
  ReviewTranslationDto,
  LANGUAGE_NAMES,
  getLanguageName,
  getSupportedLanguageCodes,
} from "./dto";

// =============================================================================
// Events
// =============================================================================

/**
 * Emitted when a translation is created.
 */
export class PolicyTranslationCreatedEvent {
  static readonly eventName = "policy.translation.created";

  constructor(
    public readonly organizationId: string,
    public readonly translationId: string,
    public readonly policyVersionId: string,
    public readonly languageCode: string,
    public readonly translatedBy: TranslationSource,
  ) {}
}

/**
 * Emitted when a translation is reviewed.
 */
export class PolicyTranslationReviewedEvent {
  static readonly eventName = "policy.translation.reviewed";

  constructor(
    public readonly organizationId: string,
    public readonly translationId: string,
    public readonly policyVersionId: string,
    public readonly languageCode: string,
    public readonly reviewStatus: TranslationReviewStatus,
    public readonly reviewedById: string,
  ) {}
}

// =============================================================================
// Service
// =============================================================================

@Injectable()
export class PolicyTranslationService {
  private readonly logger = new Logger(PolicyTranslationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly skillRegistry: SkillRegistry,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // =========================================================================
  // TRANSLATE - Create new translation (AI or manual)
  // =========================================================================

  /**
   * Creates a translation for a policy version.
   *
   * If dto.useAI is true (default), uses the translate skill for AI translation.
   * If dto.content is provided with useAI false, creates a manual translation.
   *
   * @param dto - Translation creation parameters
   * @param userId - User creating the translation
   * @param organizationId - Organization ID for tenant isolation
   * @returns Created PolicyVersionTranslation
   */
  async translate(
    dto: CreateTranslationDto,
    userId: string,
    organizationId: string,
  ): Promise<PolicyVersionTranslation> {
    // Get policy version with policy relation
    const policyVersion = await this.prisma.policyVersion.findFirst({
      where: {
        id: dto.policyVersionId,
        organizationId,
      },
      include: {
        policy: true,
      },
    });

    if (!policyVersion) {
      throw new NotFoundException(
        `Policy version ${dto.policyVersionId} not found`,
      );
    }

    // Validate language code
    const languageName = getLanguageName(dto.languageCode);
    if (!LANGUAGE_NAMES[dto.languageCode]) {
      this.logger.warn(
        `Using unsupported language code: ${dto.languageCode}. Proceeding with code as name.`,
      );
    }

    // Check if translation already exists for this version+language
    const existingTranslation =
      await this.prisma.policyVersionTranslation.findFirst({
        where: {
          policyVersionId: dto.policyVersionId,
          languageCode: dto.languageCode,
          organizationId,
        },
      });

    if (existingTranslation) {
      if (dto.useAI !== false) {
        throw new ConflictException(
          `Translation already exists for language ${dto.languageCode}. Use update or refresh instead.`,
        );
      }
      // For manual updates, redirect to update method
      throw new ConflictException(
        `Translation already exists for language ${dto.languageCode}. Use PUT /translations/:id to update.`,
      );
    }

    let translatedContent: string;
    let translatedTitle: string;
    let translatedBy: TranslationSource;
    let aiModel: string | null = null;

    // AI Translation
    if (dto.useAI !== false) {
      const skillContext: SkillContext = {
        organizationId,
        userId,
        entityType: "POLICY_VERSION",
        entityId: dto.policyVersionId,
        permissions: ["ai:skills:translate"],
      };

      // Translate content
      const contentResult = await this.skillRegistry.executeSkill(
        "translate",
        {
          content: policyVersion.content,
          targetLanguage: dto.languageCode,
          preserveFormatting: true,
        },
        skillContext,
      );

      if (!contentResult.success || !contentResult.data) {
        throw new BadRequestException(
          `AI translation failed: ${contentResult.error || "Unknown error"}`,
        );
      }

      // Translate title
      const titleResult = await this.skillRegistry.executeSkill(
        "translate",
        {
          content: policyVersion.policy.title,
          targetLanguage: dto.languageCode,
          preserveFormatting: false,
        },
        skillContext,
      );

      if (!titleResult.success || !titleResult.data) {
        throw new BadRequestException(
          `AI title translation failed: ${titleResult.error || "Unknown error"}`,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      translatedContent = (contentResult.data as any).translated;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      translatedTitle = (titleResult.data as any).translated;
      translatedBy = TranslationSource.AI;
      aiModel = contentResult.metadata?.model || null;

      this.logger.log(
        `AI translated policy version ${dto.policyVersionId} to ${dto.languageCode}`,
      );
    } else {
      // Manual Translation
      if (!dto.content) {
        throw new BadRequestException(
          "Content is required for manual translation (useAI: false)",
        );
      }
      if (!dto.title) {
        throw new BadRequestException(
          "Title is required for manual translation (useAI: false)",
        );
      }

      translatedContent = dto.content;
      translatedTitle = dto.title;
      translatedBy = TranslationSource.HUMAN;
    }

    // Extract plain text for search
    const plainText = this.extractPlainText(translatedContent);

    // Create translation record
    const translation = await this.prisma.policyVersionTranslation.create({
      data: {
        organizationId,
        policyVersionId: dto.policyVersionId,
        languageCode: dto.languageCode,
        languageName,
        title: translatedTitle,
        content: translatedContent,
        plainText,
        translatedBy,
        aiModel,
        reviewStatus: TranslationReviewStatus.PENDING_REVIEW,
        isStale: false,
      },
      include: {
        policyVersion: {
          include: {
            policy: true,
          },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.POLICY,
      entityId: policyVersion.policyId,
      action: "translation_created",
      actionDescription: `Created ${languageName} translation for policy "${policyVersion.policy.title}" (${translatedBy === TranslationSource.AI ? "AI-generated" : "manual"})`,
      actorUserId: userId,
      organizationId,
      context: {
        translationId: translation.id,
        policyVersionId: dto.policyVersionId,
        languageCode: dto.languageCode,
        translatedBy,
      },
    });

    // Emit event
    this.emitEvent(
      PolicyTranslationCreatedEvent.eventName,
      new PolicyTranslationCreatedEvent(
        organizationId,
        translation.id,
        dto.policyVersionId,
        dto.languageCode,
        translatedBy,
      ),
    );

    return translation;
  }

  // =========================================================================
  // UPDATE - Edit existing translation
  // =========================================================================

  /**
   * Updates an existing translation's content.
   * If the translation was AI-generated, changes translatedBy to HUMAN.
   * Resets isStale to false (human verified current).
   *
   * @param translationId - Translation ID to update
   * @param dto - Update parameters
   * @param userId - User making the update
   * @param organizationId - Organization ID for tenant isolation
   * @returns Updated PolicyVersionTranslation
   */
  async updateTranslation(
    translationId: string,
    dto: UpdateTranslationDto,
    userId: string,
    organizationId: string,
  ): Promise<PolicyVersionTranslation> {
    const existing = await this.prisma.policyVersionTranslation.findFirst({
      where: {
        id: translationId,
        organizationId,
      },
      include: {
        policyVersion: {
          include: {
            policy: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Translation ${translationId} not found`);
    }

    const plainText = this.extractPlainText(dto.content);

    // If AI-generated, change to HUMAN since human edited
    const newTranslatedBy =
      existing.translatedBy === TranslationSource.AI
        ? TranslationSource.HUMAN
        : existing.translatedBy;

    const updated = await this.prisma.policyVersionTranslation.update({
      where: { id: translationId },
      data: {
        title: dto.title || existing.title,
        content: dto.content,
        plainText,
        translatedBy: newTranslatedBy,
        isStale: false, // Human verified/updated
        reviewNotes: dto.reviewNotes || existing.reviewNotes,
      },
      include: {
        policyVersion: {
          include: {
            policy: true,
          },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.POLICY,
      entityId: existing.policyVersion.policyId,
      action: "translation_updated",
      actionDescription: `Updated ${existing.languageName} translation for policy "${existing.policyVersion.policy.title}"`,
      actorUserId: userId,
      organizationId,
      context: {
        translationId,
        languageCode: existing.languageCode,
        wasStale: existing.isStale,
      },
    });

    return updated;
  }

  // =========================================================================
  // REVIEW - Change review status
  // =========================================================================

  /**
   * Reviews a translation, updating its review status.
   *
   * @param translationId - Translation ID to review
   * @param dto - Review parameters (status, notes)
   * @param userId - User performing the review
   * @param organizationId - Organization ID for tenant isolation
   * @returns Updated PolicyVersionTranslation
   */
  async reviewTranslation(
    translationId: string,
    dto: ReviewTranslationDto,
    userId: string,
    organizationId: string,
  ): Promise<PolicyVersionTranslation> {
    const existing = await this.prisma.policyVersionTranslation.findFirst({
      where: {
        id: translationId,
        organizationId,
      },
      include: {
        policyVersion: {
          include: {
            policy: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Translation ${translationId} not found`);
    }

    const updated = await this.prisma.policyVersionTranslation.update({
      where: { id: translationId },
      data: {
        reviewStatus: dto.status,
        reviewedAt: new Date(),
        reviewedById: userId,
        reviewNotes: dto.reviewNotes || existing.reviewNotes,
      },
      include: {
        policyVersion: {
          include: {
            policy: true,
          },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.POLICY,
      entityId: existing.policyVersion.policyId,
      action: "translation_reviewed",
      actionDescription: `Reviewed ${existing.languageName} translation for policy "${existing.policyVersion.policy.title}" - ${dto.status}`,
      actorUserId: userId,
      organizationId,
      context: {
        translationId,
        languageCode: existing.languageCode,
        previousStatus: existing.reviewStatus,
        newStatus: dto.status,
      },
    });

    // Emit event
    this.emitEvent(
      PolicyTranslationReviewedEvent.eventName,
      new PolicyTranslationReviewedEvent(
        organizationId,
        translationId,
        existing.policyVersionId,
        existing.languageCode,
        dto.status,
        userId,
      ),
    );

    return updated;
  }

  // =========================================================================
  // REFRESH - Re-translate stale translation
  // =========================================================================

  /**
   * Re-translates a stale translation using AI.
   * Preserves the translation ID but updates content.
   *
   * @param translationId - Translation ID to refresh
   * @param userId - User requesting the refresh
   * @param organizationId - Organization ID for tenant isolation
   * @returns Updated PolicyVersionTranslation
   */
  async refreshStaleTranslation(
    translationId: string,
    userId: string,
    organizationId: string,
  ): Promise<PolicyVersionTranslation> {
    const existing = await this.prisma.policyVersionTranslation.findFirst({
      where: {
        id: translationId,
        organizationId,
      },
      include: {
        policyVersion: {
          include: {
            policy: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Translation ${translationId} not found`);
    }

    if (!existing.isStale) {
      throw new BadRequestException("Translation is not stale");
    }

    const skillContext: SkillContext = {
      organizationId,
      userId,
      entityType: "POLICY_VERSION",
      entityId: existing.policyVersionId,
      permissions: ["ai:skills:translate"],
    };

    // Re-translate content
    const contentResult = await this.skillRegistry.executeSkill(
      "translate",
      {
        content: existing.policyVersion.content,
        targetLanguage: existing.languageCode,
        preserveFormatting: true,
      },
      skillContext,
    );

    if (!contentResult.success || !contentResult.data) {
      throw new BadRequestException(
        `AI re-translation failed: ${contentResult.error || "Unknown error"}`,
      );
    }

    // Re-translate title
    const titleResult = await this.skillRegistry.executeSkill(
      "translate",
      {
        content: existing.policyVersion.policy.title,
        targetLanguage: existing.languageCode,
        preserveFormatting: false,
      },
      skillContext,
    );

    if (!titleResult.success || !titleResult.data) {
      throw new BadRequestException(
        `AI title re-translation failed: ${titleResult.error || "Unknown error"}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const translatedContent = (contentResult.data as any).translated;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const translatedTitle = (titleResult.data as any).translated;
    const plainText = this.extractPlainText(translatedContent);

    const updated = await this.prisma.policyVersionTranslation.update({
      where: { id: translationId },
      data: {
        title: translatedTitle,
        content: translatedContent,
        plainText,
        translatedBy: TranslationSource.AI,
        aiModel: contentResult.metadata?.model || null,
        reviewStatus: TranslationReviewStatus.PENDING_REVIEW,
        isStale: false,
        reviewedAt: null,
        reviewedById: null,
        reviewNotes: null,
      },
      include: {
        policyVersion: {
          include: {
            policy: true,
          },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.POLICY,
      entityId: existing.policyVersion.policyId,
      action: "translation_refreshed",
      actionDescription: `Re-translated stale ${existing.languageName} translation for policy "${existing.policyVersion.policy.title}"`,
      actorUserId: userId,
      organizationId,
      context: {
        translationId,
        languageCode: existing.languageCode,
      },
    });

    this.logger.log(
      `Refreshed stale translation ${translationId} for language ${existing.languageCode}`,
    );

    return updated;
  }

  // =========================================================================
  // FIND - Query translations
  // =========================================================================

  /**
   * Returns all translations for a policy version.
   *
   * @param policyVersionId - Policy version ID
   * @param organizationId - Organization ID for tenant isolation
   * @returns Array of PolicyVersionTranslation
   */
  async findByVersion(
    policyVersionId: string,
    organizationId: string,
  ): Promise<PolicyVersionTranslation[]> {
    return this.prisma.policyVersionTranslation.findMany({
      where: {
        policyVersionId,
        organizationId,
      },
      orderBy: { languageCode: "asc" },
      include: {
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * Returns all stale translations for an organization.
   *
   * @param organizationId - Organization ID for tenant isolation
   * @returns Array of stale PolicyVersionTranslation with context
   */
  async findStale(organizationId: string): Promise<PolicyVersionTranslation[]> {
    return this.prisma.policyVersionTranslation.findMany({
      where: {
        organizationId,
        isStale: true,
      },
      include: {
        policyVersion: {
          include: {
            policy: true,
          },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [{ policyVersion: { policy: { title: "asc" } } }, { languageCode: "asc" }],
    });
  }

  /**
   * Returns a single translation by ID.
   *
   * @param translationId - Translation ID
   * @param organizationId - Organization ID for tenant isolation
   * @returns PolicyVersionTranslation or null
   */
  async findById(
    translationId: string,
    organizationId: string,
  ): Promise<PolicyVersionTranslation | null> {
    return this.prisma.policyVersionTranslation.findFirst({
      where: {
        id: translationId,
        organizationId,
      },
      include: {
        policyVersion: {
          include: {
            policy: true,
          },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  // =========================================================================
  // LANGUAGES - Available languages
  // =========================================================================

  /**
   * Returns list of available language codes.
   */
  getAvailableLanguages(): Array<{ code: string; name: string }> {
    return getSupportedLanguageCodes().map((code) => ({
      code,
      name: LANGUAGE_NAMES[code],
    }));
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================

  /**
   * Extracts plain text from HTML content for search indexing.
   * Strips HTML tags and collapses whitespace.
   */
  private extractPlainText(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, " ");

    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Collapse whitespace
    text = text.replace(/\s+/g, " ").trim();

    return text;
  }

  /**
   * Safely emits an event. Failures are logged but don't crash the request.
   */
  private emitEvent(eventName: string, event: object): void {
    try {
      this.eventEmitter.emit(eventName, event);
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
