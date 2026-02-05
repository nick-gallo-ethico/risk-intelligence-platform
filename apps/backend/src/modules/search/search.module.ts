import { Module, forwardRef } from "@nestjs/common";
import { ElasticsearchModule } from "@nestjs/elasticsearch";
import { ConfigService } from "@nestjs/config";
import { SearchService } from "./search.service";
import { UnifiedSearchService } from "./unified-search.service";
import { IndexingService } from "./indexing/indexing.service";
import { PolicyIndexer } from "./indexing/indexers";
import { PermissionFilterService } from "./query/permission-filter.service";
import { CaseIndexingHandler } from "./handlers/case-indexing.handler";
import { SearchController } from "./search.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { JobsModule } from "../jobs/jobs.module";

/**
 * SearchModule provides Elasticsearch-powered search for the platform.
 *
 * Features:
 * - Per-tenant indices (data isolation)
 * - Async indexing via job queue
 * - Permission-filtered queries
 * - Fuzzy matching with compliance synonyms
 * - Highlighting and faceted aggregations
 *
 * Dependencies:
 * - JobsModule (for indexing queue)
 * - PrismaModule (for entity loading and permission queries)
 *
 * Exports:
 * - SearchService (for programmatic search)
 * - UnifiedSearchService (for cross-entity search)
 * - IndexingService (for manual index operations)
 */
@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        node: configService.get<string>("elasticsearch.node"),
        maxRetries: configService.get<number>("elasticsearch.maxRetries"),
        requestTimeout: configService.get<number>(
          "elasticsearch.requestTimeout",
        ),
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    forwardRef(() => JobsModule), // Circular dependency with JobsModule
  ],
  providers: [
    SearchService,
    UnifiedSearchService,
    IndexingService,
    PolicyIndexer,
    PermissionFilterService,
    CaseIndexingHandler,
  ],
  controllers: [SearchController],
  exports: [SearchService, UnifiedSearchService, IndexingService, PolicyIndexer],
})
export class SearchModule {}
