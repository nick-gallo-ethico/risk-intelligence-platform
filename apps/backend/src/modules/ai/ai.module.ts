import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import { PrismaModule } from "../prisma/prisma.module";
import { EventsModule } from "../events/events.module";

// Services
import { AiClientService } from "./services/ai-client.service";
import { ConversationService } from "./services/conversation.service";
import { ContextLoaderService } from "./services/context-loader.service";
import { ProviderRegistryService } from "./services/provider-registry.service";
import { PromptService } from "./services/prompt.service";
import { AiRateLimiterService } from "./services/rate-limiter.service";
import { SchemaIntrospectionService } from "./schema-introspection.service";

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
 * - AiGateway: WebSocket gateway at /ai namespace
 *
 * @see AiController for REST endpoints
 * @see AiGateway for WebSocket streaming
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    EventsModule,
    CacheModule.register({
      ttl: 300000, // 5 minutes default (in ms)
    }),
  ],
  controllers: [AiController],
  providers: [
    // AI Provider
    ClaudeProvider,
    ProviderRegistryService,

    // Core Services
    AiClientService,
    ConversationService,
    ContextLoaderService,
    PromptService,
    AiRateLimiterService,
    SchemaIntrospectionService,

    // Registries
    SkillRegistry,
    AgentRegistry,

    // Actions
    ActionCatalog,
    ActionExecutorService,

    // WebSocket Gateway
    AiGateway,
  ],
  exports: [
    // Services for use by other modules
    AiClientService,
    ConversationService,
    ContextLoaderService,
    ProviderRegistryService,
    PromptService,
    AiRateLimiterService,
    SchemaIntrospectionService,
    ClaudeProvider,
    SkillRegistry,
    AgentRegistry,
    ActionCatalog,
    ActionExecutorService,
  ],
})
export class AiModule {}
