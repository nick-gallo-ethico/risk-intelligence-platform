/**
 * Common Types Barrel Export
 *
 * Provides centralized access to shared type definitions.
 * Import from '@common/types' for convenience.
 */

// Prisma type-safe model accessors
export * from "./prisma.types";

// SAML authentication types
export * from "./saml.types";

// Workflow type re-exports
export * from "./workflow.types";

// Rules engine types for threshold automation
export * from "./rules-engine.types";

// Express request augmentations
export * from "./request.types";
