import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Guard that validates JWT tokens on protected routes.
 *
 * TODO (Slice 1.1): Implement full JWT validation with:
 * 1. @nestjs/passport with passport-jwt strategy
 * 2. Token validation against user session
 * 3. Token refresh handling
 *
 * For now, this is a stub that demonstrates the pattern.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * getProtectedData() {
 *   return 'protected data';
 * }
 *
 * Or to make a route public:
 * @Public()
 * @Get('public')
 * getPublicData() {
 *   return 'public data';
 * }
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    // TODO (Slice 1.1): Implement actual JWT verification
    // const token = authHeader.substring(7);
    // const payload = await this.jwtService.verifyAsync(token);
    // request.user = payload;

    return true;
  }
}

/**
 * Decorator to mark a route as publicly accessible (no auth required).
 */
import { SetMetadata } from '@nestjs/common';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
