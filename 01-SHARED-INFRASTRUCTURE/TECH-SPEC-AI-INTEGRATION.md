# Technical Specification: AI Integration

**Version:** 2.0
**Last Updated:** January 2026
**Status:** Draft
**Author:** Architecture Team

**Applies To:** All AI-powered features across modules

**Key Consumers:**
- Case Management: Summary generation, note cleanup, real-time assist
- Disclosures: Auto-tagging, conflict detection
- Policy Management: Policy generation, translation, quiz creation
- Employee Chatbot: Policy Q&A, escalation routing

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [AI Provider Abstraction](#3-ai-provider-abstraction)
4. [Policy Generation](#4-policy-generation)
5. [Bulk Policy Updates](#5-bulk-policy-updates)
6. [AI-Powered Translation](#6-ai-powered-translation)
7. [Policy Analysis & Insights](#7-policy-analysis--insights)
8. [AI Auto-Tagging](#8-ai-auto-tagging)
9. [AI Policy Summarization](#9-ai-policy-summarization)
10. [AI Quiz Generation](#10-ai-quiz-generation)
11. [Regulatory Mapping Assistance](#11-regulatory-mapping-assistance)
12. [Prompt Engineering](#12-prompt-engineering)
13. [Rate Limiting & Cost Control](#13-rate-limiting--cost-control)
14. [Security & Privacy](#14-security--privacy)
15. [Error Handling](#15-error-handling)
16. [API Specifications](#16-api-specifications)
17. [Implementation Guide](#17-implementation-guide)

---

## 1. Overview

### 1.1 Purpose

This document provides detailed technical specifications for implementing AI-powered features in the Ethico Policy Management Platform. It covers policy generation, bulk updates, translation, and the pluggable AI provider architecture.

### 1.2 Scope

- AI provider abstraction layer (Claude primary, pluggable architecture)
- Policy generation from templates and prompts
- Bulk terminology updates across policies
- Multi-language translation with version control
- Policy gap analysis and compliance suggestions
- **AI auto-tagging and categorization**
- **Policy summarization (executive summaries, section summaries)**
- **AI-powered quiz question generation**
- **Regulatory framework mapping assistance**
- Cost management and rate limiting

### 1.3 Key Design Principles

1. **Provider Agnostic**: Pluggable architecture supports multiple LLM providers
2. **Tenant Isolated**: AI operations never mix data from different tenants
3. **Auditable**: All AI operations are logged for compliance
4. **Cost Controlled**: Rate limiting and usage tracking per tenant
5. **Human-in-the-Loop**: AI suggestions require human approval

### 1.4 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Primary AI | Anthropic Claude API | Policy generation, analysis |
| Alternative | Azure OpenAI | Enterprise customers |
| Self-hosted | Ollama / vLLM | On-premises option |
| Queue | BullMQ + Redis | Async job processing |
| Vector DB | pgvector / Pinecone | Semantic search |
| Cache | Redis | Response caching |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Policy     │  │    Bulk      │  │  Translation │  │   Analysis   │    │
│  │  Generator   │  │   Updater    │  │    Panel     │  │  Dashboard   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend (NestJS)                                │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                           AI Module                                   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │ Generation │  │   Bulk     │  │Translation │  │  Analysis  │     │  │
│  │  │  Service   │  │  Service   │  │  Service   │  │  Service   │     │  │
│  │  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘     │  │
│  │         │               │               │               │            │  │
│  │         └───────────────┴───────────────┴───────────────┘            │  │
│  │                                 │                                     │  │
│  │                    ┌────────────▼────────────┐                       │  │
│  │                    │    AI Provider Manager   │                       │  │
│  │                    │  (Factory + Strategy)    │                       │  │
│  │                    └────────────┬────────────┘                       │  │
│  │                                 │                                     │  │
│  │         ┌───────────────────────┼───────────────────────┐            │  │
│  │         ▼                       ▼                       ▼            │  │
│  │  ┌────────────┐         ┌────────────┐         ┌────────────┐       │  │
│  │  │   Claude   │         │   Azure    │         │ Self-Hosted│       │  │
│  │  │  Provider  │         │  OpenAI    │         │  Provider  │       │  │
│  │  └────────────┘         └────────────┘         └────────────┘       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│  ┌───────────────┐  ┌───────────────┴───────────────┐  ┌───────────────┐  │
│  │  Rate Limiter │  │       Job Queue (BullMQ)       │  │  Usage Tracker│  │
│  └───────────────┘  └───────────────────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌────────────┐    ┌────────────┐    ┌────────────┐
            │   Redis    │    │ PostgreSQL │    │  Vector DB │
            │  (Cache)   │    │  (Audit)   │    │ (Embeddings│
            └────────────┘    └────────────┘    └────────────┘
```

### 2.2 Request Flow

```
1. User initiates AI request (e.g., generate policy)
           │
           ▼
2. API validates request + tenant context
           │
           ▼
3. Rate limiter checks tenant quota
           │
           ├── If exceeded → 429 Too Many Requests
           │
           ▼
4. AI Service prepares request
           │
           ├── Fetch tenant context (templates, style guides)
           ├── Build prompt with tenant-specific data
           └── CRITICAL: Verify single-tenant data
           │
           ▼
5. AI Provider Manager routes to configured provider
           │
           ├── Claude (default)
           ├── Azure OpenAI (enterprise)
           └── Self-hosted (on-prem)
           │
           ▼
6. Provider executes request
           │
           ▼
7. Response processing
           │
           ├── Parse and validate output
           ├── Apply content filters
           └── Cache if applicable
           │
           ▼
8. Audit logging
           │
           ├── Log request/response (without PII)
           └── Update usage metrics
           │
           ▼
9. Return to user (requires human approval before applying)
```

---

## 3. AI Provider Abstraction

### 3.1 Provider Interface

```typescript
// apps/backend/src/modules/ai/interfaces/ai-provider.interface.ts

export interface AIProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface AICompletionRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  metadata?: {
    tenantId: string;
    userId: string;
    operationType: AIOperationType;
  };
}

export interface AICompletionResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: 'stop' | 'max_tokens' | 'error';
  latencyMs: number;
}

export interface AIStreamChunk {
  content: string;
  isComplete: boolean;
}

export type AIOperationType =
  | 'policy_generation'
  | 'bulk_update'
  | 'translation'
  | 'analysis'
  | 'summary'
  | 'auto_tagging'
  | 'summarization'
  | 'quiz_generation'
  | 'regulatory_mapping';

export interface AIProvider {
  readonly name: string;
  readonly supportedOperations: AIOperationType[];

  complete(request: AICompletionRequest): Promise<AICompletionResponse>;

  completeStream(
    request: AICompletionRequest
  ): AsyncGenerator<AIStreamChunk, void, unknown>;

  validateConfig(): Promise<boolean>;

  estimateCost(inputTokens: number, outputTokens: number): number;
}
```

### 3.2 Claude Provider Implementation

```typescript
// apps/backend/src/modules/ai/providers/claude.provider.ts

import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
  AIOperationType,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';
  readonly supportedOperations: AIOperationType[] = [
    'policy_generation',
    'bulk_update',
    'translation',
    'analysis',
    'summary',
    'auto_tagging',
    'summarization',
    'quiz_generation',
    'regulatory_mapping',
  ];

  private client: Anthropic;
  private model: string;

  constructor(private configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: configService.get('ANTHROPIC_API_KEY'),
    });
    this.model = configService.get('CLAUDE_MODEL', 'claude-sonnet-4-20250514');
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt || this.getDefaultSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        stop_sequences: request.stopSequences,
      });

      const latencyMs = Date.now() - startTime;

      return {
        content: response.content[0].type === 'text'
          ? response.content[0].text
          : '',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        model: response.model,
        finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'max_tokens',
        latencyMs,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async *completeStream(
    request: AICompletionRequest
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    try {
      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt || this.getDefaultSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta') {
          yield {
            content: event.delta.text,
            isComplete: false,
          };
        }
      }

      yield { content: '', isComplete: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Make a minimal API call to validate credentials
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    // Claude pricing (as of 2024)
    const inputCostPer1k = 0.003;  // $3 per million input
    const outputCostPer1k = 0.015; // $15 per million output

    return (
      (inputTokens / 1000) * inputCostPer1k +
      (outputTokens / 1000) * outputCostPer1k
    );
  }

  private getDefaultSystemPrompt(): string {
    return `You are an expert policy writer for enterprise compliance.
Your task is to help create, update, and analyze corporate policies.

Guidelines:
- Write in clear, professional language
- Use consistent terminology
- Include all legally required elements
- Structure content with clear sections
- Avoid ambiguity
- Consider international compliance requirements`;
  }

  private handleError(error: any): Error {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        throw new Error('AI rate limit exceeded. Please try again later.');
      }
      if (error.status === 401) {
        throw new Error('AI authentication failed. Please contact support.');
      }
    }
    throw new Error(`AI request failed: ${error.message}`);
  }
}
```

### 3.3 Azure OpenAI Provider

```typescript
// apps/backend/src/modules/ai/providers/azure-openai.provider.ts

import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
  AIOperationType,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class AzureOpenAIProvider implements AIProvider {
  readonly name = 'azure-openai';
  readonly supportedOperations: AIOperationType[] = [
    'policy_generation',
    'bulk_update',
    'translation',
    'analysis',
    'summary',
    'auto_tagging',
    'summarization',
    'quiz_generation',
    'regulatory_mapping',
  ];

  private client: OpenAIClient;
  private deploymentName: string;

  constructor(private configService: ConfigService) {
    const endpoint = configService.get('AZURE_OPENAI_ENDPOINT');
    const apiKey = configService.get('AZURE_OPENAI_API_KEY');

    this.client = new OpenAIClient(
      endpoint,
      new AzureKeyCredential(apiKey)
    );
    this.deploymentName = configService.get('AZURE_OPENAI_DEPLOYMENT', 'gpt-4');
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();

    const messages = [
      {
        role: 'system' as const,
        content: request.systemPrompt || this.getDefaultSystemPrompt(),
      },
      {
        role: 'user' as const,
        content: request.prompt,
      },
    ];

    const response = await this.client.getChatCompletions(
      this.deploymentName,
      messages,
      {
        maxTokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        stop: request.stopSequences,
      }
    );

    const latencyMs = Date.now() - startTime;
    const choice = response.choices[0];

    return {
      content: choice.message?.content || '',
      usage: {
        inputTokens: response.usage?.promptTokens || 0,
        outputTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0,
      },
      model: response.model,
      finishReason: choice.finishReason === 'stop' ? 'stop' : 'max_tokens',
      latencyMs,
    };
  }

  async *completeStream(
    request: AICompletionRequest
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const messages = [
      {
        role: 'system' as const,
        content: request.systemPrompt || this.getDefaultSystemPrompt(),
      },
      {
        role: 'user' as const,
        content: request.prompt,
      },
    ];

    const events = await this.client.streamChatCompletions(
      this.deploymentName,
      messages,
      {
        maxTokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
      }
    );

    for await (const event of events) {
      const choice = event.choices[0];
      if (choice?.delta?.content) {
        yield {
          content: choice.delta.content,
          isComplete: false,
        };
      }
      if (choice?.finishReason) {
        yield { content: '', isComplete: true };
      }
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.client.getChatCompletions(
        this.deploymentName,
        [{ role: 'user', content: 'test' }],
        { maxTokens: 10 }
      );
      return true;
    } catch {
      return false;
    }
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    // Azure OpenAI GPT-4 pricing
    const inputCostPer1k = 0.03;
    const outputCostPer1k = 0.06;

    return (
      (inputTokens / 1000) * inputCostPer1k +
      (outputTokens / 1000) * outputCostPer1k
    );
  }

  private getDefaultSystemPrompt(): string {
    return `You are an expert policy writer for enterprise compliance.`;
  }
}
```

### 3.4 Provider Manager

```typescript
// apps/backend/src/modules/ai/ai-provider.manager.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIProvider, AIOperationType } from './interfaces/ai-provider.interface';
import { ClaudeProvider } from './providers/claude.provider';
import { AzureOpenAIProvider } from './providers/azure-openai.provider';
import { SelfHostedProvider } from './providers/self-hosted.provider';

@Injectable()
export class AIProviderManager {
  private providers: Map<string, AIProvider> = new Map();

  constructor(
    private prisma: PrismaService,
    private claudeProvider: ClaudeProvider,
    private azureOpenAIProvider: AzureOpenAIProvider,
    private selfHostedProvider: SelfHostedProvider,
  ) {
    // Register providers
    this.providers.set('claude', claudeProvider);
    this.providers.set('azure-openai', azureOpenAIProvider);
    this.providers.set('self-hosted', selfHostedProvider);
  }

  async getProviderForTenant(tenantId: string): Promise<AIProvider> {
    // Get tenant's AI configuration
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiProvider: true, aiConfig: true },
    });

    const providerName = tenant?.aiProvider || 'claude';
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`AI provider '${providerName}' not configured`);
    }

    return provider;
  }

  async getProviderForOperation(
    tenantId: string,
    operation: AIOperationType
  ): Promise<AIProvider> {
    const provider = await this.getProviderForTenant(tenantId);

    if (!provider.supportedOperations.includes(operation)) {
      throw new Error(
        `Provider '${provider.name}' does not support operation '${operation}'`
      );
    }

    return provider;
  }

  getAvailableProviders(): { name: string; operations: AIOperationType[] }[] {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      operations: p.supportedOperations,
    }));
  }

  async validateProvider(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) return false;
    return provider.validateConfig();
  }
}
```

---

## 4. Policy Generation

### 4.1 Generation Service

```typescript
// apps/backend/src/modules/ai/services/policy-generation.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIProviderManager } from '../ai-provider.manager';
import { PromptBuilder } from '../prompt-builder';
import { AuditService } from '../../audit/audit.service';
import { RequestWithTenant } from '../../../common/types/request.types';

export interface GeneratePolicyDto {
  templateId?: string;
  policyType: string;
  title: string;
  description: string;
  requirements?: string[];
  industry?: string;
  jurisdiction?: string;
  tone?: 'formal' | 'friendly' | 'technical';
}

export interface GeneratedPolicy {
  title: string;
  content: string;
  sections: PolicySection[];
  metadata: {
    generatedAt: Date;
    model: string;
    tokensUsed: number;
    estimatedCost: number;
  };
}

