/**
 * Support Tickets Controller
 *
 * REST API endpoints for support ticket management.
 * Users can create tickets and view their own tickets.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../../common/guards/tenant.guard";
import { TenantId } from "../../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { SupportTicketsService } from "../services/support-tickets.service";
import {
  CreateSupportTicketDto,
  TicketQueryDto,
} from "../dto/support-ticket.dto";
import { TicketDetail, TicketListItem } from "../entities/help.types";

@Controller("help/tickets")
@UseGuards(JwtAuthGuard, TenantGuard)
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  /**
   * Create a new support ticket.
   * Auto-generates a unique TICKET-XXXX number.
   *
   * @route POST /api/v1/help/tickets
   * @body subject - Ticket subject (min 5 chars)
   * @body description - Ticket description (min 20 chars)
   * @body priority - Optional priority level
   * @body category - Optional category tag
   */
  @Post()
  async createTicket(
    @TenantId() organizationId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateSupportTicketDto,
  ): Promise<TicketDetail> {
    return this.supportTicketsService.createTicket(organizationId, userId, dto);
  }

  /**
   * Get the current user's support tickets.
   *
   * @route GET /api/v1/help/tickets
   * @query status - Optional status filter
   */
  @Get()
  async getMyTickets(
    @TenantId() organizationId: string,
    @CurrentUser("id") userId: string,
    @Query() query: TicketQueryDto,
  ): Promise<{ tickets: TicketListItem[]; total: number }> {
    return this.supportTicketsService.getMyTickets(
      organizationId,
      userId,
      query.status,
    );
  }

  /**
   * Get a single ticket by ID.
   * Users can only view their own tickets.
   *
   * @route GET /api/v1/help/tickets/:id
   * @param id - Ticket ID
   */
  @Get(":id")
  async getTicketById(
    @TenantId() organizationId: string,
    @CurrentUser("id") userId: string,
    @Param("id") ticketId: string,
  ): Promise<TicketDetail> {
    return this.supportTicketsService.getTicketById(
      organizationId,
      userId,
      ticketId,
    );
  }
}
