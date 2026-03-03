import { registerAs } from "@nestjs/config";

export interface EmbeddingConfig {
  provider: "voyage" | "openai" | "azure";
  voyage: {
    apiKey: string;
    model: string;
    dimensions: number;
    maxBatchSize: number;
  };
}

export const embeddingConfig = registerAs(
  "embedding",
  (): EmbeddingConfig => ({
    provider:
      (process.env.EMBEDDING_PROVIDER as EmbeddingConfig["provider"]) ||
      "voyage",
    voyage: {
      apiKey: process.env.VOYAGE_API_KEY || "",
      model: process.env.VOYAGE_MODEL || "voyage-3",
      dimensions: parseInt(process.env.VOYAGE_DIMENSIONS || "1024", 10),
      maxBatchSize: parseInt(process.env.VOYAGE_MAX_BATCH_SIZE || "128", 10),
    },
  }),
);
