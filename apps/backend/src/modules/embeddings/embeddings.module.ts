import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "../prisma/prisma.module";
import { ModuleStorageModule } from "../storage/storage.module";
import { VoyageProvider } from "./providers/voyage.provider";
import { EmbeddingService } from "./services/embedding.service";
import { ChunkingService } from "./services/chunking.service";
import { VectorStoreService } from "./services/vector-store.service";
import { KnowledgeBaseService } from "./services/knowledge-base.service";
import { KnowledgeBaseController } from "./controllers/knowledge-base.controller";
import { PolicyEmbeddingListener } from "./listeners/policy-embedding.listener";
import { embeddingConfig } from "../../config/embedding.config";

const EMBEDDING_QUEUE_NAME = "embedding";

@Module({
  imports: [
    ConfigModule.forFeature(embeddingConfig),
    PrismaModule,
    ModuleStorageModule,
    BullModule.registerQueue({ name: EMBEDDING_QUEUE_NAME }),
  ],
  controllers: [KnowledgeBaseController],
  providers: [
    // Providers
    VoyageProvider,
    // Services
    EmbeddingService,
    ChunkingService,
    VectorStoreService,
    KnowledgeBaseService,
    // Listeners
    PolicyEmbeddingListener,
  ],
  exports: [
    EmbeddingService,
    ChunkingService,
    VectorStoreService,
    KnowledgeBaseService,
    VoyageProvider,
    PolicyEmbeddingListener,
  ],
})
export class EmbeddingsModule {}
