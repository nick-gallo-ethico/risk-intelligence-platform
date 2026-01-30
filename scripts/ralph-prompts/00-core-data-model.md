# Ralph Prompt: Core Data Model Implementation

You are implementing the foundational data model for the Risk Intelligence Platform.

## Context
- Reference: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- This establishes shared entities used across ALL modules
- Multi-tenant with PostgreSQL Row-Level Security (RLS)
- Every entity MUST have `organizationId`

## Current State
Check what exists:
```bash
cd apps/backend && cat prisma/schema.prisma
cd apps/backend && ls -la src/modules/
```

## Requirements

### 1. Prisma Schema - Core Entities

#### Organization (Tenant)
```prisma
model Organization {
  id                String   @id @default(uuid())
  name              String
  slug              String   @unique
  domain            String?
  status            OrganizationStatus @default(ACTIVE)
  settings          Json?    // Tenant-specific configuration

  // Subscription/billing
  subscriptionTier  String?
  subscriptionExpiresAt DateTime?

  // Branding
  logoUrl           String?
  primaryColor      String?

  // Audit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  users             User[]
  employees         Employee[]
  categories        Category[]
  // ... other relations
}
```

#### User (Platform Login Identity)
```prisma
model User {
  id                String   @id @default(uuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  email             String
  passwordHash      String?  // Null for SSO-only users

  // Profile
  firstName         String
  lastName          String
  displayName       String?
  avatarUrl         String?

  // Auth
  role              UserRole
  status            UserStatus @default(ACTIVE)
  lastLoginAt       DateTime?
  mfaEnabled        Boolean  @default(false)

  // SSO
  ssoProvider       String?  // 'azure_ad', 'google', 'okta'
  ssoSubjectId      String?

  // Preferences
  timezone          String   @default("UTC")
  locale            String   @default("en")

  // Audit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdById       String?

  @@unique([organizationId, email])
  @@index([organizationId])
}
```

#### Employee (HRIS-synced Individual)
```prisma
model Employee {
  id                String   @id @default(uuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  // May link to User (if they have platform access)
  userId            String?  @unique
  user              User?    @relation(fields: [userId], references: [id])

  // HRIS data
  employeeNumber    String?
  email             String
  firstName         String
  lastName          String
  jobTitle          String?
  department        String?
  businessUnitId    String?
  locationId        String?
  managerId         String?  // Self-reference
  manager           Employee? @relation("ManagerReports", fields: [managerId], references: [id])
  directReports     Employee[] @relation("ManagerReports")

  hireDate          DateTime?
  terminationDate   DateTime?
  status            EmployeeStatus @default(ACTIVE)

  // HRIS sync
  hrisSource        String?  // 'workday', 'bamboohr', 'merge'
  hrisId            String?
  lastSyncedAt      DateTime?

  // Audit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([organizationId, email])
  @@unique([organizationId, employeeNumber])
  @@index([organizationId])
  @@index([managerId])
}
```

#### Category (Configurable Taxonomy)
```prisma
model Category {
  id                String   @id @default(uuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  type              CategoryType  // CASE_CATEGORY, DISCLOSURE_TYPE, POLICY_CATEGORY
  code              String
  name              String
  description       String?

  // Hierarchy
  parentId          String?
  parent            Category? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children          Category[] @relation("CategoryHierarchy")

  // Configuration
  isActive          Boolean  @default(true)
  sortOrder         Int      @default(0)
  metadata          Json?    // Type-specific configuration

  // Audit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([organizationId, type, code])
  @@index([organizationId, type])
}
```

#### Activity Log (Entity-level Audit)
```prisma
model Activity {
  id                String   @id @default(uuid())
  organizationId    String

  // What changed
  entityType        String   // 'CASE', 'POLICY', 'DISCLOSURE', etc.
  entityId          String
  action            String   // 'created', 'updated', 'status_changed', etc.

  // Natural language description (AI-first)
  actionDescription String   // "John assigned case #123 to Sarah"

  // Change details
  changes           Json?    // { oldValue: {...}, newValue: {...} }

  // Who
  actorUserId       String?
  actorType         String   @default("USER") // 'USER', 'SYSTEM', 'AI'

  // Context
  ipAddress         String?
  userAgent         String?

  createdAt         DateTime @default(now())

  @@index([organizationId, entityType, entityId])
  @@index([organizationId, createdAt])
  @@index([actorUserId])
}
```

### 2. Enums
```prisma
enum OrganizationStatus {
  ACTIVE
  SUSPENDED
  TRIAL
  CHURNED
}

enum UserRole {
  SYSTEM_ADMIN
  CCO
  COMPLIANCE_OFFICER
  TRIAGE_LEAD
  INVESTIGATOR
  POLICY_AUTHOR
  POLICY_REVIEWER
  DEPARTMENT_ADMIN
  MANAGER
  EMPLOYEE
  READ_ONLY
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  PENDING_ACTIVATION
}

enum EmployeeStatus {
  ACTIVE
  ON_LEAVE
  TERMINATED
}

enum CategoryType {
  CASE_CATEGORY
  CASE_SUBCATEGORY
  DISCLOSURE_TYPE
  POLICY_CATEGORY
  SEVERITY_LEVEL
}
```

### 3. Run Migration
```bash
cd apps/backend && npx prisma migrate dev --name core_data_model
cd apps/backend && npx prisma generate
```

### 4. Create Activity Service
Create `apps/backend/src/modules/activity/`:
- activity.module.ts
- activity.service.ts (with log() method for natural language activity tracking)
- activity.controller.ts (GET endpoints for timeline views)

### 5. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="activity"
cd apps/backend && npm run typecheck
```

## Verification Checklist
- [ ] All entities have organizationId
- [ ] Migration runs successfully
- [ ] Activity service has log() method with natural language support
- [ ] Indexes on organizationId for all tables
- [ ] Enums defined for all status fields
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
When schema is complete, migration runs, and activity service works:
<promise>CORE DATA MODEL COMPLETE</promise>
