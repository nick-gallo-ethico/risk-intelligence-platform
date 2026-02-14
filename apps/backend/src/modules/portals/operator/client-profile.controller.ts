/**
 * ClientProfileController - API Endpoints for Client Profile Lookup
 *
 * Provides endpoints for operators to look up clients by phone number
 * and retrieve full client profiles including QA configuration.
 *
 * Operator Endpoints (cross-tenant access):
 * - GET /api/v1/operator/lookup/phone/:phoneNumber - Look up client by phone
 * - GET /api/v1/operator/clients/:clientId/profile - Get full client profile
 * - GET /api/v1/operator/clients - List all clients (for manual lookup)
 *
 * Admin Endpoints (client configuration):
 * - POST /api/v1/admin/clients/:clientId/hotline-numbers - Add hotline number
 * - DELETE /api/v1/admin/clients/:clientId/hotline-numbers/:numberId - Remove hotline number
 * - PUT /api/v1/admin/clients/:clientId/qa-config - Update QA configuration
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
} from "@nestjs/common";
import { ClientProfileService } from "./client-profile.service";
import {
  CreateHotlineNumberDto,
  UpdateQaConfigDto,
  ListClientsQueryDto,
} from "./dto/client-profile.dto";
import { JwtAuthGuard, RolesGuard } from "../../../common/guards";
import { Roles, UserRole } from "../../../common/decorators/roles.decorator";
import {
  ClientProfile,
  ClientListResult,
  HotlineNumberInfo,
  QaConfigInfo,
} from "./types/client-profile.types";

/**
 * Controller for operator client lookup endpoints.
 *
 * These endpoints allow operators to identify clients by phone number
 * and load configuration for handling calls.
 */
@Controller("operator")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientLookupController {
  constructor(private readonly clientProfileService: ClientProfileService) {}

  /**
   * GET /api/v1/operator/lookup/phone/:phoneNumber
   *
   * Look up a client by incoming phone number.
   * Phone number can be in any common format - it will be normalized.
   *
   * Requires OPERATOR role for cross-tenant access.
   *
   * @param phoneNumber - Phone number in any format (will be normalized to E.164)
   * @returns Client profile or 404 if not found
   */
  @Get("lookup/phone/:phoneNumber")
  @Roles("OPERATOR" as UserRole, UserRole.SYSTEM_ADMIN)
  async lookupByPhone(
    @Param("phoneNumber") phoneNumber: string,
  ): Promise<ClientProfile> {
    const decodedPhone = decodeURIComponent(phoneNumber);
    const profile =
      await this.clientProfileService.findByPhoneNumber(decodedPhone);

    if (!profile) {
      throw new NotFoundException(
        `No client found for phone number: ${decodedPhone}`,
      );
    }

    return profile;
  }

  /**
   * GET /api/v1/operator/clients/:clientId/profile
   *
   * Get the full profile for a client organization.
   * Includes QA config, hotline numbers, categories, and branding.
   *
   * Requires OPERATOR role for cross-tenant access.
   *
   * @param clientId - Client organization ID
   * @returns Full client profile
   */
  @Get("clients/:clientId/profile")
  @Roles("OPERATOR" as UserRole, UserRole.SYSTEM_ADMIN)
  async getClientProfile(
    @Param("clientId", ParseUUIDPipe) clientId: string,
  ): Promise<ClientProfile> {
    return this.clientProfileService.getClientProfile(clientId);
  }

  /**
   * GET /api/v1/operator/clients
   *
   * List all client organizations for manual lookup.
   * Supports search by name or slug and pagination.
   *
   * Requires OPERATOR role for cross-tenant access.
   *
   * @param query - Search and pagination parameters
   * @returns Paginated list of clients
   */
  @Get("clients")
  @Roles("OPERATOR" as UserRole, UserRole.SYSTEM_ADMIN)
  async listClients(
    @Query() query: ListClientsQueryDto,
  ): Promise<ClientListResult> {
    return this.clientProfileService.listClients(
      query.search,
      query.page,
      query.limit,
    );
  }
}

/**
 * Controller for admin client configuration endpoints.
 *
 * These endpoints allow system admins to manage client
 * hotline numbers and QA configuration.
 */
@Controller("admin/clients/:clientId")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientAdminController {
  constructor(private readonly clientProfileService: ClientProfileService) {}

  /**
   * POST /api/v1/admin/clients/:clientId/hotline-numbers
   *
   * Add a new hotline number for a client organization.
   * Phone number must be unique across all organizations.
   *
   * Requires SYSTEM_ADMIN role.
   *
   * @param clientId - Client organization ID
   * @param dto - Hotline number data
   * @returns Created hotline number
   */
  @Post("hotline-numbers")
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addHotlineNumber(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: CreateHotlineNumberDto,
  ): Promise<HotlineNumberInfo> {
    return this.clientProfileService.addHotlineNumber(clientId, dto);
  }

  /**
   * DELETE /api/v1/admin/clients/:clientId/hotline-numbers/:numberId
   *
   * Remove a hotline number from a client organization.
   *
   * Requires SYSTEM_ADMIN role.
   *
   * @param clientId - Client organization ID
   * @param numberId - Hotline number ID to remove
   */
  @Delete("hotline-numbers/:numberId")
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeHotlineNumber(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Param("numberId", ParseUUIDPipe) numberId: string,
  ): Promise<void> {
    await this.clientProfileService.removeHotlineNumber(clientId, numberId);
  }

  /**
   * PUT /api/v1/admin/clients/:clientId/qa-config
   *
   * Update QA configuration for a client organization.
   * Creates config if it doesn't exist (upsert).
   *
   * Requires SYSTEM_ADMIN role.
   *
   * @param clientId - Client organization ID
   * @param dto - QA configuration update data
   * @returns Updated QA configuration
   */
  @Put("qa-config")
  @Roles(UserRole.SYSTEM_ADMIN)
  async updateQaConfig(
    @Param("clientId", ParseUUIDPipe) clientId: string,
    @Body() dto: UpdateQaConfigDto,
  ): Promise<QaConfigInfo> {
    return this.clientProfileService.updateQaConfig(clientId, dto);
  }
}