interface PolicySection {
  heading: string;
  content: string;
  level: number;
}

@Injectable()
export class PolicyGenerationService {
  constructor(
    private prisma: PrismaService,
    private providerManager: AIProviderManager,
    private promptBuilder: PromptBuilder,
    private auditService: AuditService,
    @Inject(REQUEST) private request: RequestWithTenant,
  ) {}

  async generatePolicy(dto: GeneratePolicyDto): Promise<GeneratedPolicy> {
    const tenantId = this.request.tenantId;

    // Get provider for tenant
    const provider = await this.providerManager.getProviderForOperation(
      tenantId,
      'policy_generation'
    );

    // Get tenant context
    const tenantContext = await this.getTenantContext(tenantId);

    // Get template if specified
    let template: PolicyTemplate | null = null;
    if (dto.templateId) {
      template = await this.prisma.policyTemplate.findFirst({
        where: {
          id: dto.templateId,
          tenantId, // CRITICAL: Ensure template belongs to tenant
        },
      });
    }

    // Build prompt
    const prompt = this.promptBuilder.buildGenerationPrompt({
      ...dto,
      template,
      tenantContext,
    });

    // Execute AI request
    const response = await provider.complete({
      prompt,
      systemPrompt: this.getSystemPrompt(dto.policyType),
      maxTokens: 8192,
      temperature: 0.7,
      metadata: {
        tenantId,
        userId: this.request.userId,
        operationType: 'policy_generation',
      },
    });

    // Parse response
    const generated = this.parseGeneratedPolicy(response.content, dto);

    // Calculate cost
    const estimatedCost = provider.estimateCost(
      response.usage.inputTokens,
      response.usage.outputTokens
    );

    // Audit log
    await this.auditService.log({
      action: 'AI_POLICY_GENERATED',
      userId: this.request.userId,
      tenantId,
      resourceType: 'policy',
      metadata: {
        policyType: dto.policyType,
        templateId: dto.templateId,
        tokensUsed: response.usage.totalTokens,
        estimatedCost,
        model: response.model,
      },
    });

    // Track usage
    await this.trackUsage(tenantId, response.usage.totalTokens, estimatedCost);

    return {
      ...generated,
      metadata: {
        generatedAt: new Date(),
        model: response.model,
        tokensUsed: response.usage.totalTokens,
        estimatedCost,
      },
    };
  }

  async streamGeneratePolicy(
    dto: GeneratePolicyDto,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const tenantId = this.request.tenantId;
    const provider = await this.providerManager.getProviderForOperation(
      tenantId,
      'policy_generation'
    );

    const tenantContext = await this.getTenantContext(tenantId);
    const prompt = this.promptBuilder.buildGenerationPrompt({
      ...dto,
      tenantContext,
    });

    const stream = provider.completeStream({
      prompt,
      systemPrompt: this.getSystemPrompt(dto.policyType),
      maxTokens: 8192,
      metadata: {
        tenantId,
        userId: this.request.userId,
        operationType: 'policy_generation',
      },
    });

    for await (const chunk of stream) {
      if (chunk.content) {
        onChunk(chunk.content);
      }
    }
  }

