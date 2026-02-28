# Phase 47: External Parties & GT&E - Research

**Researched:** 2026-02-28
**Domain:** External party management, gift/entertainment aggregation, currency conversion, location-specific compliance rules
**Confidence:** HIGH (substantial existing infrastructure from Phase 9, clear requirements)

## Summary

Phase 47 completes the Gift, Travel & Entertainment (GT&E) disclosure system by adding external party management, cross-disclosure aggregation, currency conversion, and location-specific threshold rules. This builds directly on the existing disclosure infrastructure established in Phase 9.

The primary implementation work involves:

1. **ExternalParty entity** - New model with type, risk rating, aliases, government/sanctioned flags, and tax ID
2. **GT&E aggregation service** - Aggregate gift values across disclosures from the same external party for threshold enforcement
3. **Currency conversion service** - Convert disclosure values to USD using daily exchange rates for consistent threshold evaluation
4. **Location-specific rules** - Configure different thresholds based on state/country and government official status

**Primary recommendation:** Build ExternalParty as a first-class entity with fuzzy matching for alias detection. Use Open Exchange Rates API for currency conversion (free tier sufficient for compliance use cases). Extend existing ThresholdRule with location-aware conditions using json-rules-engine.

## Standard Stack

### Core (Already Exists - Use As-Is)

| Library           | Version    | Purpose            | Why Standard                       |
| ----------------- | ---------- | ------------------ | ---------------------------------- |
| NestJS            | 10.x       | Backend framework  | Already in use                     |
| Prisma            | 5.x        | ORM with RLS       | Already in use                     |
| json-rules-engine | 6.x        | Rule evaluation    | Already used by ThresholdService   |
| Decimal.js        | via Prisma | Currency precision | Already in use for disclosureValue |

### Supporting (New for Phase 47)

| Library            | Version | Purpose                | When to Use                                        |
| ------------------ | ------- | ---------------------- | -------------------------------------------------- |
| exchange-rates-api | 2.x     | Currency rate fetching | Daily rate refresh from Open Exchange Rates        |
| fuse.js            | 7.x     | Fuzzy matching         | External party alias detection, name deduplication |
| country-state-city | 3.x     | Location data          | State/country code validation and lookup           |

### Alternatives Considered

| Instead of              | Could Use            | Tradeoff                                                             |
| ----------------------- | -------------------- | -------------------------------------------------------------------- |
| Open Exchange Rates API | Fixer.io             | Fixer.io has better free tier but OXR more established               |
| fuse.js                 | Levenshtein-only     | Fuse.js provides better configurable fuzzy search                    |
| country-state-city      | Manual lookup tables | Library provides ISO codes and maintains country/state relationships |

**Installation:**

```bash
npm install exchange-rates-api fuse.js country-state-city
```

## Architecture Patterns

### Recommended Module Structure

```
apps/backend/src/modules/
├── disclosures/
│   ├── external-parties/           # NEW: External party sub-module
│   │   ├── external-party.service.ts
│   │   ├── external-party.controller.ts
│   │   ├── external-party.dto.ts
│   │   └── external-party-matcher.service.ts  # Alias/fuzzy matching
│   ├── gte/                         # NEW: GT&E specific services
│   │   ├── gte-aggregation.service.ts
│   │   ├── currency-conversion.service.ts
│   │   └── location-rules.service.ts
│   ├── threshold.service.ts         # EXTEND: Add location-aware evaluation
│   └── ...existing services
```

### Pattern 1: ExternalParty Entity with Alias Matching

**What:** First-class entity for tracking companies, individuals, and government entities across disclosures
**When to use:** When a disclosure references a gift giver/receiver

