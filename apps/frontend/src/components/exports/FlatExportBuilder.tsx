'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Download, Eye, FileSpreadsheet, FileText, Loader2, CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * Field tag types matching backend enum.
 */
type FieldTag = 'AUDIT' | 'BOARD' | 'PII' | 'SENSITIVE' | 'EXTERNAL' | 'MIGRATION';

/**
 * Export preset configuration.
 */
interface Preset {
  name: string;
  description: string;
  tags: { include: FieldTag[]; exclude: FieldTag[] };
}

/**
 * Preview response data.
 */
interface PreviewData {
  fields: { field: string; label: string }[];
  rowCount: number;
  sampleData: Record<string, unknown>[];
}

/**
 * Color mapping for field tags.
 */
const tagColors: Record<FieldTag, string> = {
  AUDIT: 'bg-blue-100 text-blue-800',
  BOARD: 'bg-purple-100 text-purple-800',
  PII: 'bg-red-100 text-red-800',
  SENSITIVE: 'bg-orange-100 text-orange-800',
  EXTERNAL: 'bg-green-100 text-green-800',
  MIGRATION: 'bg-gray-100 text-gray-800',
};

/**
 * FlatExportBuilder - Export configuration UI with presets.
 *
 * Allows users to configure and execute flat file exports with:
 * - Quick export presets (Audit, Board, External, Migration, Full)
 * - Tag-based field selection (include/exclude)
 * - Date range filtering
 * - Format selection (CSV/XLSX)
 * - Preview with sample data
 * - PII/Sensitive data warnings
 */
