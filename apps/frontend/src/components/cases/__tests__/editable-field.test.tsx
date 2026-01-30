import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableField } from '../editable-field';

describe('EditableField', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Text field', () => {
    it('renders label and value correctly', () => {
      render(
        <EditableField
          label="City"
          value="New York"
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('City')).toBeInTheDocument();
      expect(screen.getByText('New York')).toBeInTheDocument();
    });

    it('renders placeholder when value is null', () => {
      render(
        <EditableField
          label="City"
          value={null}
          placeholder="Not specified"
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('Not specified')).toBeInTheDocument();
    });

    it('enters edit mode on click', async () => {
      const user = userEvent.setup();
      render(
        <EditableField
          label="City"
          value="New York"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('New York'));

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue('New York');
    });

    it('saves on Enter key', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValueOnce(undefined);

      render(
        <EditableField
          label="City"
          value="New York"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('New York'));
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'Los Angeles{enter}');

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('Los Angeles');
      });
    });

    it('cancels on Escape key', async () => {
      const user = userEvent.setup();

      render(
        <EditableField
          label="City"
          value="New York"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('New York'));
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'Los Angeles');
      await user.keyboard('{Escape}');

      // Should exit edit mode without saving
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByText('New York')).toBeInTheDocument();
    });

    it('does not save if value unchanged', async () => {
      const user = userEvent.setup();

      render(
        <EditableField
          label="City"
          value="New York"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('New York'));
      await user.keyboard('{enter}');

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('shows save and cancel buttons in edit mode', async () => {
      const user = userEvent.setup();

      render(
        <EditableField
          label="City"
          value="New York"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('New York'));

      expect(screen.getByRole('button', { name: /cancel edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('cancels edit on cancel button click', async () => {
      const user = userEvent.setup();

      render(
        <EditableField
          label="City"
          value="New York"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('New York'));
      await user.click(screen.getByRole('button', { name: /cancel edit/i }));

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Read-only field', () => {
    it('does not enter edit mode when readOnly', async () => {
      const user = userEvent.setup();

      render(
        <EditableField
          label="Reference"
          value="ETH-2026-00001"
          readOnly
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('ETH-2026-00001'));

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('does not show edit icon on hover', () => {
      render(
        <EditableField
          label="Reference"
          value="ETH-2026-00001"
          readOnly
          onSave={mockOnSave}
        />
      );

      // The button should have cursor-default class
      const button = screen.getByRole('button');
      expect(button).toHaveClass('cursor-default');
    });
  });

  describe('Select field', () => {
    const options = [
      { value: 'NEW', label: 'New' },
      { value: 'OPEN', label: 'Open' },
      { value: 'CLOSED', label: 'Closed' },
    ];

    it('renders with custom renderValue', () => {
      render(
        <EditableField
          label="Status"
          value="NEW"
          fieldType="select"
          options={options}
          onSave={mockOnSave}
          renderValue={(val) => <span data-testid="custom-badge">{val}</span>}
        />
      );

      expect(screen.getByTestId('custom-badge')).toHaveTextContent('NEW');
    });

    it('shows select dropdown when clicked', async () => {
      const user = userEvent.setup();

      render(
        <EditableField
          label="Status"
          value="NEW"
          fieldType="select"
          options={options}
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('NEW'));

      // Should show select trigger
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Tags field', () => {
    it('renders tags as comma-separated list', () => {
      render(
        <EditableField
          label="Tags"
          value={['urgent', 'hr', 'review']}
          fieldType="tags"
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('urgent, hr, review')).toBeInTheDocument();
    });

    it('saves tags as array', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValueOnce(undefined);

      render(
        <EditableField
          label="Tags"
          value={['urgent']}
          fieldType="tags"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('urgent'));
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'urgent, hr, review{enter}');

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(['urgent', 'hr', 'review']);
      });
    });

    it('filters empty tags', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValueOnce(undefined);

      render(
        <EditableField
          label="Tags"
          value={[]}
          fieldType="tags"
          placeholder="No tags"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('No tags'));
      const input = screen.getByRole('textbox');
      await user.type(input, 'urgent, , , review{enter}');

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(['urgent', 'review']);
      });
    });
  });

  describe('Error handling', () => {
    it('keeps edit mode open on save error', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValueOnce(new Error('API Error'));

      render(
        <EditableField
          label="City"
          value="New York"
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('New York'));
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'Los Angeles{enter}');

      // Wait for the save attempt
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      // Should still be in edit mode
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });
});
