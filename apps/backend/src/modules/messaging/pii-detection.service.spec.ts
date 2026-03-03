import { Test, TestingModule } from "@nestjs/testing";
import { PiiDetectionService, PiiType } from "./pii-detection.service";

describe("PiiDetectionService", () => {
  let service: PiiDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PiiDetectionService],
    }).compile();

    service = module.get<PiiDetectionService>(PiiDetectionService);
  });

  describe("detect", () => {
    it("should return no PII for clean text", () => {
      const result = service.detect("This is a safe message with no PII.");

      expect(result.hasPii).toBe(false);
      expect(result.count).toBe(0);
      expect(result.matches).toHaveLength(0);
    });

    it("should return empty result for empty string", () => {
      const result = service.detect("");

      expect(result.hasPii).toBe(false);
      expect(result.count).toBe(0);
    });

    it("should detect email addresses", () => {
      const result = service.detect(
        "Please contact me at john.doe@example.com for more details.",
      );

      expect(result.hasPii).toBe(true);
      const emailMatch = result.matches.find((m) => m.type === PiiType.EMAIL);
      expect(emailMatch).toBeDefined();
      expect(emailMatch?.match).toBe("john.doe@example.com");
    });

    it("should detect US phone numbers", () => {
      const result = service.detect("You can reach me at (555) 234-5678.");

      expect(result.hasPii).toBe(true);
      const phoneMatch = result.matches.find(
        (m) => m.type === PiiType.US_PHONE,
      );
      expect(phoneMatch).toBeDefined();
    });

    it("should detect IP addresses", () => {
      const result = service.detect("The server IP is 192.168.1.100.");

      expect(result.hasPii).toBe(true);
      const ipMatch = result.matches.find((m) => m.type === PiiType.IP_ADDRESS);
      expect(ipMatch).toBeDefined();
    });

    it("should detect employee IDs", () => {
      const result = service.detect("My employee ID is EMP-12345.");

      expect(result.hasPii).toBe(true);
      const empMatch = result.matches.find(
        (m) => m.type === PiiType.EMPLOYEE_ID,
      );
      expect(empMatch).toBeDefined();
    });

    it("should return unique warnings", () => {
      const result = service.detect(
        "Contact alice@example.com or bob@company.org",
      );

      // Two email matches but warning should appear once
      const emailWarnings = result.warnings.filter((w) =>
        w.includes("Email address"),
      );
      expect(emailWarnings).toHaveLength(1);
    });

    it("should sort matches by position", () => {
      const result = service.detect("Email: alice@test.com and bob@test.com");

      if (result.matches.length >= 2) {
        expect(result.matches[0].startIndex).toBeLessThan(
          result.matches[1].startIndex,
        );
      }
    });
  });

  describe("sanitize", () => {
    it("should return original content when no PII detected", () => {
      const content = "This is safe content.";
      const result = service.sanitize(content);

      expect(result).toBe(content);
    });

    it("should replace email with default redaction marker", () => {
      const result = service.sanitize("Contact alice@example.com for help.");

      expect(result).toContain("[REDACTED]");
      expect(result).not.toContain("alice@example.com");
    });

    it("should use custom redaction marker", () => {
      const result = service.sanitize("Email is alice@example.com", "***");

      expect(result).toContain("***");
      expect(result).not.toContain("alice@example.com");
    });

    it("should return empty content unchanged", () => {
      const result = service.sanitize("");
      expect(result).toBe("");
    });
  });

  describe("containsType", () => {
    it("should return true when specific PII type is found", () => {
      const result = service.containsType(
        "My email is test@example.com",
        PiiType.EMAIL,
      );
      expect(result).toBe(true);
    });

    it("should return false when specific PII type is not found", () => {
      const result = service.containsType(
        "My email is test@example.com",
        PiiType.SSN,
      );
      expect(result).toBe(false);
    });

    it("should return false for clean content", () => {
      const result = service.containsType("Clean text", PiiType.EMAIL);
      expect(result).toBe(false);
    });
  });

  describe("getDetectedTypes", () => {
    it("should return unique PII types found", () => {
      const types = service.getDetectedTypes(
        "Email alice@test.com, IP: 10.0.0.1",
      );

      expect(types).toContain(PiiType.EMAIL);
      expect(types).toContain(PiiType.IP_ADDRESS);
      // No duplicates
      const emailTypes = types.filter((t) => t === PiiType.EMAIL);
      expect(emailTypes).toHaveLength(1);
    });

    it("should return empty array for clean content", () => {
      const types = service.getDetectedTypes("Clean text with no PII.");
      expect(types).toHaveLength(0);
    });
  });
});
