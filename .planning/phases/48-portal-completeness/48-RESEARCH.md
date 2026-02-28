# Phase 48: Portal Completeness - Research

**Researched:** 2026-02-28
**Domain:** Multi-portal enhancements: Manager dashboards, AI follow-up suggestions, session timeout, multi-language detection, crisis banners
**Confidence:** HIGH

## Summary

Phase 48 completes the three portal experiences (Employee, Operator, Ethics) by adding advanced features built on the foundation from Phase 8. The existing codebase has well-structured portal modules in both frontend (`apps/frontend/src/app/employee/`, `apps/frontend/src/app/operator/`, `apps/frontend/src/app/ethics/`) and backend (`apps/backend/src/modules/portals/`). This phase adds manager team dashboards, AI-suggested follow-up questions, directive acknowledgment gates, QA metrics, multi-language auto-detection, and crisis banners.

The key architectural patterns to leverage include:

- **Employee Portal**: Existing `EmployeeTasksService` for task aggregation, `EmployeeDashboard` component with tab navigation, and `MyTeamTab` placeholder for manager features
- **Operator Console**: Existing `QaQueueService` for QA workflow, `DirectivesService` for scripts, split-screen layout with context tabs, and AI skills infrastructure from Phase 5
- **Ethics Portal**: Existing `TenantBranding` service, `react-i18next` for internationalization, and tenant-scoped configuration

**Primary recommendation:** Build incrementally on existing services. For AI follow-up suggestions, use the existing AI skills registry (Phase 5) with json-rules-engine (Phase 40) to select category-appropriate questions. For session timeout, use react-idle-timer library. For multi-language detection, extend existing i18next configuration with detection priority chain.

## Standard Stack

### Core Libraries (Already Installed)

| Library                          | Version | Purpose                              | Why Standard                                          |
| -------------------------------- | ------- | ------------------------------------ | ----------------------------------------------------- |
| react-i18next                    | ^14.x   | Internationalization                 | Already configured in Phase 8, namespace lazy loading |
| i18next-browser-languagedetector | ^8.x    | Language detection                   | Already installed, supports Accept-Language           |
| json-rules-engine                | 7.3.1   | Category-specific question selection | Already installed from Phase 40                       |
| exceljs                          | ^4.x    | Excel export for disclosure history  | Already used in analytics module                      |
| @anthropic-ai/sdk                | ^0.39+  | AI follow-up suggestions             | Already installed from Phase 5                        |

### New Libraries Required

| Library          | Version | Purpose                           | When to Use                   |
| ---------------- | ------- | --------------------------------- | ----------------------------- |
| react-idle-timer | ^5.x    | Session idle timeout detection    | EMPL-07 session warning modal |
| file-saver       | ^2.x    | Client-side file download         | EMPL-06 disclosure export     |
| js-cookie        | ^3.x    | Cookie-based language persistence | ETHP-03 language preference   |

### Alternatives Considered

| Instead of                       | Could Use         | Tradeoff                                                              |
| -------------------------------- | ----------------- | --------------------------------------------------------------------- |
| react-idle-timer                 | Custom setTimeout | react-idle-timer handles edge cases (tab visibility, multiple events) |
| File-saver                       | Native download   | File-saver handles cross-browser blob/download quirks                 |
| i18next-browser-languagedetector | Custom detection  | Library already handles Accept-Language parsing, fallback chains      |

**Installation:**

```bash
npm install react-idle-timer file-saver js-cookie
npm install -D @types/file-saver @types/js-cookie
```

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/portals/
├── employee/
│   ├── employee-portal.controller.ts  # Existing
│   ├── employee-tasks.service.ts      # Existing - extend for manager
│   ├── manager-team.service.ts        # NEW: Team compliance metrics
│   ├── manager-proxy.service.ts       # Existing - extend for bulk
│   ├── disclosure-export.service.ts   # NEW: Export disclosure history
│   └── dto/
│       └── manager-dashboard.dto.ts   # NEW
├── operator/
│   ├── operator-console.controller.ts # Existing
│   ├── qa-queue.service.ts            # Existing
│   ├── qa-metrics.service.ts          # NEW: QA manager dashboard
│   ├── directives.service.ts          # Existing - extend for statements
│   ├── ai-suggestions.service.ts      # NEW: AI follow-up questions
│   └── category-questions.service.ts  # NEW: Dynamic intake questions
└── ethics/
    ├── ethics-portal.controller.ts    # Existing
    ├── ethics-portal.service.ts       # Existing - extend for banner/stats
    ├── crisis-banner.service.ts       # NEW: Tenant crisis configuration
    └── transparency-stats.service.ts  # NEW: Anonymized statistics

