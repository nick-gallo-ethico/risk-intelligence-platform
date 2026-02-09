-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('SYSTEM_ADMIN', 'COMPLIANCE_OFFICER', 'TRIAGE_LEAD', 'INVESTIGATOR', 'POLICY_AUTHOR', 'POLICY_REVIEWER', 'DEPARTMENT_ADMIN', 'MANAGER', 'EMPLOYEE', 'OPERATOR');

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

-- CreateEnum
CREATE TYPE "case_outcome" AS ENUM ('SUBSTANTIATED', 'UNSUBSTANTIATED', 'INCONCLUSIVE', 'POLICY_VIOLATION', 'NO_VIOLATION');

-- CreateEnum
CREATE TYPE "audit_entity_type" AS ENUM ('CASE', 'RIU', 'INVESTIGATION', 'DISCLOSURE', 'POLICY', 'ATTESTATION', 'WORKFLOW', 'USER', 'EMPLOYEE', 'ORGANIZATION', 'CATEGORY', 'FORM', 'CHATBOT_CONVERSATION', 'REPORT', 'DASHBOARD', 'INTEGRATION', 'ATTACHMENT', 'SUBJECT', 'CASE_MESSAGE', 'INTERACTION', 'DEMO_ACCOUNT', 'PERSON', 'SEGMENT', 'CAMPAIGN', 'CAMPAIGN_ASSIGNMENT', 'REMEDIATION_PLAN', 'REMEDIATION_STEP', 'NOTIFICATION', 'USER_DATA_TABLE', 'POLICY_VERSION', 'POLICY_TRANSLATION', 'MILESTONE', 'MILESTONE_ITEM');

-- CreateEnum
CREATE TYPE "audit_action_category" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ACCESS', 'SYSTEM', 'SECURITY', 'AI');

-- CreateEnum
CREATE TYPE "actor_type" AS ENUM ('USER', 'SYSTEM', 'AI', 'INTEGRATION', 'ANONYMOUS');

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

