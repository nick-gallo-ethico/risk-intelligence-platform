-- CreateEnum
CREATE TYPE "ai_conversation_status" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "title" TEXT,
    "status" "ai_conversation_status" NOT NULL DEFAULT 'ACTIVE',
    "agent_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "paused_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "last_message_at" TIMESTAMP(3),
    "total_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_output_tokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tool_calls" JSONB,
    "tool_results" JSONB,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_conversations_organization_id_user_id_status_idx" ON "ai_conversations"("organization_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "ai_conversations_organization_id_entity_type_entity_id_idx" ON "ai_conversations"("organization_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ai_conversations_user_id_status_idx" ON "ai_conversations"("user_id", "status");

-- CreateIndex
CREATE INDEX "ai_conversations_status_last_message_at_idx" ON "ai_conversations"("status", "last_message_at");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_created_at_idx" ON "ai_messages"("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