apps/frontend/src/
├── components/employee/
│   ├── my-team-tab.tsx               # Existing - enhance
│   ├── team-compliance-dashboard.tsx # NEW: Manager dashboard
│   ├── bulk-reminder-dialog.tsx      # NEW: Bulk reminder UI
│   ├── my-reports-timeline.tsx       # NEW: RIU+Case combined view
│   ├── disclosure-condition.tsx      # NEW: Condition completion UI
│   ├── disclosure-export.tsx         # NEW: Export button/dialog
│   └── session-timeout-modal.tsx     # NEW: Idle warning modal
├── components/operator/
│   ├── ai-suggested-questions.tsx    # NEW: AI follow-up panel
│   ├── directive-acknowledgment.tsx  # NEW: Gate before submit
│   ├── qa-metrics-dashboard.tsx      # NEW: QA manager view
│   ├── category-questions.tsx        # Existing - enhance
│   └── statement-manager.tsx         # NEW: Opening/closing scripts
└── components/ethics/
    ├── crisis-banner.tsx             # NEW: Non-dismissible alert
    ├── emergency-phone.tsx           # NEW: Phone number display
    ├── language-detector.tsx         # NEW: Auto-detection chain
    └── transparency-stats.tsx        # NEW: Anonymized stats display
```

### Pattern 1: Manager Team Compliance Dashboard

**What:** Aggregate disclosure/attestation status across direct reports with outstanding items per person.
**When to use:** EMPL-01 manager dashboard.
**Example:**

```typescript
// apps/backend/src/modules/portals/employee/manager-team.service.ts

export interface TeamMemberCompliance {
  employeeId: string;
  employeeName: string;
  email: string;
  department: string;
  pendingDisclosures: number;
  overdueDisclosures: number;
  pendingAttestations: number;
  overdueAttestations: number;
  lastCompletedAt: Date | null;
  complianceScore: number; // 0-100
}

export interface TeamComplianceSummary {
  totalMembers: number;
  fullCompliant: number;
  needsAttention: number;
  critical: number; // >7 days overdue
  overallComplianceRate: number;
  byType: {
    disclosures: { pending: number; overdue: number };
    attestations: { pending: number; overdue: number };
  };
}

@Injectable()
export class ManagerTeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeHierarchyService: EmployeeHierarchyService,
  ) {}

  async getTeamCompliance(
    managerId: string,
    organizationId: string,
  ): Promise<{
    summary: TeamComplianceSummary;
    members: TeamMemberCompliance[];
  }> {
    // Get direct reports from employee hierarchy
    const directReports = await this.employeeHierarchyService.getDirectReports(
      managerId,
      organizationId,
    );

    const now = new Date();
    const members: TeamMemberCompliance[] = [];

    for (const employee of directReports) {
      // Get campaign assignments for this employee
      const assignments = await this.prisma.campaignAssignment.findMany({
        where: {
          organizationId,
          employeeId: employee.id,
          status: { in: ["PENDING", "NOTIFIED", "IN_PROGRESS", "OVERDUE"] },
        },
        include: {
          campaign: { select: { type: true } },
        },
      });

      const disclosures = assignments.filter(
        (a) => a.campaign.type === "DISCLOSURE",
      );
      const attestations = assignments.filter(
        (a) => a.campaign.type === "ATTESTATION",
      );

      members.push({
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        department: employee.department,
        pendingDisclosures: disclosures.filter((a) => a.status !== "OVERDUE")
          .length,
        overdueDisclosures: disclosures.filter((a) => a.status === "OVERDUE")
          .length,
        pendingAttestations: attestations.filter((a) => a.status !== "OVERDUE")
          .length,
        overdueAttestations: attestations.filter((a) => a.status === "OVERDUE")
          .length,
        lastCompletedAt: employee.lastCompletedAt,
        complianceScore: this.calculateScore(employee),
      });
    }

    const summary = this.calculateSummary(members);
    return { summary, members };
  }

  async sendBulkReminders(
    managerId: string,
    organizationId: string,
    employeeIds: string[],
    message?: string,
  ): Promise<{ sent: number; errors: string[] }> {
    // Validate manager has authority over these employees
    const directReports = await this.employeeHierarchyService.getDirectReports(
      managerId,
      organizationId,
    );
    const authorizedIds = new Set(directReports.map((e) => e.id));

    const validIds = employeeIds.filter((id) => authorizedIds.has(id));

    // Send reminders via notification service
    // ...
  }
}
```

### Pattern 2: AI-Suggested Follow-Up Questions

**What:** Use AI to suggest contextually appropriate follow-up questions based on category and initial narrative.
**When to use:** OPER-01 AI suggestions during intake.
**Example:**

```typescript
// apps/backend/src/modules/portals/operator/ai-suggestions.service.ts

