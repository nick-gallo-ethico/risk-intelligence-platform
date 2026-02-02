# Technology Stack Research

**Project:** Ethico Risk Intelligence Platform - Additional Stack Components
**Researched:** 2026-02-02
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
