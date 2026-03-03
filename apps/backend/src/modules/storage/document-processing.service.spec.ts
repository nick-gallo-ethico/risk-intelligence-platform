import { Test, TestingModule } from "@nestjs/testing";
import { DocumentProcessingService } from "./document-processing.service";

// Mock pdf-parse and mammoth
jest.mock("pdf-parse", () => jest.fn());
jest.mock("mammoth", () => ({
  extractRawText: jest.fn(),
}));

describe("DocumentProcessingService", () => {
  let service: DocumentProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentProcessingService],
    }).compile();

    service = module.get<DocumentProcessingService>(DocumentProcessingService);
    jest.clearAllMocks();
  });

  describe("isExtractable", () => {
    it("should return true for PDF", () => {
      expect(service.isExtractable("application/pdf")).toBe(true);
    });

    it("should return true for plain text", () => {
      expect(service.isExtractable("text/plain")).toBe(true);
    });

    it("should return true for DOCX", () => {
      expect(
        service.isExtractable(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ).toBe(true);
    });

    it("should return true for CSV", () => {
      expect(service.isExtractable("text/csv")).toBe(true);
    });

    it("should return false for image types", () => {
      expect(service.isExtractable("image/png")).toBe(false);
      expect(service.isExtractable("image/jpeg")).toBe(false);
    });

    it("should return false for video types", () => {
      expect(service.isExtractable("video/mp4")).toBe(false);
    });

    it("should handle content type with charset parameter", () => {
      expect(service.isExtractable("text/plain; charset=utf-8")).toBe(true);
    });
  });

  describe("extractText", () => {
    it("should extract text from plain text buffer", async () => {
      const content = Buffer.from("Hello, World!", "utf-8");
      const result = await service.extractText(content, "text/plain");

      expect(result.success).toBe(true);
      expect(result.text).toBe("Hello, World!");
      expect(result.charCount).toBe(13);
    });

    it("should extract text from CSV buffer", async () => {
      const csvContent = "name,age\nAlice,30\nBob,25";
      const content = Buffer.from(csvContent, "utf-8");
      const result = await service.extractText(content, "text/csv");

      expect(result.success).toBe(true);
      expect(result.text).toBe(csvContent);
    });

    it("should extract JSON content", async () => {
      const jsonContent = '{"key": "value"}';
      const content = Buffer.from(jsonContent, "utf-8");
      const result = await service.extractText(content, "application/json");

      expect(result.success).toBe(true);
      expect(result.text).toBe(jsonContent);
    });

    it("should return failure for unsupported content type", async () => {
      const content = Buffer.from("binary data");
      const result = await service.extractText(content, "image/png");

      expect(result.success).toBe(false);
      expect(result.text).toBeNull();
      expect(result.error).toContain("Unsupported content type");
    });

    it("should handle PDF extraction via pdf-parse", async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require("pdf-parse");
      pdfParse.mockResolvedValue({
        text: "PDF content extracted",
        numpages: 1,
      });

      const content = Buffer.from("fake pdf content");
      const result = await service.extractText(content, "application/pdf");

      expect(result.success).toBe(true);
      expect(result.text).toBe("PDF content extracted");
    });

    it("should handle PDF extraction failure", async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require("pdf-parse");
      pdfParse.mockRejectedValue(new Error("Invalid PDF"));

      const content = Buffer.from("invalid pdf");
      const result = await service.extractText(content, "application/pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("PDF extraction failed");
    });

    it("should return not supported for legacy .doc files", async () => {
      const content = Buffer.from("doc content");
      const result = await service.extractText(content, "application/msword");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not supported");
    });

    it("should return not implemented for Excel files", async () => {
      const content = Buffer.from("excel content");
      const result = await service.extractText(
        content,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not yet implemented");
    });
  });

  describe("extractTextTruncated", () => {
    it("should truncate text to maxLength", async () => {
      const longText = "A".repeat(200);
      const content = Buffer.from(longText, "utf-8");

      const result = await service.extractTextTruncated(
        content,
        "text/plain",
        100,
      );

      expect(result.text).toHaveLength(100);
      expect(result.charCount).toBe(100);
    });

    it("should not truncate text shorter than maxLength", async () => {
      const shortText = "Short text";
      const content = Buffer.from(shortText, "utf-8");

      const result = await service.extractTextTruncated(
        content,
        "text/plain",
        1000,
      );

      expect(result.text).toBe(shortText);
      expect(result.charCount).toBe(shortText.length);
    });
  });

  describe("getSupportedTypes", () => {
    it("should return array of supported MIME types", () => {
      const types = service.getSupportedTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain("application/pdf");
      expect(types).toContain("text/plain");
      expect(types).toContain("text/csv");
    });
  });
});
