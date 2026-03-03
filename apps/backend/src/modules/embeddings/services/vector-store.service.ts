import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { toSql } from "pgvector";
import { PrismaService } from "../../prisma/prisma.service";
import { ChunkMetadata } from "../dto/chunk.dto";
import {
  SemanticSearchResult,
  SemanticSearchOptions,
  EmbeddedChunk,
  UpsertResult,
} from "../dto/search.dto";

/**
 * VectorStoreService handles pgvector CRUD operations.
 *
 * CRITICAL: All queries MUST include explicit organizationId filter.
 * This table does NOT use RLS (per CRIT-01 in STATE.md).
 * pgvector similarity queries don't work reliably with RLS.
 */
@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert chunks for a source document.
   * Performs atomic replacement: deletes existing chunks then inserts new ones.
   */
  async upsertChunks(
    organizationId: string,
    sourceType: string,
    sourceId: string,
    chunks: EmbeddedChunk[],
    modelVersion: string,
  ): Promise<UpsertResult> {
    if (chunks.length === 0) {
      return {
        sourceType,
        sourceId,
        chunksInserted: 0,
        chunksDeleted: 0,
      };
    }

    const deleted = await this.deleteBySource(
      organizationId,
      sourceType,
      sourceId,
    );

    let inserted = 0;
    for (const chunk of chunks) {
      const vectorSql = toSql(chunk.embedding);

      await this.prisma.$executeRaw`
        INSERT INTO document_embeddings (
          id, organization_id, source_type, source_id,
          chunk_index, chunk_text, chunk_metadata,
          embedding, model_version, created_at
        ) VALUES (
          gen_random_uuid(),
          ${organizationId}::uuid,
          ${sourceType}::"EmbeddingSourceType",
          ${sourceId}::uuid,
          ${chunk.chunkIndex},
          ${chunk.text},
          ${JSON.stringify(chunk.metadata)}::jsonb,
          ${vectorSql}::vector,
          ${modelVersion},
          now()
        )
      `;
      inserted++;
    }

    this.logger.debug(
      `Upserted ${inserted} chunks for ${sourceType}:${sourceId} (deleted ${deleted})`,
    );

    return {
      sourceType,
      sourceId,
      chunksInserted: inserted,
      chunksDeleted: deleted,
    };
  }

  /**
   * Delete all chunks for a specific source document.
   */
  async deleteBySource(
    organizationId: string,
    sourceType: string,
    sourceId: string,
  ): Promise<number> {
    const result = await this.prisma.$executeRaw`
      DELETE FROM document_embeddings
      WHERE organization_id = ${organizationId}::uuid
        AND source_type = ${sourceType}::"EmbeddingSourceType"
        AND source_id = ${sourceId}::uuid
    `;

    return Number(result);
  }

  /**
   * Delete all chunks for an organization.
   */
  async deleteByOrganization(organizationId: string): Promise<number> {
    const result = await this.prisma.$executeRaw`
      DELETE FROM document_embeddings
      WHERE organization_id = ${organizationId}::uuid
    `;

    this.logger.log(
      `Deleted all embeddings for organization ${organizationId}`,
    );
    return Number(result);
  }

  /**
   * Perform semantic search using cosine distance.
   */
  async semanticSearch(
    organizationId: string,
    queryEmbedding: number[],
    options?: SemanticSearchOptions,
  ): Promise<SemanticSearchResult[]> {
    const limit = options?.limit ?? 10;
    const vectorSql = toSql(queryEmbedding);

    let sourceTypeFilter = Prisma.empty;
    if (options?.sourceTypes && options.sourceTypes.length > 0) {
      const typeConditions = options.sourceTypes.map((t) => `'${t}'`).join(",");
      sourceTypeFilter = Prisma.sql`AND source_type::text IN (${Prisma.raw(typeConditions)})`;
    }

    let sourceIdFilter = Prisma.empty;
    if (options?.sourceIds && options.sourceIds.length > 0) {
      const idConditions = options.sourceIds
        .map((id) => `'${id}'::uuid`)
        .join(",");
      sourceIdFilter = Prisma.sql`AND source_id IN (${Prisma.raw(idConditions)})`;
    }

    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        source_type: string;
        source_id: string;
        chunk_index: number;
        chunk_text: string;
        chunk_metadata: Record<string, unknown>;
        distance: number;
      }>
    >`
      SELECT
        id,
        source_type::text as source_type,
        source_id::text as source_id,
        chunk_index,
        chunk_text,
        chunk_metadata,
        embedding <=> ${vectorSql}::vector AS distance
      FROM document_embeddings
      WHERE organization_id = ${organizationId}::uuid
        ${sourceTypeFilter}
        ${sourceIdFilter}
      ORDER BY embedding <=> ${vectorSql}::vector
      LIMIT ${limit}
    `;

    const searchResults: SemanticSearchResult[] = results.map((row) => ({
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      chunkIndex: row.chunk_index,
      text: row.chunk_text,
      metadata: row.chunk_metadata as ChunkMetadata,
      distance: row.distance,
      similarity: 1 - row.distance / 2,
    }));

    if (options?.minSimilarity && options.minSimilarity > 0) {
      return searchResults.filter(
        (r) => r.similarity >= options.minSimilarity!,
      );
    }

    return searchResults;
  }

  /**
   * Get total chunk count for an organization.
   */
  async getChunkCount(
    organizationId: string,
    sourceType?: string,
  ): Promise<number> {
    let sourceTypeFilter = Prisma.empty;
    if (sourceType) {
      sourceTypeFilter = Prisma.sql`AND source_type = ${sourceType}::"EmbeddingSourceType"`;
    }

    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM document_embeddings
      WHERE organization_id = ${organizationId}::uuid
        ${sourceTypeFilter}
    `;

    return Number(result[0]?.count ?? 0);
  }

  /**
   * Get list of embedded sources for an organization.
   */
  async getEmbeddedSources(
    organizationId: string,
    sourceType: string,
  ): Promise<Array<{ sourceId: string; chunkCount: number; createdAt: Date }>> {
    const results = await this.prisma.$queryRaw<
      Array<{ source_id: string; chunk_count: bigint; created_at: Date }>
    >`
      SELECT
        source_id::text as source_id,
        COUNT(*) as chunk_count,
        MIN(created_at) as created_at
      FROM document_embeddings
      WHERE organization_id = ${organizationId}::uuid
        AND source_type = ${sourceType}::"EmbeddingSourceType"
      GROUP BY source_id
    `;

    return results.map((r) => ({
      sourceId: r.source_id,
      chunkCount: Number(r.chunk_count),
      createdAt: r.created_at,
    }));
  }

  /**
   * Check if a source document has been embedded.
   */
  async hasEmbeddings(
    organizationId: string,
    sourceType: string,
    sourceId: string,
  ): Promise<boolean> {
    const result = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1 FROM document_embeddings
        WHERE organization_id = ${organizationId}::uuid
          AND source_type = ${sourceType}::"EmbeddingSourceType"
          AND source_id = ${sourceId}::uuid
      ) as exists
    `;

    return result[0]?.exists ?? false;
  }
}
