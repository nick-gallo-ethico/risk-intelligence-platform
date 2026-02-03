import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { Request } from "express";

/**
 * Custom throttler guard that correctly extracts client IP behind proxies.
 * Uses X-Forwarded-For header when available, falling back to direct IP.
 * Also implements per-target throttling for authentication endpoints.
 *
 * Rate limit tiers for auth endpoints:
 * - Login: 5/min (strict - protects against brute force)
 * - MFA verify: 3/min (strict - protects MFA bypass attempts)
 * - Password reset: 3/hour (strict - prevents abuse)
 * - Refresh: 30/min (moderate - normal app usage)
 * - Logout: 10/min (moderate - batch logout scenarios)
 * - SSO initiate: 10/min (moderate - redirect-based, less abuse risk)
 */
@Injectable()
export class ThrottleBehindProxyGuard extends ThrottlerGuard {
  /**
   * Extract the real client IP from behind proxies.
   * Priority: X-Forwarded-For first value > X-Real-IP > socket remote address
   */
  protected async getTracker(req: Request): Promise<string> {
    // X-Forwarded-For can be comma-separated list; first is original client
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(",")[0];
      return ips.trim();
    }

    // X-Real-IP is set by some proxies (nginx)
    const realIp = req.headers["x-real-ip"];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fall back to direct connection IP
    return req.ip || req.socket.remoteAddress || "unknown";
  }

  /**
   * Generate a unique key for rate limiting.
   * For auth endpoints, include the target (email) to prevent
   * distributed attacks against a single account.
   */
  protected generateKey(
    context: ExecutionContext,
    tracker: string,
    throttlerName: string,
  ): string {
    const req = context.switchToHttp().getRequest<Request>();
    const baseKey = `${throttlerName}:${tracker}`;

    // For login endpoint, also track by target email
    if (req.path.includes("/auth/login") && req.body?.email) {
      return `${baseKey}:${req.body.email.toLowerCase()}`;
    }

    // For MFA endpoints, track by user if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    if (req.path.includes("/auth/mfa") && user?.sub) {
      return `${baseKey}:${user.sub}`;
    }

    return baseKey;
  }
}