export interface SuggestedQuestion {
  id: string;
  question: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
  category: string;
}

@Injectable()
export class AiSuggestionsService {
  constructor(
    private readonly aiClientService: AiClientService,
    private readonly categoryQuestionsService: CategoryQuestionsService,
    private readonly cacheManager: Cache,
  ) {}

  async getSuggestedQuestions(params: {
    categoryId: string;
    narrativeContent: string;
    organizationId: string;
    answeredQuestions: string[];
  }): Promise<SuggestedQuestion[]> {
    const { categoryId, narrativeContent, organizationId, answeredQuestions } =
      params;

    // Get category-specific base questions
    const baseQuestions =
      await this.categoryQuestionsService.getQuestionsForCategory(
        categoryId,
        organizationId,
      );

    // Filter out already-answered questions
    const remainingQuestions = baseQuestions.filter(
      (q) => !answeredQuestions.includes(q.id),
    );

    // Use AI to prioritize and suggest additional questions
    const cacheKey = `ai:suggestions:${categoryId}:${this.hashContent(narrativeContent)}`;
    let suggestions =
      await this.cacheManager.get<SuggestedQuestion[]>(cacheKey);

    if (!suggestions) {
      const prompt = this.buildSuggestionPrompt(
        categoryId,
        narrativeContent,
        remainingQuestions,
      );

      const response = await this.aiClientService.createMessage({
        model: "claude-sonnet-4-5",
        maxTokens: 1024,
        system: OPERATOR_SUGGESTION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });

      suggestions = this.parseSuggestions(response.content);
      await this.cacheManager.set(cacheKey, suggestions, 300); // 5 min cache
    }

    return suggestions.slice(0, 5); // Return top 5
  }

  private buildSuggestionPrompt(
    categoryId: string,
    narrative: string,
    availableQuestions: CategoryQuestion[],
  ): string {
    return `Based on this hotline report in category ${categoryId}:

"${narrative}"

Available follow-up questions:
${availableQuestions.map((q, i) => `${i + 1}. ${q.text}`).join("\n")}

Suggest which questions are most relevant and why. Also suggest any additional questions specific to the details mentioned.`;
  }
}
```

### Pattern 3: Session Idle Timeout with Warning Modal

**What:** Detect user inactivity, show countdown warning, auto-logout if no response.
**When to use:** EMPL-07 configurable session timeout.
**Example:**

```typescript
// apps/frontend/src/components/employee/session-timeout-modal.tsx

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface SessionTimeoutModalProps {
  /** Warning duration in seconds (default 60) */
  warningDurationSeconds?: number;
  /** Idle timeout before showing warning in minutes (default 15) */
  idleTimeoutMinutes?: number;
  /** Callback to extend session */
  onExtendSession?: () => Promise<void>;
}

export function SessionTimeoutModal({
  warningDurationSeconds = 60,
  idleTimeoutMinutes = 15,
  onExtendSession,
}: SessionTimeoutModalProps) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(warningDurationSeconds);

  // Handle idle detection
  const onIdle = useCallback(() => {
    setShowWarning(true);
    setRemainingSeconds(warningDurationSeconds);
  }, [warningDurationSeconds]);

  const { reset, getRemainingTime } = useIdleTimer({
    timeout: idleTimeoutMinutes * 60 * 1000,
    onIdle,
    debounce: 500,
    events: [
      'mousemove',
      'keydown',
      'wheel',
      'DOMMouseScroll',
      'mousewheel',
      'mousedown',
      'touchstart',
      'touchmove',
      'MSPointerDown',
      'MSPointerMove',
      'visibilitychange',
    ],
  });

  // Countdown timer when warning is shown
  useEffect(() => {
    if (!showWarning) return;

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning]);

  const handleExtendSession = useCallback(async () => {
    setShowWarning(false);
    reset();
    if (onExtendSession) {
      await onExtendSession();
    }
  }, [reset, onExtendSession]);

  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: '/login?reason=timeout' });
  }, []);

  const progressPercent = (remainingSeconds / warningDurationSeconds) * 100;

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session About to Expire</AlertDialogTitle>
          <AlertDialogDescription>
            You've been inactive for {idleTimeoutMinutes} minutes. Your session will
            expire in {remainingSeconds} seconds.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-center text-2xl font-mono mt-2">
            {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
          </p>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleLogout}>
            Log Out Now
          </Button>
          <Button onClick={handleExtendSession}>
            Stay Logged In
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Pattern 4: Multi-Language Auto-Detection Chain

