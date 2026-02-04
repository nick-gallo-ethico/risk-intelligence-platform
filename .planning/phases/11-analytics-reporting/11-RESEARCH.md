# Phase 11: Analytics & Reporting - Research

**Researched:** 2026-02-04
**Domain:** Dashboard Infrastructure, Export Generation, AI Natural Language Query, Task Aggregation, Migration
**Confidence:** HIGH (react-grid-layout, ExcelJS, BullMQ), MEDIUM (Recharts, Claude structured outputs, pptxgenjs)

## Summary

Phase 11 delivers data-driven insights across six major areas: customizable dashboards with drag-drop widgets, multi-format exports (PDF, PPTX, XLSX), AI natural language queries, unified "My Work" task queue, flat file exports, and migration connectors for competitor systems.

The project already has solid infrastructure for background jobs (BullMQ), AI integration (Claude provider with streaming), and Excel export (ExcelJS). The primary additions are: react-grid-layout for dashboard layout, a charting library (Recharts recommended), Puppeteer for PDF generation, pptxgenjs for PowerPoint, and new frontend components for dashboard builder and AI query interface.

**Primary recommendation:** Use Recharts for charting (best balance of simplicity and capabilities), react-grid-layout for dashboard drag-drop, and extend existing BullMQ infrastructure for async export jobs. Leverage Claude structured outputs (beta) for AI query response formatting.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-grid-layout | 1.5.x | Dashboard layout with drag-drop and responsive breakpoints | Most popular React grid for dashboards, responsive breakpoints, CSS transforms for performance |
| Recharts | 2.15.x | Chart visualizations (line, bar, pie, area, etc.) | D3-based, React-native components, excellent documentation, declarative JSX API |
| ExcelJS | 4.4.x | Excel file generation with streaming | Already in project, supports streaming for large files, multi-sheet workbooks |
| Puppeteer | 24.x | PDF generation from HTML | Industry standard for headless Chrome PDF, supports complex layouts and charts |
| pptxgenjs | 3.12.x | PowerPoint generation | Only serious PPTX library for Node.js, zero dependencies, TypeScript support |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-pdf/renderer | 4.x | Alternative PDF (React components) | Simple PDF layouts without charts (not for board reports) |
| csv-parser | 3.x | Stream CSV parsing for imports | Large CSV file uploads during migration |
| date-fns | 3.x | Date manipulation | Date range filtering, period comparison |
| zod | 3.x | Schema validation | AI query response validation, export field schemas |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Visx | More customization but steep learning curve; better for custom visualizations |
| Recharts | Chart.js | Canvas-based (better for 10k+ points) but less React-native API |
| react-grid-layout | Gridstack.js | Framework-agnostic but requires more React integration work |

**Installation:**
```bash
# Frontend
npm install react-grid-layout recharts @types/react-grid-layout

# Backend
npm install puppeteer pptxgenjs csv-parser
```

## Architecture Patterns

### Recommended Project Structure

```
apps/frontend/src/
├── components/
│   ├── dashboard/
│   │   ├── DashboardGrid.tsx         # react-grid-layout wrapper
│   │   ├── DashboardHeader.tsx       # Date range, refresh, actions
│   │   ├── WidgetWrapper.tsx         # Common widget chrome
│   │   ├── WidgetLibrary.tsx         # Widget picker modal
│   │   └── widgets/
│   │       ├── KpiCard.tsx
│   │       ├── LineChartWidget.tsx
│   │       ├── BarChartWidget.tsx
│   │       ├── PieChartWidget.tsx
│   │       ├── TableWidget.tsx
│   │       └── index.ts
│   ├── ai-query/
│   │   ├── AiQueryPalette.tsx        # Cmd+K command palette
│   │   ├── AiQueryResults.tsx        # Auto-visualization
│   │   └── AiQueryHistory.tsx
│   └── my-work/
│       ├── UnifiedTaskQueue.tsx
│       ├── TaskCard.tsx
│       └── TaskFilters.tsx
│
apps/backend/src/modules/
├── analytics/
│   ├── dashboard/
│   │   ├── dashboard.controller.ts
│   │   ├── dashboard.service.ts
│   │   ├── dashboard-config.service.ts
│   │   └── widget-data.service.ts
│   ├── ai-query/
│   │   ├── ai-query.controller.ts
│   │   ├── ai-query.service.ts
│   │   └── query-to-prisma.service.ts
│   └── my-work/
│       ├── my-work.controller.ts
│       └── task-aggregator.service.ts
├── exports/
│   ├── pdf-generator.service.ts
│   ├── pptx-generator.service.ts
│   └── flat-file.service.ts
└── migration/
    ├── migration.controller.ts
    ├── connectors/
    │   ├── navex.connector.ts
    │   ├── eqs.connector.ts
    │   └── csv.connector.ts
    └── field-mapper.service.ts
```

