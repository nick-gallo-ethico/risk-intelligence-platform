# Phase 8: Portals - Research

**Researched:** 2026-02-03
**Domain:** Multi-portal architecture: Ethics Portal (PWA with offline), Employee Portal (SSO dashboard), Operator Console (hotline intake with AI)
**Confidence:** HIGH

## Summary

Phase 8 implements three distinct user-facing portals that consume the infrastructure built in prior phases. The Ethics Portal is a full branded compliance microsite with PWA capabilities, anonymous reporting, and AI chatbot. The Employee Portal is an authenticated dashboard for employees to manage their compliance tasks. The Operator Console is an internal tool for hotline operators to handle calls with AI-assisted note cleanup.

The key architectural insight is that **all three portals share backend infrastructure** but have fundamentally different authentication models: Ethics Portal is primarily public/anonymous, Employee Portal uses SSO, and Operator Console uses internal Ethico authentication. The PWA capabilities (offline support, background sync, install prompts) are critical for the Ethics Portal since reporters often use personal phones for privacy.

**Primary recommendation:** Build the Ethics Portal as a separate Next.js app with `@ducanh2912/next-pwa` for service worker generation and Dexie.js for encrypted IndexedDB storage. Use react-i18next for multi-language support. Leverage the existing CSS custom properties theming system for white-label branding. The Employee Portal and Operator Console can be routes within the main frontend app.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @ducanh2912/next-pwa | ^5.x | Next.js PWA service worker generation | Maintained fork of next-pwa with App Router support, Workbox integration |
| dexie | ^4.x | IndexedDB wrapper with encryption plugin | 100K+ sites use it, React hooks support, offline-first architecture |
| dexie-encrypted | ^4.x | Transparent IndexedDB encryption | Uses tweetnacl.js, encrypts selected tables transparently |
| react-i18next | ^14.x | React internationalization | Most popular i18n for React, hooks-based, lazy loading, TypeScript support |
| i18next-browser-languagedetector | ^8.x | Browser language auto-detection | Detects from browser, cookies, localStorage |
| i18next-http-backend | ^2.x | Load translations from server | Lazy-loads JSON translation files from /public/locales/ |
| nanoid | ^5.x | Access code generation | Already in use for forms (01-07), customizable alphabet |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| workbox-background-sync | ^7.x | Queue failed requests for retry | Offline form submissions |
| workbox-precaching | ^7.x | Precache static assets | Bundled with @ducanh2912/next-pwa |
| zod | ^4.x | Schema validation | Already in use, validates form data before IndexedDB storage |
| date-fns | ^4.x | Date/time formatting | Already in use, locale-aware formatting |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @ducanh2912/next-pwa | serwist/next | Serwist is newer Workbox fork; next-pwa has larger community |
| dexie | idb-keyval | idb-keyval is simpler but lacks encryption plugin ecosystem |
| react-i18next | react-intl | react-intl is more opinionated; react-i18next more flexible |
| Separate Next.js app for Ethics Portal | Routes in main app | Separate app enables truly independent deployment, CDN caching |

**Installation:**
```bash
# Ethics Portal (separate app or within main)
npm install @ducanh2912/next-pwa dexie dexie-encrypted
npm install react-i18next i18next-browser-languagedetector i18next-http-backend
```

## Architecture Patterns

### Recommended Project Structure

