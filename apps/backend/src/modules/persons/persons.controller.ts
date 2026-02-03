import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
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
import { Person } from "@prisma/client";
import { PersonsService } from "./persons.service";
import { CreatePersonDto, UpdatePersonDto, PersonQueryDto } from "./dto";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";

/**
 * REST API controller for person management.
 * Person is the foundation for people-based pattern detection.
 * All endpoints require authentication and are scoped to user's organization.
 */
@ApiTags("Persons")
@ApiBearerAuth("JWT")
@Controller("api/v1/persons")
@UseGuards(JwtAuthGuard, TenantGuard)
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  /**
   * POST /api/v1/persons
   * Creates a new person record.
   */
  @Post()
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.TRIAGE_LEAD)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a new person",
    description:
      "Creates a new person record (employee, external contact, or anonymous placeholder)",
  })
  @ApiResponse({ status: 201, description: "Person created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({
    status: 409,
    description: "Conflict - email already exists in organization",
  })
  async create(
    @Body() dto: CreatePersonDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Person> {
    return this.personsService.create(dto, user.id, organizationId);
  }

  /**
   * GET /api/v1/persons
   * Returns paginated list of persons with optional filtering.
   */
  @Get()
  @ApiOperation({
    summary: "List persons",
    description:
      "Returns paginated list of persons with optional filtering by type, source, status",
  })
  @ApiResponse({
    status: 200,
    description: "List of persons with pagination",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @Query() query: PersonQueryDto,
    @TenantId() organizationId: string,
  ): Promise<{ data: Person[]; total: number; limit: number; offset: number }> {
    return this.personsService.findAll(query, organizationId);
  }

  /**
   * GET /api/v1/persons/anonymous-placeholder
   * Gets or creates the singleton anonymous placeholder for pattern detection.
   */
  @Get("anonymous-placeholder")
  @ApiOperation({
    summary: "Get anonymous placeholder",
    description:
      "Gets or creates the singleton anonymous placeholder used for pattern detection on anonymous reports",
  })
  @ApiResponse({
    status: 200,
    description: "Anonymous placeholder person record",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getAnonymousPlaceholder(
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Person> {
    return this.personsService.getOrCreateAnonymousPlaceholder(
      organizationId,
      user.id,
    );
  }

  /**
   * GET /api/v1/persons/:id
   * Returns a single person by ID.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get person by ID",
    description: "Returns a single person by its UUID",
  })
  @ApiParam({ name: "id", description: "Person UUID" })
  @ApiResponse({ status: 200, description: "Person found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Person not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<Person> {
    return this.personsService.findOne(id, organizationId);
  }

  /**
   * PATCH /api/v1/persons/:id
   * Updates a person record.
   */
  @Patch(":id")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Update person",
    description:
      "Updates a person record. Note: type and source cannot be changed after creation.",
  })
  @ApiParam({ name: "id", description: "Person UUID" })
  @ApiResponse({ status: 200, description: "Person updated successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Person not found" })
  @ApiResponse({
    status: 409,
    description: "Conflict - email already exists in organization",
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Person> {
    return this.personsService.update(id, dto, user.id, organizationId);
  }
}
