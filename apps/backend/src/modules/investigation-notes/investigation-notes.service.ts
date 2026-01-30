// =============================================================================
// INVESTIGATION NOTES SERVICE
// =============================================================================
//
// Service for managing investigation notes with full CRUD operations,
// activity logging, and visibility-based access control.
//
// KEY REQUIREMENTS:
// 1. All queries filter by organizationId (tenant isolation)
// 2. All mutations log to ActivityService
// 3. Visibility filtering: PRIVATE (author-only), TEAM (investigators), ALL
// 4. Content sanitization for XSS prevention
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import {
  CreateInvestigationNoteDto,
  UpdateInvestigationNoteDto,
  InvestigationNoteQueryDto,
  InvestigationNoteResponseDto,
  InvestigationNoteListResponseDto,
  AttachmentResponseDto,
} from "./dto";
import {
  NoteVisibility,
  UserRole,
  AuditEntityType,
  InvestigationNote,
  Prisma,
} from "@prisma/client";
import * as sanitizeHtml from "sanitize-html";

/**
 * Service for managing investigation notes.
 * All queries are scoped to the user's organization via RLS + explicit filters.
 */
@Injectable()
export class InvestigationNotesService {
  private readonly logger = new Logger(InvestigationNotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  // -------------------------------------------------------------------------
  // CREATE - Create new investigation note
  // -------------------------------------------------------------------------
  async create(
    dto: CreateInvestigationNoteDto,
    investigationId: string,
    userId: string,
    organizationId: string,
  ): Promise<InvestigationNoteResponseDto> {
    this.logger.debug(
      `Creating note for investigation ${investigationId} in org ${organizationId}`,
    );

    // 1. Verify investigation exists and belongs to org
    const investigation = await this.prisma.investigation.findFirst({
      where: { id: investigationId, organizationId },
    });

    if (!investigation) {
      throw new NotFoundException("Investigation not found");
    }

    // 2. Get author details for denormalization
    const author = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!author) {
      throw new NotFoundException("User not found");
    }

    const authorName = `${author.firstName} ${author.lastName}`.trim();

    // 3. Sanitize content and generate plain text
    const sanitizedContent = this.sanitizeContent(dto.content);
    const plainText = this.stripHtml(sanitizedContent);

    // 4. Create the note
    const note = await this.prisma.investigationNote.create({
      data: {
        content: sanitizedContent,
        contentPlainText: plainText,
        noteType: dto.noteType,
        visibility: dto.visibility ?? NoteVisibility.TEAM,
        attachments: dto.attachments
          ? JSON.parse(JSON.stringify(dto.attachments))
          : [],
        investigationId,
        organizationId,
        authorId: userId,
        authorName,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        investigation: {
          select: { id: true, investigationNumber: true },
        },
      },
    });

    // 5. Log activity
    await this.activityService.log({
      entityType: AuditEntityType.INVESTIGATION,
      entityId: investigation.id,
      action: "note_created",
      actionDescription: `${authorName} added a ${dto.noteType.toLowerCase()} note to Investigation #${investigation.investigationNumber}`,
      actorUserId: userId,
      organizationId,
      metadata: { noteId: note.id, noteType: dto.noteType },
    });

    return this.mapToResponseDto(note);
  }

