import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { MfaService } from '../mfa/mfa.service';

/**
 * Guard that requires MFA verification for protected operations.
 *
 * Use on sensitive endpoints that require MFA even after JWT authentication.
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
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check if user has MFA enabled
    const mfaEnabled = await this.mfaService.isMfaEnabled(user.sub);

    if (!mfaEnabled) {
      // MFA not enabled, allow access
      return true;
    }

    // Check if this session has MFA verified
    // The JWT should contain mfaVerified: true after MFA verification
    if (!user.mfaVerified) {
      throw new UnauthorizedException('MFA verification required');
    }

    return true;
  }
}
