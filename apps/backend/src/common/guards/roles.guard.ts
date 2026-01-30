import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, UserRole } from "../decorators/roles.decorator";

/**
 * Guard that checks if the current user has the required role(s) to access a route.
 *
 * Must be used in conjunction with JwtAuthGuard to ensure user is authenticated.
 *
 * Usage:
 * @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get('admin-only')
 * getAdminData() {
 *   return 'secret data';
 * }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not found in request");
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
