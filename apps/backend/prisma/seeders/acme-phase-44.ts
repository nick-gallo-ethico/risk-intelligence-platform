/**
 * Phase 44 Demo Data Seeder - Employee Chatbot
 *
 * Seeds Acme Co. with Phase 44 specific data:
 * - FAQ entries for chatbot priority matching (curated answers)
 * - FAQ entries cover: gifts, conflicts, ethics reporting, harassment, disclosures, vendor meals
 *
 * Uses deterministic IDs for idempotency (upsert pattern).
 *
 * Usage:
 *   npx ts-node prisma/seeders/acme-phase-44.ts
 *
 * Or via seed orchestrator:
 *   npm run seed (runs as part of full seed)
 */

import { PrismaClient, FaqStatus } from "@prisma/client";

const prisma = new PrismaClient();

// ===========================================
// Deterministic ID Generation
// ===========================================

/**
 * Generate a deterministic UUID-like ID from a namespace and seed string.
 * Uses a simple hash-based approach for reproducibility.
 */
function deterministicId(namespace: string, seed: string): string {
  const input = `${namespace}:${seed}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to UUID-like format
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `00000044-faq0-4000-8000-${hex.padStart(12, "0")}`;
}

// ===========================================
// Types
// ===========================================

interface AcmeContext {
  organizationId: string;
  ccoUserId: string;
}

interface FaqSeedData {
  question: string;
  answer: string;
  category: string;
  tags: string[];
  priority: number;
}

// ===========================================
// FAQ Entries
// ===========================================

const FAQ_ENTRIES: FaqSeedData[] = [
  {
    question: "What is the gift policy limit?",
    answer: `Our gift policy allows employees to accept gifts valued at $50 or less per occasion from vendors or clients. Gifts exceeding $50 must be declined or reported to the Compliance team.

Key points:
- Cash or cash equivalents (gift cards) are never acceptable
- Multiple gifts from the same source within a calendar year should not exceed $150 total
- Meals in a business setting are excluded from this limit
- All gifts over $25 should be disclosed in the annual disclosure form

For questions about specific situations, please contact the Compliance team.`,
    category: "gifts",
    tags: ["gifts", "limits", "vendors", "compliance"],
    priority: 10,
  },
  {
    question: "Do I need to disclose a conflict of interest?",
    answer: `Yes, all potential conflicts of interest must be disclosed. A conflict of interest exists when your personal interests could influence, or appear to influence, your professional judgment.

Common examples requiring disclosure:
- Financial interests in vendors, suppliers, or competitors
- Family members working at vendors or competitors
- Outside employment or consulting
- Board positions or advisory roles
- Personal relationships with vendors or clients

You should disclose potential conflicts through the Employee Portal > Disclosures section. If unsure whether something qualifies as a conflict, err on the side of disclosure.`,
    category: "conflict-of-interest",
    tags: ["disclosure", "conflict", "relationships", "compliance"],
    priority: 10,
  },
  {
    question: "How do I submit an ethics report?",
    answer: `You can submit an ethics report through several channels:

1. **Ethics Portal** (anonymous option available):
   Visit our Ethics Portal at ethics.acme-corp.com

2. **Ethics Hotline**:
   Call 1-800-ETHICS (1-800-384-4278), available 24/7

3. **Direct Report**:
   Contact your supervisor or any member of the Compliance team

4. **Email**:
   Send to ethics@acme-corp.com

Reports can be submitted anonymously. All reports are taken seriously and investigated thoroughly. Retaliation against reporters is strictly prohibited and will result in disciplinary action.`,
    category: "ethics-reporting",
    tags: ["report", "hotline", "anonymous", "ethics"],
    priority: 10,
  },
  {
    question: "What is our anti-harassment policy?",
    answer: `Acme Corporation has a zero-tolerance policy for harassment of any kind. This includes:

- Sexual harassment
- Harassment based on race, color, religion, sex, national origin, age, disability, or any protected characteristic
- Bullying or intimidation
- Hostile work environment behaviors

If you experience or witness harassment:
1. Report it immediately through any ethics reporting channel
2. Document the incident (dates, times, witnesses)
3. Know that retaliation is prohibited

All harassment complaints are investigated promptly and confidentially. Violations may result in disciplinary action up to and including termination.`,
    category: "harassment",
    tags: ["harassment", "policy", "workplace", "discrimination"],
    priority: 10,
  },
  {
    question: "How long do I have to complete my annual disclosure?",
    answer: `Annual disclosures must be completed within 30 days of receiving the request. You will receive email reminders at:

- 14 days before deadline
- 7 days before deadline
- 3 days before deadline
- 1 day before deadline

If you need an extension, contact the Compliance team before the deadline. Failure to complete required disclosures may result in:
- Escalation to your manager
- Restriction of certain system access
- Disciplinary action

You can access your pending disclosures at Employee Portal > Disclosures.`,
    category: "disclosure",
    tags: ["annual", "disclosure", "deadline", "attestation"],
    priority: 8,
  },
  {
    question: "Can I accept a meal from a vendor?",
    answer: `Yes, business meals with vendors are generally acceptable under our policy, with these guidelines:

Acceptable:
- Meals with legitimate business purpose
- Reasonable value (aligned with normal business dining)
- Infrequent (not routine or excessive)
- At locations appropriate for business discussions

Requires disclosure:
- Meals at high-end restaurants or entertainment venues
- Multiple meals with same vendor in short period
- Meals involving alcohol

Not acceptable:
- Lavish entertainment disguised as meals
- Meals without any business purpose
- Meals during procurement decisions

When in doubt, disclose the meal through the Employee Portal.`,
    category: "gifts",
    tags: ["meals", "vendors", "gifts", "entertainment"],
    priority: 7,
  },
];

// ===========================================
// Seeder Functions
// ===========================================

async function seedFaqEntries(ctx: AcmeContext): Promise<number> {
  console.log("\n1. Seeding FAQ Entries...");
  let faqsCreated = 0;

  for (const faq of FAQ_ENTRIES) {
    const faqId = deterministicId("faq", faq.question);

    // Upsert pattern for idempotency
    await prisma.faqEntry.upsert({
      where: { id: faqId },
      create: {
        id: faqId,
        organizationId: ctx.organizationId,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        tags: faq.tags,
        priority: faq.priority,
        status: FaqStatus.ACTIVE,
        createdById: ctx.ccoUserId,
      },
      update: {
        answer: faq.answer,
        category: faq.category,
        tags: faq.tags,
        priority: faq.priority,
        status: FaqStatus.ACTIVE,
      },
    });

    faqsCreated++;
    console.log(
      `  + FAQ: ${faq.question.substring(0, 50)}... [${faq.category}]`,
    );
  }

  return faqsCreated;
}

// ===========================================
// Main Seeder
// ===========================================

/**
 * Main seeder function for Phase 44 Acme Co. demo data.
 * Creates FAQ entries for employee chatbot priority matching.
 */
export async function seedAcmePhase44(): Promise<void> {
  console.log("\n========================================");
  console.log("ACME PHASE 44 SEED - Employee Chatbot");
  console.log("========================================");

  // Get Acme organization
  const acmeOrg = await prisma.organization.findFirst({
    where: {
      OR: [{ slug: "acme-corp" }, { name: { contains: "Acme" } }],
    },
  });

  if (!acmeOrg) {
    console.error("ERROR: Acme organization not found. Run base seed first.");
    return;
  }

  console.log(`\nOrganization: ${acmeOrg.name} (${acmeOrg.id})`);

  // Get CCO user for FAQ ownership
  const ccoUser = await prisma.user.findFirst({
    where: {
      organizationId: acmeOrg.id,
      OR: [
        { email: "demo-cco@acme.local" },
        { email: { contains: "cco" } },
        { role: "COMPLIANCE_OFFICER" },
      ],
    },
  });

  if (!ccoUser) {
    console.error("ERROR: No CCO user found. Run user seed first.");
    return;
  }

  console.log(`CCO User: ${ccoUser.email}`);

  // Build context
  const ctx: AcmeContext = {
    organizationId: acmeOrg.id,
    ccoUserId: ccoUser.id,
  };

  // Seed FAQ entries
  const faqsCreated = await seedFaqEntries(ctx);

  // Summary
  console.log("\n========================================");
  console.log("ACME PHASE 44 SEED COMPLETE");
  console.log("========================================");
  console.log(`\nSummary:`);
  console.log(`  - FAQ Entries: ${faqsCreated}`);
  console.log("\nFAQ Categories:");
  const categories = Array.from(new Set(FAQ_ENTRIES.map((f) => f.category)));
  for (const cat of categories) {
    const count = FAQ_ENTRIES.filter((f) => f.category === cat).length;
    console.log(`  - ${cat}: ${count} entries`);
  }
  console.log("\nNote: FAQ entries are marked as ACTIVE and will be matched");
  console.log("by the chatbot before falling back to RAG search.");
  console.log("========================================\n");
}

// Run if executed directly
if (require.main === module) {
  seedAcmePhase44()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
