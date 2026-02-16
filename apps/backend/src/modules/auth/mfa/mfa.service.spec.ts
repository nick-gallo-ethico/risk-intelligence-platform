/**
 * MfaService Unit Tests
 *
 * Tests for multi-factor authentication service covering:
 * - MFA setup initiation (TOTP secret and QR code generation)
 * - TOTP verification and MFA enabling
 * - MFA verification during login (TOTP and recovery codes)
 * - MFA disabling with TOTP verification
 * - Recovery code regeneration
 * - MFA status checking
 */

import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { MfaService } from "./mfa.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { RecoveryCodesService } from "./recovery-codes.service";

// Mock otplib with TOTP class pattern
const mockTotpInstance = {
  generateSecret: jest.fn().mockReturnValue("MOCKSECRET123456"),
  verify: jest.fn(),
  toURI: jest.fn().mockReturnValue("otpauth://totp/..."),
};

jest.mock("otplib", () => ({
  TOTP: jest.fn().mockImplementation(() => mockTotpInstance),
  NobleCryptoPlugin: jest.fn(),
  ScureBase32Plugin: jest.fn(),
}));

// Mock qrcode
jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,mockQrCode"),
}));

describe("MfaService", () => {
  let service: MfaService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;
  let recoveryCodesService: jest.Mocked<RecoveryCodesService>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockEmail = "test@example.com";
  const mockTotpCode = "123456";
  const mockSecret = "MOCKSECRET123456";

  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    firstName: "Test",
    lastName: "User",
    organizationId: mockOrgId,
    mfaEnabled: false,
    mfaSecret: null,
    mfaVerifiedAt: null,
    mfaRecoveryCodes: [],
  };

  const mockUserWithMfa = {
    ...mockUser,
    mfaEnabled: true,
    mfaSecret: mockSecret,
    mfaVerifiedAt: new Date(),
    mfaRecoveryCodes: ["hashedcode1", "hashedcode2", "hashedcode3"],
  };

  const mockUserWithPendingMfa = {
    ...mockUser,
    mfaEnabled: false,
    mfaSecret: mockSecret, // Secret stored but MFA not yet enabled
  };

  const mockRecoveryCodes = [
    "ABCD1234",
    "EFGH5678",
    "IJKL9012",
    "MNOP3456",
    "QRST7890",
    "UVWX1234",
    "YZAB5678",
    "CDEF9012",
    "GHIJ3456",
    "KLMN7890",
  ];

  const mockHashedCodes = mockRecoveryCodes.map((code) => `hashed_${code}`);

  // Mock Setup
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockRecoveryCodesService = {
    generateRecoveryCodes: jest.fn().mockReturnValue(mockRecoveryCodes),
    hashRecoveryCodes: jest.fn().mockReturnValue(mockHashedCodes),
    verifyRecoveryCode: jest.fn(),
  };

  // Module Setup
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: RecoveryCodesService, useValue: mockRecoveryCodesService },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
    recoveryCodesService = module.get(RecoveryCodesService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // describe('initiateMfaSetup') - MFA setup initiation
  describe("initiateMfaSetup", () => {
    it("should generate secret and return QR code data URL", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        mfaSecret: mockSecret,
      });

      // Act
      const result = await service.initiateMfaSetup(mockUserId);

      // Assert
      expect(result).toHaveProperty("secret");
      expect(result).toHaveProperty("qrCode");
      expect(result).toHaveProperty("otpAuthUrl");
      expect(result.qrCode).toContain("data:image/png;base64");
    });

    it("should store pending MFA secret on user", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        mfaSecret: mockSecret,
      });

      // Act
      await service.initiateMfaSetup(mockUserId);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaSecret: expect.any(String),
          mfaEnabled: false,
        },
      });
    });

    it("should throw if user already has MFA enabled", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );

      // Act & Assert
      await expect(service.initiateMfaSetup(mockUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.initiateMfaSetup(mockUserId)).rejects.toThrow(
        "MFA is already enabled",
      );
    });
  });

  // describe('verifyAndEnableMfa') - Enable MFA after verification
  describe("verifyAndEnableMfa", () => {
    it("should enable MFA when TOTP code is valid", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithPendingMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: true });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUserWithPendingMfa,
        mfaEnabled: true,
        mfaVerifiedAt: new Date(),
      });

      // Act
      const result = await service.verifyAndEnableMfa(mockUserId, mockTotpCode);

      // Assert
      expect(result.recoveryCodes).toHaveLength(10);
      expect(result.message).toContain("MFA enabled");
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaEnabled: true,
          mfaVerifiedAt: expect.any(Date),
          mfaRecoveryCodes: mockHashedCodes,
        },
      });
    });

    it("should throw BadRequestException when TOTP code is invalid", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithPendingMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: false });

      // Act & Assert
      await expect(
        service.verifyAndEnableMfa(mockUserId, "000000"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw BadRequestException when no pending secret", async () => {
      // Arrange - User without pending secret
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.verifyAndEnableMfa(mockUserId, mockTotpCode),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verifyAndEnableMfa(mockUserId, mockTotpCode),
      ).rejects.toThrow("MFA setup not initiated");
    });

    it("should throw BadRequestException if MFA already enabled", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );

      // Act & Assert
      await expect(
        service.verifyAndEnableMfa(mockUserId, mockTotpCode),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verifyAndEnableMfa(mockUserId, mockTotpCode),
      ).rejects.toThrow("MFA is already enabled");
    });

    it("should generate recovery codes on enable", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithPendingMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: true });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUserWithPendingMfa,
        mfaEnabled: true,
      });

      // Act
      const result = await service.verifyAndEnableMfa(mockUserId, mockTotpCode);

      // Assert
      expect(mockRecoveryCodesService.generateRecoveryCodes).toHaveBeenCalled();
      expect(mockRecoveryCodesService.hashRecoveryCodes).toHaveBeenCalledWith(
        mockRecoveryCodes,
      );
      expect(result.recoveryCodes).toEqual(mockRecoveryCodes);
    });

    it("should log MFA_ENABLED audit event", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithPendingMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: true });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUserWithPendingMfa,
        mfaEnabled: true,
      });

      // Act
      await service.verifyAndEnableMfa(mockUserId, mockTotpCode);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MFA_ENABLED",
          entityType: "USER",
          entityId: mockUserId,
        }),
      );
    });
  });

  // describe('verifyMfa') - MFA verification during login
  describe("verifyMfa", () => {
    it("should return true for valid TOTP code", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: true });

      // Act
      const result = await service.verifyMfa(mockUserId, mockTotpCode);

      // Assert
      expect(result.verified).toBe(true);
    });

    it("should verify recovery code when TOTP fails", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: false });
      mockRecoveryCodesService.verifyRecoveryCode.mockReturnValue(0); // First code matches

      mockPrismaService.user.update.mockResolvedValue({
        ...mockUserWithMfa,
        mfaRecoveryCodes: mockUserWithMfa.mfaRecoveryCodes.slice(1),
      });

      // Act
      const result = await service.verifyMfa(mockUserId, "ABCD1234");

      // Assert
      expect(result.verified).toBe(true);
      expect(result.remainingRecoveryCodes).toBeDefined();
    });

    it("should throw UnauthorizedException for invalid code", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: false });
      mockRecoveryCodesService.verifyRecoveryCode.mockReturnValue(-1); // No match

      // Act & Assert
      await expect(service.verifyMfa(mockUserId, "000000")).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyMfa(mockUserId, "000000")).rejects.toThrow(
        "Invalid MFA code",
      );
    });

    it("should throw if MFA not enabled", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.verifyMfa(mockUserId, mockTotpCode)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyMfa(mockUserId, mockTotpCode)).rejects.toThrow(
        "MFA is not enabled",
      );
    });

    it("should remove used recovery code", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: false });
      mockRecoveryCodesService.verifyRecoveryCode.mockReturnValue(1); // Second code matches

      mockPrismaService.user.update.mockResolvedValue({
        ...mockUserWithMfa,
        mfaRecoveryCodes: ["hashedcode1", "hashedcode3"], // Code at index 1 removed
      });

      // Act
      await service.verifyMfa(mockUserId, "RECOVERY123");

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaRecoveryCodes: expect.arrayContaining([
            "hashedcode1",
            "hashedcode3",
          ]),
        },
      });
    });

    it("should log MFA_RECOVERY_CODE_USED audit event", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: false });
      mockRecoveryCodesService.verifyRecoveryCode.mockReturnValue(0);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUserWithMfa,
        mfaRecoveryCodes: mockUserWithMfa.mfaRecoveryCodes.slice(1),
      });

      // Act
      await service.verifyMfa(mockUserId, "RECOVERY123");

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MFA_RECOVERY_CODE_USED",
        }),
      );
    });
  });

  // describe('disableMfa') - Disable MFA
  describe("disableMfa", () => {
    it("should clear MFA fields on user", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: true });
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      // Act
      await service.disableMfa(mockUserId, mockTotpCode);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaVerifiedAt: null,
          mfaRecoveryCodes: [],
        },
      });
    });

    it("should throw if MFA not enabled", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.disableMfa(mockUserId, mockTotpCode),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.disableMfa(mockUserId, mockTotpCode),
      ).rejects.toThrow("MFA is not enabled");
    });

    it("should throw on invalid TOTP code", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: false });

      // Act & Assert
      await expect(service.disableMfa(mockUserId, "000000")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should log MFA_DISABLED audit event", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: true });
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      // Act
      await service.disableMfa(mockUserId, mockTotpCode);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MFA_DISABLED",
        }),
      );
    });
  });

  // describe('regenerateRecoveryCodes') - Regenerate recovery codes
  describe("regenerateRecoveryCodes", () => {
    it("should generate new recovery codes", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: true });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUserWithMfa,
        mfaRecoveryCodes: mockHashedCodes,
      });

      // Act
      const result = await service.regenerateRecoveryCodes(
        mockUserId,
        mockTotpCode,
      );

      // Assert
      expect(result).toHaveLength(10);
      expect(mockRecoveryCodesService.generateRecoveryCodes).toHaveBeenCalled();
    });

    it("should hash codes before storage", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: true });
      mockPrismaService.user.update.mockResolvedValue(mockUserWithMfa);

      // Act
      await service.regenerateRecoveryCodes(mockUserId, mockTotpCode);

      // Assert
      expect(mockRecoveryCodesService.hashRecoveryCodes).toHaveBeenCalledWith(
        mockRecoveryCodes,
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { mfaRecoveryCodes: mockHashedCodes },
      });
    });

    it("should return plaintext codes to user", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: true });
      mockPrismaService.user.update.mockResolvedValue(mockUserWithMfa);

      // Act
      const result = await service.regenerateRecoveryCodes(
        mockUserId,
        mockTotpCode,
      );

      // Assert
      expect(result).toEqual(mockRecoveryCodes);
    });

    it("should throw if MFA not enabled", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.regenerateRecoveryCodes(mockUserId, mockTotpCode),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw on invalid TOTP code", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: false });

      // Act & Assert
      await expect(
        service.regenerateRecoveryCodes(mockUserId, "000000"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should log MFA_RECOVERY_CODES_REGENERATED audit event", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(
        mockUserWithMfa,
      );
      mockTotpInstance.verify.mockResolvedValue({ valid: true });
      mockPrismaService.user.update.mockResolvedValue(mockUserWithMfa);

      // Act
      await service.regenerateRecoveryCodes(mockUserId, mockTotpCode);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "MFA_RECOVERY_CODES_REGENERATED",
        }),
      );
    });
  });

  // describe('getMfaStatus') - Check MFA status
  describe("getMfaStatus", () => {
    it("should return enabled:true when MFA configured", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue({
        mfaEnabled: true,
        mfaVerifiedAt: new Date(),
        mfaRecoveryCodes: ["code1", "code2", "code3"],
      });

      // Act
      const result = await service.getMfaStatus(mockUserId);

      // Assert
      expect(result.enabled).toBe(true);
      expect(result.enabledAt).toBeDefined();
      expect(result.remainingRecoveryCodes).toBe(3);
    });

    it("should return enabled:false when MFA not configured", async () => {
      // Arrange
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue({
        mfaEnabled: false,
        mfaVerifiedAt: null,
        mfaRecoveryCodes: null,
      });

      // Act
      const result = await service.getMfaStatus(mockUserId);

      // Assert
      expect(result.enabled).toBe(false);
      expect(result.enabledAt).toBeNull();
      expect(result.remainingRecoveryCodes).toBe(0);
    });
  });

  // describe('isMfaEnabled') - Quick MFA check
  describe("isMfaEnabled", () => {
    it("should return true when MFA enabled", async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        mfaEnabled: true,
      });

      // Act
      const result = await service.isMfaEnabled(mockUserId);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when MFA disabled", async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue({
        mfaEnabled: false,
      });

      // Act
      const result = await service.isMfaEnabled(mockUserId);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when user not found", async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.isMfaEnabled(mockUserId);

      // Assert
      expect(result).toBe(false);
    });
  });
});
