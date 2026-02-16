/**
 * UNIT TESTS: DomainService
 *
 * Tests for tenant domain management and organization routing.
 * Key behaviors:
 * - Find organization by verified email domain (cross-tenant lookup)
 * - Add domain with verification token generation
 * - Verify domain via DNS TXT record
 * - Remove domain from organization
 * - Set primary domain for organization
 */

import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { DomainService } from "./domain.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { DomainVerificationService } from "./domain-verification.service";

describe("DomainService", () => {
  let service: DomainService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;
  let verificationService: jest.Mocked<DomainVerificationService>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockDomainId = "domain-test-123";

  const mockOrganization = {
    id: mockOrgId,
    name: "Test Organization",
    slug: "test-org",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDomain = {
    id: mockDomainId,
    domain: "company.com",
    organizationId: mockOrgId,
    verified: true,
    verifiedAt: new Date(),
    verificationToken: "ethico-verify-abc123",
    verificationMethod: "DNS_TXT",
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUnverifiedDomain = {
    ...mockDomain,
    id: "domain-unverified-123",
    verified: false,
    verifiedAt: null,
    isPrimary: false,
  };

  // Mock Setup
  const mockPrismaService = {
    tenantDomain: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockVerificationService = {
    generateVerificationToken: jest.fn(),
    getVerificationInstructions: jest.fn(),
    verifyDnsTxtRecord: jest.fn(),
  };

  // Module Setup
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        {
          provide: DomainVerificationService,
          useValue: mockVerificationService,
        },
      ],
    }).compile();

    service = module.get<DomainService>(DomainService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
    verificationService = module.get(DomainVerificationService);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default mock implementations
    mockVerificationService.generateVerificationToken.mockReturnValue(
      "new-verify-token-xyz",
    );
    mockVerificationService.getVerificationInstructions.mockReturnValue({
      recordType: "TXT",
      recordName: "_ethico-verify.company.com",
      recordValue: "ethico-verify=new-verify-token-xyz",
      instructions: "Add TXT record...",
    });
  });

  // describe('findOrganizationByEmailDomain') - Cross-tenant lookup
  describe("findOrganizationByEmailDomain", () => {
    it("should return organization for verified domain", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue({
        ...mockDomain,
        organization: mockOrganization,
      });

      // Act
      const result =
        await service.findOrganizationByEmailDomain("user@company.com");

      // Assert
      expect(result).toEqual(mockOrganization);
      expect(prisma.tenantDomain.findFirst).toHaveBeenCalledWith({
        where: {
          domain: "company.com",
          verified: true,
        },
        include: {
          organization: true,
        },
      });
    });

    it("should return null for unverified domain", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.findOrganizationByEmailDomain(
        "user@unverified.com",
      );

      // Assert
      expect(result).toBeNull();
    });

    it("should return null for unknown domain", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(null);

      // Act
      const result =
        await service.findOrganizationByEmailDomain("user@unknown.com");

      // Assert
      expect(result).toBeNull();
    });

    it("should extract domain correctly from email", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(null);

      // Act
      await service.findOrganizationByEmailDomain("User@SubDomain.Company.COM");

      // Assert - Domain should be lowercase extracted
      expect(prisma.tenantDomain.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            domain: "subdomain.company.com",
          }),
        }),
      );
    });

    it("should return null for invalid email without domain", async () => {
      // Arrange - No @ in email
      const result =
        await service.findOrganizationByEmailDomain("invalidemail");

      // Assert
      expect(result).toBeNull();
      expect(prisma.tenantDomain.findFirst).not.toHaveBeenCalled();
    });
  });

  // describe('getDomainsForOrganization') - List domains
  describe("getDomainsForOrganization", () => {
    it("should return all domains for organization", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findMany.mockResolvedValue([
        mockDomain,
        mockUnverifiedDomain,
      ]);

      // Act
      const result = await service.getDomainsForOrganization(mockOrgId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].domain).toBe("company.com");
      expect(prisma.tenantDomain.findMany).toHaveBeenCalledWith({
        where: { organizationId: mockOrgId },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      });
    });

    it("should include verification instructions for unverified domains", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findMany.mockResolvedValue([
        mockUnverifiedDomain,
      ]);

      // Act
      const result = await service.getDomainsForOrganization(mockOrgId);

      // Assert
      expect(result[0].verificationInstructions).toBeDefined();
      expect(result[0].verificationInstructions?.recordType).toBe("TXT");
    });

    it("should not include verification instructions for verified domains", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findMany.mockResolvedValue([mockDomain]);

      // Act
      const result = await service.getDomainsForOrganization(mockOrgId);

      // Assert
      expect(result[0].verificationInstructions).toBeUndefined();
    });
  });

  // describe('addDomain') - Add new domain
  describe("addDomain", () => {
    it("should create domain with verification token", async () => {
      // Arrange
      const addDomainDto = { domain: "newdomain.com", isPrimary: false };
      mockPrismaService.tenantDomain.findUnique.mockResolvedValue(null);
      mockPrismaService.tenantDomain.create.mockResolvedValue({
        ...mockUnverifiedDomain,
        domain: "newdomain.com",
        verificationToken: "new-verify-token-xyz",
      });

      // Act
      const result = await service.addDomain(
        mockOrgId,
        addDomainDto,
        mockUserId,
      );

      // Assert
      expect(result.domain).toBe("newdomain.com");
      expect(result.verified).toBe(false);
      expect(verificationService.generateVerificationToken).toHaveBeenCalled();
      expect(prisma.tenantDomain.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId,
          domain: "newdomain.com",
          verificationToken: "new-verify-token-xyz",
          verificationMethod: "DNS_TXT",
          isPrimary: false,
        }),
      });
    });

    it("should normalize domain to lowercase", async () => {
      // Arrange
      const addDomainDto = { domain: "NewDomain.COM" };
      mockPrismaService.tenantDomain.findUnique.mockResolvedValue(null);
      mockPrismaService.tenantDomain.create.mockResolvedValue(
        mockUnverifiedDomain,
      );

      // Act
      await service.addDomain(mockOrgId, addDomainDto, mockUserId);

      // Assert
      expect(prisma.tenantDomain.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          domain: "newdomain.com",
        }),
      });
    });

    it("should throw ConflictException if domain already in same org", async () => {
      // Arrange
      const addDomainDto = { domain: "company.com" };
      mockPrismaService.tenantDomain.findUnique.mockResolvedValue(mockDomain);

      // Act & Assert
      await expect(
        service.addDomain(mockOrgId, addDomainDto, mockUserId),
      ).rejects.toThrow(
        new ConflictException("Domain already added to your organization"),
      );
    });

    it("should throw ConflictException if domain claimed by another org", async () => {
      // Arrange
      const addDomainDto = { domain: "company.com" };
      mockPrismaService.tenantDomain.findUnique.mockResolvedValue({
        ...mockDomain,
        organizationId: "other-org-id",
      });

      // Act & Assert
      await expect(
        service.addDomain(mockOrgId, addDomainDto, mockUserId),
      ).rejects.toThrow(
        new ConflictException(
          "Domain is already claimed by another organization",
        ),
      );
    });

    it("should log audit event on domain add", async () => {
      // Arrange
      const addDomainDto = { domain: "newdomain.com" };
      mockPrismaService.tenantDomain.findUnique.mockResolvedValue(null);
      mockPrismaService.tenantDomain.create.mockResolvedValue(
        mockUnverifiedDomain,
      );

      // Act
      await service.addDomain(mockOrgId, addDomainDto, mockUserId);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DOMAIN_ADDED",
          organizationId: mockOrgId,
          actorUserId: mockUserId,
        }),
      );
    });

    it("should unset existing primary when adding new primary domain", async () => {
      // Arrange
      const addDomainDto = { domain: "newdomain.com", isPrimary: true };
      mockPrismaService.tenantDomain.findUnique.mockResolvedValue(null);
      mockPrismaService.tenantDomain.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.tenantDomain.create.mockResolvedValue({
        ...mockUnverifiedDomain,
        isPrimary: true,
      });

      // Act
      await service.addDomain(mockOrgId, addDomainDto, mockUserId);

      // Assert
      expect(prisma.tenantDomain.updateMany).toHaveBeenCalledWith({
        where: { organizationId: mockOrgId, isPrimary: true },
        data: { isPrimary: false },
      });
    });
  });

  // describe('verifyDomain') - DNS verification flow
  describe("verifyDomain", () => {
    it("should mark domain as verified when TXT record matches", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(
        mockUnverifiedDomain,
      );
      mockVerificationService.verifyDnsTxtRecord.mockResolvedValue(true);
      mockPrismaService.tenantDomain.update.mockResolvedValue({
        ...mockUnverifiedDomain,
        verified: true,
        verifiedAt: new Date(),
      });

      // Act
      const result = await service.verifyDomain(
        mockOrgId,
        mockUnverifiedDomain.id,
        mockUserId,
      );

      // Assert
      expect(result.verified).toBe(true);
      expect(result.message).toContain("verified successfully");
      expect(prisma.tenantDomain.update).toHaveBeenCalledWith({
        where: { id: mockUnverifiedDomain.id },
        data: {
          verified: true,
          verifiedAt: expect.any(Date),
        },
      });
    });

    it("should return false when TXT record not found", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(
        mockUnverifiedDomain,
      );
      mockVerificationService.verifyDnsTxtRecord.mockResolvedValue(false);

      // Act
      const result = await service.verifyDomain(
        mockOrgId,
        mockUnverifiedDomain.id,
        mockUserId,
      );

      // Assert
      expect(result.verified).toBe(false);
      expect(result.message).toContain("DNS TXT record not found");
      expect(prisma.tenantDomain.update).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if domain not found", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.verifyDomain(mockOrgId, "non-existent-domain", mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return already verified message if domain verified", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(mockDomain);

      // Act
      const result = await service.verifyDomain(
        mockOrgId,
        mockDomainId,
        mockUserId,
      );

      // Assert
      expect(result.verified).toBe(true);
      expect(result.message).toContain("already verified");
    });

    it("should log audit event on successful verification", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(
        mockUnverifiedDomain,
      );
      mockVerificationService.verifyDnsTxtRecord.mockResolvedValue(true);
      mockPrismaService.tenantDomain.update.mockResolvedValue(mockDomain);

      // Act
      await service.verifyDomain(
        mockOrgId,
        mockUnverifiedDomain.id,
        mockUserId,
      );

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DOMAIN_VERIFIED",
          organizationId: mockOrgId,
          actorUserId: mockUserId,
        }),
      );
    });
  });

  // describe('removeDomain') - Delete domain
  describe("removeDomain", () => {
    it("should delete domain from organization", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(mockDomain);
      mockPrismaService.tenantDomain.delete.mockResolvedValue(mockDomain);

      // Act
      await service.removeDomain(mockOrgId, mockDomainId, mockUserId);

      // Assert
      expect(prisma.tenantDomain.delete).toHaveBeenCalledWith({
        where: { id: mockDomainId },
      });
    });

    it("should throw NotFoundException if domain not found", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removeDomain(mockOrgId, "non-existent-domain", mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if domain belongs to different org", async () => {
      // Arrange - Domain exists but query finds nothing (org filter)
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removeDomain("different-org", mockDomainId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should log audit event on domain removal", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(mockDomain);
      mockPrismaService.tenantDomain.delete.mockResolvedValue(mockDomain);

      // Act
      await service.removeDomain(mockOrgId, mockDomainId, mockUserId);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DOMAIN_REMOVED",
          organizationId: mockOrgId,
          actorUserId: mockUserId,
        }),
      );
    });
  });

  // describe('setPrimaryDomain') - Set primary domain
  describe("setPrimaryDomain", () => {
    it("should set verified domain as primary", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(mockDomain);
      mockPrismaService.tenantDomain.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.tenantDomain.update.mockResolvedValue({
        ...mockDomain,
        isPrimary: true,
      });

      // Act
      await service.setPrimaryDomain(mockOrgId, mockDomainId, mockUserId);

      // Assert
      // First unset existing primary
      expect(prisma.tenantDomain.updateMany).toHaveBeenCalledWith({
        where: { organizationId: mockOrgId, isPrimary: true },
        data: { isPrimary: false },
      });
      // Then set new primary
      expect(prisma.tenantDomain.update).toHaveBeenCalledWith({
        where: { id: mockDomainId },
        data: { isPrimary: true },
      });
    });

    it("should throw NotFoundException if domain not found", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.setPrimaryDomain(mockOrgId, "non-existent-domain", mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if domain not verified", async () => {
      // Arrange - Query filters for verified: true, so returns null
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.setPrimaryDomain(
          mockOrgId,
          mockUnverifiedDomain.id,
          mockUserId,
        ),
      ).rejects.toThrow(
        new NotFoundException("Domain not found or not verified"),
      );
    });

    it("should log audit event on primary domain change", async () => {
      // Arrange
      mockPrismaService.tenantDomain.findFirst.mockResolvedValue(mockDomain);
      mockPrismaService.tenantDomain.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.tenantDomain.update.mockResolvedValue(mockDomain);

      // Act
      await service.setPrimaryDomain(mockOrgId, mockDomainId, mockUserId);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "PRIMARY_DOMAIN_SET",
          organizationId: mockOrgId,
          actorUserId: mockUserId,
        }),
      );
    });
  });
});
