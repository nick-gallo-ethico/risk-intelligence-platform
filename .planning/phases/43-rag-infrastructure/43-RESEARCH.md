# Phase 43: RAG Infrastructure - Research

**Researched:** 2026-02-28
**Domain:** Vector Search, Document Embeddings, Semantic Search
**Confidence:** HIGH

## Summary

Phase 43 builds the vector search foundation for AI intelligence features. The core architecture uses pgvector with PostgreSQL for embedding storage, Voyage AI for embedding generation, and a hybrid search approach combining Elasticsearch keyword search with pgvector semantic search.

The platform already has solid foundations to build upon:

- Document processing exists (`DocumentProcessingService` handles PDF, DOCX, TXT extraction)
- Event-driven architecture is established (NestJS EventEmitter with `policy.published` events)
- Job queues are operational (BullMQ with `indexing` and `ai` queues)
- AI provider abstraction exists (`ClaudeProvider` implements `AIProvider` interface)
- Elasticsearch indexing service exists with per-tenant index naming pattern

**Critical architectural decision**: The DocumentEmbedding table MUST use explicit `WHERE organizationId = ?` clauses rather than RLS policies because pgvector similarity queries don't work reliably with RLS. This is flagged in STATE.md as CRIT-01.

**Primary recommendation:** Use pgvector 0.8+ with HNSW indexes, Voyage AI voyage-3 embeddings (1024 dimensions), RecursiveCharacterTextSplitter for chunking (400-512 tokens, 10-20% overlap), and combine with existing Elasticsearch for hybrid search.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library                  | Version | Purpose                                | Why Standard                                              |
| ------------------------ | ------- | -------------------------------------- | --------------------------------------------------------- |
| pgvector                 | 0.8+    | Vector similarity search in PostgreSQL | Native PostgreSQL extension, no separate vector DB needed |
| pgvector-node            | latest  | TypeScript pgvector utilities          | Official library, handles vector serialization            |
| voyageai                 | latest  | Embedding generation SDK               | Top-tier embeddings, TypeScript SDK, 1024 dimensions      |
| @langchain/textsplitters | latest  | Document chunking                      | RecursiveCharacterTextSplitter, battle-tested             |

### Supporting

| Library   | Version  | Purpose              | When to Use    |
| --------- | -------- | -------------------- | -------------- |
| pdf-parse | existing | PDF text extraction  | Already in use |
| mammoth   | existing | DOCX text extraction | Already in use |

### Alternatives Considered

| Instead of          | Could Use               | Tradeoff                                                                       |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| Voyage AI           | OpenAI text-embedding-3 | Voyage-3 is 7.55% better avg, 2.2x lower cost, 3x smaller dimensions           |
| Voyage AI           | Azure OpenAI embeddings | Lower quality, but Azure-native if needed                                      |
| pgvector            | Pinecone/Weaviate       | Separate vector DB adds infra complexity; pgvector is sufficient at 100K scale |
| LangChain splitters | Custom chunking         | LangChain handles edge cases, language-aware splitting                         |

**Installation:**

```bash
npm install pgvector voyageai @langchain/textsplitters
```

## Architecture Patterns

### Recommended Project Structure

```
src/modules/
├── embeddings/                    # NEW - Phase 43
│   ├── embeddings.module.ts
│   ├── services/
│   │   ├── embedding.service.ts          # Provider abstraction
│   │   ├── chunking.service.ts           # Document chunking strategies
│   │   └── vector-store.service.ts       # pgvector operations
│   ├── providers/
│   │   ├── embedding-provider.interface.ts
│   │   └── voyage.provider.ts
│   ├── listeners/
│   │   └── policy-embedding.listener.ts  # Auto-embed on publish
│   └── dto/
│       └── embedding.dto.ts
├── search/                        # EXTEND - Hybrid search
│   └── hybrid-search.service.ts          # ES keyword + pgvector semantic
```

### Pattern 1: Embedding Provider Abstraction

**What:** Abstract embedding provider interface matching existing AI provider pattern
**When to use:** All embedding operations
**Example:**

