/**
 * ImplementationBlocker Entity
 *
 * Re-exports from Prisma client for type safety.
 * Use these types when working with implementation blockers.
 */

export {
  ImplementationBlocker,
  BlockerCategory,
  BlockerStatus,
} from "@prisma/client";

/**
 * ImplementationBlocker with project relation loaded
 */
import type { Prisma } from "@prisma/client";

export type ImplementationBlockerWithProject =
  Prisma.ImplementationBlockerGetPayload<{
    include: {
      project: true;
    };
  }>;

/**
 * ImplementationBlocker create input type
 */
export type ImplementationBlockerCreateInput =
  Prisma.ImplementationBlockerCreateInput;

/**
 * ImplementationBlocker update input type
 */
export type ImplementationBlockerUpdateInput =
  Prisma.ImplementationBlockerUpdateInput;
