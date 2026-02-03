import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { AiClientService } from "./services/ai-client.service";
import { ConversationService } from "./services/conversation.service";
import { ProviderRegistryService } from "./services/provider-registry.service";
import { ClaudeProvider } from "./providers/claude.provider";

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    ClaudeProvider,
    ProviderRegistryService,
    AiClientService,
    ConversationService,
  ],
  exports: [
    AiClientService,
    ConversationService,
    ProviderRegistryService,
    ClaudeProvider,
  ],
})
export class AiModule {}
