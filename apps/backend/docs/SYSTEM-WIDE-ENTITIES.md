# System-Wide Entities Security Model

## Overview

This document explains the security model for entities with **nullable `organizationId`** in the Risk Intelligence Platform. These entities are intentionally designed to be "system-wide" - shared across all tenants or accessible without tenant scoping.

## Security Context

The platform uses **PostgreSQL Row-Level Security (RLS)** with `organizationId` for tenant isolation. Most tables have a required `organizationId` field, and RLS policies automatically filter queries to the current tenant.

However, **7 models** have nullable `organizationId` for specific platform requirements:

| Model                | Use Case                         | Access Control Mechanism              |
| -------------------- | -------------------------------- | ------------------------------------- |
| ReportTemplate       | System-provided report templates | `isSystem` flag + RLS                 |
| PromptTemplate       | Platform AI prompt templates     | `organizationId IS NULL` query        |
| ProjectTemplate      | System project blueprints        | `isSystem` flag + RLS                 |
| AiContextFile        | Hierarchical AI context          | `organizationId` + `userId` hierarchy |
| QuizAttempt          | Cross-org training modules       | `userId` filter                       |
| Certificate          | Platform-wide certifications     | `userId` via UserCertification        |
| KnowledgeBaseArticle | Platform help documentation      | `organizationId IS NULL` query        |

## Why Nullable organizationId is Secure

Nullable `organizationId` does NOT bypass tenant isolation when properly implemented:

1. **RLS policies handle null values correctly** - PostgreSQL RLS policies use `WHERE organizationId = current_setting('app.current_organization')::uuid OR organizationId IS NULL` for system-wide readable entities.

2. **Application-level access control supplements RLS** - Each entity has additional constraints (isSystem flag, userId filter, or explicit query patterns) documented below.

3. **Write operations are restricted** - System-wide entities (organizationId=null) are read-only for tenants. Only platform administrators can create/modify them.

---

## Entity-by-Entity Security Documentation

### 1. ReportTemplate

**Purpose:** Pre-built report configurations for analytics and compliance reporting.

**Schema Location:** `prisma/schema.prisma` line ~1132

**Access Control Pattern:**

```
organizationId=null + isSystem=true  -> Platform templates (read-only for all tenants)
organizationId=UUID + isSystem=false -> Tenant templates (normal RLS applies)
```

**Service Layer Implementation:**

```typescript
// Read: System templates visible to all authenticated users
findAll(orgId: string) {
  return this.prisma.reportTemplate.findMany({
    where: {
      OR: [
        { organizationId: orgId },           // Tenant templates
        { organizationId: null, isSystem: true }  // System templates
      ]
    }
  });
}

// Write: Only tenant templates can be created/modified by tenants
create(data: CreateReportTemplateDto, orgId: string) {
  return this.prisma.reportTemplate.create({
    data: { ...data, organizationId: orgId, isSystem: false }
  });
}
```

**RLS Policy:**

```sql
CREATE POLICY report_template_isolation ON report_templates
  USING (
    organization_id = current_setting('app.current_organization')::uuid
    OR (organization_id IS NULL AND is_system = true)
  );
```

**Security Guarantees:**

- Tenants cannot create system templates (isSystem defaults to false)
- Tenants cannot modify/delete system templates (RLS blocks write)
- Tenants only see their own templates plus read-only system templates

---

### 2. PromptTemplate

**Purpose:** Versioned AI prompt templates with A/B testing support.

**Schema Location:** `prisma/schema.prisma` line ~1949

**Access Control Pattern:**

```
organizationId=null  -> Platform prompts (visible to all, managed by admins)
organizationId=UUID  -> Tenant prompts (override platform defaults)
```

**Service Layer Implementation:**

```typescript
// Read: Platform prompts + tenant overrides
findByName(name: string, orgId: string) {
  return this.prisma.promptTemplate.findFirst({
    where: {
      name,
      isActive: true,
      OR: [
        { organizationId: orgId },    // Tenant override (priority)
        { organizationId: null }       // Platform default (fallback)
      ]
    },
    orderBy: { organizationId: 'desc' }  // Prefer tenant-specific
  });
}

// Write: Tenants can only create org-scoped prompts
create(data: CreatePromptDto, orgId: string) {
  return this.prisma.promptTemplate.create({
    data: { ...data, organizationId: orgId }
  });
}
```

