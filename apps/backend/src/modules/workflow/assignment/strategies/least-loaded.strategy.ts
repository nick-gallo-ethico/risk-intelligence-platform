import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { UserRole } from "@prisma/client";
import {
  AssignmentStrategy,
  AssignmentContext,
  AssignmentResult,
} from "./base.strategy";

/**
 * Configuration for least-loaded assignment strategy.
 */
export interface LeastLoadedConfig {
  /** Team ID to limit assignments to (optional) */
  teamId?: string;

  /** Role filter - only consider users with these roles */
  roleFilter?: UserRole[];

  /** Maximum items a user can have assigned (optional capacity limit) */
  maxLoad?: number;
}

/**
 * LeastLoadedStrategy assigns to the user with the fewest open items.
 *
 * Implementation:
 * - Gets list of eligible users based on role filters
 * - Counts active investigations for each user
 * - Assigns to user with the lowest count
 * - Respects optional maxLoad limit
 *
 * This is capacity-aware and prevents overloading individuals.
 */
@Injectable()
export class LeastLoadedStrategy extends AssignmentStrategy {
  readonly type = "least_loaded";

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async resolve(
    context: AssignmentContext,
    config: LeastLoadedConfig,
  ): Promise<AssignmentResult | null> {
    // Get users with their current investigation load
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true,
        ...(config.roleFilter && {
          role: { in: config.roleFilter },
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            // Count active (non-closed) investigations as primary investigator
            investigationsPrimaryInvestigator: {
              where: { status: { not: "CLOSED" } },
            },
          },
        },
      },
    });

    if (users.length === 0) {
      return null;
    }

    // Sort by current load (ascending)
    const sortedUsers = [...users].sort(
      (a, b) =>
        a._count.investigationsPrimaryInvestigator -
        b._count.investigationsPrimaryInvestigator,
    );

    // Find first user under capacity limit
    for (const user of sortedUsers) {
      const currentLoad = user._count.investigationsPrimaryInvestigator;

      // Check capacity limit if configured
      if (config.maxLoad && currentLoad >= config.maxLoad) {
        continue; // Skip users at capacity
      }

      return {
        userId: user.id,
        reason: `Least-loaded assignment to ${user.firstName} ${user.lastName} (${currentLoad} active)`,
      };
    }

    // Everyone is at capacity
    return null;
  }
}
