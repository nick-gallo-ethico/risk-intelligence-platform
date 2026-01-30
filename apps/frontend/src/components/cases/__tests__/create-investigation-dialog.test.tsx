import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CreateInvestigationDialog } from '../create-investigation-dialog';
import * as investigationApi from '@/lib/investigation-api';
import type { Investigation } from '@/types/investigation';

// Mock the investigation API
vi.mock('@/lib/investigation-api', () => ({
  createInvestigation: vi.fn(),
}));

// Mock sonner toast
vi.mock('@/components/ui/toaster', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock pointer capture methods for Radix UI in jsdom
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

const mockInvestigation: Investigation = {
  id: 'inv-123',
  caseId: 'case-456',
  organizationId: 'org-789',
  investigationNumber: 1,
  categoryId: null,
  investigationType: 'FULL',
  department: null,
  assignedTo: [],
  primaryInvestigatorId: null,
  assignedAt: null,
  assignedById: null,
  status: 'NEW',
  statusRationale: null,
  statusChangedAt: null,
  dueDate: null,
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
};

describe('CreateInvestigationDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();
  const defaultProps = {
    caseId: 'case-456',
    open: true,
    onOpenChange: mockOnOpenChange,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (investigationApi.createInvestigation as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockInvestigation
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open is true', () => {
    render(<CreateInvestigationDialog {...defaultProps} />);

    // Use role query to be more specific
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(/Start a new investigation for this case/)
    ).toBeInTheDocument();
  });

  it('does not render dialog when open is false', () => {
    render(<CreateInvestigationDialog {...defaultProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders form with required fields', () => {
    render(<CreateInvestigationDialog {...defaultProps} />);

    expect(screen.getByText('Investigation Type')).toBeInTheDocument();
    expect(screen.getByText('Department')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
  });

  it('has Full Investigation selected by default', () => {
    render(<CreateInvestigationDialog {...defaultProps} />);

    expect(screen.getByTestId('investigation-type-select')).toHaveTextContent(
      'Full Investigation'
    );
  });

  it('submits form with correct data', async () => {
    render(<CreateInvestigationDialog {...defaultProps} />);

    // Submit with default values
    const submitButton = screen.getByTestId('submit-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(investigationApi.createInvestigation).toHaveBeenCalledWith('case-456', {
        investigationType: 'FULL',
      });
    });
  });

  it('calls onSuccess callback on successful creation', async () => {
    render(<CreateInvestigationDialog {...defaultProps} />);

    const submitButton = screen.getByTestId('submit-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockInvestigation);
    });
  });

  it('closes dialog on successful creation', async () => {
    render(<CreateInvestigationDialog {...defaultProps} />);

    const submitButton = screen.getByTestId('submit-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows loading state during submission', async () => {
    (investigationApi.createInvestigation as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockInvestigation), 100))
    );

    render(<CreateInvestigationDialog {...defaultProps} />);

    const submitButton = screen.getByTestId('submit-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(submitButton).toBeDisabled();
  });

  it('shows error toast on API failure', async () => {
    const { toast } = await import('@/components/ui/toaster');
    (investigationApi.createInvestigation as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );

    render(<CreateInvestigationDialog {...defaultProps} />);

    const submitButton = screen.getByTestId('submit-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to create investigation. Please try again.'
      );
    });
  });

  it('does not call onSuccess on API failure', async () => {
    // Create fresh mocks for this test specifically
    const localOnSuccess = vi.fn();
    const localOnOpenChange = vi.fn();

    (investigationApi.createInvestigation as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );

    render(
      <CreateInvestigationDialog
        caseId="case-456"
        open={true}
        onOpenChange={localOnOpenChange}
        onSuccess={localOnSuccess}
      />
    );

    const submitButton = screen.getByTestId('submit-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Wait for error handling to complete
    await waitFor(() => {
      expect(investigationApi.createInvestigation).toHaveBeenCalled();
    });

    // onSuccess should not have been called due to the error
    expect(localOnSuccess).not.toHaveBeenCalled();
  });

  it('calls onOpenChange when cancel button is clicked', async () => {
    render(<CreateInvestigationDialog {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('allows setting due date', async () => {
    render(<CreateInvestigationDialog {...defaultProps} />);

    const dateInput = screen.getByTestId('due-date-input');
    await act(async () => {
      fireEvent.change(dateInput, { target: { value: '2026-02-15' } });
    });

    expect(dateInput).toHaveValue('2026-02-15');
  });

  it('disables cancel button while submitting', async () => {
    (investigationApi.createInvestigation as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockInvestigation), 100))
    );

    render(<CreateInvestigationDialog {...defaultProps} />);

    const submitButton = screen.getByTestId('submit-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeDisabled();
  });

  it('displays all form labels', () => {
    render(<CreateInvestigationDialog {...defaultProps} />);

    expect(screen.getByLabelText(/Investigation Type/)).toBeInTheDocument();
    expect(screen.getByLabelText('Department')).toBeInTheDocument();
    expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
  });

  it('shows required indicator for investigation type', () => {
    render(<CreateInvestigationDialog {...defaultProps} />);

    // Investigation type label should have the required asterisk
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