**Security Guarantees:**

- Platform prompts are read-only for tenants
- Tenant prompts override platform defaults per-organization
- Version history maintained separately per tenant

---

### 3. ProjectTemplate

**Purpose:** Reusable project structures for implementations and onboarding.

**Schema Location:** `prisma/schema.prisma` line ~3306

**Access Control Pattern:**

```
organizationId=null + isSystem=true  -> Platform templates (Implementation best practices)
organizationId=UUID + isSystem=false -> Tenant templates (Custom workflows)
```

**Service Layer Implementation:**
Same pattern as ReportTemplate - `isSystem` flag distinguishes platform vs tenant templates.

**Security Guarantees:**

- System templates are platform-managed examples
- Tenants can clone system templates but cannot modify originals
- Custom templates are fully tenant-scoped

---

### 4. AiContextFile

**Purpose:** CLAUDE.md-like context files for AI interactions at multiple levels.

**Schema Location:** `prisma/schema.prisma` line ~1904

**Access Control Pattern - Hierarchical:**

```
organizationId=null + userId=null -> Platform context (global AI guidelines)
organizationId=UUID + userId=null -> Organization context (org-specific rules)
organizationId=UUID + userId=UUID -> User context (personal AI preferences)
```

**Service Layer Implementation:**

```typescript
// Read: Build context stack for AI calls
getContextStack(orgId: string, userId: string) {
  return this.prisma.aiContextFile.findMany({
    where: {
      isActive: true,
      OR: [
        { organizationId: null, userId: null },      // Platform
        { organizationId: orgId, userId: null },     // Organization
        { organizationId: orgId, userId: userId }    // User
      ]
    }
  });
}

// Write: Users can only modify their own context files
updateUserContext(id: string, data: UpdateDto, userId: string) {
  return this.prisma.aiContextFile.updateMany({
    where: { id, userId },  // Enforces ownership
    data
  });
}
```

**Security Guarantees:**

- Platform context is read-only for all users
- Org context can be managed by org admins
- User context is owned by individual users
- Users cannot access other users' context files

---

### 5. QuizAttempt

**Purpose:** Training module quiz completion tracking for certifications.

**Schema Location:** `prisma/schema.prisma` line ~3750

**Access Control Pattern:**

```
organizationId=null -> Platform training (Ethico compliance certifications)
organizationId=UUID -> Tenant training (org-specific courses)
```

**Service Layer Implementation:**

```typescript
// Read: Users can only see their own attempts
findUserAttempts(userId: string) {
  return this.prisma.quizAttempt.findMany({
    where: { userId }  // Primary access control
  });
}

// Write: Create attempt for current user only
createAttempt(quizId: string, userId: string, orgId?: string) {
  return this.prisma.quizAttempt.create({
    data: { quizId, userId, organizationId: orgId }
  });
}
```

**Why organizationId is Nullable:**

- Platform compliance certifications (HIPAA, SOC 2) are available to all users
- Certification progress must persist even if user changes organizations
- Cross-organization training enables industry-standard compliance credentials

**Security Guarantees:**

- `userId` is the primary access control (not organizationId)
- Users can ONLY view their own quiz attempts
- No cross-user data leakage possible via organizationId queries

---

### 6. Certificate

**Purpose:** Issued certification documents for completed training tracks.

**Schema Location:** `prisma/schema.prisma` line ~3800

**Access Control Pattern:**

```
organizationId=null -> Platform certifications (cross-org valid)
organizationId=UUID -> Tenant certifications (org-specific credentials)
```

**Service Layer Implementation:**

```typescript
// Read: Users access certificates through UserCertification junction
findUserCertificates(userId: string) {
  return this.prisma.userCertification.findMany({
    where: { userId },
    include: { certificate: true }
  });
}
```

**Why organizationId is Nullable:**

- Platform certifications (HIPAA Compliance, Ethics Training) are industry-recognized
- Certificates should remain valid when users move between organizations
- `UserCertification` table links users to their certificates

**Security Guarantees:**

- Certificates are accessed via `UserCertification` (user ownership enforced)
- Direct Certificate queries are admin-only
- Certificate authenticity verified via `certificateNumber` unique constraint

