# Ralph Prompt: Tenant Isolation Audit

You are auditing the codebase for tenant isolation vulnerabilities.

## Context
This is a multi-tenant SaaS platform. Data leakage between tenants is a CRITICAL security issue.

## Audit Checklist

### 1. Database Layer
Search all Prisma queries for missing organizationId filters:
```bash
# Find all .service.ts files
# Check each prisma.*.findMany, findFirst, findUnique, update, delete
# Verify organizationId is in the where clause
```

Report any queries missing tenant filtering.

### 2. Cache Keys
Search for Redis/cache usage:
```bash
# Pattern: cache keys must be org:{organizationId}:...
# Wrong: policy:${policyId}
# Right: org:${orgId}:policy:${policyId}
```

Report any cache keys missing org prefix.

### 3. Elasticsearch Indices
Search for ES index usage:
```bash
# Pattern: org_${organizationId}_${type}
# Wrong: policies index shared across tenants
```

### 4. WebSocket Rooms
Check Socket.io room naming:
```bash
# Pattern: org:${organizationId}:room:${roomId}
# Verify room joins validate org membership
```

### 5. AI Prompts
Search for AI/Claude API calls:
```bash
# Verify prompts never mix data from multiple orgs
# Check that context passed to AI is single-tenant
```

### 6. File Storage
Check blob storage paths:
```bash
# Pattern: tenant-${organizationId}/...
# Verify no shared containers
```

## Output Format
For each issue found:
```
VULNERABILITY: [category]
File: [path]:[line]
Issue: [description]
Fix: [suggested fix]
Severity: [CRITICAL|HIGH|MEDIUM]
```

## Verification
After identifying issues:
1. Create GitHub issues or fix directly
2. Run tenant isolation tests: `npm run test:tenant-isolation`
3. Verify no cross-tenant data access possible

## Completion
When audit is complete and all CRITICAL/HIGH issues are fixed:
<promise>TENANT ISOLATION AUDIT COMPLETE</promise>

If issues remain, list them with status.
