# 09-02 Summary: Form Template CRUD Service

## What Was Built

Created the disclosure form template CRUD service with versioning support per RS.32.

### Files Created/Modified

1. **apps/backend/src/modules/disclosures/disclosure-form.service.ts** - Form template CRUD with versioning
   - `create()` - Creates draft templates with field/section configuration
   - `update()` - Updates draft templates (rejects published)
   - `publish()` - Makes templates immutable, creates new version if submissions exist
   - `clone()` - Duplicates templates, optionally as translation child
   - `archive()` - Soft deletes (checks for active campaigns first)
   - `findOne()` / `findMany()` - Query templates with filtering
   - `getVersions()` - Get all versions of a template by name

2. **apps/backend/src/modules/disclosures/disclosure-form.controller.ts** - REST endpoints
   - `POST /api/v1/disclosure-forms` - Create template
   - `GET /api/v1/disclosure-forms` - List templates
   - `GET /api/v1/disclosure-forms/:id` - Get template
   - `PUT /api/v1/disclosure-forms/:id` - Update template
   - `POST /api/v1/disclosure-forms/:id/publish` - Publish template
   - `POST /api/v1/disclosure-forms/:id/clone` - Clone template
   - `POST /api/v1/disclosure-forms/:id/translations` - Create translation
   - `DELETE /api/v1/disclosure-forms/:id` - Archive template

3. **apps/backend/src/modules/disclosures/disclosures.module.ts** - Module registration

## Key Decisions

- **Version-on-publish pattern**: Publishing a template with existing submissions creates a new version
- **Translation support**: Cloning with `asTranslation: true` links child to parent via `parentTemplateId`
- **Stale detection**: Translations track `parentVersionAtCreation` to detect when parent has newer version
- **Archive protection**: Cannot archive templates with active campaigns

## Verification

✅ TypeScript compiles without errors
✅ Service implements all CRUD operations
✅ Controller exposes REST endpoints per spec API
✅ Module exports service for use by other modules

## Dependencies Satisfied

- Depends on: 09-01 (Disclosure Form Schema Engine) ✅
- Required by: 09-06 (Disclosure Submission), 09-10 (Campaign Translation)
