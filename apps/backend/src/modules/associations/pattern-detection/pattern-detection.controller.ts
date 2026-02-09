import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { TenantId } from "../../../common/decorators/tenant-id.decorator";
import {
  PatternDetectionService,
  PersonInvolvementSummary,
  PatternSearchResult,
  ReporterHistoryBadge,
} from "./pattern-detection.service";
import { PersonCaseLabel } from "@prisma/client";

/**
 * PatternDetectionController exposes pattern detection queries via REST API.
 *
 * These endpoints power the "wow moment" demos where compliance officers
 * can instantly see a person's involvement across all cases.
 *
 * All endpoints require authentication and are scoped by tenant.
 *
 * @example
 * // Get person involvement summary (the "wow" query)
 * GET /api/v1/patterns/person/:personId/involvement
 *
 * // Get reporter history badge for triage view
 * GET /api/v1/patterns/person/:personId/reporter-history?excludeRiuId=...
 *
 * // Find repeat subjects/witnesses
 * GET /api/v1/patterns/repeat-involvements?label=SUBJECT&minCount=3
 *
 * // Get related cases
 * GET /api/v1/patterns/case/:caseId/related
 */
@Controller("patterns")
@UseGuards(JwtAuthGuard)
export class PatternDetectionController {
  constructor(private readonly patternService: PatternDetectionService) {}

  /**
   * Get involvement summary for a person.
   *
   * Returns total case count and breakdown by role (SUBJECT, WITNESS, etc.)
   * with evidentiary status sub-counts.
   *
   * This is THE "wow moment" query per CONTEXT.md.
   */
  @Get("person/:personId/involvement")
  async getPersonInvolvement(
    @Param("personId") personId: string,
    @TenantId() organizationId: string,
  ): Promise<PersonInvolvementSummary> {
    return this.patternService.getPersonInvolvementSummary(
      personId,
      organizationId,
    );
  }

  /**
   * Get reporter history badge data.
   *
   * Returns count of previous reports from this person for display
   * in triage view ("3 previous reports from this person").
   */
  @Get("person/:personId/reporter-history")
  async getReporterHistory(
    @Param("personId") personId: string,
    @Query("excludeRiuId") excludeRiuId: string | undefined,
    @TenantId() organizationId: string,
  ): Promise<ReporterHistoryBadge> {
    return this.patternService.getReporterHistory(
      personId,
      excludeRiuId || null,
      organizationId,
    );
  }

  /**
   * Find cases involving a person in any role.
   *
   * Simple person-to-case lookup with pagination.
   */
  @Get("person/:personId/cases")
  async findCasesByPerson(
    @Param("personId") personId: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @TenantId() organizationId: string,
  ): Promise<PatternSearchResult> {
    return this.patternService.findCasesByPerson(personId, organizationId, {
      limit,
      offset,
    });
  }

  /**
   * Find repeat subjects/witnesses across cases.
   *
   * Returns persons who appear in multiple cases with the specified role.
   * Useful for identifying concerning patterns.
   *
   * @param label - Role to search for (SUBJECT, WITNESS, REPORTER, etc.)
   * @param minCount - Minimum case count to be considered "repeat" (default: 2)
   */
  @Get("repeat-involvements")
  async findRepeatInvolvements(
    @Query("label") label: string,
    @Query("minCount", new DefaultValuePipe(2), ParseIntPipe) minCount: number,
    @TenantId() organizationId: string,
  ): Promise<Array<{ personId: string; personName: string; caseCount: number }>> {
    // Validate label is a valid PersonCaseLabel
    const validLabels = Object.values(PersonCaseLabel);
    if (!validLabels.includes(label as PersonCaseLabel)) {
      throw new BadRequestException(
        `Invalid label. Valid values: ${validLabels.join(", ")}`,
      );
    }

    return this.patternService.findRepeatInvolvements(
      label as PersonCaseLabel,
      minCount,
      organizationId,
    );
  }

  /**
   * Get related cases for a given case.
   *
   * Returns all cases linked via CaseCaseAssociation (parent/child, splits, etc.)
   */
  @Get("case/:caseId/related")
  async getRelatedCases(
    @Param("caseId") caseId: string,
    @TenantId() organizationId: string,
  ): Promise<Array<{ caseId: string; referenceNumber: string; label: string }>> {
    return this.patternService.getRelatedCases(caseId, organizationId);
  }
}
