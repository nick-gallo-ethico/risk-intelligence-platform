/**
 * CategoriesController - Categories API for Authenticated Users
 *
 * Provides categories endpoint for authenticated users to fetch categories
 * for dropdowns and form selections. Used by case creation, disclosures, etc.
 *
 * Endpoints:
 * - GET /api/v1/categories - Get all categories for the tenant
 *
 * All endpoints require authentication and are scoped to the user's organization
 * via the TenantGuard.
 */

import { Controller, Get, Query, UseGuards, Logger } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard, TenantGuard } from "../../common/guards";
import { TenantId } from "../../common/decorators";
import { PrismaService } from "../prisma/prisma.service";
import { CategoryModule } from "@prisma/client";

/**
 * Category response shape matching frontend Category interface.
 */
interface CategoryResponseItem {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  parentId?: string | null;
  level: number;
  sortOrder: number;
  isEnabled: boolean;
  module: CategoryModule;
}

/**
 * API response wrapper.
 */
interface CategoriesResponse {
  categories: CategoryResponseItem[];
}

/**
 * Categories controller.
 * Route: /api/v1/categories
 */
@Controller("categories")
@ApiTags("Categories")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, TenantGuard)
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/v1/categories
   * Get all categories for the tenant.
   *
   * Returns all active categories for the authenticated user's organization.
   * Can be filtered by module (CASE, DISCLOSURE, etc.).
   *
   * @example GET /api/v1/categories
   * @example GET /api/v1/categories?module=CASE
   */
  @Get()
  @ApiOperation({
    summary: "Get all categories for the tenant",
    description:
      "Returns all active categories for the authenticated user's organization. Can be filtered by module.",
  })
  @ApiQuery({
    name: "module",
    required: false,
    enum: CategoryModule,
    description: "Filter categories by module (e.g., CASE, DISCLOSURE)",
  })
  @ApiResponse({
    status: 200,
    description: "List of categories",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getCategories(
    @TenantId() organizationId: string,
    @Query("module") module?: CategoryModule,
  ): Promise<CategoriesResponse> {
    this.logger.debug(
      `Getting categories for organization: ${organizationId}, module: ${module || "all"}`,
    );

    const whereClause: {
      organizationId: string;
      isActive: boolean;
      module?: CategoryModule;
    } = {
      organizationId,
      isActive: true,
    };

    // Add module filter if provided
    if (module) {
      whereClause.module = module;
    }

    const categories = await this.prisma.category.findMany({
      where: whereClause,
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        parentCategoryId: true,
        level: true,
        sortOrder: true,
        isActive: true,
        module: true,
      },
    });

    // Map to frontend-expected shape (parentId instead of parentCategoryId)
    const mappedCategories: CategoryResponseItem[] = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      parentId: cat.parentCategoryId,
      level: cat.level,
      sortOrder: cat.sortOrder,
      isEnabled: cat.isActive,
      module: cat.module,
    }));

    this.logger.debug(`Returning ${mappedCategories.length} categories`);

    return { categories: mappedCategories };
  }
}
