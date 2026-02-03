import { Injectable, Logger } from "@nestjs/common";

/**
 * PII (Personally Identifiable Information) types that can be detected
 */
export enum PiiType {
  EMAIL = "EMAIL",
  US_PHONE = "US_PHONE",
  INTERNATIONAL_PHONE = "INTERNATIONAL_PHONE",
  SSN = "SSN",
  CREDIT_CARD = "CREDIT_CARD",
  DATE_OF_BIRTH = "DATE_OF_BIRTH",
  STREET_ADDRESS = "STREET_ADDRESS",
  EMPLOYEE_ID = "EMPLOYEE_ID",
  IP_ADDRESS = "IP_ADDRESS",
}

/**
 * Individual PII match found in content
 */
export interface PiiMatch {
  /** The type of PII found */
  type: PiiType;
  /** The matched text */
  match: string;
  /** Start position in content */
  startIndex: number;
  /** End position in content */
  endIndex: number;
  /** Human-readable warning for this PII type */
  warning: string;
}

/**
 * Result of PII detection
 */
export interface PiiDetectionResult {
  /** Whether any PII was found */
  hasPii: boolean;
  /** Count of PII matches found */
  count: number;
  /** Individual matches */
  matches: PiiMatch[];
  /** Summary warnings for investigator */
  warnings: string[];
}

/**
 * Pattern definition for PII detection
 */
interface PiiPattern {
  type: PiiType;
  regex: RegExp;
  warning: string;
}

/**
 * PiiDetectionService
 *
 * Detects personally identifiable information (PII) in message content
 * to prevent accidental identity disclosure in anonymous reporting scenarios.
 *
 * Usage:
 * - detect() - Find all PII patterns in content
 * - sanitize() - Redact PII from content
 * - containsType() - Check for specific PII type
 */
@Injectable()
export class PiiDetectionService {
  private readonly logger = new Logger(PiiDetectionService.name);

  /**
   * PII patterns with their detection regexes and warnings.
   * Patterns are ordered by priority (most sensitive first).
   */
  private readonly patterns: PiiPattern[] = [
    {
      type: PiiType.SSN,
      // Matches XXX-XX-XXXX or XXX XX XXXX or XXXXXXXXX
      regex:
        /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g,
      warning:
        "Social Security Number detected - this could identify the reporter",
    },
    {
      type: PiiType.CREDIT_CARD,
      // Matches common credit card formats (Visa, MC, Amex, Discover)
      regex:
        /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9][0-9])[0-9]{12})\b/g,
      warning:
        "Credit card number detected - this is sensitive financial information",
    },
    {
      type: PiiType.EMAIL,
      // Standard email pattern
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      warning: "Email address detected - this could identify the reporter",
    },
    {
      type: PiiType.US_PHONE,
      // US phone: (XXX) XXX-XXXX, XXX-XXX-XXXX, XXX.XXX.XXXX, 1-XXX-XXX-XXXX
      regex:
        /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}\b/g,
      warning:
        "US phone number detected - this could be used to identify the reporter",
    },
    {
      type: PiiType.INTERNATIONAL_PHONE,
      // International: +XX XXXX XXXXXX (various formats)
      regex: /\+(?:[0-9]\s?){6,14}[0-9]\b/g,
      warning:
        "International phone number detected - this could identify the reporter",
    },
    {
      type: PiiType.IP_ADDRESS,
      // IPv4 address
      regex:
        /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      warning:
        "IP address detected - this could be used to locate the reporter",
    },
    {
      type: PiiType.DATE_OF_BIRTH,
      // Common DOB formats: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD
      // with context words like "born", "DOB", "birthday"
      regex:
        /\b(?:born|dob|birth(?:day|date)?)[:\s]+(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/gi,
      warning:
        "Date of birth detected - this could identify the reporter when combined with other info",
    },
    {
      type: PiiType.STREET_ADDRESS,
      // Street address with number and ZIP code
      regex:
        /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Circle|Cir|Place|Pl)[.,]?\s*(?:[A-Za-z\s]+,?\s*)?(?:[A-Z]{2}\s*)?\d{5}(?:-\d{4})?\b/gi,
      warning:
        "Street address with ZIP code detected - this could identify the reporter's location",
    },
    {
      type: PiiType.EMPLOYEE_ID,
      // Employee ID patterns: EMP-XXXX, EID-XXXXX, Employee #XXXXX, Badge XXXXX
      regex:
        /\b(?:emp(?:loyee)?|eid|badge|worker)\s*[#:\-]?\s*[A-Z0-9]{4,10}\b/gi,
      warning:
        "Employee ID detected - this could directly identify the reporter",
    },
  ];

  /**
   * Detect all PII patterns in content.
   *
   * @param content - The text content to scan
   * @returns Detection result with all matches and warnings
   */
  detect(content: string): PiiDetectionResult {
    if (!content || content.trim().length === 0) {
      return { hasPii: false, count: 0, matches: [], warnings: [] };
    }

    const matches: PiiMatch[] = [];
    const warningsSet = new Set<string>();

    for (const pattern of this.patterns) {
      // Reset regex lastIndex for global patterns
      pattern.regex.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(content)) !== null) {
        matches.push({
          type: pattern.type,
          match: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          warning: pattern.warning,
        });
        warningsSet.add(pattern.warning);

        // Prevent infinite loop for zero-length matches
        if (match[0].length === 0) {
          pattern.regex.lastIndex++;
        }
      }
    }

    // Sort matches by position in content
    matches.sort((a, b) => a.startIndex - b.startIndex);

    return {
      hasPii: matches.length > 0,
      count: matches.length,
      matches,
      warnings: Array.from(warningsSet),
    };
  }

  /**
   * Sanitize content by redacting all detected PII.
   *
   * @param content - The text content to sanitize
   * @param redactionMarker - Optional custom redaction marker (default: "[REDACTED]")
   * @returns Sanitized content with PII replaced
   */
  sanitize(content: string, redactionMarker: string = "[REDACTED]"): string {
    if (!content || content.trim().length === 0) {
      return content;
    }

    const detection = this.detect(content);
    if (!detection.hasPii) {
      return content;
    }

    // Build result by replacing matches from end to start
    // (to preserve indices during replacement)
    let result = content;
    const sortedMatches = [...detection.matches].sort(
      (a, b) => b.startIndex - a.startIndex,
    );

    for (const match of sortedMatches) {
      result =
        result.substring(0, match.startIndex) +
        redactionMarker +
        result.substring(match.endIndex);
    }

    return result;
  }

  /**
   * Check if content contains a specific type of PII.
   *
   * @param content - The text content to check
   * @param type - The PII type to check for
   * @returns true if the specific PII type is found
   */
  containsType(content: string, type: PiiType): boolean {
    const detection = this.detect(content);
    return detection.matches.some((match) => match.type === type);
  }

  /**
   * Get summary of detected PII types (without match details).
   * Useful for logging without exposing sensitive data.
   *
   * @param content - The text content to scan
   * @returns Array of PII types found
   */
  getDetectedTypes(content: string): PiiType[] {
    const detection = this.detect(content);
    const uniqueTypes = new Set(detection.matches.map((m) => m.type));
    return Array.from(uniqueTypes);
  }
}
