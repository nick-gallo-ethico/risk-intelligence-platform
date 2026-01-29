# Verify Tenant Isolation

**Trigger:** `/verify-tenant-isolation` or when completing any data access code

## Purpose

Tenant isolation is CRITICAL for this multi-tenant SaaS. This command verifies that data access code properly isolates tenants.

## Verification Checklist

### Database Queries

- [ ] All SELECT queries include `WHERE organization_id = ?`
- [ ] All INSERT statements include organization_id
- [ ] All UPDATE/DELETE queries include organization_id in WHERE
- [ ] RLS policies are enabled on the table

### Cache Keys

- [ ] All cache keys prefixed with `org:{organizationId}:`
- [ ] Cache invalidation scoped to tenant

### Elasticsearch

- [ ] Index name includes organization: `org_{organizationId}_{type}`
- [ ] All queries filter by organization

### File Storage

- [ ] File paths include tenant: `tenant-{organizationId}/...`
- [ ] SAS tokens scoped to tenant container

### API Endpoints

- [ ] JWT organization claim extracted
- [ ] Organization passed to service methods
- [ ] Cross-tenant access returns 404 (not 403)

## Automated Test

Run this test for any new data access code:

```typescript
describe('Tenant Isolation - [Entity Name]', () => {
  let orgA: Organization;
  let orgB: Organization;
  let userA: User;
  let userB: User;

  beforeAll(async () => {
    // Create two separate organizations
    orgA = await createOrganization('Org A');
    orgB = await createOrganization('Org B');
    userA = await createUser({ organizationId: orgA.id });
    userB = await createUser({ organizationId: orgB.id });
  });

  describe('findAll', () => {
    it('returns only records from the requesting organization', async () => {
      // Create records in both orgs
      const recordA = await service.create(data, orgA.id);
      const recordB = await service.create(data, orgB.id);

      // Query as org A
      const results = await service.findAll(orgA.id);

      // Assert isolation
      expect(results.some(r => r.id === recordA.id)).toBe(true);
      expect(results.some(r => r.id === recordB.id)).toBe(false);
    });
  });

  describe('findById', () => {
    it('returns 404 when accessing another org record', async () => {
      const recordB = await service.create(data, orgB.id);

      // Try to access org B record as org A
      await expect(
        service.findById(recordB.id, orgA.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('cannot update another org record', async () => {
      const recordB = await service.create(data, orgB.id);

      await expect(
        service.update(recordB.id, { name: 'Hacked' }, orgA.id)
      ).rejects.toThrow(NotFoundException);

      // Verify record unchanged
      const unchanged = await service.findById(recordB.id, orgB.id);
      expect(unchanged.name).not.toBe('Hacked');
    });
  });

  describe('delete', () => {
    it('cannot delete another org record', async () => {
      const recordB = await service.create(data, orgB.id);

      await expect(
        service.delete(recordB.id, orgA.id)
      ).rejects.toThrow(NotFoundException);

      // Verify record still exists
      const stillExists = await service.findById(recordB.id, orgB.id);
      expect(stillExists).toBeDefined();
    });
  });
});
```

## Running Isolation Tests

```bash
# Run all isolation tests
cd apps/backend && npm test -- --testPathPattern="isolation"

# Run for specific module
npm test -- --testPathPattern="cases.*isolation"
```

## Code Review Checklist

When reviewing PRs, verify:

1. **Prisma queries have organization filter:**
   ```typescript
   // CORRECT
   await prisma.case.findMany({
     where: { organizationId, ...filters }
   });

   // WRONG - Missing org filter
   await prisma.case.findMany({
     where: { ...filters }
   });
   ```

2. **Service methods accept organizationId:**
   ```typescript
   // CORRECT
   async findAll(organizationId: string): Promise<Case[]>

   // WRONG - No org context
   async findAll(): Promise<Case[]>
   ```

3. **Controller extracts org from request:**
   ```typescript
   // CORRECT
   @Get()
   async findAll(@CurrentOrg() orgId: string) {
     return this.service.findAll(orgId);
   }
   ```

## Report Format

```
## Tenant Isolation Verification

### Entity: [Entity Name]

✅ Database Queries
- findAll: WHERE organization_id = ?
- findById: WHERE id = ? AND organization_id = ?
- create: INSERT with organization_id
- update: WHERE id = ? AND organization_id = ?
- delete: WHERE id = ? AND organization_id = ?

✅ RLS Policy
- Policy exists: tenant_isolation_[entity]
- Policy uses: current_setting('app.current_organization')

✅ Tests
- Isolation tests: 5 passing
- No cross-tenant access possible

### Verified By
- Automated tests: ✅
- Manual review: ✅
- RLS check: ✅
```
