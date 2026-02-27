import type { Engine } from "json-rules-engine";
import { registerCategoryOperators } from "./category.operator";
import { registerSeverityOperators } from "./severity.operator";
import { registerLocationOperators } from "./location.operator";

/**
 * Register all custom operators on a json-rules-engine instance.
 *
 * This function registers:
 * - Category operators: categoryIn, categoryEquals, categoryInHierarchy
 * - Severity operators: severityAtLeast, severityEquals, severityIn
 * - Location operators: locationIn, locationEquals, regionIn
 * - Generic utility operators: inArray, containsAny, notEmpty
 */
export function registerAllOperators(engine: Engine): void {
  registerCategoryOperators(engine);
  registerSeverityOperators(engine);
  registerLocationOperators(engine);

  // Generic utility operators

  /**
   * Check if a single value exists in an array.
   * Example: { fact: 'sourceChannel', operator: 'inArray', value: ['PHONE', 'WEB'] }
   */
  engine.addOperator("inArray", (factValue: unknown, jsonValue: unknown[]) => {
    if (!Array.isArray(jsonValue)) return false;
    return jsonValue.includes(factValue);
  });

  /**
   * Check if any element of fact array exists in target array.
   * Example: { fact: 'tags', operator: 'containsAny', value: ['urgent', 'escalated'] }
   */
  engine.addOperator(
    "containsAny",
    (factValue: unknown[], jsonValue: unknown[]) => {
      if (!Array.isArray(factValue) || !Array.isArray(jsonValue)) return false;
      return jsonValue.some((v) => factValue.includes(v));
    },
  );

  /**
   * Check if a value is not empty (null, undefined, empty string, empty array).
   * Example: { fact: 'reporterEmail', operator: 'notEmpty', value: true }
   */
  engine.addOperator("notEmpty", (factValue: unknown) => {
    if (factValue === null || factValue === undefined) return false;
    if (typeof factValue === "string") return factValue.trim().length > 0;
    if (Array.isArray(factValue)) return factValue.length > 0;
    return true;
  });
}

export { registerCategoryOperators } from "./category.operator";
export { registerSeverityOperators } from "./severity.operator";
export { registerLocationOperators } from "./location.operator";
