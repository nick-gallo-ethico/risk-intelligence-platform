/**
 * Portfolio DTOs - Client Success Portfolio View
 *
 * Response structures for the portfolio overview endpoint.
 */

import {
  IsString,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * Health score component breakdown for a client
 */
export class HealthScoreComponents {
  @IsNumber()
  login: number;

  @IsNumber()
  caseResolution: number;

  @IsNumber()
  campaignCompletion: number;

  @IsNumber()
  featureAdoption: number;

  @IsNumber()
  ticketVolume: number;
}

/**
 * Individual client entry in portfolio
 */
export class PortfolioClient {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  healthScore: number;

  @IsNumber()
  trend: number;

  @ValidateNested()
  @Type(() => HealthScoreComponents)
  components: HealthScoreComponents;

  @IsBoolean()
  alertsEnabled: boolean;

  @IsDateString()
  lastActivity: string;
}

/**
 * Portfolio summary statistics
 */
export class PortfolioSummary {
  @IsNumber()
  total: number;

  @IsNumber()
  healthy: number;

  @IsNumber()
  atRisk: number;

  @IsNumber()
  critical: number;

  @IsNumber()
  averageScore: number;
}

/**
 * Complete portfolio response
 */
export class PortfolioResponse {
  @ValidateNested({ each: true })
  @Type(() => PortfolioClient)
  clients: PortfolioClient[];

  @ValidateNested()
  @Type(() => PortfolioSummary)
  summary: PortfolioSummary;

  @IsDateString()
  lastUpdated: string;
}

/**
 * Query parameters for portfolio filtering
 */
export class PortfolioQueryDto {
  @IsOptional()
  @IsString()
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";

  @IsOptional()
  @IsString()
  sortBy?: "name" | "healthScore" | "lastActivity";

  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc";
}
