'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteCard } from './note-card';
import { AddNoteModal } from './add-note-modal';
import { investigationNotesApi } from '@/lib/investigation-notes-api';
import type { InvestigationNote, NoteType } from '@/lib/investigation-notes-api';

interface InvestigationNotesProps {
  investigationId: string;
}

/**
 * Note type filter options
 */
const NOTE_TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'GENERAL', label: 'General' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'EVIDENCE', label: 'Evidence' },
  { value: 'FINDING', label: 'Finding' },
  { value: 'RECOMMENDATION', label: 'Recommendation' },
];

/**
 * Investigation notes tab content - shows timeline of notes
 */
export function InvestigationNotes({ investigationId }: InvestigationNotesProps) {
  const [notes, setNotes] = useState<InvestigationNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: { noteType?: NoteType; limit?: number; sortOrder?: 'desc' } = {
        limit: 50,
        sortOrder: 'desc',
      };

      if (filterType !== 'ALL') {
        params.noteType = filterType as NoteType;
      }

      const response = await investigationNotesApi.list(investigationId, params);
      setNotes(response.items);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [investigationId, filterType]);

  // Fetch on mount and when filter changes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Handle new note created
  const handleNoteCreated = useCallback((note: InvestigationNote) => {
    setNotes((prev) => [note, ...prev]);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((value: string) => {
    setFilterType(value);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header with filter and add button */}
      <div className="flex items-center justify-between gap-4">
        {/* Filter by type */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              {NOTE_TYPE_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Add note button */}
        <Button size="sm" onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Note
        </Button>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {loading ? (
          // Loading skeleton
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 p-4 border rounded-lg">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </>
        ) : error ? (
          // Error state
          <div className="text-center py-8 text-destructive border border-dashed border-destructive/30 rounded-lg">
            <p className="text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchNotes} className="mt-2">
              Retry
            </Button>
          </div>
        ) : notes.length === 0 ? (
          // Empty state
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm font-medium">No notes yet</p>
            <p className="text-xs mt-1">Add a note to document your investigation</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add First Note
            </Button>
          </div>
        ) : (
          // Notes timeline
          notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))
        )}
      </div>

      {/* Add note modal */}
      <AddNoteModal
        investigationId={investigationId}
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={handleNoteCreated}
      />
    </div>
  );
}
