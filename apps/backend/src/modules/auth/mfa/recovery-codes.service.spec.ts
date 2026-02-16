/**
 * RecoveryCodesService Unit Tests
 *
 * Tests for MFA recovery codes service covering:
 * - Recovery code generation (count, format)
 * - Code hashing for secure storage
 * - Code verification against stored hashes
 */

import { Test, TestingModule } from "@nestjs/testing";
import { RecoveryCodesService } from "./recovery-codes.service";
import * as crypto from "crypto";

describe("RecoveryCodesService", () => {
  let service: RecoveryCodesService;

  // Module Setup
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecoveryCodesService],
    }).compile();

    service = module.get<RecoveryCodesService>(RecoveryCodesService);
  });

  // describe('generateRecoveryCodes') - Code generation
  describe("generateRecoveryCodes", () => {
    it("should generate 10 codes by default", () => {
      // Act
      const codes = service.generateRecoveryCodes();

      // Assert
      expect(codes).toHaveLength(10);
    });

    it("should generate codes in correct format (8-character uppercase hex)", () => {
      // Act
      const codes = service.generateRecoveryCodes();

      // Assert
      codes.forEach((code) => {
        expect(code).toMatch(/^[A-F0-9]{8}$/);
      });
    });

    it("should return plaintext codes", () => {
      // Act
      const codes = service.generateRecoveryCodes();

      // Assert
      codes.forEach((code) => {
        expect(typeof code).toBe("string");
        expect(code.length).toBe(8);
      });
    });

    it("should generate unique codes", () => {
      // Act
      const codes = service.generateRecoveryCodes();
      const uniqueCodes = new Set(codes);

      // Assert
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it("should generate different codes each time", () => {
      // Act
      const codes1 = service.generateRecoveryCodes();
      const codes2 = service.generateRecoveryCodes();

      // Assert - Very unlikely to have any overlap
      const overlap = codes1.filter((code) => codes2.includes(code));
      expect(overlap.length).toBeLessThan(codes1.length);
    });
  });

  // describe('hashRecoveryCodes') - Code hashing
  describe("hashRecoveryCodes", () => {
    it("should hash all codes using SHA-256", () => {
      // Arrange
      const codes = ["ABCD1234", "EFGH5678", "IJKL9012"];

      // Act
      const hashedCodes = service.hashRecoveryCodes(codes);

      // Assert
      expect(hashedCodes).toHaveLength(3);
      hashedCodes.forEach((hash) => {
        // SHA-256 produces 64-character hex string
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    it("should return array of hashes", () => {
      // Arrange
      const codes = ["TESTCODE"];

      // Act
      const hashedCodes = service.hashRecoveryCodes(codes);

      // Assert
      expect(Array.isArray(hashedCodes)).toBe(true);
      expect(hashedCodes).toHaveLength(1);
    });

    it("should produce consistent hashes for same input", () => {
      // Arrange
      const code = "ABCD1234";

      // Act
      const hash1 = service.hashRecoveryCodes([code])[0];
      const hash2 = service.hashRecoveryCodes([code])[0];

      // Assert
      expect(hash1).toBe(hash2);
    });

    it("should normalize to uppercase before hashing", () => {
      // Arrange
      const lowercaseCode = "abcd1234";
      const uppercaseCode = "ABCD1234";

      // Act
      const hash1 = service.hashRecoveryCodes([lowercaseCode])[0];
      const hash2 = service.hashRecoveryCodes([uppercaseCode])[0];

      // Assert
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      // Arrange
      const code1 = "ABCD1234";
      const code2 = "EFGH5678";

      // Act
      const hash1 = service.hashRecoveryCodes([code1])[0];
      const hash2 = service.hashRecoveryCodes([code2])[0];

      // Assert
      expect(hash1).not.toBe(hash2);
    });
  });

  // describe('verifyRecoveryCode') - Code verification
  describe("verifyRecoveryCode", () => {
    it("should return index when code matches", () => {
      // Arrange
      const codes = ["ABCD1234", "EFGH5678", "IJKL9012"];
      const hashedCodes = service.hashRecoveryCodes(codes);

      // Act
      const result = service.verifyRecoveryCode("EFGH5678", hashedCodes);

      // Assert
      expect(result).toBe(1); // Second code
    });

    it("should return -1 when code does not match", () => {
      // Arrange
      const codes = ["ABCD1234", "EFGH5678"];
      const hashedCodes = service.hashRecoveryCodes(codes);

      // Act
      const result = service.verifyRecoveryCode("INVALID1", hashedCodes);

      // Assert
      expect(result).toBe(-1);
    });

    it("should verify first code correctly", () => {
      // Arrange
      const codes = ["FIRST123", "SECOND78", "THIRD012"];
      const hashedCodes = service.hashRecoveryCodes(codes);

      // Act
      const result = service.verifyRecoveryCode("FIRST123", hashedCodes);

      // Assert
      expect(result).toBe(0);
    });

    it("should verify last code correctly", () => {
      // Arrange
      const codes = ["FIRST123", "SECOND78", "LAST5678"];
      const hashedCodes = service.hashRecoveryCodes(codes);

      // Act
      const result = service.verifyRecoveryCode("LAST5678", hashedCodes);

      // Assert
      expect(result).toBe(2);
    });

    it("should be case-insensitive", () => {
      // Arrange
      const codes = ["ABCD1234"];
      const hashedCodes = service.hashRecoveryCodes(codes);

      // Act
      const result = service.verifyRecoveryCode("abcd1234", hashedCodes);

      // Assert
      expect(result).toBe(0);
    });

    it("should return -1 for empty hashed codes array", () => {
      // Act
      const result = service.verifyRecoveryCode("ANYCODE1", []);

      // Assert
      expect(result).toBe(-1);
    });

    it("should handle partial match correctly (return -1)", () => {
      // Arrange
      const codes = ["ABCD1234"];
      const hashedCodes = service.hashRecoveryCodes(codes);

      // Act - Partial code should not match
      const result = service.verifyRecoveryCode("ABCD", hashedCodes);

      // Assert
      expect(result).toBe(-1);
    });
  });

  // Integration-style tests for full workflow
  describe("full workflow", () => {
    it("should generate, hash, and verify codes correctly", () => {
      // Arrange - Generate codes
      const plaintextCodes = service.generateRecoveryCodes();

      // Act - Hash codes
      const hashedCodes = service.hashRecoveryCodes(plaintextCodes);

      // Assert - All plaintext codes should verify against hashes
      plaintextCodes.forEach((code, index) => {
        const verifyIndex = service.verifyRecoveryCode(code, hashedCodes);
        expect(verifyIndex).toBe(index);
      });
    });

    it("should not verify codes that were not generated", () => {
      // Arrange
      const plaintextCodes = service.generateRecoveryCodes();
      const hashedCodes = service.hashRecoveryCodes(plaintextCodes);

      // Act - Try to verify a fake code
      const result = service.verifyRecoveryCode("FAKECODE", hashedCodes);

      // Assert
      expect(result).toBe(-1);
    });
  });
});
