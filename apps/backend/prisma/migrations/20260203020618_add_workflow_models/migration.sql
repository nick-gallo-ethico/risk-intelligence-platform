-- CreateEnum
CREATE TYPE "category_module" AS ENUM ('CASE', 'DISCLOSURE', 'POLICY', 'ALL');

-- CreateEnum
CREATE TYPE "riu_type" AS ENUM ('HOTLINE_REPORT', 'WEB_FORM_SUBMISSION', 'DISCLOSURE_RESPONSE', 'ATTESTATION_RESPONSE', 'CHATBOT_TRANSCRIPT', 'INCIDENT_FORM', 'PROXY_REPORT', 'SURVEY_RESPONSE');

-- CreateEnum
CREATE TYPE "riu_source_channel" AS ENUM ('PHONE', 'WEB_FORM', 'CHATBOT', 'EMAIL', 'PROXY', 'DIRECT_ENTRY', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "riu_reporter_type" AS ENUM ('ANONYMOUS', 'CONFIDENTIAL', 'IDENTIFIED');

-- CreateEnum
CREATE TYPE "riu_status" AS ENUM ('PENDING_QA', 'IN_QA', 'RELEASED', 'RECEIVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "riu_association_type" AS ENUM ('PRIMARY', 'RELATED', 'MERGED_FROM');

-- CreateEnum
CREATE TYPE "subject_role" AS ENUM ('REPORTER', 'ACCUSED', 'WITNESS', 'VICTIM', 'OTHER');

-- CreateEnum
CREATE TYPE "message_direction" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "message_sender_type" AS ENUM ('REPORTER', 'INVESTIGATOR', 'SYSTEM');

-- CreateEnum
CREATE TYPE "message_delivery_status" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "interaction_type" AS ENUM ('STATUS_CHECK', 'ADDITIONAL_INFO', 'FOLLOW_UP_QUESTION', 'INTERVIEW', 'CALLBACK');

-- CreateEnum
CREATE TYPE "interaction_channel" AS ENUM ('PHONE', 'EMAIL', 'PORTAL', 'IN_PERSON', 'VIDEO');

-- CreateEnum
CREATE TYPE "interaction_qa_status" AS ENUM ('PENDING', 'APPROVED', 'NEEDS_REVISION', 'RELEASED');

-- CreateEnum
CREATE TYPE "workflow_entity_type" AS ENUM ('CASE', 'INVESTIGATION', 'DISCLOSURE', 'POLICY', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "workflow_instance_status" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'PAUSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_entity_type" ADD VALUE 'RIU';
ALTER TYPE "audit_entity_type" ADD VALUE 'ATTACHMENT';
ALTER TYPE "audit_entity_type" ADD VALUE 'SUBJECT';
ALTER TYPE "audit_entity_type" ADD VALUE 'CASE_MESSAGE';
ALTER TYPE "audit_entity_type" ADD VALUE 'INTERACTION';

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "parent_category_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT,
    "module" "category_module" NOT NULL,
    "concept_key" TEXT,
    "severity_default" "severity",
    "requires_investigation" BOOLEAN NOT NULL DEFAULT true,
    "escalation_required" BOOLEAN NOT NULL DEFAULT false,
    "sla_days" INTEGER,
    "default_assignee_id" TEXT,
    "routing_rules" JSONB,
    "module_config" JSONB,
    "icon" TEXT,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_intelligence_units" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "type" "riu_type" NOT NULL,
    "source_channel" "riu_source_channel" NOT NULL,
    "details" TEXT NOT NULL,
    "summary" TEXT,
    "reporter_type" "riu_reporter_type" NOT NULL,
    "anonymous_access_code" TEXT,
    "reporter_name" TEXT,
    "reporter_email" TEXT,
    "reporter_phone" TEXT,
    "category_id" TEXT,
    "severity" "severity" NOT NULL DEFAULT 'MEDIUM',
    "status" "riu_status" NOT NULL DEFAULT 'PENDING_QA',
    "location_name" TEXT,
    "location_address" TEXT,
    "location_city" TEXT,
    "location_state" TEXT,
    "location_zip" TEXT,
    "location_country" TEXT,
    "ai_summary" TEXT,
    "ai_risk_score" DECIMAL(3,2),
    "ai_translation" TEXT,
    "ai_language_detected" TEXT,
    "ai_model_version" TEXT,
    "ai_generated_at" TIMESTAMP(3),
    "ai_confidence_score" INTEGER,
    "campaign_id" TEXT,
    "campaign_assignment_id" TEXT,
    "custom_fields" JSONB,
    "form_responses" JSONB,
    "source_system" TEXT,
    "source_record_id" TEXT,
    "migrated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "risk_intelligence_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riu_case_associations" (
    "id" TEXT NOT NULL,
    "riu_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "association_type" "riu_association_type" NOT NULL DEFAULT 'PRIMARY',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "riu_case_associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "external_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "role" "subject_role" NOT NULL,
    "relationship" TEXT,
    "department" TEXT,
    "location" TEXT,
    "job_title" TEXT,
    "manager_name" TEXT,
    "hris_snapshot" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_messages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "direction" "message_direction" NOT NULL,
    "sender_type" "message_sender_type" NOT NULL,
    "content" TEXT NOT NULL,
    "subject" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "read_by_id" TEXT,
    "delivery_status" "message_delivery_status",
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT,

    CONSTRAINT "case_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "riu_id" TEXT,
    "interaction_type" "interaction_type" NOT NULL,
    "channel" "interaction_channel" NOT NULL,
    "summary" TEXT NOT NULL,
    "notes" TEXT,
    "addendum" TEXT,
    "new_info_added" BOOLEAN NOT NULL DEFAULT false,
    "fields_updated" JSONB,
    "additional_details" TEXT,
    "qa_required" BOOLEAN NOT NULL DEFAULT false,
    "qa_status" "interaction_qa_status",
    "qa_reviewed_by_id" TEXT,
    "qa_reviewed_at" TIMESTAMP(3),
    "conducted_by_id" TEXT NOT NULL,
    "conducted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entity_type" "workflow_entity_type" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "stages" JSONB NOT NULL,
    "transitions" JSONB NOT NULL,
    "initial_stage" TEXT NOT NULL,
    "default_sla_days" INTEGER,
    "sla_config" JSONB,
    "source_template_id" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "template_version" INTEGER NOT NULL,
    "entity_type" "workflow_entity_type" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "current_stage" TEXT NOT NULL,
    "current_step" TEXT,
    "status" "workflow_instance_status" NOT NULL DEFAULT 'ACTIVE',
    "step_states" JSONB NOT NULL DEFAULT '{}',
    "due_date" TIMESTAMP(3),
    "sla_status" "sla_status" NOT NULL DEFAULT 'ON_TRACK',
    "sla_breached_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "outcome" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_by_id" TEXT,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_organization_id_idx" ON "categories"("organization_id");

-- CreateIndex
CREATE INDEX "categories_organization_id_module_idx" ON "categories"("organization_id", "module");

-- CreateIndex
CREATE INDEX "categories_organization_id_parent_category_id_idx" ON "categories"("organization_id", "parent_category_id");

-- CreateIndex
CREATE INDEX "categories_organization_id_concept_key_idx" ON "categories"("organization_id", "concept_key");

-- CreateIndex
CREATE INDEX "categories_organization_id_is_active_idx" ON "categories"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "categories_organization_id_module_code_key" ON "categories"("organization_id", "module", "code");

-- CreateIndex
CREATE UNIQUE INDEX "risk_intelligence_units_reference_number_key" ON "risk_intelligence_units"("reference_number");

-- CreateIndex
CREATE INDEX "risk_intelligence_units_organization_id_idx" ON "risk_intelligence_units"("organization_id");

-- CreateIndex
CREATE INDEX "risk_intelligence_units_organization_id_type_idx" ON "risk_intelligence_units"("organization_id", "type");

-- CreateIndex
CREATE INDEX "risk_intelligence_units_organization_id_status_idx" ON "risk_intelligence_units"("organization_id", "status");

-- CreateIndex
CREATE INDEX "risk_intelligence_units_organization_id_source_channel_idx" ON "risk_intelligence_units"("organization_id", "source_channel");

-- CreateIndex
CREATE INDEX "risk_intelligence_units_organization_id_created_at_idx" ON "risk_intelligence_units"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "risk_intelligence_units_organization_id_category_id_idx" ON "risk_intelligence_units"("organization_id", "category_id");

-- CreateIndex
CREATE INDEX "risk_intelligence_units_organization_id_severity_idx" ON "risk_intelligence_units"("organization_id", "severity");

-- CreateIndex
CREATE INDEX "risk_intelligence_units_anonymous_access_code_idx" ON "risk_intelligence_units"("anonymous_access_code");

-- CreateIndex
CREATE INDEX "riu_case_associations_riu_id_idx" ON "riu_case_associations"("riu_id");

-- CreateIndex
CREATE INDEX "riu_case_associations_case_id_idx" ON "riu_case_associations"("case_id");

-- CreateIndex
CREATE INDEX "riu_case_associations_association_type_idx" ON "riu_case_associations"("association_type");

-- CreateIndex
CREATE UNIQUE INDEX "riu_case_associations_riu_id_case_id_key" ON "riu_case_associations"("riu_id", "case_id");

-- CreateIndex
CREATE INDEX "subjects_organization_id_idx" ON "subjects"("organization_id");

-- CreateIndex
CREATE INDEX "subjects_organization_id_case_id_idx" ON "subjects"("organization_id", "case_id");

-- CreateIndex
CREATE INDEX "subjects_organization_id_employee_id_idx" ON "subjects"("organization_id", "employee_id");

-- CreateIndex
CREATE INDEX "subjects_organization_id_role_idx" ON "subjects"("organization_id", "role");

-- CreateIndex
CREATE INDEX "case_messages_organization_id_idx" ON "case_messages"("organization_id");

-- CreateIndex
CREATE INDEX "case_messages_organization_id_case_id_idx" ON "case_messages"("organization_id", "case_id");

-- CreateIndex
CREATE INDEX "case_messages_organization_id_case_id_created_at_idx" ON "case_messages"("organization_id", "case_id", "created_at");

-- CreateIndex
CREATE INDEX "case_messages_organization_id_is_read_idx" ON "case_messages"("organization_id", "is_read");

-- CreateIndex
CREATE INDEX "interactions_organization_id_idx" ON "interactions"("organization_id");

-- CreateIndex
CREATE INDEX "interactions_organization_id_case_id_idx" ON "interactions"("organization_id", "case_id");

-- CreateIndex
CREATE INDEX "interactions_organization_id_case_id_conducted_at_idx" ON "interactions"("organization_id", "case_id", "conducted_at");

-- CreateIndex
CREATE INDEX "interactions_organization_id_interaction_type_idx" ON "interactions"("organization_id", "interaction_type");

-- CreateIndex
CREATE INDEX "workflow_templates_organization_id_idx" ON "workflow_templates"("organization_id");

-- CreateIndex
CREATE INDEX "workflow_templates_organization_id_entity_type_idx" ON "workflow_templates"("organization_id", "entity_type");

-- CreateIndex
CREATE INDEX "workflow_templates_organization_id_is_active_idx" ON "workflow_templates"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_templates_organization_id_name_version_key" ON "workflow_templates"("organization_id", "name", "version");

-- CreateIndex
CREATE INDEX "workflow_instances_organization_id_idx" ON "workflow_instances"("organization_id");

-- CreateIndex
CREATE INDEX "workflow_instances_organization_id_entity_type_idx" ON "workflow_instances"("organization_id", "entity_type");

-- CreateIndex
CREATE INDEX "workflow_instances_organization_id_status_idx" ON "workflow_instances"("organization_id", "status");

-- CreateIndex
CREATE INDEX "workflow_instances_organization_id_current_stage_idx" ON "workflow_instances"("organization_id", "current_stage");

-- CreateIndex
CREATE INDEX "workflow_instances_organization_id_sla_status_idx" ON "workflow_instances"("organization_id", "sla_status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_instances_entity_type_entity_id_key" ON "workflow_instances"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_primary_category_id_fkey" FOREIGN KEY ("primary_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_secondary_category_id_fkey" FOREIGN KEY ("secondary_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_intelligence_units" ADD CONSTRAINT "risk_intelligence_units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_intelligence_units" ADD CONSTRAINT "risk_intelligence_units_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_intelligence_units" ADD CONSTRAINT "risk_intelligence_units_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riu_case_associations" ADD CONSTRAINT "riu_case_associations_riu_id_fkey" FOREIGN KEY ("riu_id") REFERENCES "risk_intelligence_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riu_case_associations" ADD CONSTRAINT "riu_case_associations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riu_case_associations" ADD CONSTRAINT "riu_case_associations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_messages" ADD CONSTRAINT "case_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_messages" ADD CONSTRAINT "case_messages_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_messages" ADD CONSTRAINT "case_messages_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_messages" ADD CONSTRAINT "case_messages_read_by_id_fkey" FOREIGN KEY ("read_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_riu_id_fkey" FOREIGN KEY ("riu_id") REFERENCES "risk_intelligence_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_conducted_by_id_fkey" FOREIGN KEY ("conducted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_qa_reviewed_by_id_fkey" FOREIGN KEY ("qa_reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
