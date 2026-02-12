/**
 * Custom Properties API Service
 *
 * API client for custom property management endpoints.
 * Handles CRUD operations for custom fields across entity types.
 *
 * Endpoints are under /api/v1/custom-properties namespace.
 * @see CustomPropertiesController in backend
 */

import { apiClient } from "@/lib/api";
import type {
  CustomProperty,
  CustomPropertyEntityType,
  CreateCustomPropertyDto,
  UpdateCustomPropertyDto,
} from "@/types/custom-property";

/**
 * List all custom properties for the organization.
 * Optionally includes inactive (archived) properties.
 *
 * GET /api/v1/custom-properties
 *
 * @param includeInactive - Whether to include archived properties (default: false)
 */
export async function listAll(
  includeInactive = false,
): Promise<CustomProperty[]> {
  const params = includeInactive ? "?includeInactive=true" : "";
  return apiClient.get<CustomProperty[]>(`/custom-properties${params}`);
}

/**
 * List custom properties for a specific entity type.
 * Returns only active properties by default.
 *
 * GET /api/v1/custom-properties/by-entity/:entityType
 *
 * @param entityType - Entity type to filter by (CASE, INVESTIGATION, PERSON, RIU)
 */
export async function listByEntity(
  entityType: CustomPropertyEntityType,
): Promise<CustomProperty[]> {
  return apiClient.get<CustomProperty[]>(
    `/custom-properties/by-entity/${entityType}`,
  );
}

/**
 * Get a single custom property by ID.
 *
 * GET /api/v1/custom-properties/:id
 *
 * @param id - Custom property ID
 */
export async function getById(id: string): Promise<CustomProperty> {
  return apiClient.get<CustomProperty>(`/custom-properties/${id}`);
}

/**
 * Get default values for all custom properties of an entity type.
 * Returns a key-value map of property keys to default values.
 *
 * GET /api/v1/custom-properties/defaults/:entityType
 *
 * @param entityType - Entity type to get defaults for
 */
export async function getDefaults(
  entityType: CustomPropertyEntityType,
): Promise<Record<string, unknown>> {
  return apiClient.get<Record<string, unknown>>(
    `/custom-properties/defaults/${entityType}`,
  );
}

/**
 * Create a new custom property.
 * Requires SYSTEM_ADMIN or COMPLIANCE_OFFICER role.
 *
 * POST /api/v1/custom-properties
 *
 * @param dto - Property creation data
 */
export async function create(
  dto: CreateCustomPropertyDto,
): Promise<CustomProperty> {
  return apiClient.post<CustomProperty>("/custom-properties", dto);
}

/**
 * Update an existing custom property.
 * Requires SYSTEM_ADMIN or COMPLIANCE_OFFICER role.
 *
 * PUT /api/v1/custom-properties/:id
 *
 * @param id - Property ID to update
 * @param dto - Property update data
 */
export async function update(
  id: string,
  dto: UpdateCustomPropertyDto,
): Promise<CustomProperty> {
  return apiClient.put<CustomProperty>(`/custom-properties/${id}`, dto);
}

/**
 * Archive (soft delete) a custom property.
 * Sets isActive=false. Requires SYSTEM_ADMIN or COMPLIANCE_OFFICER role.
 *
 * DELETE /api/v1/custom-properties/:id
 *
 * @param id - Property ID to archive
 */
export async function remove(id: string): Promise<void> {
  return apiClient.delete<void>(`/custom-properties/${id}`);
}

/**
 * Reorder custom properties within an entity type.
 * Updates displayOrder for multiple properties atomically.
 * Requires SYSTEM_ADMIN or COMPLIANCE_OFFICER role.
 *
 * PUT /api/v1/custom-properties/reorder/:entityType
 *
 * @param entityType - Entity type to reorder properties for
 * @param orders - Array of property IDs with new display orders
 */
export async function reorder(
  entityType: CustomPropertyEntityType,
  orders: { id: string; displayOrder: number }[],
): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(
    `/custom-properties/reorder/${entityType}`,
    orders,
  );
}

/**
 * Validate custom property values against property definitions.
 * Returns validation result with errors and sanitized values.
 *
 * POST /api/v1/custom-properties/validate/:entityType
 *
 * @param entityType - Entity type to validate against
 * @param values - Key-value map of property values to validate
 */
export async function validate(
  entityType: CustomPropertyEntityType,
  values: Record<string, unknown>,
): Promise<{
  valid: boolean;
  errors: { key: string; message: string }[];
  sanitized: Record<string, unknown>;
}> {
  return apiClient.post<{
    valid: boolean;
    errors: { key: string; message: string }[];
    sanitized: Record<string, unknown>;
  }>(`/custom-properties/validate/${entityType}`, values);
}

// Export all functions as a single API object for convenience
export const customPropertiesApi = {
  listAll,
  listByEntity,
  getById,
  getDefaults,
  create,
  update,
  remove,
  reorder,
  validate,
};
