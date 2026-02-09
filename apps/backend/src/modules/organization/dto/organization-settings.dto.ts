/**
 * Organization Settings DTOs
 *
 * Data transfer objects for organization settings management.
 * Maps to the OrganizationSettings interface expected by the frontend.
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  Max,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * Branding mode options.
 */
export enum BrandingMode {
  STANDARD = "STANDARD",
  CO_BRANDED = "CO_BRANDED",
  FULL_WHITE_LABEL = "FULL_WHITE_LABEL",
}

/**
 * SSO provider types.
 */
export enum SsoProvider {
  AZURE_AD = "AZURE_AD",
  GOOGLE = "GOOGLE",
  SAML = "SAML",
}

/**
 * User roles for MFA requirement configuration.
 */
export enum UserRole {
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  CCO = "CCO",
  COMPLIANCE_OFFICER = "COMPLIANCE_OFFICER",
  TRIAGE_LEAD = "TRIAGE_LEAD",
  INVESTIGATOR = "INVESTIGATOR",
  HR_PARTNER = "HR_PARTNER",
  LEGAL_COUNSEL = "LEGAL_COUNSEL",
  DEPARTMENT_ADMIN = "DEPARTMENT_ADMIN",
  MANAGER = "MANAGER",
  READ_ONLY = "READ_ONLY",
  EMPLOYEE = "EMPLOYEE",
  OPERATOR = "OPERATOR",
}

/**
 * Password policy configuration.
 */
export class PasswordPolicyDto {
  @ApiProperty({ description: "Minimum password length", example: 12 })
  @IsNumber()
  @Min(8)
  @Max(128)
  minLength: number;

  @ApiProperty({ description: "Require uppercase letters", example: true })
  @IsBoolean()
  requireUppercase: boolean;

  @ApiProperty({ description: "Require lowercase letters", example: true })
  @IsBoolean()
  requireLowercase: boolean;

  @ApiProperty({ description: "Require numeric characters", example: true })
  @IsBoolean()
  requireNumbers: boolean;

  @ApiProperty({ description: "Require special characters", example: true })
  @IsBoolean()
  requireSpecialChars: boolean;
}

/**
 * SSO configuration details.
 */
export class SsoConfigDto {
  @ApiPropertyOptional({
    description: "OAuth client ID",
    example: "abc123-client-id",
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: "Azure AD tenant ID",
    example: "tenant-uuid",
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    description: "SAML metadata URL",
    example: "https://idp.example.com/metadata",
  })
  @IsOptional()
  @IsString()
  metadataUrl?: string;

  @ApiProperty({
    description: "Enforce SSO for all users",
    example: false,
  })
  @IsBoolean()
  enforceForAllUsers: boolean;
}

/**
 * Complete organization settings response.
 */
export class OrganizationSettingsDto {
  // General
  @ApiProperty({ description: "Organization name", example: "Acme Corp" })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Default timezone",
    example: "America/New_York",
  })
  @IsString()
  timezone: string;

  @ApiProperty({ description: "Date format preference", example: "MM/DD/YYYY" })
  @IsString()
  dateFormat: string;

  @ApiProperty({ description: "Default language (ISO 639-1)", example: "en" })
  @IsString()
  defaultLanguage: string;

  // Branding
  @ApiPropertyOptional({
    description: "Logo URL",
    example: "https://storage.example.com/logos/acme.png",
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: "Favicon URL",
    example: "https://storage.example.com/favicons/acme.ico",
  })
  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @ApiProperty({
    description: "Branding mode",
    enum: BrandingMode,
    example: BrandingMode.STANDARD,
  })
  @IsEnum(BrandingMode)
  brandingMode: BrandingMode;

  @ApiPropertyOptional({
    description: "Primary brand color (HSL format)",
    example: "221 83% 53%",
  })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({
    description: "Secondary brand color (HSL format)",
    example: "142 71% 45%",
  })
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiPropertyOptional({
    description: "Accent color (HSL format)",
    example: "25 95% 53%",
  })
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional({
    description: "Custom CSS for advanced styling",
    example: ".custom-header { background: #fff; }",
  })
  @IsOptional()
  @IsString()
  customCss?: string;

  // Notifications
  @ApiProperty({
    description: "Default digest send time (HH:mm format)",
    example: "08:00",
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "digestTime must be in HH:mm format",
  })
  defaultDigestTime: string;

  @ApiProperty({
    description: "Enable email digest notifications",
    example: true,
  })
  @IsBoolean()
  digestEnabled: boolean;

  @ApiProperty({
    description: "Notification categories enforced for all users",
    type: [String],
    example: ["security_alerts", "sla_warnings"],
  })
  @IsArray()
  @IsString({ each: true })
  enforcedNotificationCategories: string[];

  @ApiProperty({
    description: "Enable quiet hours for notifications",
    example: false,
  })
  @IsBoolean()
  quietHoursEnabled: boolean;

  @ApiPropertyOptional({
    description: "Quiet hours start time (HH:mm)",
    example: "22:00",
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "quietHoursStart must be in HH:mm format",
  })
  quietHoursStart?: string;

  @ApiPropertyOptional({
    description: "Quiet hours end time (HH:mm)",
    example: "07:00",
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "quietHoursEnd must be in HH:mm format",
  })
  quietHoursEnd?: string;

  // Security
  @ApiProperty({
    description: "Require MFA for all users",
    example: false,
  })
  @IsBoolean()
  mfaRequired: boolean;

  @ApiProperty({
    description: "Roles required to use MFA",
    type: [String],
    enum: UserRole,
    example: ["SYSTEM_ADMIN", "CCO"],
  })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  mfaRequiredRoles: UserRole[];

  @ApiProperty({
    description: "Session timeout in minutes",
    example: 60,
  })
  @IsNumber()
  @Min(5)
  @Max(480)
  sessionTimeoutMinutes: number;

  @ApiProperty({
    description: "Password policy configuration",
    type: PasswordPolicyDto,
  })
  @ValidateNested()
  @Type(() => PasswordPolicyDto)
  passwordPolicy: PasswordPolicyDto;

  // SSO
  @ApiProperty({
    description: "SSO authentication enabled",
    example: false,
  })
  @IsBoolean()
  ssoEnabled: boolean;

  @ApiPropertyOptional({
    description: "SSO provider type",
    enum: SsoProvider,
    example: SsoProvider.AZURE_AD,
  })
  @IsOptional()
  @IsEnum(SsoProvider)
  ssoProvider?: SsoProvider;

  @ApiPropertyOptional({
    description: "SSO configuration details",
    type: SsoConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SsoConfigDto)
  ssoConfig?: SsoConfigDto;
}

