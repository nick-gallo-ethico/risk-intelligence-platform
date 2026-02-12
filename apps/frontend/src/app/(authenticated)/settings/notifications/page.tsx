"use client";

/**
 * User Notification Preferences Page
 *
 * HubSpot-style notification settings where users control per-category
 * notification channels (email and in-app). Features:
 * - Toggle switches that save immediately (no Save button)
 * - Categories grouped by urgency (Urgent, Activity, Collaboration)
 * - Quiet hours with time pickers
 * - Out of office with backup user delegation
 * - Enforced categories shown as disabled (cannot toggle off)
 */

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Clock,
  Calendar,
  Mail,
  Info,
  Lock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useSetOOO,
  useClearOOO,
} from "@/hooks/use-notification-preferences";
import { usersApi } from "@/services/users";
import { useQuery } from "@tanstack/react-query";
import type {
  NotificationCategory,
  CategoryPreference,
} from "@/types/notification-preferences";
import {
  NOTIFICATION_CATEGORY_GROUPS,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_DESCRIPTIONS,
} from "@/types/notification-preferences";

/**
 * Group header labels for category sections.
 */
const GROUP_LABELS: Record<
  keyof typeof NOTIFICATION_CATEGORY_GROUPS,
  { title: string; description: string }
> = {
  urgent: {
    title: "Urgent Notifications",
    description: "Critical alerts that require immediate attention",
  },
  activity: {
    title: "Activity Updates",
    description: "Updates on items you are following or involved with",
  },
  collaboration: {
    title: "Collaboration",
    description: "Notifications about team interactions and requests",
  },
};

/**
 * Common timezone options for display.
 */
const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
];

