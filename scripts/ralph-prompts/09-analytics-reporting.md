# Ralph Prompt: Analytics & Reporting Module

You are implementing the Analytics & Reporting module - self-service BI dashboards.

## Context
- Reference: `02-MODULES/07-ANALYTICS-REPORTING/PRD.md`
- Reference: `01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md`
- HubSpot-style self-service analytics
- Dashboard builder, report builder, scheduled reports

## Current State
```bash
cd apps/backend && ls -la src/modules/
cd apps/backend && cat prisma/schema.prisma | grep -i dashboard
```

## Requirements

### 1. Analytics Schema

```prisma
model Dashboard {
  id                String   @id @default(uuid())
  organizationId    String

  name              String
  description       String?
  slug              String

  // Ownership
  ownerId           String
  owner             User     @relation(fields: [ownerId], references: [id])
  isShared          Boolean  @default(false)
  sharedWith        Json?    // { users: [], roles: [], departments: [] }

  // Layout
  layout            Json     // Grid layout configuration
  widgets           DashboardWidget[]

  // Settings
  refreshInterval   Int?     // seconds, null = manual
  defaultDateRange  String?  // 'last_7_days', 'last_30_days', etc.
  filters           Json?    // Default filters

  // Favorites
  isFavorite        Boolean  @default(false)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([organizationId, slug])
  @@index([organizationId, ownerId])
}

model DashboardWidget {
  id                String   @id @default(uuid())
  dashboardId       String
  dashboard         Dashboard @relation(fields: [dashboardId], references: [id], onDelete: Cascade)

  // Widget definition
  type              WidgetType
  title             String
  description       String?

  // Position in grid
  x                 Int
  y                 Int
  width             Int
  height            Int

  // Data configuration
  dataSource        String   // 'cases', 'disclosures', 'policies', 'attestations'
  query             Json     // Query configuration
  aggregation       Json?    // { field, function: 'count'|'sum'|'avg' }
  groupBy           String[]
  filters           Json?

  // Visualization
  chartType         ChartType?
  chartConfig       Json?    // Colors, labels, etc.

  // Drill-down
  drillDownConfig   Json?    // What to show on click

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([dashboardId])
}

model SavedReport {
  id                String   @id @default(uuid())
  organizationId    String

  name              String
  description       String?

  // Report definition
  dataSource        String
  columns           Json     // [{ field, label, width }]
  filters           Json?
  sorting           Json?    // [{ field, direction }]
  grouping          Json?

  // Ownership & sharing
  ownerId           String
  owner             User     @relation(fields: [ownerId], references: [id])
  isShared          Boolean  @default(false)
  sharedWith        Json?

  // Schedule (optional)
  schedule          ReportSchedule?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([organizationId, ownerId])
}

model ReportSchedule {
  id                String   @id @default(uuid())
  reportId          String   @unique
  report            SavedReport @relation(fields: [reportId], references: [id], onDelete: Cascade)

  // Schedule
  frequency         ScheduleFrequency
  dayOfWeek         Int?     // 0-6 for weekly
  dayOfMonth        Int?     // 1-31 for monthly
  time              String   // "09:00"
  timezone          String   @default("UTC")

  // Delivery
  deliveryMethod    DeliveryMethod
  recipients        String[] // Email addresses or user IDs
  format            ExportFormat @default(PDF)

  // Status
  isActive          Boolean  @default(true)
  lastRunAt         DateTime?
  nextRunAt         DateTime?

  createdAt         DateTime @default(now())
}

model ReportExecution {
  id                String   @id @default(uuid())
  organizationId    String
  reportId          String?
  scheduleId        String?

  // Execution details
  startedAt         DateTime @default(now())
  completedAt       DateTime?
  status            ExecutionStatus @default(RUNNING)
  error             String?

  // Output
  format            ExportFormat
  fileUrl           String?
  fileSize          Int?
  rowCount          Int?

  // Delivery
  deliveredTo       String[]
  deliveredAt       DateTime?

  @@index([organizationId])
  @@index([reportId])
}

// Fact tables for analytics (pre-aggregated)
model CaseFactDaily {
  id                String   @id @default(uuid())
  organizationId    String
  date              DateTime @db.Date

  // Dimensions
  category          String?
  severity          String?
  source            String?
  status            String?
  businessUnitId    String?
  regionId          String?

  // Metrics
  caseCount         Int      @default(0)
  openCount         Int      @default(0)
  closedCount       Int      @default(0)
  avgResolutionDays Float?

  @@unique([organizationId, date, category, severity, source, status, businessUnitId, regionId])
  @@index([organizationId, date])
}

model DisclosureFactDaily {
  id                String   @id @default(uuid())
  organizationId    String
  date              DateTime @db.Date

  // Dimensions
  type              String?
  status            String?
  businessUnitId    String?

  // Metrics
  disclosureCount   Int      @default(0)
  pendingCount      Int      @default(0)
  approvedCount     Int      @default(0)
  deniedCount       Int      @default(0)

  @@unique([organizationId, date, type, status, businessUnitId])
  @@index([organizationId, date])
}

model AttestationFactDaily {
  id                String   @id @default(uuid())
  organizationId    String
  date              DateTime @db.Date

  // Dimensions
  policyId          String?
  campaignId        String?
  businessUnitId    String?

  // Metrics
  totalRequired     Int      @default(0)
  completedCount    Int      @default(0)
  pendingCount      Int      @default(0)
  overdueCount      Int      @default(0)
  complianceRate    Float?

  @@unique([organizationId, date, policyId, campaignId, businessUnitId])
  @@index([organizationId, date])
}

enum WidgetType {
  METRIC          // Single number
  CHART           // Line, bar, pie, etc.
  TABLE           // Data table
  LIST            // Simple list
  MAP             // Geographic
  TREND           // Sparkline
  PROGRESS        // Progress bar
  ACTIVITY_FEED   // Recent activity
}

enum ChartType {
  LINE
  BAR
  HORIZONTAL_BAR
  PIE
  DONUT
  AREA
  SCATTER
  FUNNEL
  HEATMAP
}

enum ScheduleFrequency {
  DAILY
  WEEKLY
  MONTHLY
  QUARTERLY
}

enum DeliveryMethod {
  EMAIL
  PORTAL
  SFTP
}

enum ExportFormat {
  PDF
  EXCEL
  CSV
  JSON
}

enum ExecutionStatus {
  RUNNING
  COMPLETED
  FAILED
}
```

