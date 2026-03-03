import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";

/**
 * ChatbotModule provides FAQ priority matching and GDPR-compliant consent tracking
 * for the employee chatbot feature.
 *
 * Data layer includes:
 * - FaqEntry: FAQ items matched before RAG search
 * - ChatbotConsentLog: GDPR-compliant consent audit trail
 *
 * Subsequent plans will add:
 * - FaqService: FAQ CRUD and vector search
 * - ConsentService: Consent recording and verification
 * - ChatbotController: API endpoints
 * - ChatbotService: Conversation orchestration
 */
@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class ChatbotModule {}
