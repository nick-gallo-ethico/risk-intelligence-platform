import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * TenantMiddleware extracts the organization (tenant) context from the JWT token
 * and sets the PostgreSQL session variable for Row-Level Security (RLS).
 *
 * In Slice 1.1, this will be fully implemented with:
 * 1. JWT token verification via JwtService
 * 2. Prisma client to execute SET LOCAL command
 * 3. Request decoration with tenant context
 *
 * For now, this is a stub that demonstrates the pattern.
 */

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      userId?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    // Skip tenant context for public routes
    const publicPaths = ['/health', '/api/v1/auth/login', '/api/v1/auth/register'];
    if (publicPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    const authHeader = req.headers.authorization;

    // If no auth header, let the auth guard handle it
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    // TODO (Slice 1.1): Implement full JWT verification and RLS setup
    // const token = authHeader.substring(7);
    // const payload = await this.jwtService.verifyAsync(token);
    // req.organizationId = payload.organizationId;
    // req.userId = payload.userId;
    //
    // // Set PostgreSQL session variable for RLS
    // await this.prisma.$executeRaw`SELECT set_config('app.current_organization', ${payload.organizationId}, true)`;

    next();
  }
}
