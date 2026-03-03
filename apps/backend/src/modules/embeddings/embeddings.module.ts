import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { VoyageProvider } from "./providers/voyage.provider";
import { EmbeddingService } from "./services/embedding.service";
import { ChunkingService } from "./services/chunking.service";
import { VectorStoreService } from "./services/vector-store.service";
import { embeddingConfig } from "../../config/embedding.config";

@Module({
  imports: [ConfigModule.forFeature(embeddingConfig)],
  providers: [
    VoyageProvider,
    EmbeddingService,
    ChunkingService,
    VectorStoreService,
  ],
  exports: [
    EmbeddingService,
    ChunkingService,
    VectorStoreService,
    VoyageProvider,
  ],
})
export class EmbeddingsModule {}