```typescript
// Prisma schema addition
model ExternalParty {
  id                String   @id @default(uuid())
  organizationId    String   @map("organization_id")

  // Identity
  name              String                 // Primary name
  partyType         ExternalPartyType      // COMPANY, INDIVIDUAL, GOVERNMENT_ENTITY, NON_PROFIT
  aliases           String[]   @default([])  // Alternate names for matching
  taxId             String?    @map("tax_id")  // Tax ID/EIN for US entities
  dunsNumber        String?    @map("duns_number")
  website           String?

  // Classification
  isGovernment      Boolean    @default(false) @map("is_government")
  isSanctioned      Boolean    @default(false) @map("is_sanctioned")
  riskRating        RiskRating @default(MEDIUM) @map("risk_rating")

  // Contact
  country           String?
  state             String?
  city              String?

  // Metadata
  notes             String?
  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")
  createdById       String     @map("created_by_id")

  // Relations
  disclosureLinks   DisclosureExternalPartyLink[]
  organization      Organization @relation(fields: [organizationId], references: [id])
  createdBy         User         @relation(fields: [createdById], references: [id])

  @@unique([organizationId, name])
  @@index([organizationId])
  @@index([organizationId, partyType])
  @@index([organizationId, isGovernment])
  @@index([organizationId, isSanctioned])
  @@map("external_parties")
}

enum ExternalPartyType {
  COMPANY
  INDIVIDUAL
  GOVERNMENT_ENTITY
  NON_PROFIT
}

enum RiskRating {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

// Link table for disclosure-to-external-party association
model DisclosureExternalPartyLink {
  id                String   @id @default(uuid())
  organizationId    String   @map("organization_id")
  disclosureId      String   @map("disclosure_id")  // riuId from RiuDisclosureExtension
  externalPartyId   String   @map("external_party_id")
  relationship      String   // GIFT_GIVER, GIFT_RECEIVER, ENTERTAINMENT_HOST, etc.
  createdAt         DateTime @default(now()) @map("created_at")

  disclosure        RiuDisclosureExtension @relation(fields: [disclosureId], references: [riuId])
  externalParty     ExternalParty          @relation(fields: [externalPartyId], references: [id])
  organization      Organization           @relation(fields: [organizationId], references: [id])

  @@unique([disclosureId, externalPartyId])
  @@index([organizationId, externalPartyId])
  @@map("disclosure_external_party_links")
}
```

### Pattern 2: GT&E Aggregation Service

**What:** Calculate cumulative gift values from the same external party over rolling windows
**When to use:** Evaluating threshold rules that aggregate across multiple disclosures

```typescript
// apps/backend/src/modules/disclosures/gte/gte-aggregation.service.ts

interface AggregateGiftResult {
  externalPartyId: string;
  externalPartyName: string;
  totalValueUsd: number;
  disclosureCount: number;
  windowStart: Date;
  windowEnd: Date;
  disclosures: {
    id: string;
    date: Date;
    valueUsd: number;
    originalValue: number;
    originalCurrency: string;
  }[];
}

@Injectable()
export class GteAggregationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyConversionService,
  ) {}

  /**
   * Aggregates gift values from the same external party over a rolling window.
   * All values converted to USD for consistent threshold evaluation.
   */
  async aggregateByExternalParty(
    employeeId: string,
    externalPartyId: string,
    organizationId: string,
    windowDays: number = 365,
  ): Promise<AggregateGiftResult> {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    // Get all disclosures for this employee + external party in window
    const disclosures = await this.prisma.riuDisclosureExtension.findMany({
      where: {
        organizationId,
        relatedPersonId: employeeId,
        disclosureType: { in: ["GIFT", "ENTERTAINMENT", "TRAVEL"] },
        createdAt: { gte: windowStart },
        externalPartyLinks: {
          some: { externalPartyId },
        },
      },
      include: {
        externalPartyLinks: {
          where: { externalPartyId },
          include: { externalParty: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Convert all values to USD
    let totalValueUsd = 0;
    const disclosureDetails = [];

    for (const disclosure of disclosures) {
      const originalValue = disclosure.disclosureValue
        ? Number(disclosure.disclosureValue)
        : 0;
      const originalCurrency = disclosure.disclosureCurrency || "USD";

      const valueUsd = await this.currencyService.convertToUsd(
        originalValue,
        originalCurrency,
        disclosure.createdAt,
      );

      totalValueUsd += valueUsd;
      disclosureDetails.push({
        id: disclosure.riuId,
        date: disclosure.createdAt,
        valueUsd,
        originalValue,
        originalCurrency,
      });
    }

    const externalParty = disclosures[0]?.externalPartyLinks[0]?.externalParty;

    return {
      externalPartyId,
      externalPartyName: externalParty?.name || "Unknown",
      totalValueUsd,
      disclosureCount: disclosures.length,
      windowStart,
      windowEnd: new Date(),
      disclosures: disclosureDetails,
    };
  }
}
```

### Pattern 3: Currency Conversion Service

**What:** Convert disclosure values to USD using daily exchange rates for consistent threshold evaluation
**When to use:** When evaluating thresholds for non-USD disclosures

