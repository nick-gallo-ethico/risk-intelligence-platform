/**
 * DataLoader Factory - Creates Request-Scoped DataLoaders
 *
 * DataLoaders solve the N+1 query problem by batching and caching
 * database queries within a single request. Each request gets its own
 * set of DataLoaders to ensure proper isolation.
 *
 * Key features:
 * - Batches multiple single-record queries into one bulk query
 * - Caches results within the request (no cross-request caching)
 * - Type-safe loaders for common entity relations
 *
 * Usage:
 * ```typescript
 * // In a service or resolver
 * const user = await dataLoaders.userLoader.load(userId);
 * const notes = await dataLoaders.investigationNotesLoader.load(investigationId);
 * ```
 *
 * How it works:
 * 1. First call to .load(id) queues the id for batching
 * 2. At end of event loop tick, batch function is called with all queued ids
 * 3. Results are cached for subsequent .load() calls in same request
 */

import DataLoader from "dataloader";
import { PrismaService } from "../../modules/prisma/prisma.service";

/**
 * Interface for all available DataLoaders.
 * Each loader handles a specific entity or relation.
 */
export interface DataLoaders {
  /** Load users by ID */
  userLoader: DataLoader<string, any>;

  /** Load organizations by ID */
  organizationLoader: DataLoader<string, any>;

  /** Load RIU-Case associations by case ID (one-to-many) */
  caseRiuAssociationsLoader: DataLoader<string, any[]>;

  /** Load case creator (user) by case ID */
  caseCreatorLoader: DataLoader<string, any | null>;

  /** Load investigation notes by investigation ID (one-to-many) */
  investigationNotesLoader: DataLoader<string, any[]>;

  /** Load case by ID */
  caseLoader: DataLoader<string, any>;

  /** Load investigation by ID */
  investigationLoader: DataLoader<string, any>;

  /** Load category by ID */
  categoryLoader: DataLoader<string, any>;

  /** Load primary investigator by investigation ID */
  investigationPrimaryInvestigatorLoader: DataLoader<string, any | null>;
}

/**
 * Creates a complete set of DataLoaders for a single request.
 * Call this once per request and pass the loaders to services.
 *
 * @param prisma - PrismaService instance
 * @returns DataLoaders object with all available loaders
 */