```typescript
// Source: Modeled after existing ClaudeProvider pattern
export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  readonly maxTokens: number;

  isReady(): boolean;
  embed(texts: string[], inputType?: "query" | "document"): Promise<number[][]>;
  embedSingle(
    text: string,
    inputType?: "query" | "document",
  ): Promise<number[]>;
}

@Injectable()
export class VoyageProvider implements EmbeddingProvider, OnModuleInit {
  readonly name = "voyage";
  readonly dimensions = 1024; // voyage-3 default
  readonly maxTokens = 32000;

  private client: VoyageAI | null = null;

  async embed(
    texts: string[],
    inputType?: "query" | "document",
  ): Promise<number[][]> {
    const response = await this.client.embed({
      model: "voyage-3",
      input: texts,
      inputType: inputType || null,
    });
    return response.embeddings;
  }
}
```

### Pattern 2: DocumentEmbedding Table (NO RLS)

**What:** Separate table for embeddings with explicit organizationId filtering
**When to use:** All vector operations
**Example:**

```sql
-- Migration: Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- DocumentEmbedding table - NO RLS POLICIES
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Source tracking
  source_type VARCHAR(50) NOT NULL,  -- 'policy_version', 'knowledge_base', 'case'
  source_id UUID NOT NULL,

  -- Chunk info
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_metadata JSONB DEFAULT '{}',  -- parent_id, section_title, page_num

  -- Embedding
  embedding vector(1024) NOT NULL,

  -- AI metadata
  model_version VARCHAR(50) NOT NULL,  -- 'voyage-3'
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(source_type, source_id, chunk_index)
);

-- HNSW index for cosine similarity
CREATE INDEX idx_embeddings_vector
ON document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- B-tree index for tenant filtering (CRITICAL for query perf)
CREATE INDEX idx_embeddings_org_source
ON document_embeddings (organization_id, source_type);
```

### Pattern 3: Raw SQL for Vector Queries

**What:** Use Prisma $queryRaw with pgvector-node for similarity search
**When to use:** All vector similarity operations
**Example:**

```typescript
// Source: pgvector-node docs + Prisma raw query pattern
import pgvector from 'pgvector';

async semanticSearch(
  organizationId: string,
  queryEmbedding: number[],
  sourceType?: string,
  limit = 10,
): Promise<DocumentChunk[]> {
  const vectorSql = pgvector.toSql(queryEmbedding);

  const results = await this.prisma.$queryRaw<DocumentChunk[]>`
    SELECT
      id,
      source_type,
      source_id,
      chunk_index,
      chunk_text,
      chunk_metadata,
      embedding <=> ${vectorSql}::vector AS distance
    FROM document_embeddings
    WHERE organization_id = ${organizationId}::uuid
      ${sourceType ? Prisma.sql`AND source_type = ${sourceType}` : Prisma.empty}
    ORDER BY embedding <=> ${vectorSql}::vector
    LIMIT ${limit}
  `;

  return results;
}
```

### Pattern 4: Section-Based Chunking for Policies

**What:** Chunk policy documents by section structure, not arbitrary character limits
**When to use:** Policy documents with clear section headers
**Example:**

```typescript
// Source: RAG best practices 2026
interface PolicyChunk {
  chunkIndex: number;
  text: string;
  metadata: {
    sectionTitle: string;
    parentPolicyId: string;
    policyVersionId: string;
  };
}

async chunkPolicyBySection(content: string, policyVersionId: string): Promise<PolicyChunk[]> {
  // Split by headers (##, ###, <h2>, etc.)
  const sections = this.splitBySections(content);

  const chunks: PolicyChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    // If section exceeds max chunk size, use RecursiveCharacterTextSplitter
    if (this.estimateTokens(section.text) > 512) {
      const subChunks = await this.splitter.splitText(section.text);
      for (const subChunk of subChunks) {
        chunks.push({
          chunkIndex: chunkIndex++,
          text: subChunk,
          metadata: {
            sectionTitle: section.title,
            parentPolicyId: section.policyId,
            policyVersionId,
          },
        });
      }
    } else {
      chunks.push({
        chunkIndex: chunkIndex++,
        text: section.text,
        metadata: {
          sectionTitle: section.title,
          parentPolicyId: section.policyId,
          policyVersionId,
        },
      });
    }
  }

  return chunks;
}
```

### Pattern 5: Hybrid Search (ES + pgvector)

**What:** Combine Elasticsearch keyword search with pgvector semantic search using RRF
**When to use:** User-facing search where both exact matches and semantic similarity matter
**Example:**

