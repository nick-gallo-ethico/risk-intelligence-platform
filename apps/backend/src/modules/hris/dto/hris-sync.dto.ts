import { IsString, IsOptional, IsBoolean } from "class-validator";

/**
 * DTO for triggering an HRIS sync operation.
 */
export class TriggerSyncDto {
  /**
   * Merge.dev account token for the organization's HRIS connection.
   * This token is organization-specific and authorizes access to their HRIS data.
   */
  @IsString()
  accountToken: string;

  /**
   * If true, syncs all employees regardless of changes.
   * If false (default), only syncs employees with changes.
   */
  @IsBoolean()
  @IsOptional()
  fullSync?: boolean;
}

/**
 * Result of a sync operation.
 * Tracks created, updated, skipped, and any errors encountered.
 */
export class SyncResultDto {
  /** Number of new Person records created */
  created: number;

  /** Number of existing Person records updated */
  updated: number;

  /** Number of employees skipped (no changes needed) */
  skipped: number;

  /** Errors encountered during sync (non-fatal, sync continues) */
  errors: Array<{
    employeeId: string;
    error: string;
  }>;

  /** Total duration of the sync in milliseconds */
  durationMs: number;
}
