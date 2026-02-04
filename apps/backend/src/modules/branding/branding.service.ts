/**
 * BrandingService - White-Label Branding Management
 *
 * Manages per-tenant branding configuration for Ethics Portal and other
 * customer-facing portals. Generates CSS custom properties from branding config.
 *
 * Key features:
 * - Two modes: TEMPLATE (basic) and FULL_WHITE_LABEL (complete customization)
 * - CSS generation with shadcn/ui compatible custom properties
 * - 1-hour cache TTL for branding config
 * - Automatic cache invalidation on update
 * - Event emission for branding changes
 *
 * Cache keys:
 * - Branding config: `branding:${organizationId}`
 * - CSS output: `branding:css:${organizationId}`
 */

import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import {
  BrandingMode as PrismaBrandingMode,
  ThemeMode as PrismaThemeMode,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBrandingDto, PreviewCssDto } from './dto/branding.dto';
import {
  BrandingConfig,
  BrandingMode,
  ThemeMode,
  ColorPalette,
  Typography,
  DEFAULT_COLOR_PALETTE,
  DEFAULT_DARK_COLOR_PALETTE,
  DEFAULT_TYPOGRAPHY,
  CSS_VAR_MAPPING,
} from './types/branding.types';

/** Cache TTL in milliseconds (1 hour) */
const BRANDING_CACHE_TTL = 60 * 60 * 1000;

/** Event emitted when branding configuration is updated */
export interface BrandingUpdatedEvent {
  organizationId: string;
  mode: BrandingMode;
  updatedAt: Date;
}

@Injectable()
export class BrandingService {
  private readonly logger = new Logger(BrandingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get branding configuration for a tenant.
   * Checks cache first, falls back to database lookup by organization slug.
   *
   * @param tenantSlug - Organization slug
   * @returns Branding configuration (defaults if none configured)
   */
  async getBranding(tenantSlug: string): Promise<BrandingConfig> {
    // First, find organization by slug to get the ID
    const org = await this.prisma.organization.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });

    if (!org) {
      throw new NotFoundException(`Organization not found: ${tenantSlug}`);
    }

