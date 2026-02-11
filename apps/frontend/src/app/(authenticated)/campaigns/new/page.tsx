"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CampaignBuilder, type CampaignDraft } from "@/components/campaigns";
import { useCreateCampaign, useLaunchCampaign } from "@/hooks/use-campaigns";
import type { CreateCampaignDto } from "@/types/campaign";

/**
 * Create Campaign Page
 *
 * Renders the CampaignBuilder wizard for creating new campaigns.
 * Route: /campaigns/new
 */
export default function CreateCampaignPage() {
  const router = useRouter();
  const createCampaign = useCreateCampaign();
  const launchCampaign = useLaunchCampaign();

  /**
   * Convert CampaignDraft to CreateCampaignDto.
   * Maps wizard data to API-compatible format.
   */
  const buildCreateDto = (draft: CampaignDraft): CreateCampaignDto => {
    return {
      name: draft.name,
      description: draft.description,
      type: draft.type as CreateCampaignDto["type"],
      formTemplateId: draft.formTemplateId,
      dueDate:
        draft.schedule?.deadlineDate?.toISOString() || new Date().toISOString(),
      startDate: draft.schedule?.launchDate?.toISOString(),
    };
  };

  /**
   * Handle saving a campaign draft.
   */
  const handleSave = async (draft: CampaignDraft) => {
    try {
      const campaign = await createCampaign.mutateAsync(buildCreateDto(draft));

      toast.success("Campaign saved successfully");
      router.push(`/campaigns/${campaign.id}`);
    } catch (error) {
      toast.error("Failed to save campaign");
      throw error;
    }
  };

  /**
   * Handle launching a campaign immediately after creation.
   */
  const handleLaunch = async (draft: CampaignDraft) => {
    try {
      // First create the campaign
      const campaign = await createCampaign.mutateAsync(buildCreateDto(draft));

      // Then launch it
      await launchCampaign.mutateAsync({
        id: campaign.id,
        notifyImmediately: draft.schedule?.launchType === "immediate",
      });

      toast.success("Campaign launched successfully");
      router.push(`/campaigns/${campaign.id}`);
    } catch (error) {
      toast.error("Failed to launch campaign");
      throw error;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Create Campaign
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up a new disclosure, attestation, or survey campaign
          </p>
        </div>
      </div>

      {/* Campaign Builder Wizard */}
      <CampaignBuilder onSave={handleSave} onLaunch={handleLaunch} />
    </div>
  );
}
