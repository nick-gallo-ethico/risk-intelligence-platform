import { z } from "zod";

/**
 * Skill scope determines where a skill is available.
 */
export enum SkillScope {
  PLATFORM = "platform", // Available everywhere
  ORG = "org", // Organization-specific
  TEAM = "team", // Team-specific
  USER = "user", // User-defined
}

/**
 * Context passed to skill execution.
 * Contains information about the current user, entity, and permissions.
 */
export interface SkillContext {
  organizationId: string;
  userId: string;
  entityType?: string;
  entityId?: string;
  permissions: string[];
}

/**
 * Result of skill execution.
 * Includes success/failure, data, and metadata about the execution.
 */
export interface SkillResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
    model?: string;
  };
}

/**
 * Definition of a skill.
 * Skills are reusable AI capabilities with defined inputs and outputs.
 */
export interface SkillDefinition<TInput = unknown, TOutput = unknown> {
  /** Unique skill identifier (e.g., 'note-cleanup', 'summarize') */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description shown in skill discovery */
  description: string;
  /** Scope level (platform, org, team, user) */
  scope: SkillScope;
  /** ID of the scoped entity (org/team/user ID) if not platform scope */
  scopeId?: string;
  /** Restrict to specific entity types (e.g., ['case', 'investigation']) */
  entityTypes?: string[];
  /** Permissions required to execute this skill */
  requiredPermissions: string[];
  /** Zod schema for validating input */
  inputSchema: z.ZodType<TInput>;
  /** Execute the skill */
  execute: (input: TInput, context: SkillContext) => Promise<SkillResult<TOutput>>;
}

/**
 * Convert a Zod schema to JSON Schema for tool definitions.
 * Simplified implementation that works across Zod versions.
 * For production, consider using zod-to-json-schema library.
 *
 * @param schema - Zod schema to convert
 * @returns JSON Schema representation
 */
export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Use type property if available (Zod 4.x compatible)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = schema._def as any;
  const typeName = getZodTypeName(schema);

  if (typeName === "ZodObject") {
    const shape =
      typeof def.shape === "function"
        ? (def.shape as () => Record<string, z.ZodType>)()
        : (def.shape as Record<string, z.ZodType>);

    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodTypeToJsonSchema(value as z.ZodType);

      if (!isOptionalType(value as z.ZodType)) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  return { type: "object" };
}

/**
 * Get the Zod type name in a version-agnostic way.
 */
function getZodTypeName(zodType: z.ZodType): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = zodType._def as any;
  // Try different ways Zod versions expose type name
  if (def.typeName) return def.typeName as string;
  if (def.type) return def.type as string;
  return zodType.constructor.name;
}

/**
 * Check if a Zod type is optional.
 */
function isOptionalType(zodType: z.ZodType): boolean {
  const typeName = getZodTypeName(zodType);
  return typeName === "ZodOptional" || typeName === "ZodDefault";
}

/**
 * Convert a Zod type to JSON Schema type.
 * Handles common Zod types in a version-agnostic way.
 */
function zodTypeToJsonSchema(zodType: z.ZodType): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = zodType._def as any;
  const typeName = getZodTypeName(zodType);
  const description = zodType.description;

  switch (typeName) {
    case "ZodString":
      return { type: "string", ...(description && { description }) };

    case "ZodNumber":
      return { type: "number", ...(description && { description }) };

    case "ZodBoolean":
      return { type: "boolean", ...(description && { description }) };

    case "ZodEnum": {
      // Get enum values - different in Zod 3.x vs 4.x
      const values = def.values || Object.values(def.entries || {});
      return {
        type: "string",
        enum: values as string[],
        ...(description && { description }),
      };
    }

    case "ZodArray": {
      const itemType = def.type || def.element;
      return {
        type: "array",
        items: itemType ? zodTypeToJsonSchema(itemType as z.ZodType) : { type: "string" },
      };
    }

    case "ZodOptional": {
      const innerType = def.innerType || def.wrapped;
      return innerType
        ? zodTypeToJsonSchema(innerType as z.ZodType)
        : { type: "string" };
    }

    case "ZodDefault": {
      const innerType = def.innerType || def.wrapped;
      const inner = innerType
        ? zodTypeToJsonSchema(innerType as z.ZodType)
        : { type: "string" };
      const defaultValue =
        typeof def.defaultValue === "function"
          ? (def.defaultValue as () => unknown)()
          : def.defaultValue;
      return { ...inner, ...(defaultValue !== undefined && { default: defaultValue }) };
    }

    default:
      return { type: "string" };
  }
}
