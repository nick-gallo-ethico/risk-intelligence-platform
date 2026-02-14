/**
 * ConflictMatchingService - Fuzzy matching and individual conflict detection logic
 *
 * Handles all string comparison and matching operations:
 * - Fuzzy matching with Levenshtein distance
 * - Self-dealing detection (prior disclosures with same entity)
 * - HRIS matching (disclosed person matches employee)
 * - Prior case history matching
 * - Relationship pattern detection
 *
 * RS.42: Multi-algorithm fuzzy matching with configurable thresholds.
 *
 * Extracted from ConflictDetectionService for maintainability.
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConflictType, ConflictSeverity } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MatchDetails, SeverityFactors } from "../dto/conflict.dto";

// ===========================================
// Types
// ===========================================

/**
 * Match result from fuzzy matching.
 */
export interface MatchResult {
  matched: boolean;
  confidence: number;
  matchedEntity: string;
}

/**
 * Detected conflict before being saved to database.
 */
export interface DetectedConflict {
  conflictType: ConflictType;
  severity: ConflictSeverity;
  summary: string;
  matchedEntity: string;
  matchConfidence: number;
  matchDetails: MatchDetails;
  severityFactors?: SeverityFactors;
}

/**
 * Configuration for fuzzy matching thresholds.
 * RS.42: Multi-algorithm fuzzy matching with configurable thresholds.
 */
export interface FuzzyMatchConfig {
  /** Below this threshold, no match (default: 60) */
  minThreshold: number;
  /** Low confidence match threshold (default: 75) */
  lowConfidenceThreshold: number;
  /** High confidence match threshold (default: 90) */
  highConfidenceThreshold: number;
  /** Exact match threshold (default: 100) */
  exactMatchThreshold: number;
}

export const DEFAULT_FUZZY_CONFIG: FuzzyMatchConfig = {
  minThreshold: 60,
  lowConfidenceThreshold: 75,
  highConfidenceThreshold: 90,
  exactMatchThreshold: 100,
};

@Injectable()
export class ConflictMatchingService {
  private readonly logger = new Logger(ConflictMatchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================
  // Fuzzy Matching (RS.42)
  // ===========================================

  /**
   * Calculates similarity between two strings using Levenshtein distance.
   * RS.42: Fuzzy matching with configurable thresholds.
   *
   * @param str1 - First string
   * @param str2 - Second string
   * @param config - Threshold configuration
   * @returns Match result with confidence score
   */
  fuzzyMatch(
    str1: string,
    str2: string,
    config: FuzzyMatchConfig = DEFAULT_FUZZY_CONFIG,
  ): MatchResult {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) {
      return {
        matched: true,
        confidence: 100,
        matchedEntity: str2,
      };
    }

    // Calculate Levenshtein distance and normalize to 0-100
    const confidence = this.calculateSimilarity(s1, s2);

    return {
      matched: confidence >= config.minThreshold,
      confidence,
      matchedEntity: str2,
    };
  }

