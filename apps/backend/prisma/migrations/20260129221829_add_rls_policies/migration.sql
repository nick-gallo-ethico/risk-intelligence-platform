-- ===========================================
-- Row-Level Security (RLS) Policies
-- ===========================================
-- These policies ensure tenant isolation at the database level.
-- Even if application code has bugs, data cannot leak across tenants.

-- Enable RLS on all tenant-scoped tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- Users Table Policies
-- ===========================================

-- Policy: Users can only see/modify users in their own organization
CREATE POLICY "users_tenant_isolation" ON "users"
    FOR ALL
    USING (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- ===========================================
-- Sessions Table Policies
-- ===========================================

-- Policy: Sessions can only be accessed within the same organization
CREATE POLICY "sessions_tenant_isolation" ON "sessions"
    FOR ALL
    USING (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- ===========================================
-- Note: Organizations Table
-- ===========================================
-- Organizations table does NOT have RLS because:
-- 1. It doesn't have organization_id column (it IS the organization)
-- 2. Auth flow needs to look up org before tenant context is set
-- Access control is handled at application level for this table.
