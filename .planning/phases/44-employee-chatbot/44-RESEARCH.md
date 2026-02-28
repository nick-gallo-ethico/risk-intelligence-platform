# Phase 44: Employee Chatbot - Research

**Researched:** 2026-02-28
**Domain:** AI Chatbot, RAG Integration, Portal Integration
**Confidence:** HIGH

## Summary

Phase 44 implements an AI-powered Employee Chatbot that provides policy Q&A with citations, case status checks, and escalation to compliance teams. This phase leverages the existing AI infrastructure (BaseAgent, SkillRegistry, ConversationService, WebSocket gateway) from Phase 5 and the RAG infrastructure from Phase 43.

The standard approach is to create an `EmployeeChatbotAgent` extending `BaseAgent` with chatbot-specific skills (`PolicySearchSkill`, `CaseStatusSkill`, `FAQMatchSkill`). The chatbot will be deployed as a floating widget on both the Ethics Portal (unauthenticated) and Employee Portal (authenticated), using the existing Socket.IO infrastructure for streaming responses.

**Primary recommendation:** Extend the existing agent architecture rather than building a separate chatbot system. Create chatbot-specific skills that integrate with Phase 43's VectorStoreService for RAG-based policy search, with FAQ database as a priority fallback before RAG.

## Standard Stack

### Core

| Library       | Version | Purpose                     | Why Standard                                            |
| ------------- | ------- | --------------------------- | ------------------------------------------------------- |
| Socket.IO     | 4.x     | WebSocket streaming         | Already used by AiGateway                               |
| Floating UI   | 1.x     | Floating widget positioning | Industry standard for floating elements, React bindings |
| Framer Motion | 11.x    | Widget animations           | Already in frontend deps, smooth enter/exit             |
| pgvector      | 0.8+    | Vector similarity search    | Phase 43 foundation                                     |

### Supporting

| Library            | Version | Purpose                              | When to Use                         |
| ------------------ | ------- | ------------------------------------ | ----------------------------------- |
| @floating-ui/react | 0.26+   | React hooks for floating positioning | Widget positioning on scroll/resize |
| uuid               | 9.x     | Access code generation               | Anonymous session tracking          |
| zod                | 3.x     | Input validation                     | Already used by skill system        |

### Alternatives Considered

| Instead of   | Could Use           | Tradeoff                                                       |
| ------------ | ------------------- | -------------------------------------------------------------- |
| Floating UI  | Headless UI Popover | Headless UI is simpler but less control over positioning       |
| Socket.IO    | REST polling        | Socket.IO already integrated, provides better UX for streaming |
| Custom agent | Standalone service  | Would duplicate agent infrastructure, harder to maintain       |

**Installation:**

```bash
npm install @floating-ui/react framer-motion
# pgvector already installed via Phase 43
```

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/ai/
├── agents/
│   └── employee-chatbot.agent.ts    # NEW: Extends BaseAgent
├── skills/
│   ├── chatbot/                      # NEW: Chatbot-specific skills
│   │   ├── policy-search.skill.ts    # RAG-based policy search
│   │   ├── faq-match.skill.ts        # FAQ priority matching
│   │   ├── case-status.skill.ts      # Access code lookup
│   │   └── escalate.skill.ts         # Create inquiry
│   └── platform/                     # Existing platform skills

apps/backend/src/modules/chatbot/     # NEW: Chatbot-specific entities
├── chatbot.module.ts
├── chatbot.controller.ts             # REST endpoints for consent, FAQ admin
├── entities/
│   ├── faq-entry.entity.ts
│   └── chatbot-consent.entity.ts
├── services/
│   ├── faq.service.ts
│   ├── consent.service.ts
│   └── case-status.service.ts

