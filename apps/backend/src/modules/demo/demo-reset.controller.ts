/**
 * Demo Reset Controller - REST API for demo reset and undo operations
 *
 * Endpoints:
 * - GET /api/v1/demo/session - Get current user's session stats
 * - GET /api/v1/demo/reset/preview - Preview what reset will delete
 * - POST /api/v1/demo/reset - Execute reset (requires confirmation)
 * - POST /api/v1/demo/undo - Undo recent reset (within 24-hour window)
 * - GET /api/v1/demo/verify - Verify reset was successful
 */

import {
  Controller,
  Post,
  Get,
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
import { JwtAuthGuard, TenantGuard } from '../../common/guards';
import { CurrentUser, TenantId } from '../../common/decorators';
import {
  DemoResetService,
  ResetResult,
  UndoResult,
  VerificationSummary,
} from './demo-reset.service';
import { DemoSessionService, SessionStats } from './demo-session.service';
import { User } from '@prisma/client';

/**
 * DTO for reset request
 */
class ResetDemoDto {
  confirmationToken!: string;
}

/**
 * Response for session stats endpoint
 */
interface SessionStatsResponse {
  sessionId: string;
  createdAt: Date;
  lastActivityAt: Date;
  changes: {
    cases: number;
    investigations: number;
    rius: number;
  };
  totalChanges: number;
}

/**
 * Response for reset preview endpoint
 */
interface ResetPreviewResponse {
  message: string;
  willDelete: {
    cases: number;
    investigations: number;
    rius: number;
  };
  totalItems: number;
  baseDataPreserved: boolean;
  undoAvailable: boolean;
  undoWindowHours: number;
  confirmationRequired: boolean;
  confirmationToken: string;
}

@ApiTags('Demo Reset')
@Controller('demo')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth('JWT')
export class DemoResetController {
  constructor(
    private readonly resetService: DemoResetService,
    private readonly sessionService: DemoSessionService,
  ) {}

  /**
   * GET /api/v1/demo/session
   * Get current user's demo session stats.
   * Shows how many changes would be cleared by reset.
   */
  @Get('session')
  @ApiOperation({
    summary: 'Get demo session stats',
    description:
      "Returns current user's demo session information including counts of user-created items.",
  })
  @ApiResponse({
    status: 200,
    description: 'Session stats retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessionStats(
    @CurrentUser() user: User,
    @TenantId() orgId: string,
  ): Promise<SessionStatsResponse> {
    const session = await this.sessionService.getOrCreateSession(
      orgId,
      user.id,
    );
    const stats = await this.sessionService.getSessionWithStats(session.id);

    return {
      sessionId: session.id,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      changes: stats.changeCount,
      totalChanges:
        stats.changeCount.cases +
        stats.changeCount.investigations +
        stats.changeCount.rius,
    };
  }

  /**
   * GET /api/v1/demo/reset/preview
   * Preview what would be deleted by a reset.
   * Same as session stats but explicitly for reset preview.
   */
  @Get('reset/preview')
  @ApiOperation({
    summary: 'Preview reset changes',
    description:
      'Shows what items would be deleted by a reset. Base data is always preserved.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reset preview generated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async previewReset(
    @CurrentUser() user: User,
    @TenantId() orgId: string,
  ): Promise<ResetPreviewResponse> {
    const session = await this.sessionService.getOrCreateSession(
      orgId,
      user.id,
    );
    const stats = await this.sessionService.getSessionWithStats(session.id);

    return {
      message: 'Reset will delete the following user-created items:',
      willDelete: stats.changeCount,
      totalItems:
        stats.changeCount.cases +
        stats.changeCount.investigations +
        stats.changeCount.rius,
      baseDataPreserved: true,
      undoAvailable: true,
      undoWindowHours: 24,
      confirmationRequired: true,
      confirmationToken: 'CONFIRM_RESET',
    };
  }

  /**
   * POST /api/v1/demo/reset
   * Reset user's demo changes.
   * Requires confirmation token to prevent accidental resets.
   *
   * Body: { "confirmationToken": "CONFIRM_RESET" }
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset demo changes',
    description:
      'Deletes all user-created demo data. Requires confirmation token. Base data is preserved.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reset completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid confirmation token',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resetDemo(
    @CurrentUser() user: User,
    @TenantId() orgId: string,
    @Body() dto: ResetDemoDto,
  ): Promise<ResetResult> {
    return this.resetService.resetUserChanges(
      orgId,
      user.id,
      dto.confirmationToken,
    );
  }

  /**
   * POST /api/v1/demo/undo
   * Undo a recent reset (within 24-hour window).
   */
  @Post('undo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Undo reset',
    description:
      'Restores user data from a recent reset. Must be within 24-hour window.',
  })
  @ApiResponse({
    status: 200,
    description: 'Undo completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'No changes available to restore (undo window expired)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async undoReset(
    @CurrentUser() user: User,
    @TenantId() orgId: string,
  ): Promise<UndoResult> {
    return this.resetService.undoReset(orgId, user.id);
  }

  /**
   * GET /api/v1/demo/verify
   * Verify reset was successful.
   * Confirms base data is intact and user changes are cleared.
   */
  @Get('verify')
  @ApiOperation({
    summary: 'Verify reset',
    description:
      'Verifies that base data is intact and user changes have been cleared.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification completed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyReset(
    @CurrentUser() user: User,
    @TenantId() orgId: string,
  ): Promise<VerificationSummary> {
    return this.resetService.getVerificationSummary(orgId, user.id);
  }
}
