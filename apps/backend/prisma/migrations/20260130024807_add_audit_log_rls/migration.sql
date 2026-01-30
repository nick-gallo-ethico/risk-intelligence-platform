-- ===========================================
-- Row-Level Security (RLS) Policies for Audit Log
-- ===========================================
-- Audit logs are IMMUTABLE - they can only be created and read.
-- No UPDATE or DELETE policies are defined to enforce append-only behavior.

-- Enable RLS on audit_logs table
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- SELECT Policy: Read audit logs within organization
-- ===========================================
-- Users can only see audit logs for their own organization.
-- Bypass allowed for administrative/migration operations.

CREATE POLICY "audit_log_tenant_isolation_select" ON "audit_logs"
    FOR SELECT
    USING (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- ===========================================
-- INSERT Policy: Create audit logs within organization
-- ===========================================
-- Users can only create audit logs for their own organization.
-- Bypass allowed for system operations that need to log across contexts.

CREATE POLICY "audit_log_tenant_isolation_insert" ON "audit_logs"
    FOR INSERT
    WITH CHECK (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- ===========================================
-- NOTE: No UPDATE or DELETE policies
-- ===========================================
-- Audit logs are append-only by design. Any attempt to UPDATE or DELETE
-- will be blocked by RLS (no policy = denied). This ensures:
-- 1. Compliance audit trails cannot be tampered with
-- 2. Historical data integrity is preserved
-- 3. AI context building has reliable, immutable data
