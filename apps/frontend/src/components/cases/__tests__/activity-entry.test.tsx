import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityEntry } from '../activity-entry';
import type { Activity } from '@/types/activity';

// Helper to create dates relative to now
const getRecentDate = (hoursAgo: number) => {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
};

const getDateDaysAgo = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

describe('ActivityEntry', () => {
  const baseActivity: Activity = {
    id: 'activity-1',
    entityType: 'CASE',
    entityId: 'case-123',
    action: 'created',
    actionDescription: 'John Doe created the case',
    changes: null,
    actorUserId: 'user-123',
    actorType: 'USER',
    actorName: 'John Doe',
    createdAt: getRecentDate(2),
  };

  it('renders activity entry with description', () => {
    render(<ActivityEntry activity={baseActivity} />);

    expect(screen.getByTestId('activity-entry')).toBeInTheDocument();
    expect(screen.getByTestId('activity-description')).toHaveTextContent(
      'John Doe created the case'
    );
  });

  it('displays actor name', () => {
    render(<ActivityEntry activity={baseActivity} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays System when no actor name', () => {
    const activityWithoutActor = { ...baseActivity, actorName: null };
    render(<ActivityEntry activity={activityWithoutActor} />);

    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('displays relative timestamp', () => {
    render(<ActivityEntry activity={baseActivity} />);

    const timestamp = screen.getByTestId('activity-timestamp');
    expect(timestamp).toHaveTextContent(/hours? ago/);
  });

  it('displays correct icon for created action', () => {
    render(<ActivityEntry activity={baseActivity} />);

    const iconContainer = screen.getByTestId('activity-entry').querySelector('.rounded-full');
    expect(iconContainer).toHaveClass('bg-green-100');
  });

  it('displays correct icon for status_changed action', () => {
    const statusActivity = { ...baseActivity, action: 'status_changed' as const };
    render(<ActivityEntry activity={statusActivity} />);

    const iconContainer = screen.getByTestId('activity-entry').querySelector('.rounded-full');
    expect(iconContainer).toHaveClass('bg-purple-100');
  });

  it('displays correct icon for assigned action', () => {
    const assignedActivity = { ...baseActivity, action: 'assigned' as const };
    render(<ActivityEntry activity={assignedActivity} />);

    const iconContainer = screen.getByTestId('activity-entry').querySelector('.rounded-full');
    expect(iconContainer).toHaveClass('bg-indigo-100');
  });

  it('displays correct icon for commented action', () => {
    const commentActivity = { ...baseActivity, action: 'commented' as const };
    render(<ActivityEntry activity={commentActivity} />);

    const iconContainer = screen.getByTestId('activity-entry').querySelector('.rounded-full');
    expect(iconContainer).toHaveClass('bg-teal-100');
  });

  it('displays correct icon for file_uploaded action', () => {
    const fileActivity = { ...baseActivity, action: 'file_uploaded' as const };
    render(<ActivityEntry activity={fileActivity} />);

    const iconContainer = screen.getByTestId('activity-entry').querySelector('.rounded-full');
    expect(iconContainer).toHaveClass('bg-amber-100');
  });

  it('shows timeline connector when not last item', () => {
    render(<ActivityEntry activity={baseActivity} isLast={false} />);

    const connector = screen.getByTestId('activity-entry').querySelector('.w-px.bg-gray-200');
    expect(connector).toBeInTheDocument();
  });

  it('hides timeline connector when last item', () => {
    render(<ActivityEntry activity={baseActivity} isLast={true} />);

    const connectors = screen.getByTestId('activity-entry').querySelectorAll('.w-px.bg-gray-200');
    expect(connectors.length).toBe(0);
  });

  it('displays changes when available', () => {
    const activityWithChanges: Activity = {
      ...baseActivity,
      action: 'status_changed',
      actionDescription: 'John Doe changed status from NEW to OPEN',
      changes: {
        status: { old: 'NEW', new: 'OPEN' },
      },
    };

    render(<ActivityEntry activity={activityWithChanges} />);

    expect(screen.getByText('status:')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
  });

  it('formats field names correctly', () => {
    const activityWithChanges: Activity = {
      ...baseActivity,
      action: 'updated',
      changes: {
        assigned_to_id: { old: null, new: 'user-456' },
      },
    };

    render(<ActivityEntry activity={activityWithChanges} />);

    expect(screen.getByText('assigned to id:')).toBeInTheDocument();
  });

  it('displays none for null values in changes', () => {
    const activityWithChanges: Activity = {
      ...baseActivity,
      action: 'assigned',
      changes: {
        assignee: { old: null, new: 'Sarah' },
      },
    };

    render(<ActivityEntry activity={activityWithChanges} />);

    expect(screen.getByText('none')).toBeInTheDocument();
    expect(screen.getByText('Sarah')).toBeInTheDocument();
  });

  it('has correct datetime attribute for accessibility', () => {
    render(<ActivityEntry activity={baseActivity} />);

    const timestamp = screen.getByTestId('activity-timestamp');
    expect(timestamp).toHaveAttribute('dateTime', baseActivity.createdAt);
  });
});

describe('ActivityEntry relative timestamps', () => {
  const createActivity = (createdAt: string): Activity => ({
    id: 'activity-1',
    entityType: 'CASE',
    entityId: 'case-123',
    action: 'created',
    actionDescription: 'Activity description',
    changes: null,
    actorUserId: 'user-123',
    actorType: 'USER',
    actorName: 'Test User',
    createdAt,
  });

  it('shows time-relative text for recent activity', () => {
    const activity = createActivity(getRecentDate(0));
    render(<ActivityEntry activity={activity} />);

    const timestamp = screen.getByTestId('activity-timestamp');
    // Could be "Just now" or "X minutes ago" depending on exact timing
    expect(timestamp.textContent).toMatch(/Just now|minutes? ago/i);
  });

  it('shows "X hours ago" for activity from hours ago', () => {
    const activity = createActivity(getRecentDate(3));
    render(<ActivityEntry activity={activity} />);

    expect(screen.getByTestId('activity-timestamp')).toHaveTextContent('3 hours ago');
  });

  it('shows "Yesterday" for activity from yesterday', () => {
    const activity = createActivity(getDateDaysAgo(1));
    render(<ActivityEntry activity={activity} />);

    expect(screen.getByTestId('activity-timestamp')).toHaveTextContent('Yesterday');
  });

  it('shows "X days ago" for activity within a week', () => {
    const activity = createActivity(getDateDaysAgo(3));
    render(<ActivityEntry activity={activity} />);

    expect(screen.getByTestId('activity-timestamp')).toHaveTextContent('3 days ago');
  });

  it('shows "X weeks ago" for older activity', () => {
    const activity = createActivity(getDateDaysAgo(14));
    render(<ActivityEntry activity={activity} />);

    expect(screen.getByTestId('activity-timestamp')).toHaveTextContent('2 weeks ago');
  });
});
