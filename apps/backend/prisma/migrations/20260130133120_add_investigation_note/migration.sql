-- CreateEnum
CREATE TYPE "note_type" AS ENUM ('GENERAL', 'INTERVIEW', 'EVIDENCE', 'FINDING', 'RECOMMENDATION', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "note_visibility" AS ENUM ('PRIVATE', 'TEAM', 'ALL');

-- CreateTable
CREATE TABLE "investigation_notes" (
    "id" TEXT NOT NULL,
    "investigation_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "content" VARCHAR(50000) NOT NULL,
    "content_plain_text" TEXT,
    "note_type" "note_type" NOT NULL DEFAULT 'GENERAL',
    "visibility" "note_visibility" NOT NULL DEFAULT 'TEAM',
    "author_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMP(3),
    "edit_count" INTEGER NOT NULL DEFAULT 0,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "ai_summary" TEXT,
    "ai_summary_generated_at" TIMESTAMP(3),
    "ai_model_version" TEXT,
    "source_system" TEXT,
    "source_record_id" TEXT,
    "migrated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigation_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investigation_notes_organization_id_investigation_id_idx" ON "investigation_notes"("organization_id", "investigation_id");

-- CreateIndex
CREATE INDEX "investigation_notes_organization_id_author_id_idx" ON "investigation_notes"("organization_id", "author_id");

-- CreateIndex
CREATE INDEX "investigation_notes_created_at_idx" ON "investigation_notes"("created_at");

-- AddForeignKey
ALTER TABLE "investigation_notes" ADD CONSTRAINT "investigation_notes_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_notes" ADD CONSTRAINT "investigation_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
