import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MfaService } from './mfa.service';
import {
  MfaSetupResponseDto,
  VerifyMfaSetupDto,
  MfaEnabledResponseDto,
  VerifyMfaDto,
  MfaVerifyResponseDto,
  DisableMfaDto,
  RegenerateRecoveryCodesDto,
  MfaStatusResponseDto,
} from './dto/mfa.dto';

/**
 * Controller for MFA (Multi-Factor Authentication) operations.
 *
 * All endpoints require JWT authentication.
 * Rate limits are applied to prevent brute-force attacks.
 */
@ApiTags('mfa')
@ApiBearerAuth()
@Controller('auth/mfa')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get MFA status for current user' })
  @ApiResponse({ status: 200, type: MfaStatusResponseDto })
  async getMfaStatus(
    @CurrentUser() user: { sub: string },
  ): Promise<MfaStatusResponseDto> {
    return this.mfaService.getMfaStatus(user.sub);
  }

  @Post('setup')
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 per hour
  @ApiOperation({ summary: 'Initiate MFA setup (generates QR code)' })
  @ApiResponse({ status: 201, type: MfaSetupResponseDto })
  async initiateMfaSetup(
    @CurrentUser() user: { sub: string },
  ): Promise<MfaSetupResponseDto> {
    return this.mfaService.initiateMfaSetup(user.sub);
  }

  @Post('setup/verify')
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 per hour
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify setup code and enable MFA' })
  @ApiResponse({ status: 200, type: MfaEnabledResponseDto })
  async verifyAndEnableMfa(
    @Body() dto: VerifyMfaSetupDto,
    @CurrentUser() user: { sub: string },
  ): Promise<MfaEnabledResponseDto> {
    return this.mfaService.verifyAndEnableMfa(user.sub, dto.code);
  }

  @Post('verify')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 per minute (strict)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA code during login' })
  @ApiResponse({ status: 200, type: MfaVerifyResponseDto })
  async verifyMfa(
    @Body() dto: VerifyMfaDto,
    @CurrentUser() user: { sub: string },
  ): Promise<MfaVerifyResponseDto> {
    return this.mfaService.verifyMfa(user.sub, dto.code);
  }

  @Delete()
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 per hour
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable MFA (requires code verification)' })
  @ApiResponse({ status: 204 })
  async disableMfa(
    @Body() dto: DisableMfaDto,
    @CurrentUser() user: { sub: string },
  ): Promise<void> {
    return this.mfaService.disableMfa(user.sub, dto.code);
  }

  @Post('recovery-codes/regenerate')
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 per hour
  @ApiOperation({ summary: 'Regenerate recovery codes (requires code verification)' })
  @ApiResponse({ status: 200, type: [String] })
  async regenerateRecoveryCodes(
    @Body() dto: RegenerateRecoveryCodesDto,
    @CurrentUser() user: { sub: string },
  ): Promise<{ recoveryCodes: string[] }> {
    const codes = await this.mfaService.regenerateRecoveryCodes(
      user.sub,
      dto.code,
    );
    return { recoveryCodes: codes };
  }
}