### 2. Analytics Query Service

```typescript
@Injectable()
export class AnalyticsQueryService {
  constructor(private prisma: PrismaService) {}

  // Execute widget query
  async executeWidgetQuery(widget: DashboardWidget, dateRange: DateRange, filters?: any): Promise<WidgetData> {
    const baseQuery = this.buildBaseQuery(widget.dataSource, widget.organizationId);

    // Apply filters
    const filteredQuery = this.applyFilters(baseQuery, {
      ...widget.filters,
      ...filters,
      dateRange,
    });

    // Apply aggregation
    if (widget.aggregation) {
      return this.executeAggregation(filteredQuery, widget.aggregation, widget.groupBy);
    }

    return this.executeQuery(filteredQuery, widget.query);
  }

  // Build query for data source
  private buildBaseQuery(dataSource: string, orgId: string) {
    switch (dataSource) {
      case 'cases':
        return this.prisma.case.findMany({
          where: { organizationId: orgId },
        });
      case 'disclosures':
        return this.prisma.disclosure.findMany({
          where: { organizationId: orgId },
        });
      // ... other data sources
    }
  }

  // Execute aggregation
  private async executeAggregation(
    query: any,
    aggregation: AggregationConfig,
    groupBy: string[],
  ): Promise<AggregatedData> {
    // Use Prisma groupBy for aggregations
    const result = await this.prisma.$queryRaw`
      SELECT
        ${groupBy.map(g => `${g}`).join(', ')},
        ${this.buildAggregateFunction(aggregation)}
      FROM ${aggregation.table}
      WHERE organization_id = ${aggregation.orgId}
      GROUP BY ${groupBy.join(', ')}
    `;

    return result;
  }

  // Time series data
  async getTimeSeries(
    orgId: string,
    metric: string,
    dateRange: DateRange,
    granularity: 'day' | 'week' | 'month',
  ): Promise<TimeSeriesData[]> { }

  // Comparison data
  async getComparison(
    orgId: string,
    metric: string,
    currentPeriod: DateRange,
    comparisonPeriod: DateRange,
  ): Promise<ComparisonData> { }
}
```