  private async getTenantContext(tenantId: string): Promise<TenantContext> {
    // Fetch tenant-specific information for better generation
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        industry: true,
        styleGuide: true,
        terminologyMap: true,
      },
    });

    // Get existing policies for style reference
    const recentPolicies = await this.prisma.policy.findMany({
      where: { tenantId, status: 'PUBLISHED' },
      select: { title: true, type: true },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });

    return {
      companyName: tenant?.name || 'Company',
      industry: tenant?.industry,
      styleGuide: tenant?.styleGuide,
      terminologyMap: tenant?.terminologyMap,
      existingPolicies: recentPolicies,
    };
  }

  private getSystemPrompt(policyType: string): string {
    const typePrompts: Record<string, string> = {
      privacy: `You are an expert in data privacy regulations including GDPR, CCPA, and HIPAA.
Focus on data collection, processing, storage, and subject rights.`,

      security: `You are a cybersecurity policy expert.
Focus on access control, incident response, data protection, and compliance frameworks.`,

      hr: `You are an HR policy specialist.
Focus on employment law compliance, workplace safety, and employee rights.`,

      ethics: `You are a corporate ethics and compliance expert.
Focus on code of conduct, conflict of interest, and anti-corruption measures.`,

      financial: `You are a financial policy expert.
Focus on regulatory compliance, internal controls, and fraud prevention.`,

      default: `You are an expert corporate policy writer.
Create clear, comprehensive, and legally sound policies.`,
    };

    return typePrompts[policyType] || typePrompts.default;
  }

  private parseGeneratedPolicy(content: string, dto: GeneratePolicyDto): {
    title: string;
    content: string;
    sections: PolicySection[];
  } {
    // Parse markdown-formatted content into sections
    const sections: PolicySection[] = [];
    const lines = content.split('\n');
    let currentSection: PolicySection | null = null;
    let sectionContent: string[] = [];

    for (const line of lines) {
      const h1Match = line.match(/^# (.+)$/);
      const h2Match = line.match(/^## (.+)$/);
      const h3Match = line.match(/^### (.+)$/);

      if (h1Match || h2Match || h3Match) {
        // Save previous section
        if (currentSection) {
          currentSection.content = sectionContent.join('\n').trim();
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          heading: (h1Match || h2Match || h3Match)![1],
          content: '',
          level: h1Match ? 1 : h2Match ? 2 : 3,
        };
        sectionContent = [];
      } else if (currentSection) {
        sectionContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.content = sectionContent.join('\n').trim();
      sections.push(currentSection);
    }

    return {
      title: dto.title,
      content,
      sections,
    };
  }

  private async trackUsage(
    tenantId: string,
    tokens: number,
    cost: number
  ): Promise<void> {
    await this.prisma.aiUsage.create({
      data: {
        tenantId,
        operation: 'policy_generation',
        tokensUsed: tokens,
        estimatedCost: cost,
        timestamp: new Date(),
      },
    });
  }
}
```

### 4.2 Prompt Builder

```typescript
// apps/backend/src/modules/ai/prompt-builder.ts

import { Injectable } from '@nestjs/common';

interface GenerationPromptInput {
  policyType: string;
  title: string;
  description: string;
  requirements?: string[];
  industry?: string;
  jurisdiction?: string;
  tone?: 'formal' | 'friendly' | 'technical';
  template?: PolicyTemplate | null;
  tenantContext: TenantContext;
}

@Injectable()
export class PromptBuilder {
  buildGenerationPrompt(input: GenerationPromptInput): string {
    const parts: string[] = [];

    // Company context
    parts.push(`# Company Context
Company: ${input.tenantContext.companyName}
${input.industry ? `Industry: ${input.industry}` : ''}
`);

    // Task description
    parts.push(`# Task
Generate a comprehensive ${input.policyType} policy with the following details:

**Title:** ${input.title}
**Description:** ${input.description}
`);

    // Requirements
    if (input.requirements && input.requirements.length > 0) {
      parts.push(`# Requirements
The policy must address:
${input.requirements.map((r) => `- ${r}`).join('\n')}
`);
    }

    // Jurisdiction
    if (input.jurisdiction) {
      parts.push(`# Jurisdiction
This policy must comply with regulations in: ${input.jurisdiction}
`);
    }

    // Template
    if (input.template) {
      parts.push(`# Template Structure
Follow this template structure:
${input.template.structure}
`);
    }

    // Style guide
    if (input.tenantContext.styleGuide) {
      parts.push(`# Style Guide
${input.tenantContext.styleGuide}
`);
    }

    // Terminology
    if (input.tenantContext.terminologyMap) {
      const terms = Object.entries(input.tenantContext.terminologyMap)
        .map(([term, definition]) => `- ${term}: ${definition}`)
        .join('\n');
      parts.push(`# Company Terminology
Use these standard terms:
${terms}
`);
    }

    // Output format
    parts.push(`# Output Format
Generate the policy in Markdown format with:
1. Clear section headings (## for main sections, ### for subsections)
2. Numbered or bulleted lists where appropriate
3. Bold key terms and definitions
4. A "Definitions" section at the beginning
5. An "Enforcement" or "Compliance" section
6. A "Version History" placeholder

Tone: ${input.tone || 'formal'}
`);

    return parts.join('\n');
  }

  buildBulkUpdatePrompt(input: BulkUpdatePromptInput): string {
    return `# Bulk Policy Update Task

## Change Required
Find and replace the following term throughout the policy:

**Old Term:** ${input.oldTerm}
**New Term:** ${input.newTerm}
${input.context ? `**Context:** ${input.context}` : ''}

## Policy Content
\`\`\`
${input.content}
\`\`\`

## Instructions
1. Replace all instances of "${input.oldTerm}" with "${input.newTerm}"
2. Ensure grammatical correctness after replacement
3. Maintain consistent capitalization
4. Update any related references or definitions
5. Return the complete updated policy

## Output Format
Return ONLY the updated policy content, no explanations.
`;
  }

  buildTranslationPrompt(input: TranslationPromptInput): string {
    return `# Translation Task

## Source Language
${input.sourceLanguage}

## Target Language
${input.targetLanguage}

## Content to Translate
\`\`\`
${input.content}
\`\`\`

## Instructions
1. Translate the policy content to ${input.targetLanguage}
2. Maintain all formatting (headers, lists, emphasis)
3. Keep legal/technical terms accurate
4. Preserve company name and product names
5. Adapt cultural references appropriately
6. Maintain formal business tone

${input.glossary ? `## Glossary (use these translations)
${Object.entries(input.glossary)
  .map(([en, translated]) => `- ${en} → ${translated}`)
  .join('\n')}` : ''}

## Output Format
Return ONLY the translated content, preserving all Markdown formatting.
`;
  }

  buildAnalysisPrompt(input: AnalysisPromptInput): string {
    return `# Policy Analysis Task

## Policy Content
\`\`\`
${input.content}
\`\`\`

## Analysis Type
${input.analysisType}

## Instructions
${this.getAnalysisInstructions(input.analysisType)}

## Output Format
Return analysis as JSON:
\`\`\`json
{
  "summary": "Brief summary of findings",
  "score": 0-100,
  "findings": [
    {
      "type": "gap|risk|improvement|compliance",
      "severity": "high|medium|low",
      "description": "Description of finding",
      "location": "Section reference",
      "recommendation": "Suggested action"
    }
  ],
  "recommendations": ["Prioritized list of improvements"]
}
\`\`\`
`;
  }

  private getAnalysisInstructions(analysisType: string): string {
    const instructions: Record<string, string> = {
      gap_analysis: `Identify gaps in the policy coverage:
1. Missing required sections
2. Incomplete procedures
3. Undefined roles and responsibilities
4. Missing compliance requirements`,

      risk_assessment: `Assess risks in the policy:
1. Potential legal exposure
2. Operational risks
3. Compliance gaps
4. Enforcement challenges`,

      compliance_check: `Check compliance with regulations:
1. GDPR requirements (if applicable)
2. Industry-specific regulations
3. Best practice alignment
4. Required disclosures`,

      readability: `Analyze readability and clarity:
1. Reading level assessment
2. Jargon identification
3. Ambiguous language
4. Structural clarity`,
    };

    return instructions[analysisType] || instructions.gap_analysis;
  }

  // NEW: Auto-Tagging Prompt Builder
  buildAutoTagPrompt(input: AutoTagPromptInput): string {
    return `# Policy Auto-Tagging Analysis

## Policy Information
**Title:** ${input.title}
**Type:** ${input.policyType}

## Policy Content
\`\`\`
${input.content}
\`\`\`

## Existing Taxonomy
**Available Tags:** ${input.existingTags.join(', ') || 'None defined'}
**Available Categories:** ${input.existingCategories.join(', ') || 'None defined'}
**Departments:** ${input.departments.join(', ') || 'All'}

## Instructions
Analyze the policy and suggest appropriate tags, category, and target audience.
- Prioritize existing tags from the taxonomy
- ${input.allowNewTags ? 'Suggest new tags only when necessary' : 'Only use existing tags'}
- Maximum ${input.maxTags} tags
- Consider regulatory, functional, and audience dimensions

## Output Format
Return JSON:
\`\`\`json
{
  "tags": [
    { "tag": "string", "confidence": 0.0-1.0, "reason": "why this tag" }
  ],
  "category": { "primary": "string", "secondary": "string", "confidence": 0.0-1.0 },
  "departments": ["relevant", "departments"],
  "roles": ["target", "roles"],
  "overallConfidence": 0.0-1.0
}
\`\`\`
`;
  }

  // NEW: Summarization Prompt Builder
  buildSummarizationPrompt(input: SummarizationPromptInput): string {
    const lengthGuidance = {
      brief: 'Create a very concise summary (2-3 sentences executive summary, 3-5 key points)',
      standard: 'Create a comprehensive summary (1 paragraph executive summary, 5-7 key points)',
      detailed: 'Create a detailed summary (2-3 paragraph executive summary, 8-10 key points, section summaries)',
    };

    return `# Policy Summarization Task

## Policy Information
**Title:** ${input.title}
**Type:** ${input.policyType}

## Policy Content
\`\`\`
${input.content}
\`\`\`

## Summarization Requirements
**Length:** ${input.length} - ${lengthGuidance[input.length]}
**Target Audience:** ${input.audience}
${input.includeSections ? '**Include:** Section-by-section summaries' : ''}
${input.includeActionItems ? '**Include:** Actionable items for employees' : ''}

## Output Format
Return JSON:
\`\`\`json
{
  "executiveSummary": "Brief overview of the policy purpose and scope",
  "keyPoints": ["Key point 1", "Key point 2", ...],
  "sections": [
    { "heading": "Section name", "summary": "Section summary", "importance": "critical|important|informational" }
  ],
  "actionItems": [
    { "action": "What to do", "responsible": "Who", "section": "Related section" }
  ]
}
\`\`\`
`;
  }

  // NEW: Quiz Generation Prompt Builder
  buildQuizPrompt(input: QuizPromptInput): string {
    const difficultyDistribution = `
- Easy questions: ${Math.round(input.difficultyMix.easy * 100)}%
- Medium questions: ${Math.round(input.difficultyMix.medium * 100)}%
- Hard questions: ${Math.round(input.difficultyMix.hard * 100)}%`;

    return `# Quiz Generation Task

## Policy Information
**Title:** ${input.title}
**Type:** ${input.policyType}

## Policy Content
\`\`\`
${input.content}
\`\`\`

## Quiz Requirements
**Number of Questions:** ${input.questionCount}
**Difficulty Distribution:** ${difficultyDistribution}
**Include Scenarios:** ${input.includeScenarios ? 'Yes - include real-world scenario questions' : 'No'}
${input.focusSections?.length ? `**Focus Sections:** ${input.focusSections.join(', ')}` : ''}

## Question Types
1. **Multiple Choice** - 4 options, one correct
2. **True/False** - Statement verification
3. **Scenario** - Situational questions testing practical application

## Instructions
- Create questions that test understanding, not just memorization
- Each question must have exactly one correct answer
- Provide clear explanations for the correct answer
- Reference specific policy sections
- Ensure distractors (wrong options) are plausible

## Output Format
Return JSON:
\`\`\`json
{
  "questions": [
    {
      "type": "multiple_choice|true_false|scenario",
      "question": "The question text",
      "options": [
        { "text": "Option A", "isCorrect": false },
        { "text": "Option B", "isCorrect": true },
        { "text": "Option C", "isCorrect": false },
        { "text": "Option D", "isCorrect": false }
      ],
      "correctIndex": 1,
      "explanation": "Why this is correct",
      "difficulty": "easy|medium|hard",
      "section": "Related policy section"
    }
  ]
}
\`\`\`
`;
  }

  // NEW: Regulatory Mapping Prompt Builder
  buildRegulatoryMappingPrompt(input: RegulatoryMappingPromptInput): string {
    const requirementsList = input.requirements
      .map((r) => `- **${r.code}**: ${r.title}\n  ${r.description}`)
      .join('\n');

    return `# Regulatory Mapping Analysis

## Policy Information
**Title:** ${input.policyTitle}

## Policy Content
\`\`\`
${input.policyContent}
\`\`\`

## Regulatory Framework: ${input.frameworkName}

### Requirements to Map
${requirementsList}

## Instructions
Analyze how well the policy addresses each regulatory requirement:
- **Full Coverage**: Requirement completely addressed
- **Partial Coverage**: Requirement partially addressed, gaps exist
- **No Coverage**: Requirement not addressed

For each requirement:
1. Identify relevant policy sections
2. Assess coverage level
3. Note any gaps
4. Provide recommendations for gaps

## Output Format
Return JSON:
\`\`\`json
{
  "requirements": [
    {
      "code": "REQ-001",
      "coverageLevel": "full|partial|none",
      "sections": ["Section 1", "Section 2"],
      "confidence": 0.0-1.0,
      "gaps": ["Gap description if applicable"],
      "recommendation": "Recommendation to address gaps"
    }
  ]
}
\`\`\`
`;
  }
}

// Type definitions for new prompt inputs
interface AutoTagPromptInput {
  title: string;
  content: string;
  policyType: string;
  existingTags: string[];
  existingCategories: string[];
  departments: string[];
  maxTags: number;
  allowNewTags: boolean;
}

interface SummarizationPromptInput {
  title: string;
  content: string;
  policyType: string;
  length: 'brief' | 'standard' | 'detailed';
  audience: 'executive' | 'employee' | 'technical' | 'legal';
  includeSections: boolean;
  includeActionItems: boolean;
}

interface QuizPromptInput {
  title: string;
  content: string;
  policyType: string;
  questionCount: number;
  includeScenarios: boolean;
  difficultyMix: { easy: number; medium: number; hard: number };
  focusSections?: string[];
}

interface RegulatoryMappingPromptInput {
  policyTitle: string;
  policyContent: string;
  frameworkName: string;
  requirements: { code: string; title: string; description: string }[];
}
```

---

## 5. Bulk Policy Updates

### 5.1 Bulk Update Service

```typescript
// apps/backend/src/modules/ai/services/bulk-update.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIProviderManager } from '../ai-provider.manager';
import { PromptBuilder } from '../prompt-builder';

export interface BulkUpdateDto {
  oldTerm: string;
  newTerm: string;
  context?: string;
  policyIds?: string[];      // Specific policies, or all if empty
  policyTypes?: string[];    // Filter by type
  dryRun?: boolean;          // Preview changes without applying
}

export interface BulkUpdateJob {
  id: string;
  tenantId: string;
  userId: string;
  oldTerm: string;
  newTerm: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalPolicies: number;
  processedPolicies: number;
  changes: PolicyChange[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

interface PolicyChange {
  policyId: string;
  policyTitle: string;
  changeCount: number;
  originalContent: string;
  updatedContent: string;
  status: 'pending' | 'applied' | 'rejected';
}

@Injectable()
export class BulkUpdateService {
  constructor(
    private prisma: PrismaService,
    private providerManager: AIProviderManager,
    private promptBuilder: PromptBuilder,
    @InjectQueue('ai-bulk-update') private bulkUpdateQueue: Queue,
    @Inject(REQUEST) private request: RequestWithTenant,
  ) {}

  async createBulkUpdateJob(dto: BulkUpdateDto): Promise<BulkUpdateJob> {
    const tenantId = this.request.tenantId;
    const userId = this.request.userId;

    // Find affected policies
    const whereClause: any = {
      tenantId,
      status: { in: ['DRAFT', 'PUBLISHED'] },
      content: { contains: dto.oldTerm, mode: 'insensitive' },
    };

    if (dto.policyIds?.length) {
      whereClause.id = { in: dto.policyIds };
    }

    if (dto.policyTypes?.length) {
      whereClause.type = { in: dto.policyTypes };
    }

    const policies = await this.prisma.policy.findMany({
      where: whereClause,
      select: { id: true, title: true, content: true },
    });

    if (policies.length === 0) {
      throw new Error(`No policies found containing "${dto.oldTerm}"`);
    }

    // Create job record
    const job = await this.prisma.bulkUpdateJob.create({
      data: {
        tenantId,
        userId,
        oldTerm: dto.oldTerm,
        newTerm: dto.newTerm,
        context: dto.context,
        status: 'pending',
        totalPolicies: policies.length,
        processedPolicies: 0,
        dryRun: dto.dryRun || false,
        policyIds: policies.map((p) => p.id),
      },
    });

    // Queue the job for processing
    await this.bulkUpdateQueue.add(
      'process-bulk-update',
      {
        jobId: job.id,
        tenantId,
        userId,
        policies,
        oldTerm: dto.oldTerm,
        newTerm: dto.newTerm,
        context: dto.context,
        dryRun: dto.dryRun,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    return this.formatJob(job);
  }

  async getJobStatus(jobId: string): Promise<BulkUpdateJob> {
    const job = await this.prisma.bulkUpdateJob.findFirst({
      where: {
        id: jobId,
        tenantId: this.request.tenantId,
      },
      include: {
        changes: true,
      },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    return this.formatJob(job);
  }

  async applyChanges(jobId: string, policyIds: string[]): Promise<void> {
    const job = await this.prisma.bulkUpdateJob.findFirst({
      where: {
        id: jobId,
        tenantId: this.request.tenantId,
        status: 'completed',
      },
      include: {
        changes: {
          where: { policyId: { in: policyIds }, status: 'pending' },
        },
      },
    });

    if (!job) {
      throw new Error('Job not found or not completed');
    }

    // Apply changes in a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const change of job.changes) {
        // Update policy content
        await tx.policy.update({
          where: { id: change.policyId },
          data: {
            content: change.updatedContent,
            updatedAt: new Date(),
            updatedById: this.request.userId,
          },
        });

        // Mark change as applied
        await tx.bulkUpdateChange.update({
          where: { id: change.id },
          data: { status: 'applied', appliedAt: new Date() },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            tenantId: this.request.tenantId,
            userId: this.request.userId,
            action: 'BULK_UPDATE_APPLIED',
            resourceType: 'policy',
            resourceId: change.policyId,
            metadata: {
              jobId,
              oldTerm: job.oldTerm,
              newTerm: job.newTerm,
              changeCount: change.changeCount,
            },
          },
        });
      }
    });
  }

  async rejectChanges(jobId: string, policyIds: string[]): Promise<void> {
    await this.prisma.bulkUpdateChange.updateMany({
      where: {
        jobId,
        policyId: { in: policyIds },
        status: 'pending',
      },
      data: { status: 'rejected' },
    });
  }

  private formatJob(job: any): BulkUpdateJob {
    return {
      id: job.id,
      tenantId: job.tenantId,
      userId: job.userId,
      oldTerm: job.oldTerm,
      newTerm: job.newTerm,
      status: job.status,
      totalPolicies: job.totalPolicies,
      processedPolicies: job.processedPolicies,
      changes: job.changes || [],
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error,
    };
  }
}
```

### 5.2 Bulk Update Processor

```typescript
// apps/backend/src/modules/ai/processors/bulk-update.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIProviderManager } from '../ai-provider.manager';
import { PromptBuilder } from '../prompt-builder';

interface BulkUpdateJobData {
  jobId: string;
  tenantId: string;
  userId: string;
  policies: { id: string; title: string; content: string }[];
  oldTerm: string;
  newTerm: string;
  context?: string;
  dryRun: boolean;
}

@Processor('ai-bulk-update')
export class BulkUpdateProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private providerManager: AIProviderManager,
    private promptBuilder: PromptBuilder,
  ) {
    super();
  }

  async process(job: Job<BulkUpdateJobData>): Promise<void> {
    const { jobId, tenantId, policies, oldTerm, newTerm, context, dryRun } =
      job.data;

    try {
      // Update job status to processing
      await this.prisma.bulkUpdateJob.update({
        where: { id: jobId },
        data: { status: 'processing' },
      });

      const provider = await this.providerManager.getProviderForOperation(
        tenantId,
        'bulk_update'
      );

      for (let i = 0; i < policies.length; i++) {
        const policy = policies[i];

        try {
          // Build prompt for AI-assisted update
          const prompt = this.promptBuilder.buildBulkUpdatePrompt({
            content: policy.content,
            oldTerm,
            newTerm,
            context,
          });

          // Get AI to perform intelligent replacement
          const response = await provider.complete({
            prompt,
            maxTokens: policy.content.length * 2, // Allow for expansion
            temperature: 0.3, // Lower temperature for consistency
            metadata: {
              tenantId,
              userId: job.data.userId,
              operationType: 'bulk_update',
            },
          });

          // Count changes
          const changeCount = this.countChanges(
            policy.content,
            response.content,
            oldTerm,
            newTerm
          );

          // Store change record
          await this.prisma.bulkUpdateChange.create({
            data: {
              jobId,
              policyId: policy.id,
              policyTitle: policy.title,
              changeCount,
              originalContent: policy.content,
              updatedContent: response.content,
              status: 'pending',
            },
          });

          // Update progress
          await this.prisma.bulkUpdateJob.update({
            where: { id: jobId },
            data: { processedPolicies: i + 1 },
          });

          // Report progress to job
          await job.updateProgress((i + 1) / policies.length * 100);

        } catch (error) {
          // Log individual policy error but continue
          console.error(`Error processing policy ${policy.id}:`, error);
        }
      }

      // Mark job as completed
      await this.prisma.bulkUpdateJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

    } catch (error) {
      // Mark job as failed
      await this.prisma.bulkUpdateJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  private countChanges(
    original: string,
    updated: string,
    oldTerm: string,
    newTerm: string
  ): number {
    const regex = new RegExp(oldTerm, 'gi');
    const originalMatches = original.match(regex) || [];
    const updatedMatches = updated.match(new RegExp(newTerm, 'gi')) || [];

    return updatedMatches.length;
  }
}
```

---

## 6. AI-Powered Translation

### 6.1 Translation Service

```typescript
// apps/backend/src/modules/ai/services/translation.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIProviderManager } from '../ai-provider.manager';
import { PromptBuilder } from '../prompt-builder';

export interface TranslateDto {
  policyId: string;
  targetLanguage: string;
  glossaryId?: string;
}

export interface TranslationResult {
  id: string;
  policyId: string;
  sourceLanguage: string;
  targetLanguage: string;
  originalContent: string;
  translatedContent: string;
  status: 'pending_review' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ko', name: 'Korean' },
];

@Injectable()
export class TranslationService {
  constructor(
    private prisma: PrismaService,
    private providerManager: AIProviderManager,
    private promptBuilder: PromptBuilder,
    @Inject(REQUEST) private request: RequestWithTenant,
  ) {}

  getSupportedLanguages(): typeof SUPPORTED_LANGUAGES {
    return SUPPORTED_LANGUAGES;
  }

  async translatePolicy(dto: TranslateDto): Promise<TranslationResult> {
    const tenantId = this.request.tenantId;

    // Get source policy
    const policy = await this.prisma.policy.findFirst({
      where: {
        id: dto.policyId,
        tenantId, // CRITICAL: Tenant isolation
      },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Check if translation already exists
    const existingTranslation = await this.prisma.policyTranslation.findFirst({
      where: {
        policyId: dto.policyId,
        targetLanguage: dto.targetLanguage,
        status: { not: 'rejected' },
      },
    });

    if (existingTranslation) {
      throw new Error(
        `Translation to ${dto.targetLanguage} already exists`
      );
    }

    // Get glossary if provided
    let glossary: Record<string, string> | undefined;
    if (dto.glossaryId) {
      const glossaryRecord = await this.prisma.translationGlossary.findFirst({
        where: {
          id: dto.glossaryId,
          tenantId,
        },
      });
      glossary = glossaryRecord?.terms as Record<string, string>;
    }

    // Get AI provider
    const provider = await this.providerManager.getProviderForOperation(
      tenantId,
      'translation'
    );

    // Build translation prompt
    const prompt = this.promptBuilder.buildTranslationPrompt({
      content: policy.content,
      sourceLanguage: policy.language || 'en',
      targetLanguage: dto.targetLanguage,
      glossary,
    });

    // Execute translation
    const response = await provider.complete({
      prompt,
      maxTokens: policy.content.length * 3, // Translations can be longer
      temperature: 0.3,
      metadata: {
        tenantId,
        userId: this.request.userId,
        operationType: 'translation',
      },
    });

    // Create translation record
    const translation = await this.prisma.policyTranslation.create({
      data: {
        policyId: dto.policyId,
        tenantId,
        sourceLanguage: policy.language || 'en',
        targetLanguage: dto.targetLanguage,
        originalContent: policy.content,
        translatedContent: response.content,
        status: 'pending_review',
        createdById: this.request.userId,
        aiModel: response.model,
        tokensUsed: response.usage.totalTokens,
      },
    });

    // Track usage
    await this.trackTranslationUsage(tenantId, response.usage.totalTokens);

    return this.formatTranslation(translation);
  }

  async getTranslations(policyId: string): Promise<TranslationResult[]> {
    const translations = await this.prisma.policyTranslation.findMany({
      where: {
        policyId,
        tenantId: this.request.tenantId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return translations.map(this.formatTranslation);
  }

  async approveTranslation(translationId: string): Promise<TranslationResult> {
    const translation = await this.prisma.policyTranslation.update({
      where: { id: translationId },
      data: {
        status: 'approved',
        reviewedById: this.request.userId,
        reviewedAt: new Date(),
      },
    });

    return this.formatTranslation(translation);
  }

  async rejectTranslation(
    translationId: string,
    reason: string
  ): Promise<TranslationResult> {
    const translation = await this.prisma.policyTranslation.update({
      where: { id: translationId },
      data: {
        status: 'rejected',
        reviewedById: this.request.userId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    return this.formatTranslation(translation);
  }

  async updateTranslation(
    translationId: string,
    content: string
  ): Promise<TranslationResult> {
    const translation = await this.prisma.policyTranslation.update({
      where: { id: translationId },
      data: {
        translatedContent: content,
        updatedAt: new Date(),
        updatedById: this.request.userId,
      },
    });

    return this.formatTranslation(translation);
  }

  // Glossary Management
  async createGlossary(
    name: string,
    terms: Record<string, string>
  ): Promise<TranslationGlossary> {
    return this.prisma.translationGlossary.create({
      data: {
        tenantId: this.request.tenantId,
        name,
        terms,
        createdById: this.request.userId,
      },
    });
  }

  async getGlossaries(): Promise<TranslationGlossary[]> {
    return this.prisma.translationGlossary.findMany({
      where: { tenantId: this.request.tenantId },
      orderBy: { name: 'asc' },
    });
  }

  private formatTranslation(t: any): TranslationResult {
    return {
      id: t.id,
      policyId: t.policyId,
      sourceLanguage: t.sourceLanguage,
      targetLanguage: t.targetLanguage,
      originalContent: t.originalContent,
      translatedContent: t.translatedContent,
      status: t.status,
      createdAt: t.createdAt,
      reviewedBy: t.reviewedById,
      reviewedAt: t.reviewedAt,
    };
  }

  private async trackTranslationUsage(
    tenantId: string,
    tokens: number
  ): Promise<void> {
    await this.prisma.aiUsage.create({
      data: {
        tenantId,
        operation: 'translation',
        tokensUsed: tokens,
        timestamp: new Date(),
      },
    });
  }
}
```

---

## 7. Policy Analysis & Insights

### 7.1 Analysis Service

```typescript
// apps/backend/src/modules/ai/services/analysis.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIProviderManager } from '../ai-provider.manager';
import { PromptBuilder } from '../prompt-builder';

export interface AnalysisType {
  id: string;
  name: string;
  description: string;
}

export interface AnalysisResult {
  id: string;
  policyId: string;
  analysisType: string;
  summary: string;
  score: number;
  findings: AnalysisFinding[];
  recommendations: string[];
  createdAt: Date;
}

export interface AnalysisFinding {
  type: 'gap' | 'risk' | 'improvement' | 'compliance';
  severity: 'high' | 'medium' | 'low';
  description: string;
  location: string;
  recommendation: string;
}

const ANALYSIS_TYPES: AnalysisType[] = [
  {
    id: 'gap_analysis',
    name: 'Gap Analysis',
    description: 'Identify missing sections and incomplete coverage',
  },
  {
    id: 'risk_assessment',
    name: 'Risk Assessment',
    description: 'Assess legal and operational risks',
  },
  {
    id: 'compliance_check',
    name: 'Compliance Check',
    description: 'Check regulatory compliance (GDPR, HIPAA, etc.)',
  },
  {
    id: 'readability',
    name: 'Readability Analysis',
    description: 'Analyze clarity and reading level',
  },
];

@Injectable()
export class AnalysisService {
  constructor(
    private prisma: PrismaService,
    private providerManager: AIProviderManager,
    private promptBuilder: PromptBuilder,
    @Inject(REQUEST) private request: RequestWithTenant,
  ) {}

  getAnalysisTypes(): AnalysisType[] {
    return ANALYSIS_TYPES;
  }

  async analyzePolicy(
    policyId: string,
    analysisType: string
  ): Promise<AnalysisResult> {
    const tenantId = this.request.tenantId;

    // Validate analysis type
    if (!ANALYSIS_TYPES.find((t) => t.id === analysisType)) {
      throw new Error('Invalid analysis type');
    }

    // Get policy
    const policy = await this.prisma.policy.findFirst({
      where: {
        id: policyId,
        tenantId,
      },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Get AI provider
    const provider = await this.providerManager.getProviderForOperation(
      tenantId,
      'analysis'
    );

    // Build analysis prompt
    const prompt = this.promptBuilder.buildAnalysisPrompt({
      content: policy.content,
      analysisType,
    });

    // Execute analysis
    const response = await provider.complete({
      prompt,
      maxTokens: 4096,
      temperature: 0.5,
      metadata: {
        tenantId,
        userId: this.request.userId,
        operationType: 'analysis',
      },
    });

    // Parse JSON response
    const analysisData = this.parseAnalysisResponse(response.content);

    // Store analysis result
    const analysis = await this.prisma.policyAnalysis.create({
      data: {
        policyId,
        tenantId,
        analysisType,
        summary: analysisData.summary,
        score: analysisData.score,
        findings: analysisData.findings,
        recommendations: analysisData.recommendations,
        aiModel: response.model,
        tokensUsed: response.usage.totalTokens,
        createdById: this.request.userId,
      },
    });

    return this.formatAnalysis(analysis);
  }

  async getAnalysisHistory(policyId: string): Promise<AnalysisResult[]> {
    const analyses = await this.prisma.policyAnalysis.findMany({
      where: {
        policyId,
        tenantId: this.request.tenantId,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return analyses.map(this.formatAnalysis);
  }

  async compareVersions(
    policyId1: string,
    policyId2: string
  ): Promise<VersionComparison> {
    const tenantId = this.request.tenantId;

    const [policy1, policy2] = await Promise.all([
      this.prisma.policy.findFirst({ where: { id: policyId1, tenantId } }),
      this.prisma.policy.findFirst({ where: { id: policyId2, tenantId } }),
    ]);

    if (!policy1 || !policy2) {
      throw new Error('One or both policies not found');
    }

    const provider = await this.providerManager.getProviderForOperation(
      tenantId,
      'analysis'
    );

    const prompt = `Compare these two policy versions and identify:
1. Added sections
2. Removed sections
3. Modified sections
4. Key differences in requirements

Version 1:
\`\`\`
${policy1.content}
\`\`\`

Version 2:
\`\`\`
${policy2.content}
\`\`\`

Return as JSON with: added, removed, modified, summary`;

    const response = await provider.complete({
      prompt,
      maxTokens: 4096,
      temperature: 0.3,
      metadata: {
        tenantId,
        userId: this.request.userId,
        operationType: 'analysis',
      },
    });

    return this.parseComparisonResponse(response.content);
  }

  private parseAnalysisResponse(content: string): {
    summary: string;
    score: number;
    findings: AnalysisFinding[];
    recommendations: string[];
  } {
    try {
      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      return JSON.parse(jsonStr);
    } catch {
      return {
        summary: 'Analysis completed',
        score: 50,
        findings: [],
        recommendations: [content],
      };
    }
  }

  private parseComparisonResponse(content: string): VersionComparison {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      return JSON.parse(jsonStr);
    } catch {
      return {
        added: [],
        removed: [],
        modified: [],
        summary: content,
      };
    }
  }

  private formatAnalysis(a: any): AnalysisResult {
    return {
      id: a.id,
      policyId: a.policyId,
      analysisType: a.analysisType,
      summary: a.summary,
      score: a.score,
      findings: a.findings as AnalysisFinding[],
      recommendations: a.recommendations as string[],
      createdAt: a.createdAt,
    };
  }
}

interface VersionComparison {
  added: string[];
  removed: string[];
  modified: { section: string; change: string }[];
  summary: string;
}
```

---

## 8. AI Auto-Tagging

### 8.1 Auto-Tagging Service

```typescript
// apps/backend/src/modules/ai/services/auto-tagging.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIProviderManager } from '../ai-provider.manager';
import { PromptBuilder } from '../prompt-builder';
import { AuditService } from '../../audit/audit.service';
import { RequestWithTenant } from '../../../common/types/request.types';

export interface AutoTagResult {
  policyId: string;
  suggestedTags: TagSuggestion[];
  suggestedCategory: CategorySuggestion;
  suggestedDepartments: string[];
  suggestedRoles: string[];
  confidence: number;
  appliedAt?: Date;
}

export interface TagSuggestion {
  tag: string;
  confidence: number;
  reason: string;
  isNew: boolean; // true if tag doesn't exist yet
}

export interface CategorySuggestion {
  primary: string;
  secondary?: string;
  confidence: number;
}

export interface AutoTagConfig {
  autoApplyThreshold: number; // Confidence threshold for auto-apply (0-1)
  maxTags: number;
  includeNewTags: boolean; // Allow suggesting new tags
  useTenantTaxonomy: boolean; // Use tenant's existing tag taxonomy
}

const DEFAULT_CONFIG: AutoTagConfig = {
  autoApplyThreshold: 0.85,
  maxTags: 10,
  includeNewTags: true,
  useTenantTaxonomy: true,
};

@Injectable()
export class AutoTaggingService {
  constructor(
    private prisma: PrismaService,
    private providerManager: AIProviderManager,
    private promptBuilder: PromptBuilder,
    private auditService: AuditService,
    @Inject(REQUEST) private request: RequestWithTenant,
  ) {}

  async analyzeAndSuggestTags(
    policyId: string,
    config: Partial<AutoTagConfig> = {}
  ): Promise<AutoTagResult> {
    const tenantId = this.request.tenantId;
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Get policy content
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, tenantId },
      select: { id: true, title: true, content: true, type: true, tags: true },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Get tenant's existing taxonomy
    let existingTags: string[] = [];
    let existingCategories: string[] = [];
    let departments: string[] = [];

    if (mergedConfig.useTenantTaxonomy) {
      const taxonomy = await this.getTenantTaxonomy(tenantId);
      existingTags = taxonomy.tags;
      existingCategories = taxonomy.categories;
      departments = taxonomy.departments;
    }

    // Get AI provider
    const provider = await this.providerManager.getProviderForOperation(
      tenantId,
      'auto_tagging'
    );

    // Build tagging prompt
    const prompt = this.promptBuilder.buildAutoTagPrompt({
      title: policy.title,
      content: policy.content,
      policyType: policy.type,
      existingTags,
      existingCategories,
      departments,
      maxTags: mergedConfig.maxTags,
      allowNewTags: mergedConfig.includeNewTags,
    });

    // Execute AI request
    const response = await provider.complete({
      prompt,
      systemPrompt: this.getSystemPrompt(),
      maxTokens: 2048,
      temperature: 0.3, // Lower temp for consistent tagging
      metadata: {
        tenantId,
        userId: this.request.userId,
        operationType: 'auto_tagging',
      },
    });

    // Parse response
    const tagResult = this.parseTagResponse(response.content, existingTags);

    // Store suggestion record
    await this.prisma.policyTagSuggestion.create({
      data: {
        policyId,
        tenantId,
        suggestedTags: tagResult.suggestedTags,
        suggestedCategory: tagResult.suggestedCategory,
        suggestedDepartments: tagResult.suggestedDepartments,
        suggestedRoles: tagResult.suggestedRoles,
        confidence: tagResult.confidence,
        aiModel: response.model,
        createdById: this.request.userId,
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'AI_AUTO_TAG_ANALYZED',
      userId: this.request.userId,
      tenantId,
      resourceType: 'policy',
      resourceId: policyId,
      metadata: {
        suggestedTagCount: tagResult.suggestedTags.length,
        confidence: tagResult.confidence,
      },
    });

    return { policyId, ...tagResult };
  }

  async applyTags(
    policyId: string,
    tags: string[],
    category?: string,
    departments?: string[]
  ): Promise<void> {
    const tenantId = this.request.tenantId;

    // Verify policy belongs to tenant
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, tenantId },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Create any new tags that don't exist
    for (const tag of tags) {
      await this.prisma.tag.upsert({
        where: { tenantId_name: { tenantId, name: tag } },
        update: {},
        create: { tenantId, name: tag, createdById: this.request.userId },
      });
    }

    // Update policy
    await this.prisma.policy.update({
      where: { id: policyId },
      data: {
        tags: { set: tags.map((t) => ({ name: t })) },
        ...(category && { category }),
        ...(departments && { departments }),
        updatedAt: new Date(),
        updatedById: this.request.userId,
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'AI_TAGS_APPLIED',
      userId: this.request.userId,
      tenantId,
      resourceType: 'policy',
      resourceId: policyId,
      metadata: { tags, category, departments },
    });
  }

  async bulkAutoTag(
    policyIds: string[],
    config: Partial<AutoTagConfig> = {}
  ): Promise<{ results: AutoTagResult[]; errors: { policyId: string; error: string }[] }> {
    const results: AutoTagResult[] = [];
    const errors: { policyId: string; error: string }[] = [];

    for (const policyId of policyIds) {
      try {
        const result = await this.analyzeAndSuggestTags(policyId, config);
        results.push(result);

        // Auto-apply if confidence exceeds threshold
        const mergedConfig = { ...DEFAULT_CONFIG, ...config };
        if (result.confidence >= mergedConfig.autoApplyThreshold) {
          await this.applyTags(
            policyId,
            result.suggestedTags.map((t) => t.tag),
            result.suggestedCategory.primary,
            result.suggestedDepartments
          );
          result.appliedAt = new Date();
        }
      } catch (error) {
        errors.push({ policyId, error: error.message });
      }
    }

    return { results, errors };
  }

  private async getTenantTaxonomy(tenantId: string): Promise<{
    tags: string[];
    categories: string[];
    departments: string[];
  }> {
    const [tags, policies, departments] = await Promise.all([
      this.prisma.tag.findMany({
        where: { tenantId },
        select: { name: true },
      }),
      this.prisma.policy.findMany({
        where: { tenantId },
        select: { category: true },
        distinct: ['category'],
      }),
      this.prisma.department.findMany({
        where: { tenantId },
        select: { name: true },
      }),
    ]);

    return {
      tags: tags.map((t) => t.name),
      categories: policies.map((p) => p.category).filter(Boolean) as string[],
      departments: departments.map((d) => d.name),
    };
  }

  private getSystemPrompt(): string {
    return `You are an expert policy analyst specializing in document classification and tagging.
Your task is to analyze policy documents and suggest appropriate tags, categories, and target audiences.

Guidelines:
- Suggest tags that accurately reflect the policy's content and purpose
- Consider regulatory, operational, and organizational dimensions
- Prioritize tags from the provided taxonomy when possible
- Only suggest new tags when truly necessary
- Assign confidence scores based on certainty
- Consider which departments and roles the policy applies to`;
  }

  private parseTagResponse(
    content: string,
    existingTags: string[]
  ): Omit<AutoTagResult, 'policyId'> {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonStr);

      return {
        suggestedTags: parsed.tags.map((t: any) => ({
          tag: t.tag,
          confidence: t.confidence,
          reason: t.reason,
          isNew: !existingTags.includes(t.tag),
        })),
        suggestedCategory: parsed.category,
        suggestedDepartments: parsed.departments || [],
        suggestedRoles: parsed.roles || [],
        confidence: parsed.overallConfidence,
      };
    } catch {
      return {
        suggestedTags: [],
        suggestedCategory: { primary: 'General', confidence: 0.5 },
        suggestedDepartments: [],
        suggestedRoles: [],
        confidence: 0,
      };
    }
  }
}
```

### 8.2 Auto-Tag Configuration

```typescript
// apps/backend/src/modules/ai/config/auto-tag.config.ts

export const POLICY_TAG_TAXONOMY = {
  categories: [
    'Privacy & Data Protection',
    'Information Security',
    'Human Resources',
    'Ethics & Compliance',
    'Financial',
    'Operations',
    'Health & Safety',
    'Environmental',
    'Legal',
    'IT & Technology',
  ],

  standardTags: {
    regulatory: [
      'GDPR', 'CCPA', 'HIPAA', 'SOX', 'PCI-DSS', 'ISO-27001',
      'NIST', 'SOC2', 'FERPA', 'GLBA',
    ],
    functional: [
      'access-control', 'incident-response', 'data-retention',
      'employee-conduct', 'remote-work', 'travel', 'expenses',
      'hiring', 'termination', 'performance-management',
    ],
    audience: [
      'all-employees', 'managers', 'executives', 'contractors',
      'vendors', 'it-staff', 'hr-staff', 'finance-staff',
    ],
  },

  confidenceThresholds: {
    high: 0.85,
    medium: 0.65,
    low: 0.40,
  },
};
```

---

## 9. AI Policy Summarization

### 9.1 Summarization Service

```typescript
// apps/backend/src/modules/ai/services/summarization.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIProviderManager } from '../ai-provider.manager';
import { PromptBuilder } from '../prompt-builder';

export interface SummarizationResult {
  policyId: string;
  executiveSummary: string;
  keyPoints: string[];
  sections: SectionSummary[];
  actionItems: ActionItem[];
  audience: string;
  readingTime: number; // minutes
  createdAt: Date;
}

export interface SectionSummary {
  heading: string;
  summary: string;
  importance: 'critical' | 'important' | 'informational';
}

export interface ActionItem {
  action: string;
  responsible: string;
  section: string;
}

export type SummaryLength = 'brief' | 'standard' | 'detailed';
export type SummaryAudience = 'executive' | 'employee' | 'technical' | 'legal';

@Injectable()
export class SummarizationService {
  constructor(
    private prisma: PrismaService,
    private providerManager: AIProviderManager,
    private promptBuilder: PromptBuilder,
    @Inject(REQUEST) private request: RequestWithTenant,
  ) {}

  async summarizePolicy(
    policyId: string,
    options: {
      length?: SummaryLength;
      audience?: SummaryAudience;
      includeSections?: boolean;
      includeActionItems?: boolean;
    } = {}
  ): Promise<SummarizationResult> {
    const tenantId = this.request.tenantId;
    const {
      length = 'standard',
      audience = 'employee',
      includeSections = true,
      includeActionItems = true,
    } = options;

    // Get policy
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, tenantId },
      select: { id: true, title: true, content: true, type: true },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Get AI provider
    const provider = await this.providerManager.getProviderForOperation(
      tenantId,
      'summarization'
    );

    // Build summarization prompt
    const prompt = this.promptBuilder.buildSummarizationPrompt({
      title: policy.title,
      content: policy.content,
      policyType: policy.type,
      length,
      audience,
      includeSections,
      includeActionItems,
    });

    // Execute AI request
    const response = await provider.complete({
      prompt,
      systemPrompt: this.getSummarizationSystemPrompt(audience),
      maxTokens: this.getMaxTokensForLength(length),
      temperature: 0.4,
      metadata: {
        tenantId,
        userId: this.request.userId,
        operationType: 'summarization',
      },
    });

    // Parse response
    const summary = this.parseSummaryResponse(response.content);

    // Calculate reading time (average 200 words per minute)
    const wordCount = policy.content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    // Store summary
    const storedSummary = await this.prisma.policySummary.upsert({
      where: {
        policyId_audience: { policyId, audience },
      },
      update: {
        executiveSummary: summary.executiveSummary,
        keyPoints: summary.keyPoints,
        sections: summary.sections,
        actionItems: summary.actionItems,
        updatedAt: new Date(),
      },
      create: {
        policyId,
        tenantId,
        audience,
        executiveSummary: summary.executiveSummary,
        keyPoints: summary.keyPoints,
        sections: summary.sections,
        actionItems: summary.actionItems,
        createdById: this.request.userId,
      },
    });

    return {
      policyId,
      ...summary,
      audience,
      readingTime,
      createdAt: storedSummary.createdAt,
    };
  }

  async getSummary(
    policyId: string,
    audience: SummaryAudience = 'employee'
  ): Promise<SummarizationResult | null> {
    const summary = await this.prisma.policySummary.findUnique({
      where: {
        policyId_audience: { policyId, audience },
      },
    });

    if (!summary) {
      return null;
    }

    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { content: true },
    });

    const wordCount = policy?.content.split(/\s+/).length || 0;

    return {
      policyId,
      executiveSummary: summary.executiveSummary,
      keyPoints: summary.keyPoints as string[],
      sections: summary.sections as SectionSummary[],
      actionItems: summary.actionItems as ActionItem[],
      audience,
      readingTime: Math.ceil(wordCount / 200),
      createdAt: summary.createdAt,
    };
  }

  async regenerateSummary(
    policyId: string,
    audience: SummaryAudience = 'employee'
  ): Promise<SummarizationResult> {
    // Delete existing summary
    await this.prisma.policySummary.deleteMany({
      where: { policyId, audience },
    });

    // Generate new summary
    return this.summarizePolicy(policyId, { audience });
  }

  private getSummarizationSystemPrompt(audience: SummaryAudience): string {
    const prompts: Record<SummaryAudience, string> = {
      executive: `You are summarizing policies for executive leadership.
Focus on: strategic implications, risk exposure, compliance requirements, and business impact.
Use concise, business-oriented language.`,

      employee: `You are summarizing policies for general employees.
Focus on: what employees need to know and do, key dos and don'ts, consequences of non-compliance.
Use clear, accessible language avoiding jargon.`,

      technical: `You are summarizing policies for technical staff.
Focus on: technical requirements, system configurations, security controls, implementation details.
Include specific technical specifications when present.`,

      legal: `You are summarizing policies for legal review.
Focus on: legal obligations, liability exposure, regulatory requirements, contractual implications.
Highlight areas requiring legal attention.`,
    };

    return prompts[audience];
  }

  private getMaxTokensForLength(length: SummaryLength): number {
    const tokens: Record<SummaryLength, number> = {
      brief: 500,
      standard: 1500,
      detailed: 3000,
    };
    return tokens[length];
  }

  private parseSummaryResponse(content: string): {
    executiveSummary: string;
    keyPoints: string[];
    sections: SectionSummary[];
    actionItems: ActionItem[];
  } {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      return JSON.parse(jsonStr);
    } catch {
      return {
        executiveSummary: content.substring(0, 500),
        keyPoints: [],
        sections: [],
        actionItems: [],
      };
    }
  }
}
```

---

## 10. AI Quiz Generation

### 10.1 Quiz Generation Service

```typescript
// apps/backend/src/modules/ai/services/quiz-generation.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIProviderManager } from '../ai-provider.manager';
import { PromptBuilder } from '../prompt-builder';

export interface GeneratedQuiz {
  policyId: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit: number; // minutes
  createdAt: Date;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'scenario';
  question: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  policySection: string;
  points: number;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizGenerationConfig {
  questionCount: number;
  includeScenarios: boolean;
  difficultyMix: {
    easy: number;
    medium: number;
    hard: number;
  };
  focusSections?: string[];
  passingScore: number;
  timeLimit: number;
}

const DEFAULT_CONFIG: QuizGenerationConfig = {
  questionCount: 10,
  includeScenarios: true,
  difficultyMix: { easy: 0.3, medium: 0.5, hard: 0.2 },
  passingScore: 80,
  timeLimit: 15,
};

@Injectable()
export class QuizGenerationService {
  constructor(
    private prisma: PrismaService,
    private providerManager: AIProviderManager,
    private promptBuilder: PromptBuilder,
    @Inject(REQUEST) private request: RequestWithTenant,
  ) {}

  async generateQuiz(
    policyId: string,
    config: Partial<QuizGenerationConfig> = {}
  ): Promise<GeneratedQuiz> {
    const tenantId = this.request.tenantId;
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Get policy
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, tenantId },
      select: { id: true, title: true, content: true, type: true },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Get AI provider
    const provider = await this.providerManager.getProviderForOperation(
      tenantId,
      'quiz_generation'
    );

    // Build quiz generation prompt
    const prompt = this.promptBuilder.buildQuizPrompt({
      title: policy.title,
      content: policy.content,
      policyType: policy.type,
      questionCount: mergedConfig.questionCount,
      includeScenarios: mergedConfig.includeScenarios,
      difficultyMix: mergedConfig.difficultyMix,
      focusSections: mergedConfig.focusSections,
    });

    // Execute AI request
    const response = await provider.complete({
      prompt,
      systemPrompt: this.getQuizSystemPrompt(),
      maxTokens: 4096,
      temperature: 0.6, // Slightly higher for question variety
      metadata: {
        tenantId,
        userId: this.request.userId,
        operationType: 'quiz_generation',
      },
    });

    // Parse response
    const questions = this.parseQuizResponse(response.content);

    // Store quiz
    const quiz = await this.prisma.quiz.create({
      data: {
        policyId,
        tenantId,
        title: `${policy.title} - Comprehension Quiz`,
        description: `Test your understanding of the ${policy.title} policy`,
        questions,
        passingScore: mergedConfig.passingScore,
        timeLimit: mergedConfig.timeLimit,
        questionCount: questions.length,
        createdById: this.request.userId,
      },
    });

    return {
      policyId,
      title: quiz.title,
      description: quiz.description,
      questions,
      passingScore: quiz.passingScore,
      timeLimit: quiz.timeLimit,
      createdAt: quiz.createdAt,
    };
  }

  async getQuiz(policyId: string): Promise<GeneratedQuiz | null> {
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        policyId,
        tenantId: this.request.tenantId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!quiz) {
      return null;
    }

    return {
      policyId,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions as QuizQuestion[],
      passingScore: quiz.passingScore,
      timeLimit: quiz.timeLimit,
      createdAt: quiz.createdAt,
    };
  }

  async submitQuizAttempt(
    quizId: string,
    answers: { questionId: string; selectedOption: string }[]
  ): Promise<QuizAttemptResult> {
    const tenantId = this.request.tenantId;
    const userId = this.request.userId;

    // Get quiz
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, tenantId },
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const questions = quiz.questions as QuizQuestion[];

    // Grade answers
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;
    const gradedAnswers: GradedAnswer[] = [];

    for (const question of questions) {
      const answer = answers.find((a) => a.questionId === question.id);
      const isCorrect = answer?.selectedOption === question.correctAnswer;

      totalPoints += question.points;
      if (isCorrect) {
        correctCount++;
        earnedPoints += question.points;
      }

      gradedAnswers.push({
        questionId: question.id,
        selectedOption: answer?.selectedOption || '',
        correctOption: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
        pointsEarned: isCorrect ? question.points : 0,
      });
    }

    const score = Math.round((earnedPoints / totalPoints) * 100);
    const passed = score >= quiz.passingScore;

    // Store attempt
    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        tenantId,
        answers: gradedAnswers,
        score,
        passed,
        correctCount,
        totalQuestions: questions.length,
        completedAt: new Date(),
      },
    });

    // If passed, create certificate
    let certificate = null;
    if (passed) {
      certificate = await this.createCertificate(quiz.policyId, userId, score);
    }

    return {
      attemptId: attempt.id,
      score,
      passed,
      correctCount,
      totalQuestions: questions.length,
      gradedAnswers,
      certificate: certificate?.id,
    };
  }

  private async createCertificate(
    policyId: string,
    userId: string,
    score: number
  ): Promise<{ id: string; issuedAt: Date }> {
    const certificate = await this.prisma.certificate.create({
      data: {
        policyId,
        userId,
        tenantId: this.request.tenantId,
        score,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        certificateNumber: this.generateCertificateNumber(),
      },
    });

    return { id: certificate.id, issuedAt: certificate.issuedAt };
  }

  private generateCertificateNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CERT-${timestamp}-${random}`;
  }

  private getQuizSystemPrompt(): string {
    return `You are an expert in creating assessment questions for corporate policies.
Your task is to generate quiz questions that test understanding of policy content.

Guidelines:
- Create questions that test practical understanding, not just memorization
- Include scenario-based questions for real-world application
- Ensure all options are plausible but only one is correct
- Write clear, unambiguous questions
- Provide helpful explanations for each correct answer
- Vary difficulty levels appropriately
- Focus on key compliance requirements and critical actions`;
  }

  private parseQuizResponse(content: string): QuizQuestion[] {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonStr);

      return parsed.questions.map((q: any, index: number) => ({
        id: `q-${index + 1}`,
        type: q.type || 'multiple_choice',
        question: q.question,
        options: q.options.map((opt: any, i: number) => ({
          id: `opt-${i + 1}`,
          text: opt.text || opt,
          isCorrect: opt.isCorrect || i === q.correctIndex,
        })),
        correctAnswer: `opt-${(q.correctIndex || 0) + 1}`,
        explanation: q.explanation,
        difficulty: q.difficulty || 'medium',
        policySection: q.section || '',
        points: q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1,
      }));
    } catch {
      return [];
    }
  }
}

interface QuizAttemptResult {
  attemptId: string;
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  gradedAnswers: GradedAnswer[];
  certificate?: string;
}

interface GradedAnswer {
  questionId: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  explanation: string;
  pointsEarned: number;
}
```

---

## 11. Regulatory Mapping Assistance

### 11.1 Regulatory Mapping Service

```typescript
// apps/backend/src/modules/ai/services/regulatory-mapping.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIProviderManager } from '../ai-provider.manager';
import { PromptBuilder } from '../prompt-builder';

export interface RegulatoryMappingSuggestion {
  policyId: string;
  frameworkMappings: FrameworkMapping[];
  complianceGaps: ComplianceGap[];
  recommendations: string[];
  overallCoverage: number; // percentage
  createdAt: Date;
}

export interface FrameworkMapping {
  frameworkId: string;
  frameworkName: string;
  requirements: RequirementMapping[];
  coverageScore: number;
}

export interface RequirementMapping {
  requirementId: string;
  requirementCode: string;
  requirementText: string;
  coverageLevel: 'full' | 'partial' | 'none';
  policySections: string[];
  confidence: number;
  gaps?: string[];
}

export interface ComplianceGap {
  frameworkId: string;
  requirementCode: string;
  gapDescription: string;
  severity: 'critical' | 'major' | 'minor';
  recommendation: string;
}

@Injectable()
export class RegulatoryMappingService {
  constructor(
    private prisma: PrismaService,
    private providerManager: AIProviderManager,
    private promptBuilder: PromptBuilder,
    @Inject(REQUEST) private request: RequestWithTenant,
  ) {}

  async analyzePolicyMapping(
    policyId: string,
    frameworkIds: string[]
  ): Promise<RegulatoryMappingSuggestion> {
    const tenantId = this.request.tenantId;

    // Get policy
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, tenantId },
      select: { id: true, title: true, content: true, type: true },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Get frameworks and their requirements
    const frameworks = await this.prisma.regulatoryFramework.findMany({
      where: { id: { in: frameworkIds } },
      include: {
        requirements: {
          select: {
            id: true,
            code: true,
            title: true,
            description: true,
            category: true,
          },
        },
      },
    });

    // Get AI provider
    const provider = await this.providerManager.getProviderForOperation(
      tenantId,
      'regulatory_mapping'
    );

    // Analyze mapping for each framework
    const frameworkMappings: FrameworkMapping[] = [];
    const allGaps: ComplianceGap[] = [];

    for (const framework of frameworks) {
      const prompt = this.promptBuilder.buildRegulatoryMappingPrompt({
        policyTitle: policy.title,
        policyContent: policy.content,
        frameworkName: framework.name,
        requirements: framework.requirements.map((r) => ({
          code: r.code,
          title: r.title,
          description: r.description,
        })),
      });

      const response = await provider.complete({
        prompt,
        systemPrompt: this.getRegulatoryMappingSystemPrompt(),
        maxTokens: 4096,
        temperature: 0.3,
        metadata: {
          tenantId,
          userId: this.request.userId,
          operationType: 'regulatory_mapping',
        },
      });

      const mappingResult = this.parseMappingResponse(
        response.content,
        framework.id,
        framework.name,
        framework.requirements
      );

      frameworkMappings.push(mappingResult.mapping);
      allGaps.push(...mappingResult.gaps);
    }

    // Calculate overall coverage
    const totalRequirements = frameworkMappings.reduce(
      (sum, fm) => sum + fm.requirements.length,
      0
    );
    const coveredRequirements = frameworkMappings.reduce(
      (sum, fm) =>
        sum +
        fm.requirements.filter((r) => r.coverageLevel !== 'none').length,
      0
    );
    const overallCoverage = totalRequirements > 0
      ? Math.round((coveredRequirements / totalRequirements) * 100)
      : 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations(allGaps);

    // Store suggestion
    await this.prisma.regulatoryMappingSuggestion.create({
      data: {
        policyId,
        tenantId,
        frameworkMappings,
        complianceGaps: allGaps,
        recommendations,
        overallCoverage,
        createdById: this.request.userId,
      },
    });

    return {
      policyId,
      frameworkMappings,
      complianceGaps: allGaps,
      recommendations,
      overallCoverage,
      createdAt: new Date(),
    };
  }

  async applyMappings(
    policyId: string,
    mappings: { frameworkId: string; requirementId: string; coverageLevel: string }[]
  ): Promise<void> {
    const tenantId = this.request.tenantId;

    // Verify policy belongs to tenant
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, tenantId },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Create or update mappings
    for (const mapping of mappings) {
      await this.prisma.policyFrameworkMapping.upsert({
        where: {
          policyId_requirementId: {
            policyId,
            requirementId: mapping.requirementId,
          },
        },
        update: {
          coverageLevel: mapping.coverageLevel,
          updatedAt: new Date(),
        },
        create: {
          policyId,
          frameworkId: mapping.frameworkId,
          requirementId: mapping.requirementId,
          tenantId,
          coverageLevel: mapping.coverageLevel,
          createdById: this.request.userId,
        },
      });
    }
  }

  async suggestPoliciesForRequirement(
    requirementId: string
  ): Promise<PolicySuggestion[]> {
    const tenantId = this.request.tenantId;

    // Get requirement details
    const requirement = await this.prisma.regulatoryRequirement.findUnique({
      where: { id: requirementId },
      include: { framework: true },
    });

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    // Get tenant's policies
    const policies = await this.prisma.policy.findMany({
      where: { tenantId, status: 'PUBLISHED' },
      select: { id: true, title: true, content: true, type: true },
    });

    // Get AI provider
    const provider = await this.providerManager.getProviderForOperation(
      tenantId,
      'regulatory_mapping'
    );

    // Analyze which policies might address this requirement
    const prompt = `Analyze which of the following policies might address this regulatory requirement:

Requirement: ${requirement.code} - ${requirement.title}
Description: ${requirement.description}
Framework: ${requirement.framework.name}

Policies:
${policies.map((p, i) => `${i + 1}. ${p.title} (${p.type})`).join('\n')}

Return a JSON array of policy suggestions with:
- policyIndex (1-based)
- relevanceScore (0-100)
- reason
- suggestedCoverageLevel (full/partial/none)`;

    const response = await provider.complete({
      prompt,
      maxTokens: 2048,
      temperature: 0.3,
      metadata: {
        tenantId,
        userId: this.request.userId,
        operationType: 'regulatory_mapping',
      },
    });

    // Parse response
    return this.parsePolicySuggestions(response.content, policies);
  }

  private getRegulatoryMappingSystemPrompt(): string {
    return `You are a regulatory compliance expert specializing in policy-to-regulation mapping.
Your task is to analyze how well a policy addresses specific regulatory requirements.

Guidelines:
- Evaluate each requirement against the policy content
- Identify specific sections that address each requirement
- Flag gaps where requirements are not adequately covered
- Use 'full' coverage only when requirement is completely addressed
- Use 'partial' when requirement is partially addressed
- Use 'none' when requirement is not addressed
- Provide actionable gap descriptions
- Consider implicit coverage from related sections`;
  }

  private parseMappingResponse(
    content: string,
    frameworkId: string,
    frameworkName: string,
    requirements: any[]
  ): { mapping: FrameworkMapping; gaps: ComplianceGap[] } {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonStr);

      const requirementMappings: RequirementMapping[] = [];
      const gaps: ComplianceGap[] = [];

      for (const req of requirements) {
        const analysis = parsed.requirements?.find(
          (r: any) => r.code === req.code
        ) || {};

        const mapping: RequirementMapping = {
          requirementId: req.id,
          requirementCode: req.code,
          requirementText: req.title,
          coverageLevel: analysis.coverageLevel || 'none',
          policySections: analysis.sections || [],
          confidence: analysis.confidence || 0.5,
          gaps: analysis.gaps,
        };

        requirementMappings.push(mapping);

        if (mapping.coverageLevel === 'none' || mapping.gaps?.length) {
          gaps.push({
            frameworkId,
            requirementCode: req.code,
            gapDescription: mapping.gaps?.[0] || `Requirement ${req.code} not addressed`,
            severity: mapping.coverageLevel === 'none' ? 'critical' : 'major',
            recommendation: analysis.recommendation || 'Add policy content to address this requirement',
          });
        }
      }

      const coverageScore = requirementMappings.filter(
        (r) => r.coverageLevel !== 'none'
      ).length / requirementMappings.length * 100;

      return {
        mapping: {
          frameworkId,
          frameworkName,
          requirements: requirementMappings,
          coverageScore: Math.round(coverageScore),
        },
        gaps,
      };
    } catch {
      return {
        mapping: {
          frameworkId,
          frameworkName,
          requirements: [],
          coverageScore: 0,
        },
        gaps: [],
      };
    }
  }

  private generateRecommendations(gaps: ComplianceGap[]): string[] {
    const recommendations: string[] = [];

    // Group by severity
    const critical = gaps.filter((g) => g.severity === 'critical');
    const major = gaps.filter((g) => g.severity === 'major');

    if (critical.length > 0) {
      recommendations.push(
        `Address ${critical.length} critical compliance gaps immediately`
      );
    }

    if (major.length > 0) {
      recommendations.push(
        `Review and address ${major.length} major gaps in policy coverage`
      );
    }

    // Add specific recommendations for common gap patterns
    const frameworks = [...new Set(gaps.map((g) => g.frameworkId))];
    if (frameworks.length > 1) {
      recommendations.push(
        'Consider creating separate policies for each regulatory framework'
      );
    }

    return recommendations;
  }

  private parsePolicySuggestions(content: string, policies: any[]): PolicySuggestion[] {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonStr);

      return parsed
        .filter((s: any) => s.relevanceScore > 30)
        .map((s: any) => ({
          policyId: policies[s.policyIndex - 1]?.id,
          policyTitle: policies[s.policyIndex - 1]?.title,
          relevanceScore: s.relevanceScore,
          reason: s.reason,
          suggestedCoverageLevel: s.suggestedCoverageLevel,
        }))
        .filter((s: any) => s.policyId);
    } catch {
      return [];
    }
  }
}

interface PolicySuggestion {
  policyId: string;
  policyTitle: string;
  relevanceScore: number;
  reason: string;
  suggestedCoverageLevel: string;
}
```

---

## 12. Prompt Engineering

### 8.1 Prompt Templates

```typescript
// apps/backend/src/modules/ai/prompts/policy-templates.ts

export const POLICY_GENERATION_TEMPLATES = {
  privacy: {
    sections: [
      'Introduction and Scope',
      'Definitions',
      'Data Collection',
      'Data Use and Processing',
      'Data Storage and Security',
      'Data Sharing and Disclosure',
      'Data Subject Rights',
      'Cookies and Tracking',
      'International Transfers',
      'Data Retention',
      'Changes to This Policy',
      'Contact Information',
    ],
    requiredElements: [
      'Legal basis for processing',
      'Categories of personal data',
      'Third-party recipients',
      'Retention periods',
      'Rights exercise procedures',
    ],
    regulations: ['GDPR', 'CCPA', 'LGPD'],
  },

  security: {
    sections: [
      'Purpose and Scope',
      'Definitions',
      'Information Classification',
      'Access Control',
      'Data Protection',
      'Network Security',
      'Physical Security',
      'Incident Response',
      'Business Continuity',
      'Compliance and Audit',
      'Training and Awareness',
      'Enforcement',
    ],
    requiredElements: [
      'Classification levels',
      'Access control procedures',
      'Encryption requirements',
      'Incident reporting process',
      'Violation consequences',
    ],
    frameworks: ['ISO 27001', 'NIST', 'SOC 2'],
  },

  hr: {
    sections: [
      'Purpose',
      'Scope and Applicability',
      'Definitions',
      'Policy Statement',
      'Roles and Responsibilities',
      'Procedures',
      'Documentation',
      'Training Requirements',
      'Compliance',
      'Review and Updates',
    ],
    requiredElements: [
      'Clear definitions',
      'Reporting procedures',
      'Investigation process',
      'Appeal mechanisms',
      'Non-retaliation statement',
    ],
  },

  ethics: {
    sections: [
      'Letter from Leadership',
      'Our Values',
      'Scope and Application',
      'Conflicts of Interest',
      'Gifts and Entertainment',
      'Anti-Corruption',
      'Confidentiality',
      'Fair Competition',
      'Reporting Concerns',
      'Non-Retaliation',
      'Acknowledgment',
    ],
    requiredElements: [
      'Clear examples',
      'Decision-making guidance',
      'Reporting channels',
      'Consequences of violations',
      'Acknowledgment process',
    ],
  },
};

export const GENERATION_GUIDELINES = `
## Policy Writing Guidelines

### Structure
- Start with a clear purpose statement
- Define all technical and legal terms
- Use numbered sections for easy reference
- Include cross-references between related sections

### Language
- Use active voice
- Avoid jargon unless defined
- Be specific, not vague
- Use "must" for requirements, "should" for recommendations

### Compliance
- Reference applicable regulations
- Include required disclosures
- Specify effective dates
- Include version control information

### Accessibility
- Use clear headings
- Keep paragraphs short
- Use bullet points for lists
- Include a summary for long policies
`;
```

### 8.2 Prompt Safety

```typescript
// apps/backend/src/modules/ai/prompt-safety.ts

export class PromptSafety {
  private static readonly BLOCKED_PATTERNS = [
    /ignore\s+(previous|all)\s+instructions/i,
    /system\s+prompt/i,
    /jailbreak/i,
    /DAN\s+mode/i,
    /bypass\s+(restrictions|filters)/i,
  ];

  private static readonly MAX_PROMPT_LENGTH = 50000;
  private static readonly MAX_INPUT_LENGTH = 100000;

  static validatePrompt(prompt: string): { valid: boolean; error?: string } {
    // Check length
    if (prompt.length > this.MAX_PROMPT_LENGTH) {
      return { valid: false, error: 'Prompt exceeds maximum length' };
    }

    // Check for injection attempts
    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(prompt)) {
        return { valid: false, error: 'Invalid prompt content detected' };
      }
    }

    return { valid: true };
  }

  static validateInput(input: string): { valid: boolean; error?: string } {
    if (input.length > this.MAX_INPUT_LENGTH) {
      return { valid: false, error: 'Input exceeds maximum length' };
    }

    return { valid: true };
  }

  static sanitizeOutput(output: string): string {
    // Remove any potential script tags or malicious content
    return output
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  static extractTenantData(
    prompt: string,
    allowedTenantId: string
  ): { valid: boolean; error?: string } {
    // Check that prompt only contains data from allowed tenant
    // This is a critical security check

    // Look for tenant ID patterns in the prompt
    const tenantIdPattern = /tenant[_-]?id[:\s=]+([a-f0-9-]+)/gi;
    let match;

    while ((match = tenantIdPattern.exec(prompt)) !== null) {
      if (match[1] !== allowedTenantId) {
        return {
          valid: false,
          error: 'Prompt contains data from unauthorized tenant',
        };
      }
    }

    return { valid: true };
  }
}
```

---

## 9. Rate Limiting & Cost Control

### 9.1 Rate Limiter

```typescript
// apps/backend/src/modules/ai/rate-limiter.ts

import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerDay: number;
  maxCostPerDay: number; // in dollars
}

const DEFAULT_LIMITS: RateLimitConfig = {
  requestsPerMinute: 10,
  requestsPerHour: 100,
  requestsPerDay: 1000,
  tokensPerDay: 1000000,
  maxCostPerDay: 100,
};

@Injectable()
export class AIRateLimiter {
  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  async checkLimit(tenantId: string): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  }> {
    const limits = await this.getTenantLimits(tenantId);
    const usage = await this.getCurrentUsage(tenantId);

    // Check requests per minute
    if (usage.requestsLastMinute >= limits.requestsPerMinute) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded (requests per minute)',
        retryAfter: 60,
      };
    }

    // Check requests per hour
    if (usage.requestsLastHour >= limits.requestsPerHour) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded (requests per hour)',
        retryAfter: 3600,
      };
    }

    // Check requests per day
    if (usage.requestsToday >= limits.requestsPerDay) {
      return {
        allowed: false,
        reason: 'Daily request limit exceeded',
        retryAfter: this.secondsUntilMidnight(),
      };
    }

    // Check tokens per day
    if (usage.tokensToday >= limits.tokensPerDay) {
      return {
        allowed: false,
        reason: 'Daily token limit exceeded',
        retryAfter: this.secondsUntilMidnight(),
      };
    }

    // Check cost per day
    if (usage.costToday >= limits.maxCostPerDay) {
      return {
        allowed: false,
        reason: 'Daily cost limit exceeded',
        retryAfter: this.secondsUntilMidnight(),
      };
    }

    return { allowed: true };
  }

  async recordRequest(
    tenantId: string,
    tokens: number,
    cost: number
  ): Promise<void> {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Increment counters
    await Promise.all([
      // Requests per minute (expire after 60s)
      this.redis.incr(`ai:rate:${tenantId}:rpm`),
      this.redis.expire(`ai:rate:${tenantId}:rpm`, 60),

      // Requests per hour (expire after 3600s)
      this.redis.incr(`ai:rate:${tenantId}:rph`),
      this.redis.expire(`ai:rate:${tenantId}:rph`, 3600),

      // Requests today
      this.redis.incr(`ai:rate:${tenantId}:rpd:${today}`),
      this.redis.expire(`ai:rate:${tenantId}:rpd:${today}`, 86400),

      // Tokens today
      this.redis.incrby(`ai:rate:${tenantId}:tpd:${today}`, tokens),
      this.redis.expire(`ai:rate:${tenantId}:tpd:${today}`, 86400),

      // Cost today
      this.redis.incrbyfloat(`ai:rate:${tenantId}:cpd:${today}`, cost),
      this.redis.expire(`ai:rate:${tenantId}:cpd:${today}`, 86400),
    ]);
  }

  async getCurrentUsage(tenantId: string): Promise<{
    requestsLastMinute: number;
    requestsLastHour: number;
    requestsToday: number;
    tokensToday: number;
    costToday: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    const [rpm, rph, rpd, tpd, cpd] = await Promise.all([
      this.redis.get(`ai:rate:${tenantId}:rpm`),
      this.redis.get(`ai:rate:${tenantId}:rph`),
      this.redis.get(`ai:rate:${tenantId}:rpd:${today}`),
      this.redis.get(`ai:rate:${tenantId}:tpd:${today}`),
      this.redis.get(`ai:rate:${tenantId}:cpd:${today}`),
    ]);

    return {
      requestsLastMinute: parseInt(rpm || '0', 10),
      requestsLastHour: parseInt(rph || '0', 10),
      requestsToday: parseInt(rpd || '0', 10),
      tokensToday: parseInt(tpd || '0', 10),
      costToday: parseFloat(cpd || '0'),
    };
  }

  private async getTenantLimits(tenantId: string): Promise<RateLimitConfig> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiLimits: true, plan: true },
    });

    // Return tenant-specific limits or defaults based on plan
    if (tenant?.aiLimits) {
      return tenant.aiLimits as RateLimitConfig;
    }

    // Plan-based defaults
    const planLimits: Record<string, Partial<RateLimitConfig>> = {
      enterprise: {
        requestsPerDay: 10000,
        tokensPerDay: 10000000,
        maxCostPerDay: 1000,
      },
      professional: {
        requestsPerDay: 2000,
        tokensPerDay: 2000000,
        maxCostPerDay: 200,
      },
    };

    return {
      ...DEFAULT_LIMITS,
      ...(planLimits[tenant?.plan || 'default'] || {}),
    };
  }

  private secondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  }
}
```

### 9.2 Usage Dashboard

```typescript
// apps/backend/src/modules/ai/services/usage.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';

export interface UsageStats {
  today: DailyUsage;
  thisMonth: MonthlyUsage;
  byOperation: OperationUsage[];
  trend: DailyUsage[];
}

interface DailyUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface MonthlyUsage {
  month: string;
  requests: number;
  tokens: number;
  cost: number;
  limit: number;
  percentUsed: number;
}

interface OperationUsage {
  operation: string;
  requests: number;
  tokens: number;
  cost: number;
  percentage: number;
}

@Injectable()
export class AIUsageService {
  constructor(
    private prisma: PrismaService,
    @Inject(REQUEST) private request: RequestWithTenant,
  ) {}

  async getUsageStats(): Promise<UsageStats> {
    const tenantId = this.request.tenantId;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Today's usage
    const todayUsage = await this.prisma.aiUsage.aggregate({
      where: {
        tenantId,
        timestamp: {
          gte: new Date(today.toISOString().split('T')[0]),
        },
      },
      _count: true,
      _sum: {
        tokensUsed: true,
        estimatedCost: true,
      },
    });

    // This month's usage
    const monthUsage = await this.prisma.aiUsage.aggregate({
      where: {
        tenantId,
        timestamp: { gte: startOfMonth },
      },
      _count: true,
      _sum: {
        tokensUsed: true,
        estimatedCost: true,
      },
    });

    // Usage by operation
    const byOperation = await this.prisma.aiUsage.groupBy({
      by: ['operation'],
      where: {
        tenantId,
        timestamp: { gte: startOfMonth },
      },
      _count: true,
      _sum: {
        tokensUsed: true,
        estimatedCost: true,
      },
    });

    // Daily trend (last 30 days)
    const trend = await this.prisma.$queryRaw<DailyUsage[]>`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as requests,
        SUM(tokens_used) as tokens,
        SUM(estimated_cost) as cost
      FROM ai_usage
      WHERE tenant_id = ${tenantId}
        AND timestamp >= ${thirtyDaysAgo}
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;

    // Get tenant limits
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiLimits: true },
    });
    const monthlyLimit = (tenant?.aiLimits as any)?.maxCostPerMonth || 1000;

    const totalCost = monthUsage._sum.estimatedCost || 0;

    return {
      today: {
        date: today.toISOString().split('T')[0],
        requests: todayUsage._count,
        tokens: todayUsage._sum.tokensUsed || 0,
        cost: todayUsage._sum.estimatedCost || 0,
      },
      thisMonth: {
        month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
        requests: monthUsage._count,
        tokens: monthUsage._sum.tokensUsed || 0,
        cost: totalCost,
        limit: monthlyLimit,
        percentUsed: (totalCost / monthlyLimit) * 100,
      },
      byOperation: byOperation.map((op) => ({
        operation: op.operation,
        requests: op._count,
        tokens: op._sum.tokensUsed || 0,
        cost: op._sum.estimatedCost || 0,
        percentage: ((op._sum.estimatedCost || 0) / totalCost) * 100,
      })),
      trend,
    };
  }
}
```

---

## 10. Security & Privacy

### 10.1 Data Privacy Rules

```typescript
// apps/backend/src/modules/ai/security/data-privacy.ts

export class AIDataPrivacy {
  // PII patterns to detect and handle
  private static readonly PII_PATTERNS = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
    creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  };

  static detectPII(text: string): { type: string; count: number }[] {
    const findings: { type: string; count: number }[] = [];

    for (const [type, pattern] of Object.entries(this.PII_PATTERNS)) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        findings.push({ type, count: matches.length });
      }
    }

    return findings;
  }

  static redactPII(text: string): string {
    let redacted = text;

    for (const [type, pattern] of Object.entries(this.PII_PATTERNS)) {
      redacted = redacted.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
    }

    return redacted;
  }

  static shouldWarnAboutPII(text: string): boolean {
    return this.detectPII(text).length > 0;
  }
}
```

### 10.2 Tenant Data Isolation

```typescript
// apps/backend/src/modules/ai/security/tenant-isolation.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AITenantIsolation {
  constructor(private prisma: PrismaService) {}

  async validateSingleTenantContext(
    tenantId: string,
    ...dataItems: Array<{ id: string; table: string }>
  ): Promise<boolean> {
    // Verify all referenced data belongs to the same tenant
    for (const item of dataItems) {
      const record = await this.prisma[item.table].findFirst({
        where: { id: item.id },
        select: { tenantId: true },
      });

      if (!record || record.tenantId !== tenantId) {
        throw new Error(
          `Data isolation violation: ${item.table}:${item.id} does not belong to tenant ${tenantId}`
        );
      }
    }

    return true;
  }

  async prepareContextForAI(
    tenantId: string,
    policies: string[],
    templates: string[]
  ): Promise<{
    policies: any[];
    templates: any[];
  }> {
    // Fetch only data belonging to the specified tenant
    const [policiesData, templatesData] = await Promise.all([
      this.prisma.policy.findMany({
        where: {
          id: { in: policies },
          tenantId, // CRITICAL: Tenant filter
        },
      }),
      this.prisma.policyTemplate.findMany({
        where: {
          id: { in: templates },
          tenantId, // CRITICAL: Tenant filter
        },
      }),
    ]);

    // Verify we got all requested items (none were filtered out)
    if (policiesData.length !== policies.length) {
      throw new Error('Some policies do not belong to this tenant');
    }

    if (templatesData.length !== templates.length) {
      throw new Error('Some templates do not belong to this tenant');
    }

    return {
      policies: policiesData,
      templates: templatesData,
    };
  }
}
```

### 10.3 Audit Logging

```typescript
// apps/backend/src/modules/ai/audit/ai-audit.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AIAuditEntry {
  tenantId: string;
  userId: string;
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AIAuditService {
  constructor(private prisma: PrismaService) {}

  async logOperation(entry: AIAuditEntry): Promise<void> {
    await this.prisma.aiAuditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        operation: entry.operation,
        model: entry.model,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        estimatedCost: entry.cost,
        latencyMs: entry.latencyMs,
        success: entry.success,
        errorMessage: entry.errorMessage,
        metadata: entry.metadata,
        timestamp: new Date(),
      },
    });
  }

  async getOperationHistory(
    tenantId: string,
    options: {
      userId?: string;
      operation?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<AIAuditEntry[]> {
    return this.prisma.aiAuditLog.findMany({
      where: {
        tenantId,
        ...(options.userId && { userId: options.userId }),
        ...(options.operation && { operation: options.operation }),
        ...(options.startDate && { timestamp: { gte: options.startDate } }),
        ...(options.endDate && { timestamp: { lte: options.endDate } }),
      },
      orderBy: { timestamp: 'desc' },
      take: options.limit || 100,
    });
  }
}
```

---

## 11. Error Handling

### 11.1 AI Error Types

```typescript
// apps/backend/src/modules/ai/errors/ai-errors.ts

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly isRetryable: boolean = false,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export class AIRateLimitError extends AIError {
  constructor(retryAfter: number) {
    super(
      'AI rate limit exceeded',
      'AI_RATE_LIMIT',
      true,
      retryAfter
    );
  }
}

export class AIQuotaExceededError extends AIError {
  constructor(quotaType: string) {
    super(
      `AI ${quotaType} quota exceeded`,
      'AI_QUOTA_EXCEEDED',
      false
    );
  }
}

export class AIProviderError extends AIError {
  constructor(provider: string, message: string) {
    super(
      `AI provider ${provider} error: ${message}`,
      'AI_PROVIDER_ERROR',
      true,
      5000
    );
  }
}

export class AIContentFilterError extends AIError {
  constructor() {
    super(
      'AI response was filtered due to content policy',
      'AI_CONTENT_FILTERED',
      false
    );
  }
}

export class AITimeoutError extends AIError {
  constructor(timeoutMs: number) {
    super(
      `AI request timed out after ${timeoutMs}ms`,
      'AI_TIMEOUT',
      true,
      1000
    );
  }
}
```

### 11.2 Error Handler

```typescript
// apps/backend/src/modules/ai/errors/error-handler.ts

import { Injectable } from '@nestjs/common';
import {
  AIError,
  AIRateLimitError,
  AIProviderError,
  AITimeoutError,
} from './ai-errors';

@Injectable()
export class AIErrorHandler {
  handleProviderError(provider: string, error: any): never {
    // Rate limit errors
    if (error.status === 429) {
      const retryAfter = parseInt(error.headers?.['retry-after'] || '60', 10);
      throw new AIRateLimitError(retryAfter);
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new AITimeoutError(error.timeout || 30000);
    }

    // Authentication errors
    if (error.status === 401) {
      throw new AIError(
        `AI provider authentication failed`,
        'AI_AUTH_ERROR',
        false
      );
    }

    // Service unavailable
    if (error.status === 503) {
      throw new AIProviderError(provider, 'Service temporarily unavailable');
    }

    // Default provider error
    throw new AIProviderError(provider, error.message);
  }

  shouldRetry(error: AIError, attempt: number, maxAttempts: number): boolean {
    if (attempt >= maxAttempts) return false;
    return error.isRetryable;
  }

  getRetryDelay(error: AIError, attempt: number): number {
    if (error.retryAfter) {
      return error.retryAfter;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }
}
```

---

## 12. API Specifications

### 12.1 Policy Generation API

```yaml
/api/ai/generate:
  post:
    summary: Generate a new policy using AI
    security:
      - cookieAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyType, title, description]
            properties:
              policyType:
                type: string
                enum: [privacy, security, hr, ethics, financial, general]
              title:
                type: string
                maxLength: 200
              description:
                type: string
                maxLength: 2000
              templateId:
                type: string
                format: uuid
              requirements:
                type: array
                items:
                  type: string
              industry:
                type: string
              jurisdiction:
                type: string
              tone:
                type: string
                enum: [formal, friendly, technical]
    responses:
      200:
        description: Generated policy
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GeneratedPolicy'
      429:
        description: Rate limit exceeded

/api/ai/generate/stream:
  post:
    summary: Generate policy with streaming response
    responses:
      200:
        description: Server-sent events stream
        content:
          text/event-stream:
            schema:
              type: string
```

### 12.2 Bulk Update API

```yaml
/api/ai/bulk-update:
  post:
    summary: Create bulk terminology update job
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [oldTerm, newTerm]
            properties:
              oldTerm:
                type: string
              newTerm:
                type: string
              context:
                type: string
              policyIds:
                type: array
                items:
                  type: string
              policyTypes:
                type: array
                items:
                  type: string
              dryRun:
                type: boolean
                default: true
    responses:
      202:
        description: Job created
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BulkUpdateJob'

/api/ai/bulk-update/{jobId}:
  get:
    summary: Get job status
    responses:
      200:
        description: Job details

/api/ai/bulk-update/{jobId}/apply:
  post:
    summary: Apply approved changes
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyIds]
            properties:
              policyIds:
                type: array
                items:
                  type: string
    responses:
      200:
        description: Changes applied
