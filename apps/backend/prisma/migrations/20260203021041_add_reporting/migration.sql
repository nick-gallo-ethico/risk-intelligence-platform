-- CreateEnum
CREATE TYPE "report_data_source" AS ENUM ('CASES', 'RIUS', 'INVESTIGATIONS', 'DISCLOSURES', 'POLICIES', 'AUDIT_LOGS', 'USERS', 'CAMPAIGNS');

-- CreateEnum
CREATE TYPE "report_execution_status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "data_source" "report_data_source" NOT NULL,
    "columns" JSONB NOT NULL,
    "filters" JSONB,
    "aggregations" JSONB,
    "sort_by" TEXT,
    "sort_order" TEXT,
    "chart_type" TEXT,
    "chart_config" JSONB,
    "allowed_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_executions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "status" "report_execution_status" NOT NULL DEFAULT 'PENDING',
    "filters" JSONB,
    "parameters" JSONB,
    "row_count" INTEGER,
    "file_key" TEXT,
    "file_url" TEXT,
    "expires_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requested_by_id" TEXT NOT NULL,

    CONSTRAINT "report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_templates_organization_id_idx" ON "report_templates"("organization_id");

-- CreateIndex
CREATE INDEX "report_templates_data_source_idx" ON "report_templates"("data_source");

-- CreateIndex
CREATE INDEX "report_templates_is_system_idx" ON "report_templates"("is_system");

-- CreateIndex
CREATE INDEX "report_executions_organization_id_idx" ON "report_executions"("organization_id");

-- CreateIndex
CREATE INDEX "report_executions_organization_id_status_idx" ON "report_executions"("organization_id", "status");

-- CreateIndex
CREATE INDEX "report_executions_template_id_idx" ON "report_executions"("template_id");

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "report_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
