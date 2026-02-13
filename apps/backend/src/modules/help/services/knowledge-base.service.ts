/**
 * Knowledge Base Service
 *
 * Service for managing knowledge base articles.
 * Handles article search, retrieval, and category listing.
 * Supports multi-tenant access with global articles (orgId=null) visible to all.
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ArticleListItem,
  ArticleDetail,
  CategoryWithCount,
  KB_CATEGORIES,
  getCategoryLabel,
} from "../entities/help.types";

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search published articles visible to the organization.
   * Articles are visible if they are global (organizationId=null) OR belong to the org.
   *
   * @param organizationId - Current tenant organization ID
   * @param query - Optional search query string
   * @param category - Optional category filter
   * @returns List of matching articles (without full content)
   */
  async searchArticles(
    organizationId: string,
    query?: string,
    category?: string,
  ): Promise<ArticleListItem[]> {
    // Build where clause for multi-tenant article visibility
    const whereConditions: any[] = [
      { isPublished: true },
      {
        OR: [
          { organizationId: null }, // Global articles
          { organizationId }, // Tenant-specific articles
        ],
      },
    ];

    // Add search query filter if provided
    if (query) {
      const searchPattern = `%${query}%`;
      whereConditions.push({
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
          { tags: { has: query } },
        ],
      });
    }

    // Add category filter if provided
    if (category) {
      whereConditions.push({ category });
    }

    const articles = await this.prisma.knowledgeBaseArticle.findMany({
      where: { AND: whereConditions },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        tags: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });

    this.logger.debug(
      `Found ${articles.length} articles for org ${organizationId} (query: ${query || "none"}, category: ${category || "all"})`,
    );

    return articles;
  }

  /**
   * Get a single article by slug.
   * Article must be published and visible to the organization.
   *
   * @param organizationId - Current tenant organization ID
   * @param slug - Article URL slug
   * @returns Full article with content
   * @throws NotFoundException if article not found or not accessible
   */
  async getArticleBySlug(
    organizationId: string,
    slug: string,
  ): Promise<ArticleDetail> {
    const article = await this.prisma.knowledgeBaseArticle.findFirst({
      where: {
        slug,
        isPublished: true,
        OR: [
          { organizationId: null }, // Global article
          { organizationId }, // Tenant-specific article
        ],
      },
    });

    if (!article) {
      this.logger.warn(
        `Article not found: slug=${slug}, org=${organizationId}`,
      );
      throw new NotFoundException(`Article not found: ${slug}`);
    }

    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      category: article.category,
      tags: article.tags,
      sortOrder: article.sortOrder,
      organizationId: article.organizationId,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    };
  }

  /**
   * Get article categories with article counts.
   * Only counts published articles visible to the organization.
   *
   * @param organizationId - Current tenant organization ID
   * @returns Categories with article counts
   */
  async getCategories(organizationId: string): Promise<CategoryWithCount[]> {
    // Group articles by category
    const categoryCounts = await this.prisma.knowledgeBaseArticle.groupBy({
      by: ["category"],
      where: {
        isPublished: true,
        OR: [{ organizationId: null }, { organizationId }],
      },
      _count: {
        id: true,
      },
    });

    // Map to CategoryWithCount format
    const categories: CategoryWithCount[] = categoryCounts.map((item) => ({
      key: item.category,
      label: getCategoryLabel(item.category),
      count: item._count.id,
    }));

    // Sort by label for consistent ordering
    categories.sort((a, b) => a.label.localeCompare(b.label));

    this.logger.debug(
      `Found ${categories.length} categories for org ${organizationId}`,
    );

    return categories;
  }
}
