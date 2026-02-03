import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import { PrismaModule } from "../prisma/prisma.module";
import { AiClientService } from "./services/ai-client.service";
import { ConversationService } from "./services/conversation.service";
import { ContextLoaderService } from "./services/context-loader.service";
import { ProviderRegistryService } from "./services/provider-registry.service";
import { PromptService } from "./services/prompt.service";
import { AiRateLimiterService } from "./services/rate-limiter.service";
import { ClaudeProvider } from "./providers/claude.provider";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CacheModule.register({
      ttl: 300000, // 5 minutes default (in ms)
    }),
  ],
  providers: [
    ClaudeProvider,
    ProviderRegistryService,
    AiClientService,
    ConversationService,
    ContextLoaderService,
    PromptService,
    AiRateLimiterService,
  ],
  exports: [
    AiClientService,
    ConversationService,
    ContextLoaderService,
    ProviderRegistryService,
    PromptService,
    AiRateLimiterService,
    ClaudeProvider,
  ],
})
export class AiModule {}
