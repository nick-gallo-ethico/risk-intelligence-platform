/**
 * Knowledge Base Controller
 *
 * REST API endpoints for knowledge base article access.
 * Provides article search, retrieval, and category listing.
 */

import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../../common/guards/tenant.guard";
import { TenantId } from "../../../common/decorators/tenant-id.decorator";
import { KnowledgeBaseService } from "../services/knowledge-base.service";
import { SearchArticlesQueryDto } from "../dto/knowledge-base.dto";
import {
  ArticleListItem,
  ArticleDetail,
  CategoryWithCount,
} from "../entities/help.types";

@Controller("help")
@UseGuards(JwtAuthGuard, TenantGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  /**
   * Search published articles.
   * Returns articles that are global OR belong to the current tenant.
   *
   * @route GET /api/v1/help/articles
   * @query q - Optional search query
   * @query category - Optional category filter
   */
  @Get("articles")
  async searchArticles(
    @TenantId() organizationId: string,
    @Query() query: SearchArticlesQueryDto,
  ): Promise<ArticleListItem[]> {
    return this.knowledgeBaseService.searchArticles(
      organizationId,
      query.q,
      query.category,
    );
  }

  /**
   * Get article categories with counts.
   * Only counts published articles visible to the current tenant.
   *
   * @route GET /api/v1/help/categories
   */
  @Get("categories")
  async getCategories(
    @TenantId() organizationId: string,
  ): Promise<CategoryWithCount[]> {
    return this.knowledgeBaseService.getCategories(organizationId);
  }

  /**
   * Get a single article by slug.
   * Article must be published and visible to the current tenant.
   *
   * @route GET /api/v1/help/articles/:slug
   * @param slug - Article URL slug
   */
  @Get("articles/:slug")
  async getArticleBySlug(
    @TenantId() organizationId: string,
    @Param("slug") slug: string,
  ): Promise<ArticleDetail> {
    return this.knowledgeBaseService.getArticleBySlug(organizationId, slug);
  }
}