### 3. Dashboard Service

```typescript
@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private analyticsQueryService: AnalyticsQueryService,
    private activityService: ActivityService,
  ) {}

  // CRUD
  async create(orgId: string, dto: CreateDashboardDto, userId: string): Promise<Dashboard> { }
  async findAll(orgId: string, userId: string): Promise<Dashboard[]> { }
  async findOne(id: string): Promise<Dashboard> { }
  async update(id: string, dto: UpdateDashboardDto, userId: string): Promise<Dashboard> { }
  async delete(id: string): Promise<void> { }

  // Widgets
  async addWidget(dashboardId: string, dto: CreateWidgetDto): Promise<DashboardWidget> { }
  async updateWidget(widgetId: string, dto: UpdateWidgetDto): Promise<DashboardWidget> { }
  async removeWidget(widgetId: string): Promise<void> { }
  async updateLayout(dashboardId: string, layout: LayoutDto[]): Promise<void> { }

  // Data
  async getDashboardData(id: string, dateRange: DateRange, filters?: any): Promise<DashboardData> {
    const dashboard = await this.findOne(id);

    const widgetData = await Promise.all(
      dashboard.widgets.map(async widget => ({
        widgetId: widget.id,
        data: await this.analyticsQueryService.executeWidgetQuery(widget, dateRange, filters),
      }))
    );

    return {
      dashboard,
      widgets: widgetData,
      generatedAt: new Date(),
    };
  }

  // Templates
  async createFromTemplate(orgId: string, templateId: string, userId: string): Promise<Dashboard> { }
  async getTemplates(): Promise<DashboardTemplate[]> { }

  // Sharing
  async share(id: string, shareConfig: ShareConfigDto): Promise<void> { }
  async unshare(id: string): Promise<void> { }
}
```

### 4. Report Service

```typescript
@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private analyticsQueryService: AnalyticsQueryService,
    private exportService: ExportService,
    private emailService: EmailService,
  ) {}

  // CRUD
  async create(orgId: string, dto: CreateReportDto, userId: string): Promise<SavedReport> { }
  async findAll(orgId: string, userId: string): Promise<SavedReport[]> { }
  async findOne(id: string): Promise<SavedReport> { }
  async update(id: string, dto: UpdateReportDto): Promise<SavedReport> { }

  // Execution
  async executeReport(reportId: string, options: ExecuteOptions): Promise<ReportExecution> {
    const report = await this.findOne(reportId);
    const execution = await this.createExecution(reportId, options.format);

    try {
      // Fetch data
      const data = await this.fetchReportData(report, options.dateRange, options.filters);

      // Export to requested format
      const file = await this.exportService.export(data, report.columns, options.format);

      // Upload to storage
      const fileUrl = await this.uploadFile(file, execution.id);

      // Update execution
      await this.completeExecution(execution.id, {
        fileUrl,
        fileSize: file.size,
        rowCount: data.length,
      });

      return execution;
    } catch (error) {
      await this.failExecution(execution.id, error.message);
      throw error;
    }
  }

  // Scheduling
  async scheduleReport(reportId: string, dto: ScheduleDto): Promise<ReportSchedule> { }
  async updateSchedule(scheduleId: string, dto: UpdateScheduleDto): Promise<ReportSchedule> { }
  async deleteSchedule(scheduleId: string): Promise<void> { }

  // Scheduled execution (called by cron)
  async processScheduledReports(): Promise<void> {
    const dueSchedules = await this.prisma.reportSchedule.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: new Date() },
      },
      include: { report: true },
    });

    for (const schedule of dueSchedules) {
      await this.executeScheduledReport(schedule);
    }
  }

  private async executeScheduledReport(schedule: ReportSchedule): Promise<void> {
    const execution = await this.executeReport(schedule.reportId, {
      format: schedule.format,
      dateRange: this.getDateRangeForFrequency(schedule.frequency),
    });

    // Deliver to recipients
    if (schedule.deliveryMethod === 'EMAIL') {
      await this.emailService.sendReportEmail(
        schedule.recipients,
        schedule.report.name,
        execution.fileUrl,
      );
    }

    // Update next run
    await this.updateNextRun(schedule.id);
  }
}
```

