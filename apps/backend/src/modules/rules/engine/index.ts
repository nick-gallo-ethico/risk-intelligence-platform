/**
 * Rules Engine exports.
 *
 * The engine subdirectory contains:
 * - RulesEngineService: Core wrapper around json-rules-engine
 * - Operators: Custom operators for domain-specific conditions
 * - Actions: Action executors for rule outcomes
 */

export * from "./rules-engine.service";
export * from "./operators";
export * from "./actions";
