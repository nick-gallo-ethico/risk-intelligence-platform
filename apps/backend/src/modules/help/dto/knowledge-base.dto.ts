/**
 * Knowledge Base DTOs
 *
 * Data transfer objects for knowledge base article operations.
 */

import { IsOptional, IsString } from "class-validator";

/**
 * Query parameters for searching articles.
 */
export class SearchArticlesQueryDto {
  /**
   * Search query string for filtering articles by title, content, or tags.
   */
  @IsOptional()
  @IsString()
  q?: string;

  /**
   * Category key to filter articles (e.g., 'getting-started', 'cases').
   */
  @IsOptional()
  @IsString()
  category?: string;
}
