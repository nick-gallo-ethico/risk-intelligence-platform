import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../../common/decorators";
import { RequestUser } from "../../auth/interfaces/jwt-payload.interface";
import { PersonCaseAssociationService } from "./person-case-association.service";
import { CreatePersonCaseAssociationDto } from "./dto";

/**
 * REST API controller for person-case associations.
 *
 * Per HubSpot V4 Associations pattern, associations are first-class entities
 * with labels, metadata, and distinct semantics based on the association type.
 *
 * Routes are nested under /cases/:caseId/persons for intuitive REST structure:
 * - GET /cases/:caseId/persons - List all persons connected to a case
 * - POST /cases/:caseId/persons - Add a person to a case with a role/label
 * - DELETE /cases/:caseId/persons/:associationId - Remove person from case
 *
 * All endpoints require authentication and are scoped to user's organization.
 */
@ApiTags("Case Associations")
@ApiBearerAuth("JWT")
@Controller("cases")
@UseGuards(JwtAuthGuard, TenantGuard)
export class PersonCaseAssociationController {
  constructor(
    private readonly personCaseAssociationService: PersonCaseAssociationService,
  ) {}

  /**
   * GET /api/v1/cases/:caseId/persons
   * Returns all persons connected to a case with their roles/labels.
   */
  @Get(":caseId/persons")
  @ApiOperation({
    summary: "Get connected people for a case",
    description:
      "Returns all persons associated with the case, including evidentiary subjects (REPORTER, SUBJECT, WITNESS) and role assignments (INVESTIGATOR, LEGAL_COUNSEL, etc.)",
  })
  @ApiParam({ name: "caseId", description: "Case UUID" })
  @ApiResponse({
    status: 200,
    description: "List of person-case associations with person details",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Case not found" })
  async findByCase(
    @Param("caseId", ParseUUIDPipe) caseId: string,
    @TenantId() organizationId: string,
  ) {
    return this.personCaseAssociationService.findByCase(caseId, organizationId);
  }

  /**
   * POST /api/v1/cases/:caseId/persons
   * Adds a person to a case with a specific role/label.
   *
   * For evidentiary labels (REPORTER, SUBJECT, WITNESS), automatically sets
   * evidentiaryStatus to ACTIVE if not specified.
   *
   * For role labels (ASSIGNED_INVESTIGATOR, LEGAL_COUNSEL, etc.), sets
   * startedAt to current timestamp.
   */
  @Post(":caseId/persons")
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.SYSTEM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Add person to case",
    description:
      "Creates an association between a person and a case with the specified label/role. Evidentiary associations (REPORTER, SUBJECT, WITNESS) track investigation outcomes. Role associations (INVESTIGATOR, COUNSEL) track active assignments.",
  })
  @ApiParam({ name: "caseId", description: "Case UUID" })
  @ApiResponse({ status: 201, description: "Association created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async create(
    @Param("caseId", ParseUUIDPipe) caseId: string,
    @Body() dto: CreatePersonCaseAssociationDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.personCaseAssociationService.create(
      {
        ...dto,
        caseId,
      },
      user.id,
      organizationId,
    );
  }

  /**
   * DELETE /api/v1/cases/:caseId/persons/:associationId
   * Removes a person-case association.
   *
   * Note: For evidentiary associations, consider updating status to CLEARED
   * rather than deleting, to maintain audit trail.
   */
  @Delete(":caseId/persons/:associationId")
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.SYSTEM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Remove person from case",
    description:
      "Deletes the association between a person and a case. For evidentiary associations, consider updating status instead to maintain audit trail.",
  })
  @ApiParam({ name: "caseId", description: "Case UUID" })
  @ApiParam({ name: "associationId", description: "Association UUID" })
  @ApiResponse({ status: 200, description: "Association removed successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Association not found" })
  async remove(
    @Param("caseId", ParseUUIDPipe) caseId: string,
    @Param("associationId", ParseUUIDPipe) associationId: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    // Note: caseId is included in route for RESTful nesting but not used in delete
    // The associationId uniquely identifies the record
    return this.personCaseAssociationService.remove(
      associationId,
      user.id,
      organizationId,
    );
  }
}
