-- Add database indexes for common query patterns
-- These indexes improve query performance for the most common access patterns
-- Using CONCURRENTLY where possible to avoid locking tables during creation

-- ============================================
-- CASE TABLE INDEXES
-- ============================================

-- Index for case list queries filtered by organization and status
-- Used by: Case list view, dashboard counts, workflow queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cases_org_status"
ON "cases" ("organization_id", "status");

-- Index for case assignment queries
-- Used by: My cases view, workload distribution
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cases_org_assignee"
ON "cases" ("organization_id", "assignee_id")
WHERE "assignee_id" IS NOT NULL;

-- Index for case listing sorted by creation date (most common sort)
-- Used by: Recent cases, case list default sort
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cases_org_created_desc"
ON "cases" ("organization_id", "created_at" DESC);

-- Composite index for priority + status filtering
-- Used by: High priority case views, SLA monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cases_org_priority_status"
ON "cases" ("organization_id", "severity", "status");

-- Index for category filtering
-- Used by: Case reports by category, category dashboards
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cases_org_category"
ON "cases" ("organization_id", "primary_category_id")
WHERE "primary_category_id" IS NOT NULL;

-- ============================================
-- RIU TABLE INDEXES
-- ============================================

-- Index for RIU queries by organization and status
-- Used by: RIU list view, pending RIU counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rius_org_status"
ON "risk_intelligence_units" ("organization_id", "status");

-- Index for RIU listing sorted by creation date
-- Used by: Recent RIUs, intake queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rius_org_created_desc"
ON "risk_intelligence_units" ("organization_id", "created_at" DESC);

-- Index for RIU to case lookup (foreign key support)
-- Used by: Case detail view loading RIUs
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_rius_case_id"
ON "risk_intelligence_units" ("case_id")
WHERE "case_id" IS NOT NULL;

-- ============================================
-- INVESTIGATION TABLE INDEXES
-- ============================================

-- Index for investigation to case lookup
-- Used by: Case detail view loading investigations
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_investigations_case_id"
ON "investigations" ("case_id");

-- Index for investigation queries by organization and status
-- Used by: Investigation list, active investigations count
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_investigations_org_status"
ON "investigations" ("organization_id", "status");

-- Index for investigation assignment queries
-- Used by: My investigations view, investigator workload
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_investigations_org_assignee"
ON "investigations" ("organization_id", "lead_investigator_id")
WHERE "lead_investigator_id" IS NOT NULL;

-- ============================================
-- AUDIT LOG INDEXES
-- ============================================

-- Index for audit log queries by organization and time
-- Used by: Audit reports, compliance reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_log_org_created_desc"
ON "audit_logs" ("organization_id", "created_at" DESC);

-- Index for entity-specific audit queries
-- Used by: Entity history views, change tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_log_entity"
ON "audit_logs" ("entity_type", "entity_id");

-- Index for actor-based audit queries
-- Used by: User activity reports, security auditing
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_log_actor_created"
ON "audit_logs" ("actor_user_id", "created_at" DESC)
WHERE "actor_user_id" IS NOT NULL;

-- ============================================
-- NOTIFICATION INDEXES
-- ============================================

-- Composite index for notification queries (user's unread notifications)
-- Used by: Notification bell, unread count
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_user_read_created"
ON "notifications" ("user_id", "is_read", "created_at" DESC);

-- Index for notification cleanup (old read notifications)
-- Used by: Notification archival jobs
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_user_created"
ON "notifications" ("user_id", "created_at" DESC);

-- ============================================
-- INTERNAL OPERATIONS INDEXES (Phase 12)
-- ============================================

-- Index for impersonation session lookup by operator
-- Used by: Operator audit, session management
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_impersonation_operator"
ON "impersonation_sessions" ("operator_id");

-- Index for impersonation session lookup by organization
-- Used by: Tenant admin viewing impersonation history
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_impersonation_org"
ON "impersonation_sessions" ("organization_id");

-- Index for implementation project queries by organization
-- Used by: Implementation tracking dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_impl_project_org_status"
ON "implementation_projects" ("organization_id", "status");

-- Index for tenant health score queries
-- Used by: Client success dashboard, health trend analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_health_score_org_date"
ON "tenant_health_scores" ("organization_id", "calculated_at" DESC);

-- ============================================
-- USER AND SESSION INDEXES
-- ============================================

-- Index for user lookup by email within organization
-- Used by: Login, user search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_org_email"
ON "users" ("organization_id", "email");

-- Index for session cleanup (expired sessions)
-- Used by: Session cleanup job
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sessions_expires"
ON "sessions" ("expires_at")
WHERE "revoked_at" IS NULL;

-- Index for active sessions by user
-- Used by: Session management, security page
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sessions_user_created"
ON "sessions" ("user_id", "created_at" DESC)
WHERE "revoked_at" IS NULL;

-- ============================================
-- CAMPAIGN AND DISCLOSURE INDEXES (Phase 9)
-- ============================================

-- Index for campaign queries by organization and status
-- Used by: Campaign management dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_campaigns_org_status"
ON "campaigns" ("organization_id", "status");

-- Index for campaign assignment queries
-- Used by: Employee task list, campaign progress tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_campaign_assignments_user_status"
ON "campaign_assignments" ("user_id", "status");

-- Index for conflict alerts by organization
-- Used by: Conflict dashboard, compliance reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_conflict_alerts_org_status"
ON "conflict_alerts" ("organization_id", "status");

-- ============================================
-- WORKFLOW INDEXES (Phase 4)
-- ============================================

-- Index for workflow instance queries
-- Used by: Active workflows, workflow dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workflow_instances_org_status"
ON "workflow_instances" ("organization_id", "status");

-- Index for workflow instance by entity (case, investigation, etc.)
-- Used by: Entity workflow status lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workflow_instances_entity"
ON "workflow_instances" ("entity_type", "entity_id");
