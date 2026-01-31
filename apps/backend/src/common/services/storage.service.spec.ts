// =============================================================================
// STORAGE SERVICE - UNIT TESTS
// =============================================================================
//
// Tests for the StorageService.
// Key test scenarios:
// - File upload with validation
// - File size validation
// - MIME type validation (with wildcards)
// - Download delegation to adapter
// - Delete delegation to adapter
// - Signed URL generation
// =============================================================================

import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StorageService, STORAGE_ADAPTER } from "./storage.service";
import {
  StorageAdapter,
  FileInput,
  UploadResult,
  DownloadResult,
} from "./storage.interface";
import { Readable } from "stream";

describe("StorageService", () => {
  let service: StorageService;
  let mockAdapter: jest.Mocked<StorageAdapter>;
  let mockConfigService: jest.Mocked<ConfigService>;

  // Test data
  const mockTenantId = "tenant-uuid-123";
  const mockStorageKey = "tenant-uuid-123/files/uuid-456/test-file.pdf";

  const mockFile: FileInput = {
    originalname: "test-file.pdf",
    mimetype: "application/pdf",
    size: 1024 * 1024, // 1MB
    buffer: Buffer.from("test file content"),
  };

  const mockUploadResult: UploadResult = {
    key: mockStorageKey,
    url: `/uploads/${mockStorageKey}`,
    size: 1024 * 1024,
    mimeType: "application/pdf",
    filename: "test-file.pdf",
  };

  const mockDownloadResult: DownloadResult = {
    stream: Readable.from(["test content"]),
    mimeType: "application/pdf",
    size: 1024,
    filename: "test-file.pdf",
  };

  beforeEach(async () => {
    // Create mock adapter
    mockAdapter = {
      upload: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
      getSignedUrl: jest.fn(),
      exists: jest.fn(),
    };

    // Create mock config service
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          "storage.maxFileSize": 10 * 1024 * 1024, // 10MB
          "storage.allowedMimeTypes": [
            "image/*",
            "application/pdf",
            "text/*",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.*",
          ],
        };
        return config[key] ?? defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: STORAGE_ADAPTER,
          useValue: mockAdapter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // UPLOAD TESTS
  // -------------------------------------------------------------------------

  describe("upload()", () => {
    it("should upload file successfully", async () => {
      // Arrange
      mockAdapter.upload.mockResolvedValue(mockUploadResult);

      // Act
      const result = await service.upload(mockFile, mockTenantId);

      // Assert
      expect(mockAdapter.upload).toHaveBeenCalledWith(
        mockFile,
        mockTenantId,
        undefined,
      );
      expect(result).toEqual(mockUploadResult);
    });

    it("should pass upload options to adapter", async () => {
      // Arrange
      mockAdapter.upload.mockResolvedValue(mockUploadResult);
      const options = { subdirectory: "attachments", filename: "custom.pdf" };

      // Act
      await service.upload(mockFile, mockTenantId, options);

      // Assert
      expect(mockAdapter.upload).toHaveBeenCalledWith(
        mockFile,
        mockTenantId,
        options,
      );
    });

    it("should throw BadRequestException when tenant ID is missing", async () => {
      // Act & Assert
      await expect(service.upload(mockFile, "")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.upload(mockFile, "")).rejects.toThrow(
        "Tenant ID is required",
      );
    });

    it("should throw BadRequestException when file is missing", async () => {
      // Act & Assert
      await expect(
        service.upload(null as unknown as FileInput, mockTenantId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.upload(null as unknown as FileInput, mockTenantId),
      ).rejects.toThrow("No file provided");
    });

    // -------------------------------------------------------------------------
    // FILE SIZE VALIDATION
    // -------------------------------------------------------------------------

    it("should reject files exceeding max size", async () => {
      // Arrange
      const largeFile: FileInput = {
        ...mockFile,
        size: 15 * 1024 * 1024, // 15MB (exceeds 10MB limit)
      };

      // Act & Assert
      await expect(service.upload(largeFile, mockTenantId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.upload(largeFile, mockTenantId)).rejects.toThrow(
        /exceeds maximum/,
      );
    });

    it("should accept files within size limit", async () => {
      // Arrange
      mockAdapter.upload.mockResolvedValue(mockUploadResult);
      const validFile: FileInput = {
        ...mockFile,
        size: 5 * 1024 * 1024, // 5MB (within 10MB limit)
      };

      // Act
      const result = await service.upload(validFile, mockTenantId);

      // Assert
      expect(result).toEqual(mockUploadResult);
    });

    // -------------------------------------------------------------------------
    // MIME TYPE VALIDATION
    // -------------------------------------------------------------------------

    it("should accept allowed MIME type (exact match)", async () => {
      // Arrange
      mockAdapter.upload.mockResolvedValue(mockUploadResult);
      const pdfFile: FileInput = {
        ...mockFile,
        mimetype: "application/pdf",
      };

      // Act
      const result = await service.upload(pdfFile, mockTenantId);

      // Assert
      expect(result).toEqual(mockUploadResult);
    });

    it("should accept allowed MIME type (wildcard image/*)", async () => {
      // Arrange
      mockAdapter.upload.mockResolvedValue({
        ...mockUploadResult,
        mimeType: "image/jpeg",
      });
      const imageFile: FileInput = {
        ...mockFile,
        mimetype: "image/jpeg",
      };

      // Act
      const result = await service.upload(imageFile, mockTenantId);

      // Assert
      expect(result.mimeType).toBe("image/jpeg");
    });

    it("should accept allowed MIME type (wildcard text/*)", async () => {
      // Arrange
      mockAdapter.upload.mockResolvedValue({
        ...mockUploadResult,
        mimeType: "text/plain",
      });
      const textFile: FileInput = {
        ...mockFile,
        mimetype: "text/plain",
      };

      // Act
      const result = await service.upload(textFile, mockTenantId);

      // Assert
      expect(result.mimeType).toBe("text/plain");
    });

    it("should accept Office document MIME types", async () => {
      // Arrange
      mockAdapter.upload.mockResolvedValue({
        ...mockUploadResult,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const docxFile: FileInput = {
        ...mockFile,
        mimetype:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };

      // Act
      const result = await service.upload(docxFile, mockTenantId);

      // Assert
      expect(result.mimeType).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    });

    it("should reject disallowed MIME type", async () => {
      // Arrange
      const executableFile: FileInput = {
        ...mockFile,
        mimetype: "application/x-msdownload",
      };

      // Act & Assert
      await expect(
        service.upload(executableFile, mockTenantId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.upload(executableFile, mockTenantId),
      ).rejects.toThrow(/not allowed/);
    });

    it("should reject video files (not in allowlist)", async () => {
      // Arrange
      const videoFile: FileInput = {
        ...mockFile,
        mimetype: "video/mp4",
      };

      // Act & Assert
      await expect(service.upload(videoFile, mockTenantId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // DOWNLOAD TESTS
  // -------------------------------------------------------------------------

  describe("download()", () => {
    it("should delegate to adapter", async () => {
      // Arrange
      mockAdapter.download.mockResolvedValue(mockDownloadResult);

      // Act
      const result = await service.download(mockStorageKey);

      // Assert
      expect(mockAdapter.download).toHaveBeenCalledWith(mockStorageKey);
      expect(result).toEqual(mockDownloadResult);
    });

    it("should pass through adapter errors", async () => {
      // Arrange
      mockAdapter.download.mockRejectedValue(new Error("File not found"));

      // Act & Assert
      await expect(service.download(mockStorageKey)).rejects.toThrow(
        "File not found",
      );
    });
  });

  // -------------------------------------------------------------------------
  // DELETE TESTS
  // -------------------------------------------------------------------------

  describe("delete()", () => {
    it("should delegate to adapter", async () => {
      // Arrange
      mockAdapter.delete.mockResolvedValue(undefined);

      // Act
      await service.delete(mockStorageKey);

      // Assert
      expect(mockAdapter.delete).toHaveBeenCalledWith(mockStorageKey);
    });

    it("should pass through adapter errors", async () => {
      // Arrange
      mockAdapter.delete.mockRejectedValue(new Error("File not found"));

      // Act & Assert
      await expect(service.delete(mockStorageKey)).rejects.toThrow(
        "File not found",
      );
    });
  });

  // -------------------------------------------------------------------------
  // GET SIGNED URL TESTS
  // -------------------------------------------------------------------------

  describe("getSignedUrl()", () => {
    it("should delegate to adapter with default expiry", async () => {
      // Arrange
      const signedUrl = "https://example.com/signed-url?token=abc";
      mockAdapter.getSignedUrl.mockResolvedValue(signedUrl);

      // Act
      const result = await service.getSignedUrl(mockStorageKey);

      // Assert
      expect(mockAdapter.getSignedUrl).toHaveBeenCalledWith(
        mockStorageKey,
        3600,
      );
      expect(result).toBe(signedUrl);
    });

    it("should delegate to adapter with custom expiry", async () => {
      // Arrange
      const signedUrl = "https://example.com/signed-url?token=abc";
      mockAdapter.getSignedUrl.mockResolvedValue(signedUrl);

      // Act
      const result = await service.getSignedUrl(mockStorageKey, 7200);

      // Assert
      expect(mockAdapter.getSignedUrl).toHaveBeenCalledWith(
        mockStorageKey,
        7200,
      );
      expect(result).toBe(signedUrl);
    });
  });

  // -------------------------------------------------------------------------
  // EXISTS TESTS
  // -------------------------------------------------------------------------

  describe("exists()", () => {
    it("should return true when file exists", async () => {
      // Arrange
      mockAdapter.exists.mockResolvedValue(true);

      // Act
      const result = await service.exists(mockStorageKey);

      // Assert
      expect(mockAdapter.exists).toHaveBeenCalledWith(mockStorageKey);
      expect(result).toBe(true);
    });

    it("should return false when file does not exist", async () => {
      // Arrange
      mockAdapter.exists.mockResolvedValue(false);

      // Act
      const result = await service.exists(mockStorageKey);

      // Assert
      expect(result).toBe(false);
    });
  });
});
