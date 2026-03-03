import { Test, TestingModule } from "@nestjs/testing";
import { ChunkingService } from "./chunking.service";

describe("ChunkingService", () => {
  let service: ChunkingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChunkingService],
    }).compile();

    service = module.get<ChunkingService>(ChunkingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("chunkPolicy", () => {
    it("should split content by markdown headers (section strategy)", async () => {
      const content = `# Introduction
This is the introduction section with enough text to be considered a valid chunk that meets the minimum size requirement.

## Scope
This section describes the scope of the policy in detail with sufficient content to meet minimum chunk requirements.

## Procedures
Here are the procedures that employees must follow when implementing this policy document.`;

      const result = await service.chunkPolicy(
        content,
        "policy-1",
        "version-1",
      );

      expect(result.strategy).toBe("section");
      expect(result.chunks.length).toBeGreaterThanOrEqual(3);
      expect(result.chunks[0].metadata.parentId).toBe("policy-1");
      expect(result.chunks[0].metadata.versionId).toBe("version-1");
    });

    it("should fall back to recursive chunking when no headers found", async () => {
      const content =
        "This is a simple document without any headers. It contains plain text that should be chunked using the recursive strategy. " +
        "The content continues with more information that fills up the document. " +
        "We need enough content here to make this a reasonably sized chunk that meets minimum requirements.";

      const result = await service.chunkPolicy(
        content,
        "policy-1",
        "version-1",
      );

      expect(result.strategy).toBe("recursive");
      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
    });

    it("should split large sections into smaller chunks", async () => {
      // Create content with multiple sections where one is very long
      const longContent = `# Introduction
This is a brief introduction with enough text to meet minimum chunk requirements for the test.

## Long Section
${"This is a very long paragraph that needs to be split into multiple chunks. ".repeat(
  50,
)}

## Conclusion
This is a brief conclusion with enough text to meet minimum chunk requirements for the test.`;

      const result = await service.chunkPolicy(
        longContent,
        "policy-1",
        "version-1",
      );

      expect(result.strategy).toBe("section");
      // The long section should produce multiple chunks
      expect(result.chunks.length).toBeGreaterThan(3);
    });

    it("should include section title in chunk metadata", async () => {
      const content = `# Policy Title
This is the policy title section with content.

## First Section
Content for the first section goes here and it should be long enough to meet minimum requirements.`;

      const result = await service.chunkPolicy(
        content,
        "policy-1",
        "version-1",
      );

      const sectionChunk = result.chunks.find(
        (c) => c.metadata.sectionTitle === "First Section",
      );
      expect(sectionChunk).toBeDefined();
    });

    it("should respect custom chunk size options", async () => {
      const content = `# Section One
${"A".repeat(500)}

## Section Two
${"B".repeat(500)}`;

      const result = await service.chunkPolicy(
        content,
        "policy-1",
        "version-1",
        { chunkSize: 200, chunkOverlap: 20 },
      );

      // With smaller chunk size, we should get more chunks
      expect(result.chunks.length).toBeGreaterThan(2);
    });

    it("should filter out chunks smaller than MIN_CHUNK_SIZE", async () => {
      const content = `# Main Section
This section has substantial content that should definitely be included as a chunk.

## Tiny
No`;

      const result = await service.chunkPolicy(
        content,
        "policy-1",
        "version-1",
      );

      // "No" is too small and should be filtered out
      const tinyChunk = result.chunks.find((c) =>
        c.text.toLowerCase().includes("tiny"),
      );
      // Either no chunk with just "No" or it's combined with the header
      expect(result.chunks.every((c) => c.text.trim().length >= 100)).toBe(
        true,
      );
    });

    it("should track source character count", async () => {
      const content =
        "This is a test document with some content for testing the character count feature.";

      const result = await service.chunkPolicy(
        content,
        "policy-1",
        "version-1",
      );

      expect(result.sourceCharCount).toBe(content.length);
    });
  });

  describe("chunkCaseActivities", () => {
    it("should chunk activities with timestamp metadata", async () => {
      // Each activity content must be >= 100 chars to produce a chunk
      const activities = [
        {
          type: "NOTE",
          content:
            "Initial investigation note with sufficient content to meet minimum chunk requirements for proper testing. This note contains details about the preliminary findings of the investigation that was conducted.",
          timestamp: new Date("2026-01-15T10:00:00Z"),
        },
        {
          type: "STATUS_CHANGE",
          content:
            "Status changed from OPEN to IN_PROGRESS with additional details about the change and reasoning behind this decision. The case is now being actively investigated by the assigned team member.",
          timestamp: new Date("2026-01-16T14:30:00Z"),
        },
      ];

      const result = await service.chunkCaseActivities(activities, "case-1");

      expect(result.strategy).toBe("activity");
      expect(result.chunkCount).toBeGreaterThanOrEqual(2);
      expect(result.chunks[0].metadata.parentId).toBe("case-1");
      expect(result.chunks[0].metadata.activityType).toBe("NOTE");
      expect(result.chunks[0].metadata.timestamp).toBe(
        "2026-01-15T10:00:00.000Z",
      );
    });

    it("should split large activities into multiple chunks", async () => {
      const activities = [
        {
          type: "LONG_NOTE",
          content: "Detailed investigation findings. ".repeat(100),
          timestamp: new Date("2026-01-15T10:00:00Z"),
        },
      ];

      const result = await service.chunkCaseActivities(activities, "case-1");

      expect(result.chunks.length).toBeGreaterThan(1);
      expect(
        result.chunks.every((c) => c.metadata.activityType === "LONG_NOTE"),
      ).toBe(true);
    });

    it("should preserve activity order through chunk indices", async () => {
      const activities = [
        {
          type: "NOTE",
          content:
            "First activity content that is long enough to meet minimum requirements.",
          timestamp: new Date("2026-01-15T10:00:00Z"),
        },
        {
          type: "INTERVIEW",
          content:
            "Second activity content for interview that also meets minimum size.",
          timestamp: new Date("2026-01-16T11:00:00Z"),
        },
      ];

      const result = await service.chunkCaseActivities(activities, "case-1");

      // Verify chunk indices are sequential
      for (let i = 0; i < result.chunks.length; i++) {
        expect(result.chunks[i].chunkIndex).toBe(i);
      }
    });

    it("should handle empty activities array", async () => {
      const result = await service.chunkCaseActivities([], "case-1");

      expect(result.chunks).toHaveLength(0);
      expect(result.chunkCount).toBe(0);
      expect(result.sourceCharCount).toBe(0);
    });
  });

  describe("chunkKnowledgeBase", () => {
    it("should return passage strategy", async () => {
      const content =
        "This is a knowledge base document with sufficient content for chunking.";

      const result = await service.chunkKnowledgeBase(content, "doc-1");

      expect(result.strategy).toBe("passage");
    });

    it("should set parentId to documentId", async () => {
      // Content must be >= 100 chars for a chunk to be created (MIN_CHUNK_SIZE)
      const content =
        "Knowledge base content that is long enough to meet minimum chunk size requirements for testing. This document contains compliance training materials for all employees.";

      const result = await service.chunkKnowledgeBase(content, "kb-doc-123");

      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
      expect(result.chunks[0].metadata.parentId).toBe("kb-doc-123");
    });

    it("should use recursive chunking internally", async () => {
      const content = "This is a knowledge base document. ".repeat(100);

      const result = await service.chunkKnowledgeBase(content, "doc-1");

      expect(result.chunks.length).toBeGreaterThan(1);
      expect(result.sourceCharCount).toBe(content.length);
    });

    it("should respect custom chunking options", async () => {
      const content = "Short knowledge base content.".repeat(50);

      const result = await service.chunkKnowledgeBase(content, "doc-1", {
        chunkSize: 200,
        chunkOverlap: 20,
      });

      // Smaller chunk size should produce more chunks
      expect(result.chunks.length).toBeGreaterThan(1);
    });
  });

  describe("chunkRecursive", () => {
    it("should chunk content recursively", async () => {
      const content = "Test content. ".repeat(200);
      const metadata = { parentId: "test-id" };

      const result = await service.chunkRecursive(content, metadata);

      expect(result.strategy).toBe("recursive");
      expect(result.chunks.length).toBeGreaterThan(1);
      expect(
        result.chunks.every((c) => c.metadata.parentId === "test-id"),
      ).toBe(true);
    });

    it("should filter chunks below minimum size", async () => {
      const content =
        "This is sufficient content for a valid chunk. ".repeat(3) + "tiny";

      const result = await service.chunkRecursive(content, {
        parentId: "test-id",
      });

      // All chunks should meet minimum size
      result.chunks.forEach((chunk) => {
        expect(chunk.text.length).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe("estimateTokens", () => {
    it("should estimate tokens as approximately 1/4 of character count", () => {
      const text = "Hello world"; // 11 characters

      const result = service.estimateTokens(text);

      expect(result).toBe(Math.ceil(11 / 4)); // 3
    });

    it("should handle empty string", () => {
      const result = service.estimateTokens("");

      expect(result).toBe(0);
    });

    it("should handle long text", () => {
      const text = "A".repeat(4000);

      const result = service.estimateTokens(text);

      expect(result).toBe(1000);
    });
  });

  describe("header detection", () => {
    it("should detect markdown headers", async () => {
      // Each section content must be >= 100 chars to produce a chunk
      const content = `# H1 Header
Content under H1 that is long enough to be a valid chunk. This section provides introductory material and context for the policy document.

## H2 Header
Content under H2 that is also sufficiently long for testing. This section describes the main scope and applicability of the policy to various departments.

### H3 Header
Content under H3 that meets the minimum length requirements. This subsection provides detailed procedures and guidelines for implementation.`;

      const result = await service.chunkPolicy(
        content,
        "policy-1",
        "version-1",
      );

      expect(result.strategy).toBe("section");
      expect(result.chunks.length).toBeGreaterThanOrEqual(3);
    });

    it("should detect HTML headers", async () => {
      const content = `<h1>Main Title</h1>
Content under main title that is long enough to pass minimum requirements.

<h2>Subsection</h2>
Content under subsection with enough text to meet chunk size minimums.`;

      const result = await service.chunkPolicy(
        content,
        "policy-1",
        "version-1",
      );

      expect(result.strategy).toBe("section");
    });

    it("should detect numbered section headers", async () => {
      const content = `1. Introduction
This section introduces the policy and provides enough content for testing.

2. Background
This section provides background information with sufficient length.

3. Implementation
This section covers implementation details thoroughly.`;

      const result = await service.chunkPolicy(
        content,
        "policy-1",
        "version-1",
      );

      expect(result.strategy).toBe("section");
    });

    it("should detect ALL CAPS headers", async () => {
      const content = `POLICY OVERVIEW
This section provides an overview of the policy with adequate content.

SCOPE AND APPLICATION
This section defines the scope with enough text to form a chunk.`;

      const result = await service.chunkPolicy(
        content,
        "policy-1",
        "version-1",
      );

      expect(result.strategy).toBe("section");
    });
  });
});