apps/frontend/src/components/chatbot/  # NEW: Chatbot UI
├── chatbot-widget.tsx                 # Floating widget container
├── chatbot-launcher.tsx               # FAB trigger button
├── chatbot-panel.tsx                  # Expandable chat panel
├── confidence-indicator.tsx           # Tier display
├── consent-dialog.tsx                 # GDPR consent modal
├── citation-link.tsx                  # Policy citation formatting
└── escalation-button.tsx              # One-click escalation
```

### Pattern 1: EmployeeChatbotAgent Extending BaseAgent

**What:** Create a new agent type that inherits all BaseAgent functionality (streaming, skills, rate limiting) with chatbot-specific configuration.

**When to use:** Primary pattern for chatbot implementation.

**Example:**

```typescript
// Source: Existing apps/backend/src/modules/ai/agents/case.agent.ts pattern
const CHATBOT_AGENT_CONFIG: AgentConfig = {
  id: "employee-chatbot",
  name: "Employee Portal Assistant",
  description:
    "AI assistant for policy questions, case status, and compliance inquiries.",
  entityTypes: ["chatbot"], // Virtual entity type for chatbot context
  defaultSkills: [
    "faq-match", // Priority 1: Curated FAQ answers
    "policy-search", // Priority 2: RAG-based policy search
    "case-status", // Access code lookup
    "escalate", // Create inquiry
  ],
  systemPromptTemplate: "employee-chatbot",
};

export class EmployeeChatbotAgent extends BaseAgent {
  constructor(/* same deps as CaseAgent */) {
    super(CHATBOT_AGENT_CONFIG, ...deps);
  }

  getSuggestedPrompts(context: AgentContext): string[] {
    return [
      "What is the gift policy limit?",
      "Do I need to disclose a conflict of interest?",
      "Check status of my report",
      "Talk to compliance team",
    ];
  }

  protected getAdditionalSkills(): string[] {
    return []; // All skills defined in defaultSkills
  }
}
```

### Pattern 2: FAQ-First Search Strategy

**What:** Query FAQ database first with text matching, fall back to RAG only if no FAQ match found. This ensures curated answers take priority.

**When to use:** All policy Q&A queries.

**Example:**

```typescript
// Source: PRD-008 Section 3.7 FAQ_ENTRY + best practices
interface FAQMatchResult {
  matched: boolean;
  faqEntry?: FAQEntry;
  confidence: number; // Based on text similarity
}

async searchPolicyQuestion(query: string, orgId: string): Promise<PolicyAnswer> {
  // Step 1: Try FAQ match first
  const faqResult = await this.faqService.findMatch(query, orgId);
  if (faqResult.matched && faqResult.confidence > 0.85) {
    return {
      answer: faqResult.faqEntry.answer,
      source: 'faq',
      confidence: 'high',
      citations: faqResult.faqEntry.relatedPolicies,
    };
  }

  // Step 2: Fall back to RAG search
  const ragResult = await this.vectorStoreService.search({
    query,
    organizationId: orgId,
    topK: 5,
    threshold: 0.7,
  });

  return this.formatRAGResponse(ragResult);
}
```

### Pattern 3: Confidence-Tiered Response

**What:** Map similarity scores to three tiers with distinct UI/UX behavior.

**When to use:** All chatbot responses.

**Example:**

```typescript
// Source: PRD-008 Section 4.2 Policy Q&A Tiered Model
enum ConfidenceTier {
  HIGH = "high", // > 85%: Direct answer with citation
  MEDIUM = "medium", // 50-85%: Clarifying questions + guidance
  LOW = "low", // < 50%: Offer escalation
}

function deriveConfidenceTier(similarityScore: number): ConfidenceTier {
  // similarityScore from pgvector is cosine similarity (0-1)
  // Convert to percentage for threshold comparison
  const confidence = similarityScore * 100;

  if (confidence >= 85) return ConfidenceTier.HIGH;
  if (confidence >= 50) return ConfidenceTier.MEDIUM;
  return ConfidenceTier.LOW;
}

