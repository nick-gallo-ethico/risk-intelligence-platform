import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Decorator to mark a route as publicly accessible (no auth required).
 *
 * Usage:
 * @Public()
 * @Get('public-endpoint')
 * getPublicData() {
 *   return 'no auth needed';
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Guard that validates JWT tokens on protected routes using Passport.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * getProtectedData(@CurrentUser() user: RequestUser) {
 *   return user;
 * }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Delegate to Passport JWT strategy
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException("Invalid or expired token");
    }
    return user;
  }
}
