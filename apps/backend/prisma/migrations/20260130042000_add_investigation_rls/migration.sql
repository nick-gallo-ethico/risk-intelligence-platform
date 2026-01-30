-- ===========================================
-- Row-Level Security (RLS) Policies for Investigation
-- ===========================================
-- These policies ensure tenant isolation at the database level.
-- organizationId is denormalized from Case for efficient RLS filtering.

-- Enable RLS on investigations table
ALTER TABLE "investigations" ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- Investigations Table Policies
-- ===========================================

-- Policy: Investigations can only be accessed within the same organization
-- Uses denormalized organization_id for efficient filtering (no join to cases needed)
CREATE POLICY "investigations_tenant_isolation" ON "investigations"
    FOR ALL
    USING (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );
