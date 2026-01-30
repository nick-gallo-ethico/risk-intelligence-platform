import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, AuthResponseDto, RefreshTokenDto } from './dto';
import { Public } from '../../common/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { RequestUser } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Authenticates user with email/password and returns JWT tokens.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const userAgent = req.headers['user-agent'];
    const ipAddress =
      req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';

    return this.authService.login(loginDto, userAgent, ipAddress);
  }

  /**
   * POST /api/v1/auth/refresh
   * Refreshes access token using refresh token.
   * Implements token rotation - old refresh token is invalidated.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const userAgent = req.headers['user-agent'];
    const ipAddress =
      req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';

    return this.authService.refreshTokens(
      refreshDto.refreshToken,
      userAgent,
      ipAddress,
    );
  }

  /**
   * POST /api/v1/auth/logout
   * Revokes the current session (single device logout).
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: RequestUser): Promise<void> {
    await this.authService.revokeSession(user.sessionId);
  }

  /**
   * POST /api/v1/auth/logout-all
   * Revokes all sessions for the current user (logout from all devices).
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser() user: RequestUser): Promise<void> {
    await this.authService.revokeAllSessions(user.id);
  }

  /**
   * GET /api/v1/auth/me
   * Returns the current authenticated user's profile.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
}