```typescript
// apps/backend/src/modules/disclosures/gte/currency-conversion.service.ts

interface ExchangeRate {
  currency: string;
  rate: number; // Rate relative to USD
  date: Date;
}

@Injectable()
export class CurrencyConversionService {
  private readonly logger = new Logger(CurrencyConversionService.name);
  private rateCache: Map<string, ExchangeRate[]> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Converts an amount to USD using the exchange rate for the given date.
   * Falls back to most recent rate if exact date not available.
   */
  async convertToUsd(
    amount: number,
    fromCurrency: string,
    date: Date,
  ): Promise<number> {
    if (fromCurrency === "USD") {
      return amount;
    }

    const rate = await this.getRate(fromCurrency, date);
    if (!rate) {
      this.logger.warn(
        `No exchange rate found for ${fromCurrency} on ${date.toISOString()}, using 1:1`,
      );
      return amount; // Fallback: treat as USD
    }

    // Rate is stored as USD per unit of foreign currency
    return amount * rate;
  }

  /**
   * Gets the exchange rate for a currency on a given date.
   * Uses cached daily rates, falls back to most recent if date not found.
   */
  async getRate(currency: string, date: Date): Promise<number | null> {
    const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const cacheKey = `exchange_rate:${currency}:${dateKey}`;

    // Check cache first
    const cached = await this.cacheManager.get<number>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Look up from database
    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        currency,
        rateDate: {
          lte: date,
        },
      },
      orderBy: { rateDate: "desc" },
    });

    if (rate) {
      await this.cacheManager.set(cacheKey, Number(rate.rate), 86400); // Cache for 24h
      return Number(rate.rate);
    }

    return null;
  }

  /**
   * Refreshes exchange rates from external API.
   * Called daily by scheduler.
   */
  async refreshRates(): Promise<void> {
    this.logger.log("Refreshing exchange rates...");

    try {
      // Using Open Exchange Rates API
      const response = await fetch(
        `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPEN_EXCHANGE_RATES_APP_ID}`,
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const rates = data.rates as Record<string, number>;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Store rates in database
      for (const [currency, rate] of Object.entries(rates)) {
        await this.prisma.exchangeRate.upsert({
          where: {
            currency_rateDate: {
              currency,
              rateDate: today,
            },
          },
          update: { rate: new Decimal(rate) },
          create: {
            currency,
            rate: new Decimal(rate),
            rateDate: today,
            source: "OPEN_EXCHANGE_RATES",
          },
        });
      }

      this.logger.log(`Refreshed ${Object.keys(rates).length} exchange rates`);
    } catch (error) {
      this.logger.error(`Failed to refresh exchange rates: ${error.message}`);
      throw error;
    }
  }
}
```

### Pattern 4: Location-Specific Rule Configuration

**What:** Configure different thresholds based on employee location, external party location, or government official status
**When to use:** When compliance thresholds vary by jurisdiction (e.g., US state gift limits, FCPA)

```typescript
// Extend ThresholdRule schema with location conditions

// Additional fields on ThresholdRule model:
// locationConditions: Json?  @map("location_conditions")

interface LocationCondition {
  type: "EMPLOYEE_LOCATION" | "EXTERNAL_PARTY_LOCATION" | "ANY";
  countries?: string[]; // ISO 3166-1 alpha-2 codes
  states?: string[]; // US state codes (CA, NY, etc.)
  isGovernmentOfficial?: boolean;
}

// Example location-aware threshold rule:
const californiaGovernmentOfficialRule = {
  name: "California Government Official Gift Limit",
  description: "Gifts to California government officials limited to $10/month",
  disclosureTypes: ["GIFT"],
  conditions: [{ field: "disclosureValue", operator: "gte", value: 10 }],
  locationConditions: {
    type: "EXTERNAL_PARTY_LOCATION",
    states: ["CA"],
    isGovernmentOfficial: true,
  },
  aggregateConfig: {
    dimensions: ["person", "entity"],
    timeWindow: { type: "rolling", period: "months", value: 1 },
  },
  action: "CREATE_CASE",
  actionConfig: {
    caseTitle: "California Government Gift Threshold: {{personName}}",
    notifyRoles: ["LEGAL"],
  },
};

// Service extension for location-aware evaluation
@Injectable()
export class LocationRulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates location conditions for a threshold rule.
   */
  async evaluateLocationConditions(
    conditions: LocationCondition,
    employeeId: string,
    externalPartyId: string | null,
    organizationId: string,
  ): Promise<boolean> {
    if (!conditions) return true; // No location conditions = always matches

    // Get employee location
    if (conditions.type === "EMPLOYEE_LOCATION" || conditions.type === "ANY") {
      const employee = await this.prisma.employee.findFirst({
        where: { id: employeeId, organizationId },
        select: { country: true, state: true },
      });

      if (this.matchesLocation(employee, conditions)) {
        return true;
      }
    }

    // Get external party location
    if (
      (conditions.type === "EXTERNAL_PARTY_LOCATION" ||
        conditions.type === "ANY") &&
      externalPartyId
    ) {
      const party = await this.prisma.externalParty.findFirst({
        where: { id: externalPartyId, organizationId },
        select: { country: true, state: true, isGovernment: true },
      });

      if (this.matchesLocation(party, conditions)) {
        // Also check government official flag if specified
        if (conditions.isGovernmentOfficial !== undefined) {
          return party?.isGovernment === conditions.isGovernmentOfficial;
        }
        return true;
      }
    }

    return false;
  }

  private matchesLocation(
    entity: { country?: string | null; state?: string | null } | null,
    conditions: LocationCondition,
  ): boolean {
    if (!entity) return false;

    // Check country match
    if (conditions.countries?.length) {
      if (!entity.country || !conditions.countries.includes(entity.country)) {
        return false;
      }
    }

    // Check state match
    if (conditions.states?.length) {
      if (!entity.state || !conditions.states.includes(entity.state)) {
        return false;
      }
    }

    return true;
  }
}
```