```

### 12.3 Translation API

```yaml
/api/ai/translate:
  post:
    summary: Translate a policy
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyId, targetLanguage]
            properties:
              policyId:
                type: string
              targetLanguage:
                type: string
                enum: [es, fr, de, pt, it, nl, ja, zh, ko]
              glossaryId:
                type: string
    responses:
      200:
        description: Translation result

/api/ai/translate/languages:
  get:
    summary: Get supported languages
    responses:
      200:
        description: List of supported languages

/api/ai/glossaries:
  get:
    summary: List translation glossaries
  post:
    summary: Create translation glossary
```

### 12.4 Analysis API

```yaml
/api/ai/analyze:
  post:
    summary: Analyze a policy
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyId, analysisType]
            properties:
              policyId:
                type: string
              analysisType:
                type: string
                enum: [gap_analysis, risk_assessment, compliance_check, readability]
    responses:
      200:
        description: Analysis results

/api/ai/analyze/types:
  get:
    summary: Get available analysis types

/api/ai/compare:
  post:
    summary: Compare two policy versions
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyId1, policyId2]
            properties:
              policyId1:
                type: string
              policyId2:
                type: string
    responses:
      200:
        description: Comparison results
```

### 12.5 Usage API

```yaml
/api/ai/usage:
  get:
    summary: Get AI usage statistics
    responses:
      200:
        description: Usage stats
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UsageStats'

