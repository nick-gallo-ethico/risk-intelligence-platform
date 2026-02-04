/**
 * Operator Console Types
 *
 * Frontend type definitions for the Operator Console.
 * These types mirror the backend types for type safety across the API boundary.
 */

import type { QaMode, Severity, DirectiveStage, RiuQaStatus } from '@prisma/client';

/**
 * Client profile returned from phone lookup and profile endpoints.
 * Contains all information an operator needs to handle calls.
 */
export interface ClientProfile {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;

  /** Hotline numbers associated with this client */
  hotlineNumbers: HotlineNumber[];

  /** QA configuration */
  qaConfig: QaConfig | null;

  /** Active categories for intake form */
  categories: CategoryInfo[];

  /** Branding for operator console theming (optional) */
  branding: BrandingInfo | null;
}

/**
 * Hotline number associated with a client.
 */
export interface HotlineNumber {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  isActive: boolean;
}

/**
 * QA configuration for a client.
 * Determines how reports are routed for QA review.
 */
export interface QaConfig {
  id: string;
  /** Default QA mode for the client */
  defaultMode: 'ALL' | 'RISK_BASED' | 'SAMPLE' | 'NONE';
  /** Sample percentage when mode is SAMPLE */
  samplePercentage: number | null;
  /** Category IDs that always go to QA */
  highRiskCategories: string[];
  /** Keywords that trigger QA regardless of mode */
  keywordTriggers: string[];
  /** Per-category mode overrides */
  categoryOverrides: Record<string, 'ALL' | 'RISK_BASED' | 'SAMPLE' | 'NONE'>;
}

/**
 * Category info for intake forms.
 */
export interface CategoryInfo {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  defaultSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  isHighRiskForQa: boolean;
}

/**
 * Client branding info.
 */
export interface BrandingInfo {
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  companyName: string | null;
}

/**
 * Call directives organized by stage.
 */
export interface CallDirectives {
  /** Opening directives - read at the start of the call */
  opening: Directive[];

  /** Intake directives - general guidance during intake process */
  intake: Directive[];

  /** Category-specific directives - loaded when category is selected */
  categorySpecific: Directive[];

  /** Closing directives - read at the end of the call */
  closing: Directive[];
}

/**
 * A single directive (script or guidance text).
 */
export interface Directive {
  id: string;
  title: string;
  content: string;
  /** If true, operator should read this verbatim to caller */
  isReadAloud: boolean;
  order: number;
  stage: 'OPENING' | 'INTAKE' | 'CATEGORY_SPECIFIC' | 'CLOSING';
  /** Category for category-specific directives */
  category: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}

/**
 * HRIS search result.
 */
export interface HrisResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  jobTitle: string | null;
  department: string | null;
  businessUnit: string | null;
  location: string | null;
  managerId: string | null;
  managerName: string | null;
}

/**
 * Caller history item - previous RIUs from same phone number.
 */
export interface CallerHistoryItem {
  id: string;
  referenceNumber: string;
  category: string | null;
  status: string;
  createdAt: string;
  summary: string | null;
}

/**
 * QA queue item for list view.
 */
export interface QaQueueItem {
  riuId: string;
  referenceNumber: string;
  category: string | null;
  categoryCode: string | null;
  severityScore: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  clientName: string;
  clientId: string;
  operatorName: string;
  operatorId: string;
  createdAt: string;
  qaStatus: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  qaReviewerId: string | null;
  qaClaimedAt: string | null;
  flags: QaQueueFlag[];
}

/**
 * Flags that can be applied to QA queue items.
 */
export enum QaQueueFlag {
  HIGH_SEVERITY = 'HIGH_SEVERITY',
  KEYWORD_TRIGGER = 'KEYWORD_TRIGGER',
  HIGH_RISK_CATEGORY = 'HIGH_RISK_CATEGORY',
  URGENT = 'URGENT',
  RESUBMISSION = 'RESUBMISSION',
}

/**
 * Paginated QA queue result.
 */
export interface PaginatedQaQueueResult {
  data: QaQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
