// =============================================================================
// LOCAL STORAGE ADAPTER - UNIT TESTS
// =============================================================================
//
// Tests for the LocalStorageAdapter.
// Key test scenarios:
// - File upload with tenant isolation
// - Filename sanitization
// - File download with streaming
// - File deletion with cleanup
// - Signed URL generation (local dev)
// - File existence checking
// =============================================================================

// Mock uuid before imports (ESM compatibility)
let mockUuidCounter = 0;
jest.mock("uuid", () => ({
  v4: () => `mock-uuid-${++mockUuidCounter}`,
}));

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import { LocalStorageAdapter } from "./local-storage.adapter";
import { FileInput } from "./storage.interface";
import * as fs from "fs/promises";
import * as path from "path";

// Mock fs modules
jest.mock("fs/promises");
jest.mock("fs", () => ({
  createReadStream: jest.fn(() => ({
    on: jest.fn(),
    pipe: jest.fn(),
  })),
  mkdirSync: jest.fn(),
}));

describe("LocalStorageAdapter", () => {
  let adapter: LocalStorageAdapter;
  let mockConfigService: jest.Mocked<ConfigService>;
  const mockFs = fs as jest.Mocked<typeof fs>;

  // Test data
  const mockTenantId = "tenant-uuid-123";
  const basePath = "./uploads";

  const mockFile: FileInput = {
    originalname: "test-file.pdf",
    mimetype: "application/pdf",
    size: 1024,
    buffer: Buffer.from("test content"),
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    mockUuidCounter = 0;

    // Create mock config service
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "storage.localPath") return basePath;
        return defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    // Setup fs mocks
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 1024 } as unknown as Awaited<
      ReturnType<typeof fs.stat>
    >);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.rmdir.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageAdapter,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    adapter = module.get<LocalStorageAdapter>(LocalStorageAdapter);
  });

  // -------------------------------------------------------------------------
  // UPLOAD TESTS
  // -------------------------------------------------------------------------

  describe("upload()", () => {
    it("should create directory and write file", async () => {
      // Act
      const result = await adapter.upload(mockFile, mockTenantId);

      // Assert
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(mockTenantId),
        { recursive: true },
      );
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(result.key).toContain(mockTenantId);
      expect(result.filename).toBe("test-file.pdf");
      expect(result.mimeType).toBe("application/pdf");
      expect(result.size).toBe(1024);
    });

    it("should use subdirectory from options", async () => {
      // Act
      const result = await adapter.upload(mockFile, mockTenantId, {
        subdirectory: "attachments",
      });

      // Assert
      expect(result.key).toContain("attachments");
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("attachments"),
        { recursive: true },
      );
    });

    it("should use custom filename from options", async () => {
      // Act
      const result = await adapter.upload(mockFile, mockTenantId, {
        filename: "custom-name.pdf",
      });

      // Assert
      expect(result.filename).toBe("custom-name.pdf");
      expect(result.key).toContain("custom-name.pdf");
    });

    it("should sanitize dangerous characters from filename", async () => {
      // Arrange
      const dangerousFile: FileInput = {
        ...mockFile,
        originalname: "../../../etc/passwd",
      };

      // Act
      const result = await adapter.upload(dangerousFile, mockTenantId);

      // Assert
      expect(result.filename).not.toContain("..");
      expect(result.filename).not.toContain("/");
    });

    it("should sanitize special characters from filename", async () => {
      // Arrange
      const specialFile: FileInput = {
        ...mockFile,
        originalname: "file<script>alert('xss')</script>.pdf",
      };

      // Act
      const result = await adapter.upload(specialFile, mockTenantId);

      // Assert
      expect(result.filename).not.toContain("<");
      expect(result.filename).not.toContain(">");
      expect(result.filename).not.toContain("'");
    });

    it("should handle empty filename", async () => {
      // Arrange
      const emptyFile: FileInput = {
        ...mockFile,
        originalname: "",
      };

      // Act
      const result = await adapter.upload(emptyFile, mockTenantId);

      // Assert
      expect(result.filename).toBe("file");
    });

    it("should return URL in correct format", async () => {
      // Act
      const result = await adapter.upload(mockFile, mockTenantId);

      // Assert
      expect(result.url).toMatch(/^\/uploads\//);
      expect(result.url).toContain(mockTenantId);
    });

    it("should generate unique storage key", async () => {
      // Act
      const result1 = await adapter.upload(mockFile, mockTenantId);
      const result2 = await adapter.upload(mockFile, mockTenantId);

      // Assert
      expect(result1.key).not.toBe(result2.key);
    });

    it("should handle file from path (disk storage)", async () => {
      // Arrange
      const pathFile: FileInput = {
        ...mockFile,
        buffer: undefined,
        path: "/tmp/upload-123",
      };
      mockFs.copyFile.mockResolvedValue(undefined);

      // Act
      const result = await adapter.upload(pathFile, mockTenantId);

      // Assert
      expect(mockFs.copyFile).toHaveBeenCalled();
      expect(result.key).toContain(mockTenantId);
    });
  });

  // -------------------------------------------------------------------------
  // DOWNLOAD TESTS
  // -------------------------------------------------------------------------

  describe("download()", () => {
    const testKey = "tenant-uuid-123/files/uuid-456/test.pdf";

    it("should return stream with metadata", async () => {
      // Arrange
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({
        size: 2048,
      } as unknown as Awaited<ReturnType<typeof fs.stat>>);

      // Act
      const result = await adapter.download(testKey);

      // Assert
      expect(result.size).toBe(2048);
      expect(result.filename).toBe("test.pdf");
      expect(result.mimeType).toBe("application/pdf");
      expect(result.stream).toBeDefined();
    });

    it("should throw NotFoundException when file does not exist", async () => {
      // Arrange
      mockFs.access.mockRejectedValue(new Error("ENOENT"));

      // Act & Assert
      await expect(adapter.download(testKey)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should detect correct MIME type from extension", async () => {
      // Arrange
      const imageKey = "tenant/files/uuid/photo.jpg";
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({
        size: 4096,
      } as unknown as Awaited<ReturnType<typeof fs.stat>>);

      // Act
      const result = await adapter.download(imageKey);

      // Assert
      expect(result.mimeType).toBe("image/jpeg");
    });

    it("should return application/octet-stream for unknown extension", async () => {
      // Arrange
      const unknownKey = "tenant/files/uuid/data.xyz";
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({
        size: 1024,
      } as unknown as Awaited<ReturnType<typeof fs.stat>>);

      // Act
      const result = await adapter.download(unknownKey);

      // Assert
      expect(result.mimeType).toBe("application/octet-stream");
    });
  });

  // -------------------------------------------------------------------------
  // DELETE TESTS
  // -------------------------------------------------------------------------

  describe("delete()", () => {
    const testKey = "tenant-uuid-123/files/uuid-456/test.pdf";

    it("should delete file and cleanup empty directories", async () => {
      // Arrange
      mockFs.access.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      // Act
      await adapter.delete(testKey);

      // Assert
      expect(mockFs.unlink).toHaveBeenCalledWith(path.join(basePath, testKey));
    });

    it("should throw NotFoundException when file does not exist", async () => {
      // Arrange
      mockFs.access.mockRejectedValue(new Error("ENOENT"));

      // Act & Assert
      await expect(adapter.delete(testKey)).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // GET SIGNED URL TESTS
  // -------------------------------------------------------------------------

  describe("getSignedUrl()", () => {
    const testKey = "tenant-uuid-123/files/uuid-456/test.pdf";

    it("should return URL path for local storage", async () => {
      // Arrange
      mockFs.access.mockResolvedValue(undefined);

      // Act
      const result = await adapter.getSignedUrl(testKey);

      // Assert
      expect(result).toBe(`/uploads/${testKey}`);
    });

    it("should throw NotFoundException when file does not exist", async () => {
      // Arrange
      mockFs.access.mockRejectedValue(new Error("ENOENT"));

      // Act & Assert
      await expect(adapter.getSignedUrl(testKey)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // EXISTS TESTS
  // -------------------------------------------------------------------------

  describe("exists()", () => {
    const testKey = "tenant-uuid-123/files/uuid-456/test.pdf";

    it("should return true when file exists", async () => {
      // Arrange
      mockFs.access.mockResolvedValue(undefined);

      // Act
      const result = await adapter.exists(testKey);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when file does not exist", async () => {
      // Arrange
      mockFs.access.mockRejectedValue(new Error("ENOENT"));

      // Act
      const result = await adapter.exists(testKey);

      // Assert
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // MIME TYPE DETECTION TESTS
  // -------------------------------------------------------------------------

  describe("MIME type detection", () => {
    const testCases = [
      { ext: ".pdf", expected: "application/pdf" },
      { ext: ".doc", expected: "application/msword" },
      {
        ext: ".docx",
        expected:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      { ext: ".xls", expected: "application/vnd.ms-excel" },
      {
        ext: ".xlsx",
        expected:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      { ext: ".txt", expected: "text/plain" },
      { ext: ".csv", expected: "text/csv" },
      { ext: ".json", expected: "application/json" },
      { ext: ".jpg", expected: "image/jpeg" },
      { ext: ".jpeg", expected: "image/jpeg" },
      { ext: ".png", expected: "image/png" },
      { ext: ".gif", expected: "image/gif" },
      { ext: ".webp", expected: "image/webp" },
      { ext: ".svg", expected: "image/svg+xml" },
      { ext: ".mp4", expected: "video/mp4" },
      { ext: ".mp3", expected: "audio/mpeg" },
      { ext: ".zip", expected: "application/zip" },
    ];

    testCases.forEach(({ ext, expected }) => {
      it(`should detect ${ext} as ${expected}`, async () => {
        // Arrange
        const key = `tenant/files/uuid/file${ext}`;
        mockFs.access.mockResolvedValue(undefined);
        mockFs.stat.mockResolvedValue({
          size: 1024,
        } as unknown as Awaited<ReturnType<typeof fs.stat>>);

        // Act
        const result = await adapter.download(key);

        // Assert
        expect(result.mimeType).toBe(expected);
      });
    });
  });
});