/api/ai/limits:
  get:
    summary: Get current rate limits and usage
    responses:
      200:
        description: Rate limit status
```

### 16.6 Auto-Tagging API

```yaml
/api/ai/auto-tag:
  post:
    summary: Analyze policy and suggest tags
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyId]
            properties:
              policyId:
                type: string
                format: uuid
              config:
                type: object
                properties:
                  autoApplyThreshold:
                    type: number
                    minimum: 0
                    maximum: 1
                    default: 0.85
                  maxTags:
                    type: integer
                    minimum: 1
                    maximum: 20
                    default: 10
                  includeNewTags:
                    type: boolean
                    default: true
                  useTenantTaxonomy:
                    type: boolean
                    default: true
    responses:
      200:
        description: Tag suggestions
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AutoTagResult'

/api/ai/auto-tag/apply:
  post:
    summary: Apply suggested tags to policy
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyId, tags]
            properties:
              policyId:
                type: string
              tags:
                type: array
                items:
                  type: string
              category:
                type: string
              departments:
                type: array
                items:
                  type: string
    responses:
      200:
        description: Tags applied successfully

/api/ai/auto-tag/bulk:
  post:
    summary: Auto-tag multiple policies
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyIds]
            properties:
              policyIds:
                type: array
                items:
                  type: string
              config:
                $ref: '#/components/schemas/AutoTagConfig'
    responses:
      202:
        description: Bulk tagging job started
