// =============================================================================
// AZURE BLOB STORAGE PROVIDER - Production file storage
// =============================================================================
//
// This provider implements the StorageProvider interface using Azure Blob Storage.
// Each organization gets its own container for tenant isolation.
//
// CONTAINER NAMING:
// {prefix}-org-{organizationId} (e.g., 'ethico-org-abc123')
//
// SIGNED URLs:
// Uses SAS tokens with configurable expiration for secure downloads.
// =============================================================================

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";
import {
  StorageProvider,
  UploadFileParams,
  UploadFileResult,
  GetSignedUrlParams,
  FileOperationParams,
} from "./storage-provider.interface";

@Injectable()
export class AzureBlobProvider implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(AzureBlobProvider.name);
  private blobServiceClient: BlobServiceClient | null = null;
  private sharedKeyCredential: StorageSharedKeyCredential | null = null;
  private containerPrefix: string = "ethico";
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize Azure Blob Storage client on module init.
   * Uses account name and key for authentication.
   */
  onModuleInit(): void {
    const accountName = this.configService.get<string>(
      "storage.azure.accountName",
    );
    const accountKey = this.configService.get<string>(
      "storage.azure.accountKey",
    );
    this.containerPrefix =
      this.configService.get<string>("storage.azure.containerPrefix") ||
      "ethico";

    if (!accountName || !accountKey) {
      this.logger.warn(
        "Azure Storage credentials not configured - provider will not be functional",
      );
      return;
    }

    try {
      this.sharedKeyCredential = new StorageSharedKeyCredential(
        accountName,
        accountKey,
      );
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        this.sharedKeyCredential,
      );
      this.isInitialized = true;
      this.logger.log(
        `Azure Blob Storage provider initialized (account: ${accountName})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize Azure Blob Storage: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get container name for an organization.
   * Format: {prefix}-org-{organizationId}
   * Container names must be lowercase and between 3-63 characters.
   */
  private getContainerName(organizationId: string): string {
    // Azure container names: lowercase letters, numbers, hyphens only
    // Must be 3-63 characters, start with letter or number
    const sanitizedOrgId = organizationId
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    return `${this.containerPrefix}-org-${sanitizedOrgId}`.substring(0, 63);
  }

  /**
   * Get or create a container for the organization.
   * Creates the container if it doesn't exist.
   */
  private async getContainer(organizationId: string): Promise<ContainerClient> {
    if (!this.blobServiceClient) {
      throw new Error("Azure Blob Storage is not initialized");
    }

    const containerName = this.getContainerName(organizationId);
    const container = this.blobServiceClient.getContainerClient(containerName);

    // Create container if it doesn't exist (private access by default)
    await container.createIfNotExists();

    return container;
  }

  /**
   * Verify provider is initialized before operations.
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.blobServiceClient) {
      throw new Error(
        "Azure Blob Storage is not initialized. Check configuration.",
      );
    }
  }

  /**
   * Upload a file to Azure Blob Storage.
   *
   * @param params - Upload parameters with tenant context
   * @returns Upload result with storage key and URL
   */
  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    this.ensureInitialized();

    const container = await this.getContainer(params.organizationId);
    const blob = container.getBlockBlobClient(params.path);

    await blob.upload(params.content, params.content.length, {
      blobHTTPHeaders: { blobContentType: params.contentType },
      metadata: params.metadata
        ? Object.fromEntries(
            Object.entries(params.metadata).map(([k, v]) => [
              k.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
              v,
            ]),
          )
        : undefined,
    });

    this.logger.debug(
      `File uploaded to Azure: ${params.path} (${params.content.length} bytes)`,
    );

    return {
      key: params.path,
      url: blob.url,
      size: params.content.length,
    };
  }

  /**
   * Generate a SAS token URL for secure, time-limited download.
   *
   * @param params - Signed URL parameters
   * @returns SAS URL with expiration
   */
  async getSignedUrl(params: GetSignedUrlParams): Promise<string> {
    this.ensureInitialized();

    if (!this.sharedKeyCredential) {
      throw new Error("Shared key credential not initialized");
    }

    const container = await this.getContainer(params.organizationId);
    const blob = container.getBlockBlobClient(params.path);

    const expiresOn = new Date();
    expiresOn.setMinutes(
      expiresOn.getMinutes() + (params.expiresInMinutes || 15),
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.getContainerName(params.organizationId),
        blobName: params.path,
        permissions: BlobSASPermissions.parse("r"),
        startsOn: new Date(),
        expiresOn,
      },
      this.sharedKeyCredential,
    ).toString();

    return `${blob.url}?${sasToken}`;
  }

  /**
   * Delete a file from Azure Blob Storage.
   *
   * @param params - File operation parameters
   */
  async deleteFile(params: FileOperationParams): Promise<void> {
    this.ensureInitialized();

    const container = await this.getContainer(params.organizationId);
    const blob = container.getBlockBlobClient(params.path);

    await blob.deleteIfExists();
    this.logger.debug(`File deleted from Azure: ${params.path}`);
  }

  /**
   * Check if a file exists in Azure Blob Storage.
   *
   * @param params - File operation parameters
   * @returns true if file exists
   */
  async fileExists(params: FileOperationParams): Promise<boolean> {
    this.ensureInitialized();

    const container = await this.getContainer(params.organizationId);
    const blob = container.getBlockBlobClient(params.path);

    return blob.exists();
  }

  /**
   * Download file content from Azure Blob Storage.
   *
   * @param params - File operation parameters
   * @returns File content as Buffer
   */
  async downloadFile(params: FileOperationParams): Promise<Buffer> {
    this.ensureInitialized();

    const container = await this.getContainer(params.organizationId);
    const blob = container.getBlockBlobClient(params.path);

    return blob.downloadToBuffer();
  }
}
