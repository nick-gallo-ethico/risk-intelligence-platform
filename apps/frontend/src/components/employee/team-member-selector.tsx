'use client';

/**
 * TeamMemberSelector Component
 *
 * A searchable selector for team members in proxy reporting.
 *
 * Features:
 * - Search/filter by name, email, job title
 * - Display avatar, name, job title, department, email
 * - Selected member highlighted
 * - Keyboard navigation support
 * - Empty state if no team members
 * - Error state for selection validation
 * - Shows reporting depth (direct report, skip-level)
 */

import * as React from 'react';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, User, ChevronDown, Check, AlertCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TeamMember } from '@/types/employee-portal.types';

interface TeamMemberSelectorProps {
  /** Currently selected member ID */
  selectedId?: string;
  /** Callback when a member is selected */
  onSelect: (member: TeamMember) => void;
  /** List of team members to display */
  teamMembers: TeamMember[];
  /** Whether the team members are loading */
  isLoading?: boolean;
  /** Error message to display (e.g., "Selection required") */
  error?: string;
  /** Additional class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Get initials from a name for avatar fallback.
 */
function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get reporting depth label.
 */
function getReportingDepthLabel(depth: number): string {
  switch (depth) {
    case 1:
      return 'Direct report';
    case 2:
      return 'Skip-level';
    default:
      return `${depth} levels`;
  }
}

/**
 * TeamMemberSelector - Searchable team member picker.
 */
export function TeamMemberSelector({
  selectedId,
  onSelect,
  teamMembers,
  isLoading = false,
  error,
  className,
  disabled = false,
}: TeamMemberSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter team members by search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) {
      return teamMembers;
    }

    const query = searchQuery.toLowerCase();
    return teamMembers.filter((member) => {
      const searchableFields = [
        member.displayName,
        member.email,
        member.jobTitle,
        member.department,
      ].filter(Boolean);

      return searchableFields.some((field) =>
        field!.toLowerCase().includes(query)
      );
    });
  }, [teamMembers, searchQuery]);

  // Sort by department, then name
  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      // First by department
      const deptA = a.department || 'ZZZ';
      const deptB = b.department || 'ZZZ';
      if (deptA !== deptB) {
        return deptA.localeCompare(deptB);
      }
      // Then by name
      return a.displayName.localeCompare(b.displayName);
    });
  }, [filteredMembers]);

  // Get selected member for preview
  const selectedMember = useMemo(
    () => teamMembers.find((m) => m.id === selectedId),
    [teamMembers, selectedId]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < sortedMembers.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < sortedMembers.length) {
            onSelect(sortedMembers[focusedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setFocusedIndex(-1);
          setSearchQuery('');
          break;
      }
    },
    [disabled, focusedIndex, sortedMembers, onSelect]
  );

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedIndex]);

  // Reset focused index when search changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state (not a manager)
  if (teamMembers.length === 0) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <h3 className="mt-4 font-medium">No Team Members</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You don&apos;t have any direct or indirect reports in the system.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)} onKeyDown={handleKeyDown}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, email, or job title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="pl-10"
          aria-label="Search team members"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Team member list */}
      <div
        ref={listRef}
        className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-2"
        role="listbox"
        aria-label="Team members"
      >
        {sortedMembers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No team members match &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          sortedMembers.map((member, index) => {
            const isSelected = member.id === selectedId;
            const isFocused = index === focusedIndex;

            return (
              <button
                key={member.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={disabled || member.status !== 'ACTIVE'}
                onClick={() => onSelect(member)}
                onFocus={() => setFocusedIndex(index)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                  'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  isSelected && 'bg-primary/10 border border-primary/20',
                  isFocused && !isSelected && 'bg-accent',
                  member.status !== 'ACTIVE' && 'opacity-50 cursor-not-allowed'
                )}
              >
                {/* Avatar */}
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={member.avatarUrl || undefined} alt="" />
                  <AvatarFallback className="text-sm">
                    {getInitials(member.displayName)}
                  </AvatarFallback>
                </Avatar>

                {/* Member info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {member.displayName}
                    </span>
                    {member.reportingDepth && (
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {getReportingDepthLabel(member.reportingDepth)}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {member.jobTitle}
                    {member.department && ` - ${member.department}`}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </div>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {sortedMembers.length === teamMembers.length
          ? `${teamMembers.length} team member${teamMembers.length !== 1 ? 's' : ''}`
          : `${sortedMembers.length} of ${teamMembers.length} team members`}
      </p>
    </div>
  );
}
