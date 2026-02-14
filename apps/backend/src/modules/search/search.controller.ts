import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { SearchService } from "./search.service";
import {
  UnifiedSearchService,
  UnifiedSearchResult,
  UnifiedSearchEntityType,
} from "./unified-search.service";
import { SearchQueryDto, SearchResultDto } from "./dto";
import { UserRole } from "@prisma/client";

/**
 * Interface for CurrentUser decorator result.
 * The actual decorator extracts user from request.
 */
interface CurrentUserPayload {
  id: string;
  role: UserRole;
  organizationId: string;
}

/**
 * Decorator to extract current user from request.
 * This should match your auth module's implementation.
 */
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

// Extend Request type to include user property
interface AuthenticatedRequest extends Request {
  user: CurrentUserPayload;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);

/**
 * SearchController provides unified search API.
 *
 * Endpoints:
 * - GET /api/v1/search - Search across entities
 *
 * Security:
 * - Requires authentication (JWT)
 * - Requires tenant context
 * - Permission filtering applied automatically
 */
@ApiTags("Search")
@ApiBearerAuth()
@Controller("search")
@UseGuards(JwtAuthGuard, TenantGuard)
export class SearchController {
  constructor(
    private searchService: SearchService,
    private unifiedSearchService: UnifiedSearchService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Search across platform entities",
    description:
      "Performs a full-text search across Cases, RIUs, and other entities. " +
      "Results are automatically filtered based on user permissions. " +
      "Supports fuzzy matching, highlighting, and faceted aggregations.",
  })
  @ApiResponse({
    status: 200,
    description: "Search results with hits, total count, and aggregations",
    type: SearchResultDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing JWT token",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - missing tenant context",
  })
  async search(
    @CurrentUser() user: CurrentUserPayload,
    @TenantId() orgId: string,
    @Query() query: SearchQueryDto,
  ): Promise<SearchResultDto> {
    return this.searchService.search(
      {
        userId: user.id,
        organizationId: orgId,
        role: user.role,
      },
      query,
    );
  }

  @Get("unified")
  @ApiOperation({
    summary: "Unified search across all entity types",
    description:
      "Performs a unified search across Cases, RIUs, Investigations, and Persons. " +
      "Returns results grouped by entity type with counts and top hits per type. " +
      "Results are automatically filtered based on user permissions.",
  })
  @ApiResponse({
    status: 200,
    description: "Grouped search results with entity type counts",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing JWT token",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - missing tenant context",
  })
  async unifiedSearch(
    @CurrentUser() user: CurrentUserPayload,
    @TenantId() orgId: string,
    @Query("q") query: string,
    @Query("types") types?: string,
    @Query("limit") limit?: string,
  ): Promise<UnifiedSearchResult> {
    // Parse entity types from comma-separated string
    const entityTypes = types
      ? (types.split(",").filter(Boolean) as UnifiedSearchEntityType[])
      : undefined;

    // Parse limit
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;

    return this.unifiedSearchService.search(
      orgId,
      user.id,
      user.role,
      query || "",
      {
        entityTypes,
        limit: parsedLimit && !isNaN(parsedLimit) ? parsedLimit : undefined,
        includeCustomFields: true,
      },
    );
  }

  @Get("suggest")
  @ApiOperation({
    summary: "Get search suggestions",
    description:
      "Returns autocomplete suggestions for partial queries. " +
      "Useful for reference number lookups.",
  })
  @ApiResponse({
    status: 200,
    description: "Array of suggestion strings",
    type: [String],
  })
  async suggest(
    @CurrentUser() user: CurrentUserPayload,
    @TenantId() orgId: string,
    @Query("q") prefix: string,
    @Query("types") types?: string,
  ): Promise<string[]> {
    const entityTypes = types ? types.split(",") : undefined;

    return this.searchService.suggest(
      {
        userId: user.id,
        organizationId: orgId,
        role: user.role,
      },
      prefix,
      entityTypes,
    );
  }
}
