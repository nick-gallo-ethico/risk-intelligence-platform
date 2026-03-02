/**
 * Phase 42 Demo Data Seeder - Anonymous Communication Relay
 *
 * Seeds Acme Co. with Phase 42 specific data:
 * - Relay settings configuration for the organization
 * - Sample relay messages on existing cases with reporters
 * - Various conversation states (active, closed, awaiting response)
 *
 * Usage:
 *   npx ts-node prisma/seeders/acme-phase-42.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import {
  PrismaClient,
  MessageDirection,
  MessageSenderType,
  MessageDeliveryStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// ===========================================
// Helper Functions
// ===========================================

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function subHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() - hours);
  return result;
}

// ===========================================
// Types
// ===========================================

interface AcmeContext {
  organizationId: string;
  investigatorId: string;
  ccoUserId: string | null;
}

interface ThreadMessage {
  direction: MessageDirection;
  content: string;
  daysAgo: number;
  hoursAgo?: number;
  isRead: boolean;
}

// ===========================================
// Seeder Functions
// ===========================================

async function configureRelaySettings(ctx: AcmeContext): Promise<void> {
  console.log("\n1. Configuring Acme Relay Settings...");

  // Get current organization settings
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { settings: true },
  });

  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: {
      settings: {
        ...((org?.settings as object) || {}),
        reporterVisibilityLevel: "STANDARD",
        enableMessaging: true,
        autoNotifyOnMessage: true,
        notificationDelayMinHours: 1,
        notificationDelayMaxHours: 6,
      },
    },
  });

  console.log("  - Configured relay settings:");
  console.log("    * Visibility level: STANDARD");
  console.log("    * Messaging: Enabled");
  console.log("    * Auto-notify: Enabled");
  console.log("    * Notification delay: 1-6 hours");
}

async function createRelayMessages(ctx: AcmeContext): Promise<number> {
  console.log("\n2. Creating Relay Message Threads...");
  let messagesCreated = 0;
  const now = new Date();

  // Check for existing relay demo messages (idempotency)
  const existingMessages = await prisma.caseMessage.findMany({
    where: {
      organizationId: ctx.organizationId,
      content: { startsWith: "[DEMO]" },
    },
    select: { caseId: true },
  });

  const casesWithDemoMessages = new Set(existingMessages.map((m) => m.caseId));

  // Find cases with linked RIUs that have reporter email
  const casesWithReporter = await prisma.case.findMany({
    where: {
      organizationId: ctx.organizationId,
      id: { notIn: Array.from(casesWithDemoMessages) },
      riuAssociations: {
        some: {
          riu: {
            reporterEmail: { not: null },
          },
        },
      },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  if (casesWithReporter.length === 0) {
    console.log(
      "  - No eligible cases found for relay messages (all have demo data or no reporter email)",
    );
    return 0;
  }

  // Thread patterns representing different conversation states
  const threadPatterns: ThreadMessage[][] = [
    // Pattern 1: Active conversation with unread investigator message
    [
      {
        direction: MessageDirection.OUTBOUND,
        content:
          "[DEMO] Thank you for reporting this concern. We take all reports seriously and have begun our investigation. Can you provide more details about the date this incident occurred?",
        daysAgo: 5,
        isRead: true,
      },
      {
        direction: MessageDirection.INBOUND,
        content:
          "[DEMO] It happened on January 15th around 2pm in the main conference room. There were several people present.",
        daysAgo: 4,
        isRead: true,
      },
      {
        direction: MessageDirection.OUTBOUND,
        content:
          "[DEMO] Thank you for the additional information. Were there any witnesses who might be willing to provide a statement?",
        daysAgo: 2,
        isRead: false,
      },
    ],
    // Pattern 2: Closed conversation with full resolution
    [
      {
        direction: MessageDirection.OUTBOUND,
        content:
          "[DEMO] We have reviewed your report and completed our investigation. Thank you for bringing this to our attention.",
        daysAgo: 30,
        isRead: true,
      },
      {
        direction: MessageDirection.INBOUND,
        content:
          "[DEMO] Thank you for looking into this. I appreciate the follow-up and the thorough investigation.",
        daysAgo: 29,
        isRead: true,
      },
      {
        direction: MessageDirection.OUTBOUND,
        content:
          "[DEMO] You are welcome. Your report helped us identify and address an important issue. If you have any other concerns in the future, please do not hesitate to reach out.",
        daysAgo: 28,
        isRead: true,
      },
    ],
    // Pattern 3: Awaiting reporter response
    [
      {
        direction: MessageDirection.INBOUND,
        content:
          "[DEMO] I wanted to follow up on my report. Has there been any progress with the investigation?",
        daysAgo: 3,
        isRead: true,
      },
      {
        direction: MessageDirection.OUTBOUND,
        content:
          "[DEMO] Thank you for following up. Our investigation is ongoing and we have made significant progress. We expect to have an update for you within the next week. Is there anything else you can share that might help us?",
        daysAgo: 2,
        isRead: true,
      },
    ],
    // Pattern 4: Recent exchange with quick responses
    [
      {
        direction: MessageDirection.OUTBOUND,
        content:
          "[DEMO] We have reviewed your submission and have a few clarifying questions. Could you describe the location where this occurred?",
        daysAgo: 1,
        hoursAgo: 18,
        isRead: true,
      },
      {
        direction: MessageDirection.INBOUND,
        content:
          "[DEMO] It happened in the east wing of Building A, near the break room on the 3rd floor.",
        daysAgo: 1,
        hoursAgo: 12,
        isRead: true,
      },
      {
        direction: MessageDirection.OUTBOUND,
        content:
          "[DEMO] Thank you for clarifying. We will review the security footage from that area. Were there any other witnesses present?",
        daysAgo: 0,
        hoursAgo: 6,
        isRead: false,
      },
    ],
    // Pattern 5: Single outreach, no response yet
    [
      {
        direction: MessageDirection.OUTBOUND,
        content:
          "[DEMO] Thank you for submitting this report. To help with our investigation, could you provide any supporting documentation or additional context about what you observed?",
        daysAgo: 1,
        isRead: false,
      },
    ],
  ];

  for (let i = 0; i < casesWithReporter.length; i++) {
    const caseRecord = casesWithReporter[i];
    const pattern = threadPatterns[i % threadPatterns.length];

    for (const msg of pattern) {
      let createdAt: Date;
      if (msg.hoursAgo !== undefined) {
        createdAt = subHours(now, msg.hoursAgo + msg.daysAgo * 24);
      } else {
        createdAt = subDays(now, msg.daysAgo);
      }

      await prisma.caseMessage.create({
        data: {
          organizationId: ctx.organizationId,
          caseId: caseRecord.id,
          direction: msg.direction,
          senderType:
            msg.direction === MessageDirection.OUTBOUND
              ? MessageSenderType.INVESTIGATOR
              : MessageSenderType.REPORTER,
          content: msg.content,
          isRead: msg.isRead,
          readAt: msg.isRead
            ? new Date(createdAt.getTime() + 60 * 60 * 1000) // 1 hour after creation
            : null,
          readById:
            msg.isRead && msg.direction === MessageDirection.INBOUND
              ? ctx.investigatorId
              : null,
          createdById:
            msg.direction === MessageDirection.OUTBOUND
              ? ctx.investigatorId
              : null,
          deliveryStatus:
            msg.direction === MessageDirection.OUTBOUND
              ? MessageDeliveryStatus.DELIVERED
              : null,
          deliveredAt:
            msg.direction === MessageDirection.OUTBOUND
              ? new Date(createdAt.getTime() + 5 * 60 * 1000) // 5 min after creation
              : null,
          createdAt,
        },
      });
      messagesCreated++;
    }

    console.log(
      `  + Created ${pattern.length} messages on case ${caseRecord.referenceNumber}`,
    );
  }

  return messagesCreated;
}

// ===========================================
// Main Seeder
// ===========================================

/**
 * Main seeder function for Phase 42 Acme Co. demo data.
 * Creates relay settings and sample message threads.
 */
