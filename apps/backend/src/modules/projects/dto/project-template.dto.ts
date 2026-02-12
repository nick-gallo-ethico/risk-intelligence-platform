import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDate,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { MilestoneCategory } from "@prisma/client";

// ===========================================
// Create DTOs
// ===========================================

/**
 * DTO for creating a new project template.
 */
export class CreateProjectTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MilestoneCategory)
  category: MilestoneCategory;

  /**
   * Template data containing groups, columns, and sample tasks structure.
   * Structure:
   * {
   *   groups: Array<{ name: string; color?: string; sortOrder: number }>,
   *   columns: Array<{ name: string; type: ProjectColumnType; settings?: object }>,
   *   tasks: Array<{
   *     title: string;
   *     description?: string;
   *     groupIndex: number; // maps to groups array index
   *     priority?: ProjectTaskPriority;
   *     relativeDueDays?: number; // days from project start
   *   }>
   * }
   */
  @IsObject()
  templateData: Record<string, unknown>;
}

// ===========================================
// Apply Template DTO
// ===========================================

/**
 * DTO for applying a template to create a new project.
 */
export class ApplyTemplateDto {
  @IsUUID()
  templateId: string;

  @IsString()
  name: string;

  @Type(() => Date)
  @IsDate()
  targetDate: Date;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

// ===========================================
// Response DTOs
// ===========================================

/**
 * Response DTO for project template data.
 */
export class ProjectTemplateResponseDto {
  id: string;
  name: string;
  description?: string;
  category: MilestoneCategory;
  templateData: Record<string, unknown>;
  isSystem: boolean;
  createdBy?: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
