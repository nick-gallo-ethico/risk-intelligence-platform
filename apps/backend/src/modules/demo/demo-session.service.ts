/**
 * Demo Session Service - Manages demo user sessions and tracks user changes
 *
 * This service implements the copy-on-write tracking pattern for the demo reset system:
 * - Each user has exactly one session per organization
 * - Sessions track what records the user has created
 * - Base data (seeded data) is immutable and never touched by resets
 * - User changes can be counted and reset independently
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DemoUserSession } from '@prisma/client';

/**
 * Session statistics showing change counts by entity type
 */
export interface SessionStats {
  session: DemoUserSession;
  changeCount: {
    cases: number;
    investigations: number;
    rius: number;
  };
}

@Injectable()
export class DemoSessionService {
  private readonly logger = new Logger(DemoSessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create a demo session for a user.
   * Each user has exactly one session per organization.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns The demo session (existing or newly created)
   */
  async getOrCreateSession(
    organizationId: string,
    userId: string,
  ): Promise<DemoUserSession> {
    const existing = await this.prisma.demoUserSession.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });

    if (existing) {
      // Update last activity
      return this.prisma.demoUserSession.update({
        where: { id: existing.id },
        data: { lastActivityAt: new Date() },
      });
    }

    this.logger.log(
      `Creating new demo session for user ${userId} in org ${organizationId}`,
    );
    return this.prisma.demoUserSession.create({
      data: {
        organizationId,
        userId,
      },
    });
  }

  /**
   * Get session by ID.
   *
   * @param sessionId - Session ID
   * @returns The session or null
   */
  async getSession(sessionId: string): Promise<DemoUserSession | null> {
    return this.prisma.demoUserSession.findUnique({
      where: { id: sessionId },
    });
  }

  /**
   * Get session by user ID within an organization.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns The session or null
   */
  async getSessionByUser(
    organizationId: string,
    userId: string,
  ): Promise<DemoUserSession | null> {
    return this.prisma.demoUserSession.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });
  }

  /**
   * Get session by ID with counts of user's changes.
   *
   * @param sessionId - Session ID
   * @returns Session with change counts
   * @throws NotFoundException if session not found
   */
  async getSessionWithStats(sessionId: string): Promise<SessionStats> {
    const session = await this.prisma.demoUserSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Demo session ${sessionId} not found`);
    }

    const [cases, investigations, rius] = await Promise.all([
      this.prisma.case.count({
        where: { demoUserSessionId: sessionId, isBaseData: false },
      }),
      this.prisma.investigation.count({
        where: { demoUserSessionId: sessionId, isBaseData: false },
      }),
      this.prisma.riskIntelligenceUnit.count({
        where: { demoUserSessionId: sessionId, isBaseData: false },
      }),
    ]);

    return {
      session,
      changeCount: { cases, investigations, rius },
    };
  }

  /**
   * Check if a record is base data (immutable) or user-created.
   * Base data has isBaseData: true or demoUserSessionId: null.
   *
   * @param record - Record with isBaseData and demoUserSessionId fields
   * @returns True if record is base data
   */
  isBaseData(record: {
    isBaseData?: boolean;
    demoUserSessionId?: string | null;
  }): boolean {
    return record.isBaseData === true || record.demoUserSessionId === null;
  }

  /**
   * Get all sessions with stale changes (for optional cleanup).
   * Returns sessions where lastActivityAt is older than the specified days.
   *
   * @param olderThanDays - Number of days of inactivity (default 30)
   * @returns Array of stale sessions
   */
  async getStaleSessions(olderThanDays = 30): Promise<DemoUserSession[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    return this.prisma.demoUserSession.findMany({
      where: {
        lastActivityAt: { lt: cutoff },
      },
      orderBy: { lastActivityAt: 'asc' },
    });
  }

  /**
   * Update last activity timestamp for a session.
   *
   * @param sessionId - Session ID
   */
  async touchSession(sessionId: string): Promise<void> {
    await this.prisma.demoUserSession.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });
  }

  /**
   * Get all sessions for an organization.
   *
   * @param organizationId - Organization ID
   * @returns Array of sessions with user info
   */
  async getOrganizationSessions(organizationId: string): Promise<
    Array<
      DemoUserSession & {
        user: { id: string; email: string; firstName: string; lastName: string };
      }
    >
  > {
    return this.prisma.demoUserSession.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  /**
   * Delete a session (and cascade delete archived changes).
   * Note: This does NOT delete user's changes in Case/Investigation/RIU.
   * Use DemoResetService.resetUserChanges for that.
   *
   * @param sessionId - Session ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.prisma.demoUserSession.delete({
      where: { id: sessionId },
    });
    this.logger.log(`Deleted demo session ${sessionId}`);
  }
}
