import { IsString, IsOptional, IsArray, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReportFieldType } from "../entities/saved-report.entity";

/**
 * Represents metadata for a single report field.
 * Used by the field picker in the report designer.
 */
export class ReportFieldDto {
  @ApiProperty({
    description: "Unique field identifier (e.g., status, primaryCategoryId)",
    example: "status",
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: "Human-readable label for display",
    example: "Status",
  })
  @IsString()
  label: string;

  @ApiProperty({
    description: "Data type of the field",
    enum: ["string", "number", "date", "datetime", "boolean", "enum", "uuid"],
    example: "enum",
  })
  @IsString()
  type: ReportFieldType;

  @ApiProperty({
    description: "Logical grouping for UI organization",
    example: "Case Details",
  })
  @IsString()
  group: string;

  @ApiProperty({
    description: "Prisma field path for queries",
    example: "status",
  })
  @IsString()
  prismaField: string;

  @ApiProperty({
    description: "Whether field can be used in filters",
    example: true,
  })
  @IsBoolean()
  filterable: boolean;

  @ApiProperty({
    description: "Whether field can be used in sort",
    example: true,
  })
  @IsBoolean()
  sortable: boolean;

  @ApiProperty({
    description: "Whether field can be used in group by",
    example: true,
  })
  @IsBoolean()
  groupable: boolean;

  @ApiProperty({
    description: "Whether field can have aggregation functions",
    example: false,
  })
  @IsBoolean()
  aggregatable: boolean;

  @ApiPropertyOptional({
    description: "Allowed values for enum fields",
    example: ["NEW", "IN_PROGRESS", "PENDING", "CLOSED"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enumValues?: string[];

  @ApiPropertyOptional({
    description: "Whether this is a computed/derived field",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isComputed?: boolean;

  @ApiPropertyOptional({
    description: "Whether this is a tenant custom property",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isCustomProperty?: boolean;

  @ApiPropertyOptional({
    description: "Join path for related entity fields",
    example: "primaryCategory.name",
  })
  @IsOptional()
  @IsString()
  joinPath?: string;
}

/**
 * Group of related fields for UI organization.
 */
export class ReportFieldGroupDto {
  @ApiProperty({
    description: "Group name",
    example: "Case Details",
  })
  @IsString()
  groupName: string;

  @ApiProperty({
    description: "Fields in this group",
    type: [ReportFieldDto],
  })
  fields: ReportFieldDto[];
}
