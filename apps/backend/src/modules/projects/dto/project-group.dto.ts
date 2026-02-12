import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsArray,
  IsUUID,
  Matches,
} from "class-validator";

// ===========================================
// Create DTOs
// ===========================================

/**
 * DTO for creating a new project group.
 */
export class CreateProjectGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "Color must be a valid hex color (e.g., #FF5733)",
  })
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

// ===========================================
// Update DTOs
// ===========================================

/**
 * DTO for updating a project group.
 */
export class UpdateProjectGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "Color must be a valid hex color (e.g., #FF5733)",
  })
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isCollapsed?: boolean;
}

/**
 * DTO for reordering groups within a project.
 */
export class ReorderGroupsDto {
  @IsArray()
  @IsUUID("4", { each: true })
  orderedIds: string[];
}
