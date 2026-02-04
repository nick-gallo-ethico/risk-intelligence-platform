/**
 * PreferencesController - Notification Preferences Management
 *
 * REST API for user notification preferences and organization settings:
 * - Get/update user notification preferences
 * - Set/clear out-of-office with backup delegation
 * - Get/update organization notification settings (admin only)
 *
 * All endpoints enforce tenant isolation via organizationId from JWT.
 *
 * @see PreferenceService for user preference management
 * @see OrgNotificationSettingsService for org-level configuration
 */

import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard, TenantGuard, RolesGuard } from '../../../common/guards';
import { CurrentUser, TenantId, Roles, UserRole } from '../../../common/decorators';
import { PreferenceService, UserPreferences } from '../services/preference.service';
import { OrgNotificationSettingsService, OrgNotificationSettings } from '../services/org-settings.service';
import {
  UpdatePreferencesDto,
  UpdateOrgNotificationSettingsDto,
  PreferencesResponseDto,
} from '../dto/notification.dto';
import { IsString, IsUUID, IsDateString } from 'class-validator';

/**
 * DTO for setting out-of-office status.
 */
class SetOOODto {
  @IsUUID()
  backupUserId: string;

  @IsDateString()
  oooUntil: string;
}

/**
 * Response DTO for OOO operations.
 */
class OOOResponseDto {
  success: boolean;
  oooUntil?: Date;
  backupUserId?: string;
}

/**
 * Response DTO for org settings.
 */
class OrgSettingsResponseDto {
  enforcedCategories: string[];
  defaultQuietHoursStart: string | null;
  defaultQuietHoursEnd: string | null;
  digestTime: string;
}

/**
 * User object from JWT token.
 */
interface JwtUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
}

@Controller('api/v1/notifications/preferences')
@ApiTags('Notification Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
export class PreferencesController {
  private readonly logger = new Logger(PreferencesController.name);

  constructor(
    private readonly preferenceService: PreferenceService,
    private readonly orgSettingsService: OrgNotificationSettingsService,
  ) {}

  /**
   * Get user notification preferences.
   * Returns preferences merged with enforced categories from org settings.
   *
   * GET /api/v1/notifications/preferences
   */
  @Get()
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'User preferences with enforced categories',
    type: PreferencesResponseDto,
  })
  async getPreferences(
    @CurrentUser() user: JwtUser,
    @TenantId() organizationId: string,
  ): Promise<PreferencesResponseDto & { enforcedCategories: string[] }> {
    // Load preferences and org settings in parallel
    const [userPrefs, orgSettings] = await Promise.all([
      this.preferenceService.getPreferences(user.id, organizationId),
      this.orgSettingsService.getSettings(organizationId),
    ]);

    // Compute effective quiet hours (user overrides org defaults)
    const effectiveQuietHours =
      userPrefs.quietHoursStart && userPrefs.quietHoursEnd
        ? { start: userPrefs.quietHoursStart, end: userPrefs.quietHoursEnd }
        : orgSettings.defaultQuietHoursStart && orgSettings.defaultQuietHoursEnd
          ? { start: orgSettings.defaultQuietHoursStart, end: orgSettings.defaultQuietHoursEnd }
          : undefined;

    return {
      preferences: userPrefs.preferences,
      quietHoursStart: userPrefs.quietHoursStart || undefined,
      quietHoursEnd: userPrefs.quietHoursEnd || undefined,
      timezone: userPrefs.timezone,
      backupUserId: userPrefs.backupUserId || undefined,
      oooUntil: userPrefs.oooUntil || undefined,
      effectiveQuietHours,
      enforcedCategories: orgSettings.enforcedCategories,
    };
  }

  /**
   * Update user notification preferences.
   *
   * PUT /api/v1/notifications/preferences
   */
  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
  })
  async updatePreferences(
    @CurrentUser() user: JwtUser,
    @TenantId() organizationId: string,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<{ success: boolean }> {
    await this.preferenceService.updatePreferences(user.id, organizationId, dto);

    this.logger.log(`Updated preferences for user ${user.id}`);

    return { success: true };
  }

  /**
   * Set out-of-office status with backup user.
   * Urgent notifications will be delegated to the backup user.
   *
   * POST /api/v1/notifications/preferences/ooo
   */
  @Post('ooo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set out-of-office status' })
  @ApiResponse({
    status: 200,
    description: 'OOO status set successfully',
    type: OOOResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid backup user' })
  async setOOO(
    @CurrentUser() user: JwtUser,
    @TenantId() organizationId: string,
    @Body() dto: SetOOODto,
  ): Promise<OOOResponseDto> {
    const oooUntil = new Date(dto.oooUntil);

    await this.preferenceService.setOOO(
      user.id,
      organizationId,
      dto.backupUserId,
      oooUntil,
    );

    this.logger.log(
      `Set OOO for user ${user.id} until ${oooUntil.toISOString()}, backup: ${dto.backupUserId}`,
    );

    return {
      success: true,
      oooUntil,
      backupUserId: dto.backupUserId,
    };
  }

  /**
   * Clear out-of-office status.
   *
   * DELETE /api/v1/notifications/preferences/ooo
   */
  @Delete('ooo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear out-of-office status' })
  @ApiResponse({
    status: 200,
    description: 'OOO status cleared',
    type: OOOResponseDto,
  })
  async clearOOO(
    @CurrentUser() user: JwtUser,
    @TenantId() organizationId: string,
  ): Promise<OOOResponseDto> {
    await this.preferenceService.clearOOO(user.id, organizationId);

    this.logger.log(`Cleared OOO for user ${user.id}`);

    return { success: true };
  }

  /**
   * Get organization notification settings.
   * Available to all authenticated users (read-only view).
   *
   * GET /api/v1/notifications/preferences/org-settings
   */
  @Get('org-settings')
  @ApiOperation({ summary: 'Get organization notification settings' })
  @ApiResponse({
    status: 200,
    description: 'Organization notification settings',
    type: OrgSettingsResponseDto,
  })
  async getOrgSettings(
    @TenantId() organizationId: string,
  ): Promise<OrgSettingsResponseDto> {
    const settings = await this.orgSettingsService.getSettings(organizationId);

    return {
      enforcedCategories: settings.enforcedCategories,
      defaultQuietHoursStart: settings.defaultQuietHoursStart,
      defaultQuietHoursEnd: settings.defaultQuietHoursEnd,
      digestTime: settings.digestTime,
    };
  }

  /**
   * Update organization notification settings.
   * Restricted to SYSTEM_ADMIN role.
   *
   * PUT /api/v1/notifications/preferences/org-settings
   */
  @Put('org-settings')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Update organization notification settings (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires SYSTEM_ADMIN role' })
  async updateOrgSettings(
    @CurrentUser() user: JwtUser,
    @TenantId() organizationId: string,
    @Body() dto: UpdateOrgNotificationSettingsDto,
  ): Promise<{ success: boolean }> {
    // Double-check role (belt and suspenders with RolesGuard)
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Only SYSTEM_ADMIN can update organization settings');
    }

    await this.orgSettingsService.updateSettings(organizationId, dto);

    this.logger.log(
      `Updated org notification settings for org ${organizationId} by user ${user.id}`,
    );

    return { success: true };
  }
}