    return this.getBrandingByOrgId(org.id);
  }

  /**
   * Get branding configuration by organization ID.
   * Uses caching for performance.
   *
   * @param organizationId - Organization ID
   * @returns Branding configuration (defaults if none configured)
   */
  async getBrandingByOrgId(organizationId: string): Promise<BrandingConfig> {
    const cacheKey = this.getCacheKey(organizationId);

    // Check cache first
    const cached = await this.cacheManager.get<BrandingConfig>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for branding: ${cacheKey}`);
      return cached;
    }

    // Query database
    const branding = await this.prisma.tenantBranding.findUnique({
      where: { organizationId },
    });

    // Build branding config (use defaults if not configured)
    const config: BrandingConfig = branding
      ? {
          id: branding.id,
          organizationId: branding.organizationId,
          mode: branding.mode as BrandingMode,
          logoUrl: branding.logoUrl,
          primaryColor: branding.primaryColor,
          theme: branding.theme as ThemeMode,
          colorPalette: branding.colorPalette as ColorPalette | null,
          typography: branding.typography as Typography | null,
          customDomain: branding.customDomain,
          footerText: branding.footerText,
          welcomeVideoUrl: branding.welcomeVideoUrl,
          createdAt: branding.createdAt,
          updatedAt: branding.updatedAt,
        }
      : this.getDefaultBranding(organizationId);

    // Cache result
    await this.cacheManager.set(cacheKey, config, BRANDING_CACHE_TTL);
    this.logger.debug(`Cached branding for org: ${organizationId}`);

    return config;
  }

  /**
   * Generate CSS custom properties from branding configuration.
   * For TEMPLATE mode: Derives colors from primaryColor.
   * For FULL_WHITE_LABEL mode: Uses full colorPalette.
   *
   * @param branding - Branding configuration
   * @returns CSS string with :root { ... } declaration
   */
  generateCss(branding: BrandingConfig): string {
    const palette = this.resolvePalette(branding);
    const typography = branding.typography || DEFAULT_TYPOGRAPHY;

    const cssVars: string[] = [];

    // Add color palette variables
    for (const [key, value] of Object.entries(palette)) {
      const cssVar = CSS_VAR_MAPPING[key as keyof ColorPalette];
      if (cssVar) {
        cssVars.push(`  ${cssVar}: ${value};`);
      }
    }

    // Add typography variables
    cssVars.push(`  --font-family: ${typography.fontFamily};`);
    cssVars.push(
      `  --heading-font-family: ${typography.headingFontFamily || typography.fontFamily};`,
    );

    // Add logo URL variable (for CSS background-image usage)
    if (branding.logoUrl) {
      cssVars.push(`  --logo-url: url("${branding.logoUrl}");`);
    }

    return `:root {\n${cssVars.join('\n')}\n}`;
  }

  /**
   * Get CSS string for a tenant.
   * Uses caching for the generated CSS.
   *
   * @param tenantSlug - Organization slug
   * @returns CSS string
   */
  async getCss(tenantSlug: string): Promise<string> {
    // First, find organization by slug
    const org = await this.prisma.organization.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });

    if (!org) {
      // Return default CSS for unknown tenants
      return this.generateCss(this.getDefaultBranding('unknown'));
    }

    const cssCacheKey = `branding:css:${org.id}`;

    // Check CSS cache
    const cachedCss = await this.cacheManager.get<string>(cssCacheKey);
    if (cachedCss) {
      this.logger.debug(`CSS cache hit for org: ${org.id}`);
      return cachedCss;
    }

    // Get branding config and generate CSS
    const branding = await this.getBrandingByOrgId(org.id);
    const css = this.generateCss(branding);

    // Cache the CSS
    await this.cacheManager.set(cssCacheKey, css, BRANDING_CACHE_TTL);
    this.logger.debug(`Cached CSS for org: ${org.id}`);

    return css;
  }

  /**
   * Update branding configuration for an organization.
   * Validates colorPalette if mode is FULL_WHITE_LABEL.
   * Invalidates cache and emits update event.
   *
   * @param organizationId - Organization ID
   * @param dto - Update data
   * @returns Updated branding configuration
   */
  async update(
    organizationId: string,
    dto: UpdateBrandingDto,
  ): Promise<BrandingConfig> {
    // Validate full white-label requirements
    if (dto.mode === BrandingMode.FULL_WHITE_LABEL && !dto.colorPalette) {
      // Check if existing branding has colorPalette
      const existing = await this.prisma.tenantBranding.findUnique({
        where: { organizationId },
        select: { colorPalette: true },
      });

      if (!existing?.colorPalette && !dto.colorPalette) {
        throw new BadRequestException(
          'FULL_WHITE_LABEL mode requires colorPalette to be configured',
        );
      }
    }

    // Build update data - only include fields that were provided
    const updateData: Record<string, unknown> = {};

    if (dto.mode !== undefined) updateData.mode = dto.mode;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.primaryColor !== undefined)
      updateData.primaryColor = dto.primaryColor;
    if (dto.theme !== undefined) updateData.theme = dto.theme;
    if (dto.colorPalette !== undefined)
      updateData.colorPalette = dto.colorPalette;
    if (dto.typography !== undefined) updateData.typography = dto.typography;
    if (dto.customDomain !== undefined)
      updateData.customDomain = dto.customDomain;
    if (dto.footerText !== undefined) updateData.footerText = dto.footerText;
    if (dto.welcomeVideoUrl !== undefined)
      updateData.welcomeVideoUrl = dto.welcomeVideoUrl;

    // Upsert branding record
    // Map TS enum to Prisma enum values
    const prismaModeMap: Record<BrandingMode, PrismaBrandingMode> = {
      [BrandingMode.TEMPLATE]: PrismaBrandingMode.TEMPLATE,
      [BrandingMode.FULL_WHITE_LABEL]: PrismaBrandingMode.FULL_WHITE_LABEL,
    };
    const prismaThemeMap: Record<ThemeMode, PrismaThemeMode> = {
      [ThemeMode.LIGHT]: PrismaThemeMode.LIGHT,
      [ThemeMode.DARK]: PrismaThemeMode.DARK,
      [ThemeMode.SYSTEM]: PrismaThemeMode.SYSTEM,
    };

    const branding = await this.prisma.tenantBranding.upsert({
      where: { organizationId },
      create: {
        organizationId,
        mode: prismaModeMap[dto.mode || BrandingMode.TEMPLATE],
        logoUrl: dto.logoUrl || null,
        primaryColor: dto.primaryColor || null,
        theme: prismaThemeMap[dto.theme || ThemeMode.LIGHT],
        colorPalette: dto.colorPalette
          ? (dto.colorPalette as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        typography: dto.typography
          ? (dto.typography as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        customDomain: dto.customDomain || null,
        footerText: dto.footerText || null,
        welcomeVideoUrl: dto.welcomeVideoUrl || null,
      },
      update: updateData,
    });

    // Invalidate cache
    await this.invalidateCache(organizationId);

    // Emit update event
    const event: BrandingUpdatedEvent = {
      organizationId,
      mode: branding.mode as BrandingMode,
      updatedAt: branding.updatedAt,
    };
    this.eventEmitter.emit('branding.updated', event);
    this.logger.log(
      `Branding updated for org ${organizationId}, mode: ${branding.mode}`,
    );

    // Return updated config
    return {
      id: branding.id,
      organizationId: branding.organizationId,
      mode: branding.mode as BrandingMode,
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
      theme: branding.theme as ThemeMode,
      colorPalette: branding.colorPalette as ColorPalette | null,
      typography: branding.typography as Typography | null,
      customDomain: branding.customDomain,
      footerText: branding.footerText,
      welcomeVideoUrl: branding.welcomeVideoUrl,
      createdAt: branding.createdAt,
      updatedAt: branding.updatedAt,
    };
  }

  /**
   * Preview CSS generation without saving.
   * Useful for live preview in admin UI.
   *
   * @param dto - Preview data
   * @returns Generated CSS string
   */
  previewCss(dto: PreviewCssDto): string {
    // Build a temporary branding config for CSS generation
    const tempConfig: BrandingConfig = {
      id: 'preview',
      organizationId: 'preview',
      mode: dto.colorPalette
        ? BrandingMode.FULL_WHITE_LABEL
        : BrandingMode.TEMPLATE,
      logoUrl: null,
      primaryColor: dto.primaryColor || null,
      theme: dto.theme || ThemeMode.LIGHT,
      colorPalette: dto.colorPalette || null,
      typography: dto.typography || null,
      customDomain: null,
      footerText: null,
      welcomeVideoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.generateCss(tempConfig);
  }

  /**
   * Get default branding configuration.
   * Returns Ethico default styling.
   *
   * @param organizationId - Organization ID for the config
   * @returns Default branding configuration
   */
  getDefaultBranding(organizationId: string): BrandingConfig {
    const now = new Date();
    return {
      id: 'default',
      organizationId,
      mode: BrandingMode.TEMPLATE,
      logoUrl: null,
      primaryColor: '221 83% 53%', // Ethico blue
      theme: ThemeMode.LIGHT,
      colorPalette: null,
      typography: null,
      customDomain: null,
      footerText: null,
      welcomeVideoUrl: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  // ===== Private Helper Methods =====

  /**
   * Generate cache key for branding config.
   */
  private getCacheKey(organizationId: string): string {
    return `branding:${organizationId}`;
  }

  /**
   * Invalidate all cached branding data for an organization.
   */
  private async invalidateCache(organizationId: string): Promise<void> {
    const configKey = this.getCacheKey(organizationId);
    const cssKey = `branding:css:${organizationId}`;

    await Promise.all([
      this.cacheManager.del(configKey),
      this.cacheManager.del(cssKey),
    ]);

    this.logger.debug(`Invalidated branding cache for org: ${organizationId}`);
  }

  /**
   * Resolve the color palette to use based on branding configuration.
   * For TEMPLATE mode: Derives palette from primaryColor.
   * For FULL_WHITE_LABEL mode: Uses configured palette.
   *
   * @param branding - Branding configuration
   * @returns Color palette to use for CSS generation
   */
  private resolvePalette(branding: BrandingConfig): ColorPalette {
    // For FULL_WHITE_LABEL mode with configured palette
    if (
      branding.mode === BrandingMode.FULL_WHITE_LABEL &&
      branding.colorPalette
    ) {
      return branding.colorPalette;
    }

    // Get base palette based on theme
    const basePalette =
      branding.theme === ThemeMode.DARK
        ? { ...DEFAULT_DARK_COLOR_PALETTE }
        : { ...DEFAULT_COLOR_PALETTE };

    // For TEMPLATE mode: Apply primaryColor to primary-related tokens
    if (branding.primaryColor) {
      basePalette.primary = branding.primaryColor;
      basePalette.ring = branding.primaryColor;

      // For light theme, derive primaryForeground automatically
      // If primary is dark, use light foreground; if light, use dark foreground
      const primaryLightness = this.extractLightness(branding.primaryColor);
      if (primaryLightness !== null) {
        basePalette.primaryForeground =
          primaryLightness > 50 ? '222 47% 11%' : '210 40% 98%';
      }
    }

    return basePalette;
  }

  /**
   * Extract lightness value from HSL string.
   *
   * @param hsl - HSL string in format "H S% L%"
   * @returns Lightness value (0-100) or null if parsing fails
   */
  private extractLightness(hsl: string): number | null {
    const match = hsl.match(/\d+\s+\d+%\s+(\d+)%/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }
}