### Pattern 1: Dashboard Grid with Responsive Breakpoints

**What:** Responsive dashboard layout using react-grid-layout with WidthProvider HOC
**When to use:** All dashboard views (CCO, Investigator, Campaign Manager dashboards)
**Example:**
```typescript
// Source: react-grid-layout documentation
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const breakpoints = { lg: 1280, md: 996, sm: 768, xs: 480, xxs: 0 };
const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

interface DashboardGridProps {
  layouts: ReactGridLayout.Layouts;
  widgets: Widget[];
  onLayoutChange: (layout: Layout[], layouts: Layouts) => void;
  isEditing: boolean;
}

export function DashboardGrid({ layouts, widgets, onLayoutChange, isEditing }: DashboardGridProps) {
  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={breakpoints}
      cols={cols}
      rowHeight={80}
      margin={[16, 16]}
      containerPadding={[16, 16]}
      isDraggable={isEditing}
      isResizable={isEditing}
      onLayoutChange={(current, all) => onLayoutChange(current, all)}
      draggableHandle=".widget-drag-handle"
    >
      {widgets.map((widget) => (
        <div key={widget.id} data-grid={widget.layout}>
          <WidgetWrapper widget={widget} isEditing={isEditing}>
            <WidgetContent widget={widget} />
          </WidgetWrapper>
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}
```

### Pattern 2: Dashboard Polling with Delta Updates

**What:** Configurable polling with visibility-aware pause and delta fetching
**When to use:** Dashboard data refresh
**Example:**
```typescript
// Source: Community best practices
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';

interface UseWidgetDataOptions {
  widgetId: string;
  refreshInterval: number; // 1-30 min
  dateRange: DateRange;
  useDashboardDateRange: boolean;
}

export function useWidgetData(options: UseWidgetDataOptions) {
  const queryClient = useQueryClient();

  // Pause polling when tab is hidden
  const [isVisible, setIsVisible] = useState(!document.hidden);
  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['widget', options.widgetId, options.dateRange],
    queryFn: async () => {
      // Request delta if we have previous data
      const previousData = queryClient.getQueryData(['widget', options.widgetId]);
      const lastUpdated = previousData?.updatedAt;

      return fetchWidgetData({
        widgetId: options.widgetId,
        dateRange: options.dateRange,
        since: lastUpdated, // Server returns only changes
      });
    },
    refetchInterval: isVisible ? options.refreshInterval * 60 * 1000 : false,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Manual refresh via R keyboard shortcut
  const manualRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['widget', options.widgetId] });
  }, [queryClient, options.widgetId]);

  return { data, isLoading, refetch: manualRefresh };
}
```

### Pattern 3: Recharts Composable Chart Pattern

**What:** Declarative chart composition using Recharts components
**When to use:** All dashboard chart widgets
**Example:**
```typescript
// Source: Recharts documentation
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface TrendChartProps {
  data: Array<{ date: string; value: number; comparison?: number }>;
  showComparison?: boolean;
  onClick?: (entry: any) => void;
}

export function TrendChart({ data, showComparison, onClick }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} onClick={onClick}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--popover))' }}
          labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6, onClick }}
        />
        {showComparison && (
          <Line
            type="monotone"
            dataKey="comparison"
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 4: Claude Structured Outputs for AI Queries

**What:** Use Claude's structured output feature for guaranteed query response schema
**When to use:** AI natural language queries
**Example:**
```typescript
// Source: Claude API documentation (beta feature)
import Anthropic from '@anthropic-ai/sdk';

interface QueryResult {
  summary: string;
  visualizationType: 'kpi' | 'table' | 'line' | 'bar' | 'pie' | 'text';
  data: unknown;
  interpretedQuery: string;
  canSaveToDashboard: boolean;
}

const queryResultSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'One-line natural language summary' },
    visualizationType: {
      type: 'string',
      enum: ['kpi', 'table', 'line', 'bar', 'pie', 'text'],
    },
    data: { type: 'object', description: 'Data for the visualization' },
    interpretedQuery: { type: 'string', description: 'What AI understood' },
    canSaveToDashboard: { type: 'boolean' },
  },
  required: ['summary', 'visualizationType', 'data', 'interpretedQuery', 'canSaveToDashboard'],
};

async function executeAiQuery(
  client: Anthropic,
  userQuery: string,
  schemaContext: string,
): Promise<QueryResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    // Beta header for structured outputs
    headers: { 'anthropic-beta': 'structured-outputs-2025-11-13' },
    output_format: {
      type: 'json_schema',
      json_schema: queryResultSchema,
    },
    system: `You are a compliance data analyst. Given a natural language query,
analyze the user's intent and return structured data for visualization.
Schema context: ${schemaContext}`,
    messages: [{ role: 'user', content: userQuery }],
  });

  return JSON.parse(response.content[0].text);
}
```

### Pattern 5: BullMQ Async Export with Progress

**What:** Queue-based export generation with progress tracking
**When to use:** PDF, PPTX, and large Excel exports
**Example:**
```typescript
// Source: NestJS + BullMQ documentation (extends existing pattern)
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PdfGeneratorService } from './pdf-generator.service';

export const EXPORT_QUEUE_NAME = 'exports';

interface PdfExportJobData {
  executionId: string;
  organizationId: string;
  templateType: 'board_report' | 'case_summary' | 'custom';
  templateId?: string;
  filters: Record<string, unknown>;
  options: {
    includeAiSummary: boolean;
    dateRange: { start: string; end: string };
  };
}

