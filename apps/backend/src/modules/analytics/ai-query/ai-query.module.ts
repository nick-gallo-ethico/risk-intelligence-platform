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
import { AiModule } from "../../ai/ai.module";

@Module({
  imports: [
    // AiModule provides ClaudeProvider and AiRateLimiterService
    forwardRef(() => AiModule),
  ],
  providers: [AiQueryService, QueryToPrismaService],
  exports: [AiQueryService, QueryToPrismaService],
})
export class AiQueryModule {}
