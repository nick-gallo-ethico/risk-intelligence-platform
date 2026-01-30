-- CreateEnum
CREATE TYPE "investigation_status" AS ENUM ('NEW', 'ASSIGNED', 'INVESTIGATING', 'PENDING_REVIEW', 'CLOSED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "investigation_type" AS ENUM ('FULL', 'LIMITED', 'INQUIRY');

-- CreateEnum
CREATE TYPE "investigation_department" AS ENUM ('HR', 'LEGAL', 'SAFETY', 'COMPLIANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "investigation_outcome" AS ENUM ('SUBSTANTIATED', 'UNSUBSTANTIATED', 'INCONCLUSIVE', 'POLICY_VIOLATION', 'NO_VIOLATION', 'INSUFFICIENT_EVIDENCE');

-- CreateEnum
CREATE TYPE "sla_status" AS ENUM ('ON_TRACK', 'WARNING', 'OVERDUE');

-- CreateTable
CREATE TABLE "investigations" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "investigation_number" INTEGER NOT NULL,
    "category_id" TEXT,
    "investigation_type" "investigation_type" NOT NULL DEFAULT 'FULL',
    "department" "investigation_department",
    "assigned_to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primary_investigator_id" TEXT,
    "assigned_at" TIMESTAMP(3),
    "assigned_by_id" TEXT,
    "assignment_history" JSONB,
    "status" "investigation_status" NOT NULL DEFAULT 'NEW',
    "status_rationale" TEXT,
    "status_changed_at" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "sla_status" "sla_status" NOT NULL DEFAULT 'ON_TRACK',
    "findings_summary" TEXT,
    "findings_detail" TEXT,
    "outcome" "investigation_outcome",
    "root_cause" TEXT,
    "lessons_learned" TEXT,
    "findings_date" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "closed_by_id" TEXT,
    "closure_approved_by_id" TEXT,
    "closure_approved_at" TIMESTAMP(3),
    "closure_notes" TEXT,
    "template_id" TEXT,
    "template_responses" JSONB,
    "template_completed" BOOLEAN NOT NULL DEFAULT false,
    "source_system" TEXT,
    "source_record_id" TEXT,
    "migrated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT NOT NULL,

    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investigations_organization_id_idx" ON "investigations"("organization_id");

-- CreateIndex
CREATE INDEX "investigations_organization_id_case_id_idx" ON "investigations"("organization_id", "case_id");

-- CreateIndex
CREATE INDEX "investigations_organization_id_status_idx" ON "investigations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "investigations_organization_id_primary_investigator_id_idx" ON "investigations"("organization_id", "primary_investigator_id");

-- CreateIndex
CREATE INDEX "investigations_organization_id_due_date_idx" ON "investigations"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "investigations_organization_id_sla_status_idx" ON "investigations"("organization_id", "sla_status");

-- CreateIndex
CREATE UNIQUE INDEX "investigations_case_id_investigation_number_key" ON "investigations"("case_id", "investigation_number");

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_primary_investigator_id_fkey" FOREIGN KEY ("primary_investigator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_closure_approved_by_id_fkey" FOREIGN KEY ("closure_approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
