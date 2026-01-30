import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

/**
 * Guard that verifies the tenant (organization) context is available.
 *
 * This guard validates that the TenantMiddleware has successfully
 * extracted and set the organizationId from the JWT token.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * @Get('cases')
 * getCases(@TenantId() organizationId: string) {
 *   return this.caseService.findAll(organizationId);
 * }
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.organizationId;

    if (!organizationId) {
      throw new ForbiddenException(
        "Organization context not available. Ensure you are authenticated with a valid tenant.",
      );
    }

    return true;
  }
}
