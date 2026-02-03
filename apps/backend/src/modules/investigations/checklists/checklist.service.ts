import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import {
  ApplyTemplateDto,
  CompleteItemDto,
  SkipItemDto,
  AddCustomItemDto,
  ChecklistItemState,
  SectionState,
  CustomItem,
  SkippedItem,
  ChecklistProgressResponse,
  ItemStatus,
  SectionStatus,
} from './dto/checklist.dto';
import {
  ChecklistSection,
  ChecklistItem,
} from '../templates/dto/template.dto';

/**
 * InvestigationChecklistService manages checklist progress for investigations.
 *
 * Key features:
 * - Apply templates to investigations (captures template version at creation)
 * - Track item completion with notes and attachments
 * - Support custom items added by investigators
 * - Support skipping items with reasons (N/A handling)
 * - Calculate progress metrics automatically
 *
 * The template version is captured at apply time and never changes,
 * ensuring in-flight investigations continue with their original checklist
 * even if the template is updated.
 */
@Injectable()
export class InvestigationChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Apply a template to an investigation, creating checklist progress.
   * Captures the template version at creation time (immutable snapshot).
   */
  async applyTemplate(
    organizationId: string,
    userId: string,
    userName: string,
    dto: ApplyTemplateDto,
  ): Promise<ChecklistProgressResponse> {
    // Verify investigation exists and belongs to organization
    const investigation = await this.prisma.investigation.findFirst({
      where: { id: dto.investigationId, organizationId },
    });

    if (!investigation) {
      throw new NotFoundException('Investigation not found');
    }

    // Check if checklist already exists
    const existing = await this.prisma.investigationChecklistProgress.findUnique(
      {
        where: { investigationId: dto.investigationId },
      },
    );

    if (existing) {
      throw new ConflictException(
        'Investigation already has a checklist. Delete it first to apply a new template.',
      );
    }

    // Get the template
    const template = await this.prisma.investigationTemplate.findFirst({
      where: { id: dto.templateId, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Investigation template not found');
    }

    // Parse template sections
    const sections = template.sections as unknown as ChecklistSection[];

    // Initialize item states (all pending)
    const itemStates: Record<string, ChecklistItemState> = {};
    const sectionStates: Record<string, SectionState> = {};
    let totalItems = 0;

    for (const section of sections) {
      const sectionItems = section.items || [];
      totalItems += sectionItems.length;

      // Initialize section state
      sectionStates[section.id] = {
        status: 'pending' as SectionStatus,
        completedItems: 0,
        totalItems: sectionItems.length,
      };

      // Initialize item states
      for (const item of sectionItems) {
        itemStates[item.id] = {
          status: 'pending' as ItemStatus,
        };
      }
    }

    // Create checklist progress
    const progress = await this.prisma.investigationChecklistProgress.create({
      data: {
        organizationId,
        investigationId: dto.investigationId,
        templateId: dto.templateId,
        templateVersion: template.version,
        itemStates: itemStates as unknown as Prisma.InputJsonValue,
        sectionStates: sectionStates as unknown as Prisma.InputJsonValue,
        totalItems,
        completedItems: 0,
        skippedCount: 0,
        customCount: 0,
        progressPercent: 0,
      },
    });

    // Increment template usage count
    await this.prisma.investigationTemplate.update({
      where: { id: dto.templateId },
      data: { usageCount: { increment: 1 } },
    });

    this.eventEmitter.emit('investigation.checklist.applied', {
      organizationId,
      investigationId: dto.investigationId,
      templateId: dto.templateId,
      checklistId: progress.id,
      userId,
    });

    return this.buildResponse(progress, template);
  }

  /**
   * Get checklist progress for an investigation.
   */
  async getProgress(
    organizationId: string,
    investigationId: string,
  ): Promise<ChecklistProgressResponse | null> {
    const progress = await this.prisma.investigationChecklistProgress.findFirst(
      {
        where: { investigationId, organizationId },
      },
    );

    if (!progress) {
      return null;
    }

    // Get the template (might be archived but still need it for display)
    const template = await this.prisma.investigationTemplate.findUnique({
      where: { id: progress.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template no longer exists');
    }

    return this.buildResponse(progress, template);
  }

  /**
   * Complete a checklist item with optional notes and attachments.
   */
  async completeItem(
    organizationId: string,
    investigationId: string,
    itemId: string,
    userId: string,
    userName: string,
    dto: CompleteItemDto,
  ): Promise<ChecklistProgressResponse> {
    const progress = await this.getProgressOrThrow(organizationId, investigationId);

    // Get current item states
    const itemStates = progress.itemStates as unknown as Record<
      string,
      ChecklistItemState
    >;
    const sectionStates = progress.sectionStates as unknown as Record<
      string,
      SectionState
    >;
    const customItems = (progress.customItems || []) as unknown as CustomItem[];

    // Find the item (either in template or custom items)
    const template = await this.prisma.investigationTemplate.findUnique({
      where: { id: progress.templateId },
    });
    const sections = template?.sections as unknown as ChecklistSection[];

    // Check if it's a template item
    let itemSection: ChecklistSection | undefined;
    let isCustomItem = false;

    for (const section of sections || []) {
      const found = section.items.find((i) => i.id === itemId);
      if (found) {
        itemSection = section;
        break;
      }
    }

    // Check if it's a custom item
    if (!itemSection) {
      const customItem = customItems.find((i) => i.id === itemId);
      if (customItem) {
        isCustomItem = true;
        itemSection = sections?.find((s) => s.id === customItem.sectionId);
      }
    }

    if (!itemSection && !isCustomItem) {
      throw new BadRequestException('Item not found in checklist');
    }

    // Check if already completed
    if (itemStates[itemId]?.status === 'completed') {
      throw new BadRequestException('Item is already completed');
    }

    // Update item state
    const now = new Date().toISOString();
    itemStates[itemId] = {
      status: 'completed',
      completedAt: now,
      completedById: userId,
      completedByName: userName,
      completionNotes: dto.completionNotes,
      attachmentIds: dto.attachmentIds,
      linkedInterviewIds: dto.linkedInterviewIds,
    };

    // Update section state
    if (itemSection) {
      const sectionId = itemSection.id;
      const section = sectionStates[sectionId];
      if (section) {
        section.completedItems += 1;
        section.status =
          section.completedItems >= section.totalItems
            ? 'completed'
            : 'in_progress';
      }
    }

    // Calculate new metrics
    const completedItems = Object.values(itemStates).filter(
      (s) => s.status === 'completed',
    ).length;
    const skippedCount = Object.values(itemStates).filter(
      (s) => s.status === 'skipped',
    ).length;
    const activeItems = progress.totalItems - skippedCount;
    const progressPercent =
      activeItems > 0 ? Math.round((completedItems / activeItems) * 100) : 100;

    // Update progress
    const updated = await this.prisma.investigationChecklistProgress.update({
      where: { id: progress.id },
      data: {
        itemStates: itemStates as unknown as Prisma.InputJsonValue,
        sectionStates: sectionStates as unknown as Prisma.InputJsonValue,
        completedItems,
        progressPercent,
        startedAt: progress.startedAt || new Date(),
        lastActivityAt: new Date(),
        completedAt: progressPercent === 100 ? new Date() : null,
      },
    });

    this.eventEmitter.emit('investigation.checklist.item.completed', {
      organizationId,
      investigationId,
      itemId,
      userId,
    });

    return this.buildResponse(updated, template!);
  }

  /**
   * Skip a checklist item with a reason (mark as N/A).
   */
  async skipItem(
    organizationId: string,
    investigationId: string,
    itemId: string,
    userId: string,
    userName: string,
    dto: SkipItemDto,
  ): Promise<ChecklistProgressResponse> {
    const progress = await this.getProgressOrThrow(organizationId, investigationId);

    // Get current states
    const itemStates = progress.itemStates as unknown as Record<
      string,
      ChecklistItemState
    >;
    const sectionStates = progress.sectionStates as unknown as Record<
      string,
      SectionState
    >;
    const skippedItems = (progress.skippedItems ||
      []) as unknown as SkippedItem[];

    // Check if item exists in template
    const template = await this.prisma.investigationTemplate.findUnique({
      where: { id: progress.templateId },
    });
    const sections = template?.sections as unknown as ChecklistSection[];

    let itemSection: ChecklistSection | undefined;
    let itemDef: ChecklistItem | undefined;

    for (const section of sections || []) {
      const found = section.items.find((i) => i.id === itemId);
      if (found) {
        itemSection = section;
        itemDef = found;
        break;
      }
    }

    if (!itemSection) {
      throw new BadRequestException('Item not found in checklist');
    }

    // Check if required item
    if (itemDef?.required) {
      throw new BadRequestException('Required items cannot be skipped');
    }

    // Check if already skipped
    if (itemStates[itemId]?.status === 'skipped') {
      throw new BadRequestException('Item is already skipped');
    }

    // Update item state
    itemStates[itemId] = {
      status: 'skipped',
    };

    // Add to skipped items list
    skippedItems.push({
      itemId,
      reason: dto.reason,
      skippedById: userId,
      skippedByName: userName,
      skippedAt: new Date().toISOString(),
    });

    // Update section state (skipped items count toward completion for progress)
    const sectionId = itemSection.id;
    const section = sectionStates[sectionId];
    if (section) {
      // Don't increment completedItems for skipped, but recalculate section status
      const sectionItemIds = itemSection.items.map((i) => i.id);
      const completedOrSkipped = sectionItemIds.filter(
        (id) =>
          itemStates[id]?.status === 'completed' ||
          itemStates[id]?.status === 'skipped',
      ).length;
      section.status =
        completedOrSkipped >= section.totalItems ? 'completed' : 'in_progress';
    }

    // Calculate new metrics
    const completedItems = Object.values(itemStates).filter(
      (s) => s.status === 'completed',
    ).length;
    const skippedCount = Object.values(itemStates).filter(
      (s) => s.status === 'skipped',
    ).length;
    const activeItems = progress.totalItems - skippedCount;
    const progressPercent =
      activeItems > 0 ? Math.round((completedItems / activeItems) * 100) : 100;

    // Update progress
    const updated = await this.prisma.investigationChecklistProgress.update({
      where: { id: progress.id },
      data: {
        itemStates: itemStates as unknown as Prisma.InputJsonValue,
        sectionStates: sectionStates as unknown as Prisma.InputJsonValue,
        skippedItems: skippedItems as unknown as Prisma.InputJsonValue,
        skippedCount,
        progressPercent,
        startedAt: progress.startedAt || new Date(),
        lastActivityAt: new Date(),
        completedAt: progressPercent === 100 ? new Date() : null,
      },
    });

    this.eventEmitter.emit('investigation.checklist.item.skipped', {
      organizationId,
      investigationId,
      itemId,
      reason: dto.reason,
      userId,
    });

    return this.buildResponse(updated, template!);
  }

  /**
   * Uncomplete a checklist item (revert completion status).
   */
  async uncompleteItem(
    organizationId: string,
    investigationId: string,
    itemId: string,
    userId: string,
  ): Promise<ChecklistProgressResponse> {
    const progress = await this.getProgressOrThrow(organizationId, investigationId);

    // Get current states
    const itemStates = progress.itemStates as unknown as Record<
      string,
      ChecklistItemState
    >;
    const sectionStates = progress.sectionStates as unknown as Record<
      string,
      SectionState
    >;
    let skippedItems = (progress.skippedItems ||
      []) as unknown as SkippedItem[];

    // Check if item exists and is completed or skipped
    const currentState = itemStates[itemId];
    if (!currentState || currentState.status === 'pending') {
      throw new BadRequestException('Item is not completed or skipped');
    }

    const wasSkipped = currentState.status === 'skipped';

    // Get template for section info
    const template = await this.prisma.investigationTemplate.findUnique({
      where: { id: progress.templateId },
    });
    const sections = template?.sections as unknown as ChecklistSection[];

    // Find section
    let itemSection: ChecklistSection | undefined;
    for (const section of sections || []) {
      if (section.items.find((i) => i.id === itemId)) {
        itemSection = section;
        break;
      }
    }

    // Reset item state
    itemStates[itemId] = {
      status: 'pending',
    };

    // Remove from skipped items if it was skipped
    if (wasSkipped) {
      skippedItems = skippedItems.filter((s) => s.itemId !== itemId);
    }

    // Update section state
    if (itemSection) {
      const sectionId = itemSection.id;
      const section = sectionStates[sectionId];
      if (section && !wasSkipped) {
        section.completedItems = Math.max(0, section.completedItems - 1);
        section.status =
          section.completedItems === 0 ? 'pending' : 'in_progress';
      }
    }

    // Calculate new metrics
    const completedItems = Object.values(itemStates).filter(
      (s) => s.status === 'completed',
    ).length;
    const skippedCount = Object.values(itemStates).filter(
      (s) => s.status === 'skipped',
    ).length;
    const activeItems = progress.totalItems - skippedCount;
    const progressPercent =
      activeItems > 0 ? Math.round((completedItems / activeItems) * 100) : 0;

    // Update progress
    const updated = await this.prisma.investigationChecklistProgress.update({
      where: { id: progress.id },
      data: {
        itemStates: itemStates as unknown as Prisma.InputJsonValue,
        sectionStates: sectionStates as unknown as Prisma.InputJsonValue,
        skippedItems: skippedItems as unknown as Prisma.InputJsonValue,
        completedItems,
        skippedCount,
        progressPercent,
        lastActivityAt: new Date(),
        completedAt: null, // No longer complete
      },
    });

    this.eventEmitter.emit('investigation.checklist.item.uncompleted', {
      organizationId,
      investigationId,
      itemId,
      userId,
    });

    return this.buildResponse(updated, template!);
  }

  /**
   * Add a custom item to a section.
   */
  async addCustomItem(
    organizationId: string,
    investigationId: string,
    userId: string,
    userName: string,
    dto: AddCustomItemDto,
  ): Promise<ChecklistProgressResponse> {
    const progress = await this.getProgressOrThrow(organizationId, investigationId);

    // Get template to verify section exists
    const template = await this.prisma.investigationTemplate.findUnique({
      where: { id: progress.templateId },
    });
    const sections = template?.sections as unknown as ChecklistSection[];

    const section = sections?.find((s) => s.id === dto.sectionId);
    if (!section) {
      throw new BadRequestException('Section not found in template');
    }

    // Get current states
    const itemStates = progress.itemStates as unknown as Record<
      string,
      ChecklistItemState
    >;
    const sectionStates = progress.sectionStates as unknown as Record<
      string,
      SectionState
    >;
    const customItems = (progress.customItems || []) as unknown as CustomItem[];

    // Generate new item ID
    const itemId = nanoid(12);

    // Find max order in section (including custom items)
    const sectionItemOrders = section.items.map((i) => i.order);
    const customItemOrders = customItems
      .filter((i) => i.sectionId === dto.sectionId)
      .map((i) => i.order);
    const maxOrder = Math.max(...sectionItemOrders, ...customItemOrders, 0);

    // Create custom item
    const customItem: CustomItem = {
      id: itemId,
      sectionId: dto.sectionId,
      text: dto.text,
      order: maxOrder + 1,
      required: dto.required ?? false,
      evidenceRequired: dto.evidenceRequired ?? false,
      addedById: userId,
      addedByName: userName,
      addedAt: new Date().toISOString(),
    };

    customItems.push(customItem);

    // Initialize item state
    itemStates[itemId] = {
      status: 'pending',
    };

    // Update section state
    const sectionState = sectionStates[dto.sectionId];
    if (sectionState) {
      sectionState.totalItems += 1;
      sectionState.status =
        sectionState.completedItems >= sectionState.totalItems
          ? 'completed'
          : sectionState.completedItems > 0
            ? 'in_progress'
            : 'pending';
    }

    // Update metrics
    const newTotalItems = progress.totalItems + 1;
    const skippedCount = Object.values(itemStates).filter(
      (s) => s.status === 'skipped',
    ).length;
    const completedItems = Object.values(itemStates).filter(
      (s) => s.status === 'completed',
    ).length;
    const activeItems = newTotalItems - skippedCount;
    const progressPercent =
      activeItems > 0 ? Math.round((completedItems / activeItems) * 100) : 0;

    // Update progress
    const updated = await this.prisma.investigationChecklistProgress.update({
      where: { id: progress.id },
      data: {
        itemStates: itemStates as unknown as Prisma.InputJsonValue,
        sectionStates: sectionStates as unknown as Prisma.InputJsonValue,
        customItems: customItems as unknown as Prisma.InputJsonValue,
        totalItems: newTotalItems,
        customCount: customItems.length,
        progressPercent,
        lastActivityAt: new Date(),
      },
    });

    this.eventEmitter.emit('investigation.checklist.item.added', {
      organizationId,
      investigationId,
      itemId,
      sectionId: dto.sectionId,
      userId,
    });

    return this.buildResponse(updated, template!);
  }

  /**
   * Delete checklist progress for an investigation.
   */
  async deleteChecklist(
    organizationId: string,
    investigationId: string,
    userId: string,
  ): Promise<void> {
    const progress = await this.getProgressOrThrow(organizationId, investigationId);

    await this.prisma.investigationChecklistProgress.delete({
      where: { id: progress.id },
    });

    this.eventEmitter.emit('investigation.checklist.deleted', {
      organizationId,
      investigationId,
      checklistId: progress.id,
      userId,
    });
  }

  /**
   * Check if a template has active instances (checklists in progress).
   * Used by template service for version-on-publish pattern.
   */
  async hasActiveInstances(
    organizationId: string,
    templateId: string,
  ): Promise<boolean> {
    const count = await this.prisma.investigationChecklistProgress.count({
      where: {
        organizationId,
        templateId,
        completedAt: null, // Not completed
      },
    });

    return count > 0;
  }

  // ===========================================
  // Private Helpers
  // ===========================================

  /**
   * Get progress or throw NotFoundException.
   */
  private async getProgressOrThrow(
    organizationId: string,
    investigationId: string,
  ) {
    const progress = await this.prisma.investigationChecklistProgress.findFirst(
      {
        where: { investigationId, organizationId },
      },
    );

    if (!progress) {
      throw new NotFoundException(
        'Checklist not found for this investigation',
      );
    }

    return progress;
  }

  /**
   * Build the response object with template details.
   */
  private buildResponse(
    progress: {
      id: string;
      investigationId: string;
      templateId: string;
      templateVersion: number;
      itemStates: unknown;
      sectionStates: unknown;
      customItems: unknown;
      skippedItems: unknown;
      totalItems: number;
      completedItems: number;
      skippedCount: number;
      customCount: number;
      progressPercent: number;
      startedAt: Date | null;
      completedAt: Date | null;
      lastActivityAt: Date | null;
    },
    template: {
      name: string;
      sections: unknown;
    },
  ): ChecklistProgressResponse {
    const sections = template.sections as unknown as ChecklistSection[];

    return {
      id: progress.id,
      investigationId: progress.investigationId,
      templateId: progress.templateId,
      templateVersion: progress.templateVersion,
      template: {
        name: template.name,
        sections: sections.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          items: s.items.map((i) => ({
            id: i.id,
            text: i.text,
            order: i.order,
            required: i.required,
            evidenceRequired: i.evidenceRequired,
            guidance: i.guidance,
          })),
        })),
      },
      itemStates: progress.itemStates as Record<string, ChecklistItemState>,
      sectionStates: progress.sectionStates as Record<string, SectionState>,
      customItems: (progress.customItems || []) as CustomItem[],
      skippedItems: (progress.skippedItems || []) as SkippedItem[],
      totalItems: progress.totalItems,
      completedItems: progress.completedItems,
      skippedCount: progress.skippedCount,
      customCount: progress.customCount,
      progressPercent: progress.progressPercent,
      startedAt: progress.startedAt?.toISOString(),
      completedAt: progress.completedAt?.toISOString(),
      lastActivityAt: progress.lastActivityAt?.toISOString(),
    };
  }
}
