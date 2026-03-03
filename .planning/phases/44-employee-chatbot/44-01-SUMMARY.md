---
phase: 44-employee-chatbot
plan: 01
status: complete
subsystem: chatbot
tags: [prisma, nestjs, faq, consent, gdpr, embeddings]
dependency-graph:
  requires:
    - phase-43-rag-infrastructure
  provides:
    - FaqEntry Prisma model with vector search support
    - ChatbotConsentLog Prisma model for GDPR compliance
    - ChatbotModule NestJS module
    - TypeScript interfaces for FAQ and consent entities
    - DTOs with validation for FAQ and consent operations
  affects:
    - 44-02 (FAQ service layer)
    - 44-03 (Consent service layer)
    - 44-04+ (Chatbot conversation service)
tech-stack:
  added: []
  patterns:
    - pgvector for question embedding similarity search
    - append-only consent logging for GDPR audit
    - barrel exports for module organization
key-files:
  created:
    - apps/backend/prisma/schema.prisma (FaqEntry, ChatbotConsentLog, FaqStatus enum)
    - apps/backend/src/modules/chatbot/chatbot.module.ts
    - apps/backend/src/modules/chatbot/index.ts
    - apps/backend/src/modules/chatbot/entities/faq-entry.entity.ts
    - apps/backend/src/modules/chatbot/entities/chatbot-consent.entity.ts
    - apps/backend/src/modules/chatbot/entities/index.ts
    - apps/backend/src/modules/chatbot/dto/faq.dto.ts
    - apps/backend/src/modules/chatbot/dto/consent.dto.ts
    - apps/backend/src/modules/chatbot/dto/index.ts
  modified:
    - apps/backend/src/app.module.ts (ChatbotModule registration)
decisions:
  - vector(1024) dimensions matches Voyage AI voyage-3 model from Phase 43
  - ChatbotConsentLog is append-only for GDPR compliance
  - FaqStatus enum (ACTIVE, DRAFT, ARCHIVED) for FAQ lifecycle
metrics:
  tasks: 4/4
  commits: 4
  duration: 13 minutes
  completed: 2026-03-03
---

# Phase 44 Plan 01: ChatbotModule Data Layer Summary

ChatbotModule with FaqEntry and ChatbotConsentLog Prisma models, TypeScript interfaces, and DTOs for FAQ priority matching and GDPR-compliant consent tracking.

## What Was Built

### 1. Prisma Models (Task 1)

**FaqEntry Model:**

- `id`, `organizationId` (tenant isolation)
- `question`, `questionVector` (vector(1024) for similarity search)
- `answer`, `relatedPolicies` (JSON with policy references)
- `category`, `tags[]`, `priority` (for FAQ ordering)
- `status` (FaqStatus enum: ACTIVE, DRAFT, ARCHIVED)
- `viewCount`, `helpfulCount` (engagement metrics)
- `createdById`, `updatedById`, `createdAt`, `updatedAt`
- Indexes: `[organizationId, status]`, `[organizationId, category]`

**ChatbotConsentLog Model:**

- `id`, `organizationId`, `sessionId`
- `consentType`, `consentVersion`, `consentTextShown`
- `consentGiven` (boolean)
- `ipAddress`, `userAgent` (audit fields)
- `capturedAt` (timestamp)
- Indexes: `[organizationId, sessionId]`, `[sessionId, capturedAt]`
- CRITICAL: Append-only for GDPR compliance

**FaqStatus Enum:**

- ACTIVE, DRAFT, ARCHIVED

### 2. TypeScript Interfaces (Task 2)

**faq-entry.entity.ts:**

- `FaqStatus` enum
- `RelatedPolicy` interface (policyId, title, section, version)
- `FaqEntry` interface matching Prisma model
- `FaqEntryWithMetrics` interface (with helpfulnessRatio, similarityScore)

**chatbot-consent.entity.ts:**

- `ConsentType` enum (DATA_PROCESSING, CONVERSATION_STORAGE, AI_ASSISTANCE, ESCALATION, RIGHT_TO_ERASURE)
- `ChatbotConsentLog` interface matching Prisma model
- `ConsentConfig` interface (version, texts, requiredBeforeChat, requiredTypes)
- `SessionConsentStatus` interface (for runtime consent checks)

### 3. DTOs (Task 3)

**faq.dto.ts:**

- `RelatedPolicyDto` - nested policy reference
- `CreateFaqDto` - create FAQ with validation
- `UpdateFaqDto` - partial update with validation
- `FaqSearchDto` - semantic search parameters (query, category, minSimilarity, limit)
- `ListFaqsDto` - paginated list with filters
- `FaqFeedbackDto` - helpful/not helpful feedback
- `FaqResponseDto`, `FaqListResponse` interfaces

**consent.dto.ts:**

- `RecordConsentDto` - capture consent record
- `CheckConsentDto` - verify session consent
- `ConsentConfigDto` - organization consent configuration
- `ConsentLogQueryDto` - audit log query
- `ConsentStatusResponse`, `ConsentLogResponse` interfaces

### 4. ChatbotModule (Task 4)

- NestJS module with PrismaModule import
- Registered in app.module.ts
- Barrel export via index.ts for entities and DTOs
- Ready for service layer implementation

## Commits

| Hash     | Message                                                       |
| -------- | ------------------------------------------------------------- |
| 3418fe7a | feat(44-01): add FaqEntry and ChatbotConsentLog Prisma models |
| ecaaa8b6 | feat(44-01): add TypeScript interfaces for chatbot entities   |
| 212dc7c8 | feat(44-01): add DTOs for FAQ and consent operations          |
| 1c121695 | feat(44-01): add ChatbotModule and register in app.module     |

## Verification

All verification commands passed:

- `npx prisma validate` - Schema valid
- `npx prisma generate` - Client generated
- `npm run build` - Build successful

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 44-02 (FAQ Service Layer):**

- FaqEntry model exists with vector field
- DTOs ready for controller binding
- TypeScript interfaces for service return types

**Ready for 44-03 (Consent Service Layer):**

- ChatbotConsentLog model exists (append-only)
- Consent DTOs ready for API
- ConsentType enum defined

**Dependencies satisfied:**

- Phase 43 RAG infrastructure provides VectorStoreService for question embedding
- vector(1024) dimensions match Voyage AI model configuration
