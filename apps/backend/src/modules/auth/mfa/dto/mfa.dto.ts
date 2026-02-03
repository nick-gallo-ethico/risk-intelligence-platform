import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateMfaSetupDto {}

export class MfaSetupResponseDto {
  @ApiProperty({ description: 'TOTP secret (show to user for manual entry)' })
  secret: string;

  @ApiProperty({ description: 'QR code as data URL for authenticator apps' })
  qrCode: string;

  @ApiProperty({ description: 'otpauth:// URL for manual entry' })
  otpAuthUrl: string;
}

export class VerifyMfaSetupDto {
  @ApiProperty({
    description: '6-digit TOTP code from authenticator app',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

export class MfaEnabledResponseDto {
  @ApiProperty({ description: 'Recovery codes (show once, user must save)' })
  recoveryCodes: string[];

  @ApiProperty()
  message: string;
}

export class VerifyMfaDto {
  @ApiProperty({
    description: '6-digit TOTP code or recovery code',
    example: '123456',
  })
  @IsString()
  @Length(6, 8) // TOTP is 6 digits, recovery codes are 8 hex chars
  code: string;
}

export class MfaVerifyResponseDto {
  @ApiProperty()
  verified: boolean;

  @ApiProperty({
    description: 'Number of remaining recovery codes (if recovery code used)',
    required: false,
  })
  remainingRecoveryCodes?: number;
}

export class DisableMfaDto {
  @ApiProperty({ description: '6-digit TOTP code to confirm disable' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

export class RegenerateRecoveryCodesDto {
  @ApiProperty({ description: '6-digit TOTP code to confirm regeneration' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

export class MfaStatusResponseDto {
  @ApiProperty()
  enabled: boolean;

  @ApiProperty({ nullable: true })
  enabledAt: Date | null;

  @ApiProperty({ description: 'Number of remaining recovery codes' })
  remainingRecoveryCodes: number;
}
