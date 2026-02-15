/**
 * DisclosureDraftService - Manages disclosure draft save/resume functionality
 *
 * Handles draft lifecycle:
 * - Create and update drafts for partial form completion
 * - Retrieve drafts for resume functionality
 * - Delete drafts (on submission or manual)
 *
 * Extracted from DisclosureSubmissionService for maintainability.
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AssignmentStatus, DisclosureType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  SaveDraftDto,
  DraftResponseDto,
} from "../dto/disclosure-submission.dto";

/**
 * Disclosure draft stored in database.
 * Used for save/resume functionality.
 */
interface DisclosureDraft {
  id: string;
  organizationId: string;
  employeeId: string;
  assignmentId: string | null;
  formTemplateId: string | null;
  disclosureType: DisclosureType | null;
  formData: Prisma.JsonValue;
  completionPercentage: number;
  currentSection: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DisclosureDraftService {
  private readonly logger = new Logger(DisclosureDraftService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Saves a disclosure draft for later completion.
   * Creates or updates a draft based on employee context.
   */
  async saveDraft(
    dto: SaveDraftDto,
    employeeId: string,
    organizationId: string,
    _userId: string,
  ): Promise<DraftResponseDto> {
    // Check for existing draft for this employee and optional assignment
    const existingDraft = await this.prisma.disclosureDraft.findFirst({
      where: {
        organizationId,
        employeeId,
        ...(dto.assignmentId && { assignmentId: dto.assignmentId }),
        ...(!dto.assignmentId && { assignmentId: null }),
      },
    });

    let draft;

    if (existingDraft) {
      // Update existing draft
      draft = await this.prisma.disclosureDraft.update({
        where: { id: existingDraft.id },
        data: {
          formData: dto.formData as Prisma.InputJsonValue,
          disclosureType: dto.disclosureType,
          formTemplateId: dto.formTemplateId,
          completionPercentage: dto.completionPercentage ?? 0,
          currentSection: dto.currentSection,
        },
      });

      this.logger.debug(`Updated draft ${draft.id} for employee ${employeeId}`);
    } else {
      // Create new draft
      draft = await this.prisma.disclosureDraft.create({
        data: {
          organizationId,
          employeeId,
          assignmentId: dto.assignmentId,
          formTemplateId: dto.formTemplateId,
          disclosureType: dto.disclosureType,
          formData: dto.formData as Prisma.InputJsonValue,
          completionPercentage: dto.completionPercentage ?? 0,
          currentSection: dto.currentSection,
        },
      });

      // If assignment exists, mark as in progress
      if (dto.assignmentId) {
        await this.prisma.campaignAssignment.update({
          where: { id: dto.assignmentId },
          data: {
            status: AssignmentStatus.IN_PROGRESS,
            startedAt: new Date(),
          },
        });
      }

      this.logger.log(`Created draft ${draft.id} for employee ${employeeId}`);
    }

    return this.mapDraftToDto(draft);
  }

  /**
   * Gets a draft by ID.
   */
  async getDraft(
    draftId: string,
    employeeId: string,
    organizationId: string,
  ): Promise<DraftResponseDto | null> {
    const draft = await this.prisma.disclosureDraft.findFirst({
      where: {
        id: draftId,
        employeeId,
        organizationId,
      },
    });

    return draft ? this.mapDraftToDto(draft) : null;
  }

  /**
   * Gets drafts for an employee.
   */
  async getDraftsForEmployee(
    employeeId: string,
    organizationId: string,
  ): Promise<DraftResponseDto[]> {
    const drafts = await this.prisma.disclosureDraft.findMany({
      where: {
        employeeId,
        organizationId,
      },
      orderBy: { updatedAt: "desc" },
    });

    return drafts.map((d) => this.mapDraftToDto(d));
  }

  /**
   * Deletes a draft.
   */
  async deleteDraft(
    draftId: string,
    employeeId: string,
    organizationId: string,
  ): Promise<void> {
    const draft = await this.prisma.disclosureDraft.findFirst({
      where: {
        id: draftId,
        employeeId,
        organizationId,
      },
    });

    if (!draft) {
      throw new NotFoundException(`Draft ${draftId} not found`);
    }

    await this.prisma.disclosureDraft.delete({
      where: { id: draftId },
    });

    this.logger.log(`Deleted draft ${draftId} for employee ${employeeId}`);
  }

  /**
   * Deletes a draft by ID without ownership check.
   * Used internally after successful submission.
   */
  async deleteDraftById(draftId: string): Promise<void> {
    try {
      await this.prisma.disclosureDraft.delete({
        where: { id: draftId },
      });
    } catch {
      // Ignore if draft doesn't exist
    }
  }

  /**
   * Maps draft to DTO.
   */
  mapDraftToDto(draft: DisclosureDraft): DraftResponseDto {
    return {
      id: draft.id,
      organizationId: draft.organizationId,
      employeeId: draft.employeeId,
      assignmentId: draft.assignmentId ?? undefined,
      formTemplateId: draft.formTemplateId ?? undefined,
      disclosureType: draft.disclosureType ?? undefined,
      formData: (draft.formData as Record<string, unknown>) ?? {},
      completionPercentage: draft.completionPercentage,
      currentSection: draft.currentSection ?? undefined,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
  }
}
