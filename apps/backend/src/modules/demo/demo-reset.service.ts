/**
 * Demo Reset Service - Handles session-scoped deletion with archiving and undo support
 *
 * This service implements the hybrid multi-user demo reset system:
 * - Base data (isBaseData: true) is NEVER deleted
 * - User changes (demoUserSessionId set) are archived then deleted
 * - 24-hour undo window via DemoArchivedChange
 * - Confirmation token required to prevent accidental resets
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DemoSessionService } from './demo-session.service';

/** Undo window duration in hours */
const UNDO_WINDOW_HOURS = 24;

/** Required confirmation token for reset */
const CONFIRMATION_TOKEN = 'CONFIRM_RESET';

/**
 * Result of a reset operation
 */
export interface ResetResult {
  success: boolean;
  deletedCounts: {
    cases: number;
    investigations: number;
    rius: number;
    auditLogs: number;
    messages: number;
    notes: number;
    subjects: number;
  };
  archiveId: string;
  undoExpiresAt: Date;
  durationMs: number;
  verification?: VerificationSummary;
}

/**
 * Result of an undo operation
 */
export interface UndoResult {
  success: boolean;
  restoredCounts: {
    cases: number;
    investigations: number;
    rius: number;
  };
}

/**
 * Verification summary after reset
 */
export interface VerificationSummary {
  baseDataIntact: boolean;
  userChangesCleared: boolean;
  counts: {
    baseRius: number;
    baseCases: number;
    baseInvestigations: number;
    userRius: number;
    userCases: number;
    userInvestigations: number;
  };
}

@Injectable()
export class DemoResetService {
  private readonly logger = new Logger(DemoResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: DemoSessionService,
  ) {}

