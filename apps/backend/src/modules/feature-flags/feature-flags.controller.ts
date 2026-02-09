import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { FeatureFlagsService } from "./feature-flags.service";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import {
  SetFeatureFlagDto,
  CheckFeatureFlagDto,
  FeatureFlagResponseDto,
} from "./dto";

/**
 * Controller for managing feature flags.
 *
 * Provides endpoints for:
 * - Checking if a feature is enabled (authenticated users)
 * - CRUD operations on feature flags (SYSTEM_ADMIN only)
 */
@ApiTags("Feature Flags")
@Controller("feature-flags")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: "Get all feature flags (admin only)" })
  @ApiResponse({
    status: 200,
    description: "List of all feature flags",
    type: [FeatureFlagResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - requires SYSTEM_ADMIN role",
  })
  async getAllFlags(): Promise<FeatureFlagResponseDto[]> {
    return this.featureFlagsService.getAllFlags();
  }

  @Get(":name")
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: "Get a specific feature flag by name (admin only)" })
  @ApiParam({ name: "name", description: "Feature flag name" })
  @ApiResponse({
    status: 200,
    description: "Feature flag details",
    type: FeatureFlagResponseDto,
  })
  @ApiResponse({ status: 404, description: "Feature flag not found" })
  async getFlag(
    @Param("name") name: string,
  ): Promise<FeatureFlagResponseDto | null> {
    return this.featureFlagsService.getFlag(name);
  }

  @Get(":name/check")
  @ApiOperation({
    summary: "Check if a feature flag is enabled for the current context",
  })
  @ApiParam({ name: "name", description: "Feature flag name" })
  @ApiResponse({
    status: 200,
    description: "Feature flag status",
    type: CheckFeatureFlagDto,
  })
  async checkFlag(@Param("name") name: string): Promise<CheckFeatureFlagDto> {
    const enabled = await this.featureFlagsService.isEnabled(name);
    return { name, enabled };
  }

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Create or update a feature flag (admin only)" })
  @ApiResponse({
    status: 200,
    description: "Feature flag created/updated successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - requires SYSTEM_ADMIN role",
  })
  async setFlag(@Body() dto: SetFeatureFlagDto): Promise<{ success: boolean }> {
    await this.featureFlagsService.setFlag(dto);
    return { success: true };
  }

  @Delete(":name")
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a feature flag (admin only)" })
  @ApiParam({ name: "name", description: "Feature flag name to delete" })
  @ApiResponse({
    status: 204,
    description: "Feature flag deleted successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - requires SYSTEM_ADMIN role",
  })
  async deleteFlag(@Param("name") name: string): Promise<void> {
    await this.featureFlagsService.deleteFlag(name);
  }
}
