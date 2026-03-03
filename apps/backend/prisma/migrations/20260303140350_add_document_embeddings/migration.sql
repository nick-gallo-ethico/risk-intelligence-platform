-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "EmbeddingSourceType" AS ENUM ('POLICY_VERSION', 'KNOWLEDGE_BASE', 'CASE', 'INVESTIGATION');

-- CreateTable
-- Note: organization_id and source_id use TEXT to match existing Prisma schema patterns
CREATE TABLE "document_embeddings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "organization_id" TEXT NOT NULL,
    "source_type" "EmbeddingSourceType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "chunk_text" TEXT NOT NULL,
    "chunk_metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(1024) NOT NULL,
    "model_version" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "document_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on source chunk
CREATE UNIQUE INDEX "document_embeddings_source_type_source_id_chunk_index_key"
ON "document_embeddings"("source_type", "source_id", "chunk_index");

-- CreateIndex: B-tree for tenant filtering (CRITICAL for query performance)
CREATE INDEX "document_embeddings_organization_id_source_type_idx"
ON "document_embeddings"("organization_id", "source_type");

-- CreateIndex: HNSW for vector similarity search
-- Parameters: m=16 (graph degree), ef_construction=64 (build quality)
CREATE INDEX "document_embeddings_embedding_idx"
ON "document_embeddings"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add foreign key constraint
ALTER TABLE "document_embeddings"
ADD CONSTRAINT "document_embeddings_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NOTE: NO RLS POLICIES - this is intentional per CRIT-01
-- All vector queries MUST include explicit WHERE organization_id = $1 clause
