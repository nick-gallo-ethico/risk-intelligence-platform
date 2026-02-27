import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RulesEngineService } from "../engine/rules-engine.service";
import type {
  RuleConditions,
  RuleAction,
  RuleTestResult,
  RuleTestSample,
} from "../types/rule.types";

/**
 * Options for rule testing.
 */
export interface TestRuleOptions {
  /** Maximum number of historical cases to test against */
  limit?: number;
  /** Only test against cases created after this date */
  dateFrom?: Date;
  /** Only test against cases in specific categories */
  categoryIds?: string[];
  /** Only test against cases with specific severities */
  severities?: string[];
}

/**
 * Internal type for historical case data loaded from database.
 */
interface HistoricalCase {
  id: string;
  referenceNumber: string;
  severity: string;
  sourceChannel: string;
  primaryCategoryId: string | null;
  locationName: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  createdAt: Date;
  primaryCategory: {
    id: string;
    name: string;
    parentCategoryId: string | null;
  } | null;
}

/**
 * RuleTesterService enables preview/testing of rules against historical data.
 *
 * Key features:
 * - Dry-run evaluation (no actions executed)
 * - Match rate calculation
 * - Sample case previews with predicted outcomes
 * - Test results saved to rule definition
 *
 * This implements RULE-07 from requirements:
 * "Admin can preview a rule against historical cases before activating"
 *
 * IMPORTANT: Testing does NOT execute actions - it only evaluates conditions.
 */
@Injectable()
export class RuleTesterService {
  private readonly logger = new Logger(RuleTesterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesEngine: RulesEngineService,
  ) {}

  /**
   * Test a persisted rule against historical cases.
   *
   * @param ruleId - ID of the rule to test
   * @param organizationId - Tenant ID (CRITICAL for isolation)
   * @param options - Test options (limit, dateFrom, categoryIds, severities)
   * @returns Test results with match statistics and samples
   */
  async testRule(
    ruleId: string,
    organizationId: string,
    options: TestRuleOptions = {},
  ): Promise<RuleTestResult> {
    const rule = await this.prisma.ruleDefinition.findFirst({
      where: {
        id: ruleId,
        organizationId,
      },
    });

    if (!rule) {
      throw new NotFoundException(`Rule ${ruleId} not found`);
    }

    const conditions = rule.conditions as unknown as RuleConditions;
    const actions = rule.actions as unknown as RuleAction[];

    return this.testRuleDefinition(
      { conditions, actions, priority: rule.priority },
      organizationId,
      options,
    );
  }

