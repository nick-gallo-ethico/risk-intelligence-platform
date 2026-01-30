-- ===========================================
-- Row-Level Security (RLS) Policies for Investigation Notes
-- ===========================================
-- Investigation notes contain sensitive investigation details.
-- RLS enforces tenant isolation; visibility-based filtering (PRIVATE/TEAM/ALL)
-- is handled at the application layer, not in RLS policies.

-- Enable RLS on investigation_notes table
ALTER TABLE "investigation_notes" ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- SELECT Policy: Read notes within organization
-- ===========================================
-- Users can only see investigation notes for their own organization.
-- Bypass allowed for administrative/migration operations.

CREATE POLICY "investigation_notes_tenant_select" ON "investigation_notes"
    FOR SELECT
    USING (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- ===========================================
-- INSERT Policy: Create notes within organization
-- ===========================================
-- Users can only create investigation notes for their own organization.
-- The organizationId is denormalized from Investigation for RLS efficiency.

CREATE POLICY "investigation_notes_tenant_insert" ON "investigation_notes"
    FOR INSERT
    WITH CHECK (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- ===========================================
-- UPDATE Policy: Update notes within organization
-- ===========================================
-- Users can only update investigation notes in their own organization.
-- Author-based restrictions (only author can edit) are enforced at
-- the application layer, not in RLS.

CREATE POLICY "investigation_notes_tenant_update" ON "investigation_notes"
    FOR UPDATE
    USING (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- ===========================================
-- DELETE Policy: Delete notes within organization
-- ===========================================
-- Users can only delete investigation notes in their own organization.
-- Author-based restrictions (only author can delete) are enforced at
-- the application layer, not in RLS.

CREATE POLICY "investigation_notes_tenant_delete" ON "investigation_notes"
    FOR DELETE
    USING (
        organization_id::text = current_setting('app.current_organization', true)
        OR current_setting('app.bypass_rls', true) = 'true'
    );
