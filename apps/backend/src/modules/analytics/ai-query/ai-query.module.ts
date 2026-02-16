/**
 * AiQueryModule - NestJS module for AI-powered natural language queries
 *
 * Provides:
 * - AiQueryService: Natural language query parsing and execution
 * - QueryToPrismaService: Secure query building with field whitelisting
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
import { AiModule } from "../../ai/ai.module";

@Module({
  imports: [
    // AiModule provides ClaudeProvider and AiRateLimiterService
    forwardRef(() => AiModule),
  ],
  providers: [
    AiQueryService,
    QueryToPrismaService,
    FieldWhitelistService,
    PrismaQueryBuilderService,
  ],
  exports: [
    AiQueryService,
    QueryToPrismaService,
    FieldWhitelistService,
    PrismaQueryBuilderService,
  ],
})
export class AiQueryModule {}
