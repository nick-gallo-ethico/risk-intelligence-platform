'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Save, RotateCcw } from 'lucide-react';

/**
 * Field tag types matching backend enum.
 */
type FieldTag = 'AUDIT' | 'BOARD' | 'PII' | 'SENSITIVE' | 'EXTERNAL' | 'MIGRATION';

/**
 * Tagged field definition.
 */
interface TaggedField {
  entity: string;
  field: string;
  label: string;
  path: string;
  type: string;
  tags: FieldTag[];
  description?: string;
}

/**
 * Field tag metadata.
 */
interface FieldTagInfo {
  value: FieldTag;
  label: string;
  description: string;
}

/**
 * Color mapping for field tags.
 */
const tagColors: Record<FieldTag, string> = {
  AUDIT: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  BOARD: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  PII: 'bg-red-100 text-red-800 hover:bg-red-200',
  SENSITIVE: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  EXTERNAL: 'bg-green-100 text-green-800 hover:bg-green-200',
  MIGRATION: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
};

/**
 * TaggedFieldConfig - Admin component for managing field semantic tags.
 *
 * Allows administrators to customize which semantic tags are applied to
 * platform fields, controlling their inclusion in different export types.
 */
export function TaggedFieldConfig() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [pendingChanges, setPendingChanges] = useState<Map<string, FieldTag[]>>(new Map());

  // Fetch fields with their tags
  const { data: fieldsData, isLoading: fieldsLoading } = useQuery({
    queryKey: ['export-fields'],
    queryFn: async () => {
      return apiClient.get<{ fields: TaggedField[] }>('/exports/flat/fields');
    },
  });

  // Fetch available tags
  const { data: tagsData } = useQuery({
    queryKey: ['export-tags'],
    queryFn: async () => {
      return apiClient.get<{ tags: FieldTagInfo[] }>('/exports/flat/tags');
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (updates: { entity: string; field: string; tags: FieldTag[] }[]) => {
      return apiClient.post('/exports/flat/fields/tags', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-fields'] });
      setPendingChanges(new Map());
      toast.success('Field tags updated', {
        description: 'Your field tag configuration has been saved.',
      });
    },
    onError: () => {
      toast.error('Update failed', {
        description: 'Failed to update field tags. Please try again.',
      });
    },
  });

  // Get unique entities for filter dropdown
  const entities = useMemo(() => {
    if (!fieldsData?.fields) return [];
    return [...new Set(fieldsData.fields.map((f) => f.entity))].sort();
  }, [fieldsData]);

  // Filter fields based on search and entity filter
  const filteredFields = useMemo(() => {
    if (!fieldsData?.fields) return [];
    return fieldsData.fields.filter((field) => {
      const matchesSearch =
        search === '' ||
        field.label.toLowerCase().includes(search.toLowerCase()) ||
        field.field.toLowerCase().includes(search.toLowerCase()) ||
        field.entity.toLowerCase().includes(search.toLowerCase());
      const matchesEntity = entityFilter === 'all' || field.entity === entityFilter;
      return matchesSearch && matchesEntity;
    });
  }, [fieldsData, search, entityFilter]);

  // Get current tags for a field (pending changes take precedence)
  const getFieldTags = (field: TaggedField): FieldTag[] => {
    const key = `${field.entity}.${field.field}`;
    return pendingChanges.get(key) || field.tags;
  };

  // Toggle a tag for a field
  const toggleTag = (field: TaggedField, tag: FieldTag) => {
    const key = `${field.entity}.${field.field}`;
    const currentTags = getFieldTags(field);
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    setPendingChanges((prev) => new Map(prev).set(key, newTags));
  };

  // Save all pending changes
  const handleSave = () => {
    const updates = Array.from(pendingChanges.entries()).map(([key, tags]) => {
      const [entity, field] = key.split('.');
      return { entity, field, tags };
    });
    saveMutation.mutate(updates);
  };

  // Reset all pending changes
  const handleReset = () => {
    setPendingChanges(new Map());
  };

  const hasChanges = pendingChanges.size > 0;

  if (fieldsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters and actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {entities.map((entity) => (
                <SelectItem key={entity} value={entity}>
                  {entity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes ({pendingChanges.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tag legend */}
      <div className="flex flex-wrap gap-2 text-sm">
        {tagsData?.tags.map((tag) => (
          <div key={tag.value} className="flex items-center gap-1">
            <Badge variant="outline" className={tagColors[tag.value]}>
              {tag.label}
            </Badge>
            <span className="text-muted-foreground">- {tag.description}</span>
          </div>
        ))}
      </div>

      {/* Fields table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Entity</TableHead>
              <TableHead>Field</TableHead>
              <TableHead className="w-96">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFields.map((field) => {
              const fieldTags = getFieldTags(field);
              const key = `${field.entity}.${field.field}`;
              const isModified = pendingChanges.has(key);

              return (
                <TableRow
                  key={key}
                  className={isModified ? 'bg-yellow-50 dark:bg-yellow-950/20' : undefined}
                >
                  <TableCell className="font-medium">{field.entity}</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{field.label}</span>
                      <span className="text-muted-foreground text-xs ml-2">
                        {field.field}
                      </span>
                      {field.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {field.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tagsData?.tags.map((tag) => (
                        <Badge
                          key={tag.value}
                          variant="outline"
                          className={`cursor-pointer transition-colors ${
                            fieldTags.includes(tag.value)
                              ? tagColors[tag.value]
                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800'
                          }`}
                          onClick={() => toggleTag(field, tag.value)}
                          title={tag.description}
                        >
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredFields.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No fields match your search criteria
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredFields.length} of {fieldsData?.fields.length || 0} fields
        {hasChanges && (
          <span className="ml-2 text-yellow-600 dark:text-yellow-400">
            ({pendingChanges.size} unsaved changes)
          </span>
        )}
      </div>
    </div>
  );
}