@Processor(EXPORT_QUEUE_NAME, { concurrency: 2 })
export class PdfExportProcessor extends WorkerHost {
  constructor(
    private pdfGenerator: PdfGeneratorService,
    private prisma: PrismaService,
    private storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<PdfExportJobData>): Promise<{ fileKey: string }> {
    const { executionId, organizationId, templateType, options } = job.data;

    // Update status to processing
    await this.prisma.reportExecution.update({
      where: { id: executionId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    try {
      // Generate PDF
      await job.updateProgress(10);
      const html = await this.pdfGenerator.renderTemplate(templateType, job.data);

      await job.updateProgress(40);
      const pdfBuffer = await this.pdfGenerator.generatePdf(html);

      await job.updateProgress(80);
      const fileKey = `exports/${organizationId}/${executionId}.pdf`;
      await this.storage.upload(fileKey, pdfBuffer, 'application/pdf');

      // Update execution record
      await this.prisma.reportExecution.update({
        where: { id: executionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          fileUrl: await this.storage.getSignedUrl(fileKey),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      return { fileKey };
    } catch (error) {
      await this.prisma.reportExecution.update({
        where: { id: executionId },
        data: { status: 'FAILED', errorMessage: error.message },
      });
      throw error;
    }
  }
}
```

### Pattern 6: Puppeteer PDF Generation Service

**What:** Headless Chrome PDF generation for reports with charts
**When to use:** Board reports, case summaries requiring chart rendering
**Example:**
```typescript
// Source: Puppeteer documentation
import puppeteer, { Browser, Page } from 'puppeteer';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class PdfGeneratorService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser | null = null;

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage', // Prevents /dev/shm issues in Docker
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async generatePdf(html: string, options?: PdfOptions): Promise<Buffer> {
    const page = await this.browser!.newPage();

    try {
      await page.setContent(html, {
        waitUntil: 'networkidle0', // Wait for all resources including charts
      });

      // Wait for chart animations to complete
      await page.waitForFunction(() => {
        const charts = document.querySelectorAll('.recharts-wrapper');
        return charts.length === 0 ||
          Array.from(charts).every(c => c.querySelector('svg'));
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '1in', right: '0.75in', bottom: '1in', left: '0.75in' },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: options?.headerHtml || '<span></span>',
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center;">
            <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }
}
```

### Pattern 7: Unified Task Queue Aggregation

**What:** Aggregate tasks from multiple entity types with priority scoring
**When to use:** "My Work" unified queue
**Example:**
```typescript
// Source: Custom pattern based on unified inbox design
interface UnifiedTask {
  id: string;
  type: 'case_assignment' | 'investigation_step' | 'disclosure_review' |
        'campaign_response' | 'approval_request' | 'remediation_task';
  entityType: string;
  entityId: string;
  title: string;
  dueDate: Date | null;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'overdue';
  assignedAt: Date;
  metadata: Record<string, unknown>;
}

@Injectable()
export class TaskAggregatorService {
  constructor(
    private prisma: PrismaService,
    private caseService: CaseService,
    private investigationService: InvestigationService,
    // ... other services
  ) {}

  async getMyTasks(params: {
    organizationId: string;
    userId: string;
    filters?: TaskFilters;
    sortBy?: 'priority_due_date' | 'due_date' | 'created_at';
    limit?: number;
    offset?: number;
  }): Promise<{ tasks: UnifiedTask[]; total: number }> {
    // Fetch from multiple sources in parallel
    const [cases, investigations, disclosures, approvals, remediations] = await Promise.all([
      this.prisma.case.findMany({
        where: { organizationId: params.organizationId, assigneeId: params.userId, status: { not: 'CLOSED' } },
      }),
      this.prisma.investigationStep.findMany({
        where: { investigation: { organizationId: params.organizationId }, assigneeId: params.userId, completedAt: null },
        include: { investigation: true },
      }),
      this.prisma.disclosureReview.findMany({
        where: { organizationId: params.organizationId, reviewerId: params.userId, status: 'PENDING' },
      }),
      // ... other task types
    ]);

    // Transform to unified format
    const allTasks: UnifiedTask[] = [
      ...cases.map(c => this.caseToTask(c)),
      ...investigations.map(i => this.investigationStepToTask(i)),
      ...disclosures.map(d => this.disclosureToTask(d)),
      // ... other transformations
    ];

    // Apply priority-weighted due date sorting
    const sorted = this.sortByPriorityDueDate(allTasks);

    // Apply filters and pagination
    return {
      tasks: sorted.slice(params.offset || 0, (params.offset || 0) + (params.limit || 50)),
      total: sorted.length,
    };
  }

  private sortByPriorityDueDate(tasks: UnifiedTask[]): UnifiedTask[] {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const now = new Date();

    return tasks.sort((a, b) => {
      // Overdue items always first
      const aOverdue = a.dueDate && a.dueDate < now;
      const bOverdue = b.dueDate && b.dueDate < now;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Priority-weighted score (lower = more urgent)
      const aScore = a.dueDate
        ? (a.dueDate.getTime() - now.getTime()) / priorityWeight[a.priority]
        : Infinity;
      const bScore = b.dueDate
        ? (b.dueDate.getTime() - now.getTime()) / priorityWeight[b.priority]
        : Infinity;

      return aScore - bScore;
    });
  }
}
```

### Anti-Patterns to Avoid

- **Polling entire dataset:** Never refetch all widget data on every poll; use delta updates with timestamps
- **Chart re-rendering:** Don't create new chart components on data change; update data props instead
- **Blocking PDF generation:** Never generate PDFs synchronously in request handlers; always use queue
- **Mixed tenant data in AI prompts:** AI queries must only include data from single tenant
- **Widget state in URL:** Don't store widget-level state in URL (gets too long); use localStorage + API
- **Synchronous CSV parsing:** Large file imports must use streaming parsers

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dashboard grid layout | Custom CSS grid | react-grid-layout | Responsive breakpoints, collision detection, serializable state |
| Chart rendering | Raw SVG/Canvas | Recharts | Animations, tooltips, responsive container, accessibility |
| PDF from HTML | wkhtmltopdf, jsPDF | Puppeteer | Full CSS support, chart rendering, modern web features |
| Excel with formatting | csv-stringify + xlsx | ExcelJS | Streaming, styling, formulas, auto-filters, frozen panes |
| PowerPoint slides | Custom OOXML | pptxgenjs | Complex layouts, charts, images, master slides |
| CSV streaming | fs.readFile + split | csv-parser | Backpressure handling, memory efficiency, error recovery |
| Date range presets | Custom date math | date-fns intervals | Edge cases (DST, leap years, timezone handling) |

**Key insight:** Export generation and dashboard layout are deceptively complex. Off-by-one errors in date ranges, memory issues with large datasets, and PDF rendering quirks will consume weeks of debugging if hand-rolled.

## Common Pitfalls

### Pitfall 1: Memory Exhaustion in Streaming Exports

**What goes wrong:** Server crashes when exporting 100k+ rows due to holding entire dataset in memory
**Why it happens:** Using `workbook.xlsx.writeBuffer()` instead of streaming writer, or fetching all data before starting export
**How to avoid:**
- Use `ExcelJS.stream.xlsx.WorkbookWriter` for exports >10k rows
- Fetch data in batches (5000 rows at a time) and write incrementally
- Always call `.commit()` after each row/worksheet
**Warning signs:** Export jobs timing out, increasing memory usage over time

### Pitfall 2: Puppeteer Browser Leaks

**What goes wrong:** PDF generation slows over time, eventually OOM errors
**Why it happens:** Not closing pages after use, creating new browser instances per request
**How to avoid:**
- Single browser instance per service (OnModuleInit)
- Always close pages in try/finally
- Set max concurrent pages limit (2-3)
- Graceful shutdown in OnModuleDestroy
**Warning signs:** Increasing Chromium process count, slow PDF generation

### Pitfall 3: Dashboard Flicker on Polling

**What goes wrong:** Charts flash/reset on every data refresh
**Why it happens:** React key changes causing full component remount, or clearing data before new data arrives
**How to avoid:**
- Stable keys (widget ID, not array index)
- Keep previous data visible while fetching (React Query staleTime)
- Use Recharts isAnimationActive={false} for non-initial renders
**Warning signs:** User complaints about "flickering dashboard"

### Pitfall 4: AI Query SQL Injection

**What goes wrong:** Malicious natural language input generates dangerous SQL
**Why it happens:** Directly interpolating AI-generated queries into Prisma/SQL
**How to avoid:**
- AI generates structured query description, not raw SQL
- Backend translates to Prisma with parameterized queries only
- Whitelist allowed tables/fields per tenant role
- Rate limit AI queries per user
**Warning signs:** Unusual query patterns, access to unauthorized data

### Pitfall 5: Layout Not Persisting Correctly

**What goes wrong:** Dashboard layout resets after page refresh or breakpoint change
**Why it happens:** Only storing current breakpoint layout, or not handling `onLayoutChange` for all breakpoints
**How to avoid:**
- Store `layouts` object (all breakpoints) not just `layout` (current)
- Save on `onLayoutChange` with debounce (500ms)
- Provide layouts for largest breakpoint; RGL interpolates smaller ones
**Warning signs:** Layout works on desktop but breaks on tablet/mobile

### Pitfall 6: Migration Rollback Data Loss

**What goes wrong:** Rollback deletes data that was modified after import
**Why it happens:** Rollback uses simple DELETE without checking for post-import changes
**How to avoid:**
- Mark imported records with `migrated_at`, `migration_batch_id`
- Soft-delete only records unchanged since import
- Show user which records have been modified and can't be rolled back
- Keep rollback window short (7 days)
**Warning signs:** User complains about lost work after rollback

## Code Examples

Verified patterns from official sources:

### React-Grid-Layout Responsive Setup

```typescript
// Source: react-grid-layout GitHub README
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Store layouts per breakpoint
const defaultLayouts: Layouts = {
  lg: [
    { i: 'compliance-health', x: 0, y: 0, w: 2, h: 2 },
    { i: 'intake-trends', x: 2, y: 0, w: 4, h: 2 },
    { i: 'case-pipeline', x: 6, y: 0, w: 4, h: 2 },
    { i: 'sla-performance', x: 10, y: 0, w: 2, h: 2 },
  ],
  md: [
    { i: 'compliance-health', x: 0, y: 0, w: 2, h: 2 },
    { i: 'intake-trends', x: 2, y: 0, w: 4, h: 2 },
    { i: 'case-pipeline', x: 6, y: 0, w: 4, h: 2 },
    { i: 'sla-performance', x: 0, y: 2, w: 2, h: 2 },
  ],
  // Provide at least lg; RGL interpolates the rest
};

function Dashboard() {
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);

  const handleLayoutChange = useCallback((_: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts);
    // Debounced save to API
    debouncedSaveLayout(allLayouts);
  }, []);

  return (
    <ResponsiveGridLayout
      layouts={layouts}
      breakpoints={{ lg: 1280, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={100}
      onLayoutChange={handleLayoutChange}
      draggableHandle=".drag-handle"
    >
      {/* widgets */}
    </ResponsiveGridLayout>
  );
}
```

### ExcelJS Streaming Export

```typescript
// Source: ExcelJS documentation
import * as ExcelJS from 'exceljs';
import { PassThrough } from 'stream';

async function streamLargeExport(
  dataSource: AsyncIterable<Record<string, unknown>>,
  columns: ColumnDefinition[],
): Promise<PassThrough> {
  const stream = new PassThrough();

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream,
    useStyles: true,
    useSharedStrings: false, // Faster for large files
  });

  const worksheet = workbook.addWorksheet('Data');

  // Set columns
  worksheet.columns = columns.map(col => ({
    header: col.label,
    key: col.field,
    width: col.width || 15,
  }));

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).commit();

  // Stream rows
  let rowCount = 0;
  for await (const row of dataSource) {
    worksheet.addRow(row).commit(); // commit() is critical for streaming!
    rowCount++;

    // Optional: yield to event loop every 1000 rows
    if (rowCount % 1000 === 0) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  await worksheet.commit();
  await workbook.commit();

  return stream;
}
```

### pptxgenjs Board Report

```typescript
// Source: pptxgenjs documentation
import PptxGenJS from 'pptxgenjs';

interface BoardReportData {
  title: string;
  period: string;
  executiveSummary: string;
  kpis: Array<{ label: string; value: string; trend: 'up' | 'down' | 'flat' }>;
  chartData: Array<{ name: string; values: number[] }>;
}

function generateBoardReport(data: BoardReportData): Promise<Buffer> {
  const pptx = new PptxGenJS();

  pptx.author = 'Ethico Risk Intelligence Platform';
  pptx.title = data.title;
  pptx.layout = 'LAYOUT_16x9';

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText(data.title, {
    x: 0.5, y: 2.5, w: '90%',
    fontSize: 36, bold: true, color: '003366',
  });
  titleSlide.addText(data.period, {
    x: 0.5, y: 3.5, w: '90%',
    fontSize: 18, color: '666666',
  });

  // Executive Summary slide
  const summarySlide = pptx.addSlide();
  summarySlide.addText('Executive Summary', {
    x: 0.5, y: 0.5, fontSize: 24, bold: true,
  });
  summarySlide.addText(data.executiveSummary, {
    x: 0.5, y: 1.2, w: '90%', h: 4,
    fontSize: 14, color: '333333',
    valign: 'top',
  });

  // KPIs slide
  const kpiSlide = pptx.addSlide();
  kpiSlide.addText('Key Metrics', { x: 0.5, y: 0.5, fontSize: 24, bold: true });

  data.kpis.forEach((kpi, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    kpiSlide.addText(kpi.label, {
      x: 0.5 + col * 3.2, y: 1.5 + row * 2,
      fontSize: 12, color: '666666',
    });
    kpiSlide.addText(kpi.value, {
      x: 0.5 + col * 3.2, y: 1.9 + row * 2,
      fontSize: 28, bold: true, color: '003366',
    });
  });

  // Chart slide
  const chartSlide = pptx.addSlide();
  chartSlide.addText('Trends', { x: 0.5, y: 0.5, fontSize: 24, bold: true });
  chartSlide.addChart(pptx.ChartType.line, [
    { name: 'Q1', labels: data.chartData.map(d => d.name), values: data.chartData.map(d => d.values[0]) },
    { name: 'Q2', labels: data.chartData.map(d => d.name), values: data.chartData.map(d => d.values[1]) },
  ], {
    x: 0.5, y: 1.2, w: 9, h: 4.5,
    showLegend: true, legendPos: 'b',
  });

  return pptx.write({ outputType: 'nodebuffer' }) as Promise<Buffer>;
}
```

### CSV Streaming Import with Backpressure

```typescript
// Source: csv-parser documentation + Node.js streams best practices
import * as fs from 'fs';
import csv from 'csv-parser';
import { Transform } from 'stream';

interface ImportResult {
  totalRows: number;
  importedRows: number;
  errors: Array<{ row: number; error: string }>;
}

async function streamCsvImport(
  filePath: string,
  processRow: (row: Record<string, string>) => Promise<void>,
  batchSize = 100,
): Promise<ImportResult> {
  const result: ImportResult = { totalRows: 0, importedRows: 0, errors: [] };
  let batch: Record<string, string>[] = [];
  let rowNumber = 0;

  const processBatch = async () => {
    await Promise.all(batch.map(async (row, i) => {
      try {
        await processRow(row);
        result.importedRows++;
      } catch (error) {
        result.errors.push({ row: rowNumber - batch.length + i + 1, error: error.message });
      }
    }));
    batch = [];
  };

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath)
      .pipe(csv())
      .pipe(new Transform({
        objectMode: true,
        async transform(row, encoding, callback) {
          rowNumber++;
          result.totalRows++;
          batch.push(row);

          if (batch.length >= batchSize) {
            // Pause stream while processing batch (backpressure)
            stream.pause();
            await processBatch();
            stream.resume();
          }
          callback();
        },
        async flush(callback) {
          if (batch.length > 0) {
            await processBatch();
          }
          callback();
        },
      }));

    stream.on('finish', () => resolve(result));
    stream.on('error', reject);
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chart.js via react-chartjs-2 | Recharts native React | 2023 | Better React integration, no wrapper needed |
| react-grid-layout class components | react-grid-layout hooks API (v2) | 2024 | useResponsiveLayout, useContainerWidth hooks |
| ExcelJS full workbook write | ExcelJS streaming writer | 2022 | 70% memory reduction for large files |
| Claude prompt engineering for JSON | Claude structured outputs beta | Nov 2025 | Guaranteed schema compliance |
| Puppeteer full browser per PDF | Puppeteer browser pool | 2024 | Reuse browser instance, just create pages |

**Deprecated/outdated:**
- `react-grid-layout` v1.x class components: Use v1.5+ with hooks or the new hooks API
- Claude JSON mode via system prompt: Use `output_format` with structured outputs beta
- ExcelJS `writeBuffer()` for large files: Use streaming WorkbookWriter

## Open Questions

Things that couldn't be fully resolved:

1. **NAVEX EthicsPoint export file format**
   - What we know: NAVEX exports to PDF, Excel, CSV; Premium Analytics module
   - What's unclear: Exact CSV column structure, field naming conventions
   - Recommendation: Build generic CSV mapper first; contact NAVEX customer for sample export

2. **EQS/Conversant export format**
   - What we know: EQS acquired Conversant (formerly 3ree-bees); has export capabilities
   - What's unclear: Export file structure, whether they use standard format
   - Recommendation: Generic CSV mapper with field mapping UI; request sample from client

3. **Claude structured outputs availability**
   - What we know: Public beta as of Nov 2025, Sonnet 4.5 and Opus 4.1 supported
   - What's unclear: Whether Haiku 4.5 will be added, GA timeline
   - Recommendation: Implement with beta header; have fallback to JSON mode parsing

4. **react-grid-layout hooks API stability**
   - What we know: v2 introduced hooks (useResponsiveLayout, useContainerWidth)
   - What's unclear: Whether v2 is production-ready or still experimental
   - Recommendation: Use v1.5.x with WidthProvider HOC (stable); evaluate v2 for future

## Sources

### Primary (HIGH confidence)
- react-grid-layout GitHub: https://github.com/react-grid-layout/react-grid-layout - API, breakpoints, hooks
- Recharts documentation: https://recharts.github.io/en-US/ - Chart components, ResponsiveContainer
- ExcelJS npm: https://www.npmjs.com/package/exceljs - Streaming API, worksheet operations
- Puppeteer guides: https://pptr.dev/guides/pdf-generation - PDF options, waitUntil
- pptxgenjs docs: https://gitbrent.github.io/PptxGenJS/ - Charts, layouts, Node.js usage
- NestJS queues: https://docs.nestjs.com/techniques/queues - BullMQ integration patterns
- Claude structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs - Beta API

### Secondary (MEDIUM confidence)
- React polling best practices: https://medium.com/@sfcofc/implementing-polling-in-react - Visibility API, delta updates
- CSV streaming Node.js: https://amirmustafaofficial.medium.com/uploading-csv-file-faster-in-node-js-using-streams - Backpressure handling
- Unified inbox patterns: https://www.unipile.com/unified-inbox-and-communication/ - Task aggregation concepts

### Tertiary (LOW confidence)
- NAVEX export capabilities: Marketing docs only, no technical specs publicly available
- Migration rollback strategies: General database migration patterns, not specific to compliance data

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries well-documented, actively maintained, already partially in use
- Architecture: MEDIUM - Patterns verified against documentation but not all tested in this codebase
- Pitfalls: HIGH - Based on documented issues, GitHub issues, and community reports

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (stable libraries, 30-day window; check Claude structured outputs GA status)
