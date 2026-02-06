/**
 * ImplementationProject Entity
 *
 * Re-exports from Prisma client for type safety.
 * Use these types when working with implementation projects.
 */

export {
  ImplementationProject,
  ImplementationType,
  ImplementationPhase,
  ProjectStatus,
} from "@prisma/client";

/**
 * ImplementationProject with all relations loaded
 */
import type { Prisma } from "@prisma/client";

export type ImplementationProjectWithRelations =
  Prisma.ImplementationProjectGetPayload<{
    include: {
      organization: true;
      tasks: true;
      blockers: true;
      activities: true;
    };
  }>;

/**
 * ImplementationProject create input type
 */
export type ImplementationProjectCreateInput =
  Prisma.ImplementationProjectCreateInput;

/**
 * ImplementationProject update input type
 */
export type ImplementationProjectUpdateInput =
  Prisma.ImplementationProjectUpdateInput;