export async function seedAcmePhase42(): Promise<void> {
  console.log("\n========================================");
  console.log("ACME PHASE 42 SEED - Anonymous Communication Relay");
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

  // Get investigator user for message attribution
  const investigator = await prisma.user.findFirst({
    where: {
      organizationId: acmeOrg.id,
      OR: [
        { email: "demo-investigator@acme.local" },
        { role: "INVESTIGATOR" },
        { role: "COMPLIANCE_OFFICER" },
      ],
    },
  });

  if (!investigator) {
    console.error("ERROR: No investigator user found.");
    return;
  }

  console.log(`Investigator: ${investigator.email}`);

  // Get CCO user
  const ccoUser = await prisma.user.findFirst({
    where: {
      organizationId: acmeOrg.id,
      email: "demo-cco@acme.local",
    },
  });

  if (ccoUser) {
    console.log(`CCO User: ${ccoUser.email}`);
  }

  // Build context
  const ctx: AcmeContext = {
    organizationId: acmeOrg.id,
    investigatorId: investigator.id,
    ccoUserId: ccoUser?.id || null,
  };

  // 1. Configure relay settings
  await configureRelaySettings(ctx);

  // 2. Create message threads
  const messagesCreated = await createRelayMessages(ctx);

  // Summary
  console.log("\n========================================");
  console.log("ACME PHASE 42 SEED COMPLETE");
  console.log("========================================");
  console.log(`\nSummary:`);
  console.log(`  - Relay Settings: Configured`);
  console.log(`  - Messages created: ${messagesCreated}`);
  console.log("\nRelay Configuration:");
  console.log("  Visibility Level: STANDARD");
  console.log("  Messaging: Enabled");
  console.log("  Auto-notify: Enabled");
  console.log("  Notification Delay: 1-6 hours (random)");
  console.log("\nMessage Threads:");
  console.log(
    "  Pattern 1: Active conversation (3 messages, 1 unread investigator)",
  );
  console.log("  Pattern 2: Closed conversation (3 messages, all read)");
  console.log("  Pattern 3: Awaiting reporter response (2 messages)");
  console.log("  Pattern 4: Recent quick exchange (3 messages)");
  console.log("  Pattern 5: Single outreach, no response (1 message)");
  console.log("========================================\n");
}

// Run if executed directly
if (require.main === module) {
  seedAcmePhase42()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