**What:** Detect language from URL param > user preference > Accept-Language header > HRIS > org default.
**When to use:** ETHP-03 multi-language detection.
**Example:**

```typescript
// apps/frontend/src/hooks/useLanguageDetection.ts

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import Cookies from "js-cookie";

interface LanguageDetectionOptions {
  urlParamName?: string;
  cookieName?: string;
  hrisLanguage?: string; // From employee profile
  orgDefaultLanguage?: string;
}

const SUPPORTED_LANGUAGES = ["en", "es", "fr", "de", "pt", "zh", "ar", "he"];

export function useLanguageDetection(options: LanguageDetectionOptions = {}) {
  const {
    urlParamName = "lang",
    cookieName = "ethics-language",
    hrisLanguage,
    orgDefaultLanguage = "en",
  } = options;

  const searchParams = useSearchParams();
  const { i18n } = useTranslation();
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

  useEffect(() => {
    // Priority chain: URL param > cookie > Accept-Language > HRIS > org default
    let language: string | null = null;

    // 1. URL parameter (highest priority)
    const urlLang = searchParams?.get(urlParamName);
    if (urlLang && SUPPORTED_LANGUAGES.includes(urlLang)) {
      language = urlLang;
    }

    // 2. User preference (cookie/localStorage)
    if (!language) {
      const storedLang =
        Cookies.get(cookieName) || localStorage.getItem(cookieName);
      if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang)) {
        language = storedLang;
      }
    }

    // 3. Browser Accept-Language (handled by i18next-browser-languagedetector)
    if (!language) {
      const browserLang = navigator.language?.split("-")[0];
      if (browserLang && SUPPORTED_LANGUAGES.includes(browserLang)) {
        language = browserLang;
      }
    }

    // 4. HRIS employee profile language
    if (
      !language &&
      hrisLanguage &&
      SUPPORTED_LANGUAGES.includes(hrisLanguage)
    ) {
      language = hrisLanguage;
    }

    // 5. Organization default
    if (!language) {
      language = orgDefaultLanguage;
    }

    // Apply detected language
    if (language && language !== i18n.language) {
      i18n.changeLanguage(language);
      setDetectedLanguage(language);

      // Persist preference
      Cookies.set(cookieName, language, { expires: 365 });

      // Set document direction for RTL languages
      const rtlLanguages = ["ar", "he"];
      document.documentElement.dir = rtlLanguages.includes(language)
        ? "rtl"
        : "ltr";
      document.documentElement.lang = language;
    }
  }, [
    searchParams,
    hrisLanguage,
    orgDefaultLanguage,
    i18n,
    urlParamName,
    cookieName,
  ]);

  const setLanguage = (lang: string) => {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      i18n.changeLanguage(lang);
      Cookies.set(cookieName, lang, { expires: 365 });
      setDetectedLanguage(lang);
    }
  };

  return {
    detectedLanguage,
    setLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
```

### Pattern 5: Directive Acknowledgment Gate

**What:** Modal that blocks RIU submission until operator confirms they've reviewed required directives.
**When to use:** OPER-02 mandatory directive acknowledgment.
**Example:**

