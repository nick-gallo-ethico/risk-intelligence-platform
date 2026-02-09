'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FolderKanban, Plus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  startDate: string;
  targetDate: string;
  progress: number;
}

export default function ProjectsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchProjects();
    }
  }, [user, authLoading, router]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects', {
        params: { limit: 50 },
      });
      setProjects(response.data.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid gap-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Projects help you track implementation milestones and tasks
              </p>
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="cursor-pointer hover:bg-accent/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge variant={project.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{project.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                  <span>Target: {new Date(project.targetDate).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
