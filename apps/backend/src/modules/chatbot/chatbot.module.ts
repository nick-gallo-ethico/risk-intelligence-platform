import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { FaqService } from "./services/faq.service";
import { ConsentService } from "./services/consent.service";
import { CaseStatusService } from "./services/case-status.service";
import { EscalationService } from "./services/escalation.service";

/**
 * ChatbotModule provides FAQ management, consent tracking, case status lookup,
 * and escalation handling for the employee chatbot.
 *
 * Features:
 * - FAQ entry CRUD with priority-based full-text search matching
 * - GDPR-compliant consent logging (append-only audit trail)
 * - Session-based consent tracking with 24-hour validity
 * - Rate-limited case status lookup via anonymous access codes
 * - Escalation to compliance team with conversation context
 *
 * Integrated with:
 * - EmployeeChatbotAgent (uses FAQ for priority answers before RAG)
 * - CaseStatusSkill (rate-limited access code lookup)
 * - EscalateSkill (compliance team escalation)
 * - Ethics Portal (anonymous consent capture, status checks)
 * - Employee Portal (authenticated consent capture)
 *
 * Subsequent plans will add:
 * - ChatbotController: API endpoints (44-10)
 * - ChatbotService: Conversation orchestration
 */
@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [FaqService, ConsentService, CaseStatusService, EscalationService],
  exports: [FaqService, ConsentService, CaseStatusService, EscalationService],
})
export class ChatbotModule {}