/**
 * DTO for updating general organization settings.
 */
export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: "Organization name",
    example: "Acme Corp",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "Default timezone",
    example: "America/New_York",
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: "Date format preference",
    example: "MM/DD/YYYY",
  })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({
    description: "Default language (ISO 639-1)",
    example: "en",
  })
  @IsOptional()
  @IsString()
  defaultLanguage?: string;
}

/**
 * DTO for updating branding settings.
 */
export class UpdateBrandingSettingsDto {
  @ApiPropertyOptional({
    description: "Branding mode",
    enum: BrandingMode,
  })
  @IsOptional()
  @IsEnum(BrandingMode)
  brandingMode?: BrandingMode;

  @ApiPropertyOptional({
    description: "Primary brand color (HSL format)",
  })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({
    description: "Secondary brand color (HSL format)",
  })
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiPropertyOptional({
    description: "Accent color (HSL format)",
  })
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional({
    description: "Custom CSS for advanced styling",
  })
  @IsOptional()
  @IsString()
  customCss?: string;
}

/**
 * DTO for updating notification settings.
 */
export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({
    description: "Default digest send time (HH:mm format)",
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "defaultDigestTime must be in HH:mm format",
  })
  defaultDigestTime?: string;

  @ApiPropertyOptional({
    description: "Enable email digest notifications",
  })
  @IsOptional()
  @IsBoolean()
  digestEnabled?: boolean;

  @ApiPropertyOptional({
    description: "Notification categories enforced for all users",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enforcedNotificationCategories?: string[];

  @ApiPropertyOptional({
    description: "Enable quiet hours for notifications",
  })
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @ApiPropertyOptional({
    description: "Quiet hours start time (HH:mm)",
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "quietHoursStart must be in HH:mm format",
  })
  quietHoursStart?: string;

  @ApiPropertyOptional({
    description: "Quiet hours end time (HH:mm)",
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "quietHoursEnd must be in HH:mm format",
  })
  quietHoursEnd?: string;
}

/**
 * DTO for updating security settings.
 */
export class UpdateSecuritySettingsDto {
  @ApiPropertyOptional({
    description: "Require MFA for all users",
  })
  @IsOptional()
  @IsBoolean()
  mfaRequired?: boolean;

  @ApiPropertyOptional({
    description: "Roles required to use MFA",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  mfaRequiredRoles?: UserRole[];

  @ApiPropertyOptional({
    description: "Session timeout in minutes",
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(480)
  sessionTimeoutMinutes?: number;

  @ApiPropertyOptional({
    description: "Password policy configuration",
    type: PasswordPolicyDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PasswordPolicyDto)
  passwordPolicy?: PasswordPolicyDto;
}

/**
 * Organization entity response.
 */
export class OrganizationResponseDto {
  @ApiProperty({ description: "Organization ID" })
  id: string;

  @ApiProperty({ description: "Organization name" })
  name: string;

  @ApiProperty({ description: "URL slug" })
  slug: string;

  @ApiPropertyOptional({ description: "Custom domain" })
  domain?: string;

  @ApiPropertyOptional({ description: "Logo URL" })
  logoUrl?: string;

  @ApiPropertyOptional({ description: "Favicon URL" })
  faviconUrl?: string;

  @ApiPropertyOptional({ description: "Primary brand color" })
  primaryColor?: string;

  @ApiPropertyOptional({ description: "Secondary brand color" })
  secondaryColor?: string;

  @ApiProperty({ description: "Timezone" })
  timezone: string;

  @ApiProperty({ description: "Date format" })
  dateFormat: string;

  @ApiProperty({ description: "Created timestamp" })
  createdAt: string;

  @ApiProperty({ description: "Updated timestamp" })
  updatedAt: string;
}
