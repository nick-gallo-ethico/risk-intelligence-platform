-- CreateEnum
CREATE TYPE "person_case_label" AS ENUM ('REPORTER', 'SUBJECT', 'WITNESS', 'ASSIGNED_INVESTIGATOR', 'APPROVER', 'STAKEHOLDER', 'MANAGER_OF_SUBJECT', 'REVIEWER', 'LEGAL_COUNSEL');

-- CreateEnum
CREATE TYPE "person_riu_label" AS ENUM ('REPORTER', 'SUBJECT_MENTIONED', 'WITNESS_MENTIONED');

-- CreateEnum
CREATE TYPE "case_case_label" AS ENUM ('PARENT', 'CHILD', 'SPLIT_FROM', 'SPLIT_TO', 'RELATED', 'ESCALATED_TO', 'SUPERSEDES', 'FOLLOW_UP_TO', 'MERGED_INTO');

-- CreateEnum
CREATE TYPE "person_person_label" AS ENUM ('MANAGER_OF', 'REPORTS_TO', 'SPOUSE', 'DOMESTIC_PARTNER', 'FAMILY_MEMBER', 'FORMER_COLLEAGUE', 'BUSINESS_PARTNER', 'CLOSE_PERSONAL_FRIEND');

-- CreateEnum
CREATE TYPE "evidentiary_status" AS ENUM ('ACTIVE', 'CLEARED', 'SUBSTANTIATED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "person_person_source" AS ENUM ('HRIS', 'DISCLOSURE', 'INVESTIGATION', 'MANUAL');

-- CreateTable
CREATE TABLE "person_case_associations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "label" "person_case_label" NOT NULL,
    "evidentiary_status" "evidentiary_status",
    "evidentiary_status_at" TIMESTAMP(3),
    "evidentiary_status_by_id" TEXT,
    "evidentiary_reason" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "ended_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "person_case_associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_riu_associations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "riu_id" TEXT NOT NULL,
    "label" "person_riu_label" NOT NULL,
    "notes" TEXT,
    "mention_context" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "person_riu_associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_case_associations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "source_case_id" TEXT NOT NULL,
    "target_case_id" TEXT NOT NULL,
    "label" "case_case_label" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "case_case_associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_person_associations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_a_id" TEXT NOT NULL,
    "person_b_id" TEXT NOT NULL,
    "label" "person_person_label" NOT NULL,
    "source" "person_person_source" NOT NULL,
    "is_directional" BOOLEAN NOT NULL DEFAULT false,
    "a_to_b" TEXT,
    "b_to_a" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_until" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "person_person_associations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "person_case_associations_organization_id_idx" ON "person_case_associations"("organization_id");

-- CreateIndex
CREATE INDEX "person_case_associations_organization_id_person_id_idx" ON "person_case_associations"("organization_id", "person_id");

-- CreateIndex
CREATE INDEX "person_case_associations_organization_id_case_id_idx" ON "person_case_associations"("organization_id", "case_id");

-- CreateIndex
CREATE INDEX "person_case_associations_organization_id_label_idx" ON "person_case_associations"("organization_id", "label");

-- CreateIndex
CREATE INDEX "person_case_associations_organization_id_evidentiary_status_idx" ON "person_case_associations"("organization_id", "evidentiary_status");

-- CreateIndex
CREATE UNIQUE INDEX "person_case_associations_organization_id_person_id_case_id_key" ON "person_case_associations"("organization_id", "person_id", "case_id", "label");

-- CreateIndex
CREATE INDEX "person_riu_associations_organization_id_idx" ON "person_riu_associations"("organization_id");

-- CreateIndex
CREATE INDEX "person_riu_associations_organization_id_person_id_idx" ON "person_riu_associations"("organization_id", "person_id");

-- CreateIndex
CREATE INDEX "person_riu_associations_organization_id_riu_id_idx" ON "person_riu_associations"("organization_id", "riu_id");

-- CreateIndex
CREATE UNIQUE INDEX "person_riu_associations_organization_id_person_id_riu_id_la_key" ON "person_riu_associations"("organization_id", "person_id", "riu_id", "label");

-- CreateIndex
CREATE INDEX "case_case_associations_organization_id_idx" ON "case_case_associations"("organization_id");

-- CreateIndex
CREATE INDEX "case_case_associations_organization_id_source_case_id_idx" ON "case_case_associations"("organization_id", "source_case_id");

-- CreateIndex
CREATE INDEX "case_case_associations_organization_id_target_case_id_idx" ON "case_case_associations"("organization_id", "target_case_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_case_associations_organization_id_source_case_id_targe_key" ON "case_case_associations"("organization_id", "source_case_id", "target_case_id", "label");

-- CreateIndex
CREATE INDEX "person_person_associations_organization_id_idx" ON "person_person_associations"("organization_id");

-- CreateIndex
CREATE INDEX "person_person_associations_organization_id_person_a_id_idx" ON "person_person_associations"("organization_id", "person_a_id");

-- CreateIndex
CREATE INDEX "person_person_associations_organization_id_person_b_id_idx" ON "person_person_associations"("organization_id", "person_b_id");

-- CreateIndex
CREATE INDEX "person_person_associations_organization_id_label_idx" ON "person_person_associations"("organization_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "person_person_associations_organization_id_person_a_id_pers_key" ON "person_person_associations"("organization_id", "person_a_id", "person_b_id", "label");

-- AddForeignKey
ALTER TABLE "person_case_associations" ADD CONSTRAINT "person_case_associations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_case_associations" ADD CONSTRAINT "person_case_associations_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_case_associations" ADD CONSTRAINT "person_case_associations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_riu_associations" ADD CONSTRAINT "person_riu_associations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_riu_associations" ADD CONSTRAINT "person_riu_associations_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_riu_associations" ADD CONSTRAINT "person_riu_associations_riu_id_fkey" FOREIGN KEY ("riu_id") REFERENCES "risk_intelligence_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_case_associations" ADD CONSTRAINT "case_case_associations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_case_associations" ADD CONSTRAINT "case_case_associations_source_case_id_fkey" FOREIGN KEY ("source_case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_case_associations" ADD CONSTRAINT "case_case_associations_target_case_id_fkey" FOREIGN KEY ("target_case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_person_associations" ADD CONSTRAINT "person_person_associations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_person_associations" ADD CONSTRAINT "person_person_associations_person_a_id_fkey" FOREIGN KEY ("person_a_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_person_associations" ADD CONSTRAINT "person_person_associations_person_b_id_fkey" FOREIGN KEY ("person_b_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security Policies for Association Tables
-- These policies ensure tenant isolation via organization_id

-- Enable RLS on association tables
ALTER TABLE "person_case_associations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "person_riu_associations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "case_case_associations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "person_person_associations" ENABLE ROW LEVEL SECURITY;

-- PersonCaseAssociation policies
CREATE POLICY "tenant_isolation_person_case_associations" ON "person_case_associations"
    USING (organization_id = current_setting('app.current_organization', TRUE));

CREATE POLICY "tenant_isolation_insert_person_case_associations" ON "person_case_associations"
    FOR INSERT WITH CHECK (organization_id = current_setting('app.current_organization', TRUE));

-- PersonRiuAssociation policies
CREATE POLICY "tenant_isolation_person_riu_associations" ON "person_riu_associations"
    USING (organization_id = current_setting('app.current_organization', TRUE));

CREATE POLICY "tenant_isolation_insert_person_riu_associations" ON "person_riu_associations"
    FOR INSERT WITH CHECK (organization_id = current_setting('app.current_organization', TRUE));

-- CaseCaseAssociation policies
CREATE POLICY "tenant_isolation_case_case_associations" ON "case_case_associations"
    USING (organization_id = current_setting('app.current_organization', TRUE));

CREATE POLICY "tenant_isolation_insert_case_case_associations" ON "case_case_associations"
    FOR INSERT WITH CHECK (organization_id = current_setting('app.current_organization', TRUE));

-- PersonPersonAssociation policies
CREATE POLICY "tenant_isolation_person_person_associations" ON "person_person_associations"
    USING (organization_id = current_setting('app.current_organization', TRUE));

CREATE POLICY "tenant_isolation_insert_person_person_associations" ON "person_person_associations"
    FOR INSERT WITH CHECK (organization_id = current_setting('app.current_organization', TRUE));
