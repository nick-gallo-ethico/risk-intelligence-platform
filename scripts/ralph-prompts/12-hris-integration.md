# Ralph Prompt: HRIS Integration Module

You are implementing the HRIS Integration module for employee data synchronization.

## Context
- Reference: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-HRIS-INTEGRATION.md`
- Primary approach: Merge.dev API (180+ HRIS integrations)
- Fallback: SFTP/CSV import
- Data freshness target: Within 24 hours

## Current State
```bash
cd apps/backend && ls -la src/modules/
cd apps/backend && cat prisma/schema.prisma | grep -i hris
```

## Requirements

### 1. HRIS Schema

```prisma
model HRISIntegration {
  id                String   @id @default(uuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  // Integration type
  provider          HRISProvider
  integrationMethod IntegrationMethod @default(MERGE_API)

  // Merge.dev connection
  mergeAccountToken String?  // Encrypted
  mergeLinkedAccountId String?

  // SFTP config (alternative)
  sftpHost          String?
  sftpPort          Int?
  sftpUsername      String?
  sftpPassword      String?  // Encrypted
  sftpPath          String?

  // Status
  status            IntegrationStatus @default(PENDING)
  lastSyncAt        DateTime?
  lastSyncStatus    SyncStatus?
  lastSyncError     String?
  nextSyncAt        DateTime?

  // Settings
  syncFrequency     SyncFrequency @default(DAILY)
  syncTime          String?  // "02:00" in org timezone
  fieldMapping      Json?    // Custom field mappings

  // Stats
  totalEmployees    Int      @default(0)
  activeEmployees   Int      @default(0)
  lastSyncCount     Int      @default(0)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdById       String

  @@unique([organizationId])
  @@index([status])
}

model HRISSyncLog {
  id                String   @id @default(uuid())
  integrationId     String
  integration       HRISIntegration @relation(fields: [integrationId], references: [id])

  // Sync details
  startedAt         DateTime @default(now())
  completedAt       DateTime?
  status            SyncStatus @default(IN_PROGRESS)
  error             String?

  // Stats
  totalRecords      Int      @default(0)
  createdCount      Int      @default(0)
  updatedCount      Int      @default(0)
  deactivatedCount  Int      @default(0)
  errorCount        Int      @default(0)

  // Details
  errorDetails      Json?    // [{ employeeId, error }]

  @@index([integrationId])
}

model HRISFieldMapping {
  id                String   @id @default(uuid())
  integrationId     String
  integration       HRISIntegration @relation(fields: [integrationId], references: [id])

  // Mapping
  sourceField       String   // Field name in HRIS
  targetField       String   // Field name in our Employee model
  transformRule     String?  // 'uppercase', 'lowercase', 'date_format', etc.
  defaultValue      String?

  isRequired        Boolean  @default(false)

  @@unique([integrationId, sourceField])
}

enum HRISProvider {
  WORKDAY
  BAMBOOHR
  ADP
  UKG
  SAP_SUCCESSFACTORS
  ORACLE_HCM
  NAMELY
  RIPPLING
  GUSTO
  PAYLOCITY
  CERIDIAN
  PAYCOM
  PAYCHEX
  OTHER
}

enum IntegrationMethod {
  MERGE_API
  DIRECT_API
  SFTP
  MANUAL_UPLOAD
}

enum IntegrationStatus {
  PENDING
  CONNECTED
  ACTIVE
  PAUSED
  ERROR
  DISCONNECTED
}

enum SyncStatus {
  IN_PROGRESS
  COMPLETED
  COMPLETED_WITH_ERRORS
  FAILED
}

enum SyncFrequency {
  HOURLY
  DAILY
  WEEKLY
  MANUAL
}
```

### 2. Merge.dev Integration Service

```typescript
// apps/backend/src/modules/hris/services/merge.service.ts

@Injectable()
export class MergeService {
  private client: MergeHRISClient;

  constructor(
    private configService: ConfigService,
    private cryptoService: CryptoService,
  ) {
    this.client = new MergeHRISClient({
      apiKey: this.configService.get('MERGE_API_KEY'),
    });
  }

  // Generate link token for frontend OAuth flow
  async createLinkToken(organizationId: string, provider?: string): Promise<string> {
    const response = await this.client.link.create({
      endUserOriginId: organizationId,
      endUserOrganizationName: 'Organization',
      endUserEmailAddress: 'admin@org.com', // Get from user
      categories: ['hris'],
      integration: provider, // Optional: pre-select provider
    });

    return response.link_token;
  }

  // Complete OAuth and store account token
  async completeLink(organizationId: string, publicToken: string): Promise<HRISIntegration> {
    // Exchange public token for account token
    const accountToken = await this.client.link.exchange({
      public_token: publicToken,
    });

    // Get linked account details
    const linkedAccount = await this.client.linkedAccounts.list({
      account_token: accountToken.account_token,
    });

    // Store integration
    return this.prisma.hRISIntegration.upsert({
      where: { organizationId },
      create: {
        organizationId,
        provider: this.mapProvider(linkedAccount.integration),
        integrationMethod: 'MERGE_API',
        mergeAccountToken: await this.cryptoService.encrypt(accountToken.account_token),
        mergeLinkedAccountId: linkedAccount.id,
        status: 'CONNECTED',
      },
      update: {
        mergeAccountToken: await this.cryptoService.encrypt(accountToken.account_token),
        mergeLinkedAccountId: linkedAccount.id,
        status: 'CONNECTED',
      },
    });
  }

  // Fetch employees from Merge
  async fetchEmployees(integration: HRISIntegration): Promise<MergeEmployee[]> {
    const accountToken = await this.cryptoService.decrypt(integration.mergeAccountToken);

    const employees: MergeEmployee[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.client.hris.employees.list({
        account_token: accountToken,
        cursor,
        page_size: 100,
        expand: ['manager', 'team', 'employments'],
      });

      employees.push(...response.results);
      cursor = response.next;
    } while (cursor);

    return employees;
  }

  // Fetch organization structure
  async fetchTeams(integration: HRISIntegration): Promise<MergeTeam[]> {
    const accountToken = await this.cryptoService.decrypt(integration.mergeAccountToken);

    const response = await this.client.hris.teams.list({
      account_token: accountToken,
    });

    return response.results;
  }

  // Fetch locations
  async fetchLocations(integration: HRISIntegration): Promise<MergeLocation[]> {
    const accountToken = await this.cryptoService.decrypt(integration.mergeAccountToken);

    const response = await this.client.hris.locations.list({
      account_token: accountToken,
    });

    return response.results;
  }

  private mapProvider(mergeIntegration: string): HRISProvider {
    const mapping: Record<string, HRISProvider> = {
      'workday': 'WORKDAY',
      'bamboohr': 'BAMBOOHR',
      'adp_workforce_now': 'ADP',
      'ukg_pro': 'UKG',
      // ... more mappings
    };
    return mapping[mergeIntegration] || 'OTHER';
  }
}
```

### 3. HRIS Sync Service

```typescript
@Injectable()
export class HRISSyncService {
  constructor(
    private prisma: PrismaService,
    private mergeService: MergeService,
    private sftpService: SFTPService,
    private activityService: ActivityService,
  ) {}

  // Main sync function
  async syncEmployees(integrationId: string): Promise<HRISSyncLog> {
    const integration = await this.prisma.hRISIntegration.findUnique({
      where: { id: integrationId },
    });

    // Create sync log
    const syncLog = await this.prisma.hRISSyncLog.create({
      data: {
        integrationId,
        status: 'IN_PROGRESS',
      },
    });

    try {
      // Fetch employees based on integration method
      let rawEmployees: any[];
      switch (integration.integrationMethod) {
        case 'MERGE_API':
          rawEmployees = await this.mergeService.fetchEmployees(integration);
          break;
        case 'SFTP':
          rawEmployees = await this.sftpService.fetchCSV(integration);
          break;
        case 'MANUAL_UPLOAD':
          throw new Error('Use uploadEmployees for manual uploads');
        default:
          throw new Error(`Unsupported method: ${integration.integrationMethod}`);
      }

      // Transform and sync
      const result = await this.processEmployees(
        integration.organizationId,
        rawEmployees,
        integration.fieldMapping,
      );

      // Update sync log
      await this.prisma.hRISSyncLog.update({
        where: { id: syncLog.id },
        data: {
          completedAt: new Date(),
          status: result.errors.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
          totalRecords: rawEmployees.length,
          createdCount: result.created,
          updatedCount: result.updated,
          deactivatedCount: result.deactivated,
          errorCount: result.errors.length,
          errorDetails: result.errors,
        },
      });

      // Update integration stats
      await this.prisma.hRISIntegration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: result.errors.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
          totalEmployees: result.total,
          activeEmployees: result.active,
          lastSyncCount: rawEmployees.length,
          nextSyncAt: this.calculateNextSync(integration.syncFrequency),
        },
      });

      return syncLog;
    } catch (error) {
      await this.prisma.hRISSyncLog.update({
        where: { id: syncLog.id },
        data: {
          completedAt: new Date(),
          status: 'FAILED',
          error: error.message,
        },
      });

      await this.prisma.hRISIntegration.update({
        where: { id: integrationId },
        data: {
          lastSyncStatus: 'FAILED',
          lastSyncError: error.message,
        },
      });

      throw error;
    }
  }

  // Process employee records
  private async processEmployees(
    organizationId: string,
    rawEmployees: any[],
    fieldMapping: any,
  ): Promise<SyncResult> {
    const result: SyncResult = {
      created: 0,
      updated: 0,
      deactivated: 0,
      total: 0,
      active: 0,
      errors: [],
    };

    // Get existing employees
    const existing = await this.prisma.employee.findMany({
      where: { organizationId },
      select: { id: true, hrisId: true, email: true },
    });
    const existingByHrisId = new Map(existing.map(e => [e.hrisId, e]));
    const existingByEmail = new Map(existing.map(e => [e.email, e]));
    const processedHrisIds = new Set<string>();

    for (const raw of rawEmployees) {
      try {
        const mapped = this.mapEmployee(raw, fieldMapping);
        processedHrisIds.add(mapped.hrisId);

        // Find existing by HRIS ID or email
        const existingEmployee = existingByHrisId.get(mapped.hrisId)
          || existingByEmail.get(mapped.email);

        if (existingEmployee) {
          // Update
          await this.prisma.employee.update({
            where: { id: existingEmployee.id },
            data: {
              ...mapped,
              lastSyncedAt: new Date(),
            },
          });
          result.updated++;
        } else {
          // Create
          await this.prisma.employee.create({
            data: {
              organizationId,
              ...mapped,
              lastSyncedAt: new Date(),
            },
          });
          result.created++;
        }

        if (mapped.status === 'ACTIVE') {
          result.active++;
        }
      } catch (error) {
        result.errors.push({
          hrisId: raw.id,
          email: raw.email,
          error: error.message,
        });
      }
    }

    // Deactivate employees not in feed
    const toDeactivate = existing.filter(e =>
      e.hrisId && !processedHrisIds.has(e.hrisId)
    );

    for (const emp of toDeactivate) {
      await this.prisma.employee.update({
        where: { id: emp.id },
        data: {
          status: 'TERMINATED',
          terminationDate: new Date(),
        },
      });
      result.deactivated++;
    }

    result.total = await this.prisma.employee.count({
      where: { organizationId },
    });

    return result;
  }

  // Map raw HRIS data to Employee model
  private mapEmployee(raw: any, fieldMapping: any): Partial<Employee> {
    const defaultMapping = {
      hrisId: 'id',
      email: 'work_email',
      firstName: 'first_name',
      lastName: 'last_name',
      jobTitle: 'job_title',
      department: 'department.name',
      managerId: 'manager.id',
      hireDate: 'start_date',
      terminationDate: 'termination_date',
      status: 'employment_status',
    };

    const mapping = { ...defaultMapping, ...fieldMapping };
    const result: any = {};

    for (const [targetField, sourceField] of Object.entries(mapping)) {
      result[targetField] = this.getNestedValue(raw, sourceField as string);
    }

    // Transform status
    result.status = this.mapStatus(result.status);

    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }

  private mapStatus(hrisStatus: string): EmployeeStatus {
    const mapping: Record<string, EmployeeStatus> = {
      'ACTIVE': 'ACTIVE',
      'active': 'ACTIVE',
      'ON_LEAVE': 'ON_LEAVE',
      'on_leave': 'ON_LEAVE',
      'TERMINATED': 'TERMINATED',
      'terminated': 'TERMINATED',
      'inactive': 'TERMINATED',
    };
    return mapping[hrisStatus] || 'ACTIVE';
  }

  private calculateNextSync(frequency: SyncFrequency): Date {
    const now = new Date();
    switch (frequency) {
      case 'HOURLY':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'DAILY':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }
}
```

### 4. SFTP Service

```typescript
@Injectable()
export class SFTPService {
  constructor(private cryptoService: CryptoService) {}

