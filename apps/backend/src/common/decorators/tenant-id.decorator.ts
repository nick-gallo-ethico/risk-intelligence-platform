import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Custom decorator to extract the organization (tenant) ID from the request.
 *
 * The organizationId is set by the TenantMiddleware after verifying the JWT token.
 *
 * Usage:
 * @Get('cases')
 * getCases(@TenantId() organizationId: string) {
 *   return this.caseService.findAll(organizationId);
 * }
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.organizationId;
  },
);