```
apps/
├── frontend/                     # Main platform (Client Portal, Employee Portal)
│   └── src/
│       ├── app/
│       │   ├── employee/         # Employee Portal routes
│       │   │   ├── tasks/
│       │   │   ├── disclosures/
│       │   │   └── history/
│       │   └── operator/         # Operator Console routes (internal)
│       │       ├── intake/
│       │       └── qa-queue/
│       └── components/
│           ├── employee/         # Employee Portal components
│           └── operator/         # Operator Console components
├── ethics-portal/                # Separate Ethics Portal app (optional)
│   └── src/
│       ├── app/
│       │   ├── [tenant]/         # Tenant-scoped routes
│       │   │   ├── report/       # Anonymous reporting
│       │   │   ├── status/       # Status check with access code
│       │   │   └── resources/    # Policies, CoC, FAQs
│       │   └── ~offline/         # Offline fallback page
│       ├── lib/
│       │   ├── offline-db.ts     # Dexie database setup
│       │   ├── i18n.ts           # i18next configuration
│       │   └── theme.ts          # White-label theming
│       └── public/
│           ├── manifest.json     # PWA manifest template
│           └── locales/          # Translation files
└── backend/
    └── src/modules/
        ├── portals/              # NEW: Portal-specific endpoints
        │   ├── ethics/
        │   │   ├── ethics-portal.controller.ts
        │   │   ├── ethics-portal.service.ts
        │   │   └── dto/
        │   ├── employee/
        │   │   ├── employee-portal.controller.ts
        │   │   └── employee-portal.service.ts
        │   └── operator/
        │       ├── operator-console.controller.ts
        │       ├── operator-console.service.ts
        │       ├── directives.service.ts
        │       └── qa-queue.service.ts
        └── branding/             # NEW: White-label branding
            ├── branding.service.ts
            └── branding.controller.ts
```

### Pattern 1: Multi-Tenant White-Label Theming

**What:** Store branding configuration in database, generate CSS custom properties at runtime, cache per-tenant.

**When to use:** Ethics Portal where each tenant has unique branding (logo, colors, domain).

**Example:**
```typescript
// apps/backend/src/modules/branding/branding.service.ts

export interface TenantBranding {
  tenantId: string;
  mode: 'template' | 'full';
  // Template mode
  logo?: string;
  primaryColor?: string;  // HSL format
  theme?: 'light' | 'dark';
  // Full white-label mode
  colorPalette?: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
  };
  typography?: {
    fontFamily: string;
    headingFontFamily?: string;
  };
  customDomain?: string;
  footerText?: string;
  welcomeVideo?: string;
}

@Injectable()
export class BrandingService {
  constructor(
    private prisma: PrismaService,
    private cacheManager: Cache,
  ) {}

  async getBranding(tenantId: string): Promise<TenantBranding> {
    const cacheKey = `branding:${tenantId}`;
    let branding = await this.cacheManager.get<TenantBranding>(cacheKey);

    if (!branding) {
      branding = await this.prisma.tenantBranding.findUnique({
        where: { organizationId: tenantId },
      });
      await this.cacheManager.set(cacheKey, branding, 3600); // 1 hour
    }

    return branding || this.getDefaultBranding(tenantId);
  }

  generateCssVariables(branding: TenantBranding): string {
    if (branding.mode === 'template') {
      return this.generateTemplateCss(branding);
    }
    return this.generateFullWhiteLabelCss(branding);
  }

  private generateTemplateCss(branding: TenantBranding): string {
    // Apply primary color to semantic variables
    const primaryHsl = branding.primaryColor || '221 83% 53%';
    return `:root {
      --primary: ${primaryHsl};
      --primary-foreground: 210 40% 98%;
      --ring: ${primaryHsl};
    }`;
  }

  private generateFullWhiteLabelCss(branding: TenantBranding): string {
    const palette = branding.colorPalette!;
    return `:root {
      --primary: ${palette.primary};
      --primary-foreground: ${palette.primaryForeground};
      --secondary: ${palette.secondary};
      --secondary-foreground: ${palette.secondaryForeground};
      --background: ${palette.background};
      --foreground: ${palette.foreground};
      --muted: ${palette.muted};
      --muted-foreground: ${palette.mutedForeground};
      --accent: ${palette.accent};
      --accent-foreground: ${palette.accentForeground};
      --destructive: ${palette.destructive};
      --destructive-foreground: ${palette.destructiveForeground};
      ${branding.typography ? `--font-sans: ${branding.typography.fontFamily};` : ''}
    }`;
  }
}
```

```tsx
// apps/ethics-portal/src/components/theme-provider.tsx

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export function TenantThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useParams<{ tenant: string }>();
  const [cssLoaded, setCssLoaded] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      const response = await fetch(`/api/branding/${tenant}/css`);
      const css = await response.text();

      // Inject CSS variables
      const style = document.createElement('style');
      style.id = 'tenant-theme';
      style.textContent = css;
      document.head.appendChild(style);

      setCssLoaded(true);
    }
    loadTheme();

    return () => {
      document.getElementById('tenant-theme')?.remove();
    };
  }, [tenant]);

  if (!cssLoaded) return <ThemeSkeleton />;
  return <>{children}</>;
}
```

### Pattern 2: Encrypted Offline Draft Storage

**What:** Use Dexie.js with encryption to store form drafts locally, with auto-save and expiration.

**When to use:** Ethics Portal anonymous report drafts that must persist across browser sessions.

**Example:**
```typescript
// apps/ethics-portal/src/lib/offline-db.ts

import Dexie, { Table } from 'dexie';
import encrypt from 'dexie-encrypted';

interface ReportDraft {
  id?: number;
  localId: string;           // nanoid for cross-device resume code
  tenantSlug: string;
  category?: string;
  content: Record<string, unknown>;
  attachments: { name: string; size: number; localPath: string }[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;           // 7 days from creation
  syncStatus: 'draft' | 'pending' | 'synced' | 'failed';
}

interface PendingSubmission {
  id?: number;
  tenantSlug: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  retryCount: number;
  lastError?: string;
}

class EthicsPortalDB extends Dexie {
  drafts!: Table<ReportDraft>;
  pendingSubmissions!: Table<PendingSubmission>;

  constructor() {
    super('EthicsPortalDB');

    // Apply encryption to sensitive tables
    // Uses a device-specific key derived from crypto.subtle
    encrypt(this, {
      secretKey: this.getOrCreateDeviceKey(),
    }, {
      drafts: {
        encrypt: ['content', 'attachments'],
      },
      pendingSubmissions: {
        encrypt: ['payload'],
      },
    });

    this.version(1).stores({
      drafts: '++id, localId, tenantSlug, expiresAt, syncStatus',
      pendingSubmissions: '++id, tenantSlug, createdAt',
    });
  }

  private async getOrCreateDeviceKey(): Promise<Uint8Array> {
    const stored = localStorage.getItem('ethics-device-key');
    if (stored) {
      return new Uint8Array(JSON.parse(stored));
    }
    const key = crypto.getRandomValues(new Uint8Array(32));
    localStorage.setItem('ethics-device-key', JSON.stringify(Array.from(key)));
    return key;
  }
}

export const db = new EthicsPortalDB();

// Auto-save hook
export function useAutoSaveDraft(tenantSlug: string) {
  const saveDraft = useCallback(async (content: Record<string, unknown>) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Check for existing draft
    const existing = await db.drafts
      .where({ tenantSlug, syncStatus: 'draft' })
      .first();

    if (existing) {
      await db.drafts.update(existing.id!, { content, updatedAt: now });
      return existing.localId;
    }

    const localId = nanoid(16);
    await db.drafts.add({
      localId,
      tenantSlug,
      content,
      attachments: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
      syncStatus: 'draft',
    });

    return localId;
  }, [tenantSlug]);

  return { saveDraft };
}

// Cleanup expired drafts
export async function cleanupExpiredDrafts() {
  const now = new Date();
  await db.drafts.where('expiresAt').below(now).delete();
}
```

### Pattern 3: react-i18next Configuration with Namespace Lazy Loading

**What:** Configure i18next with browser detection, namespace-based lazy loading, and RTL support.

**When to use:** Ethics Portal multi-language support (ETHIC-06).

