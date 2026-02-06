'use client';

/**
 * Implementation Dashboard Page
 *
 * Main dashboard showing all implementation projects with:
 * - Status filters (All, Not Started, In Progress, At Risk, Completed)
 * - Summary statistics
 * - Project cards with health scores and go-live dates
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ProjectCard } from '@/components/implementation/ProjectCard';
import { Plus, Filter, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  type: string;
  status: string;
  currentPhase: string;
  healthScore: number;
  targetGoLiveDate: string | null;
  organization: { name: string };
}

interface ProjectsResponse {
  items: Project[];
  total: number;
}

const STATUS_OPTIONS = [
  { value: null, label: 'All' },
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'AT_RISK', label: 'At Risk' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
] as const;

export default function ImplementationDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<ProjectsResponse>({
    queryKey: ['implementations', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/v1/internal/implementations?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch implementations');
      }
      return res.json();
    },
  });

  // Calculate statistics from data
  const stats = {
    total: data?.total || 0,
    inProgress:
      data?.items?.filter((p) => p.status === 'IN_PROGRESS').length || 0,
    atRisk: data?.items?.filter((p) => p.status === 'AT_RISK').length || 0,
    completed:
      data?.items?.filter((p) => p.status === 'COMPLETED').length || 0,
    avgHealth:
      Math.round(
        (data?.items?.reduce((sum, p) => sum + p.healthScore, 0) || 0) /
          (data?.items?.length || 1)
      ) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Implementation Projects
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage client implementations
          </p>
        </div>
        <Link
          href="/internal/implementation/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-gray-500">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === opt.value
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Projects</div>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {stats.inProgress}
          </div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">
            {stats.atRisk}
          </div>
          <div className="text-sm text-gray-500">At Risk</div>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {stats.completed}
          </div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {stats.avgHealth}%
          </div>
          <div className="text-sm text-gray-500">Avg Health</div>
        </div>
      </div>

      {/* Project List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading projects...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">
          Failed to load projects. Please try again.
        </div>
      ) : data?.items?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No implementation projects found.</p>
          <Link
            href="/internal/implementation/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.items?.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