### 5. Fact Table Aggregation (Background Job)

```typescript
@Injectable()
export class FactTableService {
  constructor(private prisma: PrismaService) {}

  // Run daily aggregation
  async aggregateDailyFacts(date: Date = new Date()): Promise<void> {
    const targetDate = startOfDay(date);

    // Aggregate cases
    await this.aggregateCaseFacts(targetDate);

    // Aggregate disclosures
    await this.aggregateDisclosureFacts(targetDate);

    // Aggregate attestations
    await this.aggregateAttestationFacts(targetDate);
  }

  private async aggregateCaseFacts(date: Date): Promise<void> {
    // Delete existing facts for this date
    await this.prisma.caseFactDaily.deleteMany({
      where: { date },
    });

    // Aggregate and insert
    await this.prisma.$executeRaw`
      INSERT INTO "CaseFactDaily" (id, organization_id, date, category, severity, source, status, case_count, open_count, closed_count)
      SELECT
        gen_random_uuid(),
        organization_id,
        ${date}::date,
        category,
        severity,
        source,
        status,
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS')),
        COUNT(*) FILTER (WHERE status = 'CLOSED')
      FROM "Case"
      WHERE DATE(created_at) <= ${date}::date
      GROUP BY organization_id, category, severity, source, status
    `;
  }
}
```

### 6. Controllers

```typescript
@Controller('api/v1/dashboards')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardController {
  @Get()
  async findAll(@TenantId() orgId: string, @CurrentUser() user: User) { }

  @Post()
  async create(@Body() dto: CreateDashboardDto, @CurrentUser() user: User, @TenantId() orgId: string) { }

  @Get(':id')
  async findOne(@Param('id') id: string) { }

  @Get(':id/data')
  async getDashboardData(
    @Param('id') id: string,
    @Query() query: DashboardDataQueryDto,
  ) { }

  @Post(':id/widgets')
  async addWidget(@Param('id') id: string, @Body() dto: CreateWidgetDto) { }

  @Put(':id/layout')
  async updateLayout(@Param('id') id: string, @Body() dto: UpdateLayoutDto) { }

  @Post(':id/share')
  async share(@Param('id') id: string, @Body() dto: ShareDto) { }
}

@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReportController {
  @Get()
  async findAll(@TenantId() orgId: string, @CurrentUser() user: User) { }

  @Post()
  async create(@Body() dto: CreateReportDto, @CurrentUser() user: User, @TenantId() orgId: string) { }

  @Post(':id/execute')
  async execute(@Param('id') id: string, @Body() dto: ExecuteReportDto) { }

  @Post(':id/schedule')
  async schedule(@Param('id') id: string, @Body() dto: ScheduleDto) { }

  @Get(':id/executions')
  async getExecutions(@Param('id') id: string) { }
}
```

### 7. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="analytics|dashboard|report"
cd apps/backend && npm run typecheck
```

## Verification Checklist
- [ ] Dashboard and Widget schemas
- [ ] SavedReport with scheduling
- [ ] Fact tables for aggregation
- [ ] AnalyticsQueryService with aggregations
- [ ] DashboardService complete
- [ ] ReportService with execution
- [ ] Export to PDF/Excel/CSV
- [ ] Scheduled report delivery
- [ ] Fact table aggregation job
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
When analytics module is complete:
<promise>ANALYTICS REPORTING COMPLETE</promise>
