/**
 * Phase 43 Demo Data Seeder - RAG Infrastructure
 *
 * Seeds Acme Co. with Phase 43 specific data:
 * - Knowledge base documents for RAG system testing
 * - Documents marked as EMBEDDED with mock chunk counts
 *
 * Uses deterministic IDs for idempotency (upsert pattern).
 *
 * Usage:
 *   npx ts-node prisma/seeders/acme-phase-43.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ===========================================
// Deterministic ID Generation
// ===========================================

/**
 * Generate a deterministic UUID v5-like ID from a namespace and seed string.
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
  return `00000043-rag0-4000-8000-${hex.padStart(12, "0")}`;
}

// ===========================================
// Types
// ===========================================

interface AcmeContext {
  organizationId: string;
  ccoUserId: string;
}

interface KnowledgeBaseDocumentData {
  id: string;
  title: string;
  description: string;
  category: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  content: string; // For display/reference, not stored
  chunkCount: number;
}

// ===========================================
// Knowledge Base Documents
// ===========================================

const KNOWLEDGE_BASE_DOCUMENTS: Omit<KnowledgeBaseDocumentData, "id">[] = [
  {
    title: "Code of Ethics and Business Conduct",
    description:
      "Comprehensive guide to ethical behavior and business conduct standards for all employees. Covers conflicts of interest, gifts and entertainment, confidentiality, and reporting responsibilities.",
    category: "Compliance Training",
    fileName: "code-of-ethics-guide.pdf",
    fileType: "application/pdf",
    fileSize: 524288, // 512 KB
    content: `# Code of Ethics and Business Conduct

## Introduction
This Code of Ethics establishes the standards of conduct expected of all employees, officers, and directors of Acme Corporation.

## Core Values
- Integrity in all dealings
- Respect for individuals
- Commitment to compliance
- Accountability for actions

## Conflict of Interest
Employees must avoid situations where personal interests conflict with company interests. All potential conflicts must be disclosed to the Compliance Department.

## Gifts and Entertainment
Business courtesies must be reasonable, infrequent, and not intended to influence business decisions. Employees may not accept gifts valued over $100.

## Confidentiality
Proprietary information must be protected. Sharing confidential information externally is prohibited without authorization.

## Reporting Concerns
Employees are encouraged to report suspected violations through the Ethics Hotline or directly to the Compliance Department.`,
    chunkCount: 12,
  },
  {
    title: "Anti-Harassment Policy FAQ",
    description:
      "Frequently asked questions about the company's anti-harassment policy, including definitions, examples, and reporting procedures.",
    category: "Policy FAQ",
    fileName: "anti-harassment-faq.md",
    fileType: "text/markdown",
    fileSize: 45056, // 44 KB
    content: `# Anti-Harassment Policy FAQ

## What constitutes harassment?
Harassment includes any unwelcome conduct based on protected characteristics that creates a hostile work environment or results in adverse employment action.

## What are protected characteristics?
Race, color, religion, sex, national origin, age, disability, genetic information, sexual orientation, and gender identity.

## How do I report harassment?
You may report through your supervisor, HR, the Ethics Hotline, or directly to the Compliance Department. Reports can be made anonymously.

## What happens after I report?
All reports are investigated promptly and confidentially. Retaliation against reporters is strictly prohibited.

## What are the consequences of harassment?
Substantiated harassment may result in disciplinary action up to and including termination.`,
    chunkCount: 8,
  },
  {
    title: "Compliance Training Requirements",
    description:
      "Overview of mandatory compliance training courses, deadlines, and completion tracking for all employee levels.",
    category: "Compliance Training",
    fileName: "training-requirements.pdf",
    fileType: "application/pdf",
    fileSize: 102400, // 100 KB
    content: `# Compliance Training Requirements

## Annual Required Training
All employees must complete the following training annually:
1. Code of Ethics and Business Conduct
2. Information Security Awareness
3. Anti-Harassment Prevention
4. Data Privacy Fundamentals

## Role-Specific Training
- Managers: Leadership Ethics, Workplace Investigations
- Finance: Anti-Money Laundering, Financial Controls
- Healthcare: HIPAA Compliance, Patient Privacy
- Sales: Anti-Bribery, Fair Competition

## Completion Deadlines
- New hires: Within 30 days of start date
- Annual refresh: By December 31st each year
- Role-specific: Within 60 days of role change

## Non-Compliance
Failure to complete required training may result in access restrictions and disciplinary action.`,
    chunkCount: 10,
  },
  {
    title: "Whistleblower Protection Guidelines",
    description:
      "Information about legal protections for employees who report violations, retaliation prevention, and support resources.",
    category: "Policy Guide",
    fileName: "whistleblower-protection.pdf",
    fileType: "application/pdf",
    fileSize: 81920, // 80 KB
    content: `# Whistleblower Protection Guidelines

## Legal Protections
Federal and state laws protect employees who report suspected violations in good faith. These protections apply regardless of whether the report is ultimately substantiated.

## What is Protected Activity?
- Reporting violations to the company
- Reporting violations to government agencies
- Participating in investigations
- Refusing to participate in illegal activity

## What is Retaliation?
Retaliation includes termination, demotion, harassment, reduction in pay, or any adverse action taken because of protected activity.

## Reporting Retaliation
If you believe you have experienced retaliation, report immediately to:
- The Ethics Hotline (anonymous)
- The Chief Compliance Officer
- Human Resources
- Legal Department

## Support Resources
Employees who report concerns in good faith will receive support including confidentiality protections and access to employee assistance programs.`,
    chunkCount: 9,
  },
  {
    title: "Data Privacy Compliance Guide",
    description:
      "Practical guidance on handling personal data, GDPR requirements, CCPA compliance, and data subject rights.",
    category: "Compliance Training",
    fileName: "data-privacy-guide.pdf",
    fileType: "application/pdf",
    fileSize: 153600, // 150 KB
    content: `# Data Privacy Compliance Guide

## Overview
This guide provides practical guidance on handling personal data in compliance with global privacy regulations including GDPR and CCPA.

## What is Personal Data?
Personal data is any information that can identify an individual, including:
- Name, email, phone number
- Employee ID, social security number
- IP address, location data
- Health information
- Financial information

## Key Privacy Principles
1. Lawfulness: Process data only with legal basis
2. Purpose limitation: Use data only for stated purposes
3. Data minimization: Collect only necessary data
4. Accuracy: Keep data accurate and up to date
5. Storage limitation: Delete data when no longer needed
6. Security: Protect data from unauthorized access

## Data Subject Rights
Individuals have the right to:
- Access their personal data
- Correct inaccurate data
- Request deletion
- Restrict processing
- Data portability
- Object to processing

## Breach Reporting
Data breaches must be reported to the Data Privacy Officer within 24 hours of discovery. Regulatory notification may be required within 72 hours.

## Training and Awareness
All employees handling personal data must complete annual privacy training and acknowledge the Data Privacy Policy.`,
    chunkCount: 15,
  },
];

// ===========================================
// Seeder Functions
// ===========================================

async function seedKnowledgeBaseDocuments(ctx: AcmeContext): Promise<number> {
  console.log("\n1. Seeding Knowledge Base Documents...");
  let documentsCreated = 0;

  for (const doc of KNOWLEDGE_BASE_DOCUMENTS) {
    const docId = deterministicId("kb-doc", doc.title);

    // Upsert pattern for idempotency
    await prisma.knowledgeBaseDocument.upsert({
      where: { id: docId },
      create: {
        id: docId,
        organizationId: ctx.organizationId,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        storagePath: `knowledge-base/${ctx.organizationId}/${docId}/${doc.fileName}`,
        status: "EMBEDDED",
        chunkCount: doc.chunkCount,
        createdById: ctx.ccoUserId,
      },
      update: {
        title: doc.title,
        description: doc.description,
        category: doc.category,
        status: "EMBEDDED",
        chunkCount: doc.chunkCount,
      },
    });

    documentsCreated++;
    console.log(`  + ${doc.title} (${doc.chunkCount} chunks)`);
  }

  return documentsCreated;
}

// ===========================================
// Main Seeder
// ===========================================

/**
 * Main seeder function for Phase 43 Acme Co. demo data.
 * Creates knowledge base documents for RAG system testing.
 */
export async function seedAcmePhase43(): Promise<void> {
  console.log("\n========================================");
  console.log("ACME PHASE 43 SEED - RAG Infrastructure");
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

  // Get CCO user for document ownership
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

  // Seed knowledge base documents
  const documentsCreated = await seedKnowledgeBaseDocuments(ctx);

  // Summary
  console.log("\n========================================");
  console.log("ACME PHASE 43 SEED COMPLETE");
  console.log("========================================");
  console.log(`\nSummary:`);
  console.log(`  - Knowledge Base Documents: ${documentsCreated}`);
  console.log("\nDocument Categories:");
  console.log("  - Compliance Training: 3 documents");
  console.log("  - Policy FAQ: 1 document");
  console.log("  - Policy Guide: 1 document");
  console.log(
    "\nNote: Documents are marked as EMBEDDED with mock chunk counts.",
  );
  console.log(
    "Actual embeddings would be created by the embedding service on upload.",
  );
  console.log("========================================\n");
}

// Run if executed directly
if (require.main === module) {
  seedAcmePhase43()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
