/**
 * Demo Environment Verification Script
 *
 * Validates that the Acme Co. demo environment is properly populated
 * and "lived-in" with realistic data for sales demonstrations.
 *
 * Usage:
 *   npx ts-node prisma/seeders/verify-demo-data.ts
 */

import { PrismaClient, PolicyStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationResult {
  category: string;
  check: string;
  status: 'pass' | 'warn' | 'fail';
  expected: string;
  actual: string;
  notes?: string;
}

const results: VerificationResult[] = [];

function check(
  category: string,
  checkName: string,
  expected: string,
  actual: string | number,
  status: 'pass' | 'warn' | 'fail',
  notes?: string,
) {
  results.push({
    category,
    check: checkName,
    status,
    expected,
    actual: String(actual),
    notes,
  });
}

async function verifyOrganization() {
  console.log('\n📋 Verifying Organization...');

  const org = await prisma.organization.findUnique({
    where: { slug: 'acme-corp' },
  });

  if (!org) {
    check('Organization', 'Acme Corp exists', 'exists', 'not found', 'fail');
    return null;
  }

  check('Organization', 'Acme Corp exists', 'exists', org.name, 'pass');
  return org.id;
}

async function verifyDemoUsers(orgId: string) {
  console.log('\n👥 Verifying Demo Users...');

  const expectedUsers = [
    { email: 'demo-admin@acme.local', role: 'SYSTEM_ADMIN' },
    { email: 'demo-cco@acme.local', role: 'COMPLIANCE_OFFICER' },
    { email: 'demo-triage@acme.local', role: 'TRIAGE_LEAD' },
    { email: 'demo-investigator@acme.local', role: 'INVESTIGATOR' },
    { email: 'demo-investigator2@acme.local', role: 'INVESTIGATOR' },
    { email: 'demo-policy@acme.local', role: 'POLICY_AUTHOR' },
    { email: 'demo-reviewer@acme.local', role: 'POLICY_REVIEWER' },
    { email: 'demo-manager@acme.local', role: 'MANAGER' },
    { email: 'demo-employee@acme.local', role: 'EMPLOYEE' },
  ];

  const users = await prisma.user.findMany({
    where: { organizationId: orgId, email: { in: expectedUsers.map((u) => u.email) } },
    select: { email: true, role: true },
  });

  const userCount = users.length;
  const status = userCount === expectedUsers.length ? 'pass' : userCount >= 5 ? 'warn' : 'fail';
  check('Demo Users', 'Demo user accounts', `${expectedUsers.length} users`, userCount, status);

  for (const expected of expectedUsers) {
    const found = users.find((u) => u.email === expected.email);
    if (found) {
      const roleMatch = found.role === expected.role;
      check(
        'Demo Users',
        `${expected.email}`,
        expected.role,
        found.role,
        roleMatch ? 'pass' : 'warn',
      );
    } else {
      check('Demo Users', `${expected.email}`, expected.role, 'not found', 'fail');
    }
  }
}

async function verifyEmployees(orgId: string) {
  console.log('\n👔 Verifying Employees...');

  const employeeCount = await prisma.employee.count({ where: { organizationId: orgId } });
  const status = employeeCount >= 15000 ? 'pass' : employeeCount >= 5000 ? 'warn' : 'fail';
  check('Employees', 'Total employees', '~20,000', employeeCount, status);

  // Check for executives
  const executives = await prisma.employee.count({
    where: { organizationId: orgId, jobLevel: 'C_SUITE' },
  });
  check('Employees', 'C-Suite executives', '>5', executives, executives > 5 ? 'pass' : 'warn');

  // Check for managers
  const managers = await prisma.employee.count({
    where: { organizationId: orgId, jobLevel: { in: ['MANAGER', 'DIRECTOR', 'VP'] } },
  });
  check('Employees', 'Managers/Directors/VPs', '>500', managers, managers > 500 ? 'pass' : 'warn');
}

async function verifyLocations(orgId: string) {
  console.log('\n🌍 Verifying Locations...');

  const locations = await prisma.location.findMany({
    where: { organizationId: orgId },
    select: { region: true },
  });

  const total = locations.length;
  const usCount = locations.filter((l) => l.region === 'US' || l.region?.startsWith('US')).length;
  const emeaCount = locations.filter((l) => l.region === 'EMEA').length;
  const apacCount = locations.filter((l) => l.region === 'APAC').length;

  check('Locations', 'Total locations', '52', total, total >= 50 ? 'pass' : 'warn');
  check('Locations', 'US locations', '~25', usCount, usCount >= 20 ? 'pass' : 'warn');
  check('Locations', 'EMEA locations', '~15', emeaCount, emeaCount >= 10 ? 'pass' : 'warn');
  check('Locations', 'APAC locations', '~12', apacCount, apacCount >= 8 ? 'pass' : 'warn');
}

async function verifyCategories(orgId: string) {
  console.log('\n📂 Verifying Categories...');

  const categories = await prisma.category.count({ where: { organizationId: orgId } });
  check('Categories', 'Total categories', '~32', categories, categories >= 25 ? 'pass' : 'warn');

  // Check for parent categories
  const parentCategories = await prisma.category.count({
    where: { organizationId: orgId, parentCategoryId: null },
  });
  check(
    'Categories',
    'Parent categories',
    '~7',
    parentCategories,
    parentCategories >= 5 ? 'pass' : 'warn',
  );
}

async function verifyRIUs(orgId: string) {
  console.log('\n📝 Verifying RIUs (Risk Intelligence Units)...');

  const riuCount = await prisma.riskIntelligenceUnit.count({ where: { organizationId: orgId } });
  const status = riuCount >= 4000 ? 'pass' : riuCount >= 2000 ? 'warn' : 'fail';
  check('RIUs', 'Total RIUs', '~5,000', riuCount, status);

  // Check RIU types distribution
  const riuByType = await prisma.riskIntelligenceUnit.groupBy({
    by: ['type'],
    where: { organizationId: orgId },
    _count: true,
  });

  const hotlineCount = riuByType.find((r) => r.type === 'HOTLINE_REPORT')?._count || 0;
  const webFormCount = riuByType.find((r) => r.type === 'WEB_FORM_SUBMISSION')?._count || 0;

  check(
    'RIUs',
    'Hotline reports',
    '~55% of total',
    `${hotlineCount} (${Math.round((hotlineCount / riuCount) * 100)}%)`,
    hotlineCount > 0 ? 'pass' : 'warn',
  );
  check(
    'RIUs',
    'Web form submissions',
    '~25% of total',
    `${webFormCount} (${Math.round((webFormCount / riuCount) * 100)}%)`,
    webFormCount > 0 ? 'pass' : 'warn',
  );
}

async function verifyCases(orgId: string) {
  console.log('\n📁 Verifying Cases...');

  const totalCases = await prisma.case.count({ where: { organizationId: orgId } });
  const status = totalCases >= 4000 ? 'pass' : totalCases >= 2000 ? 'warn' : 'fail';
  check('Cases', 'Total cases', '~4,500', totalCases, status);

  const openCases = await prisma.case.count({
    where: { organizationId: orgId, status: { in: ['NEW', 'OPEN'] } },
  });
  const closedCases = await prisma.case.count({
    where: { organizationId: orgId, status: 'CLOSED' },
  });

  const openPercent = Math.round((openCases / totalCases) * 100);
  check('Cases', 'Open cases', '~10%', `${openCases} (${openPercent}%)`, openPercent < 20 ? 'pass' : 'warn');
  check('Cases', 'Closed cases', '~90%', closedCases, closedCases > openCases * 5 ? 'pass' : 'warn');

  // Check for recent cases
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 30);
  const recentCases = await prisma.case.count({
    where: { organizationId: orgId, createdAt: { gte: recentDate } },
  });
  check('Cases', 'Cases in last 30 days', '>0', recentCases, recentCases > 0 ? 'pass' : 'warn');
}

