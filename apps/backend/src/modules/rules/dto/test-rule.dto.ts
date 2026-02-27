import { IsOptional, IsInt, IsDate, Min, Max } from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for testing a rule against historical data.
 */
export class TestRuleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 100;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFrom?: Date;
}
