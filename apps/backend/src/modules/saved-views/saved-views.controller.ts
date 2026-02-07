import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole, ViewEntityType } from "@prisma/client";
import { SavedViewsService } from "./saved-views.service";
import {
  CreateSavedViewDto,
  UpdateSavedViewDto,
  SavedViewQueryDto,
  CloneSavedViewDto,
  ReorderSavedViewsDto,
} from "./dto/saved-view.dto";

/**
 * Interface for authenticated user from JWT token.
 */
interface AuthUser {
  id: string;
  organizationId: string;
  role: UserRole;
}

/**
 * Controller for managing saved views.
 *
 * Provides REST endpoints for CRUD operations on saved views,
 * as well as apply, duplicate, and reorder functionality.
 */
@Controller("saved-views")
@UseGuards(JwtAuthGuard)
export class SavedViewsController {
  constructor(private readonly savedViewsService: SavedViewsService) {}

  /**
   * Creates a new saved view.
   */
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateSavedViewDto) {
    return this.savedViewsService.create(user.organizationId, user.id, dto);
  }

  /**
   * Lists all saved views accessible to the user.
   * Supports filtering by entity type and shared status.
   */
  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: SavedViewQueryDto,
  ) {
    return this.savedViewsService.findAll(user.organizationId, user.id, query);
  }

  /**
   * Gets the default view for an entity type.
   */
  @Get("default/:entityType")
  async getDefault(
    @CurrentUser() user: AuthUser,
    @Param("entityType") entityType: ViewEntityType,
  ) {
    return this.savedViewsService.getDefaultView(
      user.organizationId,
      user.id,
      entityType,
    );
  }

  /**
   * Gets a single saved view by ID.
   */
  @Get(":id")
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.savedViewsService.findById(user.organizationId, user.id, id);
  }

  /**
   * Updates an existing saved view.
   * Only the owner can edit a view.
   */
  @Put(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedViewDto,
  ) {
    return this.savedViewsService.update(user.organizationId, user.id, id, dto);
  }

  /**
   * Deletes a saved view.
   * Only the owner can delete a view.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.savedViewsService.delete(user.organizationId, user.id, id);
  }

  /**
   * Applies a saved view and returns validated filters.
   * Increments usage tracking.
   */
  @Post(":id/apply")
  async apply(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.savedViewsService.applyView(user.organizationId, user.id, id);
  }

  /**
   * Duplicates a saved view.
   * Creates a personal copy for the requesting user.
   */
  @Post(":id/duplicate")
  async duplicate(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CloneSavedViewDto,
  ) {
    return this.savedViewsService.duplicate(
      user.organizationId,
      user.id,
      id,
      dto.newName,
    );
  }

  /**
   * Reorders saved views.
   * Allows users to customize their view order.
   */
  @Put("reorder")
  async reorder(
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderSavedViewsDto,
  ) {
    await this.savedViewsService.reorder(
      user.organizationId,
      user.id,
      dto.viewOrders,
    );
    return { success: true };
  }

  /**
   * Updates the record count for a saved view.
   * Called after executing the view's filters to cache the result count.
   */
  @Put(":id/record-count")
  async updateRecordCount(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body("count") count: number,
  ) {
    return this.savedViewsService.updateRecordCount(
      user.organizationId,
      user.id,
      id,
      count,
    );
  }
}