async function verifyInvestigations(orgId: string) {
  console.log('\n🔍 Verifying Investigations...');

  const total = await prisma.investigation.count({ where: { organizationId: orgId } });
  const status = total >= 4000 ? 'pass' : total >= 2000 ? 'warn' : 'fail';
  check('Investigations', 'Total investigations', '~5,000', total, status);

  const substantiated = await prisma.investigation.count({
    where: { organizationId: orgId, outcome: 'SUBSTANTIATED' },
  });
  const substantiationRate = Math.round((substantiated / total) * 100);
  check(
    'Investigations',
    'Substantiation rate',
    '~60%',
    `${substantiationRate}%`,
    substantiationRate >= 50 && substantiationRate <= 70 ? 'pass' : 'warn',
  );
}

async function verifyPolicies(orgId: string) {
  console.log('\n📜 Verifying Policies...');

  const totalPolicies = await prisma.policy.count({ where: { organizationId: orgId } });
  const status = totalPolicies >= 40 ? 'pass' : totalPolicies >= 20 ? 'warn' : 'fail';
  check('Policies', 'Total policies', '~50', totalPolicies, status);

  const publishedPolicies = await prisma.policy.count({
    where: { organizationId: orgId, status: PolicyStatus.PUBLISHED },
  });
  check(
    'Policies',
    'Published policies',
    '>40',
    publishedPolicies,
    publishedPolicies >= 40 ? 'pass' : publishedPolicies >= 20 ? 'warn' : 'fail',
  );

  // Check for translations
  const translations = await prisma.policyVersionTranslation.count({
    where: { organizationId: orgId },
  });
  check(
    'Policies',
    'Translations',
    '>50',
    translations,
    translations >= 50 ? 'pass' : translations >= 20 ? 'warn' : 'fail',
  );

  // Check language coverage
  const languages = await prisma.policyVersionTranslation.groupBy({
    by: ['languageCode'],
    where: { organizationId: orgId },
    _count: true,
  });
  check(
    'Policies',
    'Languages with translations',
    '5 (ES, FR, DE, PT, ZH)',
    `${languages.length} languages`,
    languages.length >= 4 ? 'pass' : 'warn',
  );
}

