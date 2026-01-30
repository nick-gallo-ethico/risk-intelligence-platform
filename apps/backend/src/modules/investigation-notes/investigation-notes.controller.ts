// =============================================================================
// INVESTIGATION NOTES CONTROLLER
// =============================================================================
//
// REST API controller for investigation notes.
// All endpoints require authentication and are scoped to user's organization.
//
// Routes (nested under investigations):
// - POST   /api/v1/investigations/:investigationId/notes     - Create note
// - GET    /api/v1/investigations/:investigationId/notes     - List notes
// - GET    /api/v1/investigations/:investigationId/notes/:id - Get single note
// - PATCH  /api/v1/investigations/:investigationId/notes/:id - Update note
// - DELETE /api/v1/investigations/:investigationId/notes/:id - Delete note
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { InvestigationNotesService } from "./investigation-notes.service";
import {
  CreateInvestigationNoteDto,
  UpdateInvestigationNoteDto,
  InvestigationNoteQueryDto,
  InvestigationNoteResponseDto,
  InvestigationNoteListResponseDto,
} from "./dto";
import { JwtAuthGuard } from "../../common/guards";
import { CurrentUser } from "../../common/decorators";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";

/**
 * REST API controller for investigation notes.
 * All endpoints require authentication and are scoped to user's organization.
 */
@ApiTags("Investigation Notes")
@ApiBearerAuth()
@Controller("investigations/:investigationId/notes")
@UseGuards(JwtAuthGuard)
export class InvestigationNotesController {
  private readonly logger = new Logger(InvestigationNotesController.name);

  constructor(private readonly notesService: InvestigationNotesService) {}

  /**
   * POST /api/v1/investigations/:investigationId/notes
   * Creates a new note for an investigation.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a note for an investigation" })
  @ApiParam({ name: "investigationId", description: "Investigation UUID" })
  @ApiResponse({
    status: 201,
    description: "Note created",
    type: InvestigationNoteResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Investigation not found" })
  async create(
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @Body() dto: CreateInvestigationNoteDto,
    @CurrentUser() user: RequestUser,
  ): Promise<InvestigationNoteResponseDto> {
    this.logger.debug(
      `Creating note for investigation ${investigationId} by user ${user.id}`,
    );
    return this.notesService.create(
      dto,
      investigationId,
      user.id,
      user.organizationId,
    );
  }

  /**
   * GET /api/v1/investigations/:investigationId/notes
   * Returns paginated list of notes for an investigation.
   * Results are filtered based on user's visibility permissions.
   */
  @Get()
  @ApiOperation({ summary: "List notes for an investigation" })
  @ApiParam({ name: "investigationId", description: "Investigation UUID" })
  @ApiResponse({
    status: 200,
    description: "Success",
    type: InvestigationNoteListResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Investigation not found" })
  async findAll(
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @Query() query: InvestigationNoteQueryDto,
    @CurrentUser() user: RequestUser,
  ): Promise<InvestigationNoteListResponseDto> {
    return this.notesService.findAllForInvestigation(
      investigationId,
      query,
      user.id,
      user.role,
      user.organizationId,
    );
  }

  /**
   * GET /api/v1/investigations/:investigationId/notes/:id
   * Returns a single note by ID.
   * Visibility rules are enforced based on user role and note visibility setting.
   */
  @Get(":id")
  @ApiOperation({ summary: "Get a single note by ID" })
  @ApiParam({ name: "investigationId", description: "Investigation UUID" })
  @ApiParam({ name: "id", description: "Note UUID" })
  @ApiResponse({
    status: 200,
    description: "Success",
    type: InvestigationNoteResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Note not found" })
  async findOne(
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<InvestigationNoteResponseDto> {
    // The service will verify the note belongs to this investigation
    return this.notesService.findOne(
      id,
      user.id,
      user.role,
      user.organizationId,
    );
  }

  /**
   * PATCH /api/v1/investigations/:investigationId/notes/:id
   * Updates a note.
   * Only the author or COMPLIANCE_OFFICER+ can update notes.
   */
  @Patch(":id")
  @ApiOperation({ summary: "Update a note" })
  @ApiParam({ name: "investigationId", description: "Investigation UUID" })
  @ApiParam({ name: "id", description: "Note UUID" })
  @ApiResponse({
    status: 200,
    description: "Note updated",
    type: InvestigationNoteResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Note not found" })
  async update(
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestigationNoteDto,
    @CurrentUser() user: RequestUser,
  ): Promise<InvestigationNoteResponseDto> {
    this.logger.debug(`Updating note ${id} by user ${user.id}`);
    return this.notesService.update(
      id,
      dto,
      user.id,
      user.role,
      user.organizationId,
    );
  }

  /**
   * DELETE /api/v1/investigations/:investigationId/notes/:id
   * Deletes a note.
   * Only the author or COMPLIANCE_OFFICER+ can delete notes.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a note" })
  @ApiParam({ name: "investigationId", description: "Investigation UUID" })
  @ApiParam({ name: "id", description: "Note UUID" })
  @ApiResponse({ status: 204, description: "Note deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Note not found" })
  async delete(
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    this.logger.debug(`Deleting note ${id} by user ${user.id}`);
    return this.notesService.delete(
      id,
      user.id,
      user.role,
      user.organizationId,
    );
  }
}