### Anti-Patterns to Avoid

- **Storing external party names as strings on disclosures:** Use ExternalParty entity with proper linking
- **Converting currency at display time:** Convert to USD at submission time for consistent threshold evaluation
- **Hardcoding location rules:** Use configurable ThresholdRule with locationConditions
- **Not tracking exchange rate source:** Always store source and date for audit trail
- **Creating duplicate external parties:** Use fuzzy matching to detect similar names/aliases

## Don't Hand-Roll

| Problem                  | Don't Build          | Use Instead                | Why                              |
| ------------------------ | -------------------- | -------------------------- | -------------------------------- |
| Exchange rate fetching   | Custom HTTP client   | Open Exchange Rates API    | Reliable, documented, free tier  |
| Fuzzy name matching      | Custom Levenshtein   | fuse.js                    | Configurable, handles edge cases |
| Country/state validation | Manual lookup tables | country-state-city library | Maintained, ISO compliant        |
| Currency precision       | JavaScript numbers   | Prisma Decimal             | Avoids floating point errors     |
| Aggregation queries      | Manual loops         | Prisma aggregate/groupBy   | Database-level efficiency        |

**Key insight:** Phase 47 extends existing infrastructure. Focus on entity design and service integration, not rebuilding threshold or conflict detection systems.

## Common Pitfalls

### Pitfall 1: Currency Conversion Race Conditions

**What goes wrong:** Multiple disclosures evaluated before rate refresh, inconsistent thresholds
**Why it happens:** Daily rate refresh not synchronized with disclosure processing
**How to avoid:** Use rate from disclosure creation date, not current rate. Store converted_value_usd on disclosure.
**Warning signs:** Threshold evaluations varying for same-value disclosures

### Pitfall 2: External Party Duplication

**What goes wrong:** Same company appears multiple times with different names/aliases
**Why it happens:** No fuzzy matching on creation, user enters "Acme Corp" vs "ACME Corporation"
**How to avoid:** Run fuzzy match on external party creation, suggest merge for high-confidence matches
**Warning signs:** Aggregation misses disclosures due to separate external party records

### Pitfall 3: Location Rule Complexity Explosion

**What goes wrong:** Dozens of rules for each state/country combination become unmaintainable
**Why it happens:** Creating separate rules instead of using location conditions on fewer rules
**How to avoid:** Use locationConditions array to apply same rule to multiple jurisdictions
**Warning signs:** Rule count growing faster than jurisdiction coverage

### Pitfall 4: Aggregate Performance with Large History

**What goes wrong:** Aggregation queries become slow with years of disclosure history
**Why it happens:** Scanning entire disclosure table without proper indexing
**How to avoid:** Add composite index on (organizationId, relatedPersonId, createdAt, disclosureType). Limit window to configurable max (e.g., 365 days).
**Warning signs:** Timeout errors on aggregation for long-tenured employees

### Pitfall 5: Missing Government Official Classification