```

### 16.7 Summarization API

```yaml
/api/ai/summarize:
  post:
    summary: Generate policy summary
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyId]
            properties:
              policyId:
                type: string
              length:
                type: string
                enum: [brief, standard, detailed]
                default: standard
              audience:
                type: string
                enum: [executive, employee, technical, legal]
                default: employee
              includeSections:
                type: boolean
                default: true
              includeActionItems:
                type: boolean
                default: true
    responses:
      200:
        description: Policy summary
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SummarizationResult'

/api/ai/summarize/{policyId}:
  get:
    summary: Get existing summary for policy
    parameters:
      - name: policyId
        in: path
        required: true
        schema:
          type: string
      - name: audience
        in: query
        schema:
          type: string
          enum: [executive, employee, technical, legal]
    responses:
      200:
        description: Existing summary or null
      404:
        description: Summary not found

/api/ai/summarize/{policyId}/regenerate:
  post:
    summary: Regenerate policy summary
    responses:
      200:
        description: New summary generated
```

### 16.8 Quiz Generation API

```yaml
/api/ai/quiz/generate:
  post:
    summary: Generate quiz for policy
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyId]
            properties:
              policyId:
                type: string
              questionCount:
                type: integer
                minimum: 5
                maximum: 50
                default: 10
              includeScenarios:
                type: boolean
                default: true
              difficultyMix:
                type: object
                properties:
                  easy:
                    type: number
                  medium:
                    type: number
                  hard:
                    type: number
              focusSections:
                type: array
                items:
                  type: string
              passingScore:
                type: integer
                minimum: 50
                maximum: 100
                default: 80
              timeLimit:
                type: integer
                minimum: 5
                maximum: 60
                default: 15
    responses:
      200:
        description: Generated quiz
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GeneratedQuiz'

