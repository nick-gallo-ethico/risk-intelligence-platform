import { QaMode, HotlineNumber, Category, Severity } from "@prisma/client";

/**
 * Client profile returned from phone lookup and profile endpoints.
 * Contains all information an operator needs to handle calls.
 */
export interface ClientProfile {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;

  // Hotline numbers associated with this client
  hotlineNumbers: HotlineNumberInfo[];

  // QA configuration
  qaConfig: QaConfigInfo | null;

  // Active categories for intake form
  categories: CategoryInfo[];

  // Branding for operator console theming (optional)
  branding: BrandingInfo | null;
}

/**
 * Simplified hotline number info.
 */
export interface HotlineNumberInfo {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  isActive: boolean;
}

/**
 * QA configuration info.
 */
export interface QaConfigInfo {
  id: string;
  defaultMode: QaMode;
  samplePercentage: number | null;
  highRiskCategories: string[];
  keywordTriggers: string[];
  categoryOverrides: Record<string, QaMode>;
}

/**
 * Simplified category info for intake forms.
 */
export interface CategoryInfo {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  defaultSeverity: Severity | null;
  isHighRiskForQa: boolean;
}

/**
 * Client branding info (optional).
 */
export interface BrandingInfo {
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  companyName: string | null;
}

/**
 * Result of a QA check - whether a report requires QA review.
 */
export interface QaCheckResult {
  requiresQa: boolean;
  reason: QaCheckReason;
  details?: string;
}

/**
 * Why QA review is required (or not).
 */
export type QaCheckReason =
  | "mode_all" // QA mode is ALL
  | "mode_none" // QA mode is NONE
  | "high_risk_category" // Category is in highRiskCategories
  | "keyword_trigger" // Content contains trigger keyword
  | "category_override" // Category has override mode
  | "sample_selected" // Random sample selection
  | "sample_skipped"; // Random sample not selected

/**
 * Paginated list of clients for manual lookup.
 */
export interface ClientListResult {
  data: ClientListItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Client item in list view.
 */
export interface ClientListItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  hotlineCount: number;
  primaryHotlineNumber: string | null;
}
