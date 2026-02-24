# Technology Stack Research

**Project:** Ethico Risk Intelligence Platform - Additional Stack Components
**Researched:** 2026-02-02 (base), 2026-02-24 (v2.0 additions)
**Mode:** Ecosystem (Stack-focused)
**Overall Confidence:** HIGH (verified with official docs and multiple sources)

---

## Executive Summary

This research covers the **additional stack components** needed to complete the Ethico Risk Intelligence Platform. The core stack (NestJS, Next.js 14, PostgreSQL/Prisma, shadcn/ui) is already in place. This document recommends specific technologies for:

- AI Integration (Claude API)
- Background Job Processing
- HRIS Integration
- Email/Notifications
- Real-time Features
- Search (full-text + semantic)
- PDF/Excel Report Generation
- SSO Authentication

All recommendations prioritize: (1) NestJS ecosystem compatibility, (2) TypeScript-first design, (3) enterprise scalability, and (4) production readiness.

---

## 1. AI Integration

### Recommendation: @anthropic-ai/sdk

| Component | Package | Version | Confidence |
|-----------|---------|---------|------------|
| Claude API Client | `@anthropic-ai/sdk` | ^0.71.x | HIGH |
| Agent SDK (optional) | `@anthropic-ai/claude-agent-sdk` | Latest | MEDIUM |

**Why @anthropic-ai/sdk:**

- Official TypeScript SDK from Anthropic
- Supports streaming (SSE), tool use, MCP integration
- Node.js 20+ support (matches project requirement)
- 2,900+ npm dependents - mature ecosystem
- Full type safety with TypeScript

**Installation:**
```bash
npm install @anthropic-ai/sdk
```

**Key Integration Patterns:**

```typescript
// apps/backend/src/modules/ai/providers/claude.provider.ts
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(private configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get('ANTHROPIC_API_KEY'),
    });
  }

  async generateSummary(content: string): Promise<string> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    });
    return message.content[0].type === 'text' ? message.content[0].text : '';
  }
}
```

**Alternatives Considered:**

| Alternative | Why Not |
|-------------|---------|
| `@ai-sdk/anthropic` (Vercel AI SDK) | Adds abstraction layer; direct SDK preferred for control |
| Direct REST calls | SDK handles retries, rate limits, streaming better |
| Azure OpenAI | Secondary fallback only; Claude is primary per spec |

