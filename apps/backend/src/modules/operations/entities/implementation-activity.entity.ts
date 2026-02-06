/**
 * ImplementationActivity Entity
 *
 * Re-exports from Prisma client for type safety.
 * Use these types when working with implementation activities.
 */

export { ImplementationActivity, ImplActivityType } from "@prisma/client";

/**
 * ImplementationActivity with project relation loaded
 */
import type { Prisma } from "@prisma/client";

export type ImplementationActivityWithProject =
  Prisma.ImplementationActivityGetPayload<{
    include: {
      project: true;
    };
  }>;

/**
 * ImplementationActivity create input type
 */
export type ImplementationActivityCreateInput =
  Prisma.ImplementationActivityCreateInput;

/**
 * ImplementationActivity update input type
 */
export type ImplementationActivityUpdateInput =
  Prisma.ImplementationActivityUpdateInput;
