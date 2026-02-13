/**
 * Help & Support API Service
 *
 * API client functions for knowledge base articles and support tickets.
 * Provides typed access to all help-related backend endpoints.
 */

import { apiClient } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

/**
 * Full knowledge base article with content
 */
export interface KnowledgeBaseArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  updatedAt: string;
}

/**
 * Article list item (without full content)
 */
export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  updatedAt: string;
}

/**
 * Article category with count
 */
export interface ArticleCategory {
  key: string;
  label: string;
  count: number;
}

/**
 * Support ticket
 */
export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status:
    | "OPEN"
    | "IN_PROGRESS"
    | "WAITING_ON_CUSTOMER"
    | "RESOLVED"
    | "CLOSED";
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating a support ticket
 */
export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category?: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search knowledge base articles.
 *
 * @param query - Optional search query string
 * @param category - Optional category filter
 * @returns List of matching articles
 */
export async function searchArticles(
  query?: string,
  category?: string,
): Promise<ArticleListItem[]> {
  const params = new URLSearchParams();

  if (query) params.set("query", query);
  if (category) params.set("category", category);

  const queryString = params.toString();
  const url = queryString ? `/help/articles?${queryString}` : "/help/articles";

  return apiClient.get<ArticleListItem[]>(url);
}

/**
 * Get a single knowledge base article by slug.
 *
 * @param slug - Article slug
 * @returns Full article with content
 */
export async function getArticle(slug: string): Promise<KnowledgeBaseArticle> {
  return apiClient.get<KnowledgeBaseArticle>(`/help/articles/${slug}`);
}

/**
 * Get all article categories with counts.
 *
 * @returns List of categories
 */
export async function getCategories(): Promise<ArticleCategory[]> {
  return apiClient.get<ArticleCategory[]>("/help/categories");
}

/**
 * Create a new support ticket.
 *
 * @param data - Ticket creation data
 * @returns Created ticket
 */
export async function createTicket(
  data: CreateTicketPayload,
): Promise<SupportTicket> {
  return apiClient.post<SupportTicket>("/help/tickets", data);
}

/**
 * Get the current user's support tickets.
 *
 * @param status - Optional status filter
 * @returns List of user's tickets
 */
export async function getMyTickets(status?: string): Promise<SupportTicket[]> {
  const params = new URLSearchParams();

  if (status) params.set("status", status);

  const queryString = params.toString();
  const url = queryString ? `/help/tickets?${queryString}` : "/help/tickets";

  return apiClient.get<SupportTicket[]>(url);
}

// ============================================================================
// Barrel Export
// ============================================================================

/**
 * Help API object with all functions for convenient importing
 */
export const helpApi = {
  searchArticles,
  getArticle,
  getCategories,
  createTicket,
  getMyTickets,
};
