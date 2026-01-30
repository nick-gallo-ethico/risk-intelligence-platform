import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CasePropertiesPanel, CasePropertiesPanelSkeleton } from '../case-properties-panel';
import type { Case } from '@/types/case';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    patch: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

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

describe('CasePropertiesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all sections', () => {
      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      expect(screen.getByText('Status & Classification')).toBeInTheDocument();
      expect(screen.getByText('Intake Information')).toBeInTheDocument();
      expect(screen.getByText('Reporter Information')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Metadata')).toBeInTheDocument();
    });

    it('renders status badge correctly', () => {
      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      // Status badge should render "New" (formatted from "NEW")
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('renders severity badge correctly', () => {
      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      // Severity badge should render "High" (formatted from "HIGH")
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('renders tags correctly', () => {
      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      expect(screen.getByText('urgent, hr')).toBeInTheDocument();
    });

    it('renders source channel formatted', () => {
      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      expect(screen.getByText('Hotline')).toBeInTheDocument();
    });

    it('renders location fields', () => {
      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      expect(screen.getByText('New York')).toBeInTheDocument();
      expect(screen.getByText('NY')).toBeInTheDocument();
      expect(screen.getByText('USA')).toBeInTheDocument();
    });

    it('renders metadata fields as read-only', () => {
      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      expect(screen.getByText('ETH-2026-00001')).toBeInTheDocument();
      expect(screen.getByText('Jane Admin')).toBeInTheDocument();
    });

    it('returns null when caseData is null', () => {
      const { container } = render(
        <CasePropertiesPanel caseData={null} isLoading={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders skeleton when loading', () => {
      render(<CasePropertiesPanel caseData={null} isLoading={true} />);

      // Should show skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Anonymous reporter handling', () => {
    it('hides PII fields when reporter is anonymous', () => {
      const anonymousCase = {
        ...mockCase,
        reporterAnonymous: true,
        reporterName: 'Should Not Show',
        reporterEmail: 'hidden@example.com',
        reporterPhone: '555-0000',
      };

      render(<CasePropertiesPanel caseData={anonymousCase} isLoading={false} />);

      expect(screen.getByText('Yes')).toBeInTheDocument(); // Anonymous: Yes
      expect(screen.queryByText('Should Not Show')).not.toBeInTheDocument();
      expect(screen.queryByText('hidden@example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('555-0000')).not.toBeInTheDocument();
    });

    it('shows PII fields when reporter is not anonymous', () => {
      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      expect(screen.getByText('No')).toBeInTheDocument(); // Anonymous: No
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('555-1234')).toBeInTheDocument();
    });
  });

  describe('Collapsible sections', () => {
    it('collapses section when header is clicked', async () => {
      const user = userEvent.setup();

      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      // Location section should be visible
      expect(screen.getByText('New York')).toBeVisible();

      // Click Location header to collapse
      await user.click(screen.getByText('Location'));

      // Content should be hidden
      expect(screen.queryByText('New York')).not.toBeInTheDocument();
    });

    it('expands section when collapsed header is clicked', async () => {
      const user = userEvent.setup();

      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      // Collapse first
      await user.click(screen.getByText('Location'));
      expect(screen.queryByText('New York')).not.toBeInTheDocument();

      // Expand
      await user.click(screen.getByText('Location'));
      expect(screen.getByText('New York')).toBeVisible();
    });
  });

  describe('Inline editing', () => {
    it('enters edit mode on field click', async () => {
      const user = userEvent.setup();

      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      // Click on City value
      await user.click(screen.getByText('New York'));

      // Should show input
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('calls API on save', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();

      const updatedCase = { ...mockCase, locationCity: 'Los Angeles' };
      vi.mocked(apiClient.patch).mockResolvedValueOnce(updatedCase);

      render(
        <CasePropertiesPanel
          caseData={mockCase}
          isLoading={false}
          onUpdate={onUpdate}
        />
      );

      // Click on City value
      await user.click(screen.getByText('New York'));

      // Edit the value
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'Los Angeles{enter}');

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          `/cases/${mockCase.id}`,
          { locationCity: 'Los Angeles' }
        );
      });

      expect(toast.success).toHaveBeenCalledWith('Case updated successfully');
      expect(onUpdate).toHaveBeenCalledWith(updatedCase);
    });

    it('shows error toast on API failure', async () => {
      const user = userEvent.setup();

      vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error('API Error'));

      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      // Click on City value
      await user.click(screen.getByText('New York'));

      // Edit and save
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'Los Angeles{enter}');

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('API Error');
      });
    });

    it('does not allow editing read-only fields', async () => {
      const user = userEvent.setup();

      render(<CasePropertiesPanel caseData={mockCase} isLoading={false} />);

      // Click on Reference Number (read-only)
      await user.click(screen.getByText('ETH-2026-00001'));

      // Should NOT show input
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('updates tags as array', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();

      const updatedCase = { ...mockCase, tags: ['urgent', 'hr', 'review'] };
      vi.mocked(apiClient.patch).mockResolvedValueOnce(updatedCase);

      render(
        <CasePropertiesPanel
          caseData={mockCase}
          isLoading={false}
          onUpdate={onUpdate}
        />
      );

      // Click on Tags value
      await user.click(screen.getByText('urgent, hr'));

      // Edit the value
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'urgent, hr, review{enter}');

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          `/cases/${mockCase.id}`,
          { tags: ['urgent', 'hr', 'review'] }
        );
      });
    });
  });
});

describe('CasePropertiesPanelSkeleton', () => {
  it('renders skeleton placeholders', () => {
    render(<CasePropertiesPanelSkeleton />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders 5 section skeletons', () => {
    const { container } = render(<CasePropertiesPanelSkeleton />);

    // Should have 5 card sections (Status, Intake, Reporter, Location, Metadata)
    const cards = container.querySelectorAll('.rounded-lg');
    expect(cards.length).toBe(5);
  });
});
