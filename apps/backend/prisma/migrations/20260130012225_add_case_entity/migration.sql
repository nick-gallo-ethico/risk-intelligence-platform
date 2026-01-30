-- CreateEnum
CREATE TYPE "case_status" AS ENUM ('NEW', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "source_channel" AS ENUM ('HOTLINE', 'WEB_FORM', 'PROXY', 'DIRECT_ENTRY', 'CHATBOT');

-- CreateEnum
CREATE TYPE "case_type" AS ENUM ('REPORT', 'RFI');

-- CreateEnum
CREATE TYPE "reporter_type" AS ENUM ('ANONYMOUS', 'IDENTIFIED', 'PROXY');

-- CreateEnum
CREATE TYPE "reporter_relationship" AS ENUM ('EMPLOYEE', 'FORMER_EMPLOYEE', 'VENDOR', 'CONTRACTOR', 'CUSTOMER', 'WITNESS', 'OTHER');

-- CreateEnum
CREATE TYPE "severity" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "case_status" NOT NULL DEFAULT 'NEW',
    "status_rationale" TEXT,
    "source_channel" "source_channel" NOT NULL,
    "case_type" "case_type" NOT NULL DEFAULT 'REPORT',
    "intake_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intake_operator_id" TEXT,
    "first_time_caller" BOOLEAN,
    "awareness_source" TEXT,
    "interpreter_used" BOOLEAN,
    "reporter_type" "reporter_type" NOT NULL DEFAULT 'ANONYMOUS',
    "reporter_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "reporter_name" TEXT,
    "reporter_email" TEXT,
    "reporter_phone" TEXT,
    "reporter_relationship" "reporter_relationship",
    "anonymous_access_code" TEXT,
    "proxy_submitter_id" TEXT,
    "location_name" TEXT,
    "location_address" TEXT,
    "location_city" TEXT,
    "location_state" TEXT,
    "location_zip" TEXT,
    "location_country" TEXT,
    "location_manual" BOOLEAN,
    "details" TEXT NOT NULL,
    "summary" TEXT,
    "addendum" TEXT,
    "original_language" TEXT,
    "translated_details" TEXT,
    "translation_language" TEXT,
    "primary_category_id" TEXT,
    "secondary_category_id" TEXT,
    "severity" "severity" NOT NULL DEFAULT 'MEDIUM',
    "severity_reason" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ai_summary" TEXT,
    "ai_summary_generated_at" TIMESTAMP(3),
    "ai_model_version" TEXT,
    "ai_category_suggestion" TEXT,
    "ai_severity_suggestion" "severity",
    "ai_confidence_score" INTEGER,
    "custom_fields" JSONB,
    "custom_questions" JSONB,
    "source_system" TEXT,
    "source_record_id" TEXT,
    "migrated_at" TIMESTAMP(3),
    "parent_case_id" TEXT,
    "is_split" BOOLEAN NOT NULL DEFAULT false,
    "released_at" TIMESTAMP(3),
    "released_by_id" TEXT,
    "qa_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cases_reference_number_key" ON "cases"("reference_number");

-- CreateIndex
CREATE INDEX "cases_organization_id_idx" ON "cases"("organization_id");

-- CreateIndex
CREATE INDEX "cases_organization_id_status_idx" ON "cases"("organization_id", "status");

-- CreateIndex
CREATE INDEX "cases_organization_id_created_at_idx" ON "cases"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "cases_organization_id_severity_idx" ON "cases"("organization_id", "severity");

-- CreateIndex
CREATE INDEX "cases_reference_number_idx" ON "cases"("reference_number");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_intake_operator_id_fkey" FOREIGN KEY ("intake_operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_released_by_id_fkey" FOREIGN KEY ("released_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_proxy_submitter_id_fkey" FOREIGN KEY ("proxy_submitter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_parent_case_id_fkey" FOREIGN KEY ("parent_case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
