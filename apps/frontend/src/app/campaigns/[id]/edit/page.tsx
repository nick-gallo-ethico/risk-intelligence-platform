'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CampaignBuilder, type CampaignDraft } from '@/components/campaigns/CampaignBuilder';
import { apiClient } from '@/lib/api';

/**
 * Campaign edit page.
 * Route: /campaigns/:id/edit
 *
 * Only draft campaigns can be fully edited.
 * Launched campaigns have restricted editing capabilities.
 */
export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load campaign data
  useEffect(() => {
    const loadCampaign = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<any>(`/campaigns/${campaignId}`);

        // Transform API response to CampaignDraft
        const draft: CampaignDraft = {
          id: response.id,
          name: response.name,
          description: response.description || '',
          type: response.type,
          formTemplateId: response.formDefinitionId,
          audienceCriteria: response.segment?.criteria || null,
          audienceCount: response._count?.assignments || response.totalAssignments || 0,
          schedule: {
            launchType: response.launchAt ? 'scheduled' : 'immediate',
            launchDate: response.launchAt ? new Date(response.launchAt) : undefined,
            launchTime: '09:00',
            timezone: 'America/New_York',
            deadlineType: 'absolute',
            deadlineDate: response.dueDate ? new Date(response.dueDate) : undefined,
            reminders: (response.reminderDays || [7, 3, 1]).map((days: number, i: number) => ({
              id: `reminder-${i}`,
              daysBeforeDeadline: days,
              ccManager: i > 0,
              ccHR: i > 1,
            })),
          },
          status: response.status?.toLowerCase() || 'draft',
        };

        setCampaign(draft);
      } catch (err: any) {
        console.error('Failed to load campaign:', err);
        setError(err.message || 'Failed to load campaign');

        // Demo data for development
        setCampaign({
          id: campaignId,
          name: 'Q1 2026 COI Disclosure',
          description: 'Annual conflict of interest disclosure for all employees',
          type: 'DISCLOSURE',
          formTemplateId: 'form-1',
          audienceCriteria: {
            logic: 'AND',
            conditions: [
              { field: 'departmentId', operator: 'in', value: ['dept-1', 'dept-2'] },
            ],
          },
          audienceCount: 183,
          schedule: {
            launchType: 'scheduled',
            launchDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            launchTime: '09:00',
            timezone: 'America/New_York',
            deadlineType: 'absolute',
            deadlineDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            reminders: [
              { id: '1', daysBeforeDeadline: 7, ccManager: false, ccHR: false },
              { id: '2', daysBeforeDeadline: 3, ccManager: true, ccHR: false },
              { id: '3', daysBeforeDeadline: 1, ccManager: true, ccHR: true },
            ],
          },
          status: 'draft',
        });
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId]);

  // Check if campaign is editable
  const isEditable = campaign?.status === 'draft';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="container mx-auto max-w-5xl py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/campaigns')}
          className="mb-4"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Campaigns
        </Button>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold">Campaign Not Found</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button
              className="mt-4"
              onClick={() => router.push('/campaigns')}
            >
              Go to Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isEditable) {
    return (
      <div className="container mx-auto max-w-5xl py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/campaigns')}
          className="mb-4"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Campaigns
        </Button>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="mb-4 h-12 w-12 text-amber-500" />
            <h2 className="mb-2 text-xl font-semibold">Campaign Cannot Be Edited</h2>
            <p className="mb-4 text-muted-foreground">
              This campaign has already been launched and cannot be fully edited.
            </p>
            <Badge variant="secondary" className="mb-4">
              Status: {campaign?.status?.toUpperCase()}
            </Badge>
            <p className="text-sm text-muted-foreground">
              You can only modify reminder settings for active campaigns.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push(`/campaigns/${campaignId}`)}
            >
              View Campaign
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/campaigns')}
          className="mb-4"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Campaigns
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Edit Campaign</h1>
          <Badge variant="outline">Draft</Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          Modify your campaign settings before launching
        </p>
      </div>

      {/* Campaign Builder with initial data */}
      {campaign && (
        <CampaignBuilder
          campaignId={campaignId}
          initialData={campaign}
        />
      )}
    </div>
  );
}
