import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { FaqService } from "./services/faq.service";
import { ConsentService } from "./services/consent.service";

/**
 * ChatbotModule provides FAQ management and consent tracking for the employee chatbot.
 *
 * Features:
 * - FAQ entry CRUD with priority-based full-text search matching
 * - GDPR-compliant consent logging (append-only audit trail)
 * - Session-based consent tracking with 24-hour validity
 *
 * Integrated with:
 * - EmployeeChatbotAgent (uses FAQ for priority answers before RAG)
 * - Ethics Portal (anonymous consent capture)
 * - Employee Portal (authenticated consent capture)
 *
 * Subsequent plans will add:
 * - ChatbotController: API endpoints (44-10)
 * - ChatbotService: Conversation orchestration
 */
@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [FaqService, ConsentService],
  exports: [FaqService, ConsentService],
})
export class ChatbotModule {}
