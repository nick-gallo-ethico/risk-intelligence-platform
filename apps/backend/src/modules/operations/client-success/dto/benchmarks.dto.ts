/**
 * Benchmarks DTOs - Peer Benchmark Comparison
 *
 * Response structures for the benchmarks endpoint.
 */

import {
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * Statistical distribution for a single metric
 */
export class BenchmarkStats {
  @IsNumber()
  p25: number;

  @IsNumber()
  median: number;

  @IsNumber()
  p75: number;

  @IsNumber()
  mean: number;

  @IsNumber()
  min: number;

  @IsNumber()
  max: number;

  @IsNumber()
  peerCount: number;
}

/**
 * Client's metric value with percentile position
 */
export class ClientMetric {
  @IsNumber()
  value: number;

  @IsNumber()
  percentile: number;
}

/**
 * Applied filter criteria
 */
export class BenchmarkFilters {
  @IsOptional()
  @IsString()
  size: string | null;

  @IsOptional()
  @IsString()
  industry: string | null;
}

/**
 * Complete benchmarks response
 */
export class BenchmarksResponse {
  @IsNumber()
  peerCount: number;

  @ValidateNested()
  @Type(() => BenchmarkFilters)
  filters: BenchmarkFilters;

  @ValidateNested()
  @Type(() => BenchmarkStats)
  attestationCompletion: BenchmarkStats;

  @ValidateNested()
  @Type(() => BenchmarkStats)
  caseResolutionDays: BenchmarkStats;

  @ValidateNested()
  @Type(() => BenchmarkStats)
  loginRate: BenchmarkStats;

  @ValidateNested()
  @Type(() => BenchmarkStats)
  featureAdoption: BenchmarkStats;

  @ValidateNested()
  @Type(() => BenchmarkStats)
  healthScore: BenchmarkStats;

  @IsDateString()
  lastCalculated: string;
}

/**
 * Query parameters for benchmark filtering
 */
export class BenchmarksQueryDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  industry?: string;
}