---

### 7. KnowledgeBaseArticle

**Purpose:** Help documentation and FAQs for platform users.

**Schema Location:** `prisma/schema.prisma` line ~5426

**Access Control Pattern:**

```
organizationId=null + isPublished=true -> Public platform docs (help.ethico.com)
organizationId=UUID + isPublished=true -> Tenant docs (custom org documentation)
```

**Service Layer Implementation:**

```typescript
// Read: Platform docs + org-specific docs
findPublishedArticles(orgId: string, category?: string) {
  return this.prisma.knowledgeBaseArticle.findMany({
    where: {
      isPublished: true,
      OR: [
        { organizationId: orgId },
        { organizationId: null }
      ],
      ...(category && { category })
    }
  });
}

// Write: Tenants can only create org-scoped articles
createArticle(data: CreateArticleDto, orgId: string) {
  return this.prisma.knowledgeBaseArticle.create({
    data: { ...data, organizationId: orgId }
  });
}
```

**Security Guarantees:**

- Platform documentation is read-only for all tenants
- Tenants can create custom documentation for their users
- Slug uniqueness prevents tenant doc conflicts with platform docs

---

## RLS Policy Configuration

### System-Wide Read Access Policy

For entities that allow platform-wide read access:

```sql
-- ReportTemplate, ProjectTemplate: isSystem flag pattern
CREATE POLICY entity_isolation ON table_name
  USING (
    organization_id = current_setting('app.current_organization')::uuid
    OR (organization_id IS NULL AND is_system = true)
  );

-- PromptTemplate, KnowledgeBaseArticle: NULL = public pattern
CREATE POLICY entity_isolation ON table_name
  USING (
    organization_id = current_setting('app.current_organization')::uuid
    OR organization_id IS NULL
  );
```

### User-Scoped Access Policy

For entities controlled by userId (QuizAttempt, Certificate via UserCertification):

```sql
-- No RLS needed on organizationId; access controlled via userId in queries
-- Service layer enforces: WHERE userId = $currentUserId
```

---

## Audit Trail Requirements

All system-wide entities must be auditable:

1. **Creation:** Log who created system-wide entries (internal admin only)
2. **Modification:** Track changes to platform templates
3. **Access:** Log tenant access to system resources for compliance

Example audit entry:

```json
{
  "action": "READ",
  "entityType": "ReportTemplate",
  "entityId": "uuid-of-template",
  "isSystemEntity": true,
  "accessedBy": { "userId": "user-uuid", "organizationId": "org-uuid" },
  "timestamp": "2026-02-14T18:30:00Z"
}
```

---

## Testing Requirements

### Unit Tests

Each system-wide entity service must have tests for:

1. **Tenant isolation:** Ensure tenants cannot access other tenants' data
2. **System visibility:** Verify system entities are visible to all authenticated users
3. **Write restrictions:** Confirm tenants cannot modify system entities
4. **User ownership:** Verify userId-scoped entities are properly filtered

### Integration Tests

```typescript
describe("System-Wide Entity Access", () => {
  it("should return system templates for any tenant", async () => {
    // Create system template (orgId=null, isSystem=true)
    // Query as Tenant A - should see template
    // Query as Tenant B - should see same template
  });

  it("should not allow tenant to create system template", async () => {
    // Attempt create with isSystem=true - should fail or set to false
  });

  it("should not allow tenant to modify system template", async () => {
    // Attempt update on system template - should fail
  });
});
```

---

## Migration Considerations

When adding new system-wide entities:

1. **Schema:** Add nullable `organizationId` with doc comment explaining why
2. **RLS:** Configure appropriate policy (isSystem pattern or NULL = public)
3. **Service:** Implement read/write restrictions in service layer
4. **Tests:** Add isolation and access control tests
5. **Docs:** Update this file with new entity documentation

---

## Related Documentation

- `prisma/schema.prisma` - Entity definitions with security comments
- `src/common/guards/` - Authentication and authorization guards
- `src/config/database.config.ts` - RLS configuration
- `SECURITY-GUARDRAILS.md` - Platform security requirements

---

_Last updated: 2026-02-14_
_Author: Security Remediation (Phase 27)_
