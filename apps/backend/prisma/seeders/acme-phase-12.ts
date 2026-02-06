/**
 * Phase 12 Demo Data Seeder - Internal Operations Portal
 *
 * Seeds Acme Co. with Phase 12 specific data:
 * - Internal users (support, implementation, hotline, CSM)
 * - Historical impersonation sessions
 * - Implementation project with tasks and blockers
 * - 30-day health score history
 * - Feature adoption records
 * - Certification tracks and courses
 * - Go-live gates with mixed pass/pending status
 * - Peer benchmark aggregates
 *
 * Usage:
 *   npx ts-node prisma/seeders/acme-phase-12.ts
 *
 * Or via seed orchestrator:
 *   npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ===========================================
// Helper Functions
// ===========================================

function generateUUID(): string {
  return crypto.randomUUID();
}

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function subMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

// ===========================================
// Main Seeder
// ===========================================

/**
 * Main seeder function for Phase 12 Acme Co. demo data.
 * Cumulative - adds to existing Acme data.
 */
export async function seedAcmePhase12(): Promise<void> {
  console.log('\n========================================');
  console.log('ACME PHASE 12 SEED - Internal Operations Portal');
  console.log('========================================\n');

  // Initialize faker for reproducibility
  faker.seed(20260212);

  const now = new Date();

  // Get Acme organization
  const acmeOrg = await prisma.organization.findFirst({
    where: {
      OR: [{ slug: 'acme-corp' }, { name: { contains: 'Acme' } }],
    },
  });

  if (!acmeOrg) {
    console.error('ERROR: Acme organization not found. Run base seed first.');
    return;
  }

  console.log(`Found Acme organization: ${acmeOrg.name} (${acmeOrg.id})`);

  // =====================================
  // 1. Internal Users
  // =====================================
  console.log('\n1. Creating Internal Users...');

  const internalUserData = [
    {
      email: 'sarah.support@ethico.com',
      name: 'Sarah Support',
      role: 'SUPPORT_L2' as const,
    },
    {
      email: 'ian.implementation@ethico.com',
      name: 'Ian Implementation',
      role: 'IMPLEMENTATION' as const,
    },
    {
      email: 'holly.hotline@ethico.com',
      name: 'Holly Hotline',
      role: 'HOTLINE_OPS' as const,
    },
    {
      email: 'chris.csm@ethico.com',
      name: 'Chris CSM',
      role: 'CLIENT_SUCCESS' as const,
    },
  ];

  const internalUsers: Record<string, { id: string; role: string }> = {};

  for (const userData of internalUserData) {
    const existing = await prisma.internalUser.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      console.log(`  - ${userData.name} already exists`);
      internalUsers[userData.email] = { id: existing.id, role: existing.role };
    } else {
      const user = await prisma.internalUser.create({
        data: {
          id: generateUUID(),
          ...userData,
          isActive: true,
        },
      });
      console.log(`  + Created ${userData.name}`);
      internalUsers[userData.email] = { id: user.id, role: user.role };
    }
  }

  const sarahSupport = internalUsers['sarah.support@ethico.com'];
  const ianImpl = internalUsers['ian.implementation@ethico.com'];

  // =====================================
  // 2. Impersonation Sessions (historical)
  // =====================================
  console.log('\n2. Creating Impersonation Sessions...');

  const existingSessions = await prisma.impersonationSession.count({
    where: { targetOrganizationId: acmeOrg.id },
  });

  if (existingSessions === 0) {
    const sessionData = [
      {
        reason: 'Investigating SSO login issue reported in ticket #4521',
        ticketId: '4521',
        daysAgo: 5,
      },
      {
        reason: 'Reviewing workflow configuration for case escalation',
        ticketId: null,
        daysAgo: 2,
      },
    ];

    for (const session of sessionData) {
      const startedAt = subDays(now, session.daysAgo);
      const endedAt = addHours(startedAt, 1);
      const expiresAt = addHours(startedAt, 4);

      await prisma.impersonationSession.create({
        data: {
          id: generateUUID(),
          operatorUserId: sarahSupport.id,
          operatorRole: sarahSupport.role as
            | 'SUPPORT_L1'
            | 'SUPPORT_L2'
            | 'SUPPORT_L3'
            | 'IMPLEMENTATION'
            | 'HOTLINE_OPS'
            | 'CLIENT_SUCCESS'
            | 'ADMIN',
          targetOrganizationId: acmeOrg.id,
          reason: session.reason,
          ticketId: session.ticketId,
          startedAt,
          endedAt,
          expiresAt,
          ipAddress: '10.0.0.50',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        },
      });
      console.log(`  + Created session: ${session.reason.substring(0, 40)}...`);
    }
  } else {
    console.log(`  - ${existingSessions} sessions already exist`);
  }

  // =====================================
  // 3. Implementation Project
  // =====================================
  console.log('\n3. Creating Implementation Project...');

  let implProject = await prisma.implementationProject.findFirst({
    where: { clientOrganizationId: acmeOrg.id },
  });

  if (!implProject) {
    implProject = await prisma.implementationProject.create({
      data: {
        id: generateUUID(),
        clientOrganizationId: acmeOrg.id,
        type: 'ENTERPRISE_FULL',
        status: 'IN_PROGRESS',
        currentPhase: 'CONFIGURATION',
        healthScore: 85,
        leadImplementerId: ianImpl.id,
        kickoffDate: subMonths(now, 2),
        targetGoLiveDate: addDays(now, 30),
      },
    });
    console.log('  + Created implementation project');

    // Implementation tasks
    const taskTemplates = [
      { phase: 'DISCOVERY', name: 'Kickoff meeting', isRequired: true, completed: true },
      { phase: 'DISCOVERY', name: 'Requirements gathering', isRequired: true, completed: true },
      { phase: 'DISCOVERY', name: 'Technical assessment', isRequired: true, completed: true },
      { phase: 'CONFIGURATION', name: 'SSO setup', isRequired: true, completed: true },
      { phase: 'CONFIGURATION', name: 'User provisioning', isRequired: true, completed: true },
      { phase: 'CONFIGURATION', name: 'Workflow configuration', isRequired: true, completed: false },
      { phase: 'CONFIGURATION', name: 'Category setup', isRequired: true, completed: false },
      { phase: 'DATA_MIGRATION', name: 'Data mapping', isRequired: true, completed: false },
      { phase: 'DATA_MIGRATION', name: 'Test import', isRequired: true, completed: false },
      { phase: 'DATA_MIGRATION', name: 'Production import', isRequired: true, completed: false },
      { phase: 'UAT', name: 'User acceptance testing', isRequired: true, completed: false },
      { phase: 'GO_LIVE', name: 'Go-live preparation', isRequired: true, completed: false },
      { phase: 'OPTIMIZATION', name: 'Post-launch review', isRequired: false, completed: false },
    ];

    for (let i = 0; i < taskTemplates.length; i++) {
      const task = taskTemplates[i];
      await prisma.implementationTask.create({
        data: {
          id: generateUUID(),
          projectId: implProject.id,
          phase: task.phase as
            | 'DISCOVERY'
            | 'CONFIGURATION'
            | 'DATA_MIGRATION'
            | 'UAT'
            | 'GO_LIVE'
            | 'OPTIMIZATION',
          name: task.name,
          isRequired: task.isRequired,
          status: task.completed ? 'COMPLETED' : 'PENDING',
          sortOrder: i + 1,
          completedAt: task.completed ? subDays(now, 10 - i) : null,
        },
      });
    }
    console.log(`  + Created ${taskTemplates.length} implementation tasks`);

    // Implementation blocker
    await prisma.implementationBlocker.create({
      data: {
        id: generateUUID(),
        projectId: implProject.id,
        title: 'Waiting for SSO metadata from client IT',
        description: 'Client IT team has not provided SAML metadata file. Requested on 2/3, follow-up sent 2/5.',
        category: 'CLIENT_SIDE',
        status: 'OPEN',
      },
    });
    console.log('  + Created implementation blocker');
  } else {
    console.log(`  - Implementation project already exists`);
  }

  // =====================================
  // 4. Health Scores (30-day history)
  // =====================================
  console.log('\n4. Creating Health Score History...');

  const existingScores = await prisma.tenantHealthScore.count({
    where: { organizationId: acmeOrg.id },
  });

  if (existingScores < 30) {
    // Delete existing scores and recreate
    await prisma.tenantHealthScore.deleteMany({
      where: { organizationId: acmeOrg.id },
    });

    for (let i = 30; i >= 0; i--) {
      const date = subDays(now, i);
      const baseScore = 75 + Math.floor(Math.random() * 15);

      // Calculate component scores with some variance
      const loginScore = Math.min(100, Math.max(0, baseScore + Math.floor(Math.random() * 10) - 5));
      const caseResolutionScore = Math.min(100, Math.max(0, baseScore + Math.floor(Math.random() * 10) - 5));
      const campaignCompletionScore = Math.min(100, Math.max(0, baseScore + Math.floor(Math.random() * 10) - 5));
      const featureAdoptionScore = Math.min(100, Math.max(0, baseScore + Math.floor(Math.random() * 10) - 5));
      const supportTicketScore = 100 - Math.floor(Math.random() * 20);

      // Determine trend based on previous day
      let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
      if (i < 30) {
        const delta = (Math.random() - 0.5) * 10;
        if (delta > 5) trend = 'IMPROVING';
        else if (delta < -5) trend = 'DECLINING';
      }

      // Determine risk level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (baseScore < 40) riskLevel = 'HIGH';
      else if (baseScore < 70 || trend === 'DECLINING') riskLevel = 'MEDIUM';

      await prisma.tenantHealthScore.create({
        data: {
          id: generateUUID(),
          organizationId: acmeOrg.id,
          loginScore,
          caseResolutionScore,
          campaignCompletionScore,
          featureAdoptionScore,
          supportTicketScore,
          overallScore: baseScore,
          trend,
          riskLevel,
          alertLevel: 'PROACTIVE',
          calculatedAt: date,
        },
      });
    }
    console.log('  + Created 31 days of health score history');
  } else {
    console.log(`  - ${existingScores} health scores already exist`);
  }

  // =====================================
  // 5. Feature Adoption
  // =====================================
  console.log('\n5. Creating Feature Adoption Records...');

  const features = [
    { key: 'case_management', adopted: true },
    { key: 'workflows', adopted: true },
    { key: 'campaigns', adopted: true },
    { key: 'policies', adopted: true },
    { key: 'ai_summaries', adopted: true },
    { key: 'ai_categorization', adopted: false },
    { key: 'custom_dashboards', adopted: false },
    { key: 'hris_sync', adopted: true },
    { key: 'sso', adopted: true },
    { key: 'board_reports', adopted: false },
    { key: 'flat_export', adopted: true },
  ];

  for (const feature of features) {
    const existing = await prisma.featureAdoption.findUnique({
      where: {
        organizationId_featureKey: {
          organizationId: acmeOrg.id,
          featureKey: feature.key,
        },
      },
    });

    if (!existing && feature.adopted) {
      const firstUsedAt = subMonths(now, Math.floor(Math.random() * 6) + 1);
      const lastUsedAt = subDays(now, Math.floor(Math.random() * 7));

      await prisma.featureAdoption.create({
        data: {
          id: generateUUID(),
          organizationId: acmeOrg.id,
          featureKey: feature.key,
          firstUsedAt,
          lastUsedAt,
          usageCount: Math.floor(Math.random() * 100) + 10,
        },
      });
      console.log(`  + Created adoption record for ${feature.key}`);
    }
  }

  // =====================================
  // 6. Certification Tracks and Courses
  // =====================================
  console.log('\n6. Creating Certification Tracks...');

  // Check if tracks exist
  const existingTracks = await prisma.certificationTrack.count();

  if (existingTracks === 0) {
    // Platform Fundamentals Track
    const fundamentalsTrack = await prisma.certificationTrack.create({
      data: {
        id: generateUUID(),
        name: 'Platform Fundamentals',
        slug: 'platform-fundamentals',
        description: 'Core knowledge required for all Ethico users',
        type: 'PLATFORM_FUNDAMENTALS',
        level: 'FOUNDATION',
        isRequired: true,
        estimatedMinutes: 120,
        sortOrder: 1,
      },
    });
    console.log('  + Created Platform Fundamentals track');

    // Courses for fundamentals
    const fundamentalsCourses = [
      { title: 'Introduction to Ethico', minutes: 15, type: 'VIDEO' as const },
      { title: 'Navigating the Dashboard', minutes: 20, type: 'VIDEO' as const },
      { title: 'Case Management Basics', minutes: 30, type: 'VIDEO' as const },
      { title: 'Campaign Management', minutes: 25, type: 'VIDEO' as const },
      { title: 'Reports and Analytics', minutes: 20, type: 'VIDEO' as const },
    ];

    for (let i = 0; i < fundamentalsCourses.length; i++) {
      const course = fundamentalsCourses[i];
      await prisma.course.create({
        data: {
          id: generateUUID(),
          trackId: fundamentalsTrack.id,
          title: course.title,
          type: course.type,
          estimatedMinutes: course.minutes,
          sortOrder: i + 1,
        },
      });
    }
    console.log(`  + Created ${fundamentalsCourses.length} courses for Platform Fundamentals`);

    // Investigator Track
    const investigatorTrack = await prisma.certificationTrack.create({
      data: {
        id: generateUUID(),
        name: 'Investigator Certification',
        slug: 'investigator-certification',
        description: 'Advanced training for investigation leads',
        type: 'CASE_MANAGEMENT',
        level: 'INTERMEDIATE',
        isRequired: false,
        estimatedMinutes: 240,
        sortOrder: 2,
      },
    });
    console.log('  + Created Investigator Certification track');

    // Courses for investigator track
    const investigatorCourses = [
      { title: 'Investigation Methodology', minutes: 45, type: 'VIDEO' as const },
      { title: 'Interview Techniques', minutes: 60, type: 'VIDEO' as const },
      { title: 'Evidence Collection', minutes: 45, type: 'VIDEO' as const },
      { title: 'Documentation Best Practices', minutes: 30, type: 'TEXT' as const },
      { title: 'Investigation Simulation', minutes: 60, type: 'INTERACTIVE' as const },
    ];

    for (let i = 0; i < investigatorCourses.length; i++) {
      const course = investigatorCourses[i];
      await prisma.course.create({
        data: {
          id: generateUUID(),
          trackId: investigatorTrack.id,
          title: course.title,
          type: course.type,
          estimatedMinutes: course.minutes,
          sortOrder: i + 1,
        },
      });
    }
    console.log(`  + Created ${investigatorCourses.length} courses for Investigator Certification`);
  } else {
    console.log(`  - ${existingTracks} certification tracks already exist`);
  }

  // =====================================
  // 7. Go-Live Gates
  // =====================================
  console.log('\n7. Creating Go-Live Gates...');

  if (implProject) {
    const existingGates = await prisma.goLiveGate.count({
      where: { projectId: implProject.id },
    });

    if (existingGates === 0) {
      const gates = [
        { gateId: 'auth_configured', status: 'PASSED' as const },
        { gateId: 'admin_trained', status: 'PASSED' as const },
        { gateId: 'terms_signed', status: 'PASSED' as const },
        { gateId: 'contact_designated', status: 'PASSED' as const },
        { gateId: 'data_migration', status: 'PENDING' as const },
        { gateId: 'test_workflow', status: 'PASSED' as const },
        { gateId: 'users_invited', status: 'PASSED' as const },
        { gateId: 'branding_configured', status: 'PASSED' as const },
        { gateId: 'categories_configured', status: 'PENDING' as const },
        { gateId: 'hris_enabled', status: 'PASSED' as const },
        { gateId: 'first_policy', status: 'PENDING' as const },
      ];

      for (const gate of gates) {
        const checkedAt = gate.status === 'PASSED' ? subDays(now, Math.floor(Math.random() * 10) + 1) : null;
        await prisma.goLiveGate.create({
          data: {
            id: generateUUID(),
            projectId: implProject.id,
            gateId: gate.gateId,
            status: gate.status,
            checkedAt,
            checkedById: gate.status === 'PASSED' ? ianImpl.id : null,
          },
        });
      }
      console.log(`  + Created ${gates.length} go-live gates`);
    } else {
      console.log(`  - ${existingGates} go-live gates already exist`);
    }
  }

  // =====================================
  // 8. Peer Benchmarks (aggregated)
  // =====================================
  console.log('\n8. Creating Peer Benchmarks...');

  const existingBenchmarks = await prisma.peerBenchmark.count();

  if (existingBenchmarks === 0) {
    const benchmarkData = [
      {
        metricName: 'attestation_completion',
        p25: 72,
        median: 85,
        p75: 94,
        mean: 84,
        minValue: 45,
        maxValue: 100,
        peerCount: 47,
      },
      {
        metricName: 'case_resolution_days',
        p25: 45,
        median: 32,
        p75: 21,
        mean: 35,
        minValue: 5,
        maxValue: 90,
        peerCount: 47,
      },
      {
        metricName: 'policy_acknowledgment_rate',
        p25: 78,
        median: 89,
        p75: 96,
        mean: 87,
        minValue: 52,
        maxValue: 100,
        peerCount: 47,
      },
      {
        metricName: 'campaign_completion_rate',
        p25: 68,
        median: 82,
        p75: 92,
        mean: 80,
        minValue: 40,
        maxValue: 100,
        peerCount: 47,
      },
    ];

    for (const benchmark of benchmarkData) {
      await prisma.peerBenchmark.create({
        data: {
          id: generateUUID(),
          ...benchmark,
          calculatedAt: now,
        },
      });
      console.log(`  + Created benchmark: ${benchmark.metricName}`);
    }
  } else {
    console.log(`  - ${existingBenchmarks} benchmarks already exist`);
  }

  console.log('\n========================================');
  console.log('ACME PHASE 12 SEED COMPLETE');
  console.log('========================================\n');
}

// Run if executed directly
if (require.main === module) {
  seedAcmePhase12()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
