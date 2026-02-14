import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  AssignmentStrategy,
  AssignmentContext,
  AssignmentResult,
} from "./base.strategy";

/**
 * Configuration for geographic assignment strategy.
 */
export interface GeographicConfig {
  /**
   * Mapping of location identifiers to user IDs.
   * Keys can be country codes, region names, or location IDs.
   * Example: { "US": "user-123", "UK": "user-456", "APAC": "user-789" }
   */
  locationMapping?: Record<string, string>;

  /**
   * Fallback user ID if no mapping matches.
   */
  fallbackUserId?: string;
}

/**
 * GeographicStrategy assigns based on entity location.
 *
 * Implementation:
 * - Looks up designated assignee for entity's location
 * - Tries country first, then region, then location ID
 * - Falls back to configured default if no match
 *
 * This enables timezone-appropriate handling and regional expertise.
 */
@Injectable()
export class GeographicStrategy extends AssignmentStrategy {
  readonly type = "geographic";

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async resolve(
    context: AssignmentContext,
    config: GeographicConfig,
  ): Promise<AssignmentResult | null> {
    if (!context.location && !config.fallbackUserId) {
      return null;
    }

    let designatedUserId: string | undefined;
    let matchKey: string | undefined;

    // Try to find a matching user from location mapping
    if (context.location && config.locationMapping) {
      // Priority: country > region > location ID
      const locationKeys = [
        context.location.country,
        context.location.region,
        context.location.name,
        context.location.id,
      ].filter(Boolean) as string[];

      for (const key of locationKeys) {
        if (config.locationMapping[key]) {
          designatedUserId = config.locationMapping[key];
          matchKey = key;
          break;
        }
      }
    }

    // Use fallback if no mapping found
    if (!designatedUserId && config.fallbackUserId) {
      designatedUserId = config.fallbackUserId;
      matchKey = "fallback";
    }

    if (!designatedUserId) {
      return null;
    }

    // Verify the user exists and is active
    const user = await this.prisma.user.findFirst({
      where: {
        id: designatedUserId,
        organizationId: context.organizationId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return null;
    }

    const locationDesc =
      matchKey === "fallback" ? "(fallback)" : `for ${matchKey}`;

    return {
      userId: user.id,
      reason: `Geographic assignment to ${user.firstName} ${user.lastName} ${locationDesc}`,
    };
  }
}
