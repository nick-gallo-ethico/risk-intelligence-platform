import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityFilters } from '../activity-filters';
import type { ActivityFilterType } from '@/types/activity';

describe('ActivityFilters', () => {
  const defaultProps = {
    activeFilter: 'all' as ActivityFilterType,
    onFilterChange: vi.fn(),
  };

  it('renders all filter tabs', () => {
    render(<ActivityFilters {...defaultProps} />);

    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /notes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /status changes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /files/i })).toBeInTheDocument();
  });

  it('marks active filter as selected', () => {
    render(<ActivityFilters {...defaultProps} activeFilter="notes" />);

    const notesTab = screen.getByRole('tab', { name: /notes/i });
    expect(notesTab).toHaveAttribute('aria-selected', 'true');

    const allTab = screen.getByRole('tab', { name: /all/i });
    expect(allTab).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onFilterChange when tab is clicked', () => {
    const onFilterChange = vi.fn();
    render(<ActivityFilters {...defaultProps} onFilterChange={onFilterChange} />);

    fireEvent.click(screen.getByRole('tab', { name: /status changes/i }));

    expect(onFilterChange).toHaveBeenCalledWith('status');
  });

  it('calls onFilterChange with correct filter value for each tab', () => {
    const onFilterChange = vi.fn();
    render(<ActivityFilters {...defaultProps} onFilterChange={onFilterChange} />);

    fireEvent.click(screen.getByRole('tab', { name: /all/i }));
    expect(onFilterChange).toHaveBeenCalledWith('all');

    fireEvent.click(screen.getByRole('tab', { name: /notes/i }));
    expect(onFilterChange).toHaveBeenCalledWith('notes');

    fireEvent.click(screen.getByRole('tab', { name: /status changes/i }));
    expect(onFilterChange).toHaveBeenCalledWith('status');

    fireEvent.click(screen.getByRole('tab', { name: /files/i }));
    expect(onFilterChange).toHaveBeenCalledWith('files');
  });

  it('displays count badges when counts are provided', () => {
    const counts = {
      all: 10,
      notes: 3,
      status: 5,
      files: 2,
    };

    render(<ActivityFilters {...defaultProps} counts={counts} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not display count badges when counts are zero', () => {
    const counts = {
      all: 5,
      notes: 0,
      status: 0,
      files: 0,
    };

    render(<ActivityFilters {...defaultProps} counts={counts} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    // Zero counts should not be displayed
    expect(screen.queryAllByText('0')).toHaveLength(0);
  });

  it('does not display count badges when counts are not provided', () => {
    render(<ActivityFilters {...defaultProps} />);

    // Should only have the filter labels, no count badges
    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab) => {
      // Count badges would be inside spans - none should exist
      const badges = tab.querySelectorAll('.rounded-full');
      expect(badges.length).toBe(0);
    });
  });

  it('applies active styling to selected tab', () => {
    render(<ActivityFilters {...defaultProps} activeFilter="all" />);

    const activeTab = screen.getByRole('tab', { name: /all/i });
    expect(activeTab).toHaveClass('border-blue-500');
    expect(activeTab).toHaveClass('text-blue-600');
  });

  it('applies inactive styling to non-selected tabs', () => {
    render(<ActivityFilters {...defaultProps} activeFilter="all" />);

    const inactiveTab = screen.getByRole('tab', { name: /notes/i });
    expect(inactiveTab).toHaveClass('border-transparent');
    expect(inactiveTab).toHaveClass('text-gray-500');
  });

  it('has correct aria-controls attribute', () => {
    render(<ActivityFilters {...defaultProps} />);

    const allTab = screen.getByRole('tab', { name: /all/i });
    expect(allTab).toHaveAttribute('aria-controls', 'activity-panel-all');

    const notesTab = screen.getByRole('tab', { name: /notes/i });
    expect(notesTab).toHaveAttribute('aria-controls', 'activity-panel-notes');
  });

  it('has tablist role on container', () => {
    render(<ActivityFilters {...defaultProps} />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('applies active count badge styling', () => {
    const counts = { all: 10, notes: 0, status: 0, files: 0 };
    render(<ActivityFilters {...defaultProps} activeFilter="all" counts={counts} />);

    const countBadge = screen.getByText('10');
    expect(countBadge).toHaveClass('bg-blue-100');
    expect(countBadge).toHaveClass('text-blue-600');
  });

  it('applies inactive count badge styling', () => {
    const counts = { all: 10, notes: 5, status: 0, files: 0 };
    render(<ActivityFilters {...defaultProps} activeFilter="all" counts={counts} />);

    const inactiveCountBadge = screen.getByText('5');
    expect(inactiveCountBadge).toHaveClass('bg-gray-100');
    expect(inactiveCountBadge).toHaveClass('text-gray-600');
  });
});
