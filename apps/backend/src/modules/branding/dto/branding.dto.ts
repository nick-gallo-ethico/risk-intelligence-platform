/**
 * Branding DTOs
 *
 * Data Transfer Objects for the white-label branding API.
 * Validates input for branding configuration updates.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  ValidateNested,
  Matches,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrandingMode, ThemeMode } from '../types/branding.types';

/**
 * HSL color format regex.
 * Matches format like "221 83% 53%" (without hsl() wrapper).
 */
const HSL_REGEX = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;

/**
 * Color palette DTO for full white-label mode.
 * All values must be in HSL format: "hue saturation% lightness%"
 */
export class ColorPaletteDto {
  @ApiProperty({
    description: 'Main background color in HSL format',
    example: '0 0% 100%',
  })
  @IsString()
  @Matches(HSL_REGEX, { message: 'background must be in HSL format: "H S% L%"' })
  background: string;

  @ApiProperty({
    description: 'Text color on background in HSL format',
    example: '222 47% 11%',
  })
  @IsString()
  @Matches(HSL_REGEX, { message: 'foreground must be in HSL format: "H S% L%"' })
  foreground: string;

  @ApiProperty({
    description: 'Card background color in HSL format',
    example: '0 0% 100%',
  })
  @IsString()
  @Matches(HSL_REGEX, { message: 'card must be in HSL format: "H S% L%"' })
  card: string;

  @ApiProperty({
    description: 'Text color on cards in HSL format',
    example: '222 47% 11%',
  })
  @IsString()
  @Matches(HSL_REGEX, {
    message: 'cardForeground must be in HSL format: "H S% L%"',
  })
  cardForeground: string;

  @ApiProperty({
    description: 'Primary brand color in HSL format',
    example: '221 83% 53%',
  })
  @IsString()
  @Matches(HSL_REGEX, { message: 'primary must be in HSL format: "H S% L%"' })
  primary: string;

  @ApiProperty({
    description: 'Text color on primary in HSL format',
    example: '210 40% 98%',
  })
  @IsString()
  @Matches(HSL_REGEX, {
    message: 'primaryForeground must be in HSL format: "H S% L%"',
  })
  primaryForeground: string;

  @ApiProperty({
    description: 'Secondary color in HSL format',
    example: '210 40% 96%',
  })
  @IsString()
  @Matches(HSL_REGEX, { message: 'secondary must be in HSL format: "H S% L%"' })
  secondary: string;

  @ApiProperty({
    description: 'Text color on secondary in HSL format',
    example: '222 47% 11%',
  })
  @IsString()
  @Matches(HSL_REGEX, {
    message: 'secondaryForeground must be in HSL format: "H S% L%"',
  })
  secondaryForeground: string;

  @ApiProperty({
    description: 'Muted color in HSL format',
    example: '210 40% 96%',
  })
  @IsString()
  @Matches(HSL_REGEX, { message: 'muted must be in HSL format: "H S% L%"' })
  muted: string;

  @ApiProperty({
    description: 'Text color on muted in HSL format',
    example: '215 16% 47%',
  })
  @IsString()
  @Matches(HSL_REGEX, {
    message: 'mutedForeground must be in HSL format: "H S% L%"',
  })
  mutedForeground: string;

  @ApiProperty({
    description: 'Accent color in HSL format',
    example: '210 40% 96%',
  })
  @IsString()
  @Matches(HSL_REGEX, { message: 'accent must be in HSL format: "H S% L%"' })
  accent: string;

  @ApiProperty({
    description: 'Text color on accent in HSL format',
    example: '222 47% 11%',
  })
  @IsString()
  @Matches(HSL_REGEX, {
    message: 'accentForeground must be in HSL format: "H S% L%"',
  })
  accentForeground: string;

  @ApiProperty({
    description: 'Destructive action color in HSL format',
    example: '0 84% 60%',
  })
  @IsString()
  @Matches(HSL_REGEX, {
    message: 'destructive must be in HSL format: "H S% L%"',
  })
  destructive: string;

  @ApiProperty({
    description: 'Text color on destructive in HSL format',
    example: '210 40% 98%',
  })
  @IsString()
  @Matches(HSL_REGEX, {
    message: 'destructiveForeground must be in HSL format: "H S% L%"',
  })
  destructiveForeground: string;

  @ApiProperty({
    description: 'Border color in HSL format',
    example: '214 32% 91%',
  })
  @IsString()
  @Matches(HSL_REGEX, { message: 'border must be in HSL format: "H S% L%"' })
  border: string;

  @ApiProperty({
    description: 'Input field border/background in HSL format',
    example: '214 32% 91%',
  })
  @IsString()
  @Matches(HSL_REGEX, { message: 'input must be in HSL format: "H S% L%"' })
  input: string;

  @ApiProperty({
    description: 'Focus ring color in HSL format',
    example: '221 83% 53%',
  })
  @IsString()
  @Matches(HSL_REGEX, { message: 'ring must be in HSL format: "H S% L%"' })
  ring: string;
}

