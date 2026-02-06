'use client';

/**
 * Project Detail Page
 *
 * Shows implementation project details with:
 * - Project overview (status, phase, health, target date)
 * - Checklist tasks grouped by phase
 * - Blocker list with escalation status
 * - Link to go-live readiness
 */

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ChecklistPanel } from '@/components/implementation/ChecklistPanel';
import { BlockerCard } from '@/components/implementation/BlockerCard';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Rocket,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  name: string;
  status: string;
  isRequired: boolean;
  dueDate: string | null;
  notes: string | null;
  phase: string;
}

interface Blocker {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  createdAt: string;
  escalatedToManagerAt: string | null;
  escalatedToDirectorAt: string | null;
}

interface Project {
  id: string;
  type: string;
  status: string;
  currentPhase: string;
  healthScore: number;
  targetGoLiveDate: string | null;
  organization: { name: string };
  tasks?: Task[];
  blockers?: Blocker[];
}

type TasksByPhase = Record<string, Task[]>;

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function formatPhase(phase: string): string {
  return phase
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const queryClient = useQueryClient();

  const {
    data: project,
    isLoading,
    error,
  } = useQuery<Project>({
    queryKey: ['implementation', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/implementations/${projectId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch project');
      }
      return res.json();
    },
    enabled: !!projectId,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: string;
    }) => {
      const res = await fetch(
        `/api/v1/internal/implementations/${projectId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) {
        throw new Error('Failed to update task');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['implementation', projectId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading project...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-24">
        <p className="text-red-500 mb-4">Failed to load project.</p>
        <Link
          href="/internal/implementation"
          className="text-blue-600 hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  // Group tasks by phase
  const tasksByPhase: TasksByPhase =
    project.tasks?.reduce((acc: TasksByPhase, task: Task) => {
      if (!acc[task.phase]) acc[task.phase] = [];
      acc[task.phase].push(task);
      return acc;
    }, {}) || {};

  // Determine health score color
  const healthColor =
    project.healthScore >= 80
      ? 'text-green-600'
      : project.healthScore >= 60
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/internal/implementation"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {project.organization?.name}
          </h1>
          <p className="text-gray-500">
            {project.type?.replace(/_/g, ' ')} Implementation
          </p>
        </div>
        <Link
          href={`/internal/implementation/${projectId}/go-live`}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Rocket className="h-4 w-4" />
          Go-Live Readiness
        </Link>
      </div>

      {/* Project info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Status</div>
          <div className="font-semibold text-gray-900">
            {formatStatus(project.status || '')}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Current Phase</div>
          <div className="font-semibold text-gray-900">
            {formatPhase(project.currentPhase || '')}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Target Go-Live</div>
          <div className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            {project.targetGoLiveDate
              ? format(new Date(project.targetGoLiveDate), 'MMM d, yyyy')
              : 'Not set'}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Health Score</div>
          <div className={cn('text-2xl font-bold', healthColor)}>
            {project.healthScore}%
          </div>
        </div>
      </div>

      {/* Two column layout: Checklist + Blockers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Implementation Checklist
            </h2>
            {updateTaskMutation.isPending && (
              <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {Object.keys(tasksByPhase).length === 0 ? (
            <div className="p-8 bg-white border rounded-lg text-center text-gray-500">
              No tasks found. Initialize checklist from a template.
            </div>
          ) : (
            Object.entries(tasksByPhase).map(([phase, tasks]) => (
              <ChecklistPanel
                key={phase}
                phase={phase}
                tasks={tasks}
                onTaskUpdate={(taskId, status) =>
                  updateTaskMutation.mutate({ taskId, status })
                }
              />
            ))
          )}
        </div>

        {/* Blockers */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Blockers ({project.blockers?.length || 0})
          </h2>

          {!project.blockers || project.blockers.length === 0 ? (
            <div className="p-6 bg-gray-50 border border-dashed rounded-lg text-center text-gray-500 text-sm">
              No active blockers
            </div>
          ) : (
            <div className="space-y-3">
              {project.blockers.map((blocker) => (
                <BlockerCard key={blocker.id} blocker={blocker} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