-- CreateEnum
CREATE TYPE "note_type" AS ENUM ('GENERAL', 'INTERVIEW', 'EVIDENCE', 'FINDING', 'RECOMMENDATION', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "note_visibility" AS ENUM ('PRIVATE', 'TEAM', 'ALL');

-- CreateEnum
CREATE TYPE "interview_status" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "interviewee_type" AS ENUM ('PERSON', 'EXTERNAL', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "attachment_entity_type" AS ENUM ('CASE', 'INVESTIGATION', 'INVESTIGATION_NOTE');

-- CreateEnum
CREATE TYPE "category_module" AS ENUM ('CASE', 'DISCLOSURE', 'POLICY', 'ALL');

-- CreateEnum
CREATE TYPE "riu_type" AS ENUM ('HOTLINE_REPORT', 'WEB_FORM_SUBMISSION', 'DISCLOSURE_RESPONSE', 'ATTESTATION_RESPONSE', 'CHATBOT_TRANSCRIPT', 'INCIDENT_FORM', 'PROXY_REPORT', 'SURVEY_RESPONSE');

-- CreateEnum
CREATE TYPE "riu_source_channel" AS ENUM ('PHONE', 'WEB_FORM', 'CHATBOT', 'EMAIL', 'PROXY', 'DIRECT_ENTRY', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "riu_reporter_type" AS ENUM ('ANONYMOUS', 'CONFIDENTIAL', 'IDENTIFIED');

-- CreateEnum
CREATE TYPE "riu_status" AS ENUM ('PENDING_QA', 'IN_QA', 'QA_REJECTED', 'RELEASED', 'LINKED', 'CLOSED', 'RECEIVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "riu_qa_status" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "disclosure_type" AS ENUM ('COI', 'GIFT', 'OUTSIDE_EMPLOYMENT', 'POLITICAL', 'CHARITABLE', 'TRAVEL');

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

-- CreateEnum
CREATE TYPE "form_type" AS ENUM ('INTAKE', 'DISCLOSURE', 'ATTESTATION', 'SURVEY', 'WORKFLOW_TASK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "form_submission_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "report_data_source" AS ENUM ('CASES', 'RIUS', 'INVESTIGATIONS', 'DISCLOSURES', 'POLICIES', 'AUDIT_LOGS', 'USERS', 'CAMPAIGNS');

-- CreateEnum
CREATE TYPE "report_execution_status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "demo_account_status" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "person_type" AS ENUM ('EMPLOYEE', 'EXTERNAL_CONTACT', 'ANONYMOUS_PLACEHOLDER');

-- CreateEnum
CREATE TYPE "person_source" AS ENUM ('HRIS_SYNC', 'MANUAL', 'INTAKE_CREATED');

-- CreateEnum
CREATE TYPE "anonymity_tier" AS ENUM ('ANONYMOUS', 'CONFIDENTIAL', 'OPEN');

-- CreateEnum
CREATE TYPE "person_status" AS ENUM ('ACTIVE', 'INACTIVE', 'MERGED');

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

-- CreateEnum
CREATE TYPE "campaign_type" AS ENUM ('DISCLOSURE', 'ATTESTATION', 'SURVEY');

-- CreateEnum
CREATE TYPE "attestation_type" AS ENUM ('CHECKBOX', 'SIGNATURE', 'QUIZ');

-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "audience_mode" AS ENUM ('SEGMENT', 'MANUAL', 'ALL');

-- CreateEnum
CREATE TYPE "assignment_status" AS ENUM ('PENDING', 'NOTIFIED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'SKIPPED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "campaign_wave_status" AS ENUM ('PENDING', 'LAUNCHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "campaign_rollout_strategy" AS ENUM ('IMMEDIATE', 'STAGGERED', 'PILOT_FIRST');

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

-- CreateEnum
CREATE TYPE "ai_conversation_status" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ai_action_status" AS ENUM ('PENDING', 'EXECUTING', 'COMPLETED', 'FAILED', 'UNDONE');

-- CreateEnum
CREATE TYPE "custom_property_entity_type" AS ENUM ('CASE', 'INVESTIGATION', 'PERSON', 'RIU');

-- CreateEnum
CREATE TYPE "property_data_type" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'DATETIME', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'URL', 'EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "remediation_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "step_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "view_entity_type" AS ENUM ('CASES', 'RIUS', 'INVESTIGATIONS', 'PERSONS', 'CAMPAIGNS', 'REMEDIATION_PLANS');

-- CreateEnum
CREATE TYPE "template_tier" AS ENUM ('OFFICIAL', 'TEAM', 'PERSONAL');

-- CreateEnum
CREATE TYPE "template_requirement" AS ENUM ('REQUIRED', 'RECOMMENDED', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('ASSIGNMENT', 'DEADLINE', 'APPROVAL', 'MENTION', 'INTERVIEW', 'STATUS_UPDATE', 'COMMENT', 'COMPLETION', 'ESCALATION', 'DIGEST');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "delivery_status" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "qa_mode" AS ENUM ('ALL', 'RISK_BASED', 'SAMPLE', 'NONE');

-- CreateEnum
CREATE TYPE "directive_stage" AS ENUM ('OPENING', 'INTAKE', 'CATEGORY_SPECIFIC', 'CLOSING');

-- CreateEnum
CREATE TYPE "branding_mode" AS ENUM ('TEMPLATE', 'FULL_WHITE_LABEL');

-- CreateEnum
CREATE TYPE "theme_mode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "threshold_action" AS ENUM ('FLAG_REVIEW', 'CREATE_CASE', 'REQUIRE_APPROVAL', 'NOTIFY');

-- CreateEnum
CREATE TYPE "threshold_apply_mode" AS ENUM ('FORWARD_ONLY', 'RETROACTIVE', 'RETROACTIVE_DATE');

-- CreateEnum
CREATE TYPE "conflict_type" AS ENUM ('VENDOR_MATCH', 'APPROVAL_AUTHORITY', 'PRIOR_CASE_HISTORY', 'HRIS_MATCH', 'GIFT_AGGREGATE', 'RELATIONSHIP_PATTERN', 'SELF_DEALING');

-- CreateEnum
CREATE TYPE "conflict_severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "conflict_status" AS ENUM ('OPEN', 'DISMISSED', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "exclusion_scope" AS ENUM ('PERMANENT', 'TIME_LIMITED', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "disclosure_form_type" AS ENUM ('COI', 'GIFT', 'OUTSIDE_EMPLOYMENT', 'ATTESTATION', 'POLITICAL', 'CHARITABLE', 'TRAVEL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "form_template_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "table_creation_method" AS ENUM ('BUILDER', 'AI_GENERATED', 'IMPORT');

-- CreateEnum
CREATE TYPE "table_visibility" AS ENUM ('PRIVATE', 'TEAM', 'ORG');

-- CreateEnum
CREATE TYPE "policy_type" AS ENUM ('CODE_OF_CONDUCT', 'ANTI_HARASSMENT', 'ANTI_BRIBERY', 'DATA_PRIVACY', 'INFORMATION_SECURITY', 'GIFT_ENTERTAINMENT', 'CONFLICTS_OF_INTEREST', 'TRAVEL_EXPENSE', 'WHISTLEBLOWER', 'SOCIAL_MEDIA', 'ACCEPTABLE_USE', 'OTHER');

-- CreateEnum
CREATE TYPE "policy_status" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "translation_source" AS ENUM ('AI', 'HUMAN', 'IMPORT');

-- CreateEnum
CREATE TYPE "translation_review_status" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'NEEDS_REVISION', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "policy_case_link_type" AS ENUM ('VIOLATION', 'REFERENCE', 'GOVERNING');

-- CreateEnum
CREATE TYPE "migration_source_type" AS ENUM ('NAVEX', 'EQS', 'LEGACY_ETHICO', 'GENERIC_CSV', 'ONETRUST', 'STAR');

-- CreateEnum
CREATE TYPE "migration_job_status" AS ENUM ('PENDING', 'VALIDATING', 'MAPPING', 'PREVIEW', 'IMPORTING', 'COMPLETED', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "export_source_type" AS ENUM ('CASE', 'INVESTIGATION', 'DISCLOSURE', 'INTERVIEW_RESPONSE', 'RIU');

-- CreateEnum
CREATE TYPE "export_data_type" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'CURRENCY', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "export_type" AS ENUM ('FLAT_FILE', 'CASES_ONLY', 'INVESTIGATIONS_ONLY', 'DISCLOSURES_ONLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "export_format" AS ENUM ('CSV', 'XLSX', 'JSON', 'PDF');

-- CreateEnum
CREATE TYPE "export_job_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "dashboard_type" AS ENUM ('CCO', 'INVESTIGATOR', 'CAMPAIGN_MANAGER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "widget_type" AS ENUM ('KPI_CARD', 'LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'DONUT_CHART', 'AREA_CHART', 'STACKED_BAR', 'TABLE', 'LIST', 'HEATMAP', 'FUNNEL', 'GAUGE', 'SPARKLINE', 'QUICK_ACTIONS');

-- CreateEnum
CREATE TYPE "chart_type" AS ENUM ('LINE', 'BAR', 'PIE', 'DONUT', 'AREA', 'STACKED_BAR', 'HEATMAP', 'FUNNEL', 'SCATTER', 'GAUGE');

-- CreateEnum
CREATE TYPE "date_range_preset" AS ENUM ('TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS', 'LAST_12_MONTHS', 'YEAR_TO_DATE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "schedule_type" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "delivery_method" AS ENUM ('EMAIL', 'STORAGE');

-- CreateEnum
CREATE TYPE "schedule_run_status" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "milestone_category" AS ENUM ('AUDIT', 'INVESTIGATION', 'CAMPAIGN', 'PROJECT', 'TRAINING', 'REMEDIATION', 'OTHER');

-- CreateEnum
CREATE TYPE "milestone_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "milestone_item_type" AS ENUM ('CASE', 'INVESTIGATION', 'CAMPAIGN', 'TASK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "implementation_type" AS ENUM ('SMB_QUICK_START', 'ENTERPRISE_FULL', 'HEALTHCARE_HIPAA', 'FINANCIAL_SOX', 'GENERAL_BUSINESS');

-- CreateEnum
CREATE TYPE "implementation_phase" AS ENUM ('DISCOVERY', 'CONFIGURATION', 'DATA_MIGRATION', 'UAT', 'GO_LIVE', 'OPTIMIZATION');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "impl_task_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "blocker_category" AS ENUM ('INTERNAL', 'CLIENT_SIDE', 'VENDOR');

-- CreateEnum
CREATE TYPE "blocker_status" AS ENUM ('OPEN', 'SNOOZED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "impl_activity_type" AS ENUM ('EMAIL_SENT', 'EMAIL_RECEIVED', 'MEETING', 'DECISION', 'PHASE_TRANSITION', 'NOTE', 'TASK_COMPLETED', 'BLOCKER_CREATED', 'BLOCKER_RESOLVED');

-- CreateEnum
CREATE TYPE "internal_role" AS ENUM ('SUPPORT_L1', 'SUPPORT_L2', 'SUPPORT_L3', 'IMPLEMENTATION', 'HOTLINE_OPS', 'CLIENT_SUCCESS', 'ADMIN');

-- CreateEnum
CREATE TYPE "gate_status" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'WAIVED');

-- CreateEnum
CREATE TYPE "signoff_type" AS ENUM ('CLIENT', 'INTERNAL');

-- CreateEnum
CREATE TYPE "certification_level" AS ENUM ('FOUNDATION', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "track_type" AS ENUM ('PLATFORM_FUNDAMENTALS', 'CASE_MANAGEMENT', 'CAMPAIGNS_DISCLOSURES', 'POLICY_MANAGEMENT', 'ANALYTICS_REPORTING', 'ADMIN_CONFIGURATION');

-- CreateEnum
CREATE TYPE "course_type" AS ENUM ('VIDEO', 'TEXT', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "quiz_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "certificate_status" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "risk_level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "health_trend" AS ENUM ('IMPROVING', 'STABLE', 'DECLINING');

-- CreateEnum
CREATE TYPE "alert_level" AS ENUM ('NONE', 'DASHBOARD_ONLY', 'PROACTIVE');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "default_language" TEXT NOT NULL DEFAULT 'en',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'EMPLOYEE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "sso_provider" TEXT,
    "sso_id" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "mfa_verified_at" TIMESTAMP(3),
    "mfa_recovery_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "previous_session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_domains" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verification_token" TEXT NOT NULL,
    "verification_method" TEXT NOT NULL DEFAULT 'DNS_TXT',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_sso_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sso_provider" TEXT,
    "sso_enabled" BOOLEAN NOT NULL DEFAULT false,
    "jit_provisioning_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_role" "user_role" NOT NULL DEFAULT 'EMPLOYEE',
    "azure_tenant_id" TEXT,
    "saml_idp_entity_id" TEXT,
    "saml_idp_entry_point" TEXT,
    "saml_idp_certificate" TEXT,
    "saml_sp_entity_id" TEXT,
    "mfa_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_sso_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "case_status" NOT NULL DEFAULT 'NEW',
    "status_rationale" TEXT,
    "pipeline_id" TEXT,
    "pipeline_stage" TEXT,
    "pipeline_stage_at" TIMESTAMP(3),
    "pipeline_stage_by_id" TEXT,
    "classification_notes" TEXT,
    "classification_changed_at" TIMESTAMP(3),
    "classification_changed_by_id" TEXT,
    "outcome" "case_outcome",
    "outcome_notes" TEXT,
    "outcome_at" TIMESTAMP(3),
    "outcome_by_id" TEXT,
    "merged_into_case_id" TEXT,
    "merged_at" TIMESTAMP(3),
    "merged_by_id" TEXT,
    "merged_reason" TEXT,
    "is_merged" BOOLEAN NOT NULL DEFAULT false,
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
    "demo_user_session_id" TEXT,
    "is_base_data" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT NOT NULL,
    "search_vector" tsvector,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" "audit_entity_type" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "action_category" "audit_action_category" NOT NULL,
    "action_description" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_type" "actor_type" NOT NULL,
    "actor_name" TEXT,
    "changes" JSONB,
    "context" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

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
    "demo_user_session_id" TEXT,
    "is_base_data" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT NOT NULL,

    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "investigation_interviews" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "investigation_id" TEXT NOT NULL,
    "interviewee_type" "interviewee_type" NOT NULL,
    "interviewee_person_id" TEXT,
    "interviewee_name" TEXT,
    "interviewee_title" TEXT,
    "interviewee_email" TEXT,
    "interviewee_phone" TEXT,
    "status" "interview_status" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "location" TEXT,
    "conducted_by_id" TEXT NOT NULL,
    "secondary_interviewer_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "purpose" TEXT,
    "notes" TEXT,
    "summary" TEXT,
    "key_findings" TEXT,
    "template_id" TEXT,
    "questions" JSONB,
    "checklist_item_id" TEXT,
    "has_recording" BOOLEAN NOT NULL DEFAULT false,
    "recording_url" TEXT,
    "transcript_url" TEXT,
    "consent_obtained" BOOLEAN NOT NULL DEFAULT false,
    "consent_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "investigation_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" TEXT,
    "questions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "interview_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" "attachment_entity_type" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "description" TEXT,
    "is_evidence" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

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
    "location_name" TEXT,
    "location_address" TEXT,
    "location_city" TEXT,
    "location_state" TEXT,
    "location_zip" TEXT,
    "location_country" TEXT,
    "campaign_id" TEXT,
    "campaign_assignment_id" TEXT,
    "custom_fields" JSONB,
    "form_responses" JSONB,
    "source_system" TEXT,
    "source_record_id" TEXT,
    "migrated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,
    "status" "riu_status" NOT NULL DEFAULT 'PENDING_QA',
    "status_changed_at" TIMESTAMP(3),
    "status_changed_by_id" TEXT,
    "language_detected" TEXT,
    "language_confirmed" TEXT,
    "language_effective" TEXT,
    "ai_summary" TEXT,
    "ai_risk_score" DECIMAL(3,2),
    "ai_translation" TEXT,
    "ai_language_detected" TEXT,
    "ai_model_version" TEXT,
    "ai_generated_at" TIMESTAMP(3),
    "ai_confidence_score" INTEGER,
    "demo_user_session_id" TEXT,
    "is_base_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "risk_intelligence_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riu_hotline_extensions" (
    "id" TEXT NOT NULL,
    "riu_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "call_duration" INTEGER,
    "interpreter_used" BOOLEAN NOT NULL DEFAULT false,
    "interpreter_language" TEXT,
    "caller_demeanor" TEXT,
    "transferred_from" TEXT,
    "recording_url" TEXT,
    "callback_requested" BOOLEAN NOT NULL DEFAULT false,
    "callback_number" TEXT,
    "operator_notes" TEXT,
    "qa_status" "riu_qa_status" NOT NULL DEFAULT 'PENDING',
    "qa_reviewer_id" TEXT,
    "qa_reviewed_at" TIMESTAMP(3),
    "qa_notes" TEXT,
    "qa_rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riu_hotline_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riu_disclosure_extensions" (
    "id" TEXT NOT NULL,
    "riu_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "disclosure_type" "disclosure_type" NOT NULL,
    "disclosure_subtype" TEXT,
    "disclosure_value" DECIMAL(12,2),
    "disclosure_currency" TEXT,
    "estimated_annual_value" DECIMAL(12,2),
    "threshold_triggered" BOOLEAN NOT NULL DEFAULT false,
    "threshold_amount" DECIMAL(12,2),
    "conflict_detected" BOOLEAN NOT NULL DEFAULT false,
    "conflict_reason" TEXT,
    "related_person_id" TEXT,
    "related_person_name" TEXT,
    "related_company" TEXT,
    "relationship_type" TEXT,
    "effective_date" TIMESTAMP(3),
    "expiration_date" TIMESTAMP(3),
    "form_template_id" TEXT,
    "form_version" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riu_disclosure_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disclosure_drafts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "form_template_id" TEXT,
    "disclosure_type" "disclosure_type",
    "form_data" JSONB NOT NULL,
    "completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "current_section" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disclosure_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riu_web_form_extensions" (
    "id" TEXT NOT NULL,
    "riu_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "form_definition_id" TEXT NOT NULL,
    "form_definition_version" INTEGER NOT NULL,
    "form_name" TEXT,
    "submission_source" TEXT,
    "submitter_ip_address" TEXT,
    "submitter_user_agent" TEXT,
    "submission_duration" INTEGER,
    "validation_passed" BOOLEAN NOT NULL DEFAULT true,
    "validation_errors" JSONB,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "total_attachment_size" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riu_web_form_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riu_case_associations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "form_definitions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "form_type" "form_type" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "schema" JSONB NOT NULL,
    "ui_schema" JSONB,
    "default_values" JSONB,
    "allow_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "notify_on_submit" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_id" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "form_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "form_definition_id" TEXT NOT NULL,
    "form_definition_version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "status" "form_submission_status" NOT NULL DEFAULT 'SUBMITTED',
    "validation_errors" JSONB,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "submitted_by_id" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitter_ip" TEXT,
    "submitter_agent" TEXT,
    "anonymous_access_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "data_source" "report_data_source" NOT NULL,
    "columns" JSONB NOT NULL,
    "filters" JSONB,
    "aggregations" JSONB,
    "sort_by" TEXT,
    "sort_order" TEXT,
    "chart_type" TEXT,
    "chart_config" JSONB,
    "allowed_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_executions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "status" "report_execution_status" NOT NULL DEFAULT 'PENDING',
    "filters" JSONB,
    "parameters" JSONB,
    "row_count" INTEGER,
    "file_key" TEXT,
    "file_url" TEXT,
    "expires_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requested_by_id" TEXT NOT NULL,

    CONSTRAINT "report_executions_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "employee_compliance_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "campaigns_assigned" INTEGER NOT NULL DEFAULT 0,
    "campaigns_completed" INTEGER NOT NULL DEFAULT 0,
    "campaigns_missed_deadline" INTEGER NOT NULL DEFAULT 0,
    "average_response_days" DOUBLE PRECISION,
    "is_repeat_non_responder" BOOLEAN NOT NULL DEFAULT false,
    "last_campaign_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_compliance_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "person_type" NOT NULL,
    "source" "person_source" NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "employee_id" TEXT,
    "business_unit_id" TEXT,
    "business_unit_name" TEXT,
    "job_title" TEXT,
    "employment_status" TEXT,
    "location_id" TEXT,
    "location_name" TEXT,
    "manager_id" TEXT,
    "manager_name" TEXT,
    "company" TEXT,
    "title" TEXT,
    "relationship" TEXT,
    "anonymity_tier" "anonymity_tier" NOT NULL DEFAULT 'OPEN',
    "status" "person_status" NOT NULL DEFAULT 'ACTIVE',
    "merged_into_primary_id" TEXT,
    "merged_at" TIMESTAMP(3),
    "merged_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_user_sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_archived_changes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "demo_user_session_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_data" JSONB NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "restored_at" TIMESTAMP(3),

    CONSTRAINT "demo_archived_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" JSONB NOT NULL,
    "estimated_audience_size" INTEGER,
    "audience_size_updated_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "campaign_type" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "language" TEXT NOT NULL DEFAULT 'en',
    "parent_campaign_id" TEXT,
    "parent_version_at_creation" INTEGER,
    "status" "campaign_status" NOT NULL DEFAULT 'DRAFT',
    "status_note" TEXT,
    "audience_mode" "audience_mode" NOT NULL,
    "segment_id" TEXT,
    "manual_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "launch_at" TIMESTAMP(3),
    "launched_at" TIMESTAMP(3),
    "launched_by_id" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "rollout_strategy" "campaign_rollout_strategy" NOT NULL DEFAULT 'IMMEDIATE',
    "rollout_config" JSONB,
    "form_definition_id" TEXT,
    "disclosure_form_template_id" TEXT,
    "policy_id" TEXT,
    "policy_version_id" TEXT,
    "attestation_type" "attestation_type",
    "quiz_config" JSONB,
    "force_scroll" BOOLEAN NOT NULL DEFAULT false,
    "signature_required" BOOLEAN NOT NULL DEFAULT false,
    "auto_create_case_on_refusal" BOOLEAN NOT NULL DEFAULT true,
    "reminder_days" INTEGER[] DEFAULT ARRAY[7, 3, 1]::INTEGER[],
    "last_reminder_sent_at" TIMESTAMP(3),
    "escalation_after_days" INTEGER,
    "escalate_to_user_id" TEXT,
    "reminder_config" JSONB,
    "auto_create_case" BOOLEAN NOT NULL DEFAULT false,
    "case_creation_threshold" JSONB,
    "total_assignments" INTEGER NOT NULL DEFAULT 0,
    "completed_assignments" INTEGER NOT NULL DEFAULT 0,
    "overdue_assignments" INTEGER NOT NULL DEFAULT 0,
    "completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "wave_id" TEXT,
    "status" "assignment_status" NOT NULL DEFAULT 'PENDING',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "due_date" TIMESTAMP(3) NOT NULL,
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "last_reminder_sent_at" TIMESTAMP(3),
    "manager_notified_at" TIMESTAMP(3),
    "riu_id" TEXT,
    "form_submission_id" TEXT,
    "attested_at" TIMESTAMP(3),
    "attestation_type" "attestation_type",
    "quiz_score" INTEGER,
    "quiz_attempts" INTEGER DEFAULT 0,
    "signature_data" TEXT,
    "refused_at" TIMESTAMP(3),
    "refusal_reason" TEXT,
    "employee_snapshot" JSONB NOT NULL,
    "notes" TEXT,
    "skipped_by" TEXT,
    "skip_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_waves" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "wave_number" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "launched_at" TIMESTAMP(3),
    "audience_percentage" INTEGER,
    "employee_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "campaign_wave_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_waves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_blackout_dates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "affects_locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_pattern" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,

    CONSTRAINT "org_blackout_dates_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "title" TEXT,
    "status" "ai_conversation_status" NOT NULL DEFAULT 'ACTIVE',
    "agent_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "paused_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "last_message_at" TIMESTAMP(3),
    "total_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_output_tokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tool_calls" JSONB,
    "tool_results" JSONB,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_context_files" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'org',
    "team_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_context_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cache_read_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_write_tokens" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'claude',
    "feature_type" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "duration_ms" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
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

-- CreateTable
CREATE TABLE "ai_rate_limits" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "requests_per_minute" INTEGER NOT NULL DEFAULT 60,
    "tokens_per_minute" INTEGER NOT NULL DEFAULT 100000,
    "requests_per_day" INTEGER NOT NULL DEFAULT 10000,
    "tokens_per_day" INTEGER NOT NULL DEFAULT 5000000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_query_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "parsedQuery" JSONB NOT NULL,
    "visualization_type" TEXT NOT NULL,
    "result_summary" TEXT,
    "processing_time_ms" INTEGER NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_query_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_actions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "user_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB,
    "previous_state" JSONB,
    "status" "ai_action_status" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "undo_window_seconds" INTEGER,
    "undo_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "undone_at" TIMESTAMP(3),
    "undone_by_user_id" TEXT,

    CONSTRAINT "ai_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_property_definitions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" "custom_property_entity_type" NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "data_type" "property_data_type" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "default_value" JSONB,
    "options" JSONB,
    "validation_rules" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "group_name" TEXT,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "help_text" TEXT,
    "placeholder" TEXT,
    "width" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "custom_property_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediation_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "finding_id" TEXT,
    "finding_description" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "template_id" TEXT,
    "template_version" INTEGER,
    "status" "remediation_status" NOT NULL DEFAULT 'DRAFT',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "total_steps" INTEGER NOT NULL DEFAULT 0,
    "completed_steps" INTEGER NOT NULL DEFAULT 0,
    "overdue_steps" INTEGER NOT NULL DEFAULT 0,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "remediation_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediation_steps" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "assignee_user_id" TEXT,
    "assignee_email" TEXT,
    "assignee_name" TEXT,
    "status" "step_status" NOT NULL DEFAULT 'PENDING',
    "requires_co_approval" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "completion_notes" TEXT,
    "completion_evidence" JSONB,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "approval_notes" TEXT,
    "depends_on_step_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reminder_sent_at" TIMESTAMP(3),
    "escalated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remediation_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediation_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" TEXT,
    "steps" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "remediation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_views" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "shared_with_team_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entity_type" "view_entity_type" NOT NULL,
    "filters" JSONB NOT NULL,
    "sort_by" TEXT,
    "sort_order" TEXT,
    "columns" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "last_used_at" TIMESTAMP(3),
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" TEXT,
    "tier" "template_tier" NOT NULL DEFAULT 'PERSONAL',
    "created_by_id" TEXT NOT NULL,
    "shared_with_team_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sections" JSONB NOT NULL,
    "suggested_durations" JSONB,
    "conditional_rules" JSONB,
    "is_system_template" BOOLEAN NOT NULL DEFAULT false,
    "source_template_id" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_template_mappings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "requirement" "template_requirement" NOT NULL DEFAULT 'RECOMMENDED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "category_template_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_checklist_progress" (
    "id" TEXT NOT NULL,
    "investigation_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "template_version" INTEGER NOT NULL,
    "item_states" JSONB NOT NULL,
    "section_states" JSONB NOT NULL,
    "custom_items" JSONB,
    "skipped_items" JSONB,
    "item_order" JSONB,
    "total_items" INTEGER NOT NULL,
    "completed_items" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "custom_count" INTEGER NOT NULL DEFAULT 0,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigation_checklist_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "type" "notification_type" NOT NULL,
    "status" "notification_status" NOT NULL DEFAULT 'QUEUED',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "template_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "message_id" TEXT,
    "status" "delivery_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "backup_user_id" TEXT,
    "ooo_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_notification_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "enforced_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "default_quiet_hours_start" TEXT,
    "default_quiet_hours_end" TEXT,
    "digest_time" TEXT NOT NULL DEFAULT '17:00',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "mjml_content" TEXT NOT NULL,
    "subject_template" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digest_queue" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digest_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotline_numbers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "display_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotline_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_qa_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "default_mode" "qa_mode" NOT NULL DEFAULT 'ALL',
    "sample_percentage" INTEGER,
    "high_risk_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keyword_triggers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_overrides" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_qa_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_directives" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "stage" "directive_stage" NOT NULL,
    "category_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_read_aloud" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_directives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_branding" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "mode" "branding_mode" NOT NULL DEFAULT 'TEMPLATE',
    "logo_url" TEXT,
    "primary_color" TEXT,
    "theme" "theme_mode" NOT NULL DEFAULT 'LIGHT',
    "color_palette" JSONB,
    "typography" JSONB,
    "custom_domain" TEXT,
    "footer_text" TEXT,
    "welcome_video_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threshold_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "disclosureTypes" "disclosure_type"[],
    "conditions" JSONB NOT NULL,
    "aggregate_config" JSONB,
    "action" "threshold_action" NOT NULL,
    "action_config" JSONB,
    "apply_mode" "threshold_apply_mode" NOT NULL DEFAULT 'FORWARD_ONLY',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threshold_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threshold_trigger_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "disclosure_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "evaluated_value" DECIMAL(12,2) NOT NULL,
    "threshold_value" DECIMAL(12,2) NOT NULL,
    "aggregate_breakdown" JSONB,
    "action_taken" "threshold_action" NOT NULL,
    "case_id" TEXT,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "threshold_trigger_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conflict_alerts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "disclosure_id" TEXT NOT NULL,
    "conflict_type" "conflict_type" NOT NULL,
    "severity" "conflict_severity" NOT NULL,
    "status" "conflict_status" NOT NULL DEFAULT 'OPEN',
    "summary" TEXT NOT NULL,
    "matched_entity" TEXT NOT NULL,
    "match_confidence" DOUBLE PRECISION NOT NULL,
    "match_details" JSONB NOT NULL,
    "severity_factors" JSONB,
    "dismissed_category" TEXT,
    "dismissed_reason" TEXT,
    "dismissed_by" TEXT,
    "dismissed_at" TIMESTAMP(3),
    "escalated_to_case_id" TEXT,
    "exclusion_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conflict_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disclosure_form_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "disclosure_type" "disclosure_form_type" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "form_template_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "published_by" TEXT,
    "parent_template_id" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "fields" JSONB NOT NULL,
    "sections" JSONB NOT NULL,
    "validation_rules" JSONB,
    "calculated_fields" JSONB,
    "ui_schema" JSONB,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disclosure_form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conflict_exclusions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "matched_entity" TEXT NOT NULL,
    "conflict_type" "conflict_type" NOT NULL,
    "created_from_alert_id" TEXT,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "scope" "exclusion_scope" NOT NULL DEFAULT 'PERMANENT',
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conflict_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_data_tables" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_via" "table_creation_method" NOT NULL DEFAULT 'BUILDER',
    "ai_prompt" TEXT,
    "created_by_id" TEXT NOT NULL,
    "data_sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "columns" JSONB NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '[]',
    "group_by" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aggregates" JSONB DEFAULT '[]',
    "sort_by" JSONB DEFAULT '[]',
    "destinations" JSONB NOT NULL DEFAULT '[]',
    "visibility" "table_visibility" NOT NULL DEFAULT 'PRIVATE',
    "shared_with_teams" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "shared_with_users" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "schedule_config" JSONB,
    "next_scheduled_run" TIMESTAMP(3),
    "last_executed_at" TIMESTAMP(3),
    "cached_results" JSONB,
    "cache_expires_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_data_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "policy_type" "policy_type" NOT NULL,
    "category" TEXT,
    "status" "policy_status" NOT NULL DEFAULT 'DRAFT',
    "current_version" INTEGER NOT NULL DEFAULT 0,
    "draft_content" TEXT,
    "draft_updated_at" TIMESTAMP(3),
    "draft_updated_by_id" TEXT,
    "owner_id" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3),
    "review_date" TIMESTAMP(3),
    "retired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_versions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "version_label" TEXT,
    "content" TEXT NOT NULL,
    "plain_text" TEXT NOT NULL,
    "summary" TEXT,
    "change_notes" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL,
    "published_by_id" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_version_translations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "policy_version_id" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "language_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "plain_text" TEXT NOT NULL,
    "translated_by" "translation_source" NOT NULL DEFAULT 'AI',
    "ai_model" TEXT,
    "review_status" "translation_review_status" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "review_notes" TEXT,
    "is_stale" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_version_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_case_associations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "policy_version_id" TEXT,
    "case_id" TEXT NOT NULL,
    "link_type" "policy_case_link_type" NOT NULL,
    "link_reason" TEXT,
    "violation_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "policy_case_associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "source_type" "migration_source_type" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "status" "migration_job_status" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "current_step" TEXT,
    "total_rows" INTEGER,
    "valid_rows" INTEGER,
    "error_rows" INTEGER,
    "imported_rows" INTEGER NOT NULL DEFAULT 0,
    "field_mappings" JSONB,
    "validation_errors" JSONB,
    "preview_data" JSONB,
    "rollback_available_until" TIMESTAMP(3),
    "rolled_back_at" TIMESTAMP(3),
    "rolled_back_by_id" TEXT,
    "error_message" TEXT,
    "error_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "migration_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_field_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source_type" "migration_source_type" NOT NULL,
    "mappings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "migration_field_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "migration_job_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "source_row_number" INTEGER NOT NULL,
    "source_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_after_import" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "migration_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_field_tags" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "source_entity_type" "export_source_type" NOT NULL,
    "source_field_path" TEXT NOT NULL,
    "template_id" TEXT,
    "tag_slot" INTEGER NOT NULL,
    "column_name" TEXT NOT NULL,
    "display_label" TEXT NOT NULL,
    "data_type" "export_data_type" NOT NULL,
    "format_pattern" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "report_field_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "export_type" "export_type" NOT NULL,
    "format" "export_format" NOT NULL,
    "filters" JSONB NOT NULL,
    "columns" JSONB NOT NULL,
    "status" "export_job_status" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "total_rows" INTEGER,
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "file_url" TEXT,
    "file_size_bytes" INTEGER,
    "expires_at" TIMESTAMP(3),
    "error_message" TEXT,
    "error_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboards" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dashboard_type" "dashboard_type" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "layouts" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "widget_type" "widget_type" NOT NULL,
    "title" TEXT NOT NULL,
    "data_source" TEXT,
    "query_config" JSONB,
    "layout_item" JSONB NOT NULL,
    "chart_type" "chart_type",
    "display_config" JSONB,
    "use_dashboard_date_range" BOOLEAN NOT NULL DEFAULT true,
    "date_range_override" JSONB,
    "refresh_interval" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_dashboard_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "is_home" BOOLEAN NOT NULL DEFAULT false,
    "layout_overrides" JSONB,
    "widget_overrides" JSONB,
    "refresh_interval" INTEGER NOT NULL DEFAULT 5,
    "date_range_preset" "date_range_preset" NOT NULL DEFAULT 'LAST_30_DAYS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_dashboard_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_exports" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "export_type" "export_type" NOT NULL,
    "format" "export_format" NOT NULL,
    "filters" JSONB NOT NULL,
    "column_config" JSONB NOT NULL,
    "schedule_type" "schedule_type" NOT NULL,
    "schedule_config" JSONB NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "delivery_method" "delivery_method" NOT NULL,
    "recipients" TEXT[],
    "storage_location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "last_run_status" "schedule_run_status",
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "scheduled_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_export_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "scheduled_export_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" "schedule_run_status" NOT NULL,
    "file_url" TEXT,
    "file_size_bytes" INTEGER,
    "row_count" INTEGER,
    "delivered_to" TEXT[],
    "delivery_status" JSONB,
    "error_message" TEXT,
    "error_details" JSONB,

    CONSTRAINT "scheduled_export_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "milestone_category" NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "status" "milestone_status" NOT NULL DEFAULT 'NOT_STARTED',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "completed_items" INTEGER NOT NULL DEFAULT 0,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "owner_id" TEXT,
    "notes" TEXT,
    "last_status_update" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "milestone_id" TEXT NOT NULL,
    "entity_type" "milestone_item_type" NOT NULL,
    "entity_id" TEXT,
    "custom_title" TEXT,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "weight" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestone_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "implementation_projects" (
    "id" TEXT NOT NULL,
    "client_organization_id" TEXT NOT NULL,
    "type" "implementation_type" NOT NULL,
    "status" "project_status" NOT NULL DEFAULT 'NOT_STARTED',
    "current_phase" "implementation_phase" NOT NULL DEFAULT 'DISCOVERY',
    "lead_implementer_id" TEXT NOT NULL,
    "assigned_user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kickoff_date" TIMESTAMP(3),
    "target_go_live_date" TIMESTAMP(3),
    "actual_go_live_date" TIMESTAMP(3),
    "health_score" INTEGER NOT NULL DEFAULT 100,
    "client_visible_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "implementation_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "implementation_tasks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "phase" "implementation_phase" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "impl_task_status" NOT NULL DEFAULT 'PENDING',
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "assigned_to_id" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "implementation_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "implementation_blockers" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "task_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "blocker_category" NOT NULL,
    "status" "blocker_status" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snooze_until" TIMESTAMP(3),
    "snooze_reason" TEXT,
    "escalated_to_manager_at" TIMESTAMP(3),
    "escalated_to_director_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "resolution_notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "implementation_blockers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "implementation_activities" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" "impl_activity_type" NOT NULL,
    "subject" TEXT,
    "content" TEXT,
    "attendees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "meeting_date" TIMESTAMP(3),
    "decision_rationale" TEXT,
    "email_to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email_cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email_message_id" TEXT,
    "is_auto_logged" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "implementation_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "internal_role" NOT NULL,
    "azure_ad_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impersonation_sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "operator_user_id" TEXT NOT NULL,
    "operator_role" "internal_role" NOT NULL,
    "target_organization_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "ticket_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impersonation_audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impersonation_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "go_live_gates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "readiness_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "go_live_signoffs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "certification_tracks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "track_type" NOT NULL,
    "level" "certification_level" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "version_major" INTEGER NOT NULL DEFAULT 1,
    "estimated_minutes" INTEGER NOT NULL DEFAULT 30,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certification_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "course_type" NOT NULL,
    "content_url" TEXT,
    "content_html" TEXT,
    "estimated_minutes" INTEGER NOT NULL DEFAULT 10,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "passing_score" DOUBLE PRECISION NOT NULL DEFAULT 0.80,
    "questions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "quiz_id" TEXT NOT NULL,
    "user_id" TEXT,
    "internal_user_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" "quiz_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" DOUBLE PRECISION,
    "answers" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_certifications" (
    "id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "user_id" TEXT,
    "internal_user_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "completed_version" TEXT,
    "certificate_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "track_name" TEXT NOT NULL,
    "track_version" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "status" "certificate_status" NOT NULL DEFAULT 'ACTIVE',
    "pdf_url" TEXT,
    "organization_id" TEXT,
    "organization_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_health_scores" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "login_score" INTEGER NOT NULL,
    "case_resolution_score" INTEGER NOT NULL,
    "campaign_completion_score" INTEGER NOT NULL,
    "feature_adoption_score" INTEGER NOT NULL,
    "support_ticket_score" INTEGER NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "trend" "health_trend" NOT NULL,
    "risk_level" "risk_level" NOT NULL,
    "previous_score" INTEGER,
    "alert_level" "alert_level" NOT NULL DEFAULT 'DASHBOARD_ONLY',

    CONSTRAINT "tenant_health_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_metrics" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "metric_date" DATE NOT NULL,
    "active_users" INTEGER NOT NULL,
    "total_users" INTEGER NOT NULL,
    "cases_created" INTEGER NOT NULL,
    "cases_closed" INTEGER NOT NULL,
    "cases_on_time" INTEGER NOT NULL,
    "cases_overdue" INTEGER NOT NULL,
    "campaigns_active" INTEGER NOT NULL DEFAULT 0,
    "assignments_total" INTEGER NOT NULL DEFAULT 0,
    "assignments_completed" INTEGER NOT NULL DEFAULT 0,
    "support_tickets" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_adoptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "first_used_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_adoptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peer_benchmarks" (
    "id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "industry_sector" TEXT,
    "employee_min" INTEGER,
    "employee_max" INTEGER,
    "peer_count" INTEGER NOT NULL,
    "p25" DOUBLE PRECISION NOT NULL,
    "median" DOUBLE PRECISION NOT NULL,
    "p75" DOUBLE PRECISION NOT NULL,
    "mean" DOUBLE PRECISION NOT NULL,
    "min_value" DOUBLE PRECISION NOT NULL,
    "max_value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "peer_benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_is_active_idx" ON "organizations"("is_active");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_organization_id_role_idx" ON "users"("organization_id", "role");

-- CreateIndex
CREATE INDEX "users_organization_id_is_active_idx" ON "users"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "users_sso_provider_sso_id_idx" ON "users"("sso_provider", "sso_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_organization_id_email_key" ON "users"("organization_id", "email");

-- CreateIndex
CREATE INDEX "sessions_organization_id_idx" ON "sessions"("organization_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_revoked_at_idx" ON "sessions"("revoked_at");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_domains_domain_key" ON "tenant_domains"("domain");

-- CreateIndex
CREATE INDEX "tenant_domains_organization_id_idx" ON "tenant_domains"("organization_id");

-- CreateIndex
CREATE INDEX "tenant_domains_domain_idx" ON "tenant_domains"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_sso_configs_organization_id_key" ON "tenant_sso_configs"("organization_id");

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
CREATE INDEX "cases_organization_id_primary_category_id_idx" ON "cases"("organization_id", "primary_category_id");

-- CreateIndex
CREATE INDEX "cases_reference_number_idx" ON "cases"("reference_number");

-- CreateIndex
CREATE INDEX "cases_organization_id_pipeline_stage_idx" ON "cases"("organization_id", "pipeline_stage");

-- CreateIndex
CREATE INDEX "cases_organization_id_outcome_idx" ON "cases"("organization_id", "outcome");

-- CreateIndex
CREATE INDEX "cases_organization_id_is_merged_idx" ON "cases"("organization_id", "is_merged");

-- CreateIndex
CREATE INDEX "cases_merged_into_case_id_idx" ON "cases"("merged_into_case_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_entity_type_entity_id_created_at_idx" ON "audit_logs"("organization_id", "entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_actor_user_id_created_at_idx" ON "audit_logs"("organization_id", "actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_action_category_created_at_idx" ON "audit_logs"("organization_id", "action_category", "created_at");

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

-- CreateIndex
CREATE INDEX "investigation_notes_organization_id_investigation_id_idx" ON "investigation_notes"("organization_id", "investigation_id");

-- CreateIndex
CREATE INDEX "investigation_notes_organization_id_author_id_idx" ON "investigation_notes"("organization_id", "author_id");

-- CreateIndex
CREATE INDEX "investigation_notes_created_at_idx" ON "investigation_notes"("created_at");

-- CreateIndex
CREATE INDEX "investigation_interviews_organization_id_idx" ON "investigation_interviews"("organization_id");

-- CreateIndex
CREATE INDEX "investigation_interviews_organization_id_investigation_id_idx" ON "investigation_interviews"("organization_id", "investigation_id");

-- CreateIndex
CREATE INDEX "investigation_interviews_organization_id_interviewee_person_idx" ON "investigation_interviews"("organization_id", "interviewee_person_id");

-- CreateIndex
CREATE INDEX "investigation_interviews_organization_id_status_idx" ON "investigation_interviews"("organization_id", "status");

-- CreateIndex
CREATE INDEX "interview_templates_organization_id_idx" ON "interview_templates"("organization_id");

-- CreateIndex
CREATE INDEX "interview_templates_organization_id_category_id_idx" ON "interview_templates"("organization_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_templates_organization_id_name_key" ON "interview_templates"("organization_id", "name");

-- CreateIndex
CREATE INDEX "attachments_organization_id_idx" ON "attachments"("organization_id");

-- CreateIndex
CREATE INDEX "attachments_entity_type_entity_id_idx" ON "attachments"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "attachments_organization_id_entity_type_entity_id_idx" ON "attachments"("organization_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "attachments_uploaded_by_id_idx" ON "attachments"("uploaded_by_id");

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
CREATE INDEX "risk_intelligence_units_organization_id_campaign_id_idx" ON "risk_intelligence_units"("organization_id", "campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "riu_hotline_extensions_riu_id_key" ON "riu_hotline_extensions"("riu_id");

-- CreateIndex
CREATE INDEX "riu_hotline_extensions_organization_id_idx" ON "riu_hotline_extensions"("organization_id");

-- CreateIndex
CREATE INDEX "riu_hotline_extensions_qa_status_idx" ON "riu_hotline_extensions"("qa_status");

-- CreateIndex
CREATE UNIQUE INDEX "riu_disclosure_extensions_riu_id_key" ON "riu_disclosure_extensions"("riu_id");

-- CreateIndex
CREATE INDEX "riu_disclosure_extensions_organization_id_idx" ON "riu_disclosure_extensions"("organization_id");

-- CreateIndex
CREATE INDEX "riu_disclosure_extensions_disclosure_type_idx" ON "riu_disclosure_extensions"("disclosure_type");

-- CreateIndex
CREATE INDEX "riu_disclosure_extensions_threshold_triggered_idx" ON "riu_disclosure_extensions"("threshold_triggered");

-- CreateIndex
CREATE INDEX "riu_disclosure_extensions_conflict_detected_idx" ON "riu_disclosure_extensions"("conflict_detected");

-- CreateIndex
CREATE INDEX "riu_disclosure_extensions_form_template_id_idx" ON "riu_disclosure_extensions"("form_template_id");

-- CreateIndex
CREATE INDEX "disclosure_drafts_organization_id_idx" ON "disclosure_drafts"("organization_id");

-- CreateIndex
CREATE INDEX "disclosure_drafts_employee_id_idx" ON "disclosure_drafts"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "disclosure_drafts_organization_id_employee_id_assignment_id_key" ON "disclosure_drafts"("organization_id", "employee_id", "assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "riu_web_form_extensions_riu_id_key" ON "riu_web_form_extensions"("riu_id");

-- CreateIndex
CREATE INDEX "riu_web_form_extensions_organization_id_idx" ON "riu_web_form_extensions"("organization_id");

-- CreateIndex
CREATE INDEX "riu_web_form_extensions_form_definition_id_idx" ON "riu_web_form_extensions"("form_definition_id");

-- CreateIndex
CREATE INDEX "riu_case_associations_organization_id_idx" ON "riu_case_associations"("organization_id");

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

-- CreateIndex
CREATE INDEX "form_definitions_organization_id_idx" ON "form_definitions"("organization_id");

-- CreateIndex
CREATE INDEX "form_definitions_organization_id_form_type_idx" ON "form_definitions"("organization_id", "form_type");

-- CreateIndex
CREATE INDEX "form_definitions_organization_id_is_active_idx" ON "form_definitions"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "form_definitions_organization_id_name_version_key" ON "form_definitions"("organization_id", "name", "version");

-- CreateIndex
CREATE INDEX "form_submissions_organization_id_idx" ON "form_submissions"("organization_id");

-- CreateIndex
CREATE INDEX "form_submissions_organization_id_form_definition_id_idx" ON "form_submissions"("organization_id", "form_definition_id");

-- CreateIndex
CREATE INDEX "form_submissions_organization_id_entity_type_entity_id_idx" ON "form_submissions"("organization_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "form_submissions_anonymous_access_code_idx" ON "form_submissions"("anonymous_access_code");

-- CreateIndex
CREATE INDEX "report_templates_organization_id_idx" ON "report_templates"("organization_id");

-- CreateIndex
CREATE INDEX "report_templates_data_source_idx" ON "report_templates"("data_source");

-- CreateIndex
CREATE INDEX "report_templates_is_system_idx" ON "report_templates"("is_system");

-- CreateIndex
CREATE INDEX "report_executions_organization_id_idx" ON "report_executions"("organization_id");

-- CreateIndex
CREATE INDEX "report_executions_organization_id_status_idx" ON "report_executions"("organization_id", "status");

-- CreateIndex
CREATE INDEX "report_executions_template_id_idx" ON "report_executions"("template_id");

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

-- CreateIndex
CREATE UNIQUE INDEX "employee_compliance_profiles_employee_id_key" ON "employee_compliance_profiles"("employee_id");

-- CreateIndex
CREATE INDEX "employee_compliance_profiles_organization_id_idx" ON "employee_compliance_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "employee_compliance_profiles_is_repeat_non_responder_idx" ON "employee_compliance_profiles"("is_repeat_non_responder");

-- CreateIndex
CREATE INDEX "persons_organization_id_idx" ON "persons"("organization_id");

-- CreateIndex
CREATE INDEX "persons_organization_id_type_idx" ON "persons"("organization_id", "type");

-- CreateIndex
CREATE INDEX "persons_organization_id_status_idx" ON "persons"("organization_id", "status");

-- CreateIndex
CREATE INDEX "persons_organization_id_employee_id_idx" ON "persons"("organization_id", "employee_id");

-- CreateIndex
CREATE INDEX "persons_organization_id_manager_id_idx" ON "persons"("organization_id", "manager_id");

-- CreateIndex
CREATE INDEX "persons_organization_id_business_unit_id_idx" ON "persons"("organization_id", "business_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "persons_organization_id_email_key" ON "persons"("organization_id", "email");

-- CreateIndex
CREATE INDEX "demo_user_sessions_organization_id_idx" ON "demo_user_sessions"("organization_id");

-- CreateIndex
CREATE INDEX "demo_user_sessions_user_id_idx" ON "demo_user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "demo_user_sessions_last_activity_at_idx" ON "demo_user_sessions"("last_activity_at");

-- CreateIndex
CREATE UNIQUE INDEX "demo_user_sessions_organization_id_user_id_key" ON "demo_user_sessions"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "demo_archived_changes_organization_id_idx" ON "demo_archived_changes"("organization_id");

-- CreateIndex
CREATE INDEX "demo_archived_changes_demo_user_session_id_idx" ON "demo_archived_changes"("demo_user_session_id");

-- CreateIndex
CREATE INDEX "demo_archived_changes_archived_at_idx" ON "demo_archived_changes"("archived_at");

-- CreateIndex
CREATE INDEX "demo_archived_changes_expires_at_idx" ON "demo_archived_changes"("expires_at");

-- CreateIndex
CREATE INDEX "demo_archived_changes_entity_type_entity_id_idx" ON "demo_archived_changes"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "segments_organization_id_idx" ON "segments"("organization_id");

-- CreateIndex
CREATE INDEX "segments_organization_id_is_active_idx" ON "segments"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "campaigns_organization_id_idx" ON "campaigns"("organization_id");

-- CreateIndex
CREATE INDEX "campaigns_organization_id_status_idx" ON "campaigns"("organization_id", "status");

-- CreateIndex
CREATE INDEX "campaigns_organization_id_type_idx" ON "campaigns"("organization_id", "type");

-- CreateIndex
CREATE INDEX "campaigns_organization_id_due_date_idx" ON "campaigns"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "campaigns_organization_id_launch_at_idx" ON "campaigns"("organization_id", "launch_at");

-- CreateIndex
CREATE INDEX "campaigns_parent_campaign_id_idx" ON "campaigns"("parent_campaign_id");

-- CreateIndex
CREATE INDEX "campaign_assignments_organization_id_idx" ON "campaign_assignments"("organization_id");

-- CreateIndex
CREATE INDEX "campaign_assignments_organization_id_campaign_id_idx" ON "campaign_assignments"("organization_id", "campaign_id");

-- CreateIndex
CREATE INDEX "campaign_assignments_organization_id_employee_id_idx" ON "campaign_assignments"("organization_id", "employee_id");

-- CreateIndex
CREATE INDEX "campaign_assignments_organization_id_status_idx" ON "campaign_assignments"("organization_id", "status");

-- CreateIndex
CREATE INDEX "campaign_assignments_organization_id_due_date_idx" ON "campaign_assignments"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "campaign_assignments_wave_id_idx" ON "campaign_assignments"("wave_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_assignments_campaign_id_employee_id_key" ON "campaign_assignments"("campaign_id", "employee_id");

-- CreateIndex
CREATE INDEX "campaign_waves_organization_id_idx" ON "campaign_waves"("organization_id");

-- CreateIndex
CREATE INDEX "campaign_waves_organization_id_campaign_id_idx" ON "campaign_waves"("organization_id", "campaign_id");

-- CreateIndex
CREATE INDEX "campaign_waves_organization_id_status_idx" ON "campaign_waves"("organization_id", "status");

-- CreateIndex
CREATE INDEX "campaign_waves_scheduled_at_idx" ON "campaign_waves"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_waves_campaign_id_wave_number_key" ON "campaign_waves"("campaign_id", "wave_number");

-- CreateIndex
CREATE INDEX "org_blackout_dates_organization_id_idx" ON "org_blackout_dates"("organization_id");

-- CreateIndex
CREATE INDEX "org_blackout_dates_organization_id_is_active_idx" ON "org_blackout_dates"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "org_blackout_dates_organization_id_start_date_end_date_idx" ON "org_blackout_dates"("organization_id", "start_date", "end_date");

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
CREATE UNIQUE INDEX "person_case_associations_organization_id_person_id_case_id__key" ON "person_case_associations"("organization_id", "person_id", "case_id", "label");

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

-- CreateIndex
CREATE INDEX "ai_conversations_organization_id_user_id_status_idx" ON "ai_conversations"("organization_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "ai_conversations_organization_id_entity_type_entity_id_idx" ON "ai_conversations"("organization_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ai_conversations_user_id_status_idx" ON "ai_conversations"("user_id", "status");

-- CreateIndex
CREATE INDEX "ai_conversations_status_last_message_at_idx" ON "ai_conversations"("status", "last_message_at");

-- CreateIndex
CREATE INDEX "ai_messages_organization_id_idx" ON "ai_messages"("organization_id");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_created_at_idx" ON "ai_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_context_files_organization_id_scope_is_active_idx" ON "ai_context_files"("organization_id", "scope", "is_active");

-- CreateIndex
CREATE INDEX "ai_context_files_user_id_is_active_idx" ON "ai_context_files"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ai_context_files_organization_id_user_id_name_key" ON "ai_context_files"("organization_id", "user_id", "name");

-- CreateIndex
CREATE INDEX "ai_usage_organization_id_timestamp_idx" ON "ai_usage"("organization_id", "timestamp");

-- CreateIndex
CREATE INDEX "ai_usage_organization_id_feature_type_idx" ON "ai_usage"("organization_id", "feature_type");

-- CreateIndex
CREATE INDEX "ai_usage_user_id_timestamp_idx" ON "ai_usage"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "prompt_templates_organization_id_name_is_active_idx" ON "prompt_templates"("organization_id", "name", "is_active");

-- CreateIndex
CREATE INDEX "prompt_templates_name_is_active_idx" ON "prompt_templates"("name", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_organization_id_name_version_key" ON "prompt_templates"("organization_id", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ai_rate_limits_organization_id_key" ON "ai_rate_limits"("organization_id");

-- CreateIndex
CREATE INDEX "ai_query_history_organization_id_created_at_idx" ON "ai_query_history"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_query_history_user_id_created_at_idx" ON "ai_query_history"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_actions_organization_id_entity_type_entity_id_idx" ON "ai_actions"("organization_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ai_actions_organization_id_user_id_idx" ON "ai_actions"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "ai_actions_conversation_id_idx" ON "ai_actions"("conversation_id");

-- CreateIndex
CREATE INDEX "ai_actions_status_undo_expires_at_idx" ON "ai_actions"("status", "undo_expires_at");

-- CreateIndex
CREATE INDEX "custom_property_definitions_organization_id_entity_type_idx" ON "custom_property_definitions"("organization_id", "entity_type");

-- CreateIndex
CREATE INDEX "custom_property_definitions_organization_id_entity_type_is__idx" ON "custom_property_definitions"("organization_id", "entity_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "custom_property_definitions_organization_id_entity_type_key_key" ON "custom_property_definitions"("organization_id", "entity_type", "key");

-- CreateIndex
CREATE INDEX "remediation_plans_organization_id_idx" ON "remediation_plans"("organization_id");

-- CreateIndex
CREATE INDEX "remediation_plans_organization_id_case_id_idx" ON "remediation_plans"("organization_id", "case_id");

-- CreateIndex
CREATE INDEX "remediation_plans_organization_id_status_idx" ON "remediation_plans"("organization_id", "status");

-- CreateIndex
CREATE INDEX "remediation_plans_organization_id_owner_id_idx" ON "remediation_plans"("organization_id", "owner_id");

-- CreateIndex
CREATE INDEX "remediation_plans_organization_id_due_date_idx" ON "remediation_plans"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "remediation_steps_plan_id_idx" ON "remediation_steps"("plan_id");

-- CreateIndex
CREATE INDEX "remediation_steps_organization_id_idx" ON "remediation_steps"("organization_id");

-- CreateIndex
CREATE INDEX "remediation_steps_organization_id_assignee_user_id_idx" ON "remediation_steps"("organization_id", "assignee_user_id");

-- CreateIndex
CREATE INDEX "remediation_steps_organization_id_status_due_date_idx" ON "remediation_steps"("organization_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "remediation_templates_organization_id_idx" ON "remediation_templates"("organization_id");

-- CreateIndex
CREATE INDEX "remediation_templates_organization_id_category_id_idx" ON "remediation_templates"("organization_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "remediation_templates_organization_id_name_key" ON "remediation_templates"("organization_id", "name");

-- CreateIndex
CREATE INDEX "saved_views_organization_id_created_by_id_idx" ON "saved_views"("organization_id", "created_by_id");

-- CreateIndex
CREATE INDEX "saved_views_organization_id_entity_type_idx" ON "saved_views"("organization_id", "entity_type");

-- CreateIndex
CREATE INDEX "saved_views_organization_id_is_shared_idx" ON "saved_views"("organization_id", "is_shared");

-- CreateIndex
CREATE UNIQUE INDEX "saved_views_organization_id_created_by_id_entity_type_name_key" ON "saved_views"("organization_id", "created_by_id", "entity_type", "name");

-- CreateIndex
CREATE INDEX "investigation_templates_organization_id_tier_idx" ON "investigation_templates"("organization_id", "tier");

-- CreateIndex
CREATE INDEX "investigation_templates_organization_id_category_id_idx" ON "investigation_templates"("organization_id", "category_id");

-- CreateIndex
CREATE INDEX "investigation_templates_organization_id_is_active_is_archiv_idx" ON "investigation_templates"("organization_id", "is_active", "is_archived");

-- CreateIndex
CREATE UNIQUE INDEX "investigation_templates_organization_id_name_version_key" ON "investigation_templates"("organization_id", "name", "version");

-- CreateIndex
CREATE INDEX "category_template_mappings_organization_id_category_id_idx" ON "category_template_mappings"("organization_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_template_mappings_organization_id_category_id_temp_key" ON "category_template_mappings"("organization_id", "category_id", "template_id");

-- CreateIndex
CREATE UNIQUE INDEX "investigation_checklist_progress_investigation_id_key" ON "investigation_checklist_progress"("investigation_id");

-- CreateIndex
CREATE INDEX "investigation_checklist_progress_organization_id_idx" ON "investigation_checklist_progress"("organization_id");

-- CreateIndex
CREATE INDEX "investigation_checklist_progress_organization_id_template_i_idx" ON "investigation_checklist_progress"("organization_id", "template_id");

-- CreateIndex
CREATE INDEX "notifications_organization_id_idx" ON "notifications"("organization_id");

-- CreateIndex
CREATE INDEX "notifications_organization_id_user_id_idx" ON "notifications"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_organization_id_user_id_is_read_idx" ON "notifications"("organization_id", "user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_organization_id_user_id_created_at_idx" ON "notifications"("organization_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_organization_id_type_idx" ON "notifications"("organization_id", "type");

-- CreateIndex
CREATE INDEX "notifications_organization_id_status_idx" ON "notifications"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_notification_id_key" ON "notification_deliveries"("notification_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_organization_id_idx" ON "notification_deliveries"("organization_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries"("status");

-- CreateIndex
CREATE INDEX "notification_deliveries_message_id_idx" ON "notification_deliveries"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notification_preferences_organization_id_idx" ON "notification_preferences"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_organization_id_user_id_key" ON "notification_preferences"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_notification_settings_organization_id_key" ON "org_notification_settings"("organization_id");

-- CreateIndex
CREATE INDEX "email_templates_organization_id_name_is_active_idx" ON "email_templates"("organization_id", "name", "is_active");

-- CreateIndex
CREATE INDEX "email_templates_name_is_active_idx" ON "email_templates"("name", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_organization_id_name_version_key" ON "email_templates"("organization_id", "name", "version");

-- CreateIndex
CREATE INDEX "digest_queue_organization_id_user_id_processed_idx" ON "digest_queue"("organization_id", "user_id", "processed");

-- CreateIndex
CREATE INDEX "digest_queue_processed_created_at_idx" ON "digest_queue"("processed", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "hotline_numbers_phone_number_key" ON "hotline_numbers"("phone_number");

-- CreateIndex
CREATE INDEX "hotline_numbers_organization_id_idx" ON "hotline_numbers"("organization_id");

-- CreateIndex
CREATE INDEX "hotline_numbers_phone_number_idx" ON "hotline_numbers"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "client_qa_configs_organization_id_key" ON "client_qa_configs"("organization_id");

-- CreateIndex
CREATE INDEX "client_directives_organization_id_stage_idx" ON "client_directives"("organization_id", "stage");

-- CreateIndex
CREATE INDEX "client_directives_organization_id_category_id_idx" ON "client_directives"("organization_id", "category_id");

-- CreateIndex
CREATE INDEX "client_directives_organization_id_is_active_idx" ON "client_directives"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_branding_organization_id_key" ON "tenant_branding"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_branding_custom_domain_key" ON "tenant_branding"("custom_domain");

-- CreateIndex
CREATE INDEX "tenant_branding_custom_domain_idx" ON "tenant_branding"("custom_domain");

-- CreateIndex
CREATE INDEX "threshold_rules_organization_id_is_active_idx" ON "threshold_rules"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "threshold_rules_organization_id_disclosureTypes_idx" ON "threshold_rules"("organization_id", "disclosureTypes");

-- CreateIndex
CREATE INDEX "threshold_trigger_logs_organization_id_rule_id_idx" ON "threshold_trigger_logs"("organization_id", "rule_id");

-- CreateIndex
CREATE INDEX "threshold_trigger_logs_organization_id_person_id_idx" ON "threshold_trigger_logs"("organization_id", "person_id");

-- CreateIndex
CREATE INDEX "threshold_trigger_logs_organization_id_triggered_at_idx" ON "threshold_trigger_logs"("organization_id", "triggered_at");

-- CreateIndex
CREATE INDEX "conflict_alerts_organization_id_status_idx" ON "conflict_alerts"("organization_id", "status");

-- CreateIndex
CREATE INDEX "conflict_alerts_disclosure_id_idx" ON "conflict_alerts"("disclosure_id");

-- CreateIndex
CREATE INDEX "conflict_alerts_matched_entity_idx" ON "conflict_alerts"("matched_entity");

-- CreateIndex
CREATE INDEX "disclosure_form_templates_organization_id_disclosure_type_idx" ON "disclosure_form_templates"("organization_id", "disclosure_type");

-- CreateIndex
CREATE INDEX "disclosure_form_templates_organization_id_status_idx" ON "disclosure_form_templates"("organization_id", "status");

-- CreateIndex
CREATE INDEX "disclosure_form_templates_parent_template_id_idx" ON "disclosure_form_templates"("parent_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "disclosure_form_templates_organization_id_name_version_key" ON "disclosure_form_templates"("organization_id", "name", "version");

-- CreateIndex
CREATE INDEX "conflict_exclusions_organization_id_is_active_idx" ON "conflict_exclusions"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "conflict_exclusions_person_id_idx" ON "conflict_exclusions"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "conflict_exclusions_organization_id_person_id_matched_entit_key" ON "conflict_exclusions"("organization_id", "person_id", "matched_entity", "conflict_type");

-- CreateIndex
CREATE INDEX "user_data_tables_organization_id_idx" ON "user_data_tables"("organization_id");

-- CreateIndex
CREATE INDEX "user_data_tables_organization_id_created_by_id_idx" ON "user_data_tables"("organization_id", "created_by_id");

-- CreateIndex
CREATE INDEX "user_data_tables_organization_id_visibility_idx" ON "user_data_tables"("organization_id", "visibility");

-- CreateIndex
CREATE INDEX "user_data_tables_next_scheduled_run_idx" ON "user_data_tables"("next_scheduled_run");

-- CreateIndex
CREATE INDEX "user_data_tables_deleted_at_idx" ON "user_data_tables"("deleted_at");

-- CreateIndex
CREATE INDEX "policies_organization_id_idx" ON "policies"("organization_id");

-- CreateIndex
CREATE INDEX "policies_organization_id_status_idx" ON "policies"("organization_id", "status");

-- CreateIndex
CREATE INDEX "policies_organization_id_policy_type_idx" ON "policies"("organization_id", "policy_type");

-- CreateIndex
CREATE INDEX "policies_organization_id_owner_id_idx" ON "policies"("organization_id", "owner_id");

-- CreateIndex
CREATE INDEX "policies_organization_id_review_date_idx" ON "policies"("organization_id", "review_date");

-- CreateIndex
CREATE UNIQUE INDEX "policies_organization_id_slug_key" ON "policies"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "policy_versions_organization_id_idx" ON "policy_versions"("organization_id");

-- CreateIndex
CREATE INDEX "policy_versions_organization_id_policy_id_idx" ON "policy_versions"("organization_id", "policy_id");

-- CreateIndex
CREATE INDEX "policy_versions_organization_id_is_latest_idx" ON "policy_versions"("organization_id", "is_latest");

-- CreateIndex
CREATE INDEX "policy_versions_organization_id_published_at_idx" ON "policy_versions"("organization_id", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "policy_versions_policy_id_version_key" ON "policy_versions"("policy_id", "version");

-- CreateIndex
CREATE INDEX "policy_version_translations_organization_id_idx" ON "policy_version_translations"("organization_id");

-- CreateIndex
CREATE INDEX "policy_version_translations_organization_id_language_code_idx" ON "policy_version_translations"("organization_id", "language_code");

-- CreateIndex
CREATE INDEX "policy_version_translations_organization_id_review_status_idx" ON "policy_version_translations"("organization_id", "review_status");

-- CreateIndex
CREATE INDEX "policy_version_translations_organization_id_is_stale_idx" ON "policy_version_translations"("organization_id", "is_stale");

-- CreateIndex
CREATE UNIQUE INDEX "policy_version_translations_policy_version_id_language_code_key" ON "policy_version_translations"("policy_version_id", "language_code");

-- CreateIndex
CREATE INDEX "policy_case_associations_organization_id_idx" ON "policy_case_associations"("organization_id");

-- CreateIndex
CREATE INDEX "policy_case_associations_organization_id_policy_id_idx" ON "policy_case_associations"("organization_id", "policy_id");

-- CreateIndex
CREATE INDEX "policy_case_associations_organization_id_case_id_idx" ON "policy_case_associations"("organization_id", "case_id");

-- CreateIndex
CREATE INDEX "policy_case_associations_organization_id_link_type_idx" ON "policy_case_associations"("organization_id", "link_type");

-- CreateIndex
CREATE UNIQUE INDEX "policy_case_associations_policy_id_case_id_key" ON "policy_case_associations"("policy_id", "case_id");

-- CreateIndex
CREATE INDEX "migration_jobs_organization_id_status_idx" ON "migration_jobs"("organization_id", "status");

-- CreateIndex
CREATE INDEX "migration_jobs_organization_id_created_at_idx" ON "migration_jobs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "migration_field_templates_organization_id_source_type_idx" ON "migration_field_templates"("organization_id", "source_type");

-- CreateIndex
CREATE UNIQUE INDEX "migration_field_templates_organization_id_source_type_name_key" ON "migration_field_templates"("organization_id", "source_type", "name");

-- CreateIndex
CREATE INDEX "migration_records_organization_id_idx" ON "migration_records"("organization_id");

-- CreateIndex
CREATE INDEX "migration_records_migration_job_id_idx" ON "migration_records"("migration_job_id");

-- CreateIndex
CREATE INDEX "migration_records_entity_type_entity_id_idx" ON "migration_records"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "report_field_tags_organization_id_idx" ON "report_field_tags"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_field_tags_organization_id_tag_slot_key" ON "report_field_tags"("organization_id", "tag_slot");

-- CreateIndex
CREATE UNIQUE INDEX "report_field_tags_organization_id_source_entity_type_source_key" ON "report_field_tags"("organization_id", "source_entity_type", "source_field_path", "template_id");

-- CreateIndex
CREATE INDEX "export_jobs_organization_id_status_idx" ON "export_jobs"("organization_id", "status");

-- CreateIndex
CREATE INDEX "export_jobs_organization_id_created_at_idx" ON "export_jobs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "export_jobs_created_by_id_idx" ON "export_jobs"("created_by_id");

-- CreateIndex
CREATE INDEX "dashboards_organization_id_dashboard_type_idx" ON "dashboards"("organization_id", "dashboard_type");

-- CreateIndex
CREATE INDEX "dashboards_organization_id_is_default_idx" ON "dashboards"("organization_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "dashboards_organization_id_name_key" ON "dashboards"("organization_id", "name");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboard_id_idx" ON "dashboard_widgets"("dashboard_id");

-- CreateIndex
CREATE INDEX "dashboard_widgets_organization_id_idx" ON "dashboard_widgets"("organization_id");

-- CreateIndex
CREATE INDEX "user_dashboard_configs_user_id_is_home_idx" ON "user_dashboard_configs"("user_id", "is_home");

-- CreateIndex
CREATE INDEX "user_dashboard_configs_organization_id_user_id_idx" ON "user_dashboard_configs"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_dashboard_configs_user_id_dashboard_id_key" ON "user_dashboard_configs"("user_id", "dashboard_id");

-- CreateIndex
CREATE INDEX "scheduled_exports_organization_id_is_active_idx" ON "scheduled_exports"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "scheduled_exports_next_run_at_idx" ON "scheduled_exports"("next_run_at");

-- CreateIndex
CREATE INDEX "scheduled_export_runs_organization_id_idx" ON "scheduled_export_runs"("organization_id");

-- CreateIndex
CREATE INDEX "scheduled_export_runs_scheduled_export_id_started_at_idx" ON "scheduled_export_runs"("scheduled_export_id", "started_at");

-- CreateIndex
CREATE INDEX "milestones_organization_id_status_idx" ON "milestones"("organization_id", "status");

-- CreateIndex
CREATE INDEX "milestones_organization_id_target_date_idx" ON "milestones"("organization_id", "target_date");

-- CreateIndex
CREATE INDEX "milestones_owner_id_idx" ON "milestones"("owner_id");

-- CreateIndex
CREATE INDEX "milestone_items_milestone_id_idx" ON "milestone_items"("milestone_id");

-- CreateIndex
CREATE INDEX "milestone_items_entity_type_entity_id_idx" ON "milestone_items"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "milestone_items_organization_id_idx" ON "milestone_items"("organization_id");

-- CreateIndex
CREATE INDEX "implementation_projects_client_organization_id_idx" ON "implementation_projects"("client_organization_id");

-- CreateIndex
CREATE INDEX "implementation_projects_lead_implementer_id_idx" ON "implementation_projects"("lead_implementer_id");

-- CreateIndex
CREATE INDEX "implementation_projects_status_idx" ON "implementation_projects"("status");

-- CreateIndex
CREATE INDEX "implementation_projects_current_phase_idx" ON "implementation_projects"("current_phase");

-- CreateIndex
CREATE INDEX "implementation_tasks_project_id_idx" ON "implementation_tasks"("project_id");

-- CreateIndex
CREATE INDEX "implementation_tasks_phase_idx" ON "implementation_tasks"("phase");

-- CreateIndex
CREATE INDEX "implementation_tasks_status_idx" ON "implementation_tasks"("status");

-- CreateIndex
CREATE INDEX "implementation_tasks_assigned_to_id_idx" ON "implementation_tasks"("assigned_to_id");

-- CreateIndex
CREATE INDEX "implementation_blockers_project_id_idx" ON "implementation_blockers"("project_id");

-- CreateIndex
CREATE INDEX "implementation_blockers_status_idx" ON "implementation_blockers"("status");

-- CreateIndex
CREATE INDEX "implementation_blockers_created_at_idx" ON "implementation_blockers"("created_at");

-- CreateIndex
CREATE INDEX "implementation_blockers_category_idx" ON "implementation_blockers"("category");

-- CreateIndex
CREATE INDEX "implementation_activities_project_id_idx" ON "implementation_activities"("project_id");

-- CreateIndex
CREATE INDEX "implementation_activities_type_idx" ON "implementation_activities"("type");

-- CreateIndex
CREATE INDEX "implementation_activities_created_at_idx" ON "implementation_activities"("created_at");

-- CreateIndex
CREATE INDEX "implementation_activities_created_by_id_idx" ON "implementation_activities"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "internal_users_email_key" ON "internal_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "internal_users_azure_ad_id_key" ON "internal_users"("azure_ad_id");

-- CreateIndex
CREATE INDEX "impersonation_sessions_organization_id_idx" ON "impersonation_sessions"("organization_id");

-- CreateIndex
CREATE INDEX "impersonation_sessions_operator_user_id_idx" ON "impersonation_sessions"("operator_user_id");

-- CreateIndex
CREATE INDEX "impersonation_sessions_target_organization_id_idx" ON "impersonation_sessions"("target_organization_id");

-- CreateIndex
CREATE INDEX "impersonation_sessions_started_at_idx" ON "impersonation_sessions"("started_at");

-- CreateIndex
CREATE INDEX "impersonation_audit_logs_organization_id_idx" ON "impersonation_audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "impersonation_audit_logs_session_id_idx" ON "impersonation_audit_logs"("session_id");

-- CreateIndex
CREATE INDEX "impersonation_audit_logs_action_idx" ON "impersonation_audit_logs"("action");

-- CreateIndex
CREATE INDEX "impersonation_audit_logs_created_at_idx" ON "impersonation_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "go_live_gates_organization_id_idx" ON "go_live_gates"("organization_id");

-- CreateIndex
CREATE INDEX "go_live_gates_project_id_idx" ON "go_live_gates"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "go_live_gates_project_id_gate_id_key" ON "go_live_gates"("project_id", "gate_id");

-- CreateIndex
CREATE INDEX "readiness_items_organization_id_idx" ON "readiness_items"("organization_id");

-- CreateIndex
CREATE INDEX "readiness_items_project_id_idx" ON "readiness_items"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "readiness_items_project_id_item_id_key" ON "readiness_items"("project_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "go_live_signoffs_project_id_key" ON "go_live_signoffs"("project_id");

-- CreateIndex
CREATE INDEX "go_live_signoffs_organization_id_idx" ON "go_live_signoffs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "certification_tracks_slug_key" ON "certification_tracks"("slug");

-- CreateIndex
CREATE INDEX "certification_tracks_type_idx" ON "certification_tracks"("type");

-- CreateIndex
CREATE INDEX "certification_tracks_level_idx" ON "certification_tracks"("level");

-- CreateIndex
CREATE INDEX "certification_tracks_is_active_idx" ON "certification_tracks"("is_active");

-- CreateIndex
CREATE INDEX "courses_track_id_idx" ON "courses"("track_id");

-- CreateIndex
CREATE INDEX "courses_is_active_idx" ON "courses"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "quizzes_course_id_key" ON "quizzes"("course_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_organization_id_idx" ON "quiz_attempts"("organization_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_quiz_id_idx" ON "quiz_attempts"("quiz_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_user_id_idx" ON "quiz_attempts"("user_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_internal_user_id_idx" ON "quiz_attempts"("internal_user_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_status_idx" ON "quiz_attempts"("status");

-- CreateIndex
CREATE INDEX "user_certifications_user_id_idx" ON "user_certifications"("user_id");

-- CreateIndex
CREATE INDEX "user_certifications_internal_user_id_idx" ON "user_certifications"("internal_user_id");

-- CreateIndex
CREATE INDEX "user_certifications_completed_at_idx" ON "user_certifications"("completed_at");

-- CreateIndex
CREATE INDEX "user_certifications_expires_at_idx" ON "user_certifications"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_certifications_track_id_user_id_key" ON "user_certifications"("track_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_certifications_track_id_internal_user_id_key" ON "user_certifications"("track_id", "internal_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificate_number_key" ON "certificates"("certificate_number");

-- CreateIndex
CREATE INDEX "certificates_status_idx" ON "certificates"("status");

-- CreateIndex
CREATE INDEX "certificates_organization_id_idx" ON "certificates"("organization_id");

-- CreateIndex
CREATE INDEX "certificates_issued_at_idx" ON "certificates"("issued_at");

-- CreateIndex
CREATE INDEX "tenant_health_scores_organization_id_idx" ON "tenant_health_scores"("organization_id");

-- CreateIndex
CREATE INDEX "tenant_health_scores_calculated_at_idx" ON "tenant_health_scores"("calculated_at");

-- CreateIndex
CREATE INDEX "tenant_health_scores_risk_level_idx" ON "tenant_health_scores"("risk_level");

-- CreateIndex
CREATE INDEX "usage_metrics_organization_id_idx" ON "usage_metrics"("organization_id");

-- CreateIndex
CREATE INDEX "usage_metrics_metric_date_idx" ON "usage_metrics"("metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "usage_metrics_organization_id_metric_date_key" ON "usage_metrics"("organization_id", "metric_date");

-- CreateIndex
CREATE INDEX "feature_adoptions_organization_id_idx" ON "feature_adoptions"("organization_id");

-- CreateIndex
CREATE INDEX "feature_adoptions_feature_key_idx" ON "feature_adoptions"("feature_key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_adoptions_organization_id_feature_key_key" ON "feature_adoptions"("organization_id", "feature_key");

-- CreateIndex
CREATE INDEX "peer_benchmarks_metric_name_idx" ON "peer_benchmarks"("metric_name");

-- CreateIndex
CREATE INDEX "peer_benchmarks_calculated_at_idx" ON "peer_benchmarks"("calculated_at");

-- CreateIndex
CREATE UNIQUE INDEX "peer_benchmarks_metric_name_industry_sector_employee_min_em_key" ON "peer_benchmarks"("metric_name", "industry_sector", "employee_min", "employee_max", "calculated_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_sso_configs" ADD CONSTRAINT "tenant_sso_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_demo_user_session_id_fkey" FOREIGN KEY ("demo_user_session_id") REFERENCES "demo_user_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_primary_category_id_fkey" FOREIGN KEY ("primary_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_secondary_category_id_fkey" FOREIGN KEY ("secondary_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_demo_user_session_id_fkey" FOREIGN KEY ("demo_user_session_id") REFERENCES "demo_user_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_notes" ADD CONSTRAINT "investigation_notes_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_notes" ADD CONSTRAINT "investigation_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_interviews" ADD CONSTRAINT "investigation_interviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_interviews" ADD CONSTRAINT "investigation_interviews_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_templates" ADD CONSTRAINT "interview_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "risk_intelligence_units" ADD CONSTRAINT "risk_intelligence_units_demo_user_session_id_fkey" FOREIGN KEY ("demo_user_session_id") REFERENCES "demo_user_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_intelligence_units" ADD CONSTRAINT "risk_intelligence_units_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riu_hotline_extensions" ADD CONSTRAINT "riu_hotline_extensions_riu_id_fkey" FOREIGN KEY ("riu_id") REFERENCES "risk_intelligence_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riu_disclosure_extensions" ADD CONSTRAINT "riu_disclosure_extensions_riu_id_fkey" FOREIGN KEY ("riu_id") REFERENCES "risk_intelligence_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riu_disclosure_extensions" ADD CONSTRAINT "riu_disclosure_extensions_form_template_id_fkey" FOREIGN KEY ("form_template_id") REFERENCES "disclosure_form_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disclosure_drafts" ADD CONSTRAINT "disclosure_drafts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disclosure_drafts" ADD CONSTRAINT "disclosure_drafts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disclosure_drafts" ADD CONSTRAINT "disclosure_drafts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "campaign_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disclosure_drafts" ADD CONSTRAINT "disclosure_drafts_form_template_id_fkey" FOREIGN KEY ("form_template_id") REFERENCES "disclosure_form_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riu_web_form_extensions" ADD CONSTRAINT "riu_web_form_extensions_riu_id_fkey" FOREIGN KEY ("riu_id") REFERENCES "risk_intelligence_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riu_case_associations" ADD CONSTRAINT "riu_case_associations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_definition_id_fkey" FOREIGN KEY ("form_definition_id") REFERENCES "form_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "report_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "employee_compliance_profiles" ADD CONSTRAINT "employee_compliance_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_compliance_profiles" ADD CONSTRAINT "employee_compliance_profiles_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_merged_into_primary_id_fkey" FOREIGN KEY ("merged_into_primary_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_user_sessions" ADD CONSTRAINT "demo_user_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_user_sessions" ADD CONSTRAINT "demo_user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_archived_changes" ADD CONSTRAINT "demo_archived_changes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_archived_changes" ADD CONSTRAINT "demo_archived_changes_demo_user_session_id_fkey" FOREIGN KEY ("demo_user_session_id") REFERENCES "demo_user_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_disclosure_form_template_id_fkey" FOREIGN KEY ("disclosure_form_template_id") REFERENCES "disclosure_form_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_parent_campaign_id_fkey" FOREIGN KEY ("parent_campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_wave_id_fkey" FOREIGN KEY ("wave_id") REFERENCES "campaign_waves"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_waves" ADD CONSTRAINT "campaign_waves_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_waves" ADD CONSTRAINT "campaign_waves_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_blackout_dates" ADD CONSTRAINT "org_blackout_dates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_property_definitions" ADD CONSTRAINT "custom_property_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_plans" ADD CONSTRAINT "remediation_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_plans" ADD CONSTRAINT "remediation_plans_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_steps" ADD CONSTRAINT "remediation_steps_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "remediation_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_templates" ADD CONSTRAINT "remediation_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_templates" ADD CONSTRAINT "investigation_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_template_mappings" ADD CONSTRAINT "category_template_mappings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_template_mappings" ADD CONSTRAINT "category_template_mappings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_template_mappings" ADD CONSTRAINT "category_template_mappings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "investigation_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_checklist_progress" ADD CONSTRAINT "investigation_checklist_progress_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_checklist_progress" ADD CONSTRAINT "investigation_checklist_progress_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_checklist_progress" ADD CONSTRAINT "investigation_checklist_progress_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "investigation_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_backup_user_id_fkey" FOREIGN KEY ("backup_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_notification_settings" ADD CONSTRAINT "org_notification_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digest_queue" ADD CONSTRAINT "digest_queue_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digest_queue" ADD CONSTRAINT "digest_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotline_numbers" ADD CONSTRAINT "hotline_numbers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_qa_configs" ADD CONSTRAINT "client_qa_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_directives" ADD CONSTRAINT "client_directives_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_directives" ADD CONSTRAINT "client_directives_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threshold_rules" ADD CONSTRAINT "threshold_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threshold_rules" ADD CONSTRAINT "threshold_rules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threshold_trigger_logs" ADD CONSTRAINT "threshold_trigger_logs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "threshold_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threshold_trigger_logs" ADD CONSTRAINT "threshold_trigger_logs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_alerts" ADD CONSTRAINT "conflict_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_alerts" ADD CONSTRAINT "conflict_alerts_disclosure_id_fkey" FOREIGN KEY ("disclosure_id") REFERENCES "riu_disclosure_extensions"("riu_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_alerts" ADD CONSTRAINT "conflict_alerts_dismissed_by_fkey" FOREIGN KEY ("dismissed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_alerts" ADD CONSTRAINT "conflict_alerts_escalated_to_case_id_fkey" FOREIGN KEY ("escalated_to_case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_alerts" ADD CONSTRAINT "conflict_alerts_exclusion_id_fkey" FOREIGN KEY ("exclusion_id") REFERENCES "conflict_exclusions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disclosure_form_templates" ADD CONSTRAINT "disclosure_form_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disclosure_form_templates" ADD CONSTRAINT "disclosure_form_templates_parent_template_id_fkey" FOREIGN KEY ("parent_template_id") REFERENCES "disclosure_form_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disclosure_form_templates" ADD CONSTRAINT "disclosure_form_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_exclusions" ADD CONSTRAINT "conflict_exclusions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_exclusions" ADD CONSTRAINT "conflict_exclusions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_exclusions" ADD CONSTRAINT "conflict_exclusions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_data_tables" ADD CONSTRAINT "user_data_tables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_data_tables" ADD CONSTRAINT "user_data_tables_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_draft_updated_by_id_fkey" FOREIGN KEY ("draft_updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_version_translations" ADD CONSTRAINT "policy_version_translations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_version_translations" ADD CONSTRAINT "policy_version_translations_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_version_translations" ADD CONSTRAINT "policy_version_translations_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_case_associations" ADD CONSTRAINT "policy_case_associations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_case_associations" ADD CONSTRAINT "policy_case_associations_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_case_associations" ADD CONSTRAINT "policy_case_associations_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_case_associations" ADD CONSTRAINT "policy_case_associations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_case_associations" ADD CONSTRAINT "policy_case_associations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_jobs" ADD CONSTRAINT "migration_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_jobs" ADD CONSTRAINT "migration_jobs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_field_templates" ADD CONSTRAINT "migration_field_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_records" ADD CONSTRAINT "migration_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_records" ADD CONSTRAINT "migration_records_migration_job_id_fkey" FOREIGN KEY ("migration_job_id") REFERENCES "migration_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_field_tags" ADD CONSTRAINT "report_field_tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dashboard_configs" ADD CONSTRAINT "user_dashboard_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dashboard_configs" ADD CONSTRAINT "user_dashboard_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dashboard_configs" ADD CONSTRAINT "user_dashboard_configs_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_exports" ADD CONSTRAINT "scheduled_exports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_exports" ADD CONSTRAINT "scheduled_exports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_export_runs" ADD CONSTRAINT "scheduled_export_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_export_runs" ADD CONSTRAINT "scheduled_export_runs_scheduled_export_id_fkey" FOREIGN KEY ("scheduled_export_id") REFERENCES "scheduled_exports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_items" ADD CONSTRAINT "milestone_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_items" ADD CONSTRAINT "milestone_items_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementation_projects" ADD CONSTRAINT "implementation_projects_client_organization_id_fkey" FOREIGN KEY ("client_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementation_tasks" ADD CONSTRAINT "implementation_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "implementation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementation_blockers" ADD CONSTRAINT "implementation_blockers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "implementation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "implementation_activities" ADD CONSTRAINT "implementation_activities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "implementation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_operator_user_id_fkey" FOREIGN KEY ("operator_user_id") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_audit_logs" ADD CONSTRAINT "impersonation_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_audit_logs" ADD CONSTRAINT "impersonation_audit_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "impersonation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "go_live_gates" ADD CONSTRAINT "go_live_gates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "go_live_gates" ADD CONSTRAINT "go_live_gates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "implementation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_items" ADD CONSTRAINT "readiness_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_items" ADD CONSTRAINT "readiness_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "implementation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "go_live_signoffs" ADD CONSTRAINT "go_live_signoffs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "go_live_signoffs" ADD CONSTRAINT "go_live_signoffs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "implementation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "certification_tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_certifications" ADD CONSTRAINT "user_certifications_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "certification_tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_certifications" ADD CONSTRAINT "user_certifications_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_health_scores" ADD CONSTRAINT "tenant_health_scores_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_metrics" ADD CONSTRAINT "usage_metrics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_adoptions" ADD CONSTRAINT "feature_adoptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

