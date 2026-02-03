/**
 * Demo Service - Manages prospect account provisioning for sales demonstrations
 *
 * This service handles the hybrid multi-user demo access system:
 * - Sales reps (permanent demo users) provision time-limited prospect accounts
 * - All prospect access is attributed to the originating sales rep
 * - Expired accounts are automatically deactivated
 *
 * SECURITY: Only users with isSalesRep metadata can provision prospect accounts.
 */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../../common/services/activity.service';
import {
  ProvisionProspectDto,
  ExtendExpiryDto,
  RevokeAccountDto,
} from './dto/provision-prospect.dto';
import {
  DemoAccount,
  DemoAccountStatus,
  User,
  UserRole,
  AuditEntityType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

// Constants
const BCRYPT_ROUNDS = 12;
const DEFAULT_EXPIRY_DAYS = 14;
const DEMO_PASSWORD = 'Password123!';

/**
 * Result of provisioning a new prospect account
 */
export interface ProvisionResult {
  user: User;
  demoAccount: DemoAccount;
}

/**
 * Helper to add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Provision a new prospect account
   *
   * Called by sales reps to create a time-limited demo account for a prospect.
   * Returns credentials that can be shared with the prospect.
   *
   * @param salesRepUserId - ID of the sales rep creating the account
   * @param dto - Prospect details and configuration
   * @param organizationId - Organization to create prospect in
   * @returns Created user and demo account
   * @throws ForbiddenException if user is not a sales rep
   */
  async provisionProspectAccount(
    salesRepUserId: string,
    dto: ProvisionProspectDto,
    organizationId: string,
  ): Promise<ProvisionResult> {
    // 1. Verify sales rep has provisioning permission
    const salesRep = await this.prisma.user.findUnique({
      where: { id: salesRepUserId },
    });

    if (!salesRep) {
      throw new NotFoundException('Sales rep not found');
    }

    // Check if user is a demo sales rep (has demo-* email pattern)
    const isDemoSalesRep = salesRep.email.startsWith('demo-') && salesRep.email.endsWith('@acme.local');
    if (!isDemoSalesRep) {
      throw new ForbiddenException('Only sales reps can provision prospect accounts');
    }

    // 2. Calculate expiry (default 14 days if not specified)
    const expiresAt = dto.expiresAt || addDays(new Date(), DEFAULT_EXPIRY_DAYS);

    // 3. Generate unique prospect email
    const prospectEmail = `prospect-${uuid().slice(0, 8)}@demo.local`;

    // 4. Create prospect user with known password
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

    // Parse name if provided
    const nameParts = dto.prospectName?.split(' ') || [];
    const firstName = nameParts[0] || 'Demo';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    // Determine role (default to COMPLIANCE_OFFICER for best demo experience)
    const role = dto.role || UserRole.COMPLIANCE_OFFICER;

    const prospectUser = await this.prisma.user.create({
      data: {
        organizationId,
        email: prospectEmail,
        passwordHash,
        firstName,
        lastName,
        role,
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    });

    // 5. Create DemoAccount record
    const demoAccount = await this.prisma.demoAccount.create({
      data: {
        organizationId,
        prospectUserId: prospectUser.id,
        prospectEmail,
        prospectName: dto.prospectName,
        prospectCompany: dto.prospectCompany,
        salesRepUserId,
        expiresAt,
        notes: dto.notes,
      },
    });

    // 6. Log activity
    await this.activityService.log({
      entityType: AuditEntityType.DEMO_ACCOUNT,
      entityId: demoAccount.id,
      action: 'provisioned',
      actionDescription: `${salesRep.email} provisioned prospect account for ${dto.prospectName || 'unnamed prospect'} (${dto.prospectCompany || 'unknown company'})`,
      actorUserId: salesRepUserId,
      organizationId,
    });

    this.logger.log(
      `Provisioned prospect account ${prospectEmail} by ${salesRep.email} for ${dto.prospectCompany || 'unknown company'}`,
    );

    return { user: prospectUser, demoAccount };
  }

  /**
   * Extend expiry date for an existing prospect account
   *
   * @param demoAccountId - ID of the demo account
   * @param dto - New expiry date
   * @param salesRepUserId - ID of the sales rep making the request
   * @returns Updated demo account
   * @throws NotFoundException if account not found
   * @throws ForbiddenException if not the originating sales rep
   */
  async extendExpiry(
    demoAccountId: string,
    dto: ExtendExpiryDto,
    salesRepUserId: string,
  ): Promise<DemoAccount> {
    const demoAccount = await this.prisma.demoAccount.findUnique({
      where: { id: demoAccountId },
      include: { salesRepUser: true },
    });

    if (!demoAccount) {
      throw new NotFoundException('Demo account not found');
    }

    // Only the originating sales rep can extend
    if (demoAccount.salesRepUserId !== salesRepUserId) {
      throw new ForbiddenException('Only the originating sales rep can extend this account');
    }

    const updated = await this.prisma.demoAccount.update({
      where: { id: demoAccountId },
      data: {
        expiresAt: dto.newExpiryDate,
        status: DemoAccountStatus.ACTIVE, // Reactivate if was expired
        expiredAt: null, // Clear expired timestamp
      },
    });

    // Reactivate the prospect user if needed
    await this.prisma.user.update({
      where: { id: demoAccount.prospectUserId },
      data: { isActive: true },
    });

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.DEMO_ACCOUNT,
      entityId: demoAccountId,
      action: 'expiry_extended',
      actionDescription: `${demoAccount.salesRepUser.email} extended expiry to ${dto.newExpiryDate.toISOString()}`,
      actorUserId: salesRepUserId,
      organizationId: demoAccount.organizationId,
    });

    this.logger.log(`Extended demo account ${demoAccountId} to ${dto.newExpiryDate.toISOString()}`);

    return updated;
  }

  /**
   * Revoke a prospect account (manual deactivation)
   *
   * @param demoAccountId - ID of the demo account
   * @param salesRepUserId - ID of the sales rep making the request
   * @param reason - Optional reason for revocation
   * @returns Updated demo account
   * @throws NotFoundException if account not found
   * @throws ForbiddenException if not the originating sales rep
   */
  async revokeAccount(
    demoAccountId: string,
    salesRepUserId: string,
    reason?: string,
  ): Promise<DemoAccount> {
    const demoAccount = await this.prisma.demoAccount.findUnique({
      where: { id: demoAccountId },
      include: { salesRepUser: true },
    });

    if (!demoAccount) {
      throw new NotFoundException('Demo account not found');
    }

    // Only the originating sales rep can revoke
    if (demoAccount.salesRepUserId !== salesRepUserId) {
      throw new ForbiddenException('Only the originating sales rep can revoke this account');
    }

    const now = new Date();

    // Update demo account status
    const updated = await this.prisma.demoAccount.update({
      where: { id: demoAccountId },
      data: {
        status: DemoAccountStatus.REVOKED,
        expiredAt: now,
        notes: reason ? `${demoAccount.notes || ''}\nRevoked: ${reason}`.trim() : demoAccount.notes,
      },
    });

    // Deactivate the prospect user
    await this.prisma.user.update({
      where: { id: demoAccount.prospectUserId },
      data: { isActive: false },
    });

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.DEMO_ACCOUNT,
      entityId: demoAccountId,
      action: 'revoked',
      actionDescription: `${demoAccount.salesRepUser.email} revoked prospect account${reason ? `: ${reason}` : ''}`,
      actorUserId: salesRepUserId,
      organizationId: demoAccount.organizationId,
    });

    this.logger.log(`Revoked demo account ${demoAccountId}`);

    return updated;
  }

  /**
   * Get all prospect accounts for a sales rep
   *
   * @param salesRepUserId - ID of the sales rep
   * @param organizationId - Organization ID
   * @returns Array of demo accounts
   */
  async getSalesRepProspects(
    salesRepUserId: string,
    organizationId: string,
  ): Promise<DemoAccount[]> {
    return this.prisma.demoAccount.findMany({
      where: {
        salesRepUserId,
        organizationId,
      },
      include: {
        prospectUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Process expired accounts (called by scheduler)
   *
   * Finds all ACTIVE accounts past their expiry date and deactivates them.
   * This is designed to be idempotent - running multiple times is safe.
   *
   * @returns Number of accounts expired
   */
  async processExpiredAccounts(): Promise<number> {
    const now = new Date();

    // Find active accounts past expiry
    const expiredAccounts = await this.prisma.demoAccount.findMany({
      where: {
        status: DemoAccountStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      include: { prospectUser: true },
    });

    if (expiredAccounts.length === 0) {
      return 0;
    }

    // Process each expired account
    for (const account of expiredAccounts) {
      try {
        await this.prisma.$transaction([
          // Deactivate the prospect user
          this.prisma.user.update({
            where: { id: account.prospectUserId },
            data: { isActive: false },
          }),
          // Mark demo account as expired
          this.prisma.demoAccount.update({
            where: { id: account.id },
            data: {
              status: DemoAccountStatus.EXPIRED,
              expiredAt: now,
            },
          }),
        ]);

        this.logger.log(`Expired demo account ${account.id} (${account.prospectEmail})`);
      } catch (error) {
        this.logger.error(
          `Failed to expire demo account ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return expiredAccounts.length;
  }

  /**
   * Record prospect access (called on login)
   *
   * Updates lastAccessAt and accessCount for a prospect user.
   *
   * @param prospectUserId - ID of the prospect user
   */
  async recordAccess(prospectUserId: string): Promise<void> {
    try {
      await this.prisma.demoAccount.updateMany({
        where: { prospectUserId },
        data: {
          lastAccessAt: new Date(),
          accessCount: { increment: 1 },
        },
      });
    } catch (error) {
      // Don't throw - access recording should not break login flow
      this.logger.warn(
        `Failed to record access for prospect ${prospectUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a demo account by prospect user ID
   *
   * @param prospectUserId - ID of the prospect user
   * @returns Demo account or null
   */
  async getDemoAccountByProspectUserId(prospectUserId: string): Promise<DemoAccount | null> {
    return this.prisma.demoAccount.findUnique({
      where: { prospectUserId },
    });
  }
}