```typescript
// Source: Severalnines hybrid search pattern
interface HybridSearchResult {
  id: string;
  sourceType: string;
  sourceId: string;
  text: string;
  score: number;
  method: 'keyword' | 'semantic' | 'both';
}

async hybridSearch(
  organizationId: string,
  query: string,
  options: { limit?: number; sourceTypes?: string[] },
): Promise<HybridSearchResult[]> {
  // 1. Get query embedding
  const queryEmbedding = await this.embeddingProvider.embedSingle(query, 'query');

  // 2. Run keyword search (Elasticsearch)
  const keywordResults = await this.elasticSearch(organizationId, query, options);

  // 3. Run semantic search (pgvector)
  const semanticResults = await this.semanticSearch(
    organizationId,
    queryEmbedding,
    options.sourceTypes,
    options.limit * 2,  // Fetch more for fusion
  );

  // 4. Reciprocal Rank Fusion (RRF)
  return this.reciprocalRankFusion(keywordResults, semanticResults, options.limit);
}

private reciprocalRankFusion(
  keywordResults: SearchResult[],
  semanticResults: SearchResult[],
  limit: number,
  k = 60,  // RRF constant
): HybridSearchResult[] {
  const scores = new Map<string, { score: number; methods: Set<string>; result: SearchResult }>();

  // Score keyword results
  keywordResults.forEach((result, rank) => {
    const id = `${result.sourceType}:${result.sourceId}`;
    const existing = scores.get(id) || { score: 0, methods: new Set(), result };
    existing.score += 1 / (k + rank + 1);
    existing.methods.add('keyword');
    scores.set(id, existing);
  });

  // Score semantic results
  semanticResults.forEach((result, rank) => {
    const id = `${result.sourceType}:${result.sourceId}`;
    const existing = scores.get(id) || { score: 0, methods: new Set(), result };
    existing.score += 1 / (k + rank + 1);
    existing.methods.add('semantic');
    scores.set(id, existing);
  });

  // Sort by fused score and return top results
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, methods, result }) => ({
      ...result,
      score,
      method: methods.size === 2 ? 'both' : (methods.has('keyword') ? 'keyword' : 'semantic'),
    }));
}
```

### Anti-Patterns to Avoid

- **Using RLS on DocumentEmbedding table:** pgvector similarity queries don't work reliably with RLS. Use explicit WHERE clauses.
- **Storing embeddings in main entity tables:** Adds 4KB+ per row, slows down normal queries. Use separate table.
- **Fixed-size character chunking:** Loses context at chunk boundaries. Use semantic/section-based chunking.
- **Single embedding per document:** Large documents need chunking. 32K tokens is the limit, but 400-512 is optimal for retrieval.
- **Re-indexing on model change:** Store model_version in metadata; provider abstraction enables graceful migration.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                  | Don't Build             | Use Instead                        | Why                                                           |
| ------------------------ | ----------------------- | ---------------------------------- | ------------------------------------------------------------- |
| Document chunking        | Custom regex splitter   | RecursiveCharacterTextSplitter     | Handles language-specific boundaries, paragraph breaks, lists |
| Vector serialization     | Manual array formatting | pgvector-node toSql/fromSql        | Handles PostgreSQL vector format correctly                    |
| Text extraction from PDF | PDF parsing library     | Existing DocumentProcessingService | Already built and tested                                      |
| Embedding batching       | Manual batch loops      | Voyage AI batch API                | Built-in batching with rate limit handling                    |
| Hybrid search fusion     | Custom scoring          | Reciprocal Rank Fusion algorithm   | Well-studied algorithm with proven results                    |

**Key insight:** Chunking strategies look simple but affect retrieval quality significantly. A January 2026 systematic analysis found that sentence chunking matched semantic chunking up to ~5,000 tokens at a fraction of the cost. Start with RecursiveCharacterTextSplitter at 400-512 tokens.

## Common Pitfalls

### Pitfall 1: RLS on Vector Tables

**What goes wrong:** Vector similarity queries with `ORDER BY embedding <=> query_vector LIMIT n` may not apply RLS correctly, returning wrong-tenant results or errors.
**Why it happens:** pgvector's index scans happen before RLS policies are evaluated, causing unpredictable behavior.
**How to avoid:** Use explicit `WHERE organization_id = $1` in all vector queries. Do NOT create RLS policies on DocumentEmbedding table.
**Warning signs:** Queries returning fewer results than expected, or performance degradation.

