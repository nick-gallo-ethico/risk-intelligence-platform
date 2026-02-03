import { IsString, IsOptional, IsEnum } from "class-validator";

/**
 * Context scopes for the AI context hierarchy.
 * Contexts are assembled from multiple levels, from broadest (platform) to most specific (entity).
 */
export enum ContextScope {
  PLATFORM = "platform",
  ORG = "org",
  TEAM = "team",
  USER = "user",
  ENTITY = "entity",
}

/**
 * Platform-level context (static, defined in code).
 * Provides base capabilities and guidelines that apply to all organizations.
 */
export interface PlatformContext {
  name: string;
  version: string;
  capabilities: string[];
  guidelines: string;
}

/**
 * Organization-level context.
 * Includes CLAUDE.md-like context file for brand voice, terminology, and org-specific rules.
 */
export interface OrganizationContext {
  id: string;
  name: string;
  contextFile?: string; // CLAUDE.md-like content
  terminology?: Record<string, string>; // Custom terms
  categories: Array<{ id: string; name: string; path?: string }>;
  settings?: {
    aiEnabled: boolean;
    formalityLevel: "casual" | "professional" | "formal";
    noteCleanupStyle: "light" | "full";
    summaryDefaultLength: "brief" | "standard" | "detailed";
  };
}

/**
 * Team-level context.
 * Allows team-specific customization within an organization.
 */
export interface TeamContext {
  id: string;
  name: string;
  contextFile?: string;
  focusArea?: string;
}

/**
 * User-level context.
 * Includes user preferences and optional personal context file.
 */
export interface UserContext {
  id: string;
  name: string;
  role: string;
  contextFile?: string;
  preferences?: {
    formalityLevel?: "casual" | "professional" | "formal";
    responseLength?: "brief" | "standard" | "detailed";
    language?: string;
  };
}

/**
 * Entity-level context.
 * Dynamic context about the current entity (case, investigation, campaign, etc.).
 */
export interface EntityContext {
  type: string; // 'case', 'investigation', 'campaign', etc.
  id: string;
  referenceNumber?: string;
  status?: string;
  category?: string;
  priority?: string;
  summary?: string;
  createdAt?: Date;
  assignedTo?: string;
  // Additional entity-specific fields
  [key: string]: unknown;
}

/**
 * Complete AI context assembled from all hierarchy levels.
 * This is passed to the AI for context-aware responses.
 */
export interface AIContext {
  platform: PlatformContext;
  organization: OrganizationContext;
  team?: TeamContext;
  user: UserContext;
  entity?: EntityContext;
  currentDateTime: string;
}

/**
 * DTO for loading context.
 * Specifies which context levels to load and any entity context.
 */
export class LoadContextDto {
  @IsString()
  organizationId: string;

  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;
}

/**
 * DTO for saving a context file.
 * Used to create/update CLAUDE.md-like context files for organizations, teams, or users.
 */
export class SaveContextFileDto {
  @IsString()
  organizationId: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsString()
  name: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(["org", "team", "user"])
  @IsOptional()
  scope?: string;
}
