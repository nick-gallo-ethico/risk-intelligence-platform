import { Injectable, Logger } from "@nestjs/common";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
  DocumentChunk,
  ChunkMetadata,
  ChunkingOptions,
  ChunkingResult,
} from "../dto/chunk.dto";

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);

  private readonly DEFAULT_CHUNK_SIZE = 1500;
  private readonly DEFAULT_OVERLAP = 150;
  private readonly MIN_CHUNK_SIZE = 100;

  private readonly HEADER_PATTERNS = [
    /^#{1,6}\s+.+$/gm,
    /^<h[1-6][^>]*>.*<\/h[1-6]>/gim,
    /^[A-Z][A-Z\s]{3,}$/gm,
    /^\d+\.\s+[A-Z]/gm,
  ];

  async chunkPolicy(
    content: string,
    policyId: string,
    versionId: string,
    options?: ChunkingOptions,
  ): Promise<ChunkingResult> {
    const chunkSize = options?.chunkSize || this.DEFAULT_CHUNK_SIZE;
    const chunkOverlap = options?.chunkOverlap || this.DEFAULT_OVERLAP;

    const sections = this.splitBySections(content);

    if (sections.length <= 1) {
      return this.chunkRecursive(
        content,
        { parentId: policyId, versionId },
        options,
      );
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });

    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    for (const section of sections) {
      const baseMetadata: ChunkMetadata = {
        sectionTitle: section.title || undefined,
        parentId: policyId,
        versionId,
      };

      if (section.text.length <= chunkSize) {
        if (section.text.trim().length >= this.MIN_CHUNK_SIZE) {
          chunks.push({
            chunkIndex: chunkIndex++,
            text: section.text.trim(),
            metadata: { ...baseMetadata, charOffset: section.offset },
          });
        }
      } else {
        const subChunks = await splitter.splitText(section.text);
        for (const subChunk of subChunks) {
          if (subChunk.trim().length >= this.MIN_CHUNK_SIZE) {
            chunks.push({
              chunkIndex: chunkIndex++,
              text: subChunk.trim(),
              metadata: { ...baseMetadata, charOffset: section.offset },
            });
          }
        }
      }
    }

    this.logger.debug(
      `Chunked policy ${policyId}: ${content.length} chars -> ${chunks.length} chunks (section strategy)`,
    );

    return {
      chunks,
      sourceCharCount: content.length,
      chunkCount: chunks.length,
      strategy: "section",
    };
  }

  async chunkCaseActivities(
    activities: Array<{
      type: string;
      content: string;
      timestamp: Date;
    }>,
    caseId: string,
    options?: ChunkingOptions,
  ): Promise<ChunkingResult> {
    const chunkSize = options?.chunkSize || this.DEFAULT_CHUNK_SIZE;
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap: options?.chunkOverlap || this.DEFAULT_OVERLAP,
    });

    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;
    let totalChars = 0;

    for (const activity of activities) {
      totalChars += activity.content.length;
      const baseMetadata: ChunkMetadata = {
        parentId: caseId,
        activityType: activity.type,
        timestamp: activity.timestamp.toISOString(),
      };

      if (activity.content.length <= chunkSize) {
        if (activity.content.trim().length >= this.MIN_CHUNK_SIZE) {
          chunks.push({
            chunkIndex: chunkIndex++,
            text: activity.content.trim(),
            metadata: baseMetadata,
          });
        }
      } else {
        const subChunks = await splitter.splitText(activity.content);
        for (const subChunk of subChunks) {
          if (subChunk.trim().length >= this.MIN_CHUNK_SIZE) {
            chunks.push({
              chunkIndex: chunkIndex++,
              text: subChunk.trim(),
              metadata: baseMetadata,
            });
          }
        }
      }
    }

    this.logger.debug(
      `Chunked case ${caseId}: ${activities.length} activities -> ${chunks.length} chunks`,
    );

    return {
      chunks,
      sourceCharCount: totalChars,
      chunkCount: chunks.length,
      strategy: "activity",
    };
  }

  async chunkRecursive(
    content: string,
    baseMetadata: ChunkMetadata,
    options?: ChunkingOptions,
  ): Promise<ChunkingResult> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: options?.chunkSize || this.DEFAULT_CHUNK_SIZE,
      chunkOverlap: options?.chunkOverlap || this.DEFAULT_OVERLAP,
    });

    const textChunks = await splitter.splitText(content);
    const chunks: DocumentChunk[] = textChunks
      .filter(
        (chunk) =>
          chunk.trim().length >= (options?.minChunkSize || this.MIN_CHUNK_SIZE),
      )
      .map((text, index) => ({
        chunkIndex: index,
        text: text.trim(),
        metadata: baseMetadata,
      }));

    this.logger.debug(
      `Chunked content: ${content.length} chars -> ${chunks.length} chunks (recursive strategy)`,
    );

    return {
      chunks,
      sourceCharCount: content.length,
      chunkCount: chunks.length,
      strategy: "recursive",
    };
  }

  async chunkKnowledgeBase(
    content: string,
    documentId: string,
    options?: ChunkingOptions,
  ): Promise<ChunkingResult> {
    const result = await this.chunkRecursive(
      content,
      { parentId: documentId },
      options,
    );
    return { ...result, strategy: "passage" };
  }

  private splitBySections(content: string): Array<{
    title: string | null;
    text: string;
    offset: number;
  }> {
    const sections: Array<{
      title: string | null;
      text: string;
      offset: number;
    }> = [];

    const headerMatches: Array<{ match: string; index: number }> = [];

    for (const pattern of this.HEADER_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        headerMatches.push({
          match: match[0],
          index: match.index,
        });
      }
    }

    headerMatches.sort((a, b) => a.index - b.index);

    const uniqueHeaders = headerMatches.filter(
      (h, i, arr) => i === 0 || h.index !== arr[i - 1].index,
    );

    if (uniqueHeaders.length === 0) {
      return [{ title: null, text: content, offset: 0 }];
    }

    if (uniqueHeaders[0].index > 0) {
      const preContent = content.substring(0, uniqueHeaders[0].index).trim();
      if (preContent.length > 0) {
        sections.push({ title: null, text: preContent, offset: 0 });
      }
    }

    for (let i = 0; i < uniqueHeaders.length; i++) {
      const header = uniqueHeaders[i];
      const nextIndex =
        i < uniqueHeaders.length - 1
          ? uniqueHeaders[i + 1].index
          : content.length;

      const sectionText = content.substring(header.index, nextIndex).trim();
      const title = this.cleanHeaderText(header.match);

      sections.push({
        title,
        text: sectionText,
        offset: header.index,
      });
    }

    return sections;
  }

  private cleanHeaderText(header: string): string {
    return header
      .replace(/^#+\s*/, "")
      .replace(/<\/?h[1-6][^>]*>/gi, "")
      .replace(/^\d+\.\s*/, "")
      .trim();
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
