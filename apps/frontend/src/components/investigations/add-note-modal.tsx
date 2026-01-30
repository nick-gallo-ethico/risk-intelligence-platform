'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/rich-text';
import { investigationNotesApi } from '@/lib/investigation-notes-api';
import type { NoteType, NoteVisibility, InvestigationNote } from '@/lib/investigation-notes-api';

interface AddNoteModalProps {
  investigationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (note: InvestigationNote) => void;
}

/**
 * Note type options for the dropdown
 */
const NOTE_TYPES: { value: NoteType; label: string; description: string }[] = [
  { value: 'GENERAL', label: 'General', description: 'General notes and observations' },
  { value: 'INTERVIEW', label: 'Interview', description: 'Notes from interviews or meetings' },
  { value: 'EVIDENCE', label: 'Evidence', description: 'Documentation of evidence' },
  { value: 'FINDING', label: 'Finding', description: 'Investigation findings' },
  { value: 'RECOMMENDATION', label: 'Recommendation', description: 'Recommended actions' },
];

/**
 * Visibility options for the dropdown
 */
const VISIBILITY_OPTIONS: { value: NoteVisibility; label: string; description: string }[] = [
  { value: 'TEAM', label: 'Team', description: 'Visible to assigned investigators' },
  { value: 'ALL', label: 'All', description: 'Visible to all team members' },
  { value: 'PRIVATE', label: 'Private', description: 'Only visible to you' },
];

/**
 * Modal for adding a new investigation note
 */
export function AddNoteModal({
  investigationId,
  open,
  onOpenChange,
  onSuccess,
}: AddNoteModalProps) {
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('GENERAL');
  const [visibility, setVisibility] = useState<NoteVisibility>('TEAM');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setContent('');
        setNoteType('GENERAL');
        setVisibility('TEAM');
        setError(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Handle content change from editor
  const handleContentChange = useCallback((html: string) => {
    setContent(html);
    setError(null);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    // Validate content
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (!plainText) {
      setError('Please enter some content for your note');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const note = await investigationNotesApi.create(investigationId, {
        content,
        noteType,
        visibility,
      });

      onSuccess?.(note);
      handleOpenChange(false);
    } catch (err) {
      console.error('Failed to create note:', err);
      setError('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [investigationId, content, noteType, visibility, onSuccess, handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Investigation Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Note type and visibility row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Note type selector */}
            <div className="space-y-2">
              <Label htmlFor="noteType">Note Type</Label>
              <Select
                value={noteType}
                onValueChange={(value) => setNoteType(value as NoteType)}
              >
                <SelectTrigger id="noteType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div>{type.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {type.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visibility selector */}
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(value) => setVisibility(value as NoteVisibility)}
              >
                <SelectTrigger id="visibility">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div>{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rich text editor */}
          <div className="space-y-2">
            <Label>Note Content</Label>
            <RichTextEditor
              content={content}
              onChange={handleContentChange}
              placeholder="Write your investigation note here..."
              draftKey={`investigation-note-${investigationId}`}
              minHeight="250px"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
