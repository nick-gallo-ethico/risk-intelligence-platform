import type { Engine } from "json-rules-engine";

/**
 * Register category-related operators on the engine.
 *
 * Operators:
 * - categoryIn: Check if fact categoryId is in a list of allowed categories
 * - categoryEquals: Check if fact categoryId equals a specific category
 * - categoryInHierarchy: Check if category or any parent is in a list
 */
export function registerCategoryOperators(engine: Engine): void {
  // Check if categoryId is in a list
  engine.addOperator("categoryIn", (factValue: string, jsonValue: string[]) => {
    if (!Array.isArray(jsonValue)) return false;
    return jsonValue.includes(factValue);
  });

  // Exact category match
  engine.addOperator(
    "categoryEquals",
    (factValue: string, jsonValue: string) => {
      return factValue === jsonValue;
    },
  );

  // Category hierarchy match (matches category or any parent)
  // factValue could be the category ID or its parent IDs
  engine.addOperator(
    "categoryInHierarchy",
    (factValue: string, jsonValue: string[]) => {
      if (!Array.isArray(jsonValue)) return false;
      return jsonValue.includes(factValue);
    },
  );
}
