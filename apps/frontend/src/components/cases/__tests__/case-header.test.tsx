import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseHeader, CaseHeaderSkeleton } from '../case-header';
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
  details: 'Test case details',
  summary: 'This is a test case summary',
  severity: 'HIGH',
  severityReason: 'Potential policy violation',
  tags: ['urgent', 'hr'],
  aiSummary: null,
  aiSummaryGeneratedAt: null,
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

describe('CaseHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders case reference number in heading', () => {
    render(<CaseHeader caseData={mockCase} isLoading={false} />);

    // Reference number appears in h1 heading
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('ETH-2026-00001');
  });

  it('renders status badge with correct color', () => {
    render(<CaseHeader caseData={mockCase} isLoading={false} />);

    const statusBadge = screen.getByText('NEW');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('renders severity badge when severity is set', () => {
    render(<CaseHeader caseData={mockCase} isLoading={false} />);

    const severityBadge = screen.getByText('HIGH');
    expect(severityBadge).toBeInTheDocument();
    expect(severityBadge).toHaveClass('bg-orange-100', 'text-orange-800');
  });

  it('does not render severity badge when severity is null', () => {
    const caseWithoutSeverity = { ...mockCase, severity: null };
    render(<CaseHeader caseData={caseWithoutSeverity} isLoading={false} />);

    expect(screen.queryByText('HIGH')).not.toBeInTheDocument();
    expect(screen.queryByText('MEDIUM')).not.toBeInTheDocument();
    expect(screen.queryByText('LOW')).not.toBeInTheDocument();
    expect(screen.queryByText('CRITICAL')).not.toBeInTheDocument();
  });

  it('renders case summary when available', () => {
    render(<CaseHeader caseData={mockCase} isLoading={false} />);

    expect(screen.getByText('This is a test case summary')).toBeInTheDocument();
  });

  it('renders breadcrumb with Cases link', () => {
    render(<CaseHeader caseData={mockCase} isLoading={false} />);

    expect(screen.getByText('Cases')).toBeInTheDocument();
  });

  it('renders breadcrumb with reference number', () => {
    render(<CaseHeader caseData={mockCase} isLoading={false} />);

    // Reference number appears in both breadcrumb and heading
    const refNumbers = screen.getAllByText('ETH-2026-00001');
    expect(refNumbers).toHaveLength(2);
  });

  it('navigates to cases list when breadcrumb is clicked', async () => {
    const user = userEvent.setup();
    render(<CaseHeader caseData={mockCase} isLoading={false} />);

    const casesLink = screen.getByText('Cases');
    await user.click(casesLink);

    expect(mockPush).toHaveBeenCalledWith('/cases');
  });

  it('renders action buttons', () => {
    render(<CaseHeader caseData={mockCase} isLoading={false} />);

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /actions/i })).toBeInTheDocument();
  });

  it('returns null when caseData is null and not loading', () => {
    const { container } = render(<CaseHeader caseData={null} isLoading={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders skeleton when loading', () => {
    render(<CaseHeader caseData={null} isLoading={true} />);

    // Should not show case data
    expect(screen.queryByText('ETH-2026-00001')).not.toBeInTheDocument();
    // Should show skeleton elements (animated pulse divs)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('CaseHeaderSkeleton', () => {
  it('renders skeleton placeholders', () => {
    render(<CaseHeaderSkeleton />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has proper structure for layout', () => {
    const { container } = render(<CaseHeaderSkeleton />);

    // Should have the same container structure as the real header
    expect(container.querySelector('.bg-white')).toBeInTheDocument();
    expect(container.querySelector('.border-b')).toBeInTheDocument();
  });
});

describe('CaseHeader status colors', () => {
  it('renders OPEN status with yellow color', () => {
    const openCase = { ...mockCase, status: 'OPEN' as const };
    render(<CaseHeader caseData={openCase} isLoading={false} />);

    const statusBadge = screen.getByText('OPEN');
    expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('renders CLOSED status with gray color', () => {
    const closedCase = { ...mockCase, status: 'CLOSED' as const };
    render(<CaseHeader caseData={closedCase} isLoading={false} />);

    const statusBadge = screen.getByText('CLOSED');
    expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
  });
});

describe('CaseHeader severity colors', () => {
  it('renders LOW severity with green color', () => {
    const lowCase = { ...mockCase, severity: 'LOW' as const };
    render(<CaseHeader caseData={lowCase} isLoading={false} />);

    const severityBadge = screen.getByText('LOW');
    expect(severityBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('renders MEDIUM severity with yellow color', () => {
    const mediumCase = { ...mockCase, severity: 'MEDIUM' as const };
    render(<CaseHeader caseData={mediumCase} isLoading={false} />);

    const severityBadge = screen.getByText('MEDIUM');
    expect(severityBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('renders CRITICAL severity with red color', () => {
    const criticalCase = { ...mockCase, severity: 'CRITICAL' as const };
    render(<CaseHeader caseData={criticalCase} isLoading={false} />);

    const severityBadge = screen.getByText('CRITICAL');
    expect(severityBadge).toHaveClass('bg-red-100', 'text-red-800');
  });
});