  // -------------------------------------------------------------------------
  // FIND ALL - List notes for investigation with visibility filtering
  // -------------------------------------------------------------------------
  async findAllForInvestigation(
    investigationId: string,
    query: InvestigationNoteQueryDto,
    userId: string,
    userRole: UserRole,
    organizationId: string,
  ): Promise<InvestigationNoteListResponseDto> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      noteType,
      authorId,
    } = query;

    const skip = (page - 1) * limit;

    // Verify investigation exists and belongs to org
    const investigation = await this.prisma.investigation.findFirst({
      where: { id: investigationId, organizationId },
      select: { id: true, assignedTo: true },
    });

    if (!investigation) {
      throw new NotFoundException("Investigation not found");
    }

    // Build where clause with visibility filtering
    const where: Prisma.InvestigationNoteWhereInput = {
      investigationId,
      organizationId, // CRITICAL: Always filter by tenant
    };

    // Apply visibility filter based on user role
    where.OR = this.buildVisibilityFilter(
      userId,
      userRole,
      investigation.assignedTo,
    );

    if (noteType) {
      where.noteType = noteType;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    // Parallel query for data and count
    const [items, total] = await Promise.all([
      this.prisma.investigationNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          investigation: {
            select: { id: true, investigationNumber: true },
          },
        },
      }),
      this.prisma.investigationNote.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapToResponseDto(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // -------------------------------------------------------------------------
  // FIND ONE - Get single note with visibility check
  // -------------------------------------------------------------------------
  async findOne(
    id: string,
    userId: string,
    userRole: UserRole,
    organizationId: string,
  ): Promise<InvestigationNoteResponseDto> {
    // First get the note with investigation data
    const note = await this.prisma.investigationNote.findFirst({
      where: {
        id,
        organizationId, // CRITICAL: Include org filter to prevent cross-tenant access
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        investigation: {
          select: { id: true, investigationNumber: true, assignedTo: true },
        },
      },
    });

    if (!note) {
      throw new NotFoundException("Note not found");
    }

    // Check visibility permissions
    if (!this.canAccessNote(note, userId, userRole)) {
      throw new NotFoundException("Note not found"); // Return 404 to prevent enumeration
    }

    return this.mapToResponseDto(note);
  }

  // -------------------------------------------------------------------------
  // UPDATE - Update note with edit tracking
  // -------------------------------------------------------------------------
  async update(
    id: string,
    dto: UpdateInvestigationNoteDto,
    userId: string,
    userRole: UserRole,
    organizationId: string,
  ): Promise<InvestigationNoteResponseDto> {
    // Verify note exists and belongs to org
    const existing = await this.prisma.investigationNote.findFirst({
      where: { id, organizationId },
      include: {
        investigation: {
          select: { id: true, investigationNumber: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException("Note not found");
    }

    // Check permissions: author OR higher role (COMPLIANCE_OFFICER+)
    if (!this.canModifyNote(existing, userId, userRole)) {
      throw new ForbiddenException(
        "You do not have permission to update this note",
      );
    }

    // Build update data
    const updateData: Prisma.InvestigationNoteUpdateInput = {
      isEdited: true,
      editCount: { increment: 1 },
      editedAt: new Date(),
    };

    // Handle content update with re-sanitization
    if (dto.content !== undefined) {
      const sanitizedContent = this.sanitizeContent(dto.content);
      updateData.content = sanitizedContent;
      updateData.contentPlainText = this.stripHtml(sanitizedContent);
    }

    if (dto.noteType !== undefined) {
      updateData.noteType = dto.noteType;
    }

    if (dto.visibility !== undefined) {
      updateData.visibility = dto.visibility;
    }

    if (dto.attachments !== undefined) {
      updateData.attachments = JSON.parse(JSON.stringify(dto.attachments));
    }

    const updated = await this.prisma.investigationNote.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        investigation: {
          select: { id: true, investigationNumber: true },
        },
      },
    });

    // Get actor name for logging
    const actor = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { firstName: true, lastName: true },
    });
    const actorName = actor
      ? `${actor.firstName} ${actor.lastName}`.trim()
      : "User";

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.INVESTIGATION,
      entityId: existing.investigation.id,
      action: "note_updated",
      actionDescription: `${actorName} edited note on Investigation #${existing.investigation.investigationNumber}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { contentLength: existing.content.length },
        newValue: { contentLength: updated.content.length },
      },
      metadata: { noteId: id },
    });

    return this.mapToResponseDto(updated);
  }

  // -------------------------------------------------------------------------
  // DELETE - Remove note with activity logging
  // -------------------------------------------------------------------------
  async delete(
    id: string,
    userId: string,
    userRole: UserRole,
    organizationId: string,
  ): Promise<void> {
    // Verify note exists and belongs to org
    const existing = await this.prisma.investigationNote.findFirst({
      where: { id, organizationId },
      include: {
        investigation: {
          select: { id: true, investigationNumber: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException("Note not found");
    }

    // Check permissions: author OR higher role (COMPLIANCE_OFFICER+)
    if (!this.canModifyNote(existing, userId, userRole)) {
      throw new ForbiddenException(
        "You do not have permission to delete this note",
      );
    }

    // Get actor name for logging
    const actor = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { firstName: true, lastName: true },
    });
    const actorName = actor
      ? `${actor.firstName} ${actor.lastName}`.trim()
      : "User";

    // Delete the note
    await this.prisma.investigationNote.delete({
      where: { id },
    });

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.INVESTIGATION,
      entityId: existing.investigation.id,
      action: "note_deleted",
      actionDescription: `${actorName} deleted note from Investigation #${existing.investigation.investigationNumber}`,
      actorUserId: userId,
      organizationId,
      metadata: { noteType: existing.noteType },
    });
  }

  // -------------------------------------------------------------------------
  // HELPER - Sanitize HTML content
  // -------------------------------------------------------------------------
  private sanitizeContent(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "s",
        "ul",
        "ol",
        "li",
        "blockquote",
        "pre",
        "code",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "a",
        "span",
        "div",
      ],
      allowedAttributes: {
        a: ["href", "title", "target"],
        span: ["class"],
        div: ["class"],
      },
      allowedSchemes: ["http", "https", "mailto"],
    });
  }

  // -------------------------------------------------------------------------
  // HELPER - Strip HTML tags and generate plain text
  // -------------------------------------------------------------------------
  stripHtml(html: string): string {
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
    // Collapse whitespace and trim
    return text.replace(/\s+/g, " ").trim();
  }

  // -------------------------------------------------------------------------
  // HELPER - Build visibility filter for queries
  // -------------------------------------------------------------------------
  private buildVisibilityFilter(
    userId: string,
    userRole: UserRole,
    assignedTo: string[],
  ): Prisma.InvestigationNoteWhereInput[] {
    // Admin roles can see everything
    if (this.isAdminRole(userRole)) {
      return [
        { visibility: NoteVisibility.ALL },
        { visibility: NoteVisibility.TEAM },
        { visibility: NoteVisibility.PRIVATE },
      ];
    }

    const filters: Prisma.InvestigationNoteWhereInput[] = [
      // Everyone can see ALL visibility notes
      { visibility: NoteVisibility.ALL },
      // Author can always see their own notes
      { authorId: userId },
    ];

    // Team members can see TEAM visibility notes
    if (assignedTo.includes(userId)) {
      filters.push({ visibility: NoteVisibility.TEAM });
    }

    return filters;
  }

  // -------------------------------------------------------------------------
  // HELPER - Check if user can access a note based on visibility
  // -------------------------------------------------------------------------
  private canAccessNote(
    note: InvestigationNote & {
      investigation: { assignedTo: string[] };
    },
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Admin roles can access all notes
    if (this.isAdminRole(userRole)) {
      return true;
    }

    // Author can always access their own notes
    if (note.authorId === userId) {
      return true;
    }

    // ALL visibility: anyone with case access
    if (note.visibility === NoteVisibility.ALL) {
      return true;
    }

    // TEAM visibility: only assigned investigators
    if (note.visibility === NoteVisibility.TEAM) {
      return note.investigation.assignedTo.includes(userId);
    }

    // PRIVATE visibility: only author (already checked above)
    return false;
  }

  // -------------------------------------------------------------------------
  // HELPER - Check if user can modify a note
  // -------------------------------------------------------------------------
  private canModifyNote(
    note: InvestigationNote,
    userId: string,
    userRole: UserRole,
  ): boolean {
    // Author can always modify their own notes
    if (note.authorId === userId) {
      return true;
    }

    // Higher roles (COMPLIANCE_OFFICER+) can modify any note
    return this.isAdminRole(userRole);
  }

  // -------------------------------------------------------------------------
  // HELPER - Check if role is admin-level
  // -------------------------------------------------------------------------
  private isAdminRole(role: UserRole): boolean {
    const adminRoles: UserRole[] = [
      UserRole.SYSTEM_ADMIN,
      UserRole.COMPLIANCE_OFFICER,
      UserRole.TRIAGE_LEAD,
    ];
    return adminRoles.includes(role);
  }

  // -------------------------------------------------------------------------
  // HELPER - Map Prisma model to response DTO
  // -------------------------------------------------------------------------
  private mapToResponseDto(
    note: InvestigationNote & {
      author: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
      investigation: { id: string; investigationNumber: number };
    },
  ): InvestigationNoteResponseDto {
    return {
      id: note.id,
      investigationId: note.investigationId,
      organizationId: note.organizationId,
      content: note.content,
      contentPlainText: note.contentPlainText ?? undefined,
      noteType: note.noteType,
      visibility: note.visibility,
      author: {
        id: note.author.id,
        name: `${note.author.firstName} ${note.author.lastName}`.trim(),
        email: note.author.email,
      },
      isEdited: note.isEdited,
      editedAt: note.editedAt ?? undefined,
      editCount: note.editCount,
      attachments:
        (note.attachments as unknown as AttachmentResponseDto[]) || [],
      aiSummary: note.aiSummary ?? undefined,
      aiSummaryGeneratedAt: note.aiSummaryGeneratedAt ?? undefined,
      aiModelVersion: note.aiModelVersion ?? undefined,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      investigation: {
        id: note.investigation.id,
        investigationNumber: note.investigation.investigationNumber,
      },
    };
  }
}