/api/ai/quiz/{policyId}:
  get:
    summary: Get active quiz for policy
    responses:
      200:
        description: Quiz details
      404:
        description: No quiz found

/api/ai/quiz/{quizId}/attempt:
  post:
    summary: Submit quiz attempt
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [answers]
            properties:
              answers:
                type: array
                items:
                  type: object
                  properties:
                    questionId:
                      type: string
                    selectedOption:
                      type: string
    responses:
      200:
        description: Graded attempt result
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/QuizAttemptResult'

/api/ai/quiz/certificate/{certificateId}:
  get:
    summary: Get certificate details
    responses:
      200:
        description: Certificate information
```

### 16.9 Regulatory Mapping API

```yaml
/api/ai/regulatory-mapping/analyze:
  post:
    summary: Analyze policy regulatory mapping
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyId, frameworkIds]
            properties:
              policyId:
                type: string
              frameworkIds:
                type: array
                items:
                  type: string
    responses:
      200:
        description: Mapping analysis results
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegulatoryMappingSuggestion'

/api/ai/regulatory-mapping/apply:
  post:
    summary: Apply regulatory mappings
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyId, mappings]
            properties:
              policyId:
                type: string
              mappings:
                type: array
                items:
                  type: object
                  properties:
                    frameworkId:
                      type: string
                    requirementId:
                      type: string
                    coverageLevel:
                      type: string
                      enum: [full, partial, none]
    responses:
      200:
        description: Mappings applied

