import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvestigationCard } from '../investigation-card';
import type { Investigation } from '@/types/investigation';

const mockInvestigation: Investigation = {
  id: 'inv-123',
  caseId: 'case-456',
  organizationId: 'org-789',
  investigationNumber: 1,
  categoryId: null,
  investigationType: 'FULL',
  department: 'HR',
  assignedTo: ['user-1', 'user-2'],
  primaryInvestigatorId: 'user-1',
  primaryInvestigator: {
    id: 'user-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
  },
  assignedAt: '2026-01-15T10:00:00Z',
  assignedById: 'user-admin',
  status: 'INVESTIGATING',
  statusRationale: null,
  statusChangedAt: null,
  dueDate: '2026-02-15T00:00:00Z',
  slaStatus: 'ON_TRACK',
  findingsSummary: null,
  findingsDetail: null,
  outcome: null,
  rootCause: null,
  lessonsLearned: null,
  findingsDate: null,
  closedAt: null,
  closedById: null,
  closureNotes: null,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
  createdById: 'user-admin',
  notesCount: 3,
};

describe('InvestigationCard', () => {
  it('renders investigation number', () => {
    render(<InvestigationCard investigation={mockInvestigation} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('renders status badge with correct color for INVESTIGATING', () => {
    render(<InvestigationCard investigation={mockInvestigation} />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('INVESTIGATING');
    expect(badge).toHaveClass('bg-yellow-100');
  });

  it('renders status badge with correct color for NEW', () => {
    const newInvestigation = { ...mockInvestigation, status: 'NEW' as const };
    render(<InvestigationCard investigation={newInvestigation} />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveClass('bg-gray-100');
  });

  it('renders status badge with correct color for ASSIGNED', () => {
    const assignedInvestigation = { ...mockInvestigation, status: 'ASSIGNED' as const };
    render(<InvestigationCard investigation={assignedInvestigation} />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveClass('bg-blue-100');
  });

  it('renders status badge with correct color for PENDING_REVIEW', () => {
    const pendingInvestigation = { ...mockInvestigation, status: 'PENDING_REVIEW' as const };
    render(<InvestigationCard investigation={pendingInvestigation} />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveClass('bg-orange-100');
  });

  it('renders status badge with correct color for CLOSED', () => {
    const closedInvestigation = { ...mockInvestigation, status: 'CLOSED' as const };
    render(<InvestigationCard investigation={closedInvestigation} />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveClass('bg-green-100');
  });

  it('renders status badge with correct color for ON_HOLD', () => {
    const onHoldInvestigation = { ...mockInvestigation, status: 'ON_HOLD' as const };
    render(<InvestigationCard investigation={onHoldInvestigation} />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveClass('bg-red-100');
  });

  it('renders investigation type and department', () => {
    render(<InvestigationCard investigation={mockInvestigation} />);
    expect(screen.getByText(/FULL/)).toBeInTheDocument();
    expect(screen.getByText(/HR/)).toBeInTheDocument();
  });

  it('renders primary investigator name and avatar', () => {
    render(<InvestigationCard investigation={mockInvestigation} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument(); // initials
  });

  it('renders due date', () => {
    render(<InvestigationCard investigation={mockInvestigation} />);
    // Check for any valid date format (Feb 14 or 15 depending on timezone)
    expect(screen.getByText(/Feb 1[45], 2026/)).toBeInTheDocument();
  });

  it('renders SLA indicator with correct color for ON_TRACK', () => {
    render(<InvestigationCard investigation={mockInvestigation} />);
    const slaIndicator = screen.getByTestId('sla-indicator');
    expect(slaIndicator).toHaveTextContent('ON TRACK');
    expect(slaIndicator).toHaveClass('bg-green-100');
  });

  it('renders SLA indicator with correct color for WARNING', () => {
    const warningInvestigation = { ...mockInvestigation, slaStatus: 'WARNING' as const };
    render(<InvestigationCard investigation={warningInvestigation} />);
    const slaIndicator = screen.getByTestId('sla-indicator');
    expect(slaIndicator).toHaveClass('bg-yellow-100');
  });

  it('renders SLA indicator with correct color for OVERDUE', () => {
    const overdueInvestigation = { ...mockInvestigation, slaStatus: 'OVERDUE' as const };
    render(<InvestigationCard investigation={overdueInvestigation} />);
    const slaIndicator = screen.getByTestId('sla-indicator');
    expect(slaIndicator).toHaveClass('bg-red-100');
  });

  it('expands on click to show details', () => {
    render(<InvestigationCard investigation={mockInvestigation} />);

    // Initially collapsed
    expect(screen.queryByTestId('expanded-content')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByTestId('investigation-card'));

    // Should be expanded
    expect(screen.getByTestId('expanded-content')).toBeInTheDocument();
  });

  it('shows assignees count when expanded', () => {
    render(<InvestigationCard investigation={mockInvestigation} />);

    fireEvent.click(screen.getByTestId('investigation-card'));

    expect(screen.getByText('Assignees (2)')).toBeInTheDocument();
  });

  it('shows findings summary when closed with findings', () => {
    const closedInvestigation: Investigation = {
      ...mockInvestigation,
      status: 'CLOSED',
      findingsSummary: 'Investigation found policy violations in department X.',
      outcome: 'POLICY_VIOLATION',
    };

    render(<InvestigationCard investigation={closedInvestigation} />);

    fireEvent.click(screen.getByTestId('investigation-card'));

    expect(screen.getByText('Findings')).toBeInTheDocument();
    expect(screen.getByText(/Investigation found policy violations/)).toBeInTheDocument();
    expect(screen.getByText('POLICY VIOLATION')).toBeInTheDocument();
  });

  it('calls onClick callback when clicked', () => {
    const handleClick = vi.fn();
    render(<InvestigationCard investigation={mockInvestigation} onClick={handleClick} />);

    fireEvent.click(screen.getByTestId('investigation-card'));

    expect(handleClick).toHaveBeenCalledWith(mockInvestigation);
  });

  it('toggles expansion on multiple clicks', () => {
    render(<InvestigationCard investigation={mockInvestigation} />);

    // Click to expand
    fireEvent.click(screen.getByTestId('investigation-card'));
    expect(screen.getByTestId('expanded-content')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByTestId('investigation-card'));
    expect(screen.queryByTestId('expanded-content')).not.toBeInTheDocument();
  });

  it('shows notes count when expanded', () => {
    render(<InvestigationCard investigation={mockInvestigation} />);

    fireEvent.click(screen.getByTestId('investigation-card'));

    expect(screen.getByText('3 notes')).toBeInTheDocument();
  });

  it('handles investigation without primary investigator', () => {
    const noInvestigatorInv = {
      ...mockInvestigation,
      primaryInvestigator: undefined,
      primaryInvestigatorId: null,
    };

    render(<InvestigationCard investigation={noInvestigatorInv} />);

    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('handles investigation without due date', () => {
    const noDueDateInv = { ...mockInvestigation, dueDate: null };

    render(<InvestigationCard investigation={noDueDateInv} />);

    expect(screen.queryByText('Feb 15, 2026')).not.toBeInTheDocument();
  });
});
