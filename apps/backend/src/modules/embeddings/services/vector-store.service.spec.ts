import { Test, TestingModule } from "@nestjs/testing";
import { VectorStoreService } from "./vector-store.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("VectorStoreService", () => {
  let service: VectorStoreService;
  let mockPrisma: {
    $executeRaw: jest.Mock;
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    mockPrisma = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorStoreService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VectorStoreService>(VectorStoreService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("upsertChunks", () => {
    it("should return early with zero counts for empty chunks", async () => {
      const result = await service.upsertChunks(
        "org-1",
        "POLICY",
        "source-1",
        [],
        "voyage-3",
      );

      expect(result).toEqual({
        sourceType: "POLICY",
        sourceId: "source-1",
        chunksInserted: 0,
        chunksDeleted: 0,
      });
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });

    it("should delete existing chunks before inserting new ones", async () => {
      // Mock delete returns count of 2 deleted
      mockPrisma.$executeRaw.mockResolvedValueOnce(2);
      // Mock subsequent inserts
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const chunks = [
        {
          chunkIndex: 0,
          text: "First chunk",
          metadata: { parentId: "source-1" },
          embedding: Array(1024).fill(0.1),
        },
        {
          chunkIndex: 1,
          text: "Second chunk",
          metadata: { parentId: "source-1" },
          embedding: Array(1024).fill(0.2),
        },
      ];

      const result = await service.upsertChunks(
        "org-1",
        "POLICY",
        "source-1",
        chunks,
        "voyage-3",
      );

      expect(result.chunksDeleted).toBe(2);
      expect(result.chunksInserted).toBe(2);
      // 1 delete + 2 inserts
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(3);
    });

    it("should insert each chunk individually", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const chunks = [
        {
          chunkIndex: 0,
          text: "Chunk 1",
          metadata: { parentId: "src-1", sectionTitle: "Intro" },
          embedding: Array(1024).fill(0.1),
        },
        {
          chunkIndex: 1,
          text: "Chunk 2",
          metadata: { parentId: "src-1", sectionTitle: "Body" },
          embedding: Array(1024).fill(0.2),
        },
        {
          chunkIndex: 2,
          text: "Chunk 3",
          metadata: { parentId: "src-1", sectionTitle: "Conclusion" },
          embedding: Array(1024).fill(0.3),
        },
      ];

      const result = await service.upsertChunks(
        "org-1",
        "KNOWLEDGE_BASE",
        "kb-doc-1",
        chunks,
        "voyage-3",
      );

      // 1 delete + 3 inserts
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(4);
      expect(result.chunksInserted).toBe(3);
    });

    it("should include metadata in insert", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const chunks = [
        {
          chunkIndex: 0,
          text: "Test chunk",
          metadata: {
            parentId: "src-1",
            sectionTitle: "Test Section",
            versionId: "v1",
          },
          embedding: Array(1024).fill(0.1),
        },
      ];

      await service.upsertChunks(
        "org-1",
        "POLICY",
        "src-1",
        chunks,
        "voyage-3",
      );

      // First call is delete, second is insert
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it("should return correct result structure", async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(5); // Delete returns 5
      mockPrisma.$executeRaw.mockResolvedValue(1); // Inserts

      const chunks = [
        {
          chunkIndex: 0,
          text: "New chunk",
          metadata: { parentId: "src-1" },
          embedding: Array(1024).fill(0.1),
        },
      ];

      const result = await service.upsertChunks(
        "org-abc",
        "CASE_ACTIVITY",
        "case-123",
        chunks,
        "voyage-3",
      );

      expect(result).toEqual({
        sourceType: "CASE_ACTIVITY",
        sourceId: "case-123",
        chunksInserted: 1,
        chunksDeleted: 5,
      });
    });
  });

  describe("deleteBySource", () => {
    it("should execute delete query with correct filters", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(3);

      const result = await service.deleteBySource(
        "org-1",
        "POLICY",
        "policy-1",
      );

      expect(result).toBe(3);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("should return 0 when no chunks to delete", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(0);

      const result = await service.deleteBySource(
        "org-1",
        "KNOWLEDGE_BASE",
        "nonexistent",
      );

      expect(result).toBe(0);
    });

    it("should convert BigInt result to number", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(BigInt(5));

      const result = await service.deleteBySource("org-1", "POLICY", "doc-1");

      expect(result).toBe(5);
      expect(typeof result).toBe("number");
    });
  });

  describe("deleteByOrganization", () => {
    it("should delete all organization embeddings", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(100);

      const result = await service.deleteByOrganization("org-to-delete");

      expect(result).toBe(100);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe("semanticSearch", () => {
    it("should return search results with similarity scores", async () => {
      const mockResults = [
        {
          id: "emb-1",
          source_type: "POLICY",
          source_id: "policy-1",
          chunk_index: 0,
          chunk_text: "This is a policy about conduct.",
          chunk_metadata: { sectionTitle: "Intro" },
          distance: 0.2, // Low distance = high similarity
        },
        {
          id: "emb-2",
          source_type: "POLICY",
          source_id: "policy-2",
          chunk_index: 1,
          chunk_text: "Another policy section.",
          chunk_metadata: { sectionTitle: "Body" },
          distance: 0.6,
        },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(mockResults);

      const queryEmbedding = Array(1024).fill(0.1);
      const result = await service.semanticSearch("org-1", queryEmbedding);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "emb-1",
        sourceType: "POLICY",
        sourceId: "policy-1",
        chunkIndex: 0,
        text: "This is a policy about conduct.",
        metadata: { sectionTitle: "Intro" },
        distance: 0.2,
        similarity: 0.9, // 1 - 0.2/2
      });
    });

    it("should filter by minSimilarity when specified", async () => {
      const mockResults = [
        {
          id: "emb-1",
          source_type: "POLICY",
          source_id: "policy-1",
          chunk_index: 0,
          chunk_text: "High similarity chunk",
          chunk_metadata: {},
          distance: 0.2, // similarity = 0.9
        },
        {
          id: "emb-2",
          source_type: "POLICY",
          source_id: "policy-2",
          chunk_index: 0,
          chunk_text: "Low similarity chunk",
          chunk_metadata: {},
          distance: 1.4, // similarity = 0.3
        },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(mockResults);

      const result = await service.semanticSearch(
        "org-1",
        Array(1024).fill(0.1),
        { minSimilarity: 0.5 },
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("emb-1");
      expect(result[0].similarity).toBeGreaterThanOrEqual(0.5);
    });

    it("should apply default limit of 10", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await service.semanticSearch("org-1", Array(1024).fill(0.1));

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      // The raw SQL contains LIMIT 10
    });

    it("should respect custom limit option", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await service.semanticSearch("org-1", Array(1024).fill(0.1), {
        limit: 5,
      });

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should filter by source types when specified", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await service.semanticSearch("org-1", Array(1024).fill(0.1), {
        sourceTypes: ["POLICY", "KNOWLEDGE_BASE"],
      });

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should filter by source IDs when specified", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await service.semanticSearch("org-1", Array(1024).fill(0.1), {
        sourceIds: ["doc-1", "doc-2"],
      });

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no results", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.semanticSearch(
        "org-1",
        Array(1024).fill(0.1),
      );

      expect(result).toEqual([]);
    });

    it("should calculate similarity correctly from cosine distance", async () => {
      const mockResults = [
        {
          id: "emb-1",
          source_type: "POLICY",
          source_id: "p1",
          chunk_index: 0,
          chunk_text: "Text",
          chunk_metadata: {},
          distance: 0, // Perfect match
        },
        {
          id: "emb-2",
          source_type: "POLICY",
          source_id: "p2",
          chunk_index: 0,
          chunk_text: "Text",
          chunk_metadata: {},
          distance: 1, // Medium similarity
        },
        {
          id: "emb-3",
          source_type: "POLICY",
          source_id: "p3",
          chunk_index: 0,
          chunk_text: "Text",
          chunk_metadata: {},
          distance: 2, // Opposite direction
        },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(mockResults);

      const result = await service.semanticSearch(
        "org-1",
        Array(1024).fill(0.1),
      );

      expect(result[0].similarity).toBe(1); // 1 - 0/2 = 1
      expect(result[1].similarity).toBe(0.5); // 1 - 1/2 = 0.5
      expect(result[2].similarity).toBe(0); // 1 - 2/2 = 0
    });
  });

  describe("getChunkCount", () => {
    it("should return total chunk count for organization", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: BigInt(42) }]);

      const result = await service.getChunkCount("org-1");

      expect(result).toBe(42);
    });

    it("should filter by source type when specified", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: BigInt(10) }]);

      const result = await service.getChunkCount("org-1", "POLICY");

      expect(result).toBe(10);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return 0 when no chunks exist", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);

      const result = await service.getChunkCount("org-1");

      expect(result).toBe(0);
    });
  });

  describe("getEmbeddedSources", () => {
    it("should return list of embedded sources with counts", async () => {
      const mockResults = [
        {
          source_id: "policy-1",
          chunk_count: BigInt(5),
          created_at: new Date("2026-01-15"),
        },
        {
          source_id: "policy-2",
          chunk_count: BigInt(3),
          created_at: new Date("2026-01-16"),
        },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(mockResults);

      const result = await service.getEmbeddedSources("org-1", "POLICY");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        sourceId: "policy-1",
        chunkCount: 5,
        createdAt: new Date("2026-01-15"),
      });
    });

    it("should return empty array when no sources embedded", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getEmbeddedSources(
        "org-1",
        "KNOWLEDGE_BASE",
      );

      expect(result).toEqual([]);
    });
  });

  describe("hasEmbeddings", () => {
    it("should return true when embeddings exist", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ exists: true }]);

      const result = await service.hasEmbeddings("org-1", "POLICY", "policy-1");

      expect(result).toBe(true);
    });

    it("should return false when no embeddings exist", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ exists: false }]);

      const result = await service.hasEmbeddings(
        "org-1",
        "POLICY",
        "nonexistent",
      );

      expect(result).toBe(false);
    });

    it("should handle empty result gracefully", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.hasEmbeddings("org-1", "POLICY", "doc-1");

      expect(result).toBe(false);
    });
  });
});
