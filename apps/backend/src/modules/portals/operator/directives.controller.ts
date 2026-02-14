/**
 * DirectivesController - API Endpoints for Client Directive Management
 *
 * Provides endpoints for operators to retrieve client-specific scripts
 * and for system admins to manage directive configuration.
 *
 * Endpoints:
 * - GET /api/v1/operator/clients/:clientId/directives - List all directives grouped by stage
 * - GET /api/v1/operator/clients/:clientId/directives/call - Get directives for active call
 * - POST /api/v1/operator/clients/:clientId/directives - Create directive (admin)
 * - PUT /api/v1/operator/clients/:clientId/directives/:id - Update directive (admin)
 * - DELETE /api/v1/operator/clients/:clientId/directives/:id - Soft delete directive (admin)
 * - POST /api/v1/operator/clients/:clientId/directives/reorder - Reorder directives (admin)
 *
 * Note: Operator endpoints use :clientId param because operators work across
 * multiple client organizations.
 */

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
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import { DirectivesService } from "./directives.service";
import {
  CreateDirectiveDto,
  UpdateDirectiveDto,
  ReorderDirectivesDto,
} from "./dto/directives.dto";
import { JwtAuthGuard, RolesGuard } from "../../../common/guards";
import { Roles, UserRole } from "../../../common/decorators/roles.decorator";
import { CallDirectives, DirectivesByStage } from "./types/directives.types";

@Controller("operator/clients/:clientId/directives")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DirectivesController {
  constructor(private readonly directivesService: DirectivesService) {}

  /**
   * GET /api/v1/operator/clients/:clientId/directives
   *
   * Get all directives for a client, grouped by stage.
   * Requires OPERATOR or SYSTEM_ADMIN role.
   *
   * @param clientId - Client organization ID
   * @param categoryId - Optional filter for category-specific directives
   * @returns Directives grouped by stage
   */
  @Get()
  @Roles("OPERATOR" as UserRole, UserRole.SYSTEM_ADMIN)
  async listDirectives(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Query("categoryId") categoryId?: string,
  ): Promise<DirectivesByStage> {
    return this.directivesService.getAllDirectives(clientId, {
      categoryId,
      includeInactive: false,
    });
  }

  /**
   * GET /api/v1/operator/clients/:clientId/directives/call
   *
   * Get all directives needed for an active call.
   * Returns directives grouped in the order needed during a call.
   * Requires OPERATOR role.
   *
   * @param clientId - Client organization ID
   * @param categoryId - Optional category ID for category-specific directives
   * @returns CallDirectives with opening, intake, categorySpecific, and closing arrays
   */
  @Get("call")
  @Roles("OPERATOR" as UserRole, UserRole.SYSTEM_ADMIN)
  async getDirectivesForCall(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Query("categoryId") categoryId?: string,
  ): Promise<CallDirectives> {
    return this.directivesService.getDirectivesForCall(clientId, categoryId);
  }

  /**
   * GET /api/v1/operator/clients/:clientId/directives/:id
   *
   * Get a single directive by ID.
   * Requires OPERATOR or SYSTEM_ADMIN role.
   *
   * @param clientId - Client organization ID
   * @param id - Directive ID
   * @returns Single directive with category relation
   */
  @Get(":id")
  @Roles("OPERATOR" as UserRole, UserRole.SYSTEM_ADMIN)
  async getDirective(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.directivesService.getById(id, clientId);
  }

  /**
   * POST /api/v1/operator/clients/:clientId/directives
   *
   * Create a new directive for a client.
   * Requires SYSTEM_ADMIN role.
   *
   * @param clientId - Client organization ID
   * @param dto - Create data
   * @returns Created directive
   */
  @Post()
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createDirective(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: CreateDirectiveDto,
  ) {
    return this.directivesService.create(clientId, dto);
  }

  /**
   * PUT /api/v1/operator/clients/:clientId/directives/:id
   *
   * Update an existing directive.
   * Requires SYSTEM_ADMIN role.
   *
   * @param clientId - Client organization ID
   * @param id - Directive ID
   * @param dto - Update data
   * @returns Updated directive
   */
  @Put(":id")
  @Roles(UserRole.SYSTEM_ADMIN)
  async updateDirective(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateDirectiveDto,
  ) {
    return this.directivesService.update(id, clientId, dto);
  }

  /**
   * DELETE /api/v1/operator/clients/:clientId/directives/:id
   *
   * Soft delete a directive (sets isActive = false).
   * Requires SYSTEM_ADMIN role.
   *
   * @param clientId - Client organization ID
   * @param id - Directive ID
   */
  @Delete(":id")
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDirective(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.directivesService.delete(id, clientId);
  }

  /**
   * POST /api/v1/operator/clients/:clientId/directives/reorder
   *
   * Reorder directives within a stage.
   * All IDs must belong to the same stage.
   * Requires SYSTEM_ADMIN role.
   *
   * @param clientId - Client organization ID
   * @param dto - Reorder data with array of directive IDs
   */
  @Post("reorder")
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderDirectives(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: ReorderDirectivesDto,
  ): Promise<void> {
    await this.directivesService.reorder(clientId, dto.ids);
  }
}