**Example:**
```typescript
// apps/ethics-portal/src/lib/i18n.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'es', name: 'Espanol', dir: 'ltr' },
  { code: 'fr', name: 'Francais', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'pt', name: 'Portugues', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', dir: 'rtl' },
  { code: 'he', name: 'Hebrew', dir: 'rtl' },
];

// Namespaces (lazy-loaded)
export const NAMESPACES = [
  'common',      // Shared UI elements
  'report',      // Report submission form
  'status',      // Status check page
  'resources',   // Policies, FAQ
  'errors',      // Error messages
];

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    ns: NAMESPACES,
    defaultNS: 'common',

    // Lazy load namespaces
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Detection order
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ethics-language',
    },

    interpolation: {
      escapeValue: false, // React handles escaping
    },

    react: {
      useSuspense: true,
    },
  });

export default i18n;

// Hook for language switching
export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = useCallback((code: string) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    if (lang) {
      i18n.changeLanguage(code);
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = code;
    }
  }, [i18n]);

  const currentLanguage = SUPPORTED_LANGUAGES.find(
    l => l.code === i18n.language
  ) || SUPPORTED_LANGUAGES[0];

  return { currentLanguage, changeLanguage, languages: SUPPORTED_LANGUAGES };
}
```

```tsx
// apps/ethics-portal/src/components/language-switcher.tsx

import { useLanguage } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { currentLanguage, changeLanguage, languages } = useLanguage();

  return (
    <Select value={currentLanguage.code} onValueChange={changeLanguage}>
      <SelectTrigger className="w-auto gap-2">
        <Globe className="h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Pattern 4: Operator Console Split-Screen Layout

**What:** HubSpot-inspired layout with call controls at top, intake form on left, context tabs on right.

**When to use:** Operator Console (OPER-01 through OPER-08).

**Example:**
```tsx
// apps/frontend/src/components/operator/operator-console-layout.tsx

interface OperatorConsoleLayoutProps {
  clientProfile: ClientProfile | null;
  callActive: boolean;
  callDuration: number;
}

export function OperatorConsoleLayout({
  clientProfile,
  callActive,
  callDuration,
}: OperatorConsoleLayoutProps) {
  const [activeContextTab, setActiveContextTab] = useState<'script' | 'hris' | 'history'>('script');

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar: Call Controls */}
      <div className="h-14 border-b bg-muted/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {clientProfile ? (
            <>
              <span className="font-medium">{clientProfile.companyName}</span>
              <Badge variant="outline">{clientProfile.hotlineNumber}</Badge>
            </>
          ) : (
            <span className="text-muted-foreground">No client loaded</span>
          )}
        </div>

        {callActive && (
          <div className="flex items-center gap-4">
            <CallTimer duration={callDuration} />
            <Button variant="ghost" size="icon"><MicOff className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><Pause className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><ArrowRightLeft className="h-4 w-4" /></Button>
            <Button variant="destructive" size="sm">End Call</Button>
          </div>
        )}
      </div>

      {/* Main Content: Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Intake Form (60%) */}
        <div className="w-3/5 border-r overflow-y-auto p-6">
          <IntakeForm clientProfile={clientProfile} />
        </div>

        {/* Right: Context Tabs (40%) */}
        <div className="w-2/5 overflow-hidden flex flex-col">
          <Tabs value={activeContextTab} onValueChange={setActiveContextTab}>
            <TabsList className="w-full justify-start border-b rounded-none h-12 px-4">
              <TabsTrigger value="script">Script/Guide</TabsTrigger>
              <TabsTrigger value="hris">HRIS Lookup</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="script" className="m-0 p-4">
                <DirectivesPanel clientProfile={clientProfile} />
              </TabsContent>
              <TabsContent value="hris" className="m-0 p-4">
                <HrisLookupPanel clientProfile={clientProfile} />
              </TabsContent>
              <TabsContent value="history" className="m-0 p-4">
                <CallerHistoryPanel clientProfile={clientProfile} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
