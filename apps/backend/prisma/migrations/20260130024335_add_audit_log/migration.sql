-- CreateEnum
CREATE TYPE "audit_entity_type" AS ENUM ('CASE', 'INVESTIGATION', 'DISCLOSURE', 'POLICY', 'ATTESTATION', 'WORKFLOW', 'USER', 'EMPLOYEE', 'ORGANIZATION', 'CATEGORY', 'FORM', 'CHATBOT_CONVERSATION', 'REPORT', 'DASHBOARD', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "audit_action_category" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ACCESS', 'SYSTEM', 'SECURITY', 'AI');

-- CreateEnum
CREATE TYPE "actor_type" AS ENUM ('USER', 'SYSTEM', 'AI', 'INTEGRATION', 'ANONYMOUS');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" "audit_entity_type" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "action_category" "audit_action_category" NOT NULL,
    "action_description" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_type" "actor_type" NOT NULL,
    "actor_name" TEXT,
    "changes" JSONB,
    "context" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_entity_type_entity_id_created_at_idx" ON "audit_logs"("organization_id", "entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_actor_user_id_created_at_idx" ON "audit_logs"("organization_id", "actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_action_category_created_at_idx" ON "audit_logs"("organization_id", "action_category", "created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
