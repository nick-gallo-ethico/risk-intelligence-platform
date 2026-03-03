import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { VoyageProvider } from "./providers/voyage.provider";
import { EmbeddingService } from "./services/embedding.service";
import { ChunkingService } from "./services/chunking.service";
import { embeddingConfig } from "../../config/embedding.config";

@Module({
  imports: [ConfigModule.forFeature(embeddingConfig)],
  providers: [VoyageProvider, EmbeddingService, ChunkingService],
  exports: [EmbeddingService, ChunkingService, VoyageProvider],
})
export class EmbeddingsModule {}