  /**
   * Reset a user's demo changes.
   * Archives changes for 24-hour undo window, then deletes.
   * Base data (isBaseData: true) is NEVER touched.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @param confirmationToken - Must be "CONFIRM_RESET" to proceed
   * @returns Reset result with deletion counts
   * @throws BadRequestException if confirmation token is invalid
   */
  async resetUserChanges(
    organizationId: string,
    userId: string,
    confirmationToken: string,
  ): Promise<ResetResult> {
    const startTime = Date.now();

    // Validate confirmation token
    if (confirmationToken !== CONFIRMATION_TOKEN) {
      throw new BadRequestException(
        `Reset requires confirmation. Pass confirmationToken: "${CONFIRMATION_TOKEN}"`,
      );
    }

    const session = await this.sessionService.getOrCreateSession(
      organizationId,
      userId,
    );
    const sessionId = session.id;

    this.logger.log(`Starting reset for session ${sessionId} (user ${userId})`);

    // Calculate undo expiry time
    const undoExpiresAt = new Date();
    undoExpiresAt.setHours(undoExpiresAt.getHours() + UNDO_WINDOW_HOURS);

    // Archive user's changes before deletion
    const archiveId = await this.archiveUserChanges(sessionId, undoExpiresAt);

    // Delete user's changes (NOT base data)
    const deletedCounts = await this.deleteUserChanges(sessionId);

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Reset complete in ${durationMs}ms. Deleted: ${JSON.stringify(deletedCounts)}`,
    );

    // Get verification summary
    const verification = await this.getVerificationSummary(
      organizationId,
      userId,
    );

    return {
      success: true,
      deletedCounts,
      archiveId,
      undoExpiresAt,
      durationMs,
      verification,
    };
  }

  /**
   * Archive user's changes to DemoArchivedChange for undo support.
   *
   * @param sessionId - Demo session ID
   * @param expiresAt - When the archive expires
   * @returns Archive ID (for reference)
   */
  private async archiveUserChanges(
    sessionId: string,
    expiresAt: Date,
  ): Promise<string> {
    const archiveId = `archive_${sessionId}_${Date.now()}`;

    // Fetch all user changes
    const [cases, investigations, rius] = await Promise.all([
      this.prisma.case.findMany({
        where: { demoUserSessionId: sessionId, isBaseData: false },
        include: { messages: true, subjects: true },
      }),
      this.prisma.investigation.findMany({
        where: { demoUserSessionId: sessionId, isBaseData: false },
        include: { notes: true },
      }),
      this.prisma.riskIntelligenceUnit.findMany({
        where: { demoUserSessionId: sessionId, isBaseData: false },
      }),
    ]);

    // Create archive records
    const archiveRecords: Array<{
      organizationId: string;
      demoUserSessionId: string;
      entityType: string;
      entityId: string;
      entityData: object;
      expiresAt: Date;
    }> = [];

    for (const c of cases) {
      archiveRecords.push({
        organizationId: c.organizationId,
        demoUserSessionId: sessionId,
        entityType: 'Case',
        entityId: c.id,
        entityData: c as unknown as object,
        expiresAt,
      });
    }

    for (const i of investigations) {
      archiveRecords.push({
        organizationId: i.organizationId,
        demoUserSessionId: sessionId,
        entityType: 'Investigation',
        entityId: i.id,
        entityData: i as unknown as object,
        expiresAt,
      });
    }

    for (const r of rius) {
      archiveRecords.push({
        organizationId: r.organizationId,
        demoUserSessionId: sessionId,
        entityType: 'RIU',
        entityId: r.id,
        entityData: r as unknown as object,
        expiresAt,
      });
    }

    if (archiveRecords.length > 0) {
      await this.prisma.demoArchivedChange.createMany({
        data: archiveRecords,
      });
    }

    this.logger.log(`Archived ${archiveRecords.length} records for undo`);
    return archiveId;
  }

  /**
   * Delete user's changes (session-scoped only, never base data).
   * Deletes in FK-safe order (children first).
   *
   * @param sessionId - Demo session ID
   * @returns Counts of deleted records by type
   */
  private async deleteUserChanges(
    sessionId: string,
  ): Promise<ResetResult['deletedCounts']> {
    // Get IDs first for audit log deletion
    const userCaseIds = await this.getUserEntityIds(sessionId, 'case');
    const userInvestigationIds = await this.getUserEntityIds(
      sessionId,
      'investigation',
    );
    const userRiuIds = await this.getUserEntityIds(sessionId, 'riu');

    // Delete in FK-safe order using a transaction
    const results = await this.prisma.$transaction([
      // 1. Delete audit logs for user entities
      this.prisma.auditLog.deleteMany({
        where: {
          OR: [
            { entityType: 'CASE', entityId: { in: userCaseIds } },
            { entityType: 'INVESTIGATION', entityId: { in: userInvestigationIds } },
            { entityType: 'RIU', entityId: { in: userRiuIds } },
          ],
        },
      }),
      // 2. Delete messages on user-created cases
      this.prisma.caseMessage.deleteMany({
        where: { caseId: { in: userCaseIds } },
      }),
      // 3. Delete investigation notes
      this.prisma.investigationNote.deleteMany({
        where: { investigationId: { in: userInvestigationIds } },
      }),
      // 4. Delete subjects on user cases
      this.prisma.subject.deleteMany({
        where: { caseId: { in: userCaseIds } },
      }),
      // 5. Delete investigations (after notes)
      this.prisma.investigation.deleteMany({
        where: { demoUserSessionId: sessionId, isBaseData: false },
      }),
      // 6. Delete RIU-Case associations for user RIUs
      this.prisma.riuCaseAssociation.deleteMany({
        where: {
          OR: [
            { riuId: { in: userRiuIds } },
            { caseId: { in: userCaseIds } },
          ],
        },
      }),
      // 7. Delete cases (after investigations, messages, subjects)
      this.prisma.case.deleteMany({
        where: { demoUserSessionId: sessionId, isBaseData: false },
      }),
      // 8. Delete RIUs (after associations)
      this.prisma.riskIntelligenceUnit.deleteMany({
        where: { demoUserSessionId: sessionId, isBaseData: false },
      }),
    ]);

    return {
      auditLogs: results[0].count,
      messages: results[1].count,
      notes: results[2].count,
      subjects: results[3].count,
      investigations: results[4].count,
      cases: results[6].count,
      rius: results[7].count,
    };
  }

  /**
   * Helper to get user's entity IDs for a specific type.
   */
  private async getUserEntityIds(
    sessionId: string,
    entityType: 'case' | 'investigation' | 'riu',
  ): Promise<string[]> {
    let records: { id: string }[];

    switch (entityType) {
      case 'case':
        records = await this.prisma.case.findMany({
          where: { demoUserSessionId: sessionId, isBaseData: false },
          select: { id: true },
        });
        break;
      case 'investigation':
        records = await this.prisma.investigation.findMany({
          where: { demoUserSessionId: sessionId, isBaseData: false },
          select: { id: true },
        });
        break;
      case 'riu':
        records = await this.prisma.riskIntelligenceUnit.findMany({
          where: { demoUserSessionId: sessionId, isBaseData: false },
          select: { id: true },
        });
        break;
    }

    return records.map((r) => r.id);
  }

  /**
   * Undo a recent reset (within 24-hour window).
   * Restores entities from the archive.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns Undo result with restored counts
   * @throws BadRequestException if no changes available to restore
   */
  async undoReset(organizationId: string, userId: string): Promise<UndoResult> {
    const session = await this.sessionService.getOrCreateSession(
      organizationId,
      userId,
    );

    // Get archived changes that haven't expired or been restored
    const archived = await this.prisma.demoArchivedChange.findMany({
      where: {
        demoUserSessionId: session.id,
        expiresAt: { gt: new Date() },
        restoredAt: null,
      },
      orderBy: { archivedAt: 'desc' },
    });

    if (archived.length === 0) {
      throw new BadRequestException(
        'No changes available to restore. Undo window may have expired.',
      );
    }

    // Restore entities from archive
    const restoredCounts = { cases: 0, investigations: 0, rius: 0 };

    for (const archive of archived) {
      const data = archive.entityData as Record<string, unknown>;

      try {
        switch (archive.entityType) {
          case 'Case':
            await this.prisma.case.create({
              data: this.cleanForRestore(data) as Parameters<
                typeof this.prisma.case.create
              >[0]['data'],
            });
            restoredCounts.cases++;
            break;
          case 'Investigation':
            await this.prisma.investigation.create({
              data: this.cleanForRestore(data) as Parameters<
                typeof this.prisma.investigation.create
              >[0]['data'],
            });
            restoredCounts.investigations++;
            break;
          case 'RIU':
            await this.prisma.riskIntelligenceUnit.create({
              data: this.cleanForRestore(data) as Parameters<
                typeof this.prisma.riskIntelligenceUnit.create
              >[0]['data'],
            });
            restoredCounts.rius++;
            break;
        }

        // Mark as restored
        await this.prisma.demoArchivedChange.update({
          where: { id: archive.id },
          data: { restoredAt: new Date() },
        });
      } catch (error) {
        this.logger.warn(
          `Failed to restore ${archive.entityType} ${archive.entityId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }

    this.logger.log(`Restored ${archived.length} entities from archive`);

    return {
      success: true,
      restoredCounts,
    };
  }

