// =============================================================================
// UNIT TESTS: DomainVerificationService
// =============================================================================
//
// Tests for DNS TXT record verification of domain ownership.
// Key behaviors:
// - Generate cryptographically secure verification tokens
// - Build expected TXT record name and value
// - Verify DNS TXT records match expected token
// - Handle DNS lookup errors gracefully
// =============================================================================

import { Test, TestingModule } from "@nestjs/testing";
import { DomainVerificationService } from "./domain-verification.service";
import * as dns from "dns";

// Mock the dns module
jest.mock("dns", () => ({
  Resolver: jest.fn().mockImplementation(() => ({
    setServers: jest.fn(),
  })),
  promises: {
    resolveTxt: jest.fn(),
  },
}));

describe("DomainVerificationService", () => {
  let service: DomainVerificationService;

  // ---------------------------------------------------------------------------
  // Test Data Fixtures
  // ---------------------------------------------------------------------------
  const mockDomain = "company.com";
  const mockToken = "abc123def456";

  // ---------------------------------------------------------------------------
  // Module Setup
  // ---------------------------------------------------------------------------
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DomainVerificationService],
    }).compile();

    service = module.get<DomainVerificationService>(DomainVerificationService);

    // Reset mocks
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // describe('generateVerificationToken') - Token generation
  // ---------------------------------------------------------------------------
  describe("generateVerificationToken", () => {
    it("should generate a 64-character hex token", () => {
      // Act
      const token = service.generateVerificationToken();

      // Assert - 32 bytes = 64 hex characters
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it("should generate unique tokens on each call", () => {
      // Act
      const token1 = service.generateVerificationToken();
      const token2 = service.generateVerificationToken();
      const token3 = service.generateVerificationToken();

      // Assert
      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });
  });

  // ---------------------------------------------------------------------------
  // describe('getTxtRecordName') - Record name generation
  // ---------------------------------------------------------------------------
  describe("getTxtRecordName", () => {
    it("should return correct TXT record name", () => {
      // Act
      const recordName = service.getTxtRecordName(mockDomain);

      // Assert
      expect(recordName).toBe("_ethico-verify.company.com");
    });

    it("should handle subdomains correctly", () => {
      // Act
      const recordName = service.getTxtRecordName("sub.company.com");

      // Assert
      expect(recordName).toBe("_ethico-verify.sub.company.com");
    });
  });

  // ---------------------------------------------------------------------------
  // describe('getExpectedTxtValue') - Expected value generation
  // ---------------------------------------------------------------------------
  describe("getExpectedTxtValue", () => {
    it("should return expected TXT value with token", () => {
      // Act
      const value = service.getExpectedTxtValue(mockToken);

      // Assert
      expect(value).toBe("ethico-verify=abc123def456");
    });
  });

  // ---------------------------------------------------------------------------
  // describe('verifyDnsTxtRecord') - DNS verification
  // ---------------------------------------------------------------------------
  describe("verifyDnsTxtRecord", () => {
    it("should return true when TXT record matches", async () => {
      // Arrange
      (dns.promises.resolveTxt as jest.Mock).mockResolvedValue([
        ["ethico-verify=abc123def456"],
      ]);

      // Act
      const result = await service.verifyDnsTxtRecord(mockDomain, mockToken);

      // Assert
      expect(result).toBe(true);
      expect(dns.promises.resolveTxt).toHaveBeenCalledWith(
        "_ethico-verify.company.com",
      );
    });

    it("should return true when token found among multiple TXT records", async () => {
      // Arrange - Multiple TXT records, one is ours
      (dns.promises.resolveTxt as jest.Mock).mockResolvedValue([
        ["google-site-verification=xyz789"],
        ["ethico-verify=abc123def456"],
        ["v=spf1 include:_spf.google.com ~all"],
      ]);

      // Act
      const result = await service.verifyDnsTxtRecord(mockDomain, mockToken);

      // Assert
      expect(result).toBe(true);
    });

    it("should handle chunked TXT records correctly", async () => {
      // Arrange - Long TXT records are chunked
      (dns.promises.resolveTxt as jest.Mock).mockResolvedValue([
        ["ethico-verify=", "abc123def456"],
      ]);

      // Act
      const result = await service.verifyDnsTxtRecord(mockDomain, mockToken);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when TXT record not found", async () => {
      // Arrange - Different records, not ours
      (dns.promises.resolveTxt as jest.Mock).mockResolvedValue([
        ["google-site-verification=xyz789"],
        ["v=spf1 include:_spf.google.com ~all"],
      ]);

      // Act
      const result = await service.verifyDnsTxtRecord(mockDomain, mockToken);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when TXT record has wrong value", async () => {
      // Arrange - Our prefix but wrong token
      (dns.promises.resolveTxt as jest.Mock).mockResolvedValue([
        ["ethico-verify=wrongtoken123"],
      ]);

      // Act
      const result = await service.verifyDnsTxtRecord(mockDomain, mockToken);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when DNS lookup fails with ENOTFOUND", async () => {
      // Arrange - Domain doesn't exist
      const error = new Error("queryTxt ENOTFOUND") as NodeJS.ErrnoException;
      error.code = "ENOTFOUND";
      (dns.promises.resolveTxt as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await service.verifyDnsTxtRecord(mockDomain, mockToken);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when DNS lookup fails with ENODATA", async () => {
      // Arrange - No TXT records exist
      const error = new Error("queryTxt ENODATA") as NodeJS.ErrnoException;
      error.code = "ENODATA";
      (dns.promises.resolveTxt as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await service.verifyDnsTxtRecord(mockDomain, mockToken);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false on unknown DNS errors", async () => {
      // Arrange - Network error or timeout
      const error = new Error("DNS query timeout");
      (dns.promises.resolveTxt as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await service.verifyDnsTxtRecord(mockDomain, mockToken);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // describe('getVerificationInstructions') - User-friendly instructions
  // ---------------------------------------------------------------------------
  describe("getVerificationInstructions", () => {
    it("should return complete verification instructions", () => {
      // Act
      const instructions = service.getVerificationInstructions(
        mockDomain,
        mockToken,
      );

      // Assert
      expect(instructions.recordType).toBe("TXT");
      expect(instructions.recordName).toBe("_ethico-verify.company.com");
      expect(instructions.recordValue).toBe("ethico-verify=abc123def456");
      expect(instructions.instructions).toContain("Add a TXT record");
      expect(instructions.instructions).toContain("_ethico-verify");
      expect(instructions.instructions).toContain("DNS changes can take up to");
    });

    it("should include host name in instructions", () => {
      // Act
      const instructions = service.getVerificationInstructions(
        mockDomain,
        mockToken,
      );

      // Assert
      expect(instructions.instructions).toContain("Host/Name: _ethico-verify");
    });

    it("should include expected value in instructions", () => {
      // Act
      const instructions = service.getVerificationInstructions(
        mockDomain,
        mockToken,
      );

      // Assert
      expect(instructions.instructions).toContain(
        "Value: ethico-verify=abc123def456",
      );
    });
  });
});
