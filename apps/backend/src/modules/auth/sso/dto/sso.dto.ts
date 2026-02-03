import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "../../../../common/decorators/roles.decorator";

export type SsoProviderType = "azure-ad" | "google" | "saml" | null;

export class UpdateSsoConfigDto {
  @ApiPropertyOptional({ enum: ["azure-ad", "google", "saml"] })
  @IsOptional()
  @IsString()
  ssoProvider?: SsoProviderType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ssoEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  jitProvisioningEnabled?: boolean;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  defaultRole?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mfaRequired?: boolean;

  // Azure AD specific
  @ApiPropertyOptional({ description: "Azure AD tenant ID (for Azure AD SSO)" })
  @ValidateIf((o) => o.ssoProvider === "azure-ad")
  @IsString()
  azureTenantId?: string;

  // SAML specific
  @ApiPropertyOptional({ description: "SAML IdP Entity ID" })
  @ValidateIf((o) => o.ssoProvider === "saml")
  @IsString()
  samlIdpEntityId?: string;

  @ApiPropertyOptional({ description: "SAML IdP SSO URL" })
  @ValidateIf((o) => o.ssoProvider === "saml")
  @IsString()
  samlIdpEntryPoint?: string;

  @ApiPropertyOptional({ description: "SAML IdP Certificate (PEM format)" })
  @ValidateIf((o) => o.ssoProvider === "saml")
  @IsString()
  samlIdpCertificate?: string;

  @ApiPropertyOptional({ description: "SAML SP Entity ID" })
  @ValidateIf((o) => o.ssoProvider === "saml")
  @IsString()
  samlSpEntityId?: string;
}

export class SsoConfigResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ nullable: true })
  ssoProvider: string | null;

  @ApiProperty()
  ssoEnabled: boolean;

  @ApiProperty()
  jitProvisioningEnabled: boolean;

  @ApiProperty({ enum: UserRole })
  defaultRole: UserRole;

  @ApiProperty()
  mfaRequired: boolean;

  @ApiProperty({ nullable: true })
  azureTenantId: string | null;

  // SAML fields (sensitive parts redacted in response)
  @ApiProperty({ nullable: true })
  samlIdpEntityId: string | null;

  @ApiProperty({ nullable: true })
  samlIdpEntryPoint: string | null;

  @ApiProperty({ description: "Whether SAML certificate is configured" })
  samlCertificateConfigured: boolean;

  @ApiProperty({ nullable: true })
  samlSpEntityId: string | null;
}
