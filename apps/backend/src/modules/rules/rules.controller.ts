import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { RulesService } from "./rules.service";
import { CreateRuleDto, UpdateRuleDto } from "./dto";

interface AuthenticatedUser {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
}

/**
 * RulesController handles rule definition management.
 *
 * Endpoints:
 * - CRUD operations for rules
 * - Rule activation/deactivation
 * - Execution log retrieval
 *
 * Access: SYSTEM_ADMIN and COMPLIANCE_OFFICER roles only.
 */
@Controller("rules")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  /**
   * Create a new rule definition.
   */
  @Post()
  async create(
    @Body() dto: CreateRuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @TenantId() organizationId: string,
  ) {
    return this.rulesService.create(dto, user.id, organizationId);
  }

  /**
   * List all rules with optional filters.
   * Query params: triggerEvent, isActive
   */
  @Get()
  async findAll(
    @TenantId() organizationId: string,
    @Query("triggerEvent") triggerEvent?: string,
    @Query("isActive") isActive?: string,
  ) {
    return this.rulesService.findAll(organizationId, {
      triggerEvent,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
    });
  }

  /**
   * Get a single rule by ID.
   */
  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    const rule = await this.rulesService.findOne(id, organizationId);
    if (!rule) {
      throw new NotFoundException(`Rule ${id} not found`);
    }
    return rule;
  }

  /**
   * Update a rule.
   */
  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @TenantId() organizationId: string,
  ) {
    return this.rulesService.update(id, dto, user.id, organizationId);
  }

  /**
   * Delete a rule.
   * If the rule has execution logs, it will be deactivated instead of deleted.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    await this.rulesService.delete(id, organizationId);
  }

  /**
   * Activate a rule.
   */
  @Post(":id/activate")
  async activate(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    return this.rulesService.activate(id, organizationId);
  }

  /**
   * Deactivate a rule.
   */
  @Post(":id/deactivate")
  async deactivate(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    return this.rulesService.deactivate(id, organizationId);
  }

  /**
   * Get execution logs for a rule.
   * Query params: limit (default 50)
   */
  @Get(":id/logs")
  async getExecutionLogs(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.rulesService.getExecutionLogs(
      id,
      organizationId,
      Math.min(parsedLimit, 500),
    );
  }
}