**Sources:**
- [Anthropic SDK npm](https://www.npmjs.com/package/@anthropic-ai/sdk) - HIGH confidence
- [Client SDKs Documentation](https://docs.anthropic.com/en/api/client-sdks) - HIGH confidence
- [GitHub: anthropics/anthropic-sdk-typescript](https://github.com/anthropics/anthropic-sdk-typescript) - HIGH confidence

---

## 2. Background Job Processing

### Recommendation: @nestjs/bullmq + BullMQ + Redis

| Component | Package | Version | Confidence |
|-----------|---------|---------|------------|
| NestJS Integration | `@nestjs/bullmq` | ^11.0.x | HIGH |
| Queue Library | `bullmq` | ^5.x | HIGH |
| Admin UI | `@bull-board/nestjs` | ^5.x | HIGH |

**Why BullMQ (not Bull):**

- BullMQ is the TypeScript rewrite of Bull
- Flow producer for parent/child job hierarchies (perfect for AI pipelines)
- Better TypeScript types and modern API
- Active development (Bull is legacy)
- Official NestJS integration via `@nestjs/bullmq`

**Installation:**
```bash
npm install @nestjs/bullmq bullmq @bull-board/nestjs @bull-board/api
```

**Use Cases for This Platform:**

| Queue | Purpose | Priority |
|-------|---------|----------|
| `ai-processing` | Claude API calls (summaries, translations) | Normal |
| `email-delivery` | Transactional emails, notifications | High |
| `hris-sync` | Employee data synchronization | Low |
| `report-generation` | PDF/Excel export generation | Low |
| `search-indexing` | Elasticsearch document indexing | Normal |

**Key Best Practices:**

1. **Reuse Redis connections** - Use ioredis connection pooling
2. **Set removeOnComplete/removeOnFail** - Avoid Redis memory bloat
3. **Implement graceful shutdown** - Let in-flight jobs finish
4. **Use dead-letter queues** - For failed job investigation
5. **Monitor with Bull Board** - Visualize queue health

**Sources:**
- [NestJS Queues Documentation](https://docs.nestjs.com/techniques/queues) - HIGH confidence
- [BullMQ Official Docs - NestJS](https://docs.bullmq.io/guide/nestjs) - HIGH confidence
- [npm: @nestjs/bullmq](https://www.npmjs.com/package/@nestjs/bullmq) - HIGH confidence

---

## 3. HRIS Integration

### Recommendation: @mergeapi/merge-hris-node (Merge.dev)

| Component | Package | Version | Confidence |
|-----------|---------|---------|------------|
| HRIS Unified API | `@mergeapi/merge-hris-node` | Latest | HIGH |

**Why Merge.dev:**

- Single API for 50+ HRIS systems (Workday, BambooHR, ADP, UKG, etc.)
- Handles OAuth/auth complexity for each provider
- Enterprise-grade with SOC2 compliance
- Used by Ramp, BILL, AngelList (per spec competitors)
- White-glove support for enterprise customers
- Official Node.js/TypeScript SDK

**Installation:**
```bash
npm install @mergeapi/merge-hris-node
```

**Integration Pattern:**

```typescript
import { HrisApi, HttpBearerAuth } from '@mergeapi/merge-hris-node';

@Injectable()
export class HRISService {
  private api: HrisApi;

  async syncEmployees(accountToken: string): Promise<Employee[]> {
    // Merge handles the complexity of each HRIS provider
    const response = await this.api.employeesList(accountToken);
    return response.results.map(this.mapToInternalEmployee);
  }
}
```

**Alternatives Considered:**

| Alternative | Why Not |
|-------------|---------|
| Direct API integrations | Too many providers to maintain (Workday, BambooHR, ADP, etc.) |
| Finch.io | Merge has better enterprise HRIS coverage |
| Custom adapters | Maintenance burden; Merge handles updates |

**Sources:**
- [Merge.dev HRIS Documentation](https://docs.merge.dev/hris/) - HIGH confidence
- [npm: @mergeapi/merge-hris-node](https://www.npmjs.com/package/@mergeapi/merge-hris-node) - HIGH confidence
- [GitHub: merge-api/merge-hris-node](https://github.com/merge-api/merge-hris-node) - HIGH confidence

---

## 4. Email Service

### Recommendation: Resend + @nestjs-modules/mailer + React Email

| Component | Package | Version | Confidence |
|-----------|---------|---------|------------|
| Email API | `resend` | ^3.x | HIGH |
| NestJS Integration | `@nestjs-modules/mailer` | ^2.x | HIGH |
| Email Templates | `@react-email/components` | Latest | MEDIUM |
| Nodemailer (transport) | `nodemailer` | ^6.x | HIGH |

**Why Resend:**

- Modern developer experience, excellent DX
- Simple API, generous free tier (3K emails/month)
- React Email support for type-safe templates
- Excellent deliverability
- Webhook support for delivery tracking
- Alternative: Can use nodemailer with any SMTP for self-hosted option

**Installation:**
```bash
npm install resend @nestjs-modules/mailer nodemailer @react-email/components
npm install -D @types/nodemailer
```

**Dual Strategy (Recommended):**

1. **Resend** for transactional emails (password resets, notifications)
2. **@nestjs-modules/mailer + SMTP** as fallback/self-hosted option

**Integration Pattern:**

```typescript
// Using Resend
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendNotification(to: string, subject: string, html: string) {
    return this.resend.emails.send({
      from: 'Ethico <notifications@ethico.com>',
      to,
      subject,
      html,
    });
  }
}
```

**Alternatives Considered:**

| Alternative | Why Not Recommended as Primary |
|-------------|-------------------------------|
| SendGrid | More complex setup, less modern DX |
| Amazon SES | Requires AWS infrastructure, more setup |
| Mailgun | Good option, but Resend has better DX |
| Postmark | Similar to Resend, either works |

**Sources:**
- [Resend Node.js Guide](https://resend.com/docs/send-with-nodejs) - HIGH confidence
- [NestJS Mailer Module](https://github.com/nest-modules/mailer) - HIGH confidence
- [5 Best Email API for Node.js 2026](https://mailtrap.io/blog/best-email-api-for-nodejs-developers/) - MEDIUM confidence

---

## 5. Real-time Features

### Recommendation: Socket.IO + @nestjs/websockets + Hocuspocus/Y.js

| Component | Package | Version | Purpose | Confidence |
|-----------|---------|---------|---------|------------|
| WebSocket Gateway | `@nestjs/websockets` | ^10.x | Real-time notifications | HIGH |
| Socket.IO | `@nestjs/platform-socket.io` | ^10.x | Transport layer | HIGH |
| Redis Adapter | `@socket.io/redis-adapter` | ^8.x | Horizontal scaling | HIGH |
| CRDT Collaboration | `yjs` | ^13.x | Document collaboration | HIGH |
| Y.js Backend | `@hocuspocus/server` | ^2.x | Collaboration server | MEDIUM |

**Architecture:**

1. **Real-time Notifications**: Socket.IO via NestJS WebSocket Gateway
2. **Document Collaboration**: Y.js + Hocuspocus (for policy editing)

**Installation:**
```bash
# Notifications
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io @socket.io/redis-adapter

# Collaboration (if needed)
npm install yjs @hocuspocus/server @tiptap/extension-collaboration
```

**Key Patterns:**

```typescript
// WebSocket Gateway for notifications
@WebSocketGateway({ cors: true })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Socket>();

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    this.userSockets.set(userId, client);
  }

  notifyUser(userId: string, event: string, data: any) {
    const socket = this.userSockets.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }
}
```

**Best Practices:**

1. **Map userId to socket** - Don't rely on socket.id
2. **Use rooms for targeted broadcasts** - `policy-${policyId}`, `case-${caseId}`
3. **Redis adapter for multi-instance** - Required for horizontal scaling
4. **Offline queue** - Store notifications for offline users
5. **Tenant isolation** - Prefix rooms with orgId

**Sources:**
- [Building Production-Ready Real-Time Notification System in NestJS](https://medium.com/@marufpulok98/building-a-production-ready-real-time-notification-system-in-nestjs-websockets-redis-offline-6cc2f1bd0b05) - HIGH confidence
- [Tiptap Collaboration with Hocuspocus](https://tiptap.dev/docs/hocuspocus/getting-started/overview) - HIGH confidence
- [Y.js Documentation](https://docs.yjs.dev/) - HIGH confidence

---

## 6. Search (Full-text + Semantic)

### Recommendation: Hybrid Approach - Elasticsearch + pgvector

| Component | Package | Version | Purpose | Confidence |
|-----------|---------|---------|---------|------------|
| Full-text Search | `@elastic/elasticsearch` | ^8.x | Keyword search, filters | HIGH |
| NestJS Module | `@nestjs/elasticsearch` | ^10.x | NestJS integration | HIGH |
| Vector Embeddings | `pgvector` | ^0.2.x | Semantic search, AI features | HIGH |

**Why Hybrid:**

- **Elasticsearch**: Complex queries, faceted search, aggregations, log analytics
- **pgvector**: Embeddings storage, semantic similarity, RAG applications

Per the research, this combination provides:
- Keyword search (exact matches) via Elasticsearch
- Semantic search (meaning-based) via pgvector
- Both can be combined for optimal retrieval

**Installation:**
```bash
# Elasticsearch
npm install @elastic/elasticsearch @nestjs/elasticsearch

# pgvector (for Prisma)
npm install pgvector
```

**Elasticsearch Usage:**

```typescript
@Injectable()
export class SearchService {
  constructor(private readonly esService: ElasticsearchService) {}

  async searchCases(orgId: string, query: string) {
    return this.esService.search({
      index: `org_${orgId}_cases`,
      body: {
        query: {
          bool: {
            must: [
              { multi_match: { query, fields: ['title', 'description', 'aiSummary'] } }
            ]
          }
        }
      }
    });
  }
}
```

**pgvector for Semantic Search:**

```typescript
// Store embedding
const embedding = pgvector.toSql(await this.getEmbedding(text));
await prisma.$executeRaw`INSERT INTO cases (id, embedding) VALUES (${id}, ${embedding}::vector)`;

// Find similar
const results = await prisma.$queryRaw`
  SELECT id, embedding <-> ${queryEmbedding}::vector as distance
  FROM cases WHERE organization_id = ${orgId}
  ORDER BY distance LIMIT 10
`;
```

**When to Use Each:**

| Use Case | Technology |
|----------|------------|
| Full-text search with filters | Elasticsearch |
| Faceted navigation | Elasticsearch |
| Similar case detection | pgvector |
| AI-powered Q&A (RAG) | pgvector |
| Policy semantic search | pgvector |
| Analytics/aggregations | Elasticsearch |

**Sources:**
- [NestJS Elasticsearch Module](https://github.com/nestjs/elasticsearch) - HIGH confidence
- [pgvector Node.js](https://github.com/pgvector/pgvector-node) - HIGH confidence
- [Elastic vs pgvector Comparison](https://zilliz.com/comparison/elastic-vs-pgvector) - MEDIUM confidence
- [Prisma ORM 6.13.0 pgvector Support](https://www.prisma.io/blog/orm-6-13-0-ci-cd-workflows-and-pgvector-for-prisma-postgres) - HIGH confidence

---

## 7. PDF/Excel Report Generation

### Recommendation: Puppeteer (PDF) + ExcelJS (Excel)

| Component | Package | Version | Purpose | Confidence |
|-----------|---------|---------|---------|------------|
| PDF Generation | `puppeteer` | ^23.x | HTML-to-PDF conversion | HIGH |
| Excel Generation | `exceljs` | ^4.x | XLSX file creation | HIGH |

**Why Puppeteer for PDF:**

- Pixel-perfect HTML/CSS rendering
- Supports complex layouts, charts, styling
- Uses existing React components for templates
- Enterprise standard for report generation

**Why ExcelJS for Excel:**

- Streaming support for large files (1M+ rows)
- Full Excel feature support (formulas, styles, charts)
- TypeScript types included
- Memory-efficient for enterprise scale

**Installation:**
```bash
npm install puppeteer exceljs
npm install -D @types/puppeteer
```

**PDF Generation Pattern:**

```typescript
import puppeteer from 'puppeteer';

@Injectable()
export class PDFService {
  async generateCaseReport(caseId: string): Promise<Buffer> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Render React template server-side or use HTML template
    const html = await this.renderTemplate('case-report', { caseId });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1in', bottom: '1in', left: '0.5in', right: '0.5in' }
    });

    await browser.close();
    return pdf;
  }
}
```

**Excel Generation Pattern:**

```typescript
import ExcelJS from 'exceljs';

@Injectable()
export class ExcelService {
  async generateCasesExport(cases: Case[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Cases');

    sheet.columns = [
      { header: 'Case ID', key: 'id', width: 20 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Created', key: 'createdAt', width: 20 },
    ];

    sheet.addRows(cases);

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }
}
```

**Alternatives Considered:**

| Alternative | Why Not Primary |
|-------------|-----------------|
| PDFKit | Lower-level API, more code for complex layouts |
| jsPDF | Client-side focused, less capable server-side |
| SheetJS | Missing styling in free version |
| pdfmake | Good for simple docs, Puppeteer better for complex |

**Sources:**
- [Puppeteer PDF Generation](https://pptr.dev/guides/pdf-generation) - HIGH confidence
- [ExcelJS npm](https://www.npmjs.com/package/exceljs) - HIGH confidence
- [ExcelJS Streaming 2026 Guide](https://copyprogramming.com/howto/stream-huge-excel-file-using-exceljs-in-node) - MEDIUM confidence

---

## 8. SSO Authentication

### Recommendation: passport-saml + passport-azure-ad + @nestjs/passport

| Component | Package | Version | Purpose | Confidence |
|-----------|---------|---------|---------|------------|
| NestJS Passport | `@nestjs/passport` | ^10.x | Auth framework | HIGH |
| SAML 2.0 | `passport-saml` | ^3.x | Generic SAML IdPs | HIGH |
| Azure AD | `passport-azure-ad` | ^4.x | Microsoft Entra ID | HIGH |
| Google OAuth | `passport-google-oauth20` | ^2.x | Google SSO | HIGH |

**Why This Combination:**

- **passport-saml**: Works with any SAML 2.0 IdP (Okta, OneLogin, etc.)
- **passport-azure-ad**: Native Microsoft support, better than generic SAML for Azure
- Both integrate cleanly with NestJS via @nestjs/passport

**Installation:**
```bash
npm install @nestjs/passport passport passport-saml passport-azure-ad passport-google-oauth20
npm install -D @types/passport-saml @types/passport-google-oauth20
```

**Multi-tenant SSO Pattern:**

```typescript
// Dynamic strategy based on org configuration
@Injectable()
export class SSOService {
  async getStrategyForOrg(orgId: string): Promise<Strategy> {
    const ssoConfig = await this.getSSOConfig(orgId);

    switch (ssoConfig.type) {
      case 'azure_ad':
        return new AzureADStrategy(ssoConfig);
      case 'saml':
        return new SamlStrategy(ssoConfig);
      case 'google':
        return new GoogleStrategy(ssoConfig);
    }
  }
}
```

**Key Implementation Notes:**

1. Store SSO config per-organization in database
2. Dynamic strategy loading based on org settings
3. Support SP-initiated and IdP-initiated flows
4. Map SAML attributes to platform roles

**Sources:**
- [NestJS Authentication](https://docs.nestjs.com/security/authentication) - HIGH confidence
- [passport-saml GitHub](https://github.com/node-saml/passport-saml) - HIGH confidence
- [Implementing SAML SSO in Node.js](https://www.sheshbabu.com/posts/implementing-saml-authentication-in-node-js/) - MEDIUM confidence
- [NestJS Azure AD Authentication](https://medium.com/@swagatachaudhuri/implement-azure-ad-authentication-in-nest-js-1fe947da2c99) - MEDIUM confidence

---

## Complete Installation Summary

### Production Dependencies

```bash
# AI Integration
npm install @anthropic-ai/sdk

# Background Jobs
npm install @nestjs/bullmq bullmq @bull-board/nestjs @bull-board/api ioredis

# HRIS Integration
npm install @mergeapi/merge-hris-node

# Email Service
npm install resend @nestjs-modules/mailer nodemailer @react-email/components

# Real-time
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io @socket.io/redis-adapter
npm install yjs @hocuspocus/server  # If collaboration needed

# Search
npm install @elastic/elasticsearch @nestjs/elasticsearch pgvector

# Report Generation
npm install puppeteer exceljs

# SSO
npm install @nestjs/passport passport passport-saml passport-azure-ad passport-google-oauth20
```

### Dev Dependencies

```bash
npm install -D @types/nodemailer @types/passport-saml @types/passport-google-oauth20
```

---

## Environment Variables Required

```bash
# AI
ANTHROPIC_API_KEY=sk-ant-...

# Redis (for BullMQ + Socket.IO)
REDIS_URL=redis://localhost:6379

# HRIS
MERGE_API_KEY=...
MERGE_ACCOUNT_TOKEN=...  # Per-tenant

# Email
RESEND_API_KEY=re_...
SMTP_HOST=...  # Fallback
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=...
ELASTICSEARCH_PASSWORD=...

# SSO (stored per-org, but env for defaults)
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## Confidence Assessment Summary

| Component | Recommendation | Confidence | Notes |
|-----------|----------------|------------|-------|
| AI Integration | @anthropic-ai/sdk | HIGH | Official SDK, well-documented |
| Background Jobs | @nestjs/bullmq | HIGH | Official NestJS module |
| HRIS | Merge.dev | HIGH | Industry standard unified API |
| Email | Resend + nodemailer | HIGH | Modern with fallback |
| Real-time | Socket.IO + Y.js | HIGH | Proven production stack |
| Search | ES + pgvector | HIGH | Hybrid approach per spec |
| PDF | Puppeteer | HIGH | Enterprise standard |
| Excel | ExcelJS | HIGH | Best streaming support |
| SSO | passport-saml | HIGH | Mature, widely used |

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| Bull (legacy) | Use BullMQ instead - TypeScript rewrite |
| SendGrid/Mailgun | Resend has better DX; use as alternative only |
| Milvus/Pinecone | pgvector sufficient for this scale; avoids vendor lock |
| PDFKit | Puppeteer better for complex HTML templates |
| SheetJS free | Missing styling; ExcelJS is more complete |
| Direct HRIS APIs | Too many to maintain; use Merge.dev unified API |
| Custom CRDT | Y.js is battle-tested; don't reinvent |

---

## Open Questions for Phase-Specific Research

1. **Puppeteer on Azure**: May need container-based deployment with Chrome
2. **Elasticsearch sizing**: Requires capacity planning based on data volume
3. **Y.js persistence**: Database storage strategy for collaborative documents
4. **Rate limiting specifics**: Claude API tier limits per pricing plan

---

## Sources Summary

### HIGH Confidence (Official Docs/SDKs)
- [Anthropic SDK npm](https://www.npmjs.com/package/@anthropic-ai/sdk)
- [NestJS Queues Documentation](https://docs.nestjs.com/techniques/queues)
- [BullMQ Official Docs](https://docs.bullmq.io/guide/nestjs)
- [Merge.dev HRIS Docs](https://docs.merge.dev/hris/)
- [Elasticsearch JS Client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/introduction.html)
- [pgvector Node.js](https://github.com/pgvector/pgvector-node)

### MEDIUM Confidence (Community/Tutorials)
- [NestJS Real-Time Notifications](https://medium.com/@marufpulok98/building-a-production-ready-real-time-notification-system-in-nestjs-websockets-redis-offline-6cc2f1bd0b05)
- [Resend Node.js](https://resend.com/docs/send-with-nodejs)
- [ExcelJS Streaming Guide](https://copyprogramming.com/howto/stream-huge-excel-file-using-exceljs-in-node)

---

# v2.0 Intelligence Layer Additions

**Updated:** 2026-02-24
**Focus:** Stack additions for v2.0 capabilities (pgvector RAG, rules engine, anonymous relay, PWA, chatbot, currency conversion, scheduled reports, GDPR deletion)

## Executive Summary (v2.0)

The existing stack is production-hardened and well-chosen. v2.0 additions focus on **augmenting** rather than replacing. Key additions:

1. **pgvector 0.8.x** - Semantic search via PostgreSQL extension (no new database)
2. **voyageai 0.1.x** - Embeddings (Anthropic's recommended partner)
3. **llamaindex 0.12.x** - RAG pipeline orchestration (retrieval-first, ideal for document search)
4. **json-rules-engine 7.3.x** - Already installed, use for routing/automation rules
5. **@serwist/next** - PWA upgrade from existing @ducanh2912/next-pwa
6. **web-push** - Push notifications for PWA
7. **open-exchange-rates + money** - Currency conversion for GT&E

**DO NOT ADD:**
- LangChain (overkill for this use case; LlamaIndex is retrieval-focused)
- Separate vector database (pgvector keeps data in PostgreSQL with RLS)
- Signal Protocol (over-engineered for anonymous relay; use AES-256-GCM)

---

## 9. pgvector (Semantic Search & RAG)

**Package:** PostgreSQL extension (server-side) + `pgvector` npm helper
**Version:** 0.8.1 (PostgreSQL extension), 0.2.1 (npm)
**Purpose:** Store document embeddings for RAG chatbot and semantic search

**Why pgvector:**
- Already using PostgreSQL 15+ with RLS - no new database needed
- Azure Database for PostgreSQL Flexible Server supports pgvector 0.7.0+ (GA as of June 2024)
- Keeps embeddings under same RLS policies as other tenant data
- HNSW indexing for fast approximate nearest neighbor search
- Supports up to 2,000 dimensions (sufficient for voyage-4-large at 1,024)

**Installation:**
```sql
-- Enable extension (Azure: add to allowlist first)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector column (1024 dimensions for voyage-4-large)
ALTER TABLE documents ADD COLUMN embedding vector(1024);

-- Create HNSW index for fast similarity search
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);
```

**Prisma Integration:**
```prisma
// schema.prisma - Use Unsupported type
model Document {
  id           String   @id @default(uuid())
  organizationId String @map("organization_id")
  content      String
  embedding    Unsupported("vector(1024)")?
  // ... other fields
}
```

**Node.js Usage:**
```typescript
import pgvector from 'pgvector';

// Store embedding
await prisma.$executeRaw`
  UPDATE documents SET embedding = ${pgvector.toSql(embedding)}::vector
  WHERE id = ${docId}
`;

// Similarity search
const results = await prisma.$queryRaw`
  SELECT id, content, 1 - (embedding <=> ${pgvector.toSql(queryEmbedding)}::vector) as similarity
  FROM documents
  WHERE organization_id = ${orgId}
  ORDER BY embedding <=> ${pgvector.toSql(queryEmbedding)}::vector
  LIMIT 10
`;
```

**Confidence:** HIGH - Verified via [Azure PostgreSQL docs](https://learn.microsoft.com/en-us/azure/postgresql/extensions/how-to-use-pgvector), [pgvector GitHub](https://github.com/pgvector/pgvector), [pgvector-node](https://github.com/pgvector/pgvector-node)

---

## 10. Voyage AI Embeddings

**Package:** `voyageai`
**Version:** 0.1.0
**Purpose:** Generate embeddings for documents and queries (Anthropic's recommended embedding partner)

**Why Voyage AI:**
- Anthropic does not offer its own embedding model; [partners with Voyage AI](https://platform.claude.com/docs/en/build-with-claude/embeddings)
- voyage-4-large: 1,024 dimensions, best-in-class retrieval quality
- 35% better retrieval accuracy than competitors in 2025 benchmarks
- Simple API, TypeScript SDK available

**Installation:**
```bash
npm install voyageai
```

**Usage:**
```typescript
import { VoyageAIClient } from 'voyageai';

const client = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

// Generate embeddings
const response = await client.embed({
  input: ['Policy document text here...'],
  model: 'voyage-4-large', // 1024 dimensions
});

const embedding = response.data[0].embedding; // number[]
```

**Cost Considerations:**
- voyage-4-large: $0.12 per 1M tokens
- For RAG: embed documents once, embed queries on-demand
- Cache query embeddings in Redis for repeated searches

**Confidence:** HIGH - Verified via [Voyage AI npm](https://www.npmjs.com/package/voyageai), [Anthropic docs](https://platform.claude.com/docs/en/build-with-claude/embeddings)

---

## 11. LlamaIndex.TS (RAG Pipeline)

**Package:** `llamaindex`
**Version:** 0.12.1
**Purpose:** RAG pipeline orchestration for chatbot document retrieval

**Why LlamaIndex (not LangChain):**
- **Retrieval-first architecture** - optimized for document search use case
- 40% faster document retrieval than LangChain in benchmarks
- Better abstraction for indexing strategies and query-time synthesis
- Simpler mental model: ingest -> index -> query
- LangChain is orchestration-first (agents, chains, tools) - overkill for RAG chatbot

**Installation:**
```bash
npm install llamaindex @llamaindex/anthropic
```

**Integration Pattern:**
```typescript
import { VectorStoreIndex, Document, serviceContextFromDefaults } from 'llamaindex';
import { Anthropic } from '@llamaindex/anthropic';

// Service context with Claude
const serviceContext = serviceContextFromDefaults({
  llm: new Anthropic({ model: 'claude-sonnet-4-20250514' }),
});

// Create index from documents
const documents = policies.map(p => new Document({ text: p.content, metadata: { id: p.id } }));
const index = await VectorStoreIndex.fromDocuments(documents, { serviceContext });

// Query with confidence scoring
const queryEngine = index.asQueryEngine();
const response = await queryEngine.query('What is our gift policy?');
```

**Confidence:** HIGH - Verified via [LlamaIndex npm](https://www.npmjs.com/package/llamaindex), [LlamaIndex.TS docs](https://developers.llamaindex.ai/typescript/framework/)

---

## 12. Rules Engine (Already Installed)

**Package:** `json-rules-engine`
**Version:** 7.3.1 (already in package.json)
**Purpose:** Configurable routing rules, SLA monitoring, escalation triggers, disclosure thresholds

**Why json-rules-engine:**
- Already installed and available
- Rules expressed in JSON - can be stored in database per tenant
- Supports nested AND/OR conditions
- No eval() - secure by design
- 188 other npm projects use it (proven in production)

**Use Cases for v2.0:**
```typescript
import { Engine } from 'json-rules-engine';

// Case routing rule (stored in DB, configurable per tenant)
const routingRule = {
  conditions: {
    all: [
      { fact: 'category', operator: 'equal', value: 'financial_fraud' },
      { fact: 'severity', operator: 'greaterThanInclusive', value: 3 },
    ]
  },
  event: {
    type: 'route-to-team',
    params: { teamId: 'investigations-team' }
  }
};

// Disclosure threshold rule
const thresholdRule = {
  conditions: {
    any: [
      { fact: 'giftValue', operator: 'greaterThan', value: 100 },
      { fact: 'recipientType', operator: 'equal', value: 'government_official' },
    ]
  },
  event: {
    type: 'create-case',
    params: { reason: 'Gift threshold exceeded' }
  }
};
```

**Architecture:**
- Store rules in `ThresholdRule` / `RoutingRule` tables (per tenant)
- Execute via `RulesEngineService` on RIU creation, case events
- Emit events to BullMQ for async processing

**Confidence:** HIGH - Already installed, well-documented

---

## 13. PWA Infrastructure

**Current:** `@ducanh2912/next-pwa` 10.2.9
**Upgrade to:** `@serwist/next` (successor, actively maintained)
**Add:** `web-push` for push notifications

**Why Serwist:**
- @ducanh2912/next-pwa recommends migrating to @serwist/next
- Serwist is a fork of Workbox with active maintenance
- Better Next.js 14+ App Router support
- Built-in offline support and caching strategies

**Installation:**
```bash
npm uninstall @ducanh2912/next-pwa
npm install @serwist/next
npm install -D serwist
npm install web-push  # Backend for push notifications
```

**Service Worker Configuration:**
```typescript
// next.config.js
import withSerwist from '@serwist/next';

export default withSerwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
})({
  // existing next config
});
```

**Push Notifications (Backend):**
```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:support@ethico.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Send push notification
await webpush.sendNotification(subscription, JSON.stringify({
  title: 'Case Assigned',
  body: 'You have been assigned case #12345',
  data: { caseId: '12345' }
}));
```

**Offline Data (Already Available):**
- Frontend already has `dexie` and `dexie-encrypted` for IndexedDB
- Use for offline draft saving, queue actions for sync

**Confidence:** HIGH - Verified via [Serwist docs](https://serwist.pages.dev/docs/next/getting-started), [web-push npm](https://www.npmjs.com/package/web-push)

---

## 14. Anonymous Communication Relay

**Approach:** Custom implementation using AES-256-GCM encryption
**DO NOT USE:** Signal Protocol (over-engineered for this use case)

**Why NOT Signal Protocol:**
- Signal Protocol is for end-to-end encrypted messaging between two parties who both have keys
- Our use case is simpler: anonymous access code -> encrypted relay -> case assignee
- We control both ends (reporter portal + operator console)
- AES-256-GCM with proper key derivation is sufficient and auditable

**Architecture:**
```typescript
// Anonymous Message Relay Pattern

// 1. Reporter submits message via access code
// 2. System encrypts with org-specific key + message-specific salt
// 3. Message stored encrypted in `CaseMessage` table
// 4. Assignee views via decryption (key derived from their session)
// 5. Reply follows same pattern in reverse

interface AnonymousMessage {
  id: string;
  caseId: string;
  direction: 'inbound' | 'outbound';
  encryptedContent: Buffer;  // AES-256-GCM encrypted
  iv: Buffer;                // Initialization vector
  authTag: Buffer;           // Authentication tag
  senderType: 'anonymous_reporter' | 'case_assignee';
  createdAt: Date;
}
```

**Encryption Service:**
```typescript
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';

@Injectable()
export class AnonymousRelayService {
  private async deriveKey(orgId: string, messageId: string): Promise<Buffer> {
    const salt = `${orgId}:${messageId}`;
    return new Promise((resolve, reject) => {
      scrypt(process.env.RELAY_MASTER_KEY, salt, 32, (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });
  }

  async encryptMessage(content: string, orgId: string, messageId: string) {
    const key = await this.deriveKey(orgId, messageId);
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(content, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return {
      encryptedContent: encrypted,
      iv,
      authTag: cipher.getAuthTag(),
    };
  }
}
```

**Chinese Wall Pattern:**
- Messages are stored encrypted
- Reporter never sees assignee identity
- Assignee never sees reporter identity (unless identified report)
- All decryption logged to audit trail
- Access controlled by case assignment

**Confidence:** HIGH - Standard cryptographic patterns, auditable

---

## 15. Currency Conversion (GT&E)

**Packages:** `open-exchange-rates` + `money`
**Versions:** Latest stable
**Purpose:** Convert gift values to base currency for threshold comparison

**Installation:**
```bash
npm install open-exchange-rates money
```

**Usage:**
```typescript
import oxr from 'open-exchange-rates';
import fx from 'money';

@Injectable()
export class CurrencyService {
  private ratesLoaded = false;

  async loadRates() {
    oxr.set({ app_id: process.env.OPEN_EXCHANGE_RATES_APP_ID });

    await new Promise<void>((resolve, reject) => {
      oxr.latest((err) => {
        if (err) reject(err);
        else {
          fx.rates = oxr.rates;
          fx.base = oxr.base;
          this.ratesLoaded = true;
          resolve();
        }
      });
    });
  }

  convert(amount: number, from: string, to: string): number {
    if (!this.ratesLoaded) throw new Error('Rates not loaded');
    return fx.convert(amount, { from, to });
  }
}
```

**Caching Strategy:**
- Refresh rates daily via @nestjs/schedule cron job
- Store rates in Redis cache
- Fallback to cached rates if API unavailable

**Cost:** Free tier allows 1,000 requests/month (sufficient for daily refresh)

**Confidence:** HIGH - Verified via [Open Exchange Rates npm](https://www.npmjs.com/package/open-exchange-rates)

---

## 16. Scheduled Report Delivery

**Existing Infrastructure:** @nestjs/schedule (6.1.0) + BullMQ (5.67.2) + puppeteer (24.36.1) + exceljs (4.4.0)
**No new packages needed**

**Why Use Existing Stack:**
- @nestjs/schedule for cron definitions
- BullMQ for distributed job execution (prevents duplicate runs in multi-instance)
- puppeteer already installed for PDF generation
- exceljs already installed for Excel export

**Architecture:**
```typescript
// ScheduledExport entity already exists in schema

@Injectable()
export class ReportSchedulerService {
  constructor(
    @InjectQueue('reports') private reportsQueue: Queue,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async scheduleExport(export: ScheduledExport) {
    // Use BullMQ repeatable jobs instead of @Cron decorator
    // This prevents duplicate execution in multi-instance deployment
    await this.reportsQueue.add(
      'generate-scheduled-report',
      { exportId: export.id },
      {
        repeat: { cron: export.cronExpression },
        jobId: `scheduled-export-${export.id}`,
      }
    );
  }
}

@Processor('reports')
export class ReportProcessor {
  @Process('generate-scheduled-report')
  async handleScheduledReport(job: Job<{ exportId: string }>) {
    const export = await this.getExport(job.data.exportId);

    // Generate based on format
    if (export.format === 'pdf') {
      return this.generatePdf(export);
    } else {
      return this.generateExcel(export);
    }
  }

  private async generatePdf(export: ScheduledExport) {
    const browser = await puppeteer.launch({ headless: true });
    // ... render report HTML, convert to PDF
  }

  private async generateExcel(export: ScheduledExport) {
    const workbook = new ExcelJS.Workbook();
    // ... populate workbook
  }
}
```

**Multi-Instance Handling:**
- BullMQ uses Redis as coordination layer
- Only one instance processes each scheduled job
- No duplicate reports generated

**Confidence:** HIGH - Using existing installed packages

---

## 17. GDPR Data Deletion Workflow

**Approach:** Soft delete + scheduled hard delete + anonymization
**No new packages needed**

**Strategy:**
1. **Soft Delete:** Mark records with `deletedAt` timestamp
2. **Grace Period:** 30-day window for recovery
3. **Hard Delete:** BullMQ scheduled job for permanent deletion
4. **Anonymization:** For records that must be retained (audit trail)

**Implementation:**
```typescript
// Add to relevant models
model Person {
  // ... existing fields
  deletedAt         DateTime?  @map("deleted_at")
  deletionRequestId String?    @map("deletion_request_id")
  anonymizedAt      DateTime?  @map("anonymized_at")
}

model GdprDeletionRequest {
  id                String   @id @default(uuid())
  organizationId    String   @map("organization_id")
  requestType       String   // 'erasure' | 'anonymization'
  subjectIdentifier String   @map("subject_identifier") // email or employee ID
  requestedAt       DateTime @default(now()) @map("requested_at")
  scheduledDeletionAt DateTime @map("scheduled_deletion_at")
  completedAt       DateTime? @map("completed_at")
  status            String   // 'pending' | 'processing' | 'completed' | 'failed'
  affectedTables    Json     @map("affected_tables") // Record of what was deleted/anonymized
}
```

**Anonymization Service:**
```typescript
@Injectable()
export class GdprService {
  async anonymizePerson(personId: string, orgId: string) {
    const anonymizedData = {
      firstName: 'REDACTED',
      lastName: 'REDACTED',
      email: `anonymized-${nanoid(8)}@deleted.local`,
      phone: null,
      // Keep: organizationId, createdAt (for audit)
    };

    await this.prisma.person.update({
      where: { id: personId, organizationId: orgId },
      data: {
        ...anonymizedData,
        anonymizedAt: new Date(),
      },
    });

    // Log to GDPR audit trail
    await this.auditService.log({
      action: 'GDPR_ANONYMIZATION',
      entityType: 'Person',
      entityId: personId,
      organizationId: orgId,
    });
  }
}
```

**Key Principles:**
- Anonymization must be irreversible
- Audit logs are anonymized, not deleted (legal requirement)
- Cascade to related records (disclosures, case associations)
- Tenant isolation maintained throughout

**Confidence:** HIGH - Standard patterns, verified via [GDPR best practices](https://www.reform.app/blog/best-practices-gdpr-compliant-data-deletion)

---

## v2.0 Summary: Packages to Add

| Package | Version | Purpose | Backend/Frontend |
|---------|---------|---------|------------------|
| `voyageai` | ^0.1.0 | Embedding generation | Backend |
| `llamaindex` | ^0.12.1 | RAG pipeline orchestration | Backend |
| `@llamaindex/anthropic` | ^0.1.x | LlamaIndex + Claude integration | Backend |
| `pgvector` | ^0.2.1 | PostgreSQL vector utilities | Backend |
| `@serwist/next` | ^9.x | PWA service worker | Frontend |
| `serwist` | ^9.x | Service worker utilities (dev) | Frontend |
| `web-push` | ^3.x | Push notifications | Backend |
| `open-exchange-rates` | ^1.x | Exchange rate API client | Backend |
| `money` | ^0.2.x | Currency conversion | Backend |

## Packages to Remove

| Package | Reason |
|---------|--------|
| `@ducanh2912/next-pwa` | Replaced by @serwist/next |

## Packages Already Installed (Use As-Is)

| Package | Version | v2.0 Use Case |
|---------|---------|---------------|
| `json-rules-engine` | 7.3.1 | Routing rules, thresholds, automation |
| `@nestjs/schedule` | 6.1.0 | Cron job definitions |
| `bullmq` | 5.67.2 | Distributed job execution |
| `puppeteer` | 24.36.1 | PDF report generation |
| `exceljs` | 4.4.0 | Excel report generation |
| `@anthropic-ai/sdk` | 0.72.1 | Claude API for RAG responses |
| `dexie` | 3.2.7 | Offline IndexedDB storage |
| `dexie-encrypted` | 2.0.0 | Encrypted offline storage |

---

## v2.0 Configuration Requirements

### PostgreSQL Extension (pgvector)

**Azure Database for PostgreSQL Flexible Server:**
```sql
-- 1. Add to allowlist (Azure Portal or CLI)
-- az postgres flexible-server parameter set --name azure.extensions --value vector

-- 2. Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 3. Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Environment Variables (New for v2.0)

```bash
# Voyage AI (Embeddings)
VOYAGE_API_KEY=pa-xxxxxxxx

# Open Exchange Rates (Currency)
OPEN_EXCHANGE_RATES_APP_ID=xxxxxxxx

# Web Push (PWA Notifications)
VAPID_PUBLIC_KEY=xxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxx

# Anonymous Relay Encryption
RELAY_MASTER_KEY=xxxxxxxx  # Generate with: openssl rand -base64 32
```

### Redis Configuration (Existing)

No changes needed. BullMQ already configured for job queues.

---

## Integration Points with Existing Stack

### AI Module Integration

The existing `apps/backend/src/modules/ai/` already has:
- `ClaudeProvider` for LLM calls
- `ConversationService` for chat history
- `ContextLoaderService` for entity context
- WebSocket gateway for streaming

**RAG Integration:**
```typescript
// Extend AIOrchestrationService
@Injectable()
export class RAGService {
  constructor(
    private voyageClient: VoyageAIClient,
    private prisma: PrismaService,
    private aiOrchestration: AIOrchestrationService,
  ) {}

  async queryWithRAG(query: string, orgId: string, context: EntityContext) {
    // 1. Generate query embedding
    const queryEmbedding = await this.voyageClient.embed({
      input: [query],
      model: 'voyage-4-large',
    });

    // 2. Retrieve relevant documents via pgvector
    const relevantDocs = await this.prisma.$queryRaw`
      SELECT id, content, 1 - (embedding <=> ${pgvector.toSql(queryEmbedding.data[0].embedding)}::vector) as similarity
      FROM policy_versions
      WHERE organization_id = ${orgId}
      ORDER BY embedding <=> ${pgvector.toSql(queryEmbedding.data[0].embedding)}::vector
      LIMIT 5
    `;

    // 3. Build prompt with context
    const augmentedPrompt = this.buildRAGPrompt(query, relevantDocs, context);

    // 4. Call Claude via existing AIOrchestrationService
    return this.aiOrchestration.chat(augmentedPrompt, context);
  }
}
```

### BullMQ Queue Integration

Existing queues in `apps/backend/src/modules/jobs/`:
- `email` queue for notifications
- `ai` queue for async AI processing

**Add new queues:**
- `reports` queue for scheduled report generation
- `gdpr` queue for data deletion workflows
- `embeddings` queue for async document embedding

---

## What NOT to Add (and Why) - Complete List

| Technology | Why NOT |
|------------|---------|
| **LangChain** | Orchestration-focused, overkill for RAG. LlamaIndex is retrieval-focused and simpler. |
| **Pinecone/Weaviate/Milvus** | Separate vector DB adds complexity. pgvector keeps data under PostgreSQL RLS. |
| **Signal Protocol** | Over-engineered for anonymous relay. AES-256-GCM is sufficient and auditable. |
| **Temporal/Cadence** | Workflow orchestration overkill. BullMQ + json-rules-engine is simpler. |
| **Kafka** | Event streaming overkill. BullMQ handles job queues. Socket.IO handles real-time. |
| **GraphQL** | REST API is established. Adding GraphQL creates maintenance burden. |
| **Bull (legacy)** | Use BullMQ instead - TypeScript rewrite |
| **SendGrid/Mailgun** | Resend has better DX; use as alternative only |
| **PDFKit** | Puppeteer better for complex HTML templates |
| **SheetJS free** | Missing styling; ExcelJS is more complete |
| **Direct HRIS APIs** | Too many to maintain; use Merge.dev unified API |
| **Custom CRDT** | Y.js is battle-tested; don't reinvent |

---

## v2.0 Sources

**pgvector:**
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [pgvector-node](https://github.com/pgvector/pgvector-node)
- [Azure PostgreSQL pgvector](https://learn.microsoft.com/en-us/azure/postgresql/extensions/how-to-use-pgvector)
- [Prisma pgvector support](https://www.prisma.io/blog/orm-6-13-0-ci-cd-workflows-and-pgvector-for-prisma-postgres)

**Embeddings:**
- [Anthropic Embeddings Docs](https://platform.claude.com/docs/en/build-with-claude/embeddings)
- [Voyage AI npm](https://www.npmjs.com/package/voyageai)

**RAG:**
- [LlamaIndex.TS npm](https://www.npmjs.com/package/llamaindex)
- [LlamaIndex TypeScript Docs](https://developers.llamaindex.ai/typescript/framework/)
- [LlamaIndex vs LangChain Comparison](https://latenode.com/blog/platform-comparisons-alternatives/automation-platform-comparisons/langchain-vs-llamaindex-2025-complete-rag-framework-comparison)

**Rules Engine:**
- [json-rules-engine npm](https://www.npmjs.com/package/json-rules-engine)
- [json-rules-engine GitHub](https://github.com/CacheControl/json-rules-engine)

**PWA:**
- [Serwist Docs](https://serwist.pages.dev/docs/next/getting-started)
- [web-push npm](https://www.npmjs.com/package/web-push)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)

**Currency:**
- [Open Exchange Rates](https://openexchangerates.org/)
- [money.js](http://openexchangerates.github.io/money.js/)

**GDPR:**
- [GDPR Data Deletion Best Practices](https://www.reform.app/blog/best-practices-gdpr-compliant-data-deletion)
- [PostgreSQL Anonymization](https://severalnines.com/blog/postgresql-anonymization-on-demand/)

**Scheduling:**
- [NestJS Task Scheduling](https://docs.nestjs.com/techniques/task-scheduling)
- [BullMQ Multi-Instance Handling](https://kitemetric.com/blogs/mastering-cron-jobs-in-nestjs-multi-instance-handling-with-bull)
