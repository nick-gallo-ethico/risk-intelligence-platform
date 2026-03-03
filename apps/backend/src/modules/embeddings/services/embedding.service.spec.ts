import { Test, TestingModule } from "@nestjs/testing";
import { EmbeddingService } from "./embedding.service";
import { VoyageProvider } from "../providers/voyage.provider";

describe("EmbeddingService", () => {
  let service: EmbeddingService;
  let mockVoyageProvider: {
    name: string;
    dimensions: number;
    maxBatchSize: number;
    maxTokens: number;
    isReady: jest.Mock;
    embed: jest.Mock;
    embedSingle: jest.Mock;
  };

  beforeEach(async () => {
    mockVoyageProvider = {
      name: "voyage",
      dimensions: 1024,
      maxBatchSize: 128,
      maxTokens: 32000,
      isReady: jest.fn(),
      embed: jest.fn(),
      embedSingle: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: VoyageProvider, useValue: mockVoyageProvider },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("isReady", () => {
    it("should return true when provider is ready", () => {
      mockVoyageProvider.isReady.mockReturnValue(true);

      expect(service.isReady()).toBe(true);
      expect(mockVoyageProvider.isReady).toHaveBeenCalled();
    });

    it("should return false when provider is not ready", () => {
      mockVoyageProvider.isReady.mockReturnValue(false);

      expect(service.isReady()).toBe(false);
      expect(mockVoyageProvider.isReady).toHaveBeenCalled();
    });
  });

  describe("dimensions", () => {
    it("should return provider dimensions", () => {
      expect(service.dimensions).toBe(1024);
    });
  });

  describe("provider", () => {
    it("should return the voyage provider", () => {
      expect(service.provider).toBe(mockVoyageProvider);
    });
  });

  describe("embedBatch", () => {
    it("should return empty array for empty input", async () => {
      const result = await service.embedBatch([]);

      expect(result).toEqual([]);
      expect(mockVoyageProvider.embed).not.toHaveBeenCalled();
    });

    it("should embed multiple texts in a single batch", async () => {
      const texts = ["Hello world", "Test document"];
      const mockEmbeddings = [Array(1024).fill(0.1), Array(1024).fill(0.2)];
      mockVoyageProvider.embed.mockResolvedValue(mockEmbeddings);

      const result = await service.embedBatch(texts);

      expect(result).toEqual(mockEmbeddings);
      expect(mockVoyageProvider.embed).toHaveBeenCalledWith(texts, "document");
    });

    it("should use document input type by default", async () => {
      const texts = ["Test"];
      mockVoyageProvider.embed.mockResolvedValue([Array(1024).fill(0.1)]);

      await service.embedBatch(texts);

      expect(mockVoyageProvider.embed).toHaveBeenCalledWith(texts, "document");
    });

    it("should pass custom input type when specified", async () => {
      const texts = ["Test"];
      mockVoyageProvider.embed.mockResolvedValue([Array(1024).fill(0.1)]);

      await service.embedBatch(texts, "query");

      expect(mockVoyageProvider.embed).toHaveBeenCalledWith(texts, "query");
    });

    it("should batch texts when exceeding maxBatchSize", async () => {
      // Create 150 texts (exceeds maxBatchSize of 128)
      const texts = Array(150)
        .fill(null)
        .map((_, i) => `Text ${i}`);

      // First batch returns 128 embeddings, second batch returns 22
      const batch1Embeddings = Array(128)
        .fill(null)
        .map(() => Array(1024).fill(0.1));
      const batch2Embeddings = Array(22)
        .fill(null)
        .map(() => Array(1024).fill(0.2));

      mockVoyageProvider.embed
        .mockResolvedValueOnce(batch1Embeddings)
        .mockResolvedValueOnce(batch2Embeddings);

      const result = await service.embedBatch(texts);

      expect(result).toHaveLength(150);
      expect(mockVoyageProvider.embed).toHaveBeenCalledTimes(2);
      expect(mockVoyageProvider.embed).toHaveBeenNthCalledWith(
        1,
        texts.slice(0, 128),
        "document",
      );
      expect(mockVoyageProvider.embed).toHaveBeenNthCalledWith(
        2,
        texts.slice(128),
        "document",
      );
    });

    it("should handle exactly maxBatchSize texts in single call", async () => {
      const texts = Array(128)
        .fill(null)
        .map((_, i) => `Text ${i}`);
      const mockEmbeddings = Array(128)
        .fill(null)
        .map(() => Array(1024).fill(0.1));
      mockVoyageProvider.embed.mockResolvedValue(mockEmbeddings);

      const result = await service.embedBatch(texts);

      expect(result).toHaveLength(128);
      expect(mockVoyageProvider.embed).toHaveBeenCalledTimes(1);
    });
  });

  describe("embedSingle", () => {
    it("should embed a single text with default input type", async () => {
      const text = "Test document";
      const mockEmbedding = Array(1024).fill(0.1);
      mockVoyageProvider.embedSingle.mockResolvedValue(mockEmbedding);

      const result = await service.embedSingle(text);

      expect(result).toEqual(mockEmbedding);
      expect(mockVoyageProvider.embedSingle).toHaveBeenCalledWith(
        text,
        "document",
      );
    });

    it("should pass custom input type", async () => {
      const text = "Test query";
      const mockEmbedding = Array(1024).fill(0.1);
      mockVoyageProvider.embedSingle.mockResolvedValue(mockEmbedding);

      await service.embedSingle(text, "query");

      expect(mockVoyageProvider.embedSingle).toHaveBeenCalledWith(
        text,
        "query",
      );
    });
  });

  describe("embedQuery", () => {
    it("should embed query with query input type", async () => {
      const query = "What is the policy?";
      const mockEmbedding = Array(1024).fill(0.1);
      mockVoyageProvider.embedSingle.mockResolvedValue(mockEmbedding);

      const result = await service.embedQuery(query);

      expect(result).toEqual(mockEmbedding);
      expect(mockVoyageProvider.embedSingle).toHaveBeenCalledWith(
        query,
        "query",
      );
    });
  });
});
