import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { MfaService } from "../mfa/mfa.service";
import { RequestUser } from "../interfaces/jwt-payload.interface";

/**
 * Guard that requires MFA verification for protected operations.
 *
 * SEC-09: Checks mfaVerified field in JWT payload, which is set to true
 * only after successful TOTP verification. This makes MFA session-bound.
 *
 * Behavior:
 * - If user has MFA disabled: allows access
 * - If user has MFA enabled: requires mfaVerified flag in JWT
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, MfaGuard)
 * @Delete('account')
 * deleteAccount() { ... }
 */
@Injectable()
export class MfaGuard implements CanActivate {
  constructor(private mfaService: MfaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    // Check if user has MFA enabled
    const mfaEnabled = await this.mfaService.isMfaEnabled(user.id);

    if (!mfaEnabled) {
      // MFA not enabled, allow access
      return true;
    }

    // SEC-09: Check if this session has MFA verified
    // The JWT should contain mfaVerified: true after MFA verification
    if (!user.mfaVerified) {
      throw new UnauthorizedException("MFA verification required");
    }

    return true;
  }
}
