# Test and Fix

**Trigger:** `/test-and-fix` or when user says "run tests and fix failures"

## Workflow

1. **Run tests**
   ```bash
   cd apps/backend && npm test
   ```

2. **Analyze failures**
   - Read error messages carefully
   - Identify root cause
   - Determine if it's a test bug or code bug

3. **Fix issues**
   - Fix the actual bug (not just make tests pass)
   - Update tests if test expectations were wrong
   - Ensure fix doesn't break other tests

4. **Re-run tests**
   ```bash
   npm test
   ```

5. **Run lint**
   ```bash
   npm run lint
   ```

6. **Report results**
   - Summary of what was fixed
   - Any remaining issues

## Backend Test Commands

```bash
# All tests
cd apps/backend && npm test

# Specific test file
npm test -- --testPathPattern="cases.service.spec"

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# E2E tests
npm run test:e2e
```

## Frontend Test Commands

```bash
# All tests
cd apps/frontend && npm test

# Watch mode
npm test -- --watch

# Specific component
npm test -- Button.test
```

## Common Test Patterns

### Testing Tenant Isolation

```typescript
describe('Tenant Isolation', () => {
  it('org A cannot access org B data', async () => {
    // Setup: Create data in org B
    const orgBCase = await createCase({ organizationId: orgB.id });

    // Act: Query as org A
    const result = await casesService.findAll(orgA.id);

    // Assert: Should not contain org B case
    expect(result.find(c => c.id === orgBCase.id)).toBeUndefined();
  });
});
```

### Testing CRUD Operations

```typescript
describe('CasesService', () => {
  it('creates case with organization context', async () => {
    const dto = { details: 'Test', sourceChannel: 'DIRECT_ENTRY' };
    const result = await service.create(dto, orgId, userId);

    expect(result.organizationId).toBe(orgId);
    expect(result.createdById).toBe(userId);
  });
});
```

## Fixing Common Errors

### "Cannot find module"
```bash
# Check imports, run:
npm install
npx prisma generate
```

### "Timeout exceeded"
- Increase timeout in test
- Check for missing async/await
- Check for unresolved promises

### "RLS policy violation"
- Ensure test sets tenant context
- Check organization_id in test data

### "Validation failed"
- Check DTO validation rules
- Ensure test data matches schema

## Report Format

After fixing:
```
## Test Results

✅ All tests passing

### Fixed Issues
1. `cases.service.spec.ts`: Fixed missing organization_id in test fixture
2. `auth.guard.spec.ts`: Updated mock to include new JWT claims

### Commands Run
- npm test (23 passing)
- npm run lint (no errors)

### Remaining Concerns
- None
```
