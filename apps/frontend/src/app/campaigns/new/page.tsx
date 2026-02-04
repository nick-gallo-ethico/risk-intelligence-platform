'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CampaignBuilder } from '@/components/campaigns/CampaignBuilder';

/**
 * Campaign creation page.
 * Route: /campaigns/new
 */
export default function CreateCampaignPage() {
  const router = useRouter();

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
        <h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
        <p className="mt-2 text-muted-foreground">
          Set up a new disclosure, attestation, or survey campaign
        </p>
      </div>

      {/* Campaign Builder */}
      <CampaignBuilder />
    </div>
  );
}
