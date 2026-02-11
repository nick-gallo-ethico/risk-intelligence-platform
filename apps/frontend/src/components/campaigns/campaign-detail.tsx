"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Play,
  Pause,
  StopCircle,
  Bell,
  Loader2,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Settings,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  useLaunchCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useCancelCampaign,
  useSendReminders,
  useCampaignAssignments,
} from "@/hooks/use-campaigns";
import type { Campaign, CampaignAssignment } from "@/types/campaign";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_TYPE_COLORS,
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_COLORS,
} from "@/types/campaign";

interface CampaignDetailProps {
  campaign: Campaign;
  isLoading?: boolean;
}

/**
 * CampaignDetail - Detailed view of a single campaign.
 *
 * Features:
 * - Header with status/type badges and lifecycle action buttons
 * - Tabbed interface: Overview, Assignments, Settings
 * - Overview tab shows summary stats and progress
 * - Assignments tab shows paginated assignment list
 * - Settings tab shows campaign configuration
 */
export function CampaignDetail({ campaign, isLoading }: CampaignDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showLaunchDialog, setShowLaunchDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Mutations for lifecycle actions
  const launchMutation = useLaunchCampaign();
  const pauseMutation = usePauseCampaign();
  const resumeMutation = useResumeCampaign();
  const cancelMutation = useCancelCampaign();
  const remindersMutation = useSendReminders();

  // Assignments query (only when on assignments tab)
  const { data: assignmentsData, isLoading: assignmentsLoading } =
    useCampaignAssignments(campaign.id, { take: 50 });

  const assignments = assignmentsData?.data || [];
  const totalAssignments = assignmentsData?.total || 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "PPP");
    } catch {
      return dateStr;
    }
  };

  // Handle launch
  const handleLaunch = async () => {
    try {
      await launchMutation.mutateAsync({
        id: campaign.id,
        notifyImmediately: true,
      });
      toast.success("Campaign launched successfully");
      setShowLaunchDialog(false);
    } catch {
      toast.error("Failed to launch campaign");
    }
  };

  // Handle pause
  const handlePause = async () => {
    try {
      await pauseMutation.mutateAsync(campaign.id);
      toast.success("Campaign paused");
    } catch {
      toast.error("Failed to pause campaign");
    }
  };

  // Handle resume
  const handleResume = async () => {
    try {
      await resumeMutation.mutateAsync(campaign.id);
      toast.success("Campaign resumed");
    } catch {
      toast.error("Failed to resume campaign");
    }
  };

  // Handle cancel
  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({
        id: campaign.id,
        reason: "Cancelled by user",
      });
      toast.success("Campaign cancelled");
      setShowCancelDialog(false);
    } catch {
      toast.error("Failed to cancel campaign");
    }
  };

  // Handle send reminders
  const handleSendReminders = async () => {
    try {
      await remindersMutation.mutateAsync(campaign.id);
      toast.success("Reminders sent to incomplete assignments");
    } catch {
      toast.error("Failed to send reminders");
    }
  };

  // Render lifecycle action buttons based on status
  const renderActionButtons = () => {
    const isPending =
      launchMutation.isPending ||
      pauseMutation.isPending ||
      resumeMutation.isPending ||
      cancelMutation.isPending ||
      remindersMutation.isPending;

    switch (campaign.status) {
      case "DRAFT":
        return (
          <Button
            onClick={() => setShowLaunchDialog(true)}
            disabled={isPending}
          >
            {launchMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Launch
          </Button>
        );

      case "ACTIVE":
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSendReminders}
              disabled={isPending}
            >
              {remindersMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bell className="mr-2 h-4 w-4" />
              )}
              Send Reminders
            </Button>
            <Button
              variant="secondary"
              onClick={handlePause}
              disabled={isPending}
            >
              {pauseMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Pause className="mr-2 h-4 w-4" />
              )}
              Pause
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowCancelDialog(true)}
              disabled={isPending}
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        );

      case "PAUSED":
        return (
          <div className="flex items-center gap-2">
            <Button onClick={handleResume} disabled={isPending}>
              {resumeMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Resume
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowCancelDialog(true)}
              disabled={isPending}
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        );

      case "SCHEDULED":
        return (
          <Button
            variant="destructive"
            onClick={() => setShowCancelDialog(true)}
            disabled={isPending}
          >
            <StopCircle className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {campaign.name}
              </h1>
              <Badge
                variant="outline"
                className={CAMPAIGN_STATUS_COLORS[campaign.status]}
              >
                {CAMPAIGN_STATUS_LABELS[campaign.status]}
              </Badge>
              <Badge
                variant="outline"
                className={CAMPAIGN_TYPE_COLORS[campaign.type]}
              >
                {CAMPAIGN_TYPE_LABELS[campaign.type]}
              </Badge>
            </div>
            {campaign.description && (
              <p className="text-muted-foreground mt-1">
                {campaign.description}
              </p>
            )}
          </div>
        </div>
        <div>{renderActionButtons()}</div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <FileText className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Users className="mr-2 h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Assignments</CardDescription>
                <CardTitle className="text-3xl">
                  {campaign.totalAssignments.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl text-green-600">
                  {campaign.completedAssignments.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Overdue</CardDescription>
                <CardTitle className="text-3xl text-red-600">
                  {campaign.overdueAssignments.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completion Rate</CardDescription>
                <CardTitle className="text-3xl">
                  {campaign.completionPercentage}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress
                  value={campaign.completionPercentage}
                  className="h-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(campaign.dueDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {formatDate(campaign.startDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Launched At</p>
                  <p className="font-medium">
                    {formatDate(campaign.launchedAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">
                    {formatDate(campaign.createdAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="font-medium">{campaign.ownerName || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Bar */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {campaign.completedAssignments} of{" "}
                    {campaign.totalAssignments} completed
                  </span>
                  <span className="font-medium">
                    {campaign.completionPercentage}%
                  </span>
                </div>
                <Progress
                  value={campaign.completionPercentage}
                  className="h-4"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>
                {totalAssignments} total assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assignments found for this campaign.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned At</TableHead>
                      <TableHead>Completed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment: CampaignAssignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.employeeSnapshot?.firstName || ""}{" "}
                          {assignment.employeeSnapshot?.lastName || ""}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {assignment.employeeSnapshot?.email || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {assignment.employeeSnapshot?.department || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              ASSIGNMENT_STATUS_COLORS[assignment.status]
                            }
                          >
                            {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(assignment.assignedAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(assignment.completedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Configuration</CardTitle>
              <CardDescription>
                {campaign.status === "DRAFT"
                  ? "You can edit this campaign before launching"
                  : "Campaign settings are read-only after launch"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Campaign Type
                  </p>
                  <p className="font-medium">
                    {CAMPAIGN_TYPE_LABELS[campaign.type]}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Due Date
                  </p>
                  <p className="font-medium">{formatDate(campaign.dueDate)}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Description
                  </p>
                  <p className="font-medium">
                    {campaign.description || "No description provided"}
                  </p>
                </div>
              </div>

              {campaign.status === "DRAFT" && (
                <div className="pt-4 border-t">
                  <Link href={`/campaigns/new?edit=true&id=${campaign.id}`}>
                    <Button variant="outline">
                      <Settings className="mr-2 h-4 w-4" />
                      Edit Campaign
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Launch Confirmation Dialog */}
      <AlertDialog open={showLaunchDialog} onOpenChange={setShowLaunchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Launch Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send notifications to{" "}
              {campaign.totalAssignments.toLocaleString()} employees. Are you
              sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLaunch}
              disabled={launchMutation.isPending}
            >
              {launchMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Launch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All pending assignments will be
              cancelled and employees will no longer be able to respond.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Campaign</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <StopCircle className="mr-2 h-4 w-4" />
              )}
              Cancel Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default CampaignDetail;