```

### Pattern 5: QA Review Queue with Priority Sorting

**What:** Queue display with priority-based sorting, severity indicators, quick actions.

**When to use:** Operator QA Review (OPER-06, OPER-07).

**Example:**
```typescript
// apps/backend/src/modules/portals/operator/qa-queue.service.ts

export interface QaQueueItem {
  riuId: string;
  referenceNumber: string;
  category: string;
  severityScore: number;
  submittedAt: Date;
  operatorName: string;
  clientName: string;
  queuePosition: number;
  flags: ('high_severity' | 'keyword_trigger' | 'client_priority')[];
}

@Injectable()
export class QaQueueService {
  constructor(
    private prisma: PrismaService,
    private esService: ElasticsearchService,
  ) {}

  async getQaQueue(filters: QaQueueFilters): Promise<PaginatedResult<QaQueueItem>> {
    const { clientId, severityMin, operatorId, page, limit } = filters;

    // QA queue sorted by: 1) High severity first, 2) Keyword triggers, 3) Submission time
    const items = await this.prisma.riuHotlineExtension.findMany({
      where: {
        qaStatus: 'PENDING',
        riu: {
          ...(clientId && { organizationId: clientId }),
          ...(operatorId && { createdById: operatorId }),
          ...(severityMin && { severityScore: { gte: severityMin } }),
        },
      },
      include: {
        riu: {
          include: {
            organization: { select: { name: true } },
            createdBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [
        { riu: { severityScore: 'desc' } },
        { riu: { createdAt: 'asc' } },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((item, idx) => this.mapToQueueItem(item, (page - 1) * limit + idx + 1)),
      total: await this.getQueueCount(filters),
      page,
      limit,
    };
  }

  async releaseFromQa(riuId: string, reviewerId: string, edits?: RiuQaEdits): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Apply edits if provided
      if (edits) {
        await tx.riskIntelligenceUnit.update({
          where: { id: riuId },
          data: {
            summary: edits.summary,
            categoryId: edits.categoryId,
            severityScore: edits.severityScore,
          },
        });
      }

      // Mark QA complete
      await tx.riuHotlineExtension.update({
        where: { riuId },
        data: {
          qaStatus: 'RELEASED',
          qaReviewerId: reviewerId,
          qaReviewedAt: new Date(),
        },
      });

      // Emit event for downstream processing (Case creation, notifications)
      this.eventEmitter.emit('riu.qa_released', { riuId, reviewerId });
    });
  }
}
```

### Anti-Patterns to Avoid

- **Storing drafts in localStorage:** LocalStorage has 5MB limit and no encryption. Use IndexedDB with Dexie.js for draft storage.

- **Embedding access codes in URLs:** Access codes should not appear in URLs to prevent shoulder-surfing and browser history leaks. Use session storage or POST-based lookup.

- **Rendering all language translations:** Don't bundle all translation files. Use namespace-based lazy loading with i18next-http-backend.

- **Hardcoding branding values:** Don't put tenant colors in code. Use CSS custom properties that are injected at runtime based on tenant configuration.

- **Single monolithic intake form:** Don't build one massive form. Use the existing form engine (01-07) with category-specific schemas that load dynamically.

- **Synchronous AI note cleanup:** Don't block the operator while AI processes notes. Use the existing AI skills infrastructure (Phase 5) with async processing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Offline storage | Custom IndexedDB wrapper | Dexie.js + dexie-encrypted | Encryption, migrations, React hooks all handled |
| Service worker | Manual service worker | @ducanh2912/next-pwa with Workbox | Caching strategies, background sync, update prompts |
| Language detection | navigator.language parsing | i18next-browser-languagedetector | Handles fallbacks, localStorage, cookies |
| Form validation | Custom validators | Existing form engine (01-07) + Ajv | Schema-based validation already built |
| Access code generation | Math.random() strings | Existing nanoid (04-06) with custom alphabet | Cryptographically secure, excludes confusing chars |
| AI note cleanup | Direct Claude API calls | Existing AI skills registry (Phase 5) | Context loading, rate limiting, audit logging |

**Key insight:** Phases 1, 4, 5, and 7 built reusable infrastructure. This phase consumes that infrastructure through three different frontend experiences.

## Common Pitfalls

### Pitfall 1: Cross-Device Draft Resume Without Authentication

**What goes wrong:** User wants to resume a draft on different device but anonymous reporters have no account.

**Why it happens:** PWA offline drafts are device-local by design.

**How to avoid:** Per CONTEXT.md decision, implement optional "Save for Later" code. Generate a separate 16-char code (not the access code) that allows cross-device resume. Store the draft server-side (encrypted, 7-day expiration). The save code is NOT the access code - access codes are only generated after final submission.

**Warning signs:** Users complaining about lost drafts when switching devices.

### Pitfall 2: Anonymous Messaging Without Case Link

**What goes wrong:** Reporter tries to send a follow-up message, but their RIU hasn't been linked to a Case yet.

**Why it happens:** RIUs go through QA before Case creation. There's a window where access code exists but no Case.

**How to avoid:** Per existing access code implementation (04-06), check for case association before allowing message send. Show friendly message: "Your report is being reviewed. You'll be able to send messages once it's assigned."

**Warning signs:** 500 errors on message send endpoint; confused users.

### Pitfall 3: PWA Install Prompt Timing

**What goes wrong:** Install prompt appears immediately on first visit, annoying users and reducing trust.

**Why it happens:** Default PWA behavior triggers `beforeinstallprompt` as soon as criteria are met.

**How to avoid:** Defer the install prompt. Store the event, show a subtle prompt (not modal) only after: (a) user has spent >60 seconds on site, AND (b) user has started filling out a form, OR (c) user explicitly clicks "Install App" in settings.

**Warning signs:** Low install rates despite PWA being properly configured.

### Pitfall 4: Language Switching Without Form State

**What goes wrong:** User switches language mid-form, loses all entered data.

**Why it happens:** Language switch triggers re-render, form state not preserved.

**How to avoid:** Use controlled form state (react-hook-form). Language switch only re-renders labels, not field values. Store form data separately from i18n context.

**Warning signs:** Bug reports about lost data during language switch.

### Pitfall 5: Operator Console Client Loading Race Condition

**What goes wrong:** Operator clicks on different calls quickly, directives load for wrong client.

**Why it happens:** Async client profile fetch completes out of order.

**How to avoid:** Use AbortController pattern. Each new client lookup aborts the previous one. Display loading state during fetch. Validate that loaded client matches current call before rendering.

**Warning signs:** Directives showing for Client A while intake form shows Client B.

### Pitfall 6: QA Queue Stale Data

**What goes wrong:** Two QA reviewers see the same item, both try to release it.

**Why it happens:** Queue listing doesn't reflect real-time status changes.

**How to avoid:** Use optimistic locking. When reviewer opens an item, mark it as `IN_REVIEW` with reviewer ID and timestamp. Other reviewers see "Being reviewed by [Name]". Release clears the lock. Abandoned locks auto-expire after 15 minutes.

**Warning signs:** Duplicate release attempts; QA reviewers stepping on each other.

## Code Examples

### PWA Manifest Configuration

```typescript
// apps/ethics-portal/next.config.js

import withPWA from '@ducanh2912/next-pwa';

const nextConfig = {
  // ... other config
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',

  // Offline fallback
  fallbacks: {
    document: '/~offline',
  },

  // Runtime caching for API requests
  runtimeCaching: [
    {
      // Cache branding/theme requests
      urlPattern: /\/api\/branding\/.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'branding-cache',
        expiration: { maxEntries: 10, maxAgeSeconds: 3600 },
      },
    },
    {
      // Cache translation files
      urlPattern: /\/locales\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'translations-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
      },
    },
    {
      // Background sync for form submissions
      urlPattern: /\/api\/v1\/public\/submit/,
      method: 'POST',
      handler: 'NetworkOnly',
      options: {
        backgroundSync: {
          name: 'report-submission-queue',
          options: { maxRetentionTime: 24 * 60 }, // 24 hours
        },
      },
    },
  ],