export default function NotificationPreferencesPage() {
  // Fetch preferences and mutations
  const { data: preferences, isLoading, error } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();
  const setOOOMutation = useSetOOO();
  const clearOOOMutation = useClearOOO();

  // Fetch users for backup selector (only active users)
  const { data: usersResponse } = useQuery({
    queryKey: ["users", "active"],
    queryFn: () => usersApi.list({ status: "ACTIVE" }, 1, 100),
    staleTime: 5 * 60 * 1000,
  });

  // Local state for OOO form
  const [oooEndDate, setOooEndDate] = useState("");
  const [oooBackupUserId, setOooBackupUserId] = useState("");

  // Check if currently OOO
  const isOOO =
    preferences?.oooUntil && new Date(preferences.oooUntil) > new Date();

  /**
   * Handle category toggle change.
   * Saves immediately via mutation.
   */
  const handleCategoryToggle = (
    category: NotificationCategory,
    channel: "email" | "inApp",
    newValue: boolean,
  ) => {
    if (!preferences) return;

    const currentPref = preferences.preferences[category] || {
      email: false,
      inApp: true,
    };
    const updatedPref: CategoryPreference = {
      ...currentPref,
      [channel]: newValue,
    };

    updateMutation.mutate(
      {
        preferences: {
          [category]: updatedPref,
        },
      },
      {
        onError: () => {
          toast.error("Failed to update preference. Please try again.");
        },
      },
    );
  };

  /**
   * Handle quiet hours toggle.
   */
  const handleQuietHoursToggle = (enabled: boolean) => {
    if (enabled) {
      // Set default quiet hours
      updateMutation.mutate({
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
      });
    } else {
      // Clear quiet hours
      updateMutation.mutate({
        quietHoursStart: "",
        quietHoursEnd: "",
      });
    }
  };

  /**
   * Handle quiet hours time change.
   */
  const handleQuietHoursChange = (field: "start" | "end", value: string) => {
    updateMutation.mutate({
      [field === "start" ? "quietHoursStart" : "quietHoursEnd"]: value,
    });
  };

  /**
   * Handle timezone change.
   */
  const handleTimezoneChange = (value: string) => {
    updateMutation.mutate({ timezone: value });
  };

  /**
   * Handle enabling OOO.
   */
  const handleEnableOOO = () => {
    if (!oooEndDate || !oooBackupUserId) {
      toast.error("Please select an end date and backup user.");
      return;
    }

    setOOOMutation.mutate(
      {
        backupUserId: oooBackupUserId,
        oooUntil: new Date(oooEndDate).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success(
            "Out of office enabled. Your backup user will receive urgent notifications.",
          );
        },
        onError: () => {
          toast.error("Failed to enable out of office. Please try again.");
        },
      },
    );
  };

  /**
   * Handle disabling OOO.
   */
  const handleDisableOOO = () => {
    clearOOOMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(
          "Out of office disabled. You will now receive notifications directly.",
        );
        setOooEndDate("");
        setOooBackupUserId("");
      },
      onError: () => {
        toast.error("Failed to disable out of office. Please try again.");
      },
    });
  };

  /**
   * Check if a category is enforced by the organization.
   */
  const isEnforced = (category: NotificationCategory): boolean => {
    return preferences?.enforcedCategories?.includes(category) ?? false;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">
              Failed to load notification preferences. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasQuietHours = !!(
    preferences?.quietHoursStart && preferences?.quietHoursEnd
  );

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notification Preferences
          </h1>
          <p className="text-muted-foreground mt-2">
            Control how and when you receive notifications
          </p>
        </div>

        <div className="space-y-6">
          {/* Communication Preferences - Category Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Communication Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified for each type of event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Column headers */}
              <div className="hidden md:grid md:grid-cols-[1fr,80px,80px] gap-4 pb-2 border-b">
                <div />
                <div className="text-center text-sm font-medium text-muted-foreground">
                  Email
                </div>
                <div className="text-center text-sm font-medium text-muted-foreground">
                  In-App
                </div>
              </div>

              {/* Category groups */}
              {(
                Object.keys(NOTIFICATION_CATEGORY_GROUPS) as Array<
                  keyof typeof NOTIFICATION_CATEGORY_GROUPS
                >
              ).map((groupKey, groupIndex) => (
                <div key={groupKey}>
                  {groupIndex > 0 && <Separator className="my-6" />}
                  <div className="mb-4">
                    <h4 className="font-medium">
                      {GROUP_LABELS[groupKey].title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {GROUP_LABELS[groupKey].description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {NOTIFICATION_CATEGORY_GROUPS[groupKey].map((category) => {
                      const pref = preferences?.preferences[category] || {
                        email: false,
                        inApp: true,
                      };
                      const enforced = isEnforced(category);

                      return (
                        <div
                          key={category}
                          className="grid grid-cols-1 md:grid-cols-[1fr,80px,80px] gap-4 items-center p-3 rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <Label className="font-normal">
                                  {NOTIFICATION_CATEGORY_LABELS[category]}
                                </Label>
                                {enforced && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Lock className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Required by your organization
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {NOTIFICATION_CATEGORY_DESCRIPTIONS[category]}
                              </p>
                            </div>
                          </div>

                          {/* Mobile labels */}
                          <div className="flex justify-between items-center md:hidden">
                            <span className="text-sm text-muted-foreground">
                              Email
                            </span>
                            <Switch
                              checked={pref.email}
                              onCheckedChange={(checked) =>
                                handleCategoryToggle(category, "email", checked)
                              }
                              disabled={enforced || updateMutation.isPending}
                            />
                          </div>
                          <div className="flex justify-between items-center md:hidden">
                            <span className="text-sm text-muted-foreground">
                              In-App
                            </span>
                            <Switch
                              checked={pref.inApp}
                              onCheckedChange={(checked) =>
                                handleCategoryToggle(category, "inApp", checked)
                              }
                              disabled={enforced || updateMutation.isPending}
                            />
                          </div>

                          {/* Desktop toggles */}
                          <div className="hidden md:flex justify-center">
                            <Switch
                              checked={pref.email}
                              onCheckedChange={(checked) =>
                                handleCategoryToggle(category, "email", checked)
                              }
                              disabled={enforced || updateMutation.isPending}
                            />
                          </div>
                          <div className="hidden md:flex justify-center">
                            <Switch
                              checked={pref.inApp}
                              onCheckedChange={(checked) =>
                                handleCategoryToggle(category, "inApp", checked)
                              }
                              disabled={enforced || updateMutation.isPending}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Enforced categories info */}
              {preferences?.enforcedCategories &&
                preferences.enforcedCategories.length > 0 && (
                  <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/50 mt-4">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Categories marked with{" "}
                      <Lock className="h-3 w-3 inline mx-1" /> are required by
                      your organization and cannot be disabled.
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Quiet Hours
              </CardTitle>
              <CardDescription>
                Pause non-urgent notifications during specific hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="quietHoursEnabled">Enable quiet hours</Label>
                  <p className="text-sm text-muted-foreground">
                    Non-urgent notifications will be held until quiet hours end
                  </p>
                </div>
                <Switch
                  id="quietHoursEnabled"
                  checked={hasQuietHours}
                  onCheckedChange={handleQuietHoursToggle}
                  disabled={updateMutation.isPending}
                />
              </div>

              {hasQuietHours && (
                <div className="ml-0 md:ml-4 p-4 border rounded-lg bg-muted/30 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quietHoursStart">Start time</Label>
                      <Input
                        id="quietHoursStart"
                        type="time"
                        value={preferences?.quietHoursStart || "22:00"}
                        onChange={(e) =>
                          handleQuietHoursChange("start", e.target.value)
                        }
                        disabled={updateMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quietHoursEnd">End time</Label>
                      <Input
                        id="quietHoursEnd"
                        type="time"
                        value={preferences?.quietHoursEnd || "07:00"}
                        onChange={(e) =>
                          handleQuietHoursChange("end", e.target.value)
                        }
                        disabled={updateMutation.isPending}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={preferences?.timezone || "UTC"}
                      onValueChange={handleTimezoneChange}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger id="timezone" className="w-full md:w-64">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Urgent notifications (assignments, escalations) will still
                    be delivered during quiet hours.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Out of Office */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Out of Office
              </CardTitle>
              <CardDescription>
                Delegate urgent notifications to a backup user while you are
                away
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isOOO ? (
                <>
                  <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">
                          You are currently out of office
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Until:{" "}
                          {new Date(
                            preferences?.oooUntil as string,
                          ).toLocaleDateString(undefined, {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        {preferences?.backupUserId && usersResponse?.items && (
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Backup:{" "}
                            {usersResponse.items.find(
                              (u) => u.id === preferences.backupUserId,
                            )?.firstName || "Selected user"}{" "}
                            {usersResponse.items.find(
                              (u) => u.id === preferences.backupUserId,
                            )?.lastName || ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDisableOOO}
                    disabled={clearOOOMutation.isPending}
                  >
                    {clearOOOMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Turn off out of office
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    When out of office is enabled, urgent notifications will be
                    delegated to your backup user. Other notifications will be
                    held until you return.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="oooEndDate">Return date</Label>
                      <Input
                        id="oooEndDate"
                        type="date"
                        value={oooEndDate}
                        onChange={(e) => setOooEndDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backupUser">Backup user</Label>
                      <Select
                        value={oooBackupUserId}
                        onValueChange={setOooBackupUserId}
                      >
                        <SelectTrigger id="backupUser">
                          <SelectValue placeholder="Select backup user" />
                        </SelectTrigger>
                        <SelectContent>
                          {usersResponse?.items?.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleEnableOOO}
                    disabled={
                      !oooEndDate ||
                      !oooBackupUserId ||
                      setOOOMutation.isPending
                    }
                  >
                    {setOOOMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Enable out of office
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* How it works info */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium mb-2">
                    How notification preferences work
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>
                      Email notifications are sent to your registered email
                      address
                    </li>
                    <li>
                      In-app notifications appear in the notification bell in
                      the header
                    </li>
                    <li>
                      Quiet hours pause non-urgent notifications but do not
                      affect urgent ones
                    </li>
                    <li>
                      Out of office delegates urgent notifications to your
                      backup user
                    </li>
                    <li>Organization-enforced categories cannot be disabled</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
