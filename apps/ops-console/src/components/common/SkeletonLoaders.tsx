import { cn } from '@/lib/utils';

/**
 * Base skeleton component with pulse animation.
 * Use for creating custom skeleton layouts.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Full page skeleton with header, stats cards, and content area.
 * Use for dashboard or list page loading states.
 */
export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6" aria-label="Loading page content" role="status">
      <span className="sr-only">Loading...</span>

      {/* Header with title and action button */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats cards row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>

      {/* Main content area */}
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/**
 * Table skeleton with header row and configurable data rows.
 * Use for data table loading states.
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading table data" role="status">
      <span className="sr-only">Loading table...</span>

      {/* Header row */}
      <div className="flex gap-4 pb-3 border-b">
        <Skeleton className="h-5 w-6" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Card skeleton for content cards.
 * Use for card-based layouts loading states.
 */
export function CardSkeleton() {
  return (
    <div
      className="border rounded-lg p-4 space-y-3"
      aria-label="Loading card"
      role="status"
    >
      <span className="sr-only">Loading...</span>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/**
 * Form skeleton with configurable number of fields.
 * Use for form loading states.
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6" aria-label="Loading form" role="status">
      <span className="sr-only">Loading form...</span>

      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}

      {/* Submit button */}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

/**
 * Detail page skeleton with avatar, header, and content sections.
 * Use for entity detail pages.
 */
export function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6" aria-label="Loading details" role="status">
      <span className="sr-only">Loading details...</span>

      {/* Header with avatar */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>

      {/* Main content area */}
      <Skeleton className="h-48" />
    </div>
  );
}

/**
 * Health score card skeleton for Client Success Dashboard.
 */
export function HealthScoreCardSkeleton() {
  return (
    <div
      className="border rounded-lg p-4 space-y-3"
      aria-label="Loading health score"
      role="status"
    >
      <span className="sr-only">Loading health score...</span>

      {/* Organization name */}
      <Skeleton className="h-5 w-2/3" />

      {/* Score circle placeholder */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>

      {/* Component scores */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

/**
 * Implementation task list skeleton.
 */
export function TaskListSkeleton({ tasks = 5 }: { tasks?: number }) {
  return (
    <div className="space-y-2" aria-label="Loading tasks" role="status">
      <span className="sr-only">Loading tasks...</span>

      {Array.from({ length: tasks }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Operator status board skeleton for Hotline Operations.
 */
export function OperatorBoardSkeleton({ operators = 6 }: { operators?: number }) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      aria-label="Loading operators"
      role="status"
    >
      <span className="sr-only">Loading operator status...</span>

      {Array.from({ length: operators }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 text-center space-y-2">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
        </div>
      ))}
    </div>
  );
}

/**
 * QA queue item skeleton for Hotline Operations.
 */
export function QaQueueSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading QA queue" role="status">
      <span className="sr-only">Loading QA queue...</span>

      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Course catalog skeleton for Training Portal.
 */
export function CourseCatalogSkeleton({ tracks = 3 }: { tracks?: number }) {
  return (
    <div className="space-y-8" aria-label="Loading courses" role="status">
      <span className="sr-only">Loading course catalog...</span>

      {Array.from({ length: tracks }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ))}
    </div>
  );
}

// Export the base Skeleton for custom compositions
export { Skeleton };
