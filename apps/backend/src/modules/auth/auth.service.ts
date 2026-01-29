import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, AuthResponseDto, AuthUserDto } from './dto';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.accessTokenExpiry =
      this.configService.get<string>('jwt.accessTokenExpiry') ?? '15m';
    this.refreshTokenExpiry =
      this.configService.get<string>('jwt.refreshTokenExpiry') ?? '7d';
  }

  /**
   * Authenticates user with email/password and returns JWT tokens.
   */
  async login(
    loginDto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user by email (need to search across organizations for login)
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
      include: {
        organization: {
          select: { isActive: true },
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if organization is active
    if (!user.organization.isActive) {
      throw new UnauthorizedException('Organization is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Create session
    const session = await this.createSession(
      user.id,
      user.organizationId,
      userAgent,
      ipAddress,
    );

    // Generate tokens
    const tokens = await this.generateTokens(user, session.id);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  /**
   * Refreshes access token using a valid refresh token.
   * Implements token rotation for security.
   */
  async refreshTokens(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Find and validate session
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: {
          user: {
            include: {
              organization: { select: { isActive: true } },
            },
          },
        },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      if (!session.user.isActive || !session.user.organization.isActive) {
        throw new UnauthorizedException('User or organization inactive');
      }

      // Revoke old session and create new one (token rotation)
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      const newSession = await this.createSession(
        session.userId,
        session.organizationId,
        userAgent,
        ipAddress,
        session.id, // Link to previous session
      );

      // Generate new tokens
      const tokens = await this.generateTokens(session.user, newSession.id);

      return {
        ...tokens,
        user: {
          id: session.user.id,
          email: session.user.email,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          role: session.user.role,
          organizationId: session.user.organizationId,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Revokes all sessions for a user (logout from all devices).
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes a specific session (single device logout).
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Creates a new session record.
   */
  private async createSession(
    userId: string,
    organizationId: string,
    userAgent?: string,
    ipAddress?: string,
    previousSessionId?: string,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    return this.prisma.session.create({
      data: {
        userId,
        organizationId,
        userAgent,
        ipAddress,
        expiresAt,
        previousSessionId,
      },
    });
  }

  /**
   * Generates access and refresh tokens for a user.
   */
  private async generateTokens(
    user: {
      id: string;
      email: string;
      organizationId: string;
      role: string;
    },
    sessionId: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role as any,
      sessionId,
      type: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      sessionId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: this.accessTokenExpiry,
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: this.refreshTokenExpiry,
      }),
    ]);

    // Calculate expiresIn in seconds (default 15 minutes = 900 seconds)
    const expiresIn = this.parseExpiryToSeconds(this.accessTokenExpiry);

    return { accessToken, refreshToken, expiresIn };
  }

  /**
   * Converts expiry string (e.g., '15m', '7d') to seconds.
   */
  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
