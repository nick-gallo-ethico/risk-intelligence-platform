-- CreateEnum
CREATE TYPE "demo_account_status" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "job_level" AS ENUM ('IC', 'MANAGER', 'DIRECTOR', 'VP', 'SVP', 'C_SUITE');

-- CreateEnum
CREATE TYPE "work_mode" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "compliance_role" AS ENUM ('CCO', 'INVESTIGATOR', 'HRBP', 'LEGAL_COUNSEL', 'ETHICS_COMMITTEE');

-- CreateEnum
CREATE TYPE "employment_status" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "employment_type" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY', 'INTERN');

-- AlterEnum
ALTER TYPE "audit_entity_type" ADD VALUE 'DEMO_ACCOUNT';

-- CreateTable
CREATE TABLE "demo_accounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "prospect_user_id" TEXT NOT NULL,
    "prospect_email" TEXT NOT NULL,
    "prospect_name" TEXT,
    "prospect_company" TEXT,
    "sales_rep_user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "expired_at" TIMESTAMP(3),
    "status" "demo_account_status" NOT NULL DEFAULT 'ACTIVE',
    "last_access_at" TIMESTAMP(3),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "city" TEXT NOT NULL,
    "state_province" TEXT,
    "postal_code" TEXT,
    "country" TEXT NOT NULL,
    "country_name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "is_headquarters" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divisions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "head_employee_id" TEXT,
    "employee_weight" INTEGER NOT NULL DEFAULT 25,
    "default_work_mode" "work_mode" NOT NULL DEFAULT 'HYBRID',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_units" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "division_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "head_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "head_employee_id" TEXT,
    "hrbp_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lead_employee_id" TEXT,
    "location_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "hris_employee_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "preferred_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "job_title" TEXT NOT NULL,
    "job_level" "job_level" NOT NULL DEFAULT 'IC',
    "division_id" TEXT,
    "business_unit_id" TEXT,
    "department_id" TEXT,
    "team_id" TEXT,
    "location_id" TEXT,
    "department" TEXT,
    "department_code" TEXT,
    "location" TEXT,
    "location_code" TEXT,
    "cost_center" TEXT,
    "manager_id" TEXT,
    "manager_name" TEXT,
    "work_mode" "work_mode" NOT NULL DEFAULT 'HYBRID',
    "primary_language" TEXT NOT NULL DEFAULT 'en',
    "compliance_role" "compliance_role",
    "employment_status" "employment_status" NOT NULL DEFAULT 'ACTIVE',
    "employment_type" "employment_type" NOT NULL DEFAULT 'FULL_TIME',
    "hire_date" TIMESTAMP(3),
    "termination_date" TIMESTAMP(3),
    "is_named_persona" BOOLEAN NOT NULL DEFAULT false,
    "persona_role" TEXT,
    "source_system" TEXT NOT NULL DEFAULT 'MANUAL',
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_status" TEXT,
    "raw_hris_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demo_accounts_prospect_user_id_key" ON "demo_accounts"("prospect_user_id");

-- CreateIndex
CREATE INDEX "demo_accounts_organization_id_idx" ON "demo_accounts"("organization_id");

-- CreateIndex
CREATE INDEX "demo_accounts_sales_rep_user_id_idx" ON "demo_accounts"("sales_rep_user_id");

-- CreateIndex
CREATE INDEX "demo_accounts_status_expires_at_idx" ON "demo_accounts"("status", "expires_at");

-- CreateIndex
CREATE INDEX "locations_organization_id_idx" ON "locations"("organization_id");

-- CreateIndex
CREATE INDEX "locations_organization_id_region_idx" ON "locations"("organization_id", "region");

-- CreateIndex
CREATE INDEX "locations_organization_id_country_idx" ON "locations"("organization_id", "country");

-- CreateIndex
CREATE UNIQUE INDEX "locations_organization_id_code_key" ON "locations"("organization_id", "code");

-- CreateIndex
CREATE INDEX "divisions_organization_id_idx" ON "divisions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "divisions_organization_id_code_key" ON "divisions"("organization_id", "code");

-- CreateIndex
CREATE INDEX "business_units_organization_id_idx" ON "business_units"("organization_id");

-- CreateIndex
CREATE INDEX "business_units_division_id_idx" ON "business_units"("division_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_units_organization_id_code_key" ON "business_units"("organization_id", "code");

-- CreateIndex
CREATE INDEX "departments_organization_id_idx" ON "departments"("organization_id");

-- CreateIndex
CREATE INDEX "departments_business_unit_id_idx" ON "departments"("business_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organization_id_code_key" ON "departments"("organization_id", "code");

-- CreateIndex
CREATE INDEX "teams_organization_id_idx" ON "teams"("organization_id");

-- CreateIndex
CREATE INDEX "teams_department_id_idx" ON "teams"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_organization_id_code_key" ON "teams"("organization_id", "code");

-- CreateIndex
CREATE INDEX "employees_organization_id_idx" ON "employees"("organization_id");

-- CreateIndex
CREATE INDEX "employees_organization_id_division_id_idx" ON "employees"("organization_id", "division_id");

-- CreateIndex
CREATE INDEX "employees_organization_id_department_id_idx" ON "employees"("organization_id", "department_id");

-- CreateIndex
CREATE INDEX "employees_organization_id_team_id_idx" ON "employees"("organization_id", "team_id");

-- CreateIndex
CREATE INDEX "employees_organization_id_location_id_idx" ON "employees"("organization_id", "location_id");

-- CreateIndex
CREATE INDEX "employees_organization_id_employment_status_idx" ON "employees"("organization_id", "employment_status");

-- CreateIndex
CREATE INDEX "employees_organization_id_manager_id_idx" ON "employees"("organization_id", "manager_id");

-- CreateIndex
CREATE INDEX "employees_organization_id_job_level_idx" ON "employees"("organization_id", "job_level");

-- CreateIndex
CREATE INDEX "employees_organization_id_compliance_role_idx" ON "employees"("organization_id", "compliance_role");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organization_id_hris_employee_id_key" ON "employees"("organization_id", "hris_employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organization_id_email_key" ON "employees"("organization_id", "email");

-- AddForeignKey
ALTER TABLE "demo_accounts" ADD CONSTRAINT "demo_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_accounts" ADD CONSTRAINT "demo_accounts_prospect_user_id_fkey" FOREIGN KEY ("prospect_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_accounts" ADD CONSTRAINT "demo_accounts_sales_rep_user_id_fkey" FOREIGN KEY ("sales_rep_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