**What goes wrong:** FCPA-related thresholds don't trigger because government status not tracked
**Why it happens:** External party created without isGovernment flag, or employee doesn't indicate
**How to avoid:** Make isGovernment required on form when disclosing to external party. Add AI-assisted classification based on entity name patterns.
**Warning signs:** Government entity gifts not being escalated

## Code Examples

### Example 1: ExternalParty Matcher Service

```typescript
// apps/backend/src/modules/disclosures/external-parties/external-party-matcher.service.ts

import Fuse from "fuse.js";

interface MatchResult {
  party: ExternalParty;
  score: number; // 0-1, lower is better match
  matchedOn: "name" | "alias" | "taxId";
}

@Injectable()
export class ExternalPartyMatcherService {
  private readonly fuseOptions: Fuse.IFuseOptions<ExternalParty> = {
    keys: ["name", "aliases"],
    threshold: 0.3, // Allow fuzzy matches up to 30% difference
    includeScore: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds potential matches for an external party name.
   * Returns matches sorted by confidence (best first).
   */
  async findMatches(
    searchName: string,
    organizationId: string,
    limit: number = 5,
  ): Promise<MatchResult[]> {
    // First, try exact tax ID match if provided
    // Then, fuzzy search on name and aliases

    const parties = await this.prisma.externalParty.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        aliases: true,
        taxId: true,
        partyType: true,
        isGovernment: true,
        riskRating: true,
      },
    });

    const fuse = new Fuse(parties, this.fuseOptions);
    const results = fuse.search(searchName, { limit });

    return results.map((result) => ({
      party: result.item,
      score: result.score || 1,
      matchedOn: result.matches?.[0]?.key === "aliases" ? "alias" : "name",
    }));
  }

  /**
   * Suggests potential duplicates when creating a new external party.
   */
  async suggestDuplicates(
    newParty: { name: string; taxId?: string },
    organizationId: string,
  ): Promise<MatchResult[]> {
    // Check for exact tax ID match first
    if (newParty.taxId) {
      const exactTaxMatch = await this.prisma.externalParty.findFirst({
        where: { organizationId, taxId: newParty.taxId },
      });
      if (exactTaxMatch) {
        return [
          {
            party: exactTaxMatch,
            score: 0, // Perfect match
            matchedOn: "taxId",
          },
        ];
      }
    }

    // Fall back to fuzzy name matching
    return this.findMatches(newParty.name, organizationId, 3);
  }
}
```

### Example 2: ExchangeRate Scheduler

```typescript
// apps/backend/src/modules/jobs/processors/exchange-rate.processor.ts

@Processor("exchange-rates")
export class ExchangeRateProcessor {
  private readonly logger = new Logger(ExchangeRateProcessor.name);

  constructor(private readonly currencyService: CurrencyConversionService) {}

  @Process("refresh-daily-rates")
  async handleRefresh(job: Job) {
    this.logger.log("Starting daily exchange rate refresh");

    try {
      await this.currencyService.refreshRates();
      this.logger.log("Exchange rate refresh completed");
    } catch (error) {
      this.logger.error(`Exchange rate refresh failed: ${error.message}`);
      throw error; // Let Bull retry
    }
  }
}

// Schedule in module
@Module({
  imports: [
    BullModule.registerQueue({ name: "exchange-rates" }),
    ScheduleModule.forRoot(),
  ],
  providers: [ExchangeRateProcessor],
})
export class ExchangeRateModule {
  constructor(@InjectQueue("exchange-rates") private readonly queue: Queue) {}

  @Cron("0 6 * * *") // Run at 6 AM daily
  async scheduleRateRefresh() {
    await this.queue.add("refresh-daily-rates", {});
  }
}
```

### Example 3: Extended Threshold Evaluation with Location

