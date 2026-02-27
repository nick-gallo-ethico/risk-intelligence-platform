import type { Engine } from "json-rules-engine";

/**
 * Severity level numeric mapping for comparison operators.
 * Lower values = lower severity, higher values = higher severity.
 */
const SEVERITY_LEVELS: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

/**
 * Register severity-related operators.
 *
 * Operators:
 * - severityAtLeast: Check if severity is at or above threshold
 * - severityEquals: Exact severity match (case-insensitive)
 * - severityIn: Severity in list (case-insensitive)
 */
export function registerSeverityOperators(engine: Engine): void {
  // Check if severity is at or above a threshold
  engine.addOperator(
    "severityAtLeast",
    (factValue: string, jsonValue: string) => {
      const factLevel = SEVERITY_LEVELS[factValue?.toUpperCase()] || 0;
      const targetLevel = SEVERITY_LEVELS[jsonValue?.toUpperCase()] || 0;
      return factLevel >= targetLevel;
    },
  );

  // Exact severity match (case-insensitive)
  engine.addOperator(
    "severityEquals",
    (factValue: string, jsonValue: string) => {
      return factValue?.toUpperCase() === jsonValue?.toUpperCase();
    },
  );

  // Check if severity is in a list (case-insensitive)
  engine.addOperator("severityIn", (factValue: string, jsonValue: string[]) => {
    if (!Array.isArray(jsonValue)) return false;
    const normalizedFact = factValue?.toUpperCase();
    return jsonValue.map((v) => v?.toUpperCase()).includes(normalizedFact);
  });
}