### Pitfall 2: Cold Index Memory

**What goes wrong:** First queries after deploy are slow (seconds instead of milliseconds).
**Why it happens:** HNSW index must be loaded into shared_buffers; first query pays cold-cache penalty.
**How to avoid:** After deploys/failovers, warm indexes with `pg_prewarm` or run a few dummy queries before serving traffic.
**Warning signs:** P99 latency spikes after deployments.

### Pitfall 3: Index Build OOM

**What goes wrong:** Index creation fails or times out on large datasets.
**Why it happens:** HNSW builds require entire graph in maintenance_work_mem; default is often too low.
**How to avoid:** Set `maintenance_work_mem` to at least 1GB for datasets over 100K embeddings. Create indexes CONCURRENTLY to avoid blocking writes.
**Warning signs:** Index creation taking hours, or connection timeouts.

### Pitfall 4: Chunk Overlap Overhead

**What goes wrong:** Storage doubles and indexing is 2x slower, with no retrieval improvement.
**Why it happens:** Default 20% overlap added everywhere without testing.
**How to avoid:** Start with 10% overlap (50 tokens for 500-token chunks). Test retrieval quality. January 2026 research shows overlap provides no measurable benefit in some scenarios.
**Warning signs:** Storage growing faster than expected, no improvement in hit@k metrics.

### Pitfall 5: Embedding Dimension Mismatch

**What goes wrong:** INSERT fails with vector dimension error.
**Why it happens:** Switched embedding models without updating table schema (e.g., OpenAI 3072 dims vs Voyage 1024 dims).
**How to avoid:** Store model_version in metadata. When changing models, either migrate data or use separate columns. Provider abstraction in code, but dimension is schema-level.
**Warning signs:** Insert errors mentioning "dimension mismatch."

## Code Examples

Verified patterns from official sources:

### Enable pgvector Extension

```sql
-- Source: pgvector GitHub README
CREATE EXTENSION IF NOT EXISTS vector;
```

### HNSW Index with Tuning

```sql
-- Source: Crunchy Data HNSW guide + pgvector docs
-- For production with ~100K embeddings
SET maintenance_work_mem = '1GB';

CREATE INDEX CONCURRENTLY idx_embeddings_hnsw
ON document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Query-time tuning (session level)
SET hnsw.ef_search = 100;  -- Higher = better recall, slower
```

### Voyage AI Embedding Call

```typescript
// Source: Voyage AI API reference
import VoyageAI from "voyageai";

const client = new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY });

// Batch embedding (up to 128 texts)
const response = await client.embed({
  model: "voyage-3",
  input: ["Document chunk 1", "Document chunk 2"],
  inputType: "document", // or 'query' for search queries
});

// response.embeddings is number[][]
```

### Policy Auto-Embed Listener

