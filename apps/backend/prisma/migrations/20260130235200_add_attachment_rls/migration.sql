-- ===========================================
-- Row-Level Security (RLS) Policies for Attachments
-- ===========================================
-- Attachments can contain sensitive documents attached to cases,
-- investigations, and investigation notes. RLS enforces tenant isolation
-- at the database level.

-- Enable RLS on attachments table
ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- SELECT Policy: Read attachments within organization
-- ===========================================
-- Users can only see attachments for their own organization.
-- Bypass allowed for administrative/migration operations.

CREATE POLICY "attachments_tenant_select" ON "attachments"
    FOR SELECT
    USING (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- ===========================================
-- INSERT Policy: Create attachments within organization
-- ===========================================
-- Users can only create attachments for their own organization.

CREATE POLICY "attachments_tenant_insert" ON "attachments"
    FOR INSERT
    WITH CHECK (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- ===========================================
-- UPDATE Policy: Update attachments within organization
-- ===========================================
-- Users can only update attachments in their own organization.
-- Uploader-based restrictions are enforced at the application layer.

CREATE POLICY "attachments_tenant_update" ON "attachments"
    FOR UPDATE
    USING (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- ===========================================
-- DELETE Policy: Delete attachments within organization
-- ===========================================
-- Users can only delete attachments in their own organization.
-- Permission-based restrictions are enforced at the application layer.

CREATE POLICY "attachments_tenant_delete" ON "attachments"
    FOR DELETE
    USING (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );
