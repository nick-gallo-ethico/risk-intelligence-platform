/**
 * Help Module
 *
 * Provides knowledge base articles and support ticket functionality.
 * Integrates with notifications for ticket confirmation emails.
 */

import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";

// Controllers
import { KnowledgeBaseController } from "./controllers/knowledge-base.controller";
import { SupportTicketsController } from "./controllers/support-tickets.controller";

// Services
import { KnowledgeBaseService } from "./services/knowledge-base.service";
import { SupportTicketsService } from "./services/support-tickets.service";

// Listeners
import { TicketListener } from "./listeners/ticket.listener";

@Module({
  imports: [
    PrismaModule,
    NotificationsModule, // For NotificationService injection in TicketListener
  ],
  controllers: [KnowledgeBaseController, SupportTicketsController],
  providers: [KnowledgeBaseService, SupportTicketsService, TicketListener],
  exports: [KnowledgeBaseService, SupportTicketsService],
})
export class HelpModule {}
