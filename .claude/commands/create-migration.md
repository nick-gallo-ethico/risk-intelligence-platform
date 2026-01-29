# Create Database Migration

**Trigger:** `/create-migration` or when schema changes are needed

## Workflow

1. **Update Prisma schema**
   - Edit `apps/backend/prisma/schema.prisma`
   - Follow naming conventions
   - Add required fields (organization_id, timestamps)

2. **Generate migration**
   ```bash
   cd apps/backend
   npx prisma migrate dev --name <migration_name>
   ```

3. **Add RLS policy** (if new table)
   - Create SQL file for RLS
   - Run via migration or manually

4. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

5. **Update TypeScript types** (if needed)

## Migration Naming Convention

Format: `YYYYMMDD_description`

Examples:
- `20260128_add_case_table`
- `20260128_add_business_unit_to_case`
- `20260128_create_investigation_note`

## Schema Patterns

### New Entity Template

```prisma
model EntityName {
  // Primary key
  id String @id @default(uuid())

  // Tenant isolation (REQUIRED)
  organizationId String
  businessUnitId String?

  // Business fields
  status EntityStatus @default(ACTIVE)
  name   String

  // Migration support (REQUIRED for imported data)
  sourceSystem   String?
  sourceRecordId String?
  migratedAt     DateTime?

  // AI enrichment (where applicable)
  aiSummary          String?
  aiSummaryGeneratedAt DateTime?
  aiModelVersion     String?

  // Audit fields (REQUIRED)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById String
  updatedById String?

  // Relationships
  organization Organization @relation(fields: [organizationId], references: [id])

  // Indexes (REQUIRED)
  @@index([organizationId])
  @@index([status])
}

enum EntityStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}
```

### Adding Field to Existing Table

```prisma
model Case {
  // ... existing fields

  // New field (use nullable for existing data)
  newField String?

  // Or with default for required field
  newRequiredField String @default("default_value")
}
```

## RLS Policy Template

After creating table, add RLS policy:

```sql
-- Enable RLS on table
ALTER TABLE "EntityName" ENABLE ROW LEVEL SECURITY;

-- Create isolation policy
CREATE POLICY "tenant_isolation_entityname" ON "EntityName"
  USING (organization_id = current_setting('app.current_organization', true)::uuid);

-- Force RLS for table owner (important!)
ALTER TABLE "EntityName" FORCE ROW LEVEL SECURITY;
```

## Migration Commands

```bash
# Create migration (development)
npx prisma migrate dev --name add_case_table

# Apply migration (production)
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset

# View migration status
npx prisma migrate status

# Generate client without migration
npx prisma generate
```

## Checklist Before Migration

- [ ] Schema follows naming conventions (snake_case in DB, camelCase in Prisma)
- [ ] organization_id field present (for RLS)
- [ ] Timestamps present (createdAt, updatedAt)
- [ ] Source tracking fields present (if entity can be imported)
- [ ] Indexes defined for frequently queried fields
- [ ] Enums defined for status/type fields
- [ ] Relations properly defined
- [ ] RLS policy SQL prepared

## Post-Migration Steps

1. **Verify migration applied:**
   ```bash
   npx prisma migrate status
   ```

2. **Apply RLS (if new table):**
   ```bash
   psql -f rls_policies/entityname.sql
   ```

3. **Update services** to use new fields

4. **Update DTOs** for validation

5. **Run tests:**
   ```bash
   npm test
   ```

## Rollback

If migration fails:

```bash
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back <migration_name>

# Or reset to clean state (DEVELOPMENT ONLY)
npx prisma migrate reset
```

## Example: Adding Case Entity

```bash
# 1. Update schema.prisma with Case model
# 2. Generate migration
npx prisma migrate dev --name 20260128_add_case_table

# 3. Create RLS policy file
cat > prisma/rls/case.sql << 'EOF'
ALTER TABLE "Case" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_case" ON "Case"
  USING (organization_id = current_setting('app.current_organization', true)::uuid);
ALTER TABLE "Case" FORCE ROW LEVEL SECURITY;
EOF

# 4. Apply RLS
psql $DATABASE_URL -f prisma/rls/case.sql

# 5. Generate client
npx prisma generate

# 6. Verify
npm test -- --testPathPattern="case"
```
