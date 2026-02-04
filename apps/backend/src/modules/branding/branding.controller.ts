/**
 * BrandingController - White-Label Branding API
 *
 * Provides endpoints for managing per-tenant branding configuration and
 * serving CSS custom properties for theme customization.
 *
 * Endpoints:
 * - GET  /api/v1/public/branding/:tenantSlug/css - Public CSS endpoint
 * - GET  /api/v1/branding                        - Get current org's branding config
 * - PUT  /api/v1/branding                        - Update branding configuration
 * - POST /api/v1/branding/preview-css            - Preview CSS without saving
 *
 * The public CSS endpoint requires no authentication and is cached for 1 hour.
 * Admin endpoints require SYSTEM_ADMIN or COMPLIANCE_OFFICER roles.
 *
 * @see BrandingService for business logic
 */

import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, TenantGuard, Public } from '../../common/guards';
import { CurrentUser, TenantId, Roles, UserRole } from '../../common/decorators';
import { BrandingService } from './branding.service';
import {
  UpdateBrandingDto,
  PreviewCssDto,
  BrandingResponseDto,
} from './dto/branding.dto';

/**
 * User object from JWT token.
 */
interface JwtUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
}

/**
 * Public controller for serving tenant CSS.
 * No authentication required - CSS is public.
 *
 * Route: /api/v1/public/branding
 */
@Controller('public/branding')
@ApiTags('Branding (Public)')
export class PublicBrandingController {
  private readonly logger = new Logger(PublicBrandingController.name);

  constructor(private readonly brandingService: BrandingService) {}

  /**
   * Get CSS custom properties for a tenant's branding.
   *
   * This is a PUBLIC endpoint - no authentication required.
   * The CSS is cached for 1 hour on the CDN/browser.
   *
   * For TEMPLATE mode: Derives colors from primaryColor.
   * For FULL_WHITE_LABEL mode: Uses complete colorPalette.
   *
   * @example GET /api/v1/public/branding/acme/css
   * @returns CSS string with :root { --primary: ...; --background: ...; }
   */
  @Get(':tenantSlug/css')
  @Public()
  @ApiOperation({ summary: 'Get tenant branding CSS (public)' })
  @ApiParam({
    name: 'tenantSlug',
    description: 'Organization slug',
    example: 'acme-corp',
  })
  @ApiProduces('text/css')
  @ApiResponse({
    status: 200,
    description: 'CSS custom properties for theming',
    content: {
      'text/css': {
        schema: {
          type: 'string',
          example: ':root { --primary: 221 83% 53%; --background: 0 0% 100%; }',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Tenant not found (returns default CSS)' })
  async getCss(
    @Param('tenantSlug') tenantSlug: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.debug(`Fetching CSS for tenant: ${tenantSlug}`);

    const css = await this.brandingService.getCss(tenantSlug);

    // Set cache headers for CDN/browser caching (1 hour)
    res.setHeader('Content-Type', 'text/css');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(css);
  }
}

/**
 * Admin controller for managing branding configuration.
 * Requires authentication and appropriate roles.
 *
 * Route: /api/v1/branding
 */
@Controller('branding')
@ApiTags('Branding (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
export class BrandingController {
  private readonly logger = new Logger(BrandingController.name);

  constructor(private readonly brandingService: BrandingService) {}

  /**
   * Get current organization's branding configuration.
   *
   * Returns the complete branding config including:
   * - Mode (TEMPLATE or FULL_WHITE_LABEL)
   * - Logo URL, primary color, theme
   * - Color palette and typography (for FULL_WHITE_LABEL)
   * - Custom domain and footer text
   *
   * @example GET /api/v1/branding
   */
  @Get()
  @ApiOperation({ summary: 'Get branding configuration' })
  @ApiResponse({
    status: 200,
    description: 'Current branding configuration',
    type: BrandingResponseDto,
  })
  async getBranding(
    @TenantId() organizationId: string,
  ): Promise<BrandingResponseDto> {
    this.logger.debug(`Getting branding for org: ${organizationId}`);

    const branding = await this.brandingService.getBrandingByOrgId(organizationId);

    return branding as BrandingResponseDto;
  }

  /**
   * Update branding configuration for current organization.
   *
   * Requires SYSTEM_ADMIN or COMPLIANCE_OFFICER role.
   *
   * For FULL_WHITE_LABEL mode, colorPalette must be provided
   * (either in this request or already configured).
   *
   * @example PUT /api/v1/branding
   *          Body: { mode: "TEMPLATE", primaryColor: "200 85% 45%", theme: "LIGHT" }
   */
  @Put()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Update branding configuration' })
  @ApiResponse({
    status: 200,
    description: 'Updated branding configuration',
    type: BrandingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (e.g., FULL_WHITE_LABEL requires colorPalette)',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  async updateBranding(
    @TenantId() organizationId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateBrandingDto,
  ): Promise<BrandingResponseDto> {
    this.logger.log(
      `User ${user.id} updating branding for org: ${organizationId}`,
    );

    const branding = await this.brandingService.update(organizationId, dto);

    return branding as BrandingResponseDto;
  }

  /**
   * Preview CSS generation without saving.
   *
   * Useful for live preview in the admin UI before committing changes.
   * Accepts branding config in request body and returns generated CSS.
   *
   * @example POST /api/v1/branding/preview-css
   *          Body: { primaryColor: "200 85% 45%", theme: "DARK" }
   */
  @Post('preview-css')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview CSS without saving' })
  @ApiProduces('text/css')
  @ApiResponse({
    status: 200,
    description: 'Generated CSS for preview',
    content: {
      'text/css': {
        schema: {
          type: 'string',
          example: ':root { --primary: 200 85% 45%; --background: 222 47% 11%; }',
        },
      },
    },
  })
  previewCss(
    @Body() dto: PreviewCssDto,
    @Res() res: Response,
  ): void {
    this.logger.debug('Generating preview CSS');

    const css = this.brandingService.previewCss(dto);

    res.setHeader('Content-Type', 'text/css');
    res.send(css);
  }
}
