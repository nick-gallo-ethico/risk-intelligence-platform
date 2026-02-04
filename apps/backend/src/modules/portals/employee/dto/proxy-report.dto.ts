/**
 * DTOs for manager proxy reporting.
 */
import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Reason why manager is submitting on behalf of an employee.
 * Required for audit trail.
 */
export enum ProxyReason {
  /** Employee explicitly requested manager to submit */
  REQUESTED_BY_EMPLOYEE = 'REQUESTED_BY_EMPLOYEE',
  /** Employee has language barriers */
  LANGUAGE_BARRIER = 'LANGUAGE_BARRIER',
  /** Employee has technical difficulties accessing the system */
  TECHNICAL_DIFFICULTY = 'TECHNICAL_DIFFICULTY',
  /** Other reason (requires explanation in notes) */
  OTHER = 'OTHER',
}

/**
 * DTO for submitting a proxy report on behalf of an employee.
 */
export class ProxyReportDto {
  /**
   * The employee's Person ID (who the report is for).
   */
  @IsUUID()
  employeePersonId!: string;

  /**
   * Category ID for the report.
   */
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  /**
   * Content/details of the report.
   */
  @IsString()
  @MinLength(10, { message: 'Report content must be at least 10 characters' })
  @MaxLength(50000, { message: 'Report content cannot exceed 50000 characters' })
  content!: string;

  /**
   * Reason why manager is submitting proxy report.
   * Required for audit trail.
   */
  @IsEnum(ProxyReason, { message: 'Invalid proxy reason' })
  reason!: ProxyReason;

  /**
   * Additional notes about the proxy reason (required if OTHER).
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reasonNotes?: string;

  /**
   * Flag this report as urgent.
   */
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;
}

/**
 * Team member summary for manager view.
 */
export interface TeamMember {
  /** Person ID */
  id: string;
  /** Full name */
  name: string;
  /** Work email */
  email: string | null;
  /** Job title */
  jobTitle: string | null;
  /** Department/business unit name */
  department: string | null;
}

/**
 * Result of a proxy report submission.
 */
export interface ProxySubmissionResult {
  /** Access code for the employee (not for manager) */
  accessCode: string;
  /** RIU ID */
  reportId: string;
  /** Reference number (RIU-YYYY-NNNNN) */
  referenceNumber: string;
  /** Employee's name */
  employeeName: string;
}

/**
 * Summary of a proxy submission made by a manager.
 */
export interface ProxySubmission {
  /** RIU ID */
  reportId: string;
  /** Employee's name */
  employeeName: string;
  /** When submitted */
  submittedAt: Date;
  /** Current RIU status */
  status: string;
  /** Proxy reason */
  reason: ProxyReason;
}