  // Manifest options
  manifest: {
    name: 'Ethics Reporting Portal',
    short_name: 'Ethics Portal',
    description: 'Secure, anonymous ethics reporting',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
})(nextConfig);
```

### Access Code Entry with Segmented Input

```tsx
// apps/ethics-portal/src/components/access-code-input.tsx

import { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface AccessCodeInputProps {
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export function AccessCodeInput({ onComplete, disabled }: AccessCodeInputProps) {
  const [segments, setSegments] = useState(['', '', '']);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handleChange = useCallback((index: number, value: string) => {
    // Uppercase, alphanumeric only
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

    const newSegments = [...segments];
    newSegments[index] = cleaned;
    setSegments(newSegments);

    // Auto-advance to next segment
    if (cleaned.length === 4 && index < 2) {
      inputRefs[index + 1].current?.focus();
    }

    // Check if complete
    const fullCode = newSegments.join('');
    if (fullCode.length === 12) {
      onComplete(fullCode);
    }
  }, [segments, onComplete]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    // Allow backspace to move to previous segment
    if (e.key === 'Backspace' && segments[index] === '' && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  }, [segments]);

  return (
    <div className="flex items-center gap-2">
      {segments.map((segment, i) => (
        <React.Fragment key={i}>
          <Input
            ref={inputRefs[i]}
            value={segment}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={disabled}
            className="w-20 text-center font-mono text-lg tracking-wider"
            maxLength={4}
            autoComplete="off"
            inputMode="text"
            pattern="[A-Z0-9]*"
          />
          {i < 2 && <span className="text-muted-foreground">-</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
```

### Employee Portal My Tasks Component

```tsx
// apps/frontend/src/components/employee/my-tasks.tsx

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Task {
  id: string;
  type: 'attestation' | 'disclosure' | 'approval' | 'follow_up';
  title: string;
  dueDate: Date;
  status: 'pending' | 'overdue' | 'completed';
  entityRef?: string;
}

export function MyTasks() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['employee', 'tasks'],
    queryFn: () => fetchMyTasks(),
  });

  const pendingTasks = tasks?.filter(t => t.status === 'pending') || [];
  const overdueTasks = tasks?.filter(t => t.status === 'overdue') || [];
  const completedTasks = tasks?.filter(t => t.status === 'completed').slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          My Tasks
          {overdueTasks.length > 0 && (
            <Badge variant="destructive">{overdueTasks.length} Overdue</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingTasks.length})
            </TabsTrigger>
            <TabsTrigger value="overdue" className={overdueTasks.length > 0 ? 'text-destructive' : ''}>
              Overdue ({overdueTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Recently Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <TaskList tasks={pendingTasks} />
          </TabsContent>
          <TabsContent value="overdue">
            <TaskList tasks={overdueTasks} showUrgency />
          </TabsContent>
          <TabsContent value="completed">
            <TaskList tasks={completedTasks} showCompleted />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TaskList({ tasks, showUrgency, showCompleted }: {
  tasks: Task[];
  showUrgency?: boolean;
  showCompleted?: boolean;
}) {
  if (tasks.length === 0) {
    return <p className="text-muted-foreground py-4">No tasks to display.</p>;
  }

  return (
    <div className="space-y-3 mt-4">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} showUrgency={showUrgency} />
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LocalStorage for drafts | Encrypted IndexedDB (Dexie.js) | PWA maturity 2024+ | Larger storage, encryption, structured data |
| Separate mobile app | PWA with offline | PWA 2.0 standard 2025+ | One codebase, install prompts, background sync |
| Server-side language | Client-side i18n with lazy loading | react-i18next maturity | Faster language switching, offline support |
| Build-time theming | Runtime CSS custom properties | CSS Variables widespread 2023+ | Instant theme changes without rebuild |
| next-pwa (original) | @ducanh2912/next-pwa | Fork 2024 | Active maintenance, App Router support |

**Deprecated/outdated:**
- `next-pwa` by shadowwalker: Not maintained, use `@ducanh2912/next-pwa` fork
- WebSQL for offline storage: Deprecated, use IndexedDB
- Application Cache: Deprecated, use Service Workers with Cache API

## Open Questions

1. **Ethics Portal Separate App vs Routes**
   - What we know: CONTEXT.md implies full branded microsite, possibly separate deployment
   - What's unclear: Whether the isolation benefits (CDN, independent deploy) outweigh the complexity
   - Recommendation: Start as routes in main app (`/ethics/[tenant]/...`), extract to separate app if needed for deployment isolation

2. **Manager Proxy Reporting UX**
   - What we know: EMP-06 requires managers to submit reports on behalf of employees
   - What's unclear: How much of the report prefills from employee data vs requires manual entry
   - Recommendation: Auto-fill reporter info from selected employee, require manager to explicitly confirm they're acting as proxy with reason

3. **Embeddable Widget Build Strategy**
   - What we know: CONTEXT.md mentions iframe, Web Component, SharePoint Web Part options
   - What's unclear: Which to prioritize for v1
   - Recommendation: Start with iframe (simplest), add Web Component later. SharePoint Web Part can be v2.

## Sources

### Primary (HIGH confidence)
- [@ducanh2912/next-pwa Documentation](https://ducanh-next-pwa.vercel.app/) - Official docs for Next.js PWA
- [Dexie.js Documentation](https://dexie.org/docs/) - IndexedDB wrapper with React hooks
- [dexie-encrypted npm](https://www.npmjs.com/package/dexie-encrypted) - Encryption plugin
- [react-i18next Documentation](https://react.i18next.com/) - Official i18n docs
- [web.dev PWA Offline Data](https://web.dev/learn/pwa/offline-data) - Google's authoritative PWA guide
- [Tailwind CSS Theme Variables](https://tailwindcss.com/docs/theme) - CSS custom properties theming
- Existing codebase: `apps/backend/src/modules/rius/riu-access.service.ts` - Access code implementation
- Existing codebase: `apps/backend/src/modules/forms/form-submission.service.ts` - Form engine
- Existing codebase: `apps/frontend/tailwind.config.ts` - CSS custom property setup

### Secondary (MEDIUM confidence)
- [Building PWAs with Next.js - Medium](https://benmukebo.medium.com/build-an-offline-ready-pwa-with-next-js-14-using-ducanh2912-next-pwa-17851765fa6b) - Practical implementation guide
- [White-Label SaaS Architecture Guide](https://developex.com/blog/building-scalable-white-label-saas/) - Multi-tenant branding patterns
- [Ethics Hotline Best Practices](https://www.whistleblowersecurity.com/blog/ultimate-guide-to-employee-reporting-hotlines) - Industry UX patterns
- [HubSpot Form Design Patterns](https://developers.hubspot.com/docs/reference/ui-components/design/patterns/forms) - Intake form UX
- [Priority Queue Pattern - Azure](https://learn.microsoft.com/en-us/azure/architecture/patterns/priority-queue) - QA queue sorting

### Tertiary (LOW confidence - needs validation)
- Cross-domain embedding with zoid: May be overkill for iframe-based widgets

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using established libraries with official documentation
- Architecture (branding): HIGH - CSS custom properties well-documented, existing Tailwind setup
- Architecture (PWA/offline): HIGH - @ducanh2912/next-pwa actively maintained with App Router support
- Architecture (i18n): HIGH - react-i18next is industry standard
- Pitfalls: MEDIUM - Based on PWA and multi-tenant best practices, some experience-based

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable patterns, well-established libraries)
