/**
 * Support Tickets Service
 *
 * Service for managing support tickets.
 * Handles ticket creation, retrieval, and user-scoped listing.
 * Auto-generates unique TICKET-XXXX numbers per organization.
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateSupportTicketDto } from "../dto/support-ticket.dto";
import {
  TicketDetail,
  TicketListItem,
  TicketCreatedEvent,
} from "../entities/help.types";
import { TicketStatus } from "@prisma/client";

@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new support ticket.
   * Auto-generates a unique TICKET-XXXX number based on org ticket count.
   *
   * @param organizationId - Current tenant organization ID
   * @param userId - ID of the user creating the ticket
   * @param dto - Ticket creation data
   * @returns Created ticket
   */
  async createTicket(
    organizationId: string,
    userId: string,
    dto: CreateSupportTicketDto,
  ): Promise<TicketDetail> {
    // Count existing tickets for this org to generate next number
    const ticketCount = await this.prisma.supportTicket.count({
      where: { organizationId },
    });

    // Generate ticket number: TICKET-0001, TICKET-0002, etc.
    const ticketNumber = `TICKET-${String(ticketCount + 1).padStart(4, "0")}`;

    // Create the ticket
    const ticket = await this.prisma.supportTicket.create({
      data: {
        organizationId,
        userId,
        ticketNumber,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority,
        category: dto.category,
      },
    });

    this.logger.log(
      `Created support ticket ${ticketNumber} for user ${userId} in org ${organizationId}`,
    );

    // Emit event for notification listener
    const event: TicketCreatedEvent = {
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
      },
      organizationId,
      userId,
    };

    this.eventEmitter.emit("support.ticket.created", event);

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
    };
  }

  /**
   * Get tickets for the current user.
   *
   * @param organizationId - Current tenant organization ID
   * @param userId - ID of the user
   * @param status - Optional status filter
   * @returns User's tickets with total count
   */
  async getMyTickets(
    organizationId: string,
    userId: string,
    status?: TicketStatus,
  ): Promise<{ tickets: TicketListItem[]; total: number }> {
    const where: any = {
      organizationId,
      userId,
    };

    if (status) {
      where.status = status;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          priority: true,
          category: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    this.logger.debug(
      `Found ${total} tickets for user ${userId} in org ${organizationId}`,
    );

    return { tickets, total };
  }

  /**
   * Get a single ticket by ID.
   * Verifies the ticket belongs to the user and organization.
   *
   * @param organizationId - Current tenant organization ID
   * @param userId - ID of the user
   * @param ticketId - Ticket ID to retrieve
   * @returns Ticket details
   * @throws NotFoundException if ticket not found or not accessible
   */
  async getTicketById(
    organizationId: string,
    userId: string,
    ticketId: string,
  ): Promise<TicketDetail> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        organizationId,
        userId, // Ensure user can only see their own tickets
      },
    });

    if (!ticket) {
      this.logger.warn(
        `Ticket not found: id=${ticketId}, user=${userId}, org=${organizationId}`,
      );
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
    };
  }
}
