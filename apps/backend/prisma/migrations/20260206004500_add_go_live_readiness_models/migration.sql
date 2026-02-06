-- Create GateStatus enum
CREATE TYPE "gate_status" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'WAIVED');

-- Create SignoffType enum
CREATE TYPE "signoff_type" AS ENUM ('CLIENT', 'INTERNAL');

-- Create go_live_gates table
CREATE TABLE "go_live_gates" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "gate_id" TEXT NOT NULL,
    "status" "gate_status" NOT NULL DEFAULT 'PENDING',
    "checked_at" TIMESTAMP(3),
    "checked_by_id" TEXT,
    "waiver_reason" TEXT,
    "waiver_approved_by_id" TEXT,
    "waiver_approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "go_live_gates_pkey" PRIMARY KEY ("id")
);

-- Create readiness_items table
CREATE TABLE "readiness_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "percent_complete" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "readiness_items_pkey" PRIMARY KEY ("id")
);

-- Create go_live_signoffs table
CREATE TABLE "go_live_signoffs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" "signoff_type" NOT NULL,
    "readiness_score_at_signoff" INTEGER NOT NULL,
    "gates_passed_at_signoff" INTEGER NOT NULL,
    "gates_total_at_signoff" INTEGER NOT NULL,
    "acknowledged_risks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signoff_statement" TEXT NOT NULL,
    "client_signer_name" TEXT,
    "client_signer_email" TEXT,
    "client_signed_at" TIMESTAMP(3),
    "internal_approver_name" TEXT,
    "internal_approver_id" TEXT,
    "internal_approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "go_live_signoffs_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "go_live_gates_project_id_gate_id_key" ON "go_live_gates"("project_id", "gate_id");
CREATE UNIQUE INDEX "readiness_items_project_id_item_id_key" ON "readiness_items"("project_id", "item_id");
CREATE UNIQUE INDEX "go_live_signoffs_project_id_key" ON "go_live_signoffs"("project_id");

-- Create indexes
CREATE INDEX "go_live_gates_project_id_idx" ON "go_live_gates"("project_id");
CREATE INDEX "readiness_items_project_id_idx" ON "readiness_items"("project_id");

-- Add foreign key constraints
ALTER TABLE "go_live_gates" ADD CONSTRAINT "go_live_gates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "implementation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "readiness_items" ADD CONSTRAINT "readiness_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "implementation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "go_live_signoffs" ADD CONSTRAINT "go_live_signoffs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "implementation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
