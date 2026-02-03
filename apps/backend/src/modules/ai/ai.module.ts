import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { AiClientService } from "./services/ai-client.service";
import { ConversationService } from "./services/conversation.service";

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [AiClientService, ConversationService],
  exports: [AiClientService, ConversationService],
})
export class AiModule {}
