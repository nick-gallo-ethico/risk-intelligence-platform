import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import {
  StorageProvider,
  STORAGE_PROVIDER,
} from "../../storage/providers/storage-provider.interface";
import { DocumentProcessingService } from "../../storage/document-processing.service";
import { EmbeddingService } from "./embedding.service";
import { ChunkingService } from "./chunking.service";
import { VectorStoreService } from "./vector-store.service";
import {
  CreateKnowledgeBaseDocDto,
  UpdateKnowledgeBaseDocDto,
  KnowledgeBaseDocResponse,
  KnowledgeBaseDocStatus,
  ListKnowledgeBaseDocsDto,
  KnowledgeBaseListResponse,
} from "../dto/knowledge-base.dto";

// Queue name for embedding jobs
const EMBEDDING_QUEUE_NAME = "embedding";

/**
 * KnowledgeBaseService manages knowledge base documents and their embeddings.
 *
 * Documents are stored in blob storage and their text is chunked and embedded
 * for semantic search by the AI chatbot.
 */
@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    private readonly documentProcessing: DocumentProcessingService,
    private readonly embeddingService: EmbeddingService,
    private readonly chunkingService: ChunkingService,
    private readonly vectorStore: VectorStoreService,
    @InjectQueue(EMBEDDING_QUEUE_NAME) private readonly embeddingQueue: Queue,
  ) {}

  /**
   * Upload and process a knowledge base document.
   *
   * 1. Upload file to blob storage
   * 2. Create document record
   * 3. Queue embedding job for async processing
   */
  async uploadDocument(
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
    dto: CreateKnowledgeBaseDocDto,
  ): Promise<KnowledgeBaseDocResponse> {
    // Validate file type
    if (!this.documentProcessing.isExtractable(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not supported. Use PDF, DOCX, or TXT.`,
      );
    }

    // Upload to blob storage
    const storagePath = `knowledge-base/${organizationId}/${Date.now()}-${file.originalname}`;
    const uploadResult = await this.storageProvider.uploadFile({
      organizationId,
      path: storagePath,
      content: file.buffer,
      contentType: file.mimetype,
      metadata: {
        originalFileName: file.originalname,
        uploadedById: userId,
      },
    });

    // Create document record
    const doc = await this.prisma.knowledgeBaseDocument.create({
      data: {
        organizationId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storagePath: uploadResult.key,
        status: KnowledgeBaseDocStatus.PENDING,
        createdById: userId,
      },
    });

    // Queue embedding job
    await this.embeddingQueue.add(
      "embed-knowledge-base",
      {
        documentId: doc.id,
        organizationId,
      },
      {
        jobId: `kb-embed-${doc.id}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    );

    this.logger.log(`Queued embedding for knowledge base document ${doc.id}`);

    return this.toResponse(doc);
  }

  /**
   * Process document embedding (called by queue processor).
   */
  async processEmbedding(
    documentId: string,
    organizationId: string,
  ): Promise<void> {
    const doc = await this.prisma.knowledgeBaseDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Document not found");
    }

    // Update status to processing
    await this.prisma.knowledgeBaseDocument.update({
      where: { id: documentId },
      data: { status: KnowledgeBaseDocStatus.PROCESSING },
    });

    try {
      // Download file from storage
      const fileContent = await this.storageProvider.downloadFile({
        organizationId,
        path: doc.storagePath,
      });

      // Extract text
      const extraction = await this.documentProcessing.extractText(
        fileContent,
        doc.fileType,
      );

      if (!extraction.success || !extraction.text) {
        throw new Error(extraction.error || "Text extraction failed");
      }

      // Chunk the document
      const chunkingResult = await this.chunkingService.chunkKnowledgeBase(
        extraction.text,
        documentId,
      );

      if (chunkingResult.chunks.length === 0) {
        throw new Error("No chunks generated from document");
      }

      // Generate embeddings
      const embeddings = await this.embeddingService.embedBatch(
        chunkingResult.chunks.map((c) => c.text),
        "document",
      );

      // Store embeddings
      const embeddedChunks = chunkingResult.chunks.map((chunk, i) => ({
        ...chunk,
        embedding: embeddings[i],
      }));

      await this.vectorStore.upsertChunks(
        organizationId,
        "KNOWLEDGE_BASE",
        documentId,
        embeddedChunks,
        this.embeddingService.provider.name,
      );

      // Update document status
      await this.prisma.knowledgeBaseDocument.update({
        where: { id: documentId },
        data: {
          status: KnowledgeBaseDocStatus.EMBEDDED,
          chunkCount: chunkingResult.chunkCount,
          errorMessage: null,
        },
      });

      this.logger.log(
        `Embedded knowledge base document ${documentId}: ${chunkingResult.chunkCount} chunks`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.prisma.knowledgeBaseDocument.update({
        where: { id: documentId },
        data: {
          status: KnowledgeBaseDocStatus.FAILED,
          errorMessage,
        },
      });

      this.logger.error(
        `Failed to embed document ${documentId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Get a knowledge base document by ID.
   */
  async getDocument(
    organizationId: string,
    documentId: string,
  ): Promise<KnowledgeBaseDocResponse> {
    const doc = await this.prisma.knowledgeBaseDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Document not found");
    }

    return this.toResponse(doc);
  }

  /**
   * List knowledge base documents.
   */
  async listDocuments(
    organizationId: string,
    query: ListKnowledgeBaseDocsDto,
  ): Promise<KnowledgeBaseListResponse> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { organizationId };
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;

    const [documents, total] = await Promise.all([
      this.prisma.knowledgeBaseDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.knowledgeBaseDocument.count({ where }),
    ]);

    return {
      documents: documents.map((d) => this.toResponse(d)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Update a knowledge base document.
   */
  async updateDocument(
    organizationId: string,
    documentId: string,
    dto: UpdateKnowledgeBaseDocDto,
  ): Promise<KnowledgeBaseDocResponse> {
    const doc = await this.prisma.knowledgeBaseDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Document not found");
    }

    const updated = await this.prisma.knowledgeBaseDocument.update({
      where: { id: documentId },
      data: dto,
    });

    return this.toResponse(updated);
  }

  /**
   * Delete a knowledge base document and its embeddings.
   */
  async deleteDocument(
    organizationId: string,
    documentId: string,
  ): Promise<void> {
    const doc = await this.prisma.knowledgeBaseDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Document not found");
    }

    // Delete embeddings
    await this.vectorStore.deleteBySource(
      organizationId,
      "KNOWLEDGE_BASE",
      documentId,
    );

    // Delete from storage
    try {
      await this.storageProvider.deleteFile({
        organizationId,
        path: doc.storagePath,
      });
    } catch (error) {
      this.logger.warn(`Failed to delete file from storage: ${error}`);
    }

    // Delete record
    await this.prisma.knowledgeBaseDocument.delete({
      where: { id: documentId },
    });

    this.logger.log(`Deleted knowledge base document ${documentId}`);
  }

  /**
   * Re-embed a document (e.g., after embedding model upgrade).
   */
  async reEmbed(organizationId: string, documentId: string): Promise<void> {
    const doc = await this.prisma.knowledgeBaseDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException("Document not found");
    }

    // Reset status and queue for re-embedding
    await this.prisma.knowledgeBaseDocument.update({
      where: { id: documentId },
      data: { status: KnowledgeBaseDocStatus.PENDING },
    });

    await this.embeddingQueue.add(
      "embed-knowledge-base",
      { documentId, organizationId },
      { jobId: `kb-embed-${documentId}-${Date.now()}` },
    );
  }

  /**
   * Convert database record to response DTO.
   */
  private toResponse(doc: {
    id: string;
    organizationId: string;
    title: string;
    description: string | null;
    category: string | null;
    fileName: string;
    fileType: string;
    fileSize: number;
    status: string;
    chunkCount: number;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdById: string;
  }): KnowledgeBaseDocResponse {
    return {
      id: doc.id,
      organizationId: doc.organizationId,
      title: doc.title,
      description: doc.description || undefined,
      category: doc.category || undefined,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      status: doc.status as KnowledgeBaseDocStatus,
      chunkCount: doc.chunkCount,
      errorMessage: doc.errorMessage || undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdById: doc.createdById,
    };
  }
}
