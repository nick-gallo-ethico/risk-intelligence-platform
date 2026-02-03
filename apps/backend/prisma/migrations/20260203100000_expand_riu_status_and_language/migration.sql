-- AlterEnum: Add new RiuStatus values
-- Must add new values before removing old ones

ALTER TYPE "riu_status" ADD VALUE IF NOT EXISTS 'QA_REJECTED';
ALTER TYPE "riu_status" ADD VALUE IF NOT EXISTS 'LINKED';
ALTER TYPE "riu_status" ADD VALUE IF NOT EXISTS 'CLOSED';

-- AlterTable: Add new columns to risk_intelligence_units
ALTER TABLE "risk_intelligence_units"
ADD COLUMN IF NOT EXISTS "status_changed_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "status_changed_by_id" TEXT,
ADD COLUMN IF NOT EXISTS "language_detected" TEXT,
ADD COLUMN IF NOT EXISTS "language_confirmed" TEXT,
ADD COLUMN IF NOT EXISTS "language_effective" TEXT;

-- CreateIndex on status_changed_at for query performance
CREATE INDEX IF NOT EXISTS "risk_intelligence_units_status_changed_at_idx" ON "risk_intelligence_units"("status_changed_at");
