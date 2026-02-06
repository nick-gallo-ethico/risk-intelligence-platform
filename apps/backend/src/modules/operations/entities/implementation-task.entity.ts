/**
 * ImplementationTask Entity
 *
 * Re-exports from Prisma client for type safety.
 * Use these types when working with implementation tasks.
 */

export { ImplementationTask, ImplTaskStatus } from "@prisma/client";

/**
 * ImplementationTask with project relation loaded
 */
import type { Prisma } from "@prisma/client";

export type ImplementationTaskWithProject =
  Prisma.ImplementationTaskGetPayload<{
    include: {
      project: true;
    };
  }>;

/**
 * ImplementationTask create input type
 */
export type ImplementationTaskCreateInput =
  Prisma.ImplementationTaskCreateInput;

/**
 * ImplementationTask update input type
 */
export type ImplementationTaskUpdateInput =
  Prisma.ImplementationTaskUpdateInput;
