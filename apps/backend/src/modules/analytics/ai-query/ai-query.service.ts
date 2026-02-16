import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../prisma/prisma.service";
import { AiRateLimiterService } from "../../ai/services/rate-limiter.service";
import { QueryParserService } from "./services/query-parser.service";
import { QueryExecutorService } from "./services/query-executor.service";
import { ResultFormatterService } from "./services/result-formatter.service";
import {
  AiQueryRequestDto,
  AiQueryResponseDto,
  VisualizationType,
  ParsedQuery,
} from "./dto/ai-query.dto";

/**
 * AiQueryService handles natural language queries for dashboard analytics.
 *
 * Architecture: Thin coordinator delegating to:
 * - QueryParserService: NL query parsing with AI
 * - QueryExecutorService: Database query execution
 * - ResultFormatterService: Result formatting and suggestions
 *
 * Flow:
 * 1. User submits natural language query
 * 2. AI parses query into structured ParsedQuery
 * 3. QueryExecutorService builds and executes safe Prisma query
 * 4. ResultFormatterService formats results and selects visualization
 * 5. Return response with interpreted query for transparency
 *
 * SECURITY:
 * - All queries are scoped by organizationId (tenant isolation)
 * - Field whitelisting prevents access to sensitive data
 * - Rate limiting prevents abuse
 */
@Injectable()
export class AiQueryService {
  private readonly logger = new Logger(AiQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimiter: AiRateLimiterService,
    private readonly queryParser: QueryParserService,
    private readonly queryExecutor: QueryExecutorService,
    private readonly resultFormatter: ResultFormatterService,
  ) {}

  /**
   * Execute a natural language query.
   *
   * @param request - Query request with natural language query
   * @param userId - User making the request
   * @param organizationId - Tenant organization ID
   * @returns Query response with data, visualization, and suggestions
   */
  async executeQuery(
    request: AiQueryRequestDto,
    userId: string,
    organizationId: string,
  ): Promise<AiQueryResponseDto> {
    const requestId = uuidv4();
    const startTime = Date.now();

    this.logger.log(
      `Processing AI query: requestId=${requestId}, org=${organizationId}, query="${request.query.substring(0, 100)}..."`,
    );

    // Check rate limits
    const rateLimitResult = await this.rateLimiter.checkAndConsume({
      organizationId,
      estimatedTokens: this.queryParser.estimateQueryTokens(request.query),
    });

    if (!rateLimitResult.allowed) {
      throw new BadRequestException(
        `Rate limit exceeded: ${rateLimitResult.reason}. Retry after ${Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000)}s`,
      );
    }

    try {
      // Parse query with AI
      const parsedQuery = await this.queryParser.parseQueryWithAi(
        request.query,
        request.dateRange,
        organizationId,
      );

      // Execute the query
      const { data, visualizationType } =
        await this.queryExecutor.executeQueryByIntent(
          parsedQuery,
          organizationId,
          request.limit,
        );

      // Generate summary
      const summary = this.resultFormatter.generateSummary(parsedQuery, data);

      // Generate suggestions if requested
      const suggestions = request.includeSuggestions
        ? this.resultFormatter.generateSuggestions(parsedQuery, data)
        : undefined;

      const processingTimeMs = Date.now() - startTime;

      // Log query for history
      await this.logQuery({
        requestId,
        organizationId,
        userId,
        query: request.query,
        parsedQuery,
        visualizationType,
        resultSummary: summary,
        processingTimeMs,
      });

      return {
        requestId,
        interpretedQuery: parsedQuery.interpretation,
        summary,
        visualizationType,
        data,
        suggestions,
        parsedQuery,
        processingTimeMs,
      };
    } catch (error) {
      this.logger.error(
        `AI query failed: requestId=${requestId}, error=${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Log query for history and analytics.
   */
  private async logQuery(entry: {
    requestId: string;
    organizationId: string;
    userId: string;
    query: string;
    parsedQuery: ParsedQuery;
    visualizationType: VisualizationType;
    resultSummary: string;
    processingTimeMs: number;
  }): Promise<void> {
    try {
      await (this.prisma as any).aiQueryHistory.create({
        data: {
          id: entry.requestId,
          organizationId: entry.organizationId,
          userId: entry.userId,
          query: entry.query,
          parsedQuery: entry.parsedQuery as unknown as Record<string, unknown>,
          visualizationType: entry.visualizationType,
          resultSummary: entry.resultSummary,
          processingTimeMs: entry.processingTimeMs,
        },
      });
    } catch (error) {
      // Non-critical - log but don't fail the request
      this.logger.warn(
        `Failed to log query history: ${(error as Error).message}`,
      );
    }
  }
}