  /**
   * Test a rule definition (not yet persisted) against historical cases.
   * Useful for validating rules during creation before saving.
   *
   * @param ruleDefinition - Rule conditions, actions, and priority
   * @param organizationId - Tenant ID (CRITICAL for isolation)
   * @param options - Test options
   * @returns Test results with match rate, matched count, and samples
   */
  async testRuleDefinition(
    ruleDefinition: {
      conditions: RuleConditions;
      actions: RuleAction[];
      priority?: number;
    },
    organizationId: string,
    options: TestRuleOptions = {},
  ): Promise<RuleTestResult> {
    const startTime = Date.now();
    const limit = options.limit || 100;

    // Load historical cases for simulation (tenant-scoped!)
    const historicalCases = await this.loadHistoricalCases(
      organizationId,
      limit,
      options,
    );

    if (historicalCases.length === 0) {
      this.logger.debug(
        `No historical cases found for org ${organizationId} with given filters`,
      );
      return {
        totalCases: 0,
        matchedCases: 0,
        matchRate: 0,
        samples: [],
        testedAt: new Date(),
      };
    }

    const samples: RuleTestSample[] = [];
    let matchedCount = 0;

    // Evaluate each historical case against the rule
    for (const caseRecord of historicalCases) {
      const facts = this.buildFactsFromCase(caseRecord);

      // Evaluate rule WITHOUT executing actions (dry run)
      const wouldMatch = await this.rulesEngine.evaluateRule(
        {
          conditions: ruleDefinition.conditions,
          priority: ruleDefinition.priority,
        },
        facts,
        { dryRun: true },
      );

      if (wouldMatch) {
        matchedCount++;
      }

      // Collect samples: first 10 matched and first 10 unmatched
      const matchedSamples = samples.filter((s) => s.wouldMatch).length;
      const unmatchedSamples = samples.filter((s) => !s.wouldMatch).length;

      const shouldCollectSample =
        (wouldMatch && matchedSamples < 10) ||
        (!wouldMatch && unmatchedSamples < 10);

      if (shouldCollectSample) {
        samples.push({
          caseId: caseRecord.id,
          referenceNumber: caseRecord.referenceNumber,
          wouldMatch,
          currentAssignee: null, // Case doesn't have assignedToId in schema yet
          predictedAssignee: wouldMatch
            ? this.predictAssignee(ruleDefinition.actions)
            : null,
          caseDetails: {
            severity: caseRecord.severity,
            categoryName: caseRecord.primaryCategory?.name ?? null,
            locationName: caseRecord.locationName,
            createdAt: caseRecord.createdAt,
          },
        });
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const matchRate =
      historicalCases.length > 0
        ? (matchedCount / historicalCases.length) * 100
        : 0;

    this.logger.log(
      `Rule test completed: ${matchedCount}/${historicalCases.length} matches ` +
        `(${matchRate.toFixed(1)}%) in ${executionTimeMs}ms`,
    );

    return {
      totalCases: historicalCases.length,
      matchedCases: matchedCount,
      matchRate,
      samples: samples.slice(0, 20), // Limit to 20 total samples
      testedAt: new Date(),
    };
  }

  /**
   * Test a rule and save results to the rule definition.
   * Stores test results for later review without re-running the test.
   *
   * @param ruleId - ID of the rule to test
   * @param organizationId - Tenant ID
   * @param options - Test options
   * @returns Test results (also persisted to rule.testResults)
   */
  async testAndSaveResults(
    ruleId: string,
    organizationId: string,
    options: TestRuleOptions = {},
  ): Promise<RuleTestResult> {
    const result = await this.testRule(ruleId, organizationId, options);

    // Save test results to rule definition for later review
    await this.prisma.ruleDefinition.update({
      where: { id: ruleId },
      data: {
        lastTestedAt: result.testedAt,
        testResults: result as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Saved test results for rule ${ruleId}`);

    return result;
  }

  /**
   * Load historical cases for testing.
   * Applies tenant isolation and optional filters.
   *
   * @param organizationId - Tenant ID
   * @param limit - Maximum number of cases to load
   * @param options - Filter options
   * @returns Array of historical cases with category relations
   */
  private async loadHistoricalCases(
    organizationId: string,
    limit: number,
    options: TestRuleOptions,
  ): Promise<HistoricalCase[]> {
    const where: Record<string, unknown> = {
      organizationId,
    };

    // Apply date filter
    if (options.dateFrom) {
      where.createdAt = { gte: options.dateFrom };
    }

    // Apply category filter
    if (options.categoryIds?.length) {
      where.primaryCategoryId = { in: options.categoryIds };
    }

    // Apply severity filter
    if (options.severities?.length) {
      where.severity = { in: options.severities };
    }

    const cases = await this.prisma.case.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        referenceNumber: true,
        severity: true,
        sourceChannel: true,
        primaryCategoryId: true,
        locationName: true,
        locationCity: true,
        locationState: true,
        locationCountry: true,
        createdAt: true,
        primaryCategory: {
          select: {
            id: true,
            name: true,
            parentCategoryId: true,
          },
        },
      },
    });

    // Map to match HistoricalCase interface structure
    return cases.map((c) => ({
      id: c.id,
      referenceNumber: c.referenceNumber,
      severity: c.severity,
      sourceChannel: c.sourceChannel,
      primaryCategoryId: c.primaryCategoryId,
      locationName: c.locationName,
      locationCity: c.locationCity,
      locationState: c.locationState,
      locationCountry: c.locationCountry,
      createdAt: c.createdAt,
      primaryCategory: c.primaryCategory
        ? {
            id: c.primaryCategory.id,
            name: c.primaryCategory.name,
            parentCategoryId: c.primaryCategory.parentCategoryId,
          }
        : null,
    }));
  }

  /**
   * Build facts from a historical case for rule evaluation.
   * Facts structure matches what CaseRoutingListener would produce.
   *
   * @param caseRecord - Historical case record
   * @returns Facts object for rule engine evaluation
   */
  private buildFactsFromCase(
    caseRecord: HistoricalCase,
  ): Record<string, unknown> {
    return {
      // Flat facts for simple conditions
      caseId: caseRecord.id,
      referenceNumber: caseRecord.referenceNumber,
      severity: caseRecord.severity,
      categoryId: caseRecord.primaryCategoryId,
      categoryName: caseRecord.primaryCategory?.name ?? null,
      parentCategoryId: caseRecord.primaryCategory?.parentCategoryId ?? null,
      sourceChannel: caseRecord.sourceChannel,
      locationName: caseRecord.locationName,
      locationCity: caseRecord.locationCity,
      locationState: caseRecord.locationState,
      locationCountry: caseRecord.locationCountry,

      // Nested structure for path-based conditions (json-rules-engine path support)
      case: {
        id: caseRecord.id,
        severity: caseRecord.severity,
        categoryId: caseRecord.primaryCategoryId,
        sourceChannel: caseRecord.sourceChannel,
      },
      category: {
        id: caseRecord.primaryCategoryId,
        name: caseRecord.primaryCategory?.name ?? null,
        parentId: caseRecord.primaryCategory?.parentCategoryId ?? null,
      },
      location: {
        name: caseRecord.locationName,
        city: caseRecord.locationCity,
        state: caseRecord.locationState,
        country: caseRecord.locationCountry,
      },
    };
  }

  /**
   * Predict assignee based on rule actions.
   * Returns a human-readable description of what would happen.
   *
   * @param actions - Rule actions to analyze
   * @returns Description of predicted assignment or null
   */
  private predictAssignee(actions: RuleAction[]): string | null {
    for (const action of actions) {
      switch (action.type) {
        case "assign_user":
          return `User: ${action.params.userId}`;
        case "assign_team":
          return `Team: ${action.params.teamId}`;
        case "round_robin":
          return `Round-robin: Team ${action.params.teamId}`;
        default:
          // Continue to next action type
          continue;
      }
    }
    return null;
  }
}