```typescript
// apps/frontend/src/components/operator/directive-acknowledgment.tsx

'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface Directive {
  id: string;
  title: string;
  content: string;
  stage: 'opening' | 'intake' | 'closing';
  isRequired: boolean;
  order: number;
}

interface DirectiveAcknowledgmentProps {
  directives: Directive[];
  onConfirm: (acknowledgedIds: string[]) => void;
  onCancel: () => void;
  open: boolean;
}

export function DirectiveAcknowledgment({
  directives,
  onConfirm,
  onCancel,
  open,
}: DirectiveAcknowledgmentProps) {
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const requiredDirectives = useMemo(
    () => directives.filter(d => d.isRequired),
    [directives]
  );

  const allRequiredAcknowledged = useMemo(
    () => requiredDirectives.every(d => acknowledged.has(d.id)),
    [requiredDirectives, acknowledged]
  );

  const handleToggle = (directiveId: string) => {
    setAcknowledged(prev => {
      const next = new Set(prev);
      if (next.has(directiveId)) {
        next.delete(directiveId);
      } else {
        next.add(directiveId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (allRequiredAcknowledged) {
      onConfirm(Array.from(acknowledged));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Required Directives</DialogTitle>
          <DialogDescription>
            Please confirm you have reviewed and followed all required directives
            before submitting this report.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-96 pr-4">
          <div className="space-y-4">
            {directives.map(directive => (
              <div
                key={directive.id}
                className={`p-4 border rounded-lg ${
                  directive.isRequired ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={directive.id}
                    checked={acknowledged.has(directive.id)}
                    onCheckedChange={() => handleToggle(directive.id)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={directive.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {directive.title}
                      {directive.isRequired && (
                        <span className="ml-2 text-xs text-amber-600">(Required)</span>
                      )}
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {directive.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {!allRequiredAcknowledged && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You must acknowledge all required directives before submitting.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!allRequiredAcknowledged}>
            Confirm & Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 6: Crisis Banner with Tenant Configuration

**What:** Non-dismissible banner for crisis situations, configurable per tenant.
**When to use:** ETHP-01, ETHP-02 crisis escalation and emergency phone.
**Example:**

```typescript
// apps/backend/src/modules/portals/ethics/crisis-banner.service.ts

export interface CrisisBannerConfig {
  isActive: boolean;
  message: string;
  severity: 'warning' | 'critical';
  startDate?: Date;
  endDate?: Date;
  emergencyPhone?: string;
  translations?: Record<string, string>; // Language code -> translated message
}

@Injectable()
export class CrisisBannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheManager: Cache,
  ) {}

  async getCrisisBannerConfig(organizationId: string): Promise<CrisisBannerConfig | null> {
    const cacheKey = `ethics:crisis:${organizationId}`;
    let config = await this.cacheManager.get<CrisisBannerConfig>(cacheKey);

    if (config === undefined) {
      const tenant = await this.prisma.tenantEthicsConfig.findUnique({
        where: { organizationId },
        select: {
          crisisBannerActive: true,
          crisisBannerMessage: true,
          crisisBannerSeverity: true,
          crisisBannerStartDate: true,
          crisisBannerEndDate: true,
          emergencyPhone: true,
          crisisBannerTranslations: true,
        },
      });

      if (!tenant || !tenant.crisisBannerActive) {
        config = null;
      } else {
        // Check date range
        const now = new Date();
        const inRange =
          (!tenant.crisisBannerStartDate || now >= tenant.crisisBannerStartDate) &&
          (!tenant.crisisBannerEndDate || now <= tenant.crisisBannerEndDate);

        if (!inRange) {
          config = null;
        } else {
          config = {
            isActive: true,
            message: tenant.crisisBannerMessage,
            severity: tenant.crisisBannerSeverity as 'warning' | 'critical',
            startDate: tenant.crisisBannerStartDate,
            endDate: tenant.crisisBannerEndDate,
            emergencyPhone: tenant.emergencyPhone,
            translations: tenant.crisisBannerTranslations as Record<string, string>,
          };
        }
      }

      await this.cacheManager.set(cacheKey, config, 300); // 5 min cache
    }

    return config;
  }
}

// apps/frontend/src/components/ethics/crisis-banner.tsx

'use client';

import { AlertTriangle, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface CrisisBannerProps {
  message: string;
  severity: 'warning' | 'critical';
  emergencyPhone?: string;
  translations?: Record<string, string>;
}

export function CrisisBanner({
  message,
  severity,
  emergencyPhone,
  translations,
}: CrisisBannerProps) {
  const { i18n } = useTranslation();

  // Get translated message if available
  const displayMessage = translations?.[i18n.language] || message;

  return (
    <div
      role="alert"
      className={cn(
        'w-full py-3 px-4 flex items-center justify-center gap-3',
        'sticky top-0 z-50', // Always visible
        severity === 'critical'
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-amber-500 text-amber-950'
      )}
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm font-medium">{displayMessage}</span>

      {emergencyPhone && (
        <a
          href={`tel:${emergencyPhone}`}
          className={cn(
            'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold',
            'bg-white/20 hover:bg-white/30 transition-colors'
          )}
        >
          <Phone className="h-4 w-4" />
          {emergencyPhone}
        </a>
      )}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Polling for session state:** Don't poll the server for session validity. Use client-side idle detection with react-idle-timer and refresh tokens.

- **Hardcoding question templates:** Don't embed category questions in code. Load dynamically from database based on category selection (OPER-04).

- **Blocking AI suggestions on main thread:** AI suggestion fetching should be async and non-blocking. Show skeleton while loading.

- **Dismissible crisis banners:** Crisis banners (ETHP-01) must NOT be dismissible. Use CSS to ensure they cannot be closed.

- **Mixing tenant languages:** Each tenant can have different default languages. Don't use global language state without tenant scoping.

- **Direct HRIS queries for manager hierarchy:** Use the existing `EmployeeHierarchyService` which handles caching and HRIS sync timing.

## Don't Hand-Roll

| Problem            | Don't Build                    | Use Instead                      | Why                                                       |
| ------------------ | ------------------------------ | -------------------------------- | --------------------------------------------------------- |
| Idle detection     | Custom setTimeout              | react-idle-timer                 | Handles tab visibility, multiple event types, edge cases  |
| Excel export       | Custom buffer creation         | ExcelJS (existing)               | Already configured with streaming, conditional formatting |
| Language detection | Manual Accept-Language parsing | i18next-browser-languagedetector | Handles browser quirks, quality values, fallback chains   |
| File downloads     | window.location = url          | file-saver                       | Cross-browser blob handling, filename control             |
| Employee hierarchy | Direct DB queries              | EmployeeHierarchyService         | Handles HRIS sync, caching, reporting structure           |
| AI suggestions     | Direct API calls               | AiClientService (Phase 5)        | Rate limiting, tenant isolation, audit logging            |

**Key insight:** The Phase 8 portals and Phase 5 AI infrastructure provide the foundation. This phase adds features on top, not new infrastructure.

## Common Pitfalls

### Pitfall 1: Manager Dashboard N+1 Queries

**What goes wrong:** Loading compliance data for each team member sequentially causes slow dashboard.
**Why it happens:** Iterating employees and querying assignments per employee.
**How to avoid:** Use batch queries with `employeeId: { in: employeeIds }`. Pre-aggregate counts in a single query with Prisma `groupBy`.
**Warning signs:** Dashboard load time scales linearly with team size.

### Pitfall 2: Session Timeout Not Respecting Tab Visibility

**What goes wrong:** User is active in another tab but gets logged out from inactive tab.
**Why it happens:** Simple setTimeout doesn't detect activity in other tabs.
**How to avoid:** react-idle-timer's `crossTab` option synchronizes activity detection across browser tabs.
**Warning signs:** User complaints about unexpected logouts.

### Pitfall 3: AI Suggestion Rate Limiting

**What goes wrong:** Operators trigger many AI suggestion requests, exhausting rate limits.
**Why it happens:** Requesting suggestions on every keystroke or category change.
**How to avoid:** Debounce suggestion requests (500ms minimum). Cache suggestions by category+narrative hash. Use the existing rate limiter from Phase 5.
**Warning signs:** 429 errors during high intake volume.

### Pitfall 4: Multi-Language Detection Race Condition

**What goes wrong:** Page flashes in wrong language before correct language loads.
**Why it happens:** Rendering before language detection completes.
**How to avoid:** Show loading skeleton until language is detected and translations are loaded. Use Suspense with i18next lazy loading.
**Warning signs:** Brief English text flash before switching to Spanish.

### Pitfall 5: Disclosure Export Memory Issues

**What goes wrong:** Large disclosure history export crashes browser or server.
**Why it happens:** Loading all records into memory before generating Excel.
**How to avoid:** Use streaming export (existing `ExcelExportService.streamExport()`). Paginate on server, stream chunks. Set reasonable export limits.
**Warning signs:** Memory errors with users having 1000+ disclosures.

### Pitfall 6: QA Metrics Dashboard Stale Data

**What goes wrong:** QA manager sees incorrect operator metrics.
**Why it happens:** Metrics calculated once and cached too long.
**How to avoid:** Use shorter cache TTL (60 seconds) for real-time metrics. Consider WebSocket updates for live dashboard.
**Warning signs:** Metrics don't update after QA actions.

## Code Examples

### Disclosure History Export

```typescript
// apps/backend/src/modules/portals/employee/disclosure-export.service.ts

import { Injectable } from "@nestjs/common";
import {
  ExcelExportService,
  ColumnDefinition,
} from "@/modules/analytics/exports";
import { DisclosureQueryService } from "@/modules/disclosures/services/disclosure-query.service";

@Injectable()
export class DisclosureExportService {
  constructor(
    private readonly disclosureQuery: DisclosureQueryService,
    private readonly excelExport: ExcelExportService,
  ) {}

  async exportDisclosureHistory(
    userId: string,
    organizationId: string,
  ): Promise<Buffer> {
    // Get all disclosures for this user
    const result = await this.disclosureQuery.findMany(
      { submittedById: userId, pageSize: 1000 },
      organizationId,
    );

    const columns: ColumnDefinition[] = [
      { key: "referenceNumber", label: "Reference #", type: "string" },
      { key: "disclosureType", label: "Type", type: "string" },
      { key: "status", label: "Status", type: "string" },
      { key: "relatedCompany", label: "Related Company", type: "string" },
      { key: "relatedPersonName", label: "Related Person", type: "string" },
      { key: "disclosureValue", label: "Value", type: "currency" },
      { key: "submittedAt", label: "Submitted", type: "date" },
      { key: "conflictDetected", label: "Conflict Detected", type: "boolean" },
    ];

    const rows = result.items.map((item) => ({
      referenceNumber: item.referenceNumber,
      disclosureType: item.disclosureType,
      status: item.status,
      relatedCompany: item.relatedCompany ?? "",
      relatedPersonName: item.relatedPersonName ?? "",
      disclosureValue: item.disclosureValue ?? 0,
      submittedAt: item.submittedAt,
      conflictDetected: item.conflictDetected,
    }));

    return this.excelExport.generateBuffer(rows, columns, {
      sheetName: "Disclosure History",
      includeMetadata: true,
    });
  }
}
```

### QA Manager Metrics Dashboard

```typescript
// apps/backend/src/modules/portals/operator/qa-metrics.service.ts

export interface QaOperatorMetrics {
  operatorId: string;
  operatorName: string;
  totalReviewed: number;
  returnRate: number; // Percentage returned to operator
  averageReviewTimeSeconds: number;
  last7Days: {
    reviewed: number;
    returned: number;
  };
}

export interface QaTeamMetrics {
  totalPending: number;
  averageWaitTime: number; // Seconds in queue
  operators: QaOperatorMetrics[];
  reviewedToday: number;
  returnedToday: number;
  byHour: Array<{ hour: number; count: number }>;
}

@Injectable()
export class QaMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getQaTeamMetrics(): Promise<QaTeamMetrics> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    // Pending count
    const totalPending = await this.prisma.riuHotlineExtension.count({
      where: { qaStatus: "PENDING" },
    });

    // Average wait time (time from creation to first review)
    const pendingItems = await this.prisma.riuHotlineExtension.findMany({
      where: { qaStatus: "PENDING" },
      select: { createdAt: true },
    });

    const avgWaitSeconds =
      pendingItems.length > 0
        ? pendingItems.reduce(
            (sum, item) =>
              sum + (now.getTime() - item.createdAt.getTime()) / 1000,
            0,
          ) / pendingItems.length
        : 0;

    // Operator metrics
    const operators = await this.getOperatorMetrics(sevenDaysAgo);

    // Today's stats
    const reviewedToday = await this.prisma.riuHotlineExtension.count({
      where: {
        qaStatus: { in: ["APPROVED", "REJECTED"] },
        qaReviewedAt: { gte: todayStart },
      },
    });

    const returnedToday = await this.prisma.riuHotlineExtension.count({
      where: {
        qaStatus: "REJECTED",
        qaReviewedAt: { gte: todayStart },
      },
    });

    // By-hour distribution
    const byHour = await this.getReviewsByHour(todayStart);

    return {
      totalPending,
      averageWaitTime: avgWaitSeconds,
      operators,
      reviewedToday,
      returnedToday,
      byHour,
    };
  }
}
```

### Transparency Statistics Display

```typescript
// apps/backend/src/modules/portals/ethics/transparency-stats.service.ts

export interface TransparencyStats {
  totalReportsReceived: number;
  reportsThisYear: number;
  averageResolutionDays: number;
  categoriesReported: number;
  anonymousPercentage: number;
  reportingTrend: "increasing" | "stable" | "decreasing";
  // Anonymized - no identifying info
}

@Injectable()
export class TransparencyStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheManager: Cache,
  ) {}

  async getStats(organizationId: string): Promise<TransparencyStats | null> {
    // Check if tenant has enabled transparency display
    const config = await this.prisma.tenantEthicsConfig.findUnique({
      where: { organizationId },
      select: { showTransparencyStats: true },
    });

    if (!config?.showTransparencyStats) {
      return null;
    }

    const cacheKey = `transparency:${organizationId}`;
    let stats = await this.cacheManager.get<TransparencyStats>(cacheKey);

    if (!stats) {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

      const [
        total,
        thisYear,
        lastYearCount,
        categories,
        anonymous,
        avgResolution,
      ] = await Promise.all([
        // Total reports ever
        this.prisma.riskIntelligenceUnit.count({
          where: {
            organizationId,
            type: { in: ["HOTLINE_REPORT", "WEB_FORM"] },
          },
        }),
        // Reports this year
        this.prisma.riskIntelligenceUnit.count({
          where: {
            organizationId,
            type: { in: ["HOTLINE_REPORT", "WEB_FORM"] },
            createdAt: { gte: yearStart },
          },
        }),
        // Reports last year (for trend)
        this.prisma.riskIntelligenceUnit.count({
          where: {
            organizationId,
            type: { in: ["HOTLINE_REPORT", "WEB_FORM"] },
            createdAt: { gte: lastYear, lte: lastYearEnd },
          },
        }),
        // Distinct categories
        this.prisma.riskIntelligenceUnit.findMany({
          where: { organizationId },
          select: { categoryId: true },
          distinct: ["categoryId"],
        }),
        // Anonymous count
        this.prisma.riskIntelligenceUnit.count({
          where: { organizationId, reporterType: "ANONYMOUS" },
        }),
        // Average resolution time (cases)
        this.calculateAverageResolution(organizationId),
      ]);

      const trend =
        thisYear > lastYearCount * 1.1
          ? "increasing"
          : thisYear < lastYearCount * 0.9
            ? "decreasing"
            : "stable";

      stats = {
        totalReportsReceived: total,
        reportsThisYear: thisYear,
        averageResolutionDays: avgResolution,
        categoriesReported: categories.length,
        anonymousPercentage: total > 0 ? (anonymous / total) * 100 : 0,
        reportingTrend: trend,
      };

      await this.cacheManager.set(cacheKey, stats, 3600); // 1 hour cache
    }

    return stats;
  }
}
```

## State of the Art

| Old Approach               | Current Approach                     | When Changed           | Impact                        |
| -------------------------- | ------------------------------------ | ---------------------- | ----------------------------- |
| Server-side session checks | Client-side idle timer + JWT refresh | 2024+                  | Better UX, fewer server calls |
| Static intake forms        | Dynamic category-loaded questions    | Phase 8                | Already implemented           |
| Manual language selection  | Auto-detection with fallback chain   | 2025                   | Better UX for global users    |
| Dismissible alerts         | Non-dismissible crisis banners       | Compliance requirement | Ensures critical info seen    |
| CSV-only exports           | Streaming Excel with formatting      | Existing               | Professional exports          |

**Deprecated/outdated:**

- Server-side session polling: Use client-side idle detection
- Global language state: Scope language by tenant configuration

## Open Questions

1. **Disclosure Condition Workflow**
   - What we know: Employee can mark disclosure conditions as complete with evidence
   - What's unclear: Who reviews/approves the condition completion? Auto-approval or manual?
   - Recommendation: Start with auto-approval for evidence upload, compliance officer sees in audit trail

2. **AI Suggestion Model Selection**
   - What we know: Use AI for follow-up question suggestions
   - What's unclear: Which Claude model for real-time suggestions (latency vs quality)
   - Recommendation: Use claude-sonnet-4-5 for balance; claude-haiku-3-5 if latency issues

3. **QA Metrics Time Range**
   - What we know: QA manager dashboard shows operator metrics
   - What's unclear: Default time range - 7 days, 30 days, configurable?
   - Recommendation: Default 7 days with option to select 30/90 days

## Sources

### Primary (HIGH confidence)

- Existing codebase: `apps/backend/src/modules/portals/` - Portal service patterns
- Existing codebase: `apps/backend/src/modules/analytics/exports/excel-export.service.ts` - Excel export
- Phase 8 Research: `.planning/phases/08-portals/08-RESEARCH.md` - Foundation patterns
- Phase 5 Research: `.planning/phases/05-ai-infrastructure/05-RESEARCH.md` - AI integration patterns
- Phase 40 Research: `.planning/phases/40-rules-engine-foundation/40-RESEARCH.md` - Rules engine
- [react-idle-timer Documentation](https://idletimer.dev/) - Idle detection
- [Next.js Internationalization](https://nextjs.org/docs/pages/guides/internationalization) - i18n routing
- [i18next-browser-languagedetector](https://www.npmjs.com/package/i18next-browser-languagedetector) - Language detection

### Secondary (MEDIUM confidence)

- [react-i18next Documentation](https://react.i18next.com/) - React i18n patterns
- [Session Timeout Modal Pattern](https://github.com/evanmeeks/next-session-modal) - NextAuth session timeout
- [MDN Accept-Language](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language) - Header parsing

### Tertiary (LOW confidence)

- Manager dashboard patterns based on HubSpot-style team views
- Crisis banner patterns based on compliance software standards

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Using existing libraries and services
- Architecture: HIGH - Follows established codebase patterns
- Session timeout: HIGH - Well-documented react-idle-timer library
- AI suggestions: MEDIUM - Extension of Phase 5 patterns, new use case
- Multi-language detection: HIGH - Standard i18next configuration
- Crisis banner: MEDIUM - Simple implementation, business rules from requirements

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (30 days - stable patterns)
