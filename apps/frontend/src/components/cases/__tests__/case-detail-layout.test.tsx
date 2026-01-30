import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CaseDetailLayout } from '../case-detail-layout';
import type { Case } from '@/types/case';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

const mockCase: Case = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  referenceNumber: 'ETH-2026-00001',
  organizationId: 'org-123',
  status: 'NEW',
  statusRationale: null,
  sourceChannel: 'HOTLINE',
  caseType: 'REPORT',
  intakeTimestamp: '2026-01-15T10:00:00Z',
  reporterType: 'EMPLOYEE',
  reporterAnonymous: false,
  reporterName: 'John Doe',
  reporterEmail: 'john@example.com',
  reporterPhone: '555-1234',
  locationCity: 'New York',
  locationState: 'NY',
  locationCountry: 'USA',
  details: 'This is the detailed description of the case report.',
  summary: 'This is a test case summary',
  severity: 'HIGH',
  severityReason: 'Potential policy violation',
  tags: ['urgent', 'hr'],
  aiSummary: 'AI-generated summary of the case.',
  aiSummaryGeneratedAt: '2026-01-15T11:00:00Z',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:30:00Z',
  createdById: 'user-123',
  createdBy: {
    id: 'user-123',
    firstName: 'Jane',
    lastName: 'Admin',
    email: 'jane@example.com',
  },
};

describe('CaseDetailLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all three panels', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    // Header should be visible (use heading role to be specific)
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('ETH-2026-00001');

    // Properties panel content (left panel) - look for section headings
    const statusHeadings = screen.getAllByText('Status');
    expect(statusHeadings.length).toBeGreaterThan(0);

    // Activity timeline (center panel)
    expect(screen.getByText('Case Details')).toBeInTheDocument();
    // Activity appears multiple times (mobile toggle and timeline heading)
    const activityTexts = screen.getAllByText('Activity');
    expect(activityTexts.length).toBeGreaterThan(0);

    // Investigations panel (right panel) - multiple instances due to mobile panels
    const investigationsHeadings = screen.getAllByText('Investigations');
    expect(investigationsHeadings.length).toBeGreaterThan(0);
  });

  it('displays case details in center panel', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    expect(screen.getByText('This is the detailed description of the case report.')).toBeInTheDocument();
  });

  it('displays case properties in left panel', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    // Status section - NEW appears in both header badge and properties
    const newBadges = screen.getAllByText('NEW');
    expect(newBadges.length).toBeGreaterThan(0);

    // HIGH appears in both header badge and properties
    const highBadges = screen.getAllByText('HIGH');
    expect(highBadges.length).toBeGreaterThan(0);

    // Classification section - Hotline appears in properties (formatted)
    const hotlineTexts = screen.getAllByText('Hotline');
    expect(hotlineTexts.length).toBeGreaterThan(0);

    // Reporter section - appears in desktop and mobile panels
    const johnDoeTexts = screen.getAllByText('John Doe');
    expect(johnDoeTexts.length).toBeGreaterThan(0);

    const emailTexts = screen.getAllByText('john@example.com');
    expect(emailTexts.length).toBeGreaterThan(0);

    // Location section - appears in desktop and mobile panels
    const cityTexts = screen.getAllByText('New York');
    expect(cityTexts.length).toBeGreaterThan(0);
  });

  it('displays AI summary when available', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    // AI summary appears in desktop and mobile panels
    const aiSummaryTexts = screen.getAllByText('AI-generated summary of the case.');
    expect(aiSummaryTexts.length).toBeGreaterThan(0);
  });

  it('shows placeholder when no AI summary', () => {
    const caseWithoutAI = { ...mockCase, aiSummary: null };
    render(<CaseDetailLayout caseData={caseWithoutAI} isLoading={false} error={null} />);

    // Placeholder appears in desktop and mobile panels
    const placeholders = screen.getAllByText('No AI summary generated');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('renders loading skeletons when loading', () => {
    render(<CaseDetailLayout caseData={null} isLoading={true} error={null} />);

    // Should show skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);

    // Should not show actual case data
    expect(screen.queryByText('ETH-2026-00001')).not.toBeInTheDocument();
  });

  it('renders error state when error is provided', () => {
    render(
      <CaseDetailLayout
        caseData={null}
        isLoading={false}
        error="Case not found. It may have been deleted."
      />
    );

    expect(screen.getByText('Case Not Found')).toBeInTheDocument();
    expect(screen.getByText('Case not found. It may have been deleted.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  it('renders action buttons in activity panel', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log call/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send email/i })).toBeInTheDocument();
  });

  it('renders Create Investigation button', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    // Create buttons appear in desktop and mobile panels
    const createButtons = screen.getAllByRole('button', { name: /^create$/i });
    expect(createButtons.length).toBeGreaterThan(0);
  });

  it('renders panel toggle buttons for mobile view', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    // Mobile toggle buttons
    const propertiesButtons = screen.getAllByRole('button', { name: /properties/i });
    expect(propertiesButtons.length).toBeGreaterThan(0);
  });

  it('renders collapse buttons for desktop panels', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    // Should have collapse buttons for left and right panels
    const collapseButtons = screen.getAllByRole('button', { name: /collapse|expand/i });
    expect(collapseButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('displays activity timeline with case creation event', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    expect(screen.getByText('Case created')).toBeInTheDocument();
    expect(screen.getByText(/by Jane Admin/)).toBeInTheDocument();
  });

  it('renders Related Cases placeholder', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    // Related Cases appears in desktop and mobile panels
    const relatedCasesHeadings = screen.getAllByText('Related Cases');
    expect(relatedCasesHeadings.length).toBeGreaterThan(0);

    const noRelatedCases = screen.getAllByText('No related cases');
    expect(noRelatedCases.length).toBeGreaterThan(0);
  });

  it('renders Subjects placeholder', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    // Subjects appears in desktop and mobile panels
    const subjectsHeadings = screen.getAllByText('Subjects');
    expect(subjectsHeadings.length).toBeGreaterThan(0);

    const noSubjectsTexts = screen.getAllByText('No subjects linked');
    expect(noSubjectsTexts.length).toBeGreaterThan(0);
  });
});

describe('CaseDetailLayout responsive behavior', () => {
  it('has hidden panels by default on mobile (lg:hidden class)', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    // The desktop panels should have lg:block class (hidden on mobile)
    const asideElements = document.querySelectorAll('aside');
    const desktopPanels = Array.from(asideElements).filter(el =>
      el.classList.contains('lg:block')
    );

    expect(desktopPanels.length).toBeGreaterThanOrEqual(2);
  });

  it('has mobile slide-over panels', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    // Should have overlay containers for mobile (fixed + lg:hidden)
    const mobileOverlays = document.querySelectorAll('.fixed.inset-0');
    expect(mobileOverlays.length).toBe(2); // Left and right slide-overs
  });
});

describe('CaseDetailLayout panel toggle', () => {
  it('starts with panels visible by default', () => {
    render(<CaseDetailLayout caseData={mockCase} isLoading={false} error={null} />);

    // Left panel should show properties (multiple instances due to mobile)
    const statusHeadings = screen.getAllByText('Status');
    expect(statusHeadings.length).toBeGreaterThan(0);

    // Right panel should show investigations (multiple instances due to mobile)
    const investigationsHeadings = screen.getAllByText('Investigations');
    expect(investigationsHeadings.length).toBeGreaterThan(0);
  });
});
