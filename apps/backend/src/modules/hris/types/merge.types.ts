/**
 * Merge.dev HRIS unified model types.
 * These types represent the standardized data model that Merge.dev provides
 * across 50+ HRIS systems (Workday, BambooHR, ADP, etc.).
 *
 * @see https://docs.merge.dev/hris/employees/
 */

/**
 * Merge.dev Employee model - unified representation of an employee
 * from any connected HRIS system.
 */
export interface MergeEmployee {
  /** Merge's unique identifier for this employee */
  id: string;

  /** The original employee ID from the remote HRIS system */
  remote_id: string;

  /** Employee's first name */
  first_name: string;

  /** Employee's last name */
  last_name: string;

  /** Full display name (may include middle name, suffix, etc.) */
  display_full_name: string;

  /** Work email address */
  work_email: string;

  /** Personal email address (if available) */
  personal_email?: string;

  /** Mobile phone number */
  mobile_phone_number?: string;

  /** Work location name or identifier */
  work_location?: string;

  /** Merge employee ID of this employee's manager */
  manager?: string;

  /** Team or department name */
  team?: string;

  /** Employment status */
  employment_status?: "ACTIVE" | "INACTIVE" | "PENDING";

  /** Date employment ended (if applicable) */
  termination_date?: string;

  /** Date employment started */
  start_date?: string;

  /** Job title */
  job_title?: string;

  /** Raw data from the remote HRIS (preserved for reference) */
  remote_data?: unknown;
}

/**
 * Merge.dev paginated response wrapper.
 * All list endpoints return paginated responses with this structure.
 */
export interface MergePaginatedResponse<T> {
  /** URL for the next page of results, or null if no more pages */
  next?: string;

  /** URL for the previous page of results, or null if on first page */
  previous?: string;

  /** Array of results for this page */
  results: T[];
}

/**
 * Merge.dev linked account/integration information.
 * Represents a customer's connection to their HRIS system.
 */
export interface MergeIntegration {
  /** Merge's unique identifier for this integration link */
  id: string;

  /** Name of the connected HRIS system (e.g., "Workday", "BambooHR") */
  integration_name: string;

  /** Categories of data available (e.g., ["hris"]) */
  categories: string[];

  /** Customer's identifier in your system (set during Merge Link) */
  end_user_origin_id: string;
}

/**
 * Result of a sync operation - tracks created, updated, skipped, and errors.
 */
export interface SyncStats {
  /** Number of new records created */
  created: number;

  /** Number of existing records updated */
  updated: number;

  /** Number of records skipped (no changes needed) */
  skipped: number;

  /** Errors encountered during sync */
  errors: Array<{
    employeeId: string;
    error: string;
  }>;

  /** Total duration of the sync in milliseconds */
  durationMs: number;
}
