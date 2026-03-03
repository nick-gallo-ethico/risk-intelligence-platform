import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import { LocalStorageProvider } from "./local-storage.provider";

// Mock fs/promises
jest.mock("fs/promises", () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  access: jest.fn(),
  readFile: jest.fn(),
  readdir: jest.fn(),
  rmdir: jest.fn(),
}));

jest.mock("path", () => ({
  ...jest.requireActual("path"),
  join: (...parts: string[]) => parts.join("/"),
  dirname: (p: string) => p.substring(0, p.lastIndexOf("/")) || ".",
}));

describe("LocalStorageProvider", () => {
  let provider: LocalStorageProvider;
  let fs: jest.Mocked<typeof import("fs/promises")>;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultVal?: unknown) => {
      if (key === "storage.provider") return "local";
      if (key === "storage.local.basePath") return "./uploads";
      return defaultVal;
    }),
  };

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    fs = require("fs/promises") as jest.Mocked<typeof import("fs/promises")>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<LocalStorageProvider>(LocalStorageProvider);
    jest.clearAllMocks();
  });

  describe("uploadFile", () => {
    it("should write file and return key and URL", async () => {
      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);

      const content = Buffer.from("test content");
      const result = await provider.uploadFile({
        organizationId: "org-123",
        path: "cases/case-1/file.txt",
        content,
        contentType: "text/plain",
      });

      expect(fs.writeFile).toHaveBeenCalled();
      expect(result.key).toBe("cases/case-1/file.txt");
      expect(result.url).toContain("org-123");
      expect(result.size).toBe(content.length);
    });

    it("should write metadata sidecar when metadata provided", async () => {
      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);

      await provider.uploadFile({
        organizationId: "org-123",
        path: "file.txt",
        content: Buffer.from("content"),
        contentType: "text/plain",
        metadata: { entityType: "CASE", entityId: "case-1" },
      });

      // writeFile called twice: once for file, once for metadata
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
    });
  });

  describe("getSignedUrl", () => {
    it("should return direct URL when file exists", async () => {
      fs.access.mockResolvedValue(undefined);

      const url = await provider.getSignedUrl({
        organizationId: "org-123",
        path: "cases/case-1/file.txt",
        expiresInMinutes: 15,
      });

      expect(url).toContain("org-123");
      expect(url).toContain("cases/case-1/file.txt");
    });

    it("should throw NotFoundException when file does not exist", async () => {
      const enoentError = Object.assign(new Error("ENOENT"), {
        code: "ENOENT",
      });
      fs.access.mockRejectedValue(enoentError);

      await expect(
        provider.getSignedUrl({
          organizationId: "org-123",
          path: "nonexistent.txt",
          expiresInMinutes: 15,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("fileExists", () => {
    it("should return true when file exists", async () => {
      fs.access.mockResolvedValue(undefined);

      const result = await provider.fileExists({
        organizationId: "org-123",
        path: "file.txt",
      });

      expect(result).toBe(true);
    });

    it("should return false when file does not exist", async () => {
      fs.access.mockRejectedValue(new Error("ENOENT"));

      const result = await provider.fileExists({
        organizationId: "org-123",
        path: "nonexistent.txt",
      });

      expect(result).toBe(false);
    });
  });

  describe("downloadFile", () => {
    it("should return file content as Buffer", async () => {
      const fileContent = Buffer.from("file contents");
      fs.readFile.mockResolvedValue(fileContent);

      const result = await provider.downloadFile({
        organizationId: "org-123",
        path: "file.txt",
      });

      expect(result).toEqual(fileContent);
    });

    it("should throw NotFoundException when file not found", async () => {
      const enoentError = Object.assign(new Error("ENOENT"), {
        code: "ENOENT",
      });
      fs.readFile.mockRejectedValue(enoentError);

      await expect(
        provider.downloadFile({
          organizationId: "org-123",
          path: "nonexistent.txt",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteFile", () => {
    it("should delete file and metadata sidecar", async () => {
      fs.unlink.mockResolvedValue(undefined);
      fs.readdir.mockResolvedValue([]);
      fs.rmdir.mockResolvedValue(undefined);

      await provider.deleteFile({
        organizationId: "org-123",
        path: "file.txt",
      });

      expect(fs.unlink).toHaveBeenCalled();
    });

    it("should not throw when file does not exist (ENOENT)", async () => {
      const enoentError = Object.assign(new Error("ENOENT"), {
        code: "ENOENT",
      });
      fs.unlink.mockRejectedValue(enoentError);

      await expect(
        provider.deleteFile({
          organizationId: "org-123",
          path: "nonexistent.txt",
        }),
      ).resolves.not.toThrow();
    });
  });
});
