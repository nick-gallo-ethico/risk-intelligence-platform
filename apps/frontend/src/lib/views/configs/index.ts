/**
 * View Configurations Index
 *
 * Central export for all module view configurations.
 * Each module defines its columns, filters, bulk actions, and board configuration.
 */

// Named exports for each module config
export { CASES_VIEW_CONFIG } from "./cases.config";
export { INVESTIGATIONS_VIEW_CONFIG } from "./investigations.config";
export { POLICIES_VIEW_CONFIG } from "./policies.config";
export { DISCLOSURES_VIEW_CONFIG } from "./disclosures.config";
export { INTAKE_FORMS_VIEW_CONFIG } from "./intake-forms.config";
export { PROJECTS_VIEW_CONFIG } from "./projects.config";

// Import for map creation
import { CASES_VIEW_CONFIG } from "./cases.config";
import { INVESTIGATIONS_VIEW_CONFIG } from "./investigations.config";
import { POLICIES_VIEW_CONFIG } from "./policies.config";
import { DISCLOSURES_VIEW_CONFIG } from "./disclosures.config";
import { INTAKE_FORMS_VIEW_CONFIG } from "./intake-forms.config";
import { PROJECTS_VIEW_CONFIG } from "./projects.config";
import type { ModuleViewConfig } from "@/types/view-config";

/**
 * Map of all module configs by moduleType for dynamic lookup.
 *
 * Keys match the moduleType field in each config, which aligns with
 * ViewEntityType values used in saved views.
 */
export const MODULE_VIEW_CONFIGS: Record<string, ModuleViewConfig> = {
  CASES: CASES_VIEW_CONFIG,
  INVESTIGATIONS: INVESTIGATIONS_VIEW_CONFIG,
  POLICIES: POLICIES_VIEW_CONFIG,
  DISCLOSURES: DISCLOSURES_VIEW_CONFIG,
  INTAKE_FORMS: INTAKE_FORMS_VIEW_CONFIG,
  PROJECTS: PROJECTS_VIEW_CONFIG,
};

/**
 * Get a module view configuration by module type.
 *
 * @param moduleType - The module type identifier (e.g., "CASES", "INVESTIGATIONS")
 * @returns The module view configuration or undefined if not found
 *
 * @example
 * ```ts
 * const casesConfig = getModuleViewConfig("CASES");
 * if (casesConfig) {
 *   console.log(casesConfig.entityName.plural); // "Cases"
 * }
 * ```
 */
export function getModuleViewConfig(
  moduleType: string,
): ModuleViewConfig | undefined {
  return MODULE_VIEW_CONFIGS[moduleType];
}

/**
 * Get all available module types.
 *
 * @returns Array of all module type identifiers
 *
 * @example
 * ```ts
 * const moduleTypes = getAvailableModuleTypes();
 * // ["CASES", "INVESTIGATIONS", "POLICIES", "DISCLOSURES", "INTAKE_FORMS"]
 * ```
 */
export function getAvailableModuleTypes(): string[] {
  return Object.keys(MODULE_VIEW_CONFIGS);
}

/**
 * Check if a module type is valid (has a configuration).
 *
 * @param moduleType - The module type to check
 * @returns True if the module type has a configuration
 */
export function isValidModuleType(moduleType: string): boolean {
  return moduleType in MODULE_VIEW_CONFIGS;
}
