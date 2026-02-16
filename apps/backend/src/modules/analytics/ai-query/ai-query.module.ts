/**
 * AiQueryModule - NestJS module for AI-powered natural language queries
 *
 * Provides:
 * - AiQueryService: Thin coordinator for natural language query execution
 * - QueryToPrismaService: Secure query building with field whitelisting
 * - QueryParserService: NL query parsing with AI
 * - QueryExecutorService: Database query execution
 * - ResultFormatterService: Result formatting and suggestions
 *
 * Dependencies:
 * - PrismaModule: Database access
 * - AiModule: Claude provider for NLP
 */

import { Module, forwardRef } from "@nestjs/common";
import { AiQueryService } from "./ai-query.service";
import { QueryToPrismaService } from "./query-to-prisma.service";
import { FieldWhitelistService } from "./services/field-whitelist.service";
import { PrismaQueryBuilderService } from "./services/prisma-query-builder.service";
import { QueryParserService } from "./services/query-parser.service";
import { QueryExecutorService } from "./services/query-executor.service";
import { ResultFormatterService } from "./services/result-formatter.service";
import { AiModule } from "../../ai/ai.module";

@Module({
  imports: [
    // AiModule provides ClaudeProvider and AiRateLimiterService
    forwardRef(() => AiModule),
  ],
  providers: [
    // Core coordinator
    AiQueryService,
    // Level 0 thin coordinator (from Plan 01)
    QueryToPrismaService,
    // Level 0 sub-services (from Plan 01)
    FieldWhitelistService,
    PrismaQueryBuilderService,
    // Level 1 sub-services (this plan)
    QueryParserService,
    QueryExecutorService,
    ResultFormatterService,
  ],
  exports: [
    AiQueryService,
    QueryToPrismaService,
    FieldWhitelistService,
    PrismaQueryBuilderService,
    QueryParserService,
    QueryExecutorService,
    ResultFormatterService,
  ],
})
export class AiQueryModule {}
