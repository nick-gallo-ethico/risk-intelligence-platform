import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MigrationSourceType } from "@prisma/client";
import { parse as csvParse } from "csv-parse";
import { Readable } from "stream";
import * as xlsx from "xlsx";
import {
  FormatDetectionResult,
  SOURCE_FIELD_PATTERNS,
  UploadResultDto,
} from "./dto/upload.dto";
import { StorageAdapter } from "../../../common/services/storage.interface";
import { STORAGE_ADAPTER } from "../../../common/services/storage.service";

// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Number of sample rows to return
const SAMPLE_ROWS = 10;

/**
 * Service for uploading migration files and detecting their format.
 *
 * Supports CSV, XLSX, and XLS formats. Automatically detects the source
 * system (NAVEX, EQS, Legacy Ethico, OneTrust, STAR) based on column headers.
 */
@Injectable()
export class MigrationUploadService {
  private readonly logger = new Logger(MigrationUploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_ADAPTER)
    private readonly storageAdapter: StorageAdapter,
  ) {}

  /**
   * Upload migration file, detect format, and create job.
   *
   * @param orgId - Organization ID for tenant isolation
   * @param userId - User ID who is uploading
   * @param file - Uploaded file from multer
   * @param hintSourceType - Optional hint for source type
   * @returns Upload result with job ID and detected format
   */
  async uploadFile(
    orgId: string,
    userId: string,
    file: Express.Multer.File,
    hintSourceType?: MigrationSourceType,
  ): Promise<UploadResultDto> {
    // Validate file
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    const extension = file.originalname.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(extension || "")) {
      throw new BadRequestException(
        "Invalid file type. Supported: CSV, XLSX, XLS",
      );
    }

    // Upload to blob storage
    const uploadResult = await this.storageAdapter.upload(
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      orgId,
      { subdirectory: "migrations" },
    );

    // Detect format
    const detection = await this.detectFormat(
      file.buffer,
      extension!,
      hintSourceType,
    );

    // Create migration job
    const job = await this.prisma.migrationJob.create({
      data: {
        organizationId: orgId,
        sourceType: detection.sourceType,
        fileName: file.originalname,
        fileUrl: uploadResult.key,
        fileSizeBytes: file.size,
        status: "PENDING",
        totalRows: detection.totalRows,
        createdById: userId,
      },
    });

    this.logger.log(
      `Migration file uploaded: ${file.originalname} (${detection.sourceType}) - Job ${job.id}`,
    );

    return {
      jobId: job.id,
      fileName: file.originalname,
      fileUrl: uploadResult.url,
      fileSizeBytes: file.size,
      detectedSourceType: detection.sourceType,
      detectedFields: detection.detectedFields,
      sampleRows: detection.sampleRows,
      confidence: detection.confidence,
      warnings: detection.warnings,
    };
  }

  /**
   * Detect file format and source type from file contents.
   *
   * @param buffer - File buffer
   * @param extension - File extension (csv, xlsx, xls)
   * @param hintSourceType - Optional hint for source type
   * @returns Format detection result
   */
  async detectFormat(
    buffer: Buffer,
    extension: string,
    hintSourceType?: MigrationSourceType,
  ): Promise<FormatDetectionResult> {
    let rows: Record<string, unknown>[];
    let headers: string[];
    let totalRows: number;
    let delimiter = ",";

    if (extension === "csv") {
      const { parsedRows, detectedDelimiter, detectedHeaders, rowCount } =
        await this.parseCsv(buffer);
      rows = parsedRows;
      headers = detectedHeaders;
      totalRows = rowCount;
      delimiter = detectedDelimiter;
    } else {
      const { parsedRows, detectedHeaders, rowCount } = this.parseExcel(buffer);
      rows = parsedRows;
      headers = detectedHeaders;
      totalRows = rowCount;
    }

    // Detect source type from headers
    const { sourceType, confidence } = this.detectSourceType(
      headers,
      hintSourceType,
    );

    const warnings: string[] = [];
    if (confidence < 50) {
      warnings.push(
        "Low confidence in format detection. Please verify field mappings carefully.",
      );
    }
    if (totalRows > 10000) {
      warnings.push(
        `Large file detected (${totalRows.toLocaleString()} rows). Import may take several minutes.`,
      );
    }

    return {
      sourceType,
      confidence,
      detectedFields: headers,
      sampleRows: rows.slice(0, SAMPLE_ROWS),
      warnings,
      delimiter,
      hasHeaders: true,
      encoding: "utf-8",
      totalRows,
    };
  }

  /**
   * Parse CSV file with delimiter detection.
   *
   * @param buffer - File buffer
   * @returns Parsed rows, delimiter, headers, and row count
   */
  private async parseCsv(buffer: Buffer): Promise<{
    parsedRows: Record<string, unknown>[];
    detectedDelimiter: string;
    detectedHeaders: string[];
    rowCount: number;
  }> {
    // Detect delimiter from first line
    const firstLine = buffer.toString("utf-8").split("\n")[0];
    const delimiters = [",", ";", "\t", "|"];
    let bestDelimiter = ",";
    let maxCount = 0;

    for (const d of delimiters) {
      const count = (
        firstLine.match(new RegExp(d.replace("|", "\\|"), "g")) || []
      ).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = d;
      }
    }

    return new Promise((resolve, reject) => {
      const rows: Record<string, unknown>[] = [];
      let headers: string[] = [];
      let rowCount = 0;

      const parser = csvParse({
        delimiter: bestDelimiter,
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });

      parser.on("readable", () => {
        let record;
        while ((record = parser.read()) !== null) {
          if (headers.length === 0) {
            headers = Object.keys(record);
          }
          rows.push(record);
          rowCount++;
        }
      });

      parser.on("error", reject);
      parser.on("end", () => {
        resolve({
          parsedRows: rows,
          detectedDelimiter: bestDelimiter,
          detectedHeaders: headers,
          rowCount,
        });
      });

      Readable.from(buffer).pipe(parser);
    });
  }

  /**
   * Parse Excel file (XLSX or XLS).
   *
   * @param buffer - File buffer
   * @returns Parsed rows, headers, and row count
   */
  private parseExcel(buffer: Buffer): {
    parsedRows: Record<string, unknown>[];
    detectedHeaders: string[];
    rowCount: number;
  } {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = xlsx.utils.sheet_to_json(sheet, {
      defval: "",
    }) as Record<string, unknown>[];
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      parsedRows: rows,
      detectedHeaders: headers,
      rowCount: rows.length,
    };
  }

  /**
   * Detect source type from column headers.
   *
   * @param headers - Column headers from file
   * @param hintSourceType - Optional hint for source type
   * @returns Detected source type and confidence score
   */
  private detectSourceType(
    headers: string[],
    hintSourceType?: MigrationSourceType,
  ): { sourceType: MigrationSourceType; confidence: number } {
    // If hint provided and matches reasonably well, use it
    if (hintSourceType && hintSourceType !== "GENERIC_CSV") {
      const patternMatch = this.calculatePatternMatch(headers, hintSourceType);
      if (patternMatch > 30) {
        return { sourceType: hintSourceType, confidence: patternMatch };
      }
    }

    // Try each source type and find best match
    const scores: { type: MigrationSourceType; score: number }[] = [];

    for (const [type] of Object.entries(SOURCE_FIELD_PATTERNS)) {
      if (type === "GENERIC_CSV") continue;
      const score = this.calculatePatternMatch(
        headers,
        type as MigrationSourceType,
      );
      scores.push({ type: type as MigrationSourceType, score });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    if (best && best.score >= 30) {
      return { sourceType: best.type, confidence: best.score };
    }

    // Default to generic CSV - 100% confidence since it accepts any format
    return { sourceType: "GENERIC_CSV", confidence: 100 };
  }

  /**
   * Calculate match percentage between headers and known patterns.
   *
   * @param headers - Column headers from file
   * @param sourceType - Source type to match against
   * @returns Match percentage (0-100)
   */
  private calculatePatternMatch(
    headers: string[],
    sourceType: MigrationSourceType,
  ): number {
    const patterns = SOURCE_FIELD_PATTERNS[sourceType];
    if (patterns.length === 0) return 0;

    const normalizedHeaders = headers.map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    );

    let matchCount = 0;
    for (const pattern of patterns) {
      const normalizedPattern = pattern
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_");
      if (
        normalizedHeaders.some(
          (h) => h.includes(normalizedPattern) || normalizedPattern.includes(h),
        )
      ) {
        matchCount++;
      }
    }

    return Math.round((matchCount / patterns.length) * 100);
  }

  /**
   * Get sample data from an uploaded file.
   *
   * @param orgId - Organization ID for tenant isolation
   * @param jobId - Migration job ID
   * @param limit - Maximum number of rows to return
   * @returns Sample rows from the file
   */
  async getSampleData(
    orgId: string,
    jobId: string,
    limit: number = 100,
  ): Promise<Record<string, unknown>[]> {
    const job = await this.prisma.migrationJob.findFirst({
      where: { id: jobId, organizationId: orgId },
    });

    if (!job) {
      throw new BadRequestException("Migration job not found");
    }

    // Download file from storage
    const downloadResult = await this.storageAdapter.download(job.fileUrl);
    const chunks: Buffer[] = [];

    for await (const chunk of downloadResult.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    const extension = job.fileName.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      const { parsedRows } = await this.parseCsv(buffer);
      return parsedRows.slice(0, limit);
    } else {
      const { parsedRows } = this.parseExcel(buffer);
      return parsedRows.slice(0, limit);
    }
  }
}
