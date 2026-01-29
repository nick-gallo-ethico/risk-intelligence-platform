import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * TenantMiddleware extracts the organization (tenant) context from the JWT token
 * and sets the PostgreSQL session variable for Row-Level Security (RLS).
 *
 * This middleware runs BEFORE route handlers and guards, ensuring that
 * any database query made during the request is automatically scoped to
 * the correct tenant.
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

interface JwtPayload {
  sub: string;
  organizationId: string;
  type: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip tenant context for public routes (auth endpoints handle their own context)
    const publicPaths = ['/health', '/api/v1/auth/login', '/api/v1/auth/refresh'];
    if (publicPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    const authHeader = req.headers.authorization;

    // If no auth header, let the route/guard handle it
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    try {
      const token = authHeader.substring(7);
      const secret = this.configService.get<string>('jwt.secret');

      // Decode and verify the token
      const payload = jwt.verify(token, secret!) as JwtPayload;

      // Only process access tokens
      if (payload.type !== 'access') {
        return next();
      }

      // Set request context
      req.organizationId = payload.organizationId;
      req.userId = payload.sub;

      // Set PostgreSQL session variable for RLS
      // This ensures all queries in this request are scoped to the tenant
      await this.prisma.$executeRawUnsafe(
        `SELECT set_config('app.current_organization', '${payload.organizationId}', true)`,
      );
    } catch (error) {
      // If token is invalid, let the auth guard handle it
      // Don't block the request here - guards will validate
    }

    next();
  }
}
