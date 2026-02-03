import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Service for generating and validating MFA recovery codes.
 * Recovery codes provide backup access when authenticator app is unavailable.
 *
 * Key behaviors:
 * - Generates cryptographically secure codes
 * - Codes are hashed before storage (never stored plain-text)
 * - Each code can only be used once
 */
@Injectable()
export class RecoveryCodesService {
  private readonly CODE_COUNT = 10;
  private readonly CODE_LENGTH = 4; // 4 bytes = 8 hex chars

  /**
   * Generate a set of cryptographically secure recovery codes.
   * @returns Array of plain-text codes (to show to user once)
   */
  generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.CODE_COUNT; i++) {
      // Generate 8-character uppercase hex code
      codes.push(
        crypto.randomBytes(this.CODE_LENGTH).toString('hex').toUpperCase(),
      );
    }
    return codes;
  }

  /**
   * Hash recovery codes for storage.
   * Never store plain-text recovery codes in the database.
   * @param codes - Plain-text recovery codes
   * @returns Array of SHA-256 hashes
   */
  hashRecoveryCodes(codes: string[]): string[] {
    return codes.map((code) =>
      crypto.createHash('sha256').update(code.toUpperCase()).digest('hex'),
    );
  }

  /**
   * Verify a recovery code against stored hashes.
   * @param inputCode - Code entered by user
   * @param hashedCodes - Stored hashed codes
   * @returns Index of matched code, or -1 if not found
   */
  verifyRecoveryCode(inputCode: string, hashedCodes: string[]): number {
    const hashedInput = crypto
      .createHash('sha256')
      .update(inputCode.toUpperCase())
      .digest('hex');

    return hashedCodes.indexOf(hashedInput);
  }
}
