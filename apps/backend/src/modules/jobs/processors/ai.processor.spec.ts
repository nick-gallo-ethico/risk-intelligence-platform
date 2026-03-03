import { Test, TestingModule } from "@nestjs/testing";
import { AiProcessor } from "./ai.processor";
import { Job } from "bullmq";
import { AiJobData } from "../types/job-data.types";

describe("AiProcessor", () => {
  let processor: AiProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiProcessor],
    }).compile();

    processor = module.get<AiProcessor>(AiProcessor);
  });

  const makeJob = (data: AiJobData): Job<AiJobData> =>
    ({
      id: "job-test-123",
      data,
      attemptsMade: 0,
    }) as unknown as Job<AiJobData>;

  describe("process", () => {
    it("should handle generate-summary job type", async () => {
      const job = makeJob({
        type: "generate-summary",
        organizationId: "org-123",
        entityType: "CASE",
        entityId: "case-123",
      });

      const result = await processor.process(job);

      expect(result).toHaveProperty("summary");
      expect((result as any).summary).toBe("AI summary placeholder");
    });

    it("should handle translate job type", async () => {
      const job = makeJob({
        type: "translate",
        organizationId: "org-123",
        entityType: "POLICY",
        entityId: "policy-123",
        targetLanguage: "es",
      });

      const result = await processor.process(job);

      expect(result).toHaveProperty("translation");
      expect((result as any).targetLanguage).toBe("es");
    });

    it("should handle categorize job type", async () => {
      const job = makeJob({
        type: "categorize",
        organizationId: "org-123",
        entityType: "CASE",
        entityId: "case-123",
      });

      const result = await processor.process(job);

      expect(result).toHaveProperty("categoryId");
    });

    it("should handle note-cleanup job type", async () => {
      const job = makeJob({
        type: "note-cleanup",
        organizationId: "org-123",
        entityType: "RIU",
        entityId: "riu-123",
        content: "Raw note content",
      });

      const result = await processor.process(job);

      expect(result).toHaveProperty("cleanedContent");
      expect((result as any).cleanedContent).toBe("Raw note content");
    });

    it("should return empty string for note-cleanup with no content", async () => {
      const job = makeJob({
        type: "note-cleanup",
        organizationId: "org-123",
        entityType: "RIU",
        entityId: "riu-123",
      });

      const result = await processor.process(job);

      expect((result as any).cleanedContent).toBe("");
    });

    it("should throw for unknown job type", async () => {
      const job = makeJob({
        type: "unknown-type" as any,
        organizationId: "org-123",
        entityType: "CASE",
        entityId: "case-123",
      });

      await expect(processor.process(job)).rejects.toThrow(
        "Unknown AI job type: unknown-type",
      );
    });

    it("should default targetLanguage to en when not provided for translate", async () => {
      const job = makeJob({
        type: "translate",
        organizationId: "org-123",
        entityType: "POLICY",
        entityId: "policy-123",
      });

      const result = await processor.process(job);

      expect((result as any).targetLanguage).toBe("en");
    });
  });
});
