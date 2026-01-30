# Security Guardrails

**Version:** 1.0
**Last Updated:** January 2026
**Status:** MANDATORY for all development

---

## Purpose

This document defines security requirements that MUST be followed for every piece of code written in this project. These are non-negotiable guardrails, not suggestions.

AI agents (Ralph Loop) and human developers alike must verify these requirements before marking any task complete.

---

## 1. OWASP Top 10 Checklist

### Before marking ANY endpoint complete, verify:

| Check | Requirement | How to Verify |
|-------|-------------|---------------|
| A01 | No broken access control | Test: User A cannot access User B's resources |
| A02 | No hardcoded secrets | Grep: No API keys, passwords in code |
| A03 | Input validation | All DTOs use class-validator decorators |
| A04 | No insecure design | RLS enabled, tenant context from JWT only |
| A05 | No security misconfig | Headers set via helmet, CORS configured |
| A06 | No vulnerable components | `npm audit` passes |
| A07 | Auth failures logged | Failed logins create audit entries |
| A08 | No data integrity issues | All mutations logged to AUDIT_LOG |
| A09 | Logging implemented | Security events logged with context |
| A10 | No SSRF | No user-controlled URLs in fetch/axios |

---

## 2. Tenant Isolation (CRITICAL)

### 2.1 Every Query Must Be Tenant-Scoped

```typescript
// BAD - Data leak risk
async findAll() {
  return this.prisma.case.findMany();
}

// GOOD - RLS handles it, but explicit is safer
async findAll(organizationId: string) {
  return this.prisma.case.findMany({
    where: { organizationId }
  });
}
```

### 2.2 Tenant ID Source

| Source | Allowed | Reason |
|--------|---------|--------|
| JWT token claim | YES | Cryptographically verified |
| Request body | NO | User-controlled, spoofable |
| Query parameter | NO | User-controlled, spoofable |
| Path parameter | NO | User-controlled, spoofable |
| Request header | NO | User-controlled, spoofable |

### 2.3 Cache Key Pattern

```typescript
// BAD - Cross-tenant cache pollution
const cacheKey = `case:${caseId}`;

// GOOD - Tenant-scoped cache
const cacheKey = `org:${organizationId}:case:${caseId}`;
```

### 2.4 Search Index Pattern

```typescript
// BAD - Cross-tenant search results
const index = 'cases';

// GOOD - Tenant-scoped index
const index = `org_${organizationId}_cases`;
```

### 2.5 Tenant Isolation Test Template

Every new entity MUST have this test:

```typescript
describe('Tenant Isolation - [EntityName]', () => {
  let orgAToken: string;
  let orgBToken: string;
  let orgAEntityId: string;

  beforeAll(async () => {
    // Create test orgs and tokens
    orgAToken = await createTestToken('org-a');
    orgBToken = await createTestToken('org-b');

    // Create entity in Org A
    const response = await request(app)
      .post('/api/v1/entities')
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ name: 'Test Entity' });
    orgAEntityId = response.body.id;
  });

  it('Org B cannot list Org A entities', async () => {
    const response = await request(app)
      .get('/api/v1/entities')
      .set('Authorization', `Bearer ${orgBToken}`);

    expect(response.body.every(e => e.organizationId !== 'org-a')).toBe(true);
  });

  it('Org B cannot access Org A entity by ID', async () => {
    await request(app)
      .get(`/api/v1/entities/${orgAEntityId}`)
      .set('Authorization', `Bearer ${orgBToken}`)
      .expect(404); // Not 403 - don't leak existence
  });

  it('Org B cannot update Org A entity', async () => {
    await request(app)
      .put(`/api/v1/entities/${orgAEntityId}`)
      .set('Authorization', `Bearer ${orgBToken}`)
      .send({ name: 'Hacked' })
      .expect(404);
  });

  it('Org B cannot delete Org A entity', async () => {
    await request(app)
      .delete(`/api/v1/entities/${orgAEntityId}`)
      .set('Authorization', `Bearer ${orgBToken}`)
      .expect(404);
  });
});
```

---

## 3. Input Validation

### 3.1 All DTOs Must Use Validators

```typescript
// BAD - No validation
export class CreateCaseDto {
  details: string;
  categoryId: string;
}

// GOOD - Validated
import { IsString, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  details: string;

  @IsUUID()
  categoryId: string;
}
```

### 3.2 Validation Pipe Must Be Global

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // Strip unknown properties
  forbidNonWhitelisted: true, // Reject unknown properties
  transform: true,            // Auto-transform types
}));
```

### 3.3 Dangerous Input Patterns

Never allow these in user input without sanitization:

| Pattern | Risk | Mitigation |
|---------|------|------------|
| `<script>` | XSS | HTML sanitization |
| `${...}` | Template injection | Escape before use |
| `'; DROP TABLE` | SQL injection | Use Prisma (parameterized) |
| `../../../` | Path traversal | Validate file paths |
| `http://internal` | SSRF | URL allowlist |

---

## 4. Authentication & Authorization

### 4.1 All Routes Must Declare Guards

