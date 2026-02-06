/**
 * UsageMetric Entity Description
 *
 * This file documents the UsageMetric Prisma model for tracking daily usage statistics.
 *
 * UsageMetric stores daily aggregated statistics per tenant:
 * - Login metrics (active users, total users)
 * - Case metrics (created, closed, on-time, overdue)
 * - Campaign metrics (active, assignments, completions)
 * - Support metrics (ticket count)
 *
 * These metrics are used to calculate component scores in TenantHealthScore.
 *
 * @see schema.prisma for the actual model definition
 * @see health-metrics.types.ts for health calculation
 */

/**
 * UsageMetric represents daily usage statistics for a tenant.
 *
 * Prisma model:
 * ```prisma
 * model UsageMetric {
 *   id                   String   @id @default(uuid())
 *   organizationId       String   @map("organization_id")
 *   metricDate           DateTime @map("metric_date") @db.Date
 *
 *   // Login metrics
 *   activeUsers          Int      @map("active_users")
 *   totalUsers           Int      @map("total_users")
 *
 *   // Case metrics
 *   casesCreated         Int      @map("cases_created")
 *   casesClosed          Int      @map("cases_closed")
 *   casesOnTime          Int      @map("cases_on_time")
 *   casesOverdue         Int      @map("cases_overdue")
 *
 *   // Campaign metrics
 *   campaignsActive      Int      @default(0) @map("campaigns_active")
 *   assignmentsTotal     Int      @default(0) @map("assignments_total")
 *   assignmentsCompleted Int      @default(0) @map("assignments_completed")
 *
 *   // Support metrics
 *   supportTickets       Int      @default(0) @map("support_tickets")
 *
 *   createdAt            DateTime @default(now()) @map("created_at")
 *
 *   // Relations
 *   organization         Organization @relation(...)
 * }
 * ```
 */
export interface UsageMetric {
  /** Unique identifier */
  id: string;

  /** Organization this metric belongs to */
  organizationId: string;

  /** Date of the metric (daily granularity, stored as Date without time) */
  metricDate: Date;

  /** Number of users who logged in that day */
  activeUsers: number;

  /** Total number of enabled users */
  totalUsers: number;

  /** Number of cases created that day */
  casesCreated: number;

  /** Number of cases closed that day */
  casesClosed: number;

  /** Number of cases closed within SLA */
  casesOnTime: number;

  /** Number of cases that went overdue */
  casesOverdue: number;

  /** Number of active campaigns */
  campaignsActive: number;

  /** Total number of campaign assignments */
  assignmentsTotal: number;

  /** Number of completed campaign assignments */
  assignmentsCompleted: number;

  /** Number of support tickets opened */
  supportTickets: number;

  /** Record creation timestamp */
  createdAt: Date;
}

/**
 * DTO for creating a usage metric record.
 */
export interface CreateUsageMetricDto {
  organizationId: string;
  metricDate: Date;
  activeUsers: number;
  totalUsers: number;
  casesCreated: number;
  casesClosed: number;
  casesOnTime: number;
  casesOverdue: number;
  campaignsActive?: number;
  assignmentsTotal?: number;
  assignmentsCompleted?: number;
  supportTickets?: number;
}

/**
 * DTO for updating a usage metric record.
 */
export interface UpdateUsageMetricDto {
  activeUsers?: number;
  totalUsers?: number;
  casesCreated?: number;
  casesClosed?: number;
  casesOnTime?: number;
  casesOverdue?: number;
  campaignsActive?: number;
  assignmentsTotal?: number;
  assignmentsCompleted?: number;
  supportTickets?: number;
}

/**
 * Aggregated usage metrics over a period.
 */
export interface UsageMetricAggregate {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;

  /** Average daily active users */
  avgActiveUsers: number;

  /** Total cases created in period */
  totalCasesCreated: number;

  /** Total cases closed in period */
  totalCasesClosed: number;

  /** SLA compliance rate (casesOnTime / casesClosed) */
  slaComplianceRate: number;

  /** Campaign completion rate (assignmentsCompleted / assignmentsTotal) */
  campaignCompletionRate: number;

  /** Average daily support tickets */
  avgSupportTickets: number;
}

/**
 * Daily snapshot for trend charts.
 */
export interface UsageMetricSnapshot {
  date: Date;
  loginRate: number; // activeUsers / totalUsers
  caseVelocity: number; // casesClosed / casesCreated (if > 0)
  slaComplianceRate: number; // casesOnTime / casesClosed (if > 0)
  campaignCompletionRate: number; // assignmentsCompleted / assignmentsTotal (if > 0)
}