/**
 * Typography DTO for full white-label mode.
 */
export class TypographyDto {
  @ApiProperty({
    description: 'Primary font family for body text',
    example: 'Inter, sans-serif',
  })
  @IsString()
  fontFamily: string;

  @ApiPropertyOptional({
    description: 'Font family for headings (defaults to fontFamily)',
    example: 'Inter, sans-serif',
  })
  @IsOptional()
  @IsString()
  headingFontFamily?: string;
}

/**
 * Update branding DTO.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateBrandingDto {
  @ApiPropertyOptional({
    description: 'Branding mode',
    enum: ['TEMPLATE', 'FULL_WHITE_LABEL'],
    example: 'TEMPLATE',
  })
  @IsOptional()
  @IsEnum(BrandingMode)
  mode?: BrandingMode;

  @ApiPropertyOptional({
    description: 'URL to logo image in blob storage',
    example: 'https://storage.blob.core.windows.net/tenant-123/logo.png',
  })
  @IsOptional()
  @IsUrl()
  logoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Primary brand color in HSL format',
    example: '221 83% 53%',
  })
  @IsOptional()
  @IsString()
  @Matches(HSL_REGEX, {
    message: 'primaryColor must be in HSL format: "H S% L%"',
  })
  primaryColor?: string | null;

  @ApiPropertyOptional({
    description: 'Theme mode for the portal',
    enum: ['LIGHT', 'DARK', 'SYSTEM'],
    example: 'LIGHT',
  })
  @IsOptional()
  @IsEnum(ThemeMode)
  theme?: ThemeMode;

  @ApiPropertyOptional({
    description:
      'Full 12-token color palette (required for FULL_WHITE_LABEL mode)',
    type: ColorPaletteDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ColorPaletteDto)
  colorPalette?: ColorPaletteDto | null;

  @ApiPropertyOptional({
    description: 'Typography configuration',
    type: TypographyDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TypographyDto)
  typography?: TypographyDto | null;

  @ApiPropertyOptional({
    description: 'Custom domain for white-label portal',
    example: 'ethics.acme.com',
  })
  @IsOptional()
  @IsString()
  customDomain?: string | null;

  @ApiPropertyOptional({
    description: 'Footer text to display at bottom of portal',
    example: 'Copyright 2026 ACME Corp. All rights reserved.',
  })
  @IsOptional()
  @IsString()
  footerText?: string | null;

  @ApiPropertyOptional({
    description: 'URL to welcome video',
    example: 'https://www.youtube.com/embed/abc123',
  })
  @IsOptional()
  @IsUrl()
  welcomeVideoUrl?: string | null;
}

/**
 * Branding response DTO.
 * Returns the complete branding configuration.
 */
export class BrandingResponseDto {
  @ApiProperty({
    description: 'Branding configuration ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Branding mode',
    enum: ['TEMPLATE', 'FULL_WHITE_LABEL'],
    example: 'TEMPLATE',
  })
  mode: BrandingMode;

  @ApiPropertyOptional({
    description: 'URL to logo image',
  })
  logoUrl: string | null;

  @ApiPropertyOptional({
    description: 'Primary brand color in HSL format',
  })
  primaryColor: string | null;

  @ApiProperty({
    description: 'Theme mode',
    enum: ['LIGHT', 'DARK', 'SYSTEM'],
  })
  theme: ThemeMode;

  @ApiPropertyOptional({
    description: 'Full 12-token color palette',
    type: ColorPaletteDto,
  })
  colorPalette: ColorPaletteDto | null;

  @ApiPropertyOptional({
    description: 'Typography configuration',
    type: TypographyDto,
  })
  typography: TypographyDto | null;

  @ApiPropertyOptional({
    description: 'Custom domain',
  })
  customDomain: string | null;

  @ApiPropertyOptional({
    description: 'Footer text',
  })
  footerText: string | null;

  @ApiPropertyOptional({
    description: 'Welcome video URL',
  })
  welcomeVideoUrl: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: Date;
}

/**
 * Preview CSS request DTO.
 * Allows testing CSS generation without saving.
 */
export class PreviewCssDto {
  @ApiPropertyOptional({
    description: 'Primary brand color in HSL format',
    example: '221 83% 53%',
  })
  @IsOptional()
  @IsString()
  @Matches(HSL_REGEX, {
    message: 'primaryColor must be in HSL format: "H S% L%"',
  })
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Theme mode',
    enum: ['LIGHT', 'DARK', 'SYSTEM'],
  })
  @IsOptional()
  @IsEnum(ThemeMode)
  theme?: ThemeMode;

  @ApiPropertyOptional({
    description: 'Full color palette for preview',
    type: ColorPaletteDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ColorPaletteDto)
  colorPalette?: ColorPaletteDto;

  @ApiPropertyOptional({
    description: 'Typography configuration for preview',
    type: TypographyDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TypographyDto)
  typography?: TypographyDto;
}