/api/ai/regulatory-mapping/suggest-policies:
  post:
    summary: Suggest policies for requirement
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [requirementId]
            properties:
              requirementId:
                type: string
    responses:
      200:
        description: Policy suggestions
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/PolicySuggestion'
```

---

## 17. Implementation Guide

### 17.1 Phase 1: Core Infrastructure (Week 1)

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | AI provider interface and manager | Provider abstraction layer |
| 2 | Claude provider implementation | Working Claude integration |
| 3 | Rate limiter and usage tracking | Cost control system |
| 4 | Audit logging and security | Compliance infrastructure |
| 5 | Error handling and retries | Resilient AI calls |

### 17.2 Phase 2: Generation Features (Week 2)

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Policy generation service | Basic generation working |
| 3 | Streaming generation | Real-time generation UI |
| 4 | Template integration | Template-based generation |
| 5 | Generation UI components | Complete generation feature |

### 17.3 Phase 3: Advanced Features (Week 3)

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Bulk update service + queue | Bulk terminology updates |
| 3 | Translation service | Multi-language support |
| 4 | Analysis service | Policy analysis features |
| 5 | Usage dashboard | Admin visibility |

### 17.4 Phase 4: AI Enhancement Features (Week 4)

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Auto-tagging service | Intelligent tag suggestions |
| 2 | Summarization service | Policy summaries for all audiences |
| 3 | Quiz generation service | Automated quiz creation |
| 4 | Regulatory mapping service | Framework compliance analysis |
| 5 | Integration and testing | End-to-end AI feature testing |

### 17.5 Dependencies

```json
// apps/backend/package.json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "@azure/openai": "^1.0.0",
    "@nestjs/bullmq": "^10.0.0",
    "bullmq": "^5.0.0",
    "rate-limiter-flexible": "^3.0.0"
  }
}
```

### 17.6 Environment Variables

```bash
# AI Providers
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-20250514

AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com/
AZURE_OPENAI_API_KEY=xxx
AZURE_OPENAI_DEPLOYMENT=gpt-4

# Self-hosted (optional)
SELF_HOSTED_AI_URL=http://localhost:11434
SELF_HOSTED_AI_MODEL=llama2

# Rate Limiting
AI_DEFAULT_RPM=10
AI_DEFAULT_RPH=100
AI_DEFAULT_RPD=1000
AI_MAX_COST_PER_DAY=100
```

### 17.7 New Prisma Models

```prisma
// prisma/schema.prisma additions

model PolicyTagSuggestion {
  id                   String   @id @default(uuid())
  policyId             String
  tenantId             String
  suggestedTags        Json     // TagSuggestion[]
  suggestedCategory    Json     // CategorySuggestion
  suggestedDepartments String[]
  suggestedRoles       String[]
  confidence           Float
  aiModel              String
  appliedAt            DateTime?
  createdById          String
  createdAt            DateTime @default(now())

  policy  Policy @relation(fields: [policyId], references: [id])
  tenant  Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId, policyId])
}

model PolicySummary {
  id               String   @id @default(uuid())
  policyId         String
  tenantId         String
  audience         String   // executive, employee, technical, legal
  executiveSummary String
  keyPoints        Json     // string[]
  sections         Json     // SectionSummary[]
  actionItems      Json     // ActionItem[]
  createdById      String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  policy Policy @relation(fields: [policyId], references: [id])
  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([policyId, audience])
  @@index([tenantId])
}

model Quiz {
  id            String   @id @default(uuid())
  policyId      String
  tenantId      String
  title         String
  description   String
  questions     Json     // QuizQuestion[]
  passingScore  Int      @default(80)
  timeLimit     Int      @default(15) // minutes
  questionCount Int
  isActive      Boolean  @default(true)
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  policy   Policy        @relation(fields: [policyId], references: [id])
  tenant   Tenant        @relation(fields: [tenantId], references: [id])
  attempts QuizAttempt[]

  @@index([tenantId, policyId])
}

model QuizAttempt {
  id             String   @id @default(uuid())
  quizId         String
  userId         String
  tenantId       String
  answers        Json     // GradedAnswer[]
  score          Int
  passed         Boolean
  correctCount   Int
  totalQuestions Int
  startedAt      DateTime @default(now())
  completedAt    DateTime?

  quiz   Quiz   @relation(fields: [quizId], references: [id])
  user   User   @relation(fields: [userId], references: [id])
  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId, userId])
  @@index([quizId])
}

model Certificate {
  id                String   @id @default(uuid())
  policyId          String
  userId            String
  tenantId          String
  score             Int
  certificateNumber String   @unique
  issuedAt          DateTime @default(now())
  expiresAt         DateTime
  revokedAt         DateTime?

  policy Policy @relation(fields: [policyId], references: [id])
  user   User   @relation(fields: [userId], references: [id])
  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId, userId])
  @@index([policyId])
}

model RegulatoryMappingSuggestion {
  id                String   @id @default(uuid())
  policyId          String
  tenantId          String
  frameworkMappings Json     // FrameworkMapping[]
  complianceGaps    Json     // ComplianceGap[]
  recommendations   String[]
  overallCoverage   Int
  createdById       String
  createdAt         DateTime @default(now())

  policy Policy @relation(fields: [policyId], references: [id])
  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId, policyId])
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Architecture Team | Initial specification |
| 2.0 | January 2026 | Architecture Team | Added AI Auto-Tagging (Section 8), Policy Summarization (Section 9), Quiz Generation (Section 10), Regulatory Mapping Assistance (Section 11), extended prompt builder, new API endpoints, new Prisma models |

---

*End of Technical Specification*