export function FlatExportBuilder() {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [includeTags, setIncludeTags] = useState<FieldTag[]>([]);
  const [excludeTags, setExcludeTags] = useState<FieldTag[]>(['PII', 'SENSITIVE']);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('xlsx');
  const [exportMode, setExportMode] = useState<'normalized' | 'denormalized'>('denormalized');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);

  // Fetch presets
  const { data: presetsData } = useQuery({
    queryKey: ['export-presets'],
    queryFn: async () => {
      return apiClient.get<{ presets: Preset[] }>('/exports/flat/presets');
    },
  });

  // Fetch tags
  const { data: tagsData } = useQuery({
    queryKey: ['export-tags'],
    queryFn: async () => {
      return apiClient.get<{ tags: { value: FieldTag; label: string; description: string }[] }>(
        '/exports/flat/tags',
      );
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post<PreviewData>('/exports/flat/preview', {
        includeTags: includeTags.length > 0 ? includeTags : undefined,
        excludeTags: excludeTags.length > 0 ? excludeTags : undefined,
        format: exportFormat,
        mode: exportMode,
        filters: dateRange.from && dateRange.to ? {
          dateRange: {
            start: dateRange.from.toISOString(),
            end: dateRange.to.toISOString(),
          },
        } : undefined,
      });
    },
    onSuccess: (data) => {
      setPreview(data);
    },
    onError: () => {
      toast.error('Preview failed', {
        description: 'Failed to generate preview. Please try again.',
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/exports/flat/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includeTags: includeTags.length > 0 ? includeTags : undefined,
          excludeTags: excludeTags.length > 0 ? excludeTags : undefined,
          format: exportFormat,
          mode: exportMode,
          filters: dateRange.from && dateRange.to ? {
            dateRange: {
              start: dateRange.from.toISOString(),
              end: dateRange.to.toISOString(),
            },
          } : undefined,
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case-export-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export downloaded', {
        description: 'Your export file has been downloaded.',
      });
    },
    onError: () => {
      toast.error('Export failed', {
        description: 'Failed to generate export. Please try again.',
      });
    },
  });

  // Apply preset
  const applyPreset = (preset: Preset) => {
    setSelectedPreset(preset.name);
    setIncludeTags(preset.tags.include);
    setExcludeTags(preset.tags.exclude);
    setPreview(null);
  };

  // Toggle include tag
  const toggleIncludeTag = (tag: FieldTag) => {
    setIncludeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
    setSelectedPreset(null);
    setPreview(null);
  };

  // Toggle exclude tag
  const toggleExcludeTag = (tag: FieldTag) => {
    setExcludeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
    setSelectedPreset(null);
    setPreview(null);
  };

  // Check for PII/Sensitive inclusion
  const includesPii = useMemo(() => !excludeTags.includes('PII'), [excludeTags]);
  const includesSensitive = useMemo(() => !excludeTags.includes('SENSITIVE'), [excludeTags]);

  return (
    <div className="space-y-6">
      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Export Presets</CardTitle>
          <CardDescription>
            Select a preset to quickly configure common export scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {presetsData?.presets.map((preset) => (
              <Button
                key={preset.name}
                variant={selectedPreset === preset.name ? 'default' : 'outline'}
                className="h-auto py-3 flex flex-col items-start text-left"
                onClick={() => applyPreset(preset)}
              >
                <span className="font-medium">{preset.name}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {preset.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tag Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Field Selection by Tags</CardTitle>
            <CardDescription>
              Choose which types of fields to include or exclude from your export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Include fields with tags:</Label>
              <div className="flex flex-wrap gap-2">
                {tagsData?.tags.map((tag) => (
                  <Badge
                    key={tag.value}
                    variant="outline"
                    className={cn(
                      'cursor-pointer transition-colors',
                      includeTags.includes(tag.value)
                        ? tagColors[tag.value]
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100',
                    )}
                    onClick={() => toggleIncludeTag(tag.value)}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to include all fields (except excluded)
              </p>
            </div>

            <div>
              <Label className="mb-2 block">Exclude fields with tags:</Label>
              <div className="flex flex-wrap gap-2">
                {tagsData?.tags.map((tag) => (
                  <Badge
                    key={tag.value}
                    variant="outline"
                    className={cn(
                      'cursor-pointer transition-colors',
                      excludeTags.includes(tag.value)
                        ? 'bg-red-100 text-red-800 line-through'
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100',
                    )}
                    onClick={() => toggleExcludeTag(tag.value)}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>

            {(includesPii || includesSensitive) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Data Sensitivity Warning
                  </p>
                  <p className="text-sm text-amber-700">
                    Export will include{' '}
                    {includesPii && 'PII (Personal Information)'}
                    {includesPii && includesSensitive && ' and '}
                    {includesSensitive && 'Sensitive data'}
                    . This will be logged for audit purposes.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Format</Label>
              <div className="flex gap-2">
                <Button
                  variant={exportFormat === 'xlsx' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('xlsx')}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button
                  variant={exportFormat === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('csv')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Structure</Label>
              <div className="flex gap-2">
                <Button
                  variant={exportMode === 'denormalized' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportMode('denormalized')}
                >
                  Single Sheet
                </Button>
                <Button
                  variant={exportMode === 'normalized' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportMode('normalized')}
                >
                  Multi-Sheet
                </Button>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Date Range (optional)</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal flex-1',
                        !dateRange.from && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, 'MMM dd, yyyy') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal flex-1',
                        !dateRange.to && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Reason (for audit log)</Label>
              <Textarea
                placeholder="Why are you exporting this data?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Preview columns and sample data before downloading
            </CardDescription>
          </div>
          <Button
            onClick={() => previewMutation.mutate()}
            disabled={previewMutation.isPending}
          >
            {previewMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Generate Preview
          </Button>
        </CardHeader>
        {preview && (
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {preview.fields.length} columns, {preview.rowCount.toLocaleString()} total rows
            </p>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.fields.map((f) => (
                      <TableHead key={f.field} className="whitespace-nowrap">
                        {f.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.sampleData.map((row, i) => (
                    <TableRow key={i}>
                      {preview.fields.map((f) => (
                        <TableCell key={f.field} className="max-w-[200px] truncate">
                          {String(row[f.field] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {preview.sampleData.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={preview.fields.length}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No data matches the current filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download Export
        </Button>
      </div>
    </div>
  );
}
