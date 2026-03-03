import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { VoyageProvider } from "./providers/voyage.provider";
import { EmbeddingService } from "./services/embedding.service";
import { ChunkingService } from "./services/chunking.service";
import { VectorStoreService } from "./services/vector-store.service";
import { PolicyEmbeddingListener } from "./listeners/policy-embedding.listener";
import { embeddingConfig } from "../../config/embedding.config";

@Module({
  imports: [ConfigModule.forFeature(embeddingConfig), PrismaModule],
  providers: [
    // Providers
    VoyageProvider,
    // Services
    EmbeddingService,
    ChunkingService,
    VectorStoreService,
    // Listeners
    PolicyEmbeddingListener,
  ],
  exports: [
    EmbeddingService,
    ChunkingService,
    VectorStoreService,
    VoyageProvider,
    PolicyEmbeddingListener,
  ],
})
export class EmbeddingsModule {}
