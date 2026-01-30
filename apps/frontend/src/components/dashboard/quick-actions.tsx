'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Quick Actions component for dashboard.
 * Provides shortcuts to common operations.
 */
export function QuickActions() {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button onClick={() => router.push('/cases/new')}>
          Create Case
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/cases?status=OPEN')}
        >
          My Open Cases
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/cases?sortBy=updatedAt&sortOrder=desc')}
        >
          Recent Activity
        </Button>
      </CardContent>
    </Card>
  );
}