interface TieredResponse {
  tier: ConfidenceTier;
  answer: string;
  citations?: PolicyCitation[];
  clarifyingQuestions?: string[];
  showEscalationPrompt: boolean;
}
```

### Pattern 4: Unauthenticated WebSocket (Ethics Portal)

**What:** Allow chatbot access without JWT by using session-based tokens for anonymous users.

**When to use:** Ethics Portal chatbot widget.

**Example:**

```typescript
// Source: Existing AiGateway pattern + modification for anonymous
// Create a separate namespace for unauthenticated chatbot
@WebSocketGateway({
  namespace: "/chatbot",
  cors: { origin: corsOrigin, credentials: true },
})
export class ChatbotGateway implements OnGatewayConnection {
  async handleConnection(client: Socket): Promise<void> {
    // Check for authenticated user first
    const authContext = await this.extractAuthContext(client);

    if (!authContext) {
      // Anonymous mode: create session token
      const sessionId = uuid();
      const tenantSlug = client.handshake.query.tenant as string;

      // Validate tenant exists
      const tenant = await this.tenantService.findBySlug(tenantSlug);
      if (!tenant) {
        client.disconnect();
        return;
      }

      client.data.context = {
        organizationId: tenant.id,
        userId: `anonymous:${sessionId}`,
        userRole: "ANONYMOUS",
        isAnonymous: true,
        sessionId,
      };
    } else {
      client.data.context = authContext;
    }
  }
}
```

### Pattern 5: Floating Widget Component

**What:** FAB trigger that expands to full chat panel, positioned fixed bottom-right with animation.

**When to use:** Both Ethics Portal and Employee Portal.

**Example:**

```typescript
// Source: Floating UI React docs + accessibility best practices
import { useFloating, offset, shift, autoUpdate } from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatbotWidget({ tenantSlug }: { tenantSlug?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  // Floating UI for positioning
  const { refs, floatingStyles } = useFloating({
    placement: 'top-end',
    middleware: [offset(16), shift({ padding: 16 })],
    whileElementsMounted: autoUpdate,
  });

  return (
    <>
      {/* FAB Trigger */}
      <button
        ref={refs.setReference}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
                   bg-primary text-primary-foreground shadow-lg
                   hover:scale-105 transition-transform
                   focus:outline-none focus:ring-2 focus:ring-offset-2"
        aria-label="Open chat assistant"
        aria-expanded={isOpen}
      >
        <MessageCircle className="h-6 w-6 mx-auto" />
      </button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={refs.setFloating}
            style={floatingStyles}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[380px] h-[520px]
                       bg-background rounded-lg shadow-xl border z-50
                       flex flex-col"
            role="dialog"
            aria-label="Chat assistant"
          >
            {!hasConsent ? (
              <ConsentDialog onAccept={() => setHasConsent(true)} />
            ) : (
              <ChatbotPanel tenantSlug={tenantSlug} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

### Anti-Patterns to Avoid

- **Separate chat service:** Don't build a standalone chatbot backend - extend the existing agent infrastructure
- **REST polling for chat:** Don't use REST polling for streaming responses - use Socket.IO
- **Hardcoded thresholds:** Don't hardcode confidence thresholds - make them configurable per-tenant
- **Single namespace for auth/anon:** Don't mix authenticated and anonymous connections in the same WebSocket namespace
- **Consent in browser storage only:** Don't rely solely on localStorage for consent - persist to database for audit

## Don't Hand-Roll

| Problem              | Don't Build                 | Use Instead                          | Why                                          |
| -------------------- | --------------------------- | ------------------------------------ | -------------------------------------------- |
| Floating positioning | Custom positioning logic    | @floating-ui/react                   | Handles scroll, resize, viewport boundaries  |
| Widget animations    | CSS transitions             | Framer Motion                        | Already in deps, handles enter/exit properly |
| FAQ text matching    | Custom similarity algorithm | PostgreSQL `ts_rank` + `to_tsvector` | Full-text search is built-in, well-optimized |
| Vector similarity    | Custom distance functions   | pgvector `<=>` operator              | Hardware-optimized, index-supported          |
| Rate limiting        | Custom rate limiter         | Existing AiRateLimiterService        | Already handles org-level quotas             |
| Consent timestamps   | Custom date handling        | Prisma DateTime + database           | Audit-quality timestamps                     |

**Key insight:** The existing AI infrastructure handles 80% of what the chatbot needs. The chatbot is primarily a new agent type with specialized skills and a floating UI component.

## Common Pitfalls

### Pitfall 1: Confidence Score Misinterpretation

**What goes wrong:** Treating pgvector similarity scores as confidence percentages directly.
**Why it happens:** Cosine similarity (0-1) doesn't linearly map to user-perceived confidence.
**How to avoid:** Apply calibration. Empirically tune thresholds based on policy domain testing. Start with 0.85 for HIGH tier, adjust based on user feedback.
**Warning signs:** Users reporting irrelevant "high confidence" answers.

### Pitfall 2: Anonymous Session Security

**What goes wrong:** Access code brute-forcing allows case data enumeration.
**Why it happens:** No rate limiting on access code attempts.
**How to avoid:**

- Rate limit: 5 attempts per IP per 15 minutes
- Lock out after 5 failures, require CAPTCHA
- Use 12-character alphanumeric codes (62^12 possibilities)
- Log all access attempts for security monitoring
  **Warning signs:** High volume of failed access code attempts from same IP.

### Pitfall 3: FAQ vs RAG Priority Confusion

**What goes wrong:** RAG answers override curated FAQ responses.
**Why it happens:** Query goes to both systems in parallel, RAG responds faster.
**How to avoid:** Sequential processing: FAQ first, RAG only if no FAQ match.
**Warning signs:** Compliance team's curated answers not appearing.

### Pitfall 4: Consent Not Persisted

**What goes wrong:** User sees consent dialog every session.
**Why it happens:** Only stored in sessionStorage, not database.
**How to avoid:** Store consent in database with session linkage. Check database first, fall back to prompt.
**Warning signs:** Repeated consent prompts for same user.

### Pitfall 5: WebSocket Reconnection Handling

**What goes wrong:** Lost messages during network interruptions.
**Why it happens:** No reconnection logic or message queue.
**How to avoid:** Implement Socket.IO reconnection with message replay:

```typescript
const socket = io("/chatbot", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
socket.on("reconnect", () => {
  socket.emit("resync", { lastMessageId });
});
```

**Warning signs:** Users reporting "lost" messages after network blips.

## Code Examples

### PolicySearchSkill Implementation

```typescript
// Source: Existing skill pattern from summarize.skill.ts
import { z } from "zod";
import {
  SkillDefinition,
  SkillScope,
  SkillContext,
  SkillResult,
} from "../skill.types";

export const policySearchInputSchema = z.object({
  query: z.string().min(1).max(1000).describe("The policy question to answer"),
  includeRelated: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include related policy sections"),
});

export interface PolicySearchOutput {
  answer: string;
  confidence: "high" | "medium" | "low";
  citations: PolicyCitation[];
  clarifyingQuestions?: string[];
  suggestEscalation: boolean;
}

interface PolicyCitation {
  policyId: string;
  policyTitle: string;
  section: string;
  excerpt: string;
  relevanceScore: number;
}

export function policySearchSkill(
  vectorStore: VectorStoreService,
  faqService: FAQService,
  providerRegistry: ProviderRegistryService,
): SkillDefinition<PolicySearchInput, PolicySearchOutput> {
  return {
    id: "policy-search",
    name: "Search Policy Knowledge Base",
    description:
      "Answer policy questions using FAQ and RAG-based policy search.",
    scope: SkillScope.PLATFORM,
    requiredPermissions: [], // Available to all chatbot users
    inputSchema: policySearchInputSchema,

    async execute(input, context): Promise<SkillResult<PolicySearchOutput>> {
      // Step 1: Try FAQ match first
      const faqResult = await faqService.findMatch(
        input.query,
        context.organizationId,
      );

      if (faqResult.matched && faqResult.confidence >= 0.85) {
        return {
          success: true,
          data: {
            answer: faqResult.entry.answer,
            confidence: "high",
            citations: faqResult.entry.relatedPolicies.map((p) => ({
              policyId: p.id,
              policyTitle: p.title,
              section: p.section,
              excerpt: p.excerpt,
              relevanceScore: 1.0,
            })),
            suggestEscalation: false,
          },
        };
      }

      // Step 2: RAG search
      const ragResults = await vectorStore.search({
        query: input.query,
        organizationId: context.organizationId,
        documentTypes: ["policy", "handbook", "guideline"],
        topK: 5,
        threshold: 0.5,
      });

      // Step 3: Determine tier based on top result score
      const topScore = ragResults[0]?.score ?? 0;
      const tier =
        topScore >= 0.85 ? "high" : topScore >= 0.5 ? "medium" : "low";

      // Step 4: Generate answer using LLM with retrieved context
      const provider = providerRegistry.getDefaultProvider();
      const response = await provider.createMessage({
        maxTokens: 1024,
        messages: [
          {
            role: "user",
            content: buildPolicyAnswerPrompt(input.query, ragResults, tier),
          },
        ],
      });

      return {
        success: true,
        data: {
          answer: response.content,
          confidence: tier,
          citations: ragResults.map((r) => ({
            policyId: r.documentId,
            policyTitle: r.metadata.title,
            section: r.metadata.section,
            excerpt: r.text.slice(0, 200),
            relevanceScore: r.score,
          })),
          clarifyingQuestions:
            tier === "medium"
              ? extractClarifyingQuestions(response.content)
              : undefined,
          suggestEscalation: tier === "low",
        },
      };
    },
  };
}
```

### Consent Capture Pattern

```typescript
// Source: GDPR best practices + PRD-008 Section 3.5
// apps/backend/src/modules/chatbot/services/consent.service.ts
@Injectable()
export class ChatbotConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async checkConsent(
    sessionId: string,
    organizationId: string,
  ): Promise<{ hasConsent: boolean; consentId?: string }> {
    const consent = await this.prisma.chatbotConsentLog.findFirst({
      where: {
        sessionId,
        organizationId,
        consentGiven: true,
        // Check if consent is still valid (24 hour session)
        capturedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { capturedAt: "desc" },
    });

    return {
      hasConsent: !!consent,
      consentId: consent?.id,
    };
  }

  async recordConsent(params: {
    sessionId: string;
    organizationId: string;
    consentType: "AI_USE" | "DATA_RETENTION" | "TERMS_OF_USE";
    consentVersion: string;
    consentTextShown: string;
    consentGiven: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    // APPEND-ONLY: Never update consent records
    const consent = await this.prisma.chatbotConsentLog.create({
      data: {
        id: uuid(),
        sessionId: params.sessionId,
        organizationId: params.organizationId,
        consentType: params.consentType,
        consentVersion: params.consentVersion,
        consentTextShown: params.consentTextShown,
        consentGiven: params.consentGiven,
        capturedAt: new Date(),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    return consent.id;
  }
}
```

### Access Code Case Status Lookup

```typescript
// Source: Existing access-code-input.tsx pattern + security hardening
@Injectable()
export class CaseStatusService {
  private readonly rateLimiter = new Map<
    string,
    { count: number; resetAt: Date }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async lookupByAccessCode(
    accessCode: string,
    ipAddress: string,
  ): Promise<CaseStatusResult> {
    // Rate limit check: 5 attempts per IP per 15 minutes
    const key = `access:${ipAddress}`;
    const limit = this.rateLimiter.get(key);

    if (limit && limit.count >= 5 && limit.resetAt > new Date()) {
      return {
        success: false,
        error: "Too many attempts. Please try again in 15 minutes.",
        locked: true,
      };
    }

    // Normalize access code (uppercase, remove dashes)
    const normalizedCode = accessCode.toUpperCase().replace(/-/g, "");

    // Lookup case by anonymous access code
    const caseEntity = await this.prisma.case.findFirst({
      where: {
        anonymousAccessCode: normalizedCode,
      },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        updatedAt: true,
        organizationId: true,
        // Don't return sensitive fields
      },
    });

    // Record attempt (success or failure)
    this.recordAttempt(key, !!caseEntity);

    if (!caseEntity) {
      return {
        success: false,
        error: "No case found with that access code.",
        attemptsRemaining: this.getAttemptsRemaining(key),
      };
    }

    return {
      success: true,
      case: {
        referenceNumber: caseEntity.referenceNumber,
        status: caseEntity.status,
        lastUpdated: caseEntity.updatedAt,
      },
    };
  }

  private recordAttempt(key: string, success: boolean): void {
    const existing = this.rateLimiter.get(key);

    if (success) {
      // Clear on successful lookup
      this.rateLimiter.delete(key);
      return;
    }

    if (existing && existing.resetAt > new Date()) {
      existing.count++;
    } else {
      this.rateLimiter.set(key, {
        count: 1,
        resetAt: new Date(Date.now() + 15 * 60 * 1000),
      });
    }
  }

  private getAttemptsRemaining(key: string): number {
    const limit = this.rateLimiter.get(key);
    return limit ? Math.max(0, 5 - limit.count) : 5;
  }
}
```

## State of the Art

| Old Approach             | Current Approach        | When Changed | Impact                                          |
| ------------------------ | ----------------------- | ------------ | ----------------------------------------------- |
| Separate chatbot system  | Agent extension pattern | 2025         | Unified AI architecture, code reuse             |
| REST polling for chat    | WebSocket streaming     | 2024         | Real-time UX, token-by-token display            |
| TF-IDF for policy search | pgvector embeddings     | 2024         | Semantic search, better relevance               |
| Single confidence level  | Three-tier confidence   | 2025         | Better user expectations, clear escalation path |

**Deprecated/outdated:**

- Separate chatbot backend service: Integrate with existing agent system
- iframe embedding for chat widgets: Use direct React components with Floating UI

## Open Questions

1. **Access Code Format**
   - What we know: Existing access codes are 12 characters (XXX-XXXX-XXXX)
   - What's unclear: Should chatbot use same format or shorter?
   - Recommendation: Use same format for consistency; existing AccessCodeInput component works

2. **Inquiry vs Case for Escalation**
   - What we know: PRD-008 defines CHATBOT_INQUIRY entity
   - What's unclear: When does inquiry escalate to full Case?
   - Recommendation: Start with Inquiry only; let compliance team manually convert to Case if needed

3. **Consent Text Versioning**
   - What we know: Need to track consent version for GDPR
   - What's unclear: Where is consent text managed?
   - Recommendation: Store in CHATBOT_CONFIGURATION per-tenant with version field

## Sources

### Primary (HIGH confidence)

- `apps/backend/src/modules/ai/agents/base.agent.ts` - Agent architecture pattern
- `apps/backend/src/modules/ai/skills/platform/summarize.skill.ts` - Skill implementation pattern
- `apps/backend/src/modules/ai/ai.gateway.ts` - WebSocket streaming pattern
- `apps/backend/src/modules/ai/services/conversation.service.ts` - Conversation management
- `02-MODULES/08-EMPLOYEE-CHATBOT/PRD.md` - Entity models, flows, requirements
- `apps/frontend/src/components/ethics/access-code-input.tsx` - Access code UI pattern

### Secondary (MEDIUM confidence)

- [Floating UI React Docs](https://floating-ui.com/docs/react) - Widget positioning
- [GDPR-Compliant Chatbot Guide](https://quickchat.ai/post/gdpr-compliant-chatbot-guide) - Consent patterns
- [RAG Evaluation Best Practices](https://orq.ai/blog/rag-evaluation) - Confidence threshold tuning

### Tertiary (LOW confidence)

- Community patterns for floating chat widgets - UX patterns need validation with design review

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Uses existing AI infrastructure patterns
- Architecture: HIGH - Agent extension pattern is well-documented in codebase
- Pitfalls: HIGH - Based on existing codebase patterns and PRD requirements
- FAQ pattern: MEDIUM - Needs validation with actual FAQ data structure
- Confidence thresholds: MEDIUM - Empirical tuning needed during implementation

**Research date:** 2026-02-28
**Valid until:** 60 days (stable architecture, low churn)
