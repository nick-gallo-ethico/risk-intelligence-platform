import { IsOptional, IsArray, IsEnum, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for running a report (executing a template with optional runtime filters).
 */
export class RunReportDto {
  @ApiPropertyOptional({
    description: "Filters to apply (overrides template defaults)",
    type: "array",
    items: {
      type: "object",
      properties: {
        field: { type: "string" },
        operator: { type: "string" },
        value: { type: "object" },
      },
    },
  })
  @IsOptional()
  @IsArray()
  filters?: Array<{ field: string; operator: string; value: unknown }>;

  @ApiPropertyOptional({
    description: "Maximum rows to return (1-10000)",
    default: 1000,
    minimum: 1,
    maximum: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  limit?: number = 1000;

  @ApiPropertyOptional({
    description: "Output format",
    enum: ["json", "excel", "csv"],
    default: "json",
  })
  @IsOptional()
  @IsEnum(["json", "excel", "csv"])
  format?: "json" | "excel" | "csv" = "json";
}
