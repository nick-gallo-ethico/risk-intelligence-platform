/**
 * Help & Support System Type Definitions
 *
 * Constants and types for the knowledge base and support ticket system.
 */

/**
 * Knowledge base article categories.
 * Used for organizing articles and filtering.
 */
export const KB_CATEGORIES = {
  GETTING_STARTED: { key: "getting-started", label: "Getting Started" },
  CASES: { key: "cases", label: "Cases" },
  INVESTIGATIONS: { key: "investigations", label: "Investigations" },
  CAMPAIGNS: { key: "campaigns", label: "Campaigns" },
  DISCLOSURES: { key: "disclosures", label: "Disclosures" },
  REPORTS: { key: "reports", label: "Reports & Analytics" },
  POLICIES: { key: "policies", label: "Policies" },
  SETTINGS: { key: "settings", label: "Settings & Admin" },
  FAQ: { key: "faq", label: "Frequently Asked Questions" },
} as const;

export type KBCategoryKey = keyof typeof KB_CATEGORIES;
export type KBCategory = (typeof KB_CATEGORIES)[KBCategoryKey];

/**
 * Maps category key strings to their labels.
 */
export function getCategoryLabel(categoryKey: string): string {
  const entry = Object.values(KB_CATEGORIES).find((c) => c.key === categoryKey);
  return entry?.label || categoryKey;
}

/**
 * Article list item (without full content).
 */
export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Full article with content.
 */
export interface ArticleDetail extends ArticleListItem {
  content: string;
  organizationId: string | null;
}

/**
 * Category with article count.
 */
export interface CategoryWithCount {
  key: string;
  label: string;
  count: number;
}

/**
 * Support ticket list item.
 */
export interface TicketListItem {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Full support ticket details.
 */
export interface TicketDetail extends TicketListItem {
  description: string;
  resolvedAt: Date | null;
  closedAt: Date | null;
}

/**
 * Event payload for ticket creation.
 */
export interface TicketCreatedEvent {
  ticket: {
    id: string;
    ticketNumber: string;
    subject: string;
    description: string;
    priority: string;
    status: string;
  };
  organizationId: string;
  userId: string;
}
