import { Injectable, Logger } from "@nestjs/common";
import {
  UnifiedTask,
  TaskPriority,
  TaskType,
  PRIORITY_WEIGHTS,
  TaskCountsByType,
} from "../entities/unified-task.entity";
import { TaskFiltersDto } from "../dto/my-work.dto";

/**
 * Result from task fetch operations with pagination info.
 */
export interface TaskFetchResult {
  tasks: UnifiedTask[];
  total: number;
  hasMore: boolean;
}

/**
 * Sort options for task lists.
 */
export type TaskSortBy = "priority_due_date" | "due_date" | "created_at";

/**
 * TaskSorterService handles sorting, filtering, and pagination of UnifiedTasks.
 *
 * Key features:
 * - Priority-weighted due date sorting (overdue first, then urgency)
 * - Filter by type, priority, status, and date ranges
 * - Pagination with total count
 * - Task counts by type for dashboard widgets
 *
 * This service is a focused sub-service of TaskAggregatorService,
 * extracted to follow the thin coordinator pattern.
 */
@Injectable()
export class TaskSorterService {
  private readonly logger = new Logger(TaskSorterService.name);

  // ==========================================
  // Public: Sorting Methods
  // ==========================================

  /**
   * Sort tasks based on specified method.
   *
   * @param tasks - Array of unified tasks to sort
   * @param sortBy - Sort method (priority_due_date, due_date, created_at)
   * @returns Sorted array (new array, original unchanged)
   */
  sortTasks(tasks: UnifiedTask[], sortBy: TaskSortBy): UnifiedTask[] {
    switch (sortBy) {
      case "priority_due_date":
        return this.sortByPriorityAndDueDate(tasks);
      case "due_date":
        return this.sortByDueDate(tasks);
      case "created_at":
        return this.sortByCreatedAt(tasks);
      default:
        return this.sortByPriorityAndDueDate(tasks);
    }
  }

  /**
   * Sort tasks by priority-weighted due date.
   * Algorithm: Overdue first, then priority x days until due.
   * Higher priority items with same due date come first.
   *
   * @param tasks - Array of unified tasks
   * @returns New sorted array
   */
  sortByPriorityAndDueDate(tasks: UnifiedTask[]): UnifiedTask[] {
    const now = new Date();

    return [...tasks].sort((a, b) => {
      // Overdue items always first
      const aOverdue = a.dueDate && a.dueDate < now;
      const bOverdue = b.dueDate && b.dueDate < now;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // If both overdue, sort by how overdue (most overdue first)
      if (aOverdue && bOverdue && a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }

      // Priority-weighted score (lower = more urgent)
      // Score = (time until due) / priority_weight
      const aScore = a.dueDate
        ? (a.dueDate.getTime() - now.getTime()) / PRIORITY_WEIGHTS[a.priority]
        : Infinity;
      const bScore = b.dueDate
        ? (b.dueDate.getTime() - now.getTime()) / PRIORITY_WEIGHTS[b.priority]
        : Infinity;

      // Lower score = more urgent = should come first
      if (aScore !== bScore) {
        return aScore - bScore;
      }

      // Tie-breaker: higher priority first
      return PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
    });
  }

  /**
   * Sort tasks by due date only (earliest first).
   * Tasks without due date come last.
   */
  sortByDueDate(tasks: UnifiedTask[]): UnifiedTask[] {
    return [...tasks].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }

  /**
   * Sort tasks by creation/assignment date (newest first).
   */
  sortByCreatedAt(tasks: UnifiedTask[]): UnifiedTask[] {
    return [...tasks].sort(
      (a, b) => b.assignedAt.getTime() - a.assignedAt.getTime(),
    );
  }

  // ==========================================
  // Public: Filtering Methods
  // ==========================================

  /**
   * Apply filters to a task list.
   *
   * @param tasks - Array of tasks to filter
   * @param filters - Filter criteria (types, priorities, statuses)
   * @returns Filtered array (new array)
   */
  applyFilters(tasks: UnifiedTask[], filters?: TaskFiltersDto): UnifiedTask[] {
    if (!filters) return [...tasks];

    let result = [...tasks];

    // Filter by task types
    if (filters.types && filters.types.length > 0) {
      result = result.filter((t) => filters.types!.includes(t.type));
    }

    // Filter by priorities
    if (filters.priorities && filters.priorities.length > 0) {
      result = result.filter((t) => filters.priorities!.includes(t.priority));
    }

    // Filter by statuses
    if (filters.statuses && filters.statuses.length > 0) {
      result = result.filter((t) => filters.statuses!.includes(t.status));
    }

    return result;
  }

  // ==========================================
  // Public: Pagination Methods
  // ==========================================

  /**
   * Paginate results and return with metadata.
   *
   * @param tasks - Full sorted/filtered task array
   * @param limit - Number of items per page
   * @param offset - Starting offset
   * @returns TaskFetchResult with pagination info
   */
  paginateResults(
    tasks: UnifiedTask[],
    limit: number,
    offset: number,
  ): TaskFetchResult {
    const total = tasks.length;
    const paginated = tasks.slice(offset, offset + limit);

    return {
      tasks: paginated,
      total,
      hasMore: offset + paginated.length < total,
    };
  }

  // ==========================================
  // Public: Count Methods
  // ==========================================

  /**
   * Calculate task counts by type.
   * Useful for dashboard widgets showing breakdown.
   *
   * @param tasks - Array of unified tasks
   * @returns Counts for each TaskType
   */
  getCountsByType(tasks: UnifiedTask[]): TaskCountsByType {
    const counts: TaskCountsByType = {
      [TaskType.CASE_ASSIGNMENT]: 0,
      [TaskType.INVESTIGATION_STEP]: 0,
      [TaskType.REMEDIATION_TASK]: 0,
      [TaskType.DISCLOSURE_REVIEW]: 0,
      [TaskType.CAMPAIGN_RESPONSE]: 0,
      [TaskType.APPROVAL_REQUEST]: 0,
      [TaskType.PROJECT_TASK]: 0,
    };

    for (const task of tasks) {
      if (counts[task.type] !== undefined) {
        counts[task.type]++;
      }
    }

    return counts;
  }

  // ==========================================
  // Public: Priority Calculation
  // ==========================================

  /**
   * Calculate priority weight for a task.
   * Used for external sorting or priority display.
   *
   * @param task - Unified task
   * @returns Numeric priority weight (higher = more important)
   */
  calculatePriorityWeight(task: UnifiedTask): number {
    return PRIORITY_WEIGHTS[task.priority];
  }

  /**
   * Calculate overdue score (how overdue a task is).
   * Returns negative values for overdue tasks (more negative = more overdue).
   * Returns positive values for upcoming tasks.
   *
   * @param dueDate - Task due date (or null if no due date)
   * @returns Score in milliseconds (negative = overdue)
   */
  calculateOverdueScore(dueDate: Date | null): number {
    if (!dueDate) {
      return Infinity; // No due date = not urgent
    }

    const now = new Date();
    return dueDate.getTime() - now.getTime();
  }

  /**
   * Check if a task is overdue.
   *
   * @param task - Unified task to check
   * @returns True if task is past due date
   */
  isOverdue(task: UnifiedTask): boolean {
    if (!task.dueDate) return false;
    return task.dueDate < new Date();
  }

  /**
   * Get days until due (negative if overdue).
   *
   * @param task - Unified task
   * @returns Days until due, or null if no due date
   */
  getDaysUntilDue(task: UnifiedTask): number | null {
    if (!task.dueDate) return null;

    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.ceil((task.dueDate.getTime() - now.getTime()) / msPerDay);
  }
}