```typescript
// BAD - No protection
@Controller('cases')
export class CasesController {
  @Get()
  findAll() {}
}

// GOOD - Explicit guards
@Controller('cases')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CasesController {
  @Get()
  @Roles(Role.COMPLIANCE_OFFICER, Role.INVESTIGATOR)
  @UseGuards(RolesGuard)
  findAll() {}
}
```

### 4.2 Public Routes Must Be Explicit

```typescript
// If a route should be public, use decorator
@Public()
@Get('health')
healthCheck() {}
```

### 4.3 Password Handling

```typescript
// BAD - Plain text or weak hash
user.password = dto.password;
user.password = md5(dto.password);

// GOOD - bcrypt with salt rounds
const SALT_ROUNDS = 12;
user.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
```

### 4.4 JWT Token Content

Tokens MUST contain:
- `sub` (user ID)
- `organizationId` (tenant ID)
- `role` (user role)
- `exp` (expiration)

Tokens MUST NOT contain:
- Passwords or secrets
- PII beyond what's needed
- Internal system details

---

## 5. Audit Logging

### 5.1 All Mutations Must Log

```typescript
// GOOD - Every create/update/delete logs
async create(dto: CreateDto, userId: string, orgId: string) {
  const entity = await this.prisma.entity.create({ ... });

  await this.activityService.log({
    entityType: 'ENTITY',
    entityId: entity.id,
    action: 'created',
    actionDescription: `Created ${entity.name}`,
    actorUserId: userId,
    organizationId: orgId,
    metadata: { source: 'api' }
  });

  return entity;
}
```

### 5.2 Security Events to Log

| Event | Priority | Required Fields |
|-------|----------|-----------------|
| Login success | HIGH | userId, ip, userAgent |
| Login failure | HIGH | email, ip, reason |
| Permission denied | HIGH | userId, resource, action |
| Data export | HIGH | userId, recordCount, format |
| Password change | HIGH | userId, method |
| Role assignment | HIGH | userId, role, assignedBy |
| API rate limit | MEDIUM | userId, endpoint, limit |

---

## 6. Error Handling

### 6.1 Never Expose Internal Details

```typescript
// BAD - Leaks internal info
throw new Error(`Database error: ${err.message}`);
throw new Error(`User ${userId} in org ${orgId} failed`);

// GOOD - Generic message, log details
this.logger.error('Database operation failed', { err, userId, orgId });
throw new InternalServerErrorException('An error occurred');
```

### 6.2 Status Codes

| Scenario | Code | Message |
|----------|------|---------|
| Resource not found OR no permission | 404 | "Resource not found" |
| Invalid input | 400 | Field-specific errors |
| Not authenticated | 401 | "Authentication required" |
| Authenticated but forbidden | 403 | "Access denied" |
| Rate limited | 429 | "Too many requests" |

Note: Use 404 (not 403) for resources you can't access. This prevents enumeration attacks.

---

## 7. AI Integration Security

### 7.1 Never Mix Tenant Data in Prompts

```typescript
// BAD - Could leak org B data to org A
const allCases = await this.prisma.case.findMany();
const prompt = `Summarize: ${JSON.stringify(allCases)}`;

// GOOD - Single tenant context
const orgCases = await this.prisma.case.findMany({
  where: { organizationId }
});
const prompt = `Summarize: ${JSON.stringify(orgCases)}`;
```

### 7.2 Log All AI Interactions

```typescript
await this.prisma.aiConversation.create({
  data: {
    organizationId,
    userId,
    entityType: 'CASE',
    entityId: caseId,
    userPrompt: prompt,
    aiResponse: response,
    modelVersion: 'claude-3-opus',
    tokensUsed: usage.total_tokens,
  }
});
```

### 7.3 Rate Limit AI Endpoints

```typescript
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
@Post('summarize')
async summarize() {}
```

---

## 8. Pre-Commit Checklist

Before committing ANY code, verify:

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm audit --audit-level=high` has no critical issues
- [ ] All new endpoints have guards
- [ ] All DTOs have validators
- [ ] All mutations log activity
- [ ] Tenant isolation test added for new entities
- [ ] No secrets in code (`git diff --staged | grep -i password`)
- [ ] Error messages don't leak internals

---

## 9. Security Review Triggers

Request security review if:

- [ ] Adding new authentication method
- [ ] Adding new external integration
- [ ] Changing RLS policies
- [ ] Adding file upload/download
- [ ] Adding email/notification sending
- [ ] Modifying audit logging
- [ ] Adding admin/operator endpoints
- [ ] Changing encryption/hashing

---

## 10. Quick Reference Card

```
+--------------------------------------------------+
|              SECURITY QUICK REFERENCE             |
+--------------------------------------------------+
| Tenant ID source     | JWT only, never body/query |
| Cache keys           | org:{orgId}:type:{id}      |
| Search indices       | org_{orgId}_{type}         |
| Not found vs denied  | Always 404, never 403      |
| Password hash        | bcrypt, 12 rounds          |
| Input validation     | class-validator on all DTOs|
| Every mutation       | Log to AUDIT_LOG           |
| AI prompts           | Single org context only    |
+--------------------------------------------------+
```

---

*End of Security Guardrails*
