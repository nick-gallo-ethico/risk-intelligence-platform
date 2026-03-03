/**
 * DisclosureController provides REST endpoints for disclosure list and detail views.
 *
 * Wires the DisclosureQueryService to the /api/v1/disclosures endpoint
 * expected by the frontend saved views system.
 *
 * Endpoints:
 * - GET /api/v1/disclosures - List disclosures with filters and pagination
 * - GET /api/v1/disclosures/:id - Get single disclosure by ID
 */

import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { DisclosureType } from "@prisma/client";
import { DisclosureQueryService } from "./services/disclosure-query.service";
import {
  DisclosureQueryDto,
  DisclosureResponseDto,
} from "./dto/disclosure-submission.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import { TenantId } from "../../common/decorators/tenant-id.decorator";

@ApiTags("Disclosures")
@ApiBearerAuth("JWT")
@Controller("disclosures")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class DisclosureController {
  constructor(
    private readonly disclosureQueryService: DisclosureQueryService,
  ) {}

  /**
   * List disclosures with filters and pagination.
   * Returns data in the shape expected by the frontend saved views system.
   */
  @Get()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "List disclosures with filters and pagination" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "sortBy", required: false, type: String })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  @ApiQuery({
    name: "disclosureType",
    required: false,
    enum: DisclosureType,
  })
  @ApiQuery({ name: "filters", required: false, type: String })
  @ApiResponse({
    status: 200,
    description: "Paginated list of disclosures",
  })
  async findAll(
    @Query("limit") limit: number | undefined,
    @Query("offset") offset: number | undefined,
    @Query("search") search: string | undefined,
    @Query("sortBy") sortBy: string | undefined,
    @Query("sortOrder") sortOrder: string | undefined,
    @Query("disclosureType") disclosureType: DisclosureType | undefined,
    @Query("filters") filtersJson: string | undefined,
    @TenantId() organizationId: string,
  ) {
    const pageSize = limit ? Number(limit) : 20;
    const page = offset ? Math.floor(Number(offset) / pageSize) + 1 : 1;

    // Build query DTO from incoming params
    const query: DisclosureQueryDto = Object.assign(new DisclosureQueryDto(), {
      page,
      pageSize,
      search,
      sortBy: sortBy as DisclosureQueryDto["sortBy"],
      sortOrder: sortOrder as DisclosureQueryDto["sortOrder"],
      disclosureType,
    });

    // Parse JSON filters from the saved views system
    if (filtersJson) {
      try {
        const conditions = JSON.parse(filtersJson);
        if (Array.isArray(conditions)) {
          for (const condition of conditions) {
            this.applyFilterCondition(query, condition);
          }
        }
      } catch {
        // Invalid JSON filters - ignore
      }
    }

    const result = await this.disclosureQueryService.findMany(
      query,
      organizationId,
    );

    // Map to the shape expected by the frontend:
    // { data: [...], total, page, pageSize }
    return {
      data: result.items.map((item) => this.mapToFrontendShape(item)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  /**
   * Get a single disclosure by ID.
   */
  @Get(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Get disclosure by ID" })
  @ApiParam({ name: "id", type: "string", description: "Disclosure/RIU UUID" })
  @ApiResponse({ status: 200, description: "Disclosure details" })
  @ApiResponse({ status: 404, description: "Disclosure not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<DisclosureResponseDto> {
    const disclosure = await this.disclosureQueryService.getDisclosure(
      id,
      organizationId,
    );
    if (!disclosure) {
      throw new NotFoundException(`Disclosure ${id} not found`);
    }
    return disclosure;
  }

  /**
   * Maps a DisclosureListItemDto to the shape expected by the frontend Disclosure interface.
   */
  private mapToFrontendShape(item: {
    id: string;
    referenceNumber: string;
    status: string;
    disclosureType: string;
    disclosureSubtype?: string;
    disclosureValue?: number;
    disclosureCurrency?: string;
    relatedCompany?: string;
    relatedPersonName?: string;
    thresholdTriggered: boolean;
    conflictDetected: boolean;
    conflictCount: number;
    createdAt: Date;
    submittedAt: Date;
    submittedBy: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }) {
    // Map disclosure types to frontend labels
    const typeMap: Record<string, string> = {
      GIFT: "gift_received",
      COI: "conflict_of_interest",
      OUTSIDE_EMPLOYMENT: "outside_activity",
      POLITICAL: "other",
      CHARITABLE: "other",
      TRAVEL: "entertainment",
    };

    // Map backend status to frontend status
    const statusMap: Record<string, string> = {
      DRAFT: "pending_review",
      SUBMITTED: "pending_review",
      UNDER_REVIEW: "under_review",
      APPROVED: "approved",
      REJECTED: "rejected",
    };

    // Map risk level from conflict/threshold
    let riskLevel = "low";
    if (item.conflictDetected || item.thresholdTriggered) {
      riskLevel = "high";
    } else if (item.disclosureValue && item.disclosureValue > 100) {
      riskLevel = "medium";
    }

    return {
      id: item.id,
      disclosureNumber: item.referenceNumber,
      type: typeMap[item.disclosureType] || item.disclosureType.toLowerCase(),
      status: statusMap[item.status] || "pending_review",
      riskLevel,
      submitter: {
        id: item.submittedBy.id,
        name: `${item.submittedBy.firstName} ${item.submittedBy.lastName}`.trim(),
        email: item.submittedBy.email,
      },
      submittedAt: item.submittedAt.toISOString(),
      giftValue: item.disclosureValue,
      giftDescription: item.disclosureSubtype,
      thirdParty: item.relatedCompany || item.relatedPersonName,
      conflictNature: item.conflictDetected ? "Conflict detected" : undefined,
      conflictCount: item.conflictCount,
      createdAt: item.createdAt.toISOString(),
    };
  }

  /**
   * Apply a single filter condition from the saved views system to the query DTO.
   */
  private applyFilterCondition(
    query: DisclosureQueryDto,
    condition: { propertyId: string; operator: string; value: unknown },
  ) {
    const { propertyId, value } = condition;
    if (value === undefined || value === null || value === "") return;

    switch (propertyId) {
      case "type":
      case "disclosureType": {
        // Map frontend type values back to backend enum
        const frontendToBackend: Record<string, DisclosureType> = {
          conflict_of_interest: DisclosureType.COI,
          gift_received: DisclosureType.GIFT,
          gift_given: DisclosureType.GIFT,
          entertainment: DisclosureType.TRAVEL,
          outside_activity: DisclosureType.OUTSIDE_EMPLOYMENT,
          financial_interest: DisclosureType.COI,
        };
        const mapped = frontendToBackend[value as string];
        if (mapped) query.disclosureType = mapped;
        break;
      }
      case "thresholdTriggered":
        query.thresholdTriggered = value === true || value === "true";
        break;
      case "conflictDetected":
        query.conflictDetected = value === true || value === "true";
        break;
      case "relatedCompany":
      case "thirdParty":
        query.relatedCompany = String(value);
        break;
      case "relatedPersonName":
        query.relatedPersonName = String(value);
        break;
    }
  }
}
