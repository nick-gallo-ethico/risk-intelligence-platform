import { apiClient } from './api';

// ===========================================
// Type Definitions for Investigation Templates
// ===========================================

/**
 * Template tier (visibility level).
 */
export type TemplateTier = 'OFFICIAL' | 'TEAM' | 'PERSONAL';

/**
 * Template status.
 */
export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/**
 * Template requirement level for category mappings.
 */
export type TemplateRequirement = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';

/**
 * Section within a template.
 */
export interface TemplateSection {
  id: string;
  name: string;
  description?: string;
  order: number;
  items: TemplateItem[];
}

/**
 * Item within a template section.
 */
export interface TemplateItem {
  id: string;
  text: string;
  order: number;
  required: boolean;
  evidenceRequired: boolean;
  guidance?: string;
  dependencies?: string[];
}

/**
 * Investigation template.
 */
export interface InvestigationTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  tier: TemplateTier;
  status: TemplateStatus;
  version: number;
  sections: TemplateSection[];
  estimatedDuration?: string;
  applicableCategories?: string[];
  createdById: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
}

/**
 * Template list response with pagination.
 */
export interface TemplateListResponse {
  data: InvestigationTemplate[];
  total: number;
  limit: number;
  page: number;
}

/**
 * Template recommendation for a category.
 */
export interface TemplateRecommendation {
  template: InvestigationTemplate;
  requirement: TemplateRequirement;
  priority: number;
  source: 'direct' | 'parent' | 'default';
}

/**
 * Template recommendations response.
 */
export interface TemplateRecommendationsResponse {
  recommendations: TemplateRecommendation[];
  required: boolean;
}

// ===========================================
// API Functions
// ===========================================

/**
 * Get all templates accessible to the current user.
 */
export async function getTemplates(options?: {
  page?: number;
  limit?: number;
  tier?: TemplateTier;
  status?: TemplateStatus;
  categoryId?: string;
  search?: string;
}): Promise<TemplateListResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.tier) params.set('tier', options.tier);
  if (options?.status) params.set('status', options.status);
  if (options?.categoryId) params.set('categoryId', options.categoryId);
  if (options?.search) params.set('search', options.search);

  const queryString = params.toString();
  const url = `/investigation-templates${queryString ? `?${queryString}` : ''}`;

  return apiClient.get<TemplateListResponse>(url);
}

/**
 * Get a single template by ID.
 */
export async function getTemplate(id: string): Promise<InvestigationTemplate> {
  return apiClient.get<InvestigationTemplate>(`/investigation-templates/${id}`);
}

/**
 * Get template recommendations for a category.
 */
export async function getTemplateRecommendations(
  categoryId?: string
): Promise<TemplateRecommendationsResponse> {
  const params = categoryId ? `?categoryId=${categoryId}` : '';
  return apiClient.get<TemplateRecommendationsResponse>(
    `/investigation-templates/recommend${params}`
  );
}

/**
 * Check if a template is required for a category.
 */
export async function isTemplateRequired(
  categoryId?: string
): Promise<{ required: boolean }> {
  const params = categoryId ? `?categoryId=${categoryId}` : '';
  return apiClient.get<{ required: boolean }>(
    `/investigation-templates/is-required${params}`
  );
}
