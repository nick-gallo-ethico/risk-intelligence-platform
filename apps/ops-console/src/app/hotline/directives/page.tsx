'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DirectiveEditor } from '@/components/hotline/DirectiveEditor';
import { Plus, Building2, FileText, RefreshCw, Search, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Directive {
  id: string;
  organizationId: string;
  organization?: { id: string; name: string };
  stage: string;
  categoryId?: string;
  category?: { id: string; name: string };
  title: string;
  content: string;
  isReadAloud: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface DirectiveListResponse {
  items: Directive[];
  total: number;
}

export default function DirectivesPage() {
  const [selectedDirective, setSelectedDirective] = useState<Directive | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery<DirectiveListResponse>({
    queryKey: ['directives', searchTerm, showDraftsOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      params.set('includeInactive', 'true');
      if (showDraftsOnly) params.set('draftsOnly', 'true');
      const res = await fetch(`/api/v1/internal/hotline-ops/directives?${params}`);
      if (!res.ok) throw new Error('Failed to fetch directives');
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (directive: Partial<Directive> & { approveAndPublish?: boolean }) => {
      const url = directive.id
        ? `/api/v1/internal/hotline-ops/directives/${directive.id}`
        : '/api/v1/internal/hotline-ops/directives';
      const res = await fetch(url, {
        method: directive.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(directive),
      });
      if (!res.ok) throw new Error('Failed to save directive');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directives'] });
      setShowEditor(false);
      setSelectedDirective(null);
    },
  });

  // Group directives by organization
  const groupedByOrg = (data?.items || []).reduce(
    (acc: Record<string, Directive[]>, directive: Directive) => {
      const orgName = directive.organization?.name || 'Unknown Organization';
      if (!acc[orgName]) acc[orgName] = [];
      acc[orgName].push(directive);
      return acc;
    },
    {}
  );

  const orgNames = Object.keys(groupedByOrg).sort();

  const getStageLabel = (stage: string) => {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Directives Management</h1>
          <p className="text-gray-500">
            {data?.total || 0} directives across all clients
            {isFetching && !isLoading && (
              <RefreshCw className="h-3 w-3 inline ml-2 animate-spin text-primary" />
            )}
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedDirective(null);
            setShowEditor(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Directive
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or organization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showDraftsOnly}
            onChange={(e) => setShowDraftsOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span>Show drafts only</span>
        </label>
      </div>

      {/* Directive list by organization */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Loading directives...</span>
        </div>
      ) : orgNames.length === 0 ? (
        <div className="text-center py-12 bg-white border rounded-lg">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No directives found</p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-2 text-primary hover:underline text-sm"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {orgNames.map((orgName) => {
            const directives = groupedByOrg[orgName];
            return (
              <div key={orgName} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                {/* Organization header */}
                <div className="p-4 border-b flex items-center gap-2 bg-gray-50">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <h2 className="font-semibold">{orgName}</h2>
                  <span className="text-sm text-gray-500">
                    {directives.length} directive{directives.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Directives list */}
                <div className="divide-y">
                  {directives.map((directive) => (
                    <button
                      key={directive.id}
                      onClick={() => {
                        setSelectedDirective(directive);
                        setShowEditor(true);
                      }}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{directive.title}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                              {getStageLabel(directive.stage)}
                            </span>
                            <span>v{directive.version}</span>
                            {directive.isReadAloud && (
                              <span className="text-orange-600 flex items-center gap-1">
                                <span className="text-xs">Read Aloud</span>
                              </span>
                            )}
                            {directive.category && (
                              <span className="text-xs text-gray-400">
                                {directive.category.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {directive.isActive ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">
                            <Clock className="h-3 w-3" />
                            Draft
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor modal */}
      {showEditor && (
        <DirectiveEditor
          directive={selectedDirective}
          onSave={(data) => saveMutation.mutate(data)}
          onClose={() => {
            setShowEditor(false);
            setSelectedDirective(null);
          }}
          isLoading={saveMutation.isPending}
        />
      )}
    </div>
  );
}
