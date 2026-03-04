import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import { PrismaModule } from "../prisma/prisma.module";
import { EventsModule } from "../events/events.module";
import { AuthModule } from "../auth/auth.module";
import { ChatbotModule } from "../chatbot/chatbot.module";
import { EmbeddingsModule } from "../embeddings/embeddings.module";

// Services
import { AiClientService } from "./services/ai-client.service";
import { ConversationService } from "./services/conversation.service";
import { ContextLoaderService } from "./services/context-loader.service";
import { ContextCacheService } from "./services/context-cache.service";
import { HierarchyLoaderService } from "./services/hierarchy-loader.service";
import { PromptBuilderService } from "./services/prompt-builder.service";
import { ProviderRegistryService } from "./services/provider-registry.service";
import { PromptService } from "./services/prompt.service";
import { AiRateLimiterService } from "./services/rate-limiter.service";
import { AiOrchestrationService } from "./services/ai-orchestration.service";
import { SchemaIntrospectionService } from "./schema-introspection.service";
import { EntitySchemaRegistryService } from "./services/entity-schema-registry.service";
import { FilterValidatorService } from "./services/filter-validator.service";

// Providers
import { ClaudeProvider } from "./providers/claude.provider";

// Registries
import { SkillRegistry } from "./skills/skill.registry";
import { AgentRegistry } from "./agents/agent.registry";

// Actions
import { ActionCatalog } from "./actions/action.catalog";
import { ActionExecutorService } from "./actions/action-executor.service";

// API Layer
import { AiGateway } from "./ai.gateway";
import { ChatbotGateway } from "./chatbot.gateway";
import { AiController } from "./ai.controller";

/**
 * AiModule provides AI capabilities for the platform.
 *
 * Features:
 * - Claude AI provider with streaming support
 * - Skill registry for AI-powered capabilities
 * - Agent registry for specialized context-aware agents
 * - Action system for AI-driven mutations with undo
 * - Conversation management with persistence
 * - Context loading from hierarchy (platform > org > team > user > entity)
 * - Rate limiting per organization
 *
 * API Layer:
 * - AiController: REST endpoints at /api/v1/ai/*
 * - AiGateway: WebSocket gateway at /ai namespace (authenticated)
 * - ChatbotGateway: WebSocket gateway at /chatbot namespace (anonymous + authenticated)
 *
 * @see AiController for REST endpoints
 * @see AiGateway for WebSocket streaming
 * @see ChatbotGateway for employee chatbot WebSocket
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    EventsModule,
    AuthModule, // For JwtService and JwtKeyService (WebSocket JWT verification)
    CacheModule.register({
      ttl: 300000, // 5 minutes default (in ms)
    }),
    // Chatbot module for FaqService (chatbot skills)
    forwardRef(() => ChatbotModule),
    // Embeddings module for VectorStoreService and EmbeddingService (policy-search skill)
    forwardRef(() => EmbeddingsModule),
  ],
  controllers: [AiController],
  providers: [
    // AI Provider
    ClaudeProvider,
    ProviderRegistryService,

    // Core Services
    AiClientService,
    ConversationService,
    // Context sub-services (split from context-loader.service.ts)
    ContextCacheService,
    HierarchyLoaderService,
    PromptBuilderService,
    ContextLoaderService,
    PromptService,
    AiRateLimiterService,
    AiOrchestrationService,
    SchemaIntrospectionService,
    EntitySchemaRegistryService,
    FilterValidatorService,

    // Registries
    SkillRegistry,
    AgentRegistry,

    // Actions
    ActionCatalog,
    ActionExecutorService,

    // WebSocket Gateways
    AiGateway,
    ChatbotGateway,
  ],
  exports: [
    // Services for use by other modules
    AiClientService,
    ConversationService,
    ContextLoaderService,
    ProviderRegistryService,
    PromptService,
    AiRateLimiterService,
    AiOrchestrationService,
    SchemaIntrospectionService,
    EntitySchemaRegistryService,
    FilterValidatorService,
    ClaudeProvider,
    SkillRegistry,
    AgentRegistry,
    ActionCatalog,
    ActionExecutorService,
  ],
})
export class AiModule {}
