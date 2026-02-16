import { IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Single filter condition for report queries.
 */
export class ReportFilterConditionDto {
  @ApiProperty({
    description: "Field to filter on",
    example: "status",
  })
  @IsString()
  field: string;

  @ApiProperty({
    description: "Comparison operator",
    enum: [
      "eq",
      "neq",
      "gt",
      "gte",
      "lt",
      "lte",
      "contains",
      "startsWith",
      "endsWith",
      "in",
      "notIn",
      "isNull",
      "isNotNull",
      "between",
    ],
    example: "eq",
  })
  @IsString()
  operator: string;

  @ApiProperty({
    description: "Value to compare against",
    example: "OPEN",
  })
  value: unknown;

  @ApiPropertyOptional({
    description: "Upper bound for between operator",
    example: "2025-12-31",
  })
  @IsOptional()
  valueTo?: unknown;
}
