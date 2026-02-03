import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  TOTP,
  NobleCryptoPlugin,
  ScureBase32Plugin,
} from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { RecoveryCodesService } from './recovery-codes.service';
import {
  MfaSetupResponseDto,
  MfaEnabledResponseDto,
  MfaVerifyResponseDto,
  MfaStatusResponseDto,
} from './dto/mfa.dto';
import { AuditActionCategory, ActorType } from '@prisma/client';

/**
 * Service for TOTP-based multi-factor authentication.
 *
 * TOTP (Time-based One-Time Password) uses RFC 6238.
 * Compatible with Google Authenticator, Authy, 1Password, etc.
 *
 * Key behaviors:
 * - MFA must be verified before enabled (prevents lockout)
 * - Recovery codes hashed before storage
 * - All MFA events logged to audit trail
 * - Disabling MFA requires TOTP verification
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly APP_NAME = 'Ethico Platform';
  private readonly totp: TOTP;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private recoveryCodesService: RecoveryCodesService,
  ) {
    // Configure TOTP with otplib v13 plugins
    this.totp = new TOTP({
      digits: 6,
      period: 30, // 30-second window
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
    });
  }

  /**
   * Initiate MFA setup for a user.
   * Generates a new TOTP secret and QR code.
   * MFA is not enabled until verifyAndEnableMfa() is called.
   */
  async initiateMfaSetup(userId: string): Promise<MfaSetupResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.mfaEnabled) {
      throw new BadRequestException(
        'MFA is already enabled. Disable it first to set up again.',
      );
    }

    // Generate new TOTP secret
    const secret = this.totp.generateSecret();

    // Store secret temporarily (not enabled until verified)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret,
        mfaEnabled: false,
      },
    });

    // Generate QR code for authenticator app
    const otpAuthUrl = this.totp.toURI({
      secret,
      label: user.email,
      issuer: this.APP_NAME,
    });
    const qrCode = await QRCode.toDataURL(otpAuthUrl);

    this.logger.log(`MFA setup initiated for user ${user.email}`);

    return {
      secret, // Show to user for manual entry
      qrCode,
      otpAuthUrl,
    };
  }

  /**
   * Verify TOTP code and enable MFA for user.
   * Called after user scans QR code and enters verification code.
   */
  async verifyAndEnableMfa(
    userId: string,
    code: string,
  ): Promise<MfaEnabledResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    if (!user.mfaSecret) {
      throw new BadRequestException(
        'MFA setup not initiated. Call setup endpoint first.',
      );
    }

    // Verify the TOTP code
    const result = await this.totp.verify(code, { secret: user.mfaSecret });

    if (!result.valid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate recovery codes
    const recoveryCodes = this.recoveryCodesService.generateRecoveryCodes();
    const hashedCodes =
      this.recoveryCodesService.hashRecoveryCodes(recoveryCodes);

    // Enable MFA and store hashed recovery codes
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaVerifiedAt: new Date(),
        mfaRecoveryCodes: hashedCodes,
      },
    });

    await this.auditService.log({
      entityType: 'USER',
      entityId: userId,
      organizationId: user.organizationId,
      action: 'MFA_ENABLED',
      actionDescription: `User ${user.email} enabled two-factor authentication`,
      actionCategory: AuditActionCategory.SECURITY,
      actorType: ActorType.USER,
      actorUserId: userId,
      actorName: `${user.firstName} ${user.lastName}`,
    });

    this.logger.log(`MFA enabled for user ${user.email}`);

    // Return plain recovery codes (only time user sees them)
    return {
      recoveryCodes,
      message:
        'MFA enabled successfully. Save your recovery codes in a safe place.',
    };
  }

  /**
   * Verify MFA code during login.
   * Accepts either TOTP code or recovery code.
   */
  async verifyMfa(userId: string, code: string): Promise<MfaVerifyResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled for this user');
    }

    // Try TOTP verification first
    const result = await this.totp.verify(code, { secret: user.mfaSecret });

    if (result.valid) {
      return { verified: true };
    }

    // Try recovery code
    const codeIndex = this.recoveryCodesService.verifyRecoveryCode(
      code,
      user.mfaRecoveryCodes,
    );

    if (codeIndex === -1) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Remove used recovery code
    const updatedCodes = [...user.mfaRecoveryCodes];
    updatedCodes.splice(codeIndex, 1);

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaRecoveryCodes: updatedCodes },
    });

    await this.auditService.log({
      entityType: 'USER',
      entityId: userId,
      organizationId: user.organizationId,
      action: 'MFA_RECOVERY_CODE_USED',
      actionDescription: `User ${user.email} used MFA recovery code (${updatedCodes.length} remaining)`,
      actionCategory: AuditActionCategory.SECURITY,
      actorType: ActorType.USER,
      actorUserId: userId,
      actorName: `${user.firstName} ${user.lastName}`,
    });

    this.logger.warn(
      `Recovery code used by ${user.email}, ${updatedCodes.length} remaining`,
    );

    return {
      verified: true,
      remainingRecoveryCodes: updatedCodes.length,
    };
  }

  /**
   * Disable MFA for a user.
   * Requires TOTP verification to prevent unauthorized disable.
   */
  async disableMfa(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify TOTP code before disabling
    const result = await this.totp.verify(code, { secret: user.mfaSecret });

    if (!result.valid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaVerifiedAt: null,
        mfaRecoveryCodes: [],
      },
    });

    await this.auditService.log({
      entityType: 'USER',
      entityId: userId,
      organizationId: user.organizationId,
      action: 'MFA_DISABLED',
      actionDescription: `User ${user.email} disabled two-factor authentication`,
      actionCategory: AuditActionCategory.SECURITY,
      actorType: ActorType.USER,
      actorUserId: userId,
      actorName: `${user.firstName} ${user.lastName}`,
    });

    this.logger.log(`MFA disabled for user ${user.email}`);
  }

  /**
   * Regenerate recovery codes.
   * Requires TOTP verification.
   */
  async regenerateRecoveryCodes(
    userId: string,
    code: string,
  ): Promise<string[]> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify TOTP code
    const result = await this.totp.verify(code, { secret: user.mfaSecret });

    if (!result.valid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate new recovery codes
    const recoveryCodes = this.recoveryCodesService.generateRecoveryCodes();
    const hashedCodes =
      this.recoveryCodesService.hashRecoveryCodes(recoveryCodes);

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaRecoveryCodes: hashedCodes },
    });

    await this.auditService.log({
      entityType: 'USER',
      entityId: userId,
      organizationId: user.organizationId,
      action: 'MFA_RECOVERY_CODES_REGENERATED',
      actionDescription: `User ${user.email} regenerated MFA recovery codes`,
      actionCategory: AuditActionCategory.SECURITY,
      actorType: ActorType.USER,
      actorUserId: userId,
      actorName: `${user.firstName} ${user.lastName}`,
    });

    this.logger.log(`Recovery codes regenerated for user ${user.email}`);

    return recoveryCodes;
  }

  /**
   * Get MFA status for a user.
   */
  async getMfaStatus(userId: string): Promise<MfaStatusResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaVerifiedAt: true,
        mfaRecoveryCodes: true,
      },
    });

    return {
      enabled: user.mfaEnabled,
      enabledAt: user.mfaVerifiedAt,
      remainingRecoveryCodes: user.mfaRecoveryCodes?.length ?? 0,
    };
  }

  /**
   * Check if user has MFA enabled.
   * Used by auth flow to determine if MFA verification is needed.
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });
    return user?.mfaEnabled ?? false;
  }
}