  /**
   * Calculates similarity using normalized Levenshtein distance.
   * Returns a value 0-100 where 100 is exact match.
   */
  calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 100;
    if (s1.length === 0) return s2.length === 0 ? 100 : 0;
    if (s2.length === 0) return 0;

    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    // Normalize to 0-100 scale where 100 = perfect match
    return Math.round((1 - distance / maxLength) * 100);
  }

  /**
   * Computes Levenshtein distance between two strings.
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;

    // Create matrix
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize first column and row
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + cost, // substitution
        );
      }
    }

    return dp[m][n];
  }

  /**
   * Determines severity based on confidence and other factors.
   */
  determineSeverity(confidence: number, factors: string[]): ConflictSeverity {
    if (confidence >= 95 || factors.length >= 3) {
      return ConflictSeverity.CRITICAL;
    }
    if (confidence >= 85 || factors.length >= 2) {
      return ConflictSeverity.HIGH;
    }
    if (confidence >= 75) {
      return ConflictSeverity.MEDIUM;
    }
    return ConflictSeverity.LOW;
  }

  // ===========================================
  // Individual Conflict Checks
  // ===========================================

  /**
   * Checks for self-dealing: prior disclosures with the same entity by this person.
   * RS.41: SELF_DEALING conflict type.
   */
  async checkSelfDealing(
    entityName: string,
    personId: string,
    currentDisclosureId: string,
    organizationId: string,
    config: FuzzyMatchConfig,
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];

    // Get prior disclosures by this person
    const priorDisclosures = await this.prisma.riuDisclosureExtension.findMany({
      where: {
        organizationId,
        riu: {
          createdById: personId,
        },
        riuId: { not: currentDisclosureId },
      },
      select: {
        riuId: true,
        relatedCompany: true,
        relatedPersonName: true,
        disclosureType: true,
        disclosureValue: true,
        createdAt: true,
      },
    });

    for (const disclosure of priorDisclosures) {
      // Check company name match
      if (disclosure.relatedCompany) {
        const match = this.fuzzyMatch(
          entityName,
          disclosure.relatedCompany,
          config,
        );
        if (match.matched) {
          conflicts.push({
            conflictType: ConflictType.SELF_DEALING,
            severity: this.determineSeverity(match.confidence, [
              "Prior disclosure exists",
            ]),
            summary: `Prior disclosure to "${match.matchedEntity}" found (${Math.round(match.confidence)}% match)`,
            matchedEntity: match.matchedEntity,
            matchConfidence: match.confidence,
            matchDetails: {
              disclosureContext: {
                priorDisclosureIds: [disclosure.riuId],
                totalValue: disclosure.disclosureValue
                  ? Number(disclosure.disclosureValue)
                  : undefined,
                disclosureTypes: [disclosure.disclosureType],
                dateRange: {
                  start: disclosure.createdAt.toISOString(),
                  end: disclosure.createdAt.toISOString(),
                },
              },
            },
            severityFactors: {
              factors: ["Prior disclosure with same entity"],
              matchConfidence: match.confidence,
            },
          });
        }
      }

      // Check person name match
      if (disclosure.relatedPersonName) {
        const match = this.fuzzyMatch(
          entityName,
          disclosure.relatedPersonName,
          config,
        );
        if (match.matched) {
          conflicts.push({
            conflictType: ConflictType.SELF_DEALING,
            severity: this.determineSeverity(match.confidence, [
              "Prior disclosure exists",
            ]),
            summary: `Prior disclosure involving "${match.matchedEntity}" found (${Math.round(match.confidence)}% match)`,
            matchedEntity: match.matchedEntity,
            matchConfidence: match.confidence,
            matchDetails: {
              disclosureContext: {
                priorDisclosureIds: [disclosure.riuId],
                totalValue: disclosure.disclosureValue
                  ? Number(disclosure.disclosureValue)
                  : undefined,
                disclosureTypes: [disclosure.disclosureType],
              },
            },
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Checks for HRIS match: disclosed person matches employee in directory.
   * RS.41: HRIS_MATCH conflict type (potential nepotism).
   */
  async checkHrisMatch(
    entityName: string,
    disclosingPersonId: string,
    organizationId: string,
    config: FuzzyMatchConfig,
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];

    // Get employees to check against
    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId,
        employmentStatus: "ACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        department: true,
        jobTitle: true,
        managerId: true,
      },
      take: 1000, // Limit for performance
    });

    for (const employee of employees) {
      const fullName = `${employee.firstName} ${employee.lastName}`.trim();
      const match = this.fuzzyMatch(entityName, fullName, config);

      if (match.matched) {
        conflicts.push({
          conflictType: ConflictType.HRIS_MATCH,
          severity: this.determineSeverity(match.confidence, [
            "Potential nepotism",
          ]),
          summary: `Name matches employee "${match.matchedEntity}" (${Math.round(match.confidence)}% match)`,
          matchedEntity: match.matchedEntity,
          matchConfidence: match.confidence,
          matchDetails: {
            employeeContext: {
              employeeId: employee.id,
              name: fullName,
              department: employee.department ?? undefined,
              jobTitle: employee.jobTitle ?? undefined,
            },
          },
          severityFactors: {
            factors: ["Name matches active employee"],
            matchConfidence: match.confidence,
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Checks for prior case history involving the entity.
   * RS.41: PRIOR_CASE_HISTORY conflict type.
   */
  async checkPriorCases(
    entityName: string,
    organizationId: string,
    config: FuzzyMatchConfig,
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];

    // Get subjects from prior cases
    const subjects = await this.prisma.subject.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        externalName: true,
        caseId: true,
        role: true,
        case: {
          select: {
            referenceNumber: true,
            status: true,
            outcome: true,
          },
        },
      },
      take: 1000,
    });

    const matchedCases = new Map<string, { caseId: string; roles: string[] }>();

    for (const subject of subjects) {
      if (subject.externalName) {
        const match = this.fuzzyMatch(entityName, subject.externalName, config);
        if (match.matched) {
          const existing = matchedCases.get(subject.caseId);
          if (existing) {
            existing.roles.push(subject.role);
          } else {
            matchedCases.set(subject.caseId, {
              caseId: subject.caseId,
              roles: [subject.role],
            });
          }
        }
      }
    }

    if (matchedCases.size > 0) {
      const caseIds = Array.from(matchedCases.keys());
      const cases = await this.prisma.case.findMany({
        where: { id: { in: caseIds } },
        select: {
          id: true,
          referenceNumber: true,
          status: true,
          outcome: true,
        },
      });

      conflicts.push({
        conflictType: ConflictType.PRIOR_CASE_HISTORY,
        severity:
          matchedCases.size > 2
            ? ConflictSeverity.HIGH
            : ConflictSeverity.MEDIUM,
        summary: `Entity appears in ${matchedCases.size} prior case(s)`,
        matchedEntity: entityName,
        matchConfidence: 85, // Weighted average
        matchDetails: {
          caseContext: {
            caseIds,
            caseTypes: cases.map((c) => c.status),
            outcomes: cases
              .filter((c) => c.outcome)
              .map((c) => c.outcome as string),
            roles: Array.from(
              new Set(
                Array.from(matchedCases.values()).flatMap((m) => m.roles),
              ),
            ),
          },
        },
        severityFactors: {
          factors: [`Appeared in ${matchedCases.size} prior cases`],
          historicalOccurrences: matchedCases.size,
        },
      });
    }

    return conflicts;
  }

  /**
   * Checks for relationship patterns: multiple employees linked to same entity.
   * RS.41: RELATIONSHIP_PATTERN conflict type.
   */
  async checkRelationshipPatterns(
    entityName: string,
    currentPersonId: string,
    organizationId: string,
    config: FuzzyMatchConfig,
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];

    // Get other disclosures involving similar entity names
    const otherDisclosures = await this.prisma.riuDisclosureExtension.findMany({
      where: {
        organizationId,
        riu: {
          createdById: { not: currentPersonId },
        },
      },
      select: {
        riuId: true,
        relatedCompany: true,
        relatedPersonName: true,
        riu: {
          select: {
            createdById: true,
          },
        },
      },
      take: 1000,
    });

    const matchedPersons = new Map<string, number>();

    for (const disclosure of otherDisclosures) {
      const checkEntities = [
        disclosure.relatedCompany,
        disclosure.relatedPersonName,
      ].filter(Boolean) as string[];

      for (const entity of checkEntities) {
        const match = this.fuzzyMatch(entityName, entity, config);
        if (match.matched && disclosure.riu?.createdById) {
          const count = matchedPersons.get(disclosure.riu.createdById) || 0;
          matchedPersons.set(disclosure.riu.createdById, count + 1);
        }
      }
    }

    if (matchedPersons.size >= 2) {
      conflicts.push({
        conflictType: ConflictType.RELATIONSHIP_PATTERN,
        severity:
          matchedPersons.size >= 5
            ? ConflictSeverity.HIGH
            : ConflictSeverity.MEDIUM,
        summary: `${matchedPersons.size + 1} employees have disclosed relationships with "${entityName}"`,
        matchedEntity: entityName,
        matchConfidence: 80,
        matchDetails: {
          disclosureContext: {
            priorDisclosureIds: otherDisclosures.map((d) => d.riuId),
          },
        },
        severityFactors: {
          factors: [`Multiple employees (${matchedPersons.size + 1}) involved`],
          historicalOccurrences: matchedPersons.size + 1,
        },
      });
    }

    return conflicts;
  }
}