async function verifyCampaigns(orgId: string) {
  console.log('\n📢 Verifying Campaigns...');

  const totalCampaigns = await prisma.campaign.count({ where: { organizationId: orgId } });
  const status = totalCampaigns >= 10 ? 'pass' : totalCampaigns >= 3 ? 'warn' : 'fail';
  check('Campaigns', 'Total campaigns', '~20', totalCampaigns, status);

  // Check for disclosure campaigns
  const disclosureCampaigns = await prisma.campaign.count({
    where: { organizationId: orgId, type: 'DISCLOSURE' },
  });
  check('Campaigns', 'Disclosure campaigns', '>3', disclosureCampaigns, disclosureCampaigns >= 3 ? 'pass' : 'warn');

  // Check for campaign assignments
  const assignments = await prisma.campaignAssignment.count({
    where: { organizationId: orgId },
  });
  check('Campaigns', 'Campaign assignments', '>1000', assignments, assignments >= 1000 ? 'pass' : 'warn');
}

async function verifyTemplates(orgId: string) {
  console.log('\n📋 Verifying Templates...');

  // Workflow templates
  const workflowTemplates = await prisma.workflowTemplate.count({
    where: { organizationId: orgId },
  });
  check('Templates', 'Workflow templates', '5', workflowTemplates, workflowTemplates >= 5 ? 'pass' : 'warn');

  // Investigation templates
  const investigationTemplates = await prisma.investigationTemplate.count({
    where: { organizationId: orgId },
  });
  check('Templates', 'Investigation templates', '8', investigationTemplates, investigationTemplates >= 8 ? 'pass' : 'warn');

  // Disclosure form templates
  const disclosureForms = await prisma.disclosureFormTemplate.count({
    where: { organizationId: orgId },
  });
  check('Templates', 'Disclosure form templates', '7', disclosureForms, disclosureForms >= 5 ? 'pass' : 'warn');
}

