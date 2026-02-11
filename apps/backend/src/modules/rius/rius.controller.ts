import {
  Controller,
  Get,
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
import { RiusService } from "./rius.service";
import { JwtAuthGuard, TenantGuard } from "../../common/guards";
import { TenantId } from "../../common/decorators";
import { RiuFormDataResponse } from "./types/riu-form-data.types";

/**
 * REST API controller for RIU (Risk Intelligence Unit) operations.
 * All endpoints require authentication and are scoped to user's organization.
 *
 * For public anonymous access endpoints, see RiuAccessController.
 */
@ApiTags("RIUs")
@ApiBearerAuth("JWT")
@Controller("rius")
@UseGuards(JwtAuthGuard, TenantGuard)
export class RiusController {
  constructor(private readonly riusService: RiusService) {}

  /**
   * GET /api/v1/rius/:id/form-data
   * Returns the RIU's intake form data organized by logical sections.
   *
   * Section structure varies by RIU type:
   * - HOTLINE_REPORT: Report Info, Reporter Details, Incident Details, Classification, Processing
   * - WEB_FORM_SUBMISSION: Submission Info, Reporter Details, Report Details, Classification
   * - DISCLOSURE_RESPONSE: Disclosure Info, Disclosure Details, Classification
   */
  @Get(":id/form-data")
  @ApiOperation({ summary: "Get RIU form data organized by section" })
  @ApiParam({
    name: "id",
    description: "RIU UUID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "RIU form data structured by sections",
  })
  @ApiResponse({
    status: 404,
    description: "RIU not found",
  })
  async getFormData(
    @TenantId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<RiuFormDataResponse> {
    return this.riusService.getFormData(organizationId, id);
  }
}
