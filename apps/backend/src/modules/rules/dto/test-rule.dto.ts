import {
  IsOptional,
  IsInt,
  IsDate,
  IsArray,
  IsString,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for testing a rule against historical data.
 *
 * Allows admins to preview a rule against historical cases before activating.
 * Test results show match rate, sample matches, and predicted assignments.
 */
export class TestRuleDto {
  /**
   * Maximum number of historical cases to test against.
   * @default 100
   * @minimum 1
   * @maximum 500
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 100;

  /**
   * Only test against cases created after this date.
   * Useful for testing rules against recent data.
   */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFrom?: Date;

  /**
   * Only test against cases in specific categories.
   * Array of category IDs to filter by.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  /**
   * Only test against cases with specific severities.
   * Array of severity values (e.g., ['HIGH', 'CRITICAL']).
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  severities?: string[];
}
