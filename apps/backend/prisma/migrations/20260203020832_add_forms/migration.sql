-- CreateEnum
CREATE TYPE "form_type" AS ENUM ('INTAKE', 'DISCLOSURE', 'ATTESTATION', 'SURVEY', 'WORKFLOW_TASK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "form_submission_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PROCESSED');

-- CreateTable
CREATE TABLE "form_definitions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "form_type" "form_type" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "schema" JSONB NOT NULL,
    "ui_schema" JSONB,
    "default_values" JSONB,
    "allow_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "notify_on_submit" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_id" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "form_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "form_definition_id" TEXT NOT NULL,
    "form_definition_version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "status" "form_submission_status" NOT NULL DEFAULT 'SUBMITTED',
    "validation_errors" JSONB,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "submitted_by_id" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitter_ip" TEXT,
    "submitter_agent" TEXT,
    "anonymous_access_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_definitions_organization_id_idx" ON "form_definitions"("organization_id");

-- CreateIndex
CREATE INDEX "form_definitions_organization_id_form_type_idx" ON "form_definitions"("organization_id", "form_type");

-- CreateIndex
CREATE INDEX "form_definitions_organization_id_is_active_idx" ON "form_definitions"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "form_definitions_organization_id_name_version_key" ON "form_definitions"("organization_id", "name", "version");

-- CreateIndex
CREATE INDEX "form_submissions_organization_id_idx" ON "form_submissions"("organization_id");

-- CreateIndex
CREATE INDEX "form_submissions_organization_id_form_definition_id_idx" ON "form_submissions"("organization_id", "form_definition_id");

-- CreateIndex
CREATE INDEX "form_submissions_organization_id_entity_type_entity_id_idx" ON "form_submissions"("organization_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "form_submissions_anonymous_access_code_idx" ON "form_submissions"("anonymous_access_code");

-- AddForeignKey
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_definition_id_fkey" FOREIGN KEY ("form_definition_id") REFERENCES "form_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
