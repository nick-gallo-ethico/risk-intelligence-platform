import type { Engine } from "json-rules-engine";

/**
 * Register location-related operators.
 *
 * Operators:
 * - locationIn: Check if location ID is in a list
 * - locationEquals: Exact location match
 * - regionIn: Check if region is in a list (for geographic routing)
 */
export function registerLocationOperators(engine: Engine): void {
  // Check if location ID is in a list of allowed locations
  engine.addOperator("locationIn", (factValue: string, jsonValue: string[]) => {
    if (!Array.isArray(jsonValue)) return false;
    return jsonValue.includes(factValue);
  });

  // Exact location match
  engine.addOperator(
    "locationEquals",
    (factValue: string, jsonValue: string) => {
      return factValue === jsonValue;
    },
  );

  // Region-based matching (location fact should include regionId)
  // Useful for geographic routing to regional teams
  engine.addOperator("regionIn", (factValue: string, jsonValue: string[]) => {
    if (!Array.isArray(jsonValue)) return false;
    return jsonValue.includes(factValue);
  });
}
