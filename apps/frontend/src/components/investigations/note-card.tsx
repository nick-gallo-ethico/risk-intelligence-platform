'use client';

import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Lock, Users, Globe, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InvestigationNote, NoteType, NoteVisibility } from '@/lib/investigation-notes-api';

interface NoteCardProps {
  note: InvestigationNote;
  onClick?: (note: InvestigationNote) => void;
}

/**
 * Note type badge colors
 */
const NOTE_TYPE_COLORS: Record<NoteType, { bg: string; text: string }> = {
  GENERAL: { bg: 'bg-gray-100', text: 'text-gray-700' },
  INTERVIEW: { bg: 'bg-blue-100', text: 'text-blue-700' },
  EVIDENCE: { bg: 'bg-purple-100', text: 'text-purple-700' },
  FINDING: { bg: 'bg-orange-100', text: 'text-orange-700' },
  RECOMMENDATION: { bg: 'bg-green-100', text: 'text-green-700' },
};

/**
 * Visibility icon mapping
 */
const VISIBILITY_ICONS: Record<NoteVisibility, React.ReactNode> = {
  PRIVATE: <Lock className="h-3 w-3" />,
  TEAM: <Users className="h-3 w-3" />,
  ALL: <Globe className="h-3 w-3" />,
};

/**
 * Visibility tooltip text
 */
const VISIBILITY_LABELS: Record<NoteVisibility, string> = {
  PRIVATE: 'Only you can see this note',
  TEAM: 'Assigned investigators can see this note',
  ALL: 'All team members can see this note',
};

/**
 * Get initials from author name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Note card component for displaying investigation notes in timeline
 */
export function NoteCard({ note, onClick }: NoteCardProps) {
  const initials = getInitials(note.author.name);
  const typeColors = NOTE_TYPE_COLORS[note.noteType];
  const visibilityIcon = VISIBILITY_ICONS[note.visibility];
  const visibilityLabel = VISIBILITY_LABELS[note.visibility];

  const handleClick = () => {
    if (onClick) {
      onClick(note);
    }
  };

  return (
    <div
      className={cn(
        'flex gap-3 p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors',
        onClick && 'cursor-pointer'
      )}
      onClick={handleClick}
    >
      {/* Author avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Note content */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-sm text-gray-900">
            {note.author.name}
          </span>

          {/* Note type badge */}
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-normal border-0',
              typeColors.bg,
              typeColors.text
            )}
          >
            {note.noteType}
          </Badge>

          {/* Visibility indicator */}
          <span
            className="text-muted-foreground"
            title={visibilityLabel}
          >
            {visibilityIcon}
          </span>

          {/* Edited indicator */}
          {note.isEdited && (
            <span
              className="text-muted-foreground flex items-center gap-1"
              title={`Edited ${note.editCount} time${note.editCount !== 1 ? 's' : ''}`}
            >
              <Edit2 className="h-3 w-3" />
              <span className="text-xs">(edited)</span>
            </span>
          )}

          {/* Timestamp */}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Note content preview */}
        <div
          className="prose prose-sm max-w-none text-gray-700 line-clamp-3"
          dangerouslySetInnerHTML={{ __html: note.content }}
        />

        {/* Attachments indicator */}
        {note.attachments && note.attachments.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {note.attachments.length} attachment{note.attachments.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
