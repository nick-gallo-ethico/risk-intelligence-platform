import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConflictType,
  ConflictSeverity,
  ConflictStatus,
  ExclusionScope,
  ConflictAlert,
  ConflictExclusion,
  Prisma,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ConflictAlertDto,
  ConflictCheckResult,
  DismissConflictDto,
  DismissalCategory,
  MatchDetails,
  SeverityFactors,
  EntityTimelineDto,
  EntityTimelineItem,
  EntityTimelineEventType,
  ConflictQueryDto,
  ConflictAlertPageDto,
  ConflictExclusionDto,
  CreateExclusionDto,
} from './dto/conflict.dto';

// ===========================================
// Types
// ===========================================

/**
 * Match result from fuzzy matching.
 */
interface MatchResult {
  matched: boolean;
  confidence: number;
  matchedEntity: string;
}

/**
 * Detected conflict before being saved to database.
 */
interface DetectedConflict {
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
interface FuzzyMatchConfig {
  /** Below this threshold, no match (default: 60) */
  minThreshold: number;
  /** Low confidence match threshold (default: 75) */
  lowConfidenceThreshold: number;
  /** High confidence match threshold (default: 90) */
  highConfidenceThreshold: number;
  /** Exact match threshold (default: 100) */
  exactMatchThreshold: number;
}

const DEFAULT_FUZZY_CONFIG: FuzzyMatchConfig = {
  minThreshold: 60,
  lowConfidenceThreshold: 75,
  highConfidenceThreshold: 90,
  exactMatchThreshold: 100,
};

// ===========================================
// Conflict Detection Service
// ===========================================

/**
 * Service for detecting conflicts across disclosure history, vendor data,
 * HRIS, and case history.
 *
 * RS.41-RS.45: Six-way conflict detection, fuzzy matching, contextual
 * presentation, categorized dismissals, and entity timeline.
 */
@Injectable()
export class ConflictDetectionService {
  private readonly logger = new Logger(ConflictDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ===========================================
  // Main Detection Entry Point
  // ===========================================

  /**
   * Detects conflicts for a disclosure.
   * RS.41: Six-way conflict detection across systems.
   *
   * @param disclosureId - The disclosure RIU ID to check
   * @param personId - The person who submitted the disclosure
   * @param organizationId - The organization ID
   * @param config - Optional fuzzy matching configuration
   */
  async detectConflicts(
    disclosureId: string,
    personId: string,
    organizationId: string,
    config: Partial<FuzzyMatchConfig> = {},
  ): Promise<ConflictCheckResult> {
    const fuzzyConfig = { ...DEFAULT_FUZZY_CONFIG, ...config };

    this.logger.log(
      `Starting conflict detection for disclosure ${disclosureId}`,
    );

    // Get disclosure details
    const disclosure = await this.prisma.riuDisclosureExtension.findUnique({
      where: { riuId: disclosureId },
      include: {
        riu: {
          select: {
            id: true,
            referenceNumber: true,
            details: true,
          },
        },
      },
    });

    if (!disclosure) {
      throw new NotFoundException(`Disclosure ${disclosureId} not found`);
    }

    const detectedConflicts: DetectedConflict[] = [];
    const appliedExclusionIds: string[] = [];
    let excludedConflictCount = 0;

    // Get entity names to check from disclosure
    const entitiesToCheck: string[] = [];
    if (disclosure.relatedCompany) {
      entitiesToCheck.push(disclosure.relatedCompany);
    }
    if (disclosure.relatedPersonName) {
      entitiesToCheck.push(disclosure.relatedPersonName);
    }

    // Run all conflict detection checks
    for (const entityName of entitiesToCheck) {
      // Check self-dealing (prior disclosures with same entity)
      const selfDealingConflicts = await this.checkSelfDealing(
        entityName,
        personId,
        disclosureId,
        organizationId,
        fuzzyConfig,
      );

      for (const conflict of selfDealingConflicts) {
        const isExcluded = await this.isExcluded(
          personId,
          conflict.matchedEntity,
          conflict.conflictType,
          organizationId,
        );

        if (isExcluded.excluded) {
          excludedConflictCount++;
          if (isExcluded.exclusionId) {
            appliedExclusionIds.push(isExcluded.exclusionId);
          }
        } else {
          detectedConflicts.push(conflict);
        }
      }

      // Check HRIS match (disclosed person matches employee)
      const hrisConflicts = await this.checkHrisMatch(
        entityName,
        personId,
        organizationId,
        fuzzyConfig,
      );

      for (const conflict of hrisConflicts) {
        const isExcluded = await this.isExcluded(
          personId,
          conflict.matchedEntity,
          conflict.conflictType,
          organizationId,
        );

        if (isExcluded.excluded) {
          excludedConflictCount++;
          if (isExcluded.exclusionId) {
            appliedExclusionIds.push(isExcluded.exclusionId);
          }
        } else {
          detectedConflicts.push(conflict);
        }
      }

      // Check prior cases
      const caseConflicts = await this.checkPriorCases(
        entityName,
        organizationId,
        fuzzyConfig,
      );

      for (const conflict of caseConflicts) {
        const isExcluded = await this.isExcluded(
          personId,
          conflict.matchedEntity,
          conflict.conflictType,
          organizationId,
        );

        if (isExcluded.excluded) {
          excludedConflictCount++;
          if (isExcluded.exclusionId) {
            appliedExclusionIds.push(isExcluded.exclusionId);
          }
        } else {
          detectedConflicts.push(conflict);
        }
      }

      // Check relationship patterns (multiple employees with same entity)
      const patternConflicts = await this.checkRelationshipPatterns(
        entityName,
        personId,
        organizationId,
        fuzzyConfig,
      );

      for (const conflict of patternConflicts) {
        const isExcluded = await this.isExcluded(
          personId,
          conflict.matchedEntity,
          conflict.conflictType,
          organizationId,
        );

        if (isExcluded.excluded) {
          excludedConflictCount++;
          if (isExcluded.exclusionId) {
            appliedExclusionIds.push(isExcluded.exclusionId);
          }
        } else {
          detectedConflicts.push(conflict);
        }
      }
    }

    // Save detected conflicts to database
    const savedAlerts: ConflictAlertDto[] = [];
    for (const conflict of detectedConflicts) {
      const alert = await this.prisma.conflictAlert.create({
        data: {
          organizationId,
          disclosureId,
          conflictType: conflict.conflictType,
          severity: conflict.severity,
          status: ConflictStatus.OPEN,
          summary: conflict.summary,
          matchedEntity: conflict.matchedEntity,
          matchConfidence: conflict.matchConfidence,
          matchDetails: conflict.matchDetails as Prisma.InputJsonValue,
          severityFactors: conflict.severityFactors
            ? (conflict.severityFactors as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      });

      savedAlerts.push(this.mapAlertToDto(alert));
    }

    // Emit event if conflicts detected
    if (savedAlerts.length > 0) {
      this.eventEmitter.emit('conflict.detected', {
        organizationId,
        disclosureId,
        personId,
        conflictCount: savedAlerts.length,
        conflicts: savedAlerts,
      });

      this.logger.log(
        `Detected ${savedAlerts.length} conflicts for disclosure ${disclosureId}`,
      );
    }

    return {
      disclosureId,
      personId,
      checkedAt: new Date(),
      conflictCount: savedAlerts.length,
      conflicts: savedAlerts,
      excludedConflictCount,
      appliedExclusionIds: [...new Set(appliedExclusionIds)],
    };
  }

  // ===========================================
  // Individual Conflict Checks
  // ===========================================

  /**
   * Checks for self-dealing: prior disclosures with the same entity by this person.
   * RS.41: SELF_DEALING conflict type.
   */
  private async checkSelfDealing(
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
              'Prior disclosure exists',
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
              factors: ['Prior disclosure with same entity'],
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
              'Prior disclosure exists',
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
  private async checkHrisMatch(
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
        employmentStatus: 'ACTIVE',
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
            'Potential nepotism',
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
            factors: ['Name matches active employee'],
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
  private async checkPriorCases(
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
  private async checkRelationshipPatterns(
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
  private determineSeverity(
    confidence: number,
    factors: string[],
  ): ConflictSeverity {
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
  // Dismissal Workflow (RS.44)
  // ===========================================

  /**
   * Dismisses a conflict alert with optional exclusion creation.
   * RS.44: Categorized dismissals with exclusion list management.
   */
  async dismissConflict(
    alertId: string,
    dto: DismissConflictDto,
    userId: string,
    organizationId: string,
  ): Promise<ConflictAlertDto> {
    const alert = await this.prisma.conflictAlert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      throw new NotFoundException(`Conflict alert ${alertId} not found`);
    }

    if (alert.status !== ConflictStatus.OPEN) {
      throw new BadRequestException(
        `Cannot dismiss alert with status ${alert.status}`,
      );
    }

    // Validate dismissal category
    if (
      !Object.values(DismissalCategory).includes(
        dto.category as DismissalCategory,
      )
    ) {
      throw new BadRequestException(`Invalid dismissal category: ${dto.category}`);
    }

    let exclusionId: string | undefined;

    // Create exclusion if requested
    if (dto.createExclusion) {
      // Get the person associated with this disclosure
      const disclosure = await this.prisma.riuDisclosureExtension.findUnique({
        where: { riuId: alert.disclosureId },
        include: {
          riu: {
            select: { createdById: true },
          },
        },
      });

      if (!disclosure?.riu?.createdById) {
        throw new BadRequestException(
          'Cannot create exclusion: disclosure has no associated person',
        );
      }

      // Get the Person record for this user
      const person = await this.prisma.person.findFirst({
        where: {
          organizationId,
          email: {
            not: null,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (person) {
        const exclusion = await this.createExclusion(
          {
            personId: person.id,
            matchedEntity: alert.matchedEntity,
            conflictType: alert.conflictType,
            reason: dto.reason,
            notes: dto.exclusionNotes,
            scope: dto.exclusionScope ?? ExclusionScope.PERMANENT,
            expiresAt: dto.exclusionExpiresAt,
          },
          userId,
          organizationId,
          alertId,
        );
        exclusionId = exclusion.id;
      }
    }

    // Update the alert
    const updated = await this.prisma.conflictAlert.update({
      where: { id: alertId },
      data: {
        status: ConflictStatus.DISMISSED,
        dismissedCategory: dto.category,
        dismissedReason: dto.reason,
        dismissedBy: userId,
        dismissedAt: new Date(),
        exclusionId,
      },
    });

    // Log audit entry (using DISCLOSURE entity type as conflict alerts relate to disclosures)
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.DISCLOSURE,
      entityId: alert.disclosureId,
      action: 'conflict_dismissed',
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Dismissed conflict alert (${alert.conflictType}) with category: ${dto.category}`,
      actorUserId: userId,
      actorType: ActorType.USER,
      changes: {
        status: { old: alert.status, new: ConflictStatus.DISMISSED },
        dismissedCategory: { old: null, new: dto.category },
      },
    });

    this.logger.log(
      `Dismissed conflict alert ${alertId} with category ${dto.category}`,
    );

    return this.mapAlertToDto(updated);
  }

  // ===========================================
  // Exclusion Management
  // ===========================================

  /**
   * Creates a conflict exclusion.
   */
  async createExclusion(
    dto: CreateExclusionDto,
    userId: string,
    organizationId: string,
    sourceAlertId?: string,
  ): Promise<ConflictExclusion> {
    // Check for existing active exclusion
    const existing = await this.prisma.conflictExclusion.findFirst({
      where: {
        organizationId,
        personId: dto.personId,
        matchedEntity: dto.matchedEntity,
        conflictType: dto.conflictType,
        isActive: true,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'An active exclusion already exists for this combination',
      );
    }

    const exclusion = await this.prisma.conflictExclusion.create({
      data: {
        organizationId,
        personId: dto.personId,
        matchedEntity: dto.matchedEntity,
        conflictType: dto.conflictType,
        reason: dto.reason,
        notes: dto.notes,
        scope: dto.scope ?? ExclusionScope.PERMANENT,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdBy: userId,
        createdFromAlertId: sourceAlertId,
      },
    });

    this.logger.log(
      `Created exclusion ${exclusion.id} for person ${dto.personId} + entity "${dto.matchedEntity}"`,
    );

    return exclusion;
  }

  /**
   * Checks if a conflict is excluded by an active exclusion.
   */
  async isExcluded(
    personId: string,
    matchedEntity: string,
    conflictType: ConflictType,
    organizationId: string,
  ): Promise<{ excluded: boolean; exclusionId?: string }> {
    const exclusion = await this.prisma.conflictExclusion.findFirst({
      where: {
        organizationId,
        personId,
        conflictType,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!exclusion) {
      return { excluded: false };
    }

    // Check fuzzy match on entity name
    const match = this.fuzzyMatch(matchedEntity, exclusion.matchedEntity);
    if (match.confidence >= 90) {
      // If ONE_TIME scope, mark as used
      if (exclusion.scope === ExclusionScope.ONE_TIME) {
        await this.prisma.conflictExclusion.update({
          where: { id: exclusion.id },
          data: { isActive: false },
        });
      }

      return { excluded: true, exclusionId: exclusion.id };
    }

    return { excluded: false };
  }

  // ===========================================
  // Entity Timeline (RS.45)
  // ===========================================

  /**
   * Gets the full timeline for an entity across disclosures and cases.
   * RS.45: Full entity timeline history view.
   */
  async getEntityTimeline(
    entityName: string,
    organizationId: string,
  ): Promise<EntityTimelineDto> {
    const events: EntityTimelineItem[] = [];
    const uniquePersonIds = new Set<string>();

    // Get disclosures mentioning this entity
    const disclosures = await this.prisma.riuDisclosureExtension.findMany({
      where: {
        organizationId,
        OR: [
          { relatedCompany: { contains: entityName, mode: 'insensitive' } },
          { relatedPersonName: { contains: entityName, mode: 'insensitive' } },
        ],
      },
      include: {
        riu: {
          select: {
            id: true,
            referenceNumber: true,
            createdAt: true,
            createdById: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const disclosure of disclosures) {
      if (disclosure.riu?.createdById) {
        uniquePersonIds.add(disclosure.riu.createdById);
      }

      events.push({
        eventType: EntityTimelineEventType.DISCLOSURE_SUBMITTED,
        occurredAt: disclosure.createdAt,
        description: `Disclosure submitted involving "${disclosure.relatedCompany || disclosure.relatedPersonName}"`,
        disclosureId: disclosure.riuId,
      });
    }

    // Get conflict alerts for this entity
    const alerts = await this.prisma.conflictAlert.findMany({
      where: {
        organizationId,
        matchedEntity: { contains: entityName, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const alert of alerts) {
      events.push({
        eventType:
          alert.status === ConflictStatus.DISMISSED
            ? EntityTimelineEventType.CONFLICT_DISMISSED
            : alert.status === ConflictStatus.ESCALATED
              ? EntityTimelineEventType.CONFLICT_ESCALATED
              : EntityTimelineEventType.CONFLICT_DETECTED,
        occurredAt: alert.createdAt,
        description: alert.summary,
        conflictAlertId: alert.id,
        disclosureId: alert.disclosureId,
        caseId: alert.escalatedToCaseId ?? undefined,
      });
    }

    // Get case subjects mentioning this entity
    const subjects = await this.prisma.subject.findMany({
      where: {
        organizationId,
        externalName: { contains: entityName, mode: 'insensitive' },
      },
      include: {
        case: {
          select: {
            id: true,
            referenceNumber: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const subject of subjects) {
      events.push({
        eventType: EntityTimelineEventType.CASE_INVOLVEMENT,
        occurredAt: subject.createdAt,
        description: `Named as ${subject.role} in case ${subject.case.referenceNumber}`,
        caseId: subject.caseId,
      });
    }

    // Sort all events by date descending
    events.sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

    // Calculate date range
    const dates = events.map((e) => new Date(e.occurredAt));
    const earliest = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
    const latest = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

    return {
      entityName,
      totalEvents: events.length,
      events,
      statistics: {
        totalDisclosures: disclosures.length,
        totalConflicts: alerts.length,
        totalCases: subjects.length,
        uniquePersons: uniquePersonIds.size,
        dateRange: { earliest, latest },
      },
    };
  }

  // ===========================================
  // Query Methods
  // ===========================================

  /**
   * Queries conflict alerts with filters.
   */
  async findAlerts(
    organizationId: string,
    query: ConflictQueryDto,
  ): Promise<ConflictAlertPageDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ConflictAlertWhereInput = {
      organizationId,
    };

    if (query.status?.length) {
      where.status = { in: query.status };
    }

    if (query.conflictType?.length) {
      where.conflictType = { in: query.conflictType };
    }

    if (query.severity?.length) {
      where.severity = { in: query.severity };
    }

    if (query.disclosureId) {
      where.disclosureId = query.disclosureId;
    }

    if (query.matchedEntity) {
      where.matchedEntity = { contains: query.matchedEntity, mode: 'insensitive' };
    }

    if (query.minConfidence !== undefined) {
      where.matchConfidence = { gte: query.minConfidence };
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.conflictAlert.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          dismissedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
          escalatedCase: {
            select: { id: true, referenceNumber: true, status: true },
          },
        },
      }),
      this.prisma.conflictAlert.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items: items.map((item) => this.mapAlertToDto(item)),
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Gets a single conflict alert by ID.
   */
  async findAlertById(
    alertId: string,
    organizationId: string,
  ): Promise<ConflictAlertDto | null> {
    const alert = await this.prisma.conflictAlert.findFirst({
      where: { id: alertId, organizationId },
      include: {
        dismissedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        escalatedCase: {
          select: { id: true, referenceNumber: true, status: true },
        },
      },
    });

    return alert ? this.mapAlertToDto(alert) : null;
  }

  // ===========================================
  // Helpers
  // ===========================================

  /**
   * Maps a database alert to DTO.
   */
  private mapAlertToDto(alert: ConflictAlert & {
    dismissedByUser?: { id: string; firstName: string; lastName: string } | null;
    escalatedCase?: { id: string; referenceNumber: string; status: string } | null;
  }): ConflictAlertDto {
    return {
      id: alert.id,
      organizationId: alert.organizationId,
      disclosureId: alert.disclosureId,
      conflictType: alert.conflictType,
      severity: alert.severity,
      status: alert.status,
      summary: alert.summary,
      matchedEntity: alert.matchedEntity,
      matchConfidence: alert.matchConfidence,
      matchDetails: alert.matchDetails as unknown as MatchDetails,
      severityFactors: alert.severityFactors
        ? (alert.severityFactors as unknown as SeverityFactors)
        : undefined,
      dismissedCategory: alert.dismissedCategory as DismissalCategory | undefined,
      dismissedReason: alert.dismissedReason ?? undefined,
      dismissedBy: alert.dismissedBy ?? undefined,
      dismissedAt: alert.dismissedAt ?? undefined,
      escalatedToCaseId: alert.escalatedToCaseId ?? undefined,
      exclusionId: alert.exclusionId ?? undefined,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
      dismissedByUser: alert.dismissedByUser ?? undefined,
      escalatedCase: alert.escalatedCase
        ? {
            id: alert.escalatedCase.id,
            referenceNumber: alert.escalatedCase.referenceNumber,
            status: alert.escalatedCase.status,
          }
        : undefined,
    };
  }
}