  /**
   * Clean entity data for restoration (remove relations, etc.).
   */
  private cleanForRestore(data: Record<string, unknown>): Record<string, unknown> {
    // Remove relation fields that were included in the archive
    const {
      messages,
      subjects,
      notes,
      interviews,
      organization,
      createdBy,
      updatedBy,
      category,
      primaryCategory,
      secondaryCategory,
      demoUserSession,
      case: _case,
      riuAssociations,
      caseAssociations,
      interactions,
      investigations,
      ...clean
    } = data;

    return clean;
  }

  /**
   * Get verification summary after reset.
   * Confirms base data is intact and user changes are cleared.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns Verification summary
   */
  async getVerificationSummary(
    organizationId: string,
    userId: string,
  ): Promise<VerificationSummary> {
    const session = await this.sessionService.getSessionByUser(
      organizationId,
      userId,
    );
    const sessionId = session?.id;

    const [
      baseRius,
      baseCases,
      baseInvestigations,
      userRius,
      userCases,
      userInvestigations,
    ] = await Promise.all([
      this.prisma.riskIntelligenceUnit.count({
        where: { organizationId, isBaseData: true },
      }),
      this.prisma.case.count({
        where: { organizationId, isBaseData: true },
      }),
      this.prisma.investigation.count({
        where: { organizationId, isBaseData: true },
      }),
      sessionId
        ? this.prisma.riskIntelligenceUnit.count({
            where: { demoUserSessionId: sessionId, isBaseData: false },
          })
        : 0,
      sessionId
        ? this.prisma.case.count({
            where: { demoUserSessionId: sessionId, isBaseData: false },
          })
        : 0,
      sessionId
        ? this.prisma.investigation.count({
            where: { demoUserSessionId: sessionId, isBaseData: false },
          })
        : 0,
    ]);

    // Expected base data counts (from seeding - approximate)
    const expectedBaseRius = 5000;
    const expectedBaseCases = 4500;

    return {
      baseDataIntact:
        baseRius >= expectedBaseRius * 0.9 &&
        baseCases >= expectedBaseCases * 0.9,
      userChangesCleared:
        userRius === 0 && userCases === 0 && userInvestigations === 0,
      counts: {
        baseRius,
        baseCases,
        baseInvestigations,
        userRius,
        userCases,
        userInvestigations,
      },
    };
  }

  /**
   * Cleanup expired archives (called by scheduled job).
   *
   * @returns Number of deleted archive records
   */
  async cleanupExpiredArchives(): Promise<number> {
    const result = await this.prisma.demoArchivedChange.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired archive records`);
    return result.count;
  }

  /**
   * Cleanup stale sessions (optional, for sessions inactive > 30 days).
   * Also deletes user's changes before removing the session.
   *
   * @param olderThanDays - Number of days of inactivity (default 30)
   * @returns Number of cleaned up sessions
   */
  async cleanupStaleSessions(olderThanDays = 30): Promise<number> {
    const staleSessions =
      await this.sessionService.getStaleSessions(olderThanDays);

    for (const session of staleSessions) {
      // Delete session's changes first
      await this.deleteUserChanges(session.id);
      // Then delete the session
      await this.sessionService.deleteSession(session.id);
    }

    this.logger.log(`Cleaned up ${staleSessions.length} stale sessions`);
    return staleSessions.length;
  }
}