```typescript
// Source: Existing pattern from PolicySearchIndexListener
@Injectable()
export class PolicyEmbeddingListener {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly chunkingService: ChunkingService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  @OnEvent("policy.published", { async: true })
  async onPolicyPublished(event: PolicyPublishedEvent): Promise<void> {
    try {
      // 1. Load policy version content
      const policyVersion = await this.loadPolicyVersion(event.policyVersionId);

      // 2. Chunk by sections
      const chunks = await this.chunkingService.chunkPolicyBySection(
        policyVersion.content,
        event.policyVersionId,
      );

      // 3. Generate embeddings
      const embeddings = await this.embeddingService.embedBatch(
        chunks.map((c) => c.text),
        "document",
      );

      // 4. Store in vector store
      await this.vectorStore.upsertChunks(
        event.organizationId,
        "policy_version",
        event.policyVersionId,
        chunks.map((chunk, i) => ({
          ...chunk,
          embedding: embeddings[i],
        })),
      );

      this.logger.log(
        `Embedded ${chunks.length} chunks for policy ${event.policyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to embed policy ${event.policyId}: ${error.message}`,
      );
    }
  }
}
```

## State of the Art

| Old Approach        | Current Approach             | When Changed         | Impact                                          |
| ------------------- | ---------------------------- | -------------------- | ----------------------------------------------- |
| IVFFlat indexes     | HNSW indexes                 | pgvector 0.5+ (2023) | Better recall, faster queries at scale          |
| OpenAI ada-002      | Voyage-3 or text-embedding-3 | 2024-2025            | Better quality, lower dimensions                |
| Fixed-size chunking | Semantic/section-based       | 2024-2025            | Better context preservation                     |
| Separate vector DB  | pgvector in PostgreSQL       | 2024-2025            | Simpler architecture, sufficient at <1M vectors |
| Keyword-only search | Hybrid (keyword + semantic)  | 2024+                | Best of both worlds via RRF                     |

**Deprecated/outdated:**

- IVFFlat indexes: Still work but HNSW is better for most use cases. Use HNSW.
- OpenAI text-embedding-ada-002: Superseded by text-embedding-3 family. Don't use for new projects.
- pgvector < 0.5: Missing HNSW support. Ensure 0.8+.

## Open Questions

Things that couldn't be fully resolved:

1. **Voyage AI rate limits**
   - What we know: Batch API supports 128 texts per request, 12h completion window
   - What's unclear: Exact requests/minute limits for real-time embed calls
   - Recommendation: Implement exponential backoff; test in dev environment to determine practical limits

2. **HNSW optimal parameters for 100K+ embeddings**
   - What we know: m=16, ef_construction=64 is a reasonable starting point
   - What's unclear: Optimal tuning for this specific dataset (policies, knowledge base docs)
   - Recommendation: Start conservative, benchmark with real data, tune based on recall@10 metrics

3. **Chunk metadata for parent document retrieval**
   - What we know: Parent-child retrieval pattern improves context
   - What's unclear: Whether to retrieve parent chunk or full document on match
   - Recommendation: Store parent_policy_id in metadata; implement configurable retrieval depth

## Sources

### Primary (HIGH confidence)

- [pgvector GitHub](https://github.com/pgvector/pgvector) - Extension syntax, HNSW parameters, distance operators
- [pgvector-node GitHub](https://github.com/pgvector/pgvector-node) - TypeScript integration, Prisma patterns
- [Voyage AI API Reference](https://docs.voyageai.com/reference/embeddings-api) - Embedding API, models, dimensions
- [Crunchy Data HNSW Guide](https://www.crunchydata.com/blog/hnsw-indexes-with-postgres-and-pgvector) - Index tuning, production deployment

### Secondary (MEDIUM confidence)

- [Supabase RAG with Permissions](https://supabase.com/docs/guides/ai/rag-with-permissions) - Multi-tenant vector search patterns
- [Severalnines Hybrid Search](https://severalnines.com/blog/beyond-semantics-enhancing-retrieval-augmented-generation-with-hybrid-search-pgvector-elasticsearch/) - ES + pgvector combination
- [Firecrawl Chunking Strategies 2026](https://www.firecrawl.dev/blog/best-chunking-strategies-rag) - Current best practices
- [LangChain RecursiveCharacterTextSplitter](https://v03.api.js.langchain.com/classes/langchain.text_splitter.RecursiveCharacterTextSplitter.html) - Splitter API

### Tertiary (LOW confidence)

- Medium articles on chunk overlap findings - Needs validation with our dataset
- NestJS AI provider abstraction blog post - Pattern validated against existing ClaudeProvider

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - pgvector and Voyage AI are well-documented, actively maintained
- Architecture: HIGH - Patterns match existing codebase (event listeners, provider abstraction)
- Pitfalls: HIGH - RLS issue confirmed in multiple sources; HNSW tuning from official pgvector docs
- Chunking strategies: MEDIUM - Best practices vary by use case; will need testing

**Research date:** 2026-02-28
**Valid until:** 2026-03-31 (30 days - stable domain, but embedding models evolving)

---

## Codebase Integration Points

**Existing services to extend:**

- `DocumentProcessingService` - Already handles PDF/DOCX text extraction
- `IndexingService` - Pattern for async indexing via BullMQ
- `PolicySearchIndexListener` - Pattern for event-driven indexing
- `ClaudeProvider` - Pattern for provider abstraction

**New modules to create:**

- `EmbeddingsModule` with VoyageProvider, ChunkingService, VectorStoreService
- Extend `SearchModule` with HybridSearchService

**Database changes:**

- Enable pgvector extension
- Create DocumentEmbedding table (NO RLS)
- Create HNSW index

**Configuration:**

- Add `VOYAGE_API_KEY` to environment
- Add HNSW tuning parameters to config
