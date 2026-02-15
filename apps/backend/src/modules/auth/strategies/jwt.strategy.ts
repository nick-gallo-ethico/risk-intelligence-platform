import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import {
  ExtractJwt,
  Strategy,
  StrategyOptions,
  SecretOrKeyProvider,
} from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AccessTokenPayload,
  RequestUser,
} from "../interfaces/jwt-payload.interface";
import { JwtKeyService } from "../services";

/**
 * JWT Strategy with RS256/HS256 dual-algorithm support.
 *
 * Key resolution:
 * - RS256: Uses kid (key ID) from JWT header to look up public key
 * - HS256: Uses static secret from configuration
 * - Migration support: Accepts both algorithms simultaneously
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private jwtKeyService: JwtKeyService,
  ) {
    // Create secretOrKeyProvider that handles RS256/HS256 dynamically
    const secretOrKeyProvider: SecretOrKeyProvider = (
      _request,
      rawJwtToken,
      done,
    ) => {
      try {
        // Extract header to get kid (key ID) for RS256
        const header = JwtStrategy.extractHeader(rawJwtToken);

        if (header?.kid) {
          // RS256: Look up key by kid
          const verificationKey = jwtKeyService.getVerificationKey(header.kid);
          done(null, verificationKey);
        } else if (header?.alg === "RS256") {
          // RS256 without kid - use current key
          const verificationKey = jwtKeyService.getVerificationKey();
          done(null, verificationKey);
        } else {
          // HS256 or no algorithm specified - use secret
          const secret = configService.get<string>("jwt.secret");
          done(null, secret);
        }
      } catch {
        // Fall back to HS256 secret on any error
        const secret = configService.get<string>("jwt.secret");
        done(null, secret);
      }
    };

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider,
      // Accept both algorithms during migration
      algorithms: ["RS256", "HS256"],
    };
    super(options);
  }

  /**
   * Extracts JWT header without full verification.
   * Used to get kid (key ID) for key lookup.
   */
  private static extractHeader(
    token: string,
  ): { alg?: string; kid?: string } | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const headerJson = Buffer.from(parts[0], "base64url").toString("utf8");
      return JSON.parse(headerJson);
    } catch {
      return null;
    }
  }

  /**
   * Validates the JWT payload and returns the user object to attach to request.
   * Called automatically by Passport after JWT signature verification.
   * Uses RLS bypass because this runs before tenant context is fully established.
   */
  async validate(payload: AccessTokenPayload): Promise<RequestUser> {
    // Verify this is an access token, not a refresh token
    if (payload.type !== "access") {
      throw new UnauthorizedException("Invalid token type");
    }

    // Bypass RLS for token validation - middleware will set proper context after
    return this.prisma.withBypassRLS(async () => {
      // Verify user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("User not found or inactive");
      }

      // Verify user's organization matches token (defense in depth)
      if (user.organizationId !== payload.organizationId) {
        throw new UnauthorizedException("Organization mismatch");
      }

      // Verify session is still valid (not revoked)
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        select: { revokedAt: true, expiresAt: true },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedException("Session expired or revoked");
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        role: user.role,
        sessionId: payload.sessionId,
      };
    });
  }
}
