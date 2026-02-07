'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Search,
  Clipboard,
  Shield,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';

interface UnifiedTask {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  dueDate: string | null;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  assignedAt: string;
  url: string;
  caseNumber?: string;
  categoryName?: string;
  severity?: string;
}

interface TaskSection {
  name: string;
  tasks: UnifiedTask[];
  count: number;
}

interface MyWorkResponse {
  sections: TaskSection[];
  total: number;
  hasMore: boolean;
}

/**
 * My Tasks component for dashboard.
 *
 * Shows all pending tasks across the platform:
 * - Case assignments
 * - Investigation steps
 * - Approval requests
 * - Disclosure reviews
 * - Remediation tasks
 */
export function MyTasks() {
  const router = useRouter();

  const {
    data: myWork,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['my-work'],
    queryFn: async (): Promise<MyWorkResponse> => {
      try {
        const response = await api.get('/my-work', {
          params: { limit: 10 },
        });
        // Handle various response shapes
        if (response.data?.sections) {
          return response.data;
        }
        // If it's a flat array, wrap it
        if (Array.isArray(response.data)) {
          return {
            sections: [{ name: 'My Tasks', tasks: response.data, count: response.data.length }],
            total: response.data.length,
            hasMore: false,
          };
        }
        return { sections: [], total: 0, hasMore: false };
      } catch (err) {
        console.error('Failed to fetch my-work:', err);
        return { sections: [], total: 0, hasMore: false };
      }
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'CASE_ASSIGNMENT':
        return <FileText className="h-4 w-4" />;
      case 'INVESTIGATION_STEP':
        return <Search className="h-4 w-4" />;
      case 'APPROVAL_REQUEST':
        return <CheckCircle className="h-4 w-4" />;
      case 'DISCLOSURE_REVIEW':
        return <Clipboard className="h-4 w-4" />;
      case 'REMEDIATION_TASK':
        return <Shield className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge variant="destructive">Critical</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const isPastDue = date < new Date();
    return (
      <span className={isPastDue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
        {isPastDue ? 'Overdue: ' : 'Due: '}
        {formatDistanceToNow(date, { addSuffix: true })}
      </span>
    );
  };

  const allTasks = myWork?.sections.flatMap((s) => s.tasks) || [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            My Tasks
            {myWork && myWork.total > 0 && (
              <Badge variant="secondary" className="ml-2">
                {myWork.total}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push('/my-work')}>
            View All
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : allTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground">No pending tasks right now</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="divide-y">
              {allTasks.slice(0, 10).map((task) => (
                <div
                  key={task.id}
                  className="p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => {
                    if (task.url) {
                      router.push(task.url);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                      {getTaskIcon(task.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {getPriorityBadge(task.priority)}
                      </div>
                      {task.caseNumber && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {task.caseNumber}
                          {task.categoryName && ` · ${task.categoryName}`}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        {formatDueDate(task.dueDate)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