```typescript
// Extension to ThresholdService.evaluateDisclosure

async evaluateDisclosureWithLocation(
  disclosureId: string,
  organizationId: string,
  disclosureType: string,
  disclosureData: Record<string, unknown>,
  personId: string,
  externalPartyId: string | null,
): Promise<ThresholdEvaluationResult> {
  // Get all active rules for this disclosure type
  const rules = await this.prisma.thresholdRule.findMany({
    where: {
      organizationId,
      isActive: true,
      disclosureTypes: { has: disclosureType as DisclosureType },
    },
    orderBy: { priority: 'desc' },
  });

  const triggeredRules: TriggeredRule[] = [];
  let highestPriorityAction: ThresholdActionDto | null = null;

  for (const rule of rules) {
    // Check location conditions first
    const locationConditions = rule.locationConditions as LocationCondition | null;
    if (locationConditions) {
      const locationMatch = await this.locationService.evaluateLocationConditions(
        locationConditions,
        personId,
        externalPartyId,
        organizationId,
      );
      if (!locationMatch) {
        continue; // Skip this rule, location doesn't match
      }
    }

    // Evaluate standard conditions (existing logic)
    const result = await this.evaluateRule(
      rule,
      disclosureData,
      personId,
      organizationId,
    );

    if (result.triggered) {
      triggeredRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        action: rule.action as ThresholdActionDto,
        evaluatedValue: result.evaluatedValue,
        thresholdValue: result.thresholdValue,
        aggregateBreakdown: result.aggregateBreakdown,
        locationConditions: locationConditions,
      });

      // Track highest priority action
      if (!highestPriorityAction ||
          this.getActionPriority(rule.action) > this.getActionPriority(highestPriorityAction)) {
        highestPriorityAction = rule.action as ThresholdActionDto;
      }
    }
  }

  return {
    triggered: triggeredRules.length > 0,
    triggeredRules,
    recommendedAction: highestPriorityAction,
  };
}
```

## State of the Art

| Old Approach                     | Current Approach                     | When Changed | Impact                               |
| -------------------------------- | ------------------------------------ | ------------ | ------------------------------------ |
| Manual external party tracking   | Entity-based with fuzzy matching     | 2024-2025    | Better aggregation, fewer duplicates |
| Single-currency thresholds       | Multi-currency with daily conversion | 2024         | Global compliance support            |
| Global thresholds only           | Location-specific rules              | 2024-2025    | Jurisdiction-specific compliance     |
| Manual government classification | AI-assisted with entity databases    | 2025         | Better FCPA compliance               |

**Current industry trends (2025-2026):**

- Sanctions screening integration (OFAC, UN sanctions lists) - not in scope but future consideration
- Real-time exchange rate APIs for high-frequency disclosures
- Machine learning for entity resolution across disclosures
- Integration with third-party risk management platforms

**Deprecated/outdated:**

- Static exchange rate tables: Replaced by daily API refresh
- Free-text external party names: Replaced by entity linking

## Open Questions

1. **Sanctions Screening Integration**
   - What we know: ExternalParty has isSanctioned flag
   - What's unclear: Whether to integrate with OFAC/sanctions APIs or manual maintenance
   - Recommendation: Start with manual flag, add API integration in future phase (not Phase 47 scope)

2. **Historical Rate Backfill**
   - What we know: Need exchange rates for historical disclosures
   - What's unclear: How far back to backfill rates
   - Recommendation: Backfill 2 years of rates on initial setup, store permanently

3. **External Party Merge Workflow**
   - What we know: Duplicates will exist, need merge capability
   - What's unclear: Full merge workflow (which record wins, audit trail)
   - Recommendation: Implement in 47-05 (External party management UI) with merge wizard

## Sources

### Primary (HIGH confidence)

- Existing codebase: ThresholdService, ConflictDetectionService, RiuDisclosureExtension model
- Phase 9 research and context documents
- PRD-006 Disclosures Management (sections 3.6, 3.9, 7.x)

### Secondary (MEDIUM confidence)

- [Open Exchange Rates API](https://openexchangerates.org/) - Currency conversion
- [Fixer.io Documentation](https://fixer.io/documentation) - Alternative currency API
- [NCSL Legislator Gift Restrictions](https://www.ncsl.org/ethics/legislator-gift-restrictions) - US state thresholds
- [GAN Integrity GT&E Software](https://www.ganintegrity.com/products/gifts-and-entertainment/) - Industry patterns

### Tertiary (LOW confidence)

- General compliance software patterns from web search
- FCPA guidance from university resources (general principles)

## Metadata

**Confidence breakdown:**

- ExternalParty entity: HIGH - Clear requirements from PRD, follows existing patterns
- GT&E aggregation: HIGH - Extends existing ThresholdService
- Currency conversion: MEDIUM - API integration standard, but rate caching strategy may need tuning
- Location rules: MEDIUM - Concept clear, but state-by-state threshold data needs sourcing
- External party matching: MEDIUM - fuse.js approach standard, but threshold tuning needed

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (30 days - stable domain, API integrations may change)
