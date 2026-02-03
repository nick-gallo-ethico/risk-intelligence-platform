-- CreateTable
CREATE TABLE IF NOT EXISTS "prompt_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "variables" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "prompt_templates_organization_id_name_version_key" ON "prompt_templates"("organization_id", "name", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "prompt_templates_organization_id_name_is_active_idx" ON "prompt_templates"("organization_id", "name", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "prompt_templates_name_is_active_idx" ON "prompt_templates"("name", "is_active");