export function createDataLoaders(prisma: PrismaService): DataLoaders {
  return {
    /**
     * Loads users by ID.
     * Batches multiple user lookups into a single query.
     */
    userLoader: new DataLoader<string, any>(
      async (ids) => {
        const users = await prisma.user.findMany({
          where: { id: { in: [...ids] } },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            organizationId: true,
            isActive: true,
          },
        });

        // Map results back to original order
        const userMap = new Map(users.map((u) => [u.id, u]));
        return ids.map((id) => userMap.get(id) || null);
      },
      {
        cache: true, // Cache within request
        maxBatchSize: 100, // Limit batch size for performance
      },
    ),

    /**
     * Loads organizations by ID.
     */
    organizationLoader: new DataLoader<string, any>(
      async (ids) => {
        const orgs = await prisma.organization.findMany({
          where: { id: { in: [...ids] } },
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        });

        const orgMap = new Map(orgs.map((o) => [o.id, o]));
        return ids.map((id) => orgMap.get(id) || null);
      },
      { cache: true, maxBatchSize: 50 },
    ),

    /**
     * Loads RIU-Case associations by case ID.
     * Returns an array of associations (with RIU data) for each case.
     */
    caseRiuAssociationsLoader: new DataLoader<string, any[]>(
      async (caseIds) => {
        const associations = await prisma.riuCaseAssociation.findMany({
          where: { caseId: { in: [...caseIds] } },
          orderBy: { createdAt: "desc" },
          include: {
            riu: {
              select: {
                id: true,
                referenceNumber: true,
                type: true,
                status: true,
                summary: true,
                createdAt: true,
              },
            },
          },
        });

        // Group associations by caseId
        const assocMap = new Map<string, any[]>();
        for (const assoc of associations) {
          if (!assocMap.has(assoc.caseId)) {
            assocMap.set(assoc.caseId, []);
          }
          assocMap.get(assoc.caseId)!.push(assoc);
        }

        return caseIds.map((id) => assocMap.get(id) || []);
      },
      { cache: true, maxBatchSize: 50 },
    ),

    /**
     * Loads case creator (user) by case ID.
     * First fetches cases to get createdByIds, then batch loads users.
     */
    caseCreatorLoader: new DataLoader<string, any | null>(
      async (caseIds) => {
        // Get cases with createdByIds
        const cases = await prisma.case.findMany({
          where: { id: { in: [...caseIds] } },
          select: { id: true, createdById: true },
        });

        // Extract unique creator IDs
        const creatorIds = [
          ...new Set(cases.map((c) => c.createdById).filter(Boolean) as string[]),
        ];

        // Batch load users
        const users = creatorIds.length
          ? await prisma.user.findMany({
              where: { id: { in: creatorIds } },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            })
          : [];

        // Map users by ID
        const userMap = new Map(users.map((u) => [u.id, u]));

        // Map cases to their creators
        const caseCreatorMap = new Map(
          cases.map((c) => [
            c.id,
            c.createdById ? userMap.get(c.createdById) || null : null,
          ]),
        );

        return caseIds.map((id) => caseCreatorMap.get(id) || null);
      },
      { cache: true, maxBatchSize: 50 },
    ),

    /**
     * Loads investigation notes by investigation ID.
     * Returns ordered notes for each investigation.
     */
    investigationNotesLoader: new DataLoader<string, any[]>(
      async (investigationIds) => {
        const notes = await prisma.investigationNote.findMany({
          where: { investigationId: { in: [...investigationIds] } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            investigationId: true,
            content: true,
            noteType: true,
            visibility: true,
            authorId: true,
            authorName: true,
            createdAt: true,
          },
        });

        // Group notes by investigationId
        const noteMap = new Map<string, any[]>();
        for (const note of notes) {
          if (!noteMap.has(note.investigationId)) {
            noteMap.set(note.investigationId, []);
          }
          noteMap.get(note.investigationId)!.push(note);
        }

        return investigationIds.map((id) => noteMap.get(id) || []);
      },
      { cache: true, maxBatchSize: 50 },
    ),

    /**
     * Loads cases by ID.
     */
    caseLoader: new DataLoader<string, any>(
      async (ids) => {
        const cases = await prisma.case.findMany({
          where: { id: { in: [...ids] } },
        });

        const caseMap = new Map(cases.map((c) => [c.id, c]));
        return ids.map((id) => caseMap.get(id) || null);
      },
      { cache: true, maxBatchSize: 50 },
    ),

    /**
     * Loads investigations by ID.
     */
    investigationLoader: new DataLoader<string, any>(
      async (ids) => {
        const investigations = await prisma.investigation.findMany({
          where: { id: { in: [...ids] } },
        });

        const invMap = new Map(investigations.map((i) => [i.id, i]));
        return ids.map((id) => invMap.get(id) || null);
      },
      { cache: true, maxBatchSize: 50 },
    ),

    /**
     * Loads categories by ID.
     */
    categoryLoader: new DataLoader<string, any>(
      async (ids) => {
        const categories = await prisma.category.findMany({
          where: { id: { in: [...ids] } },
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            parentCategoryId: true,
            isActive: true,
          },
        });

        const catMap = new Map(categories.map((c) => [c.id, c]));
        return ids.map((id) => catMap.get(id) || null);
      },
      { cache: true, maxBatchSize: 100 },
    ),

    /**
     * Loads primary investigator by investigation ID.
     */
    investigationPrimaryInvestigatorLoader: new DataLoader<string, any | null>(
      async (investigationIds) => {
        // Get investigations with primaryInvestigatorIds
        const investigations = await prisma.investigation.findMany({
          where: { id: { in: [...investigationIds] } },
          select: { id: true, primaryInvestigatorId: true },
        });

        // Extract unique investigator IDs
        const investigatorIds = [
          ...new Set(
            investigations
              .map((i) => i.primaryInvestigatorId)
              .filter(Boolean) as string[],
          ),
        ];

        // Batch load users
        const users = investigatorIds.length
          ? await prisma.user.findMany({
              where: { id: { in: investigatorIds } },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            })
          : [];

        // Map users by ID
        const userMap = new Map(users.map((u) => [u.id, u]));

        // Map investigations to their primary investigators
        const invInvestigatorMap = new Map(
          investigations.map((i) => [
            i.id,
            i.primaryInvestigatorId
              ? userMap.get(i.primaryInvestigatorId) || null
              : null,
          ]),
        );

        return investigationIds.map((id) => invInvestigatorMap.get(id) || null);
      },
      { cache: true, maxBatchSize: 50 },
    ),
  };
}
