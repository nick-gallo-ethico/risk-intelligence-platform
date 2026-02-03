import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * A single search hit with document, score, and highlights.
 */
export class SearchHitDto {
  @ApiProperty({ description: "Document ID" })
  id: string;

  @ApiProperty({ description: "Entity type", example: "cases" })
  type: string;

  @ApiProperty({ description: "Relevance score" })
  score: number;

  @ApiProperty({
    description: "Document data",
    type: "object",
  })
  document: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "Highlighted matches",
    type: "object",
    example: { details: ["Found <mark>harassment</mark> allegations"] },
  })
  highlight?: Record<string, string[]>;
}

/**
 * Aggregation bucket for faceted search.
 */
export class AggregationBucketDto {
  @ApiProperty({ description: "Aggregation key (e.g., status value)" })
  key: string;

  @ApiProperty({ description: "Document count for this bucket" })
  doc_count: number;
}

/**
 * Aggregation result for a single field.
 */
export class AggregationResultDto {
  @ApiProperty({
    description: "Aggregation buckets",
    type: [AggregationBucketDto],
  })
  buckets: AggregationBucketDto[];
}

/**
 * Search response with hits, total count, and aggregations.
 */
export class SearchResultDto {
  @ApiProperty({
    description: "Search hits",
    type: [SearchHitDto],
  })
  hits: SearchHitDto[];

  @ApiProperty({ description: "Total matching documents" })
  total: number;

  @ApiPropertyOptional({
    description: "Aggregations/facets",
    type: "object",
    example: {
      by_status: { buckets: [{ key: "OPEN", doc_count: 15 }] },
      by_severity: { buckets: [{ key: "HIGH", doc_count: 8 }] },
    },
  })
  aggregations?: Record<string, AggregationResultDto>;

  @ApiProperty({ description: "Query execution time in milliseconds" })
  took: number;
}
