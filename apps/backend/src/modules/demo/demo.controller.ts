/**
 * Demo Controller - REST API for prospect account management
 *
 * Endpoints:
 * - POST /api/v1/demo/prospects - Provision a new prospect account
 * - GET /api/v1/demo/prospects - List prospect accounts for current user
 * - PATCH /api/v1/demo/prospects/:id/extend - Extend account expiry
 * - POST /api/v1/demo/prospects/:id/revoke - Revoke an account
 * - GET /api/v1/demo/credentials - Get demo credentials (public)
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DemoService } from './demo.service';
import {
  ProvisionProspectDto,
  ExtendExpiryDto,
  RevokeAccountDto,
  ProvisionResponseDto,
  DemoAccountResponseDto,
  DemoCredentialsDto,
  ProspectListItemDto,
} from './dto';
import { JwtAuthGuard, TenantGuard } from '../../common/guards';
import { CurrentUser, TenantId } from '../../common/decorators';
import { Public } from '../../common/guards/jwt-auth.guard';

/**
 * Request user interface (from JWT payload)
 */
interface RequestUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
}

@ApiTags('Demo')
@Controller('api/v1/demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  /**
   * POST /api/v1/demo/prospects
   * Provision a new prospect demo account (sales reps only)
   */
  @Post('prospects')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Provision a new prospect demo account',
    description:
      'Creates a time-limited demo account for a prospect. Only sales reps can provision accounts. Returns credentials for the prospect to use.',
  })
  @ApiResponse({
    status: 201,
    description: 'Prospect account provisioned successfully',
    type: ProvisionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Only sales reps can provision prospect accounts',
  })
  async provisionProspect(
    @Body() dto: ProvisionProspectDto,
    @CurrentUser() user: RequestUser,
    @TenantId() orgId: string,
  ): Promise<ProvisionResponseDto> {
    const result = await this.demoService.provisionProspectAccount(
      user.id,
      dto,
      orgId,
    );

    return {
      id: result.demoAccount.id,
      prospectEmail: result.demoAccount.prospectEmail,
      prospectName: result.demoAccount.prospectName ?? undefined,
      prospectCompany: result.demoAccount.prospectCompany ?? undefined,
      role: result.user.role,
      status: result.demoAccount.status,
      expiresAt: result.demoAccount.expiresAt,
      expiredAt: result.demoAccount.expiredAt ?? undefined,
      lastAccessAt: result.demoAccount.lastAccessAt ?? undefined,
      accessCount: result.demoAccount.accessCount,
      createdAt: result.demoAccount.createdAt,
      credentials: {
        email: result.user.email,
        password: 'Password123!',
      },
    };
  }

  /**
   * GET /api/v1/demo/prospects
   * List all prospect accounts for current sales rep
   */
  @Get('prospects')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'List prospect accounts provisioned by current user',
    description:
      'Returns all prospect demo accounts created by the authenticated sales rep.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of prospect accounts',
    type: [ProspectListItemDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listProspects(
    @CurrentUser() user: RequestUser,
    @TenantId() orgId: string,
  ): Promise<ProspectListItemDto[]> {
    const accounts = await this.demoService.getSalesRepProspects(
      user.id,
      orgId,
    );

    return accounts.map((account) => ({
      id: account.id,
      prospectEmail: account.prospectEmail,
      prospectName: account.prospectName ?? undefined,
      prospectCompany: account.prospectCompany ?? undefined,
      status: account.status,
      expiresAt: account.expiresAt,
      accessCount: account.accessCount,
      lastAccessAt: account.lastAccessAt ?? undefined,
      createdAt: account.createdAt,
      // @ts-expect-error - included relation is properly typed at runtime
      prospectUser: account.prospectUser,
    }));
  }

  /**
   * PATCH /api/v1/demo/prospects/:id/extend
   * Extend expiry date for a prospect account
   */
  @Patch('prospects/:id/extend')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Extend prospect account expiry',
    description:
      'Extends the expiry date of a prospect account. Only the originating sales rep can extend.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account expiry extended',
    type: DemoAccountResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Only the originating sales rep can extend this account',
  })
  @ApiResponse({ status: 404, description: 'Demo account not found' })
  async extendExpiry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendExpiryDto,
    @CurrentUser() user: RequestUser,
  ): Promise<DemoAccountResponseDto> {
    const account = await this.demoService.extendExpiry(id, dto, user.id);

    return {
      id: account.id,
      prospectEmail: account.prospectEmail,
      prospectName: account.prospectName ?? undefined,
      prospectCompany: account.prospectCompany ?? undefined,
      role: 'COMPLIANCE_OFFICER', // Default role
      status: account.status,
      expiresAt: account.expiresAt,
      expiredAt: account.expiredAt ?? undefined,
      lastAccessAt: account.lastAccessAt ?? undefined,
      accessCount: account.accessCount,
      createdAt: account.createdAt,
    };
  }

  /**
   * POST /api/v1/demo/prospects/:id/revoke
   * Revoke a prospect account
   */
  @Post('prospects/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Revoke prospect account',
    description:
      'Revokes (deactivates) a prospect account. Only the originating sales rep can revoke.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account revoked',
    type: DemoAccountResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Only the originating sales rep can revoke this account',
  })
  @ApiResponse({ status: 404, description: 'Demo account not found' })
  async revokeAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeAccountDto,
    @CurrentUser() user: RequestUser,
  ): Promise<DemoAccountResponseDto> {
    const account = await this.demoService.revokeAccount(
      id,
      user.id,
      dto.reason,
    );

    return {
      id: account.id,
      prospectEmail: account.prospectEmail,
      prospectName: account.prospectName ?? undefined,
      prospectCompany: account.prospectCompany ?? undefined,
      role: 'COMPLIANCE_OFFICER', // Default role
      status: account.status,
      expiresAt: account.expiresAt,
      expiredAt: account.expiredAt ?? undefined,
      lastAccessAt: account.lastAccessAt ?? undefined,
      accessCount: account.accessCount,
      createdAt: account.createdAt,
    };
  }

  /**
   * GET /api/v1/demo/credentials
   * Get demo credentials for permanent accounts (public info)
   */
  @Get('credentials')
  @Public()
  @ApiOperation({
    summary: 'Get demo account credentials',
    description:
      'Returns the password and list of available demo accounts for testing. This endpoint is public.',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo credentials',
    type: DemoCredentialsDto,
  })
  async getDemoCredentials(): Promise<DemoCredentialsDto> {
    return {
      password: 'Password123!',
      accounts: [
        {
          email: 'demo-admin@acme.local',
          role: 'SYSTEM_ADMIN',
          description: 'System Administrator with full access',
        },
        {
          email: 'demo-cco@acme.local',
          role: 'COMPLIANCE_OFFICER',
          description: 'Chief Compliance Officer - executive oversight',
        },
        {
          email: 'demo-triage@acme.local',
          role: 'TRIAGE_LEAD',
          description: 'Triage Lead - initial case routing',
        },
        {
          email: 'demo-investigator@acme.local',
          role: 'INVESTIGATOR',
          description: 'Senior Investigator - case investigation',
        },
        {
          email: 'demo-investigator2@acme.local',
          role: 'INVESTIGATOR',
          description: 'Junior Investigator - case investigation',
        },
        {
          email: 'demo-policy@acme.local',
          role: 'POLICY_AUTHOR',
          description: 'Policy Author - policy management',
        },
        {
          email: 'demo-reviewer@acme.local',
          role: 'POLICY_REVIEWER',
          description: 'Policy Reviewer - policy approval',
        },
        {
          email: 'demo-manager@acme.local',
          role: 'MANAGER',
          description: 'Department Manager - limited case view',
        },
        {
          email: 'demo-employee@acme.local',
          role: 'EMPLOYEE',
          description: 'Employee - self-service portal access',
        },
      ],
    };
  }
}