  async fetchCSV(integration: HRISIntegration): Promise<any[]> {
    const client = new SFTPClient();

    await client.connect({
      host: integration.sftpHost,
      port: integration.sftpPort || 22,
      username: integration.sftpUsername,
      password: await this.cryptoService.decrypt(integration.sftpPassword),
    });

    try {
      // Download CSV file
      const fileBuffer = await client.get(integration.sftpPath);
      const csvContent = fileBuffer.toString('utf-8');

      // Parse CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
      });

      return records;
    } finally {
      await client.end();
    }
  }
}
```

### 5. Scheduled Sync Job

```typescript
@Injectable()
export class HRISSyncScheduler {
  constructor(
    private prisma: PrismaService,
    private syncService: HRISSyncService,
  ) {}

  @Cron('0 * * * *') // Every hour
  async processDueSyncs() {
    const dueIntegrations = await this.prisma.hRISIntegration.findMany({
      where: {
        status: 'ACTIVE',
        nextSyncAt: { lte: new Date() },
      },
    });

    for (const integration of dueIntegrations) {
      try {
        await this.syncService.syncEmployees(integration.id);
      } catch (error) {
        console.error(`HRIS sync failed for ${integration.id}:`, error);
      }
    }
  }
}
```

### 6. Controller

```typescript
@Controller('api/v1/hris')
@UseGuards(JwtAuthGuard, TenantGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class HRISController {
  // Integration management
  @Get('integration')
  async getIntegration(@TenantId() orgId: string) { }

  @Post('integration/link-token')
  async createLinkToken(@TenantId() orgId: string, @Body() dto: CreateLinkTokenDto) { }

  @Post('integration/complete')
  async completeLink(@TenantId() orgId: string, @Body() dto: CompleteLinkDto) { }

  @Put('integration')
  async updateIntegration(@TenantId() orgId: string, @Body() dto: UpdateIntegrationDto) { }

  @Delete('integration')
  async disconnectIntegration(@TenantId() orgId: string) { }

  // Sync
  @Post('sync')
  async triggerSync(@TenantId() orgId: string) { }

  @Get('sync/history')
  async getSyncHistory(@TenantId() orgId: string) { }

  @Get('sync/:id')
  async getSyncLog(@Param('id') id: string) { }

  // Field mapping
  @Get('field-mappings')
  async getFieldMappings(@TenantId() orgId: string) { }

  @Put('field-mappings')
  async updateFieldMappings(@TenantId() orgId: string, @Body() dto: UpdateFieldMappingsDto) { }

  // Manual upload
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCSV(
    @TenantId() orgId: string,
    @UploadedFile() file: Express.Multer.File,
  ) { }
}
```

### 7. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="hris"
cd apps/backend && npm run typecheck
```

## Verification Checklist
- [ ] HRISIntegration schema
- [ ] HRISSyncLog tracking
- [ ] Merge.dev OAuth flow
- [ ] Employee data sync
- [ ] Field mapping support
- [ ] SFTP fallback
- [ ] CSV upload
- [ ] Scheduled sync job
- [ ] Error handling and logging
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
When HRIS integration is functional:
<promise>HRIS INTEGRATION COMPLETE</promise>
