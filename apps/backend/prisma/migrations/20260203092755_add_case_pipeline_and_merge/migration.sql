-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "case_outcome" AS ENUM ('SUBSTANTIATED', 'UNSUBSTANTIATED', 'INCONCLUSIVE', 'POLICY_VIOLATION', 'NO_VIOLATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "classification_changed_at" TIMESTAMP(3),
ADD COLUMN     "classification_changed_by_id" TEXT,
ADD COLUMN     "classification_notes" TEXT,
ADD COLUMN     "is_merged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "merged_at" TIMESTAMP(3),
ADD COLUMN     "merged_by_id" TEXT,
ADD COLUMN     "merged_into_case_id" TEXT,
ADD COLUMN     "merged_reason" TEXT,
ADD COLUMN     "outcome" "case_outcome",
ADD COLUMN     "outcome_at" TIMESTAMP(3),
ADD COLUMN     "outcome_by_id" TEXT,
ADD COLUMN     "outcome_notes" TEXT,
ADD COLUMN     "pipeline_id" TEXT,
ADD COLUMN     "pipeline_stage" TEXT,
ADD COLUMN     "pipeline_stage_at" TIMESTAMP(3),
ADD COLUMN     "pipeline_stage_by_id" TEXT;

-- CreateIndex
CREATE INDEX "cases_organization_id_pipeline_stage_idx" ON "cases"("organization_id", "pipeline_stage");

-- CreateIndex
CREATE INDEX "cases_organization_id_outcome_idx" ON "cases"("organization_id", "outcome");

-- CreateIndex
CREATE INDEX "cases_organization_id_is_merged_idx" ON "cases"("organization_id", "is_merged");

-- CreateIndex
CREATE INDEX "cases_merged_into_case_id_idx" ON "cases"("merged_into_case_id");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_pipeline_stage_by_id_fkey" FOREIGN KEY ("pipeline_stage_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_classification_changed_by_id_fkey" FOREIGN KEY ("classification_changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_outcome_by_id_fkey" FOREIGN KEY ("outcome_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_merged_into_case_id_fkey" FOREIGN KEY ("merged_into_case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_merged_by_id_fkey" FOREIGN KEY ("merged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