async function verifyConflicts(orgId: string) {
  console.log('\n⚠️ Verifying Conflicts...');

  const pendingConflicts = await prisma.conflictAlert.count({
    where: { organizationId: orgId, status: 'OPEN' },
  });
  check('Conflicts', 'Open conflicts', '~8', pendingConflicts, pendingConflicts >= 5 ? 'pass' : 'warn');

  const dismissedConflicts = await prisma.conflictAlert.count({
    where: { organizationId: orgId, status: 'DISMISSED' },
  });
  check('Conflicts', 'Dismissed conflicts', '~4', dismissedConflicts, dismissedConflicts >= 2 ? 'pass' : 'warn');
}

async function verifyHistoricalData(orgId: string) {
  console.log('\n📅 Verifying Historical Data (3 Years)...');

  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const oldCases = await prisma.case.count({
    where: { organizationId: orgId, createdAt: { lte: threeYearsAgo } },
  });
  check('Historical', 'Cases >3 years old', '>0', oldCases, oldCases > 0 ? 'pass' : 'warn');

  // Check for cases in each year
  const years = [2023, 2024, 2025, 2026];
  for (const year of years) {
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31`);
    const casesInYear = await prisma.case.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: startOfYear, lte: endOfYear },
      },
    });
    check(
      'Historical',
      `Cases in ${year}`,
      '>0',
      casesInYear,
      casesInYear > 0 ? 'pass' : 'warn',
    );
  }
}

async function printResults() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    DEMO VERIFICATION RESULTS                   ');
  console.log('═══════════════════════════════════════════════════════════════');

  const categories = [...new Set(results.map((r) => r.category))];
  let passed = 0;
  let warned = 0;
  let failed = 0;

  for (const category of categories) {
    console.log(`\n📌 ${category}`);
    console.log('───────────────────────────────────────────────────────────────');

    const categoryResults = results.filter((r) => r.category === category);
    for (const result of categoryResults) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
      console.log(`  ${icon} ${result.check}`);
      console.log(`     Expected: ${result.expected}`);
      console.log(`     Actual:   ${result.actual}`);
      if (result.notes) {
        console.log(`     Notes:    ${result.notes}`);
      }

      if (result.status === 'pass') passed++;
      else if (result.status === 'warn') warned++;
      else failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY                                ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ⚠️  Warnings: ${warned}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log('═══════════════════════════════════════════════════════════════');

  const overallStatus = failed > 0 ? 'FAIL' : warned > 5 ? 'WARN' : 'PASS';
  console.log(`\n  Overall Status: ${overallStatus}`);

  if (overallStatus === 'PASS') {
    console.log('\n  🎉 Demo environment is ready for demonstrations!');
  } else if (overallStatus === 'WARN') {
    console.log('\n  ⚠️  Demo environment has some warnings - review before demos.');
  } else {
    console.log('\n  ❌ Demo environment needs attention - run npm run db:seed');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           ACME CO. DEMO ENVIRONMENT VERIFICATION              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  try {
    const orgId = await verifyOrganization();
    if (!orgId) {
      console.log('\n❌ Acme Corp organization not found. Run npm run db:seed first.');
      process.exit(1);
    }

    await verifyDemoUsers(orgId);
    await verifyEmployees(orgId);
    await verifyLocations(orgId);
    await verifyCategories(orgId);
    await verifyRIUs(orgId);
    await verifyCases(orgId);
    await verifyInvestigations(orgId);
    await verifyPolicies(orgId);
    await verifyCampaigns(orgId);
    await verifyTemplates(orgId);
    await verifyConflicts(orgId);
    await verifyHistoricalData(orgId);

    await printResults();
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
