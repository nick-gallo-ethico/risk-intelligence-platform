/**
 * Support Ticket DTOs
 *
 * Data transfer objects for support ticket operations.
 */

import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { TicketPriority, TicketStatus } from "@prisma/client";

/**
 * DTO for creating a new support ticket.
 */
export class CreateSupportTicketDto {
  /**
   * Brief subject/title for the support ticket.
   * Minimum 5 characters.
   */
  @IsString()
  @MinLength(5, { message: "Subject must be at least 5 characters long" })
  subject: string;

  /**
   * Detailed description of the support request.
   * Minimum 20 characters.
   */
  @IsString()
  @MinLength(20, { message: "Description must be at least 20 characters long" })
  description: string;

  /**
   * Priority level for the ticket (LOW, MEDIUM, HIGH, URGENT).
   * Defaults to MEDIUM if not specified.
   */
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  /**
   * Optional category tag for the ticket.
   */
  @IsOptional()
  @IsString()
  category?: string;
}

/**
 * Query parameters for filtering tickets.
 */
export class TicketQueryDto {
  /**
   * Filter tickets by status (OPEN, IN_PROGRESS, WAITING_ON_CUSTOMER, RESOLVED, CLOSED).
   */
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
