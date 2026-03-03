import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { AttachmentsService } from "./attachments.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../../common/services/storage.service";
import { ActivityService } from "../../common/services/activity.service";
import { AttachmentEntityType } from "@prisma/client";

describe("AttachmentsService", () => {
  let service: AttachmentsService;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockAttachmentId = "attachment-test-123";
  const mockEntityId = "case-test-123";

  const mockAttachment = {
    id: mockAttachmentId,
    organizationId: mockOrgId,
    entityType: AttachmentEntityType.CASE,
    entityId: mockEntityId,
    fileName: "evidence.pdf",
    fileKey: "attachments/case/evidence.pdf",
    mimeType: "application/pdf",
    fileSize: 1024,
    description: null,
    isEvidence: false,
    uploadedById: mockUserId,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    uploadedBy: {
      id: mockUserId,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
    },
  };

  const mockFile = {
    originalname: "evidence.pdf",
    mimetype: "application/pdf",
    size: 1024,
    buffer: Buffer.from("test"),
  };

  const mockPrisma = {
    attachment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    case: {
      findFirst: jest.fn(),
    },
    investigation: {
      findFirst: jest.fn(),
    },
    investigationNote: {
      findFirst: jest.fn(),
    },
  };

  const mockStorageService = {
    upload: jest.fn(),
    getSignedUrl: jest.fn(),
    delete: jest.fn(),
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    service = module.get<AttachmentsService>(AttachmentsService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    const mockCreateDto = {
      entityType: AttachmentEntityType.CASE,
      entityId: mockEntityId,
      description: "Test attachment",
      isEvidence: false,
    };

    it("should create attachment with correct organizationId", async () => {
      mockPrisma.case.findFirst.mockResolvedValue({
        id: mockEntityId,
        referenceNumber: "ETH-2026-00001",
      });
      mockStorageService.upload.mockResolvedValue({
        key: "attachments/case/evidence.pdf",
      });
      mockPrisma.attachment.create.mockResolvedValue(mockAttachment);
      mockStorageService.getSignedUrl.mockResolvedValue(
        "https://storage.example.com/signed-url",
      );
      mockActivityService.log.mockResolvedValue(undefined);

      const result = await service.create(
        mockFile as any,
        mockCreateDto,
        mockUserId,
        mockOrgId,
      );

      expect(mockPrisma.attachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId,
            entityType: AttachmentEntityType.CASE,
            entityId: mockEntityId,
          }),
        }),
      );
      expect(result.fileName).toBe("evidence.pdf");
    });

    it("should throw NotFoundException when parent case does not exist", async () => {
      mockPrisma.case.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockFile as any, mockCreateDto, mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should log activity twice (on attachment and parent entity)", async () => {
      mockPrisma.case.findFirst.mockResolvedValue({
        id: mockEntityId,
        referenceNumber: "ETH-2026-00001",
      });
      mockStorageService.upload.mockResolvedValue({
        key: "attachments/case/evidence.pdf",
      });
      mockPrisma.attachment.create.mockResolvedValue(mockAttachment);
      mockStorageService.getSignedUrl.mockResolvedValue(
        "https://storage.example.com/signed-url",
      );
      mockActivityService.log.mockResolvedValue(undefined);

      await service.create(
        mockFile as any,
        mockCreateDto,
        mockUserId,
        mockOrgId,
      );

      expect(mockActivityService.log).toHaveBeenCalledTimes(2);
    });

    it("should generate a signed URL for the uploaded file", async () => {
      mockPrisma.case.findFirst.mockResolvedValue({
        id: mockEntityId,
        referenceNumber: "ETH-2026-00001",
      });
      mockStorageService.upload.mockResolvedValue({
        key: "attachments/case/evidence.pdf",
      });
      mockPrisma.attachment.create.mockResolvedValue(mockAttachment);
      mockStorageService.getSignedUrl.mockResolvedValue(
        "https://storage.example.com/signed-url",
      );
      mockActivityService.log.mockResolvedValue(undefined);

      const result = await service.create(
        mockFile as any,
        mockCreateDto,
        mockUserId,
        mockOrgId,
      );

      expect(mockStorageService.getSignedUrl).toHaveBeenCalled();
      expect(result.downloadUrl).toBe("https://storage.example.com/signed-url");
    });
  });

  describe("findOne", () => {
    it("should return attachment with download URL", async () => {
      mockPrisma.attachment.findFirst.mockResolvedValue(mockAttachment);
      mockStorageService.getSignedUrl.mockResolvedValue(
        "https://storage.example.com/signed",
      );

      const result = await service.findOne(mockAttachmentId, mockOrgId);

      expect(result.id).toBe(mockAttachmentId);
      expect(result.downloadUrl).toBe("https://storage.example.com/signed");
      expect(mockPrisma.attachment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockAttachmentId,
            organizationId: mockOrgId,
          }),
        }),
      );
    });

    it("should throw NotFoundException when attachment not found", async () => {
      mockPrisma.attachment.findFirst.mockResolvedValue(null);

      await expect(service.findOne("non-existent", mockOrgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException for cross-tenant access (returns null)", async () => {
      mockPrisma.attachment.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockAttachmentId, "other-org"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByEntity", () => {
    it("should return paginated attachments for an entity filtered by org", async () => {
      mockPrisma.attachment.findMany.mockResolvedValue([mockAttachment]);
      mockPrisma.attachment.count.mockResolvedValue(1);
      mockStorageService.getSignedUrl.mockResolvedValue(
        "https://storage.example.com/signed",
      );

      const result = await service.findByEntity(
        AttachmentEntityType.CASE,
        mockEntityId,
        mockOrgId,
      );

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mockPrisma.attachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
            entityType: AttachmentEntityType.CASE,
            entityId: mockEntityId,
          }),
        }),
      );
    });

    it("should filter by isEvidence when specified", async () => {
      mockPrisma.attachment.findMany.mockResolvedValue([]);
      mockPrisma.attachment.count.mockResolvedValue(0);

      await service.findByEntity(
        AttachmentEntityType.CASE,
        mockEntityId,
        mockOrgId,
        { isEvidence: true },
      );

      expect(mockPrisma.attachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isEvidence: true,
          }),
        }),
      );
    });
  });

  describe("delete", () => {
    it("should delete attachment from storage and database", async () => {
      mockPrisma.attachment.findFirst.mockResolvedValue(mockAttachment);
      mockStorageService.delete.mockResolvedValue(undefined);
      mockPrisma.attachment.delete.mockResolvedValue(mockAttachment);
      mockActivityService.log.mockResolvedValue(undefined);

      await service.delete(mockAttachmentId, mockUserId, mockOrgId);

      expect(mockStorageService.delete).toHaveBeenCalledWith(
        mockAttachment.fileKey,
      );
      expect(mockPrisma.attachment.delete).toHaveBeenCalledWith({
        where: { id: mockAttachmentId },
      });
    });

    it("should throw NotFoundException when attachment not found", async () => {
      mockPrisma.attachment.findFirst.mockResolvedValue(null);

      await expect(
        service.delete("non-existent", mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw InternalServerErrorException when storage deletion fails", async () => {
      mockPrisma.attachment.findFirst.mockResolvedValue(mockAttachment);
      mockStorageService.delete.mockRejectedValue(
        new Error("Storage connection error"),
      );

      await expect(
        service.delete(mockAttachmentId, mockUserId, mockOrgId),
      ).rejects.toThrow(InternalServerErrorException);

      // Should NOT have deleted the DB record
      expect(mockPrisma.attachment.delete).not.toHaveBeenCalled();
    });

    it("should proceed with DB deletion when file is already missing from storage", async () => {
      mockPrisma.attachment.findFirst.mockResolvedValue(mockAttachment);
      mockStorageService.delete.mockRejectedValue(
        new NotFoundException("File not found"),
      );
      mockPrisma.attachment.delete.mockResolvedValue(mockAttachment);
      mockActivityService.log.mockResolvedValue(undefined);

      // Should NOT throw since the file was already gone
      await service.delete(mockAttachmentId, mockUserId, mockOrgId);

      expect(mockPrisma.attachment.delete).toHaveBeenCalled();
    });
  });
});
