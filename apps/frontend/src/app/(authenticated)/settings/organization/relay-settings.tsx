"use client";

/**
 * RelaySettingsSection - Anonymous Communication Relay Configuration
 *
 * Allows organization admins to configure:
 * - Reporter visibility level (how much case info reporters can see)
 * - Two-way messaging enablement
 * - Auto-notification on new messages
 * - Notification delay range (privacy protection)
 *
 * @see 42-07-PLAN.md - Admin UI for relay settings
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Clock, Bell, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";

/**
 * Visibility level options with descriptions.
 */
const VISIBILITY_LEVELS = [
  {
    value: "MINIMAL",
    label: "Minimal",
    description: "Status only - no case details or messages visible",
  },
  {
    value: "STANDARD",
    label: "Standard",
    description: "Status and messages visible, no investigator names",
  },
  {
    value: "DETAILED",
    label: "Detailed",
    description: "Full status, messages, and timeline visible",
  },
  {
    value: "TRANSPARENT",
    label: "Transparent",
    description: "Full visibility including investigator first name",
  },
] as const;

/**
 * Relay settings data structure.
 */
interface RelaySettings {
  reporterVisibilityLevel: string;
  enableMessaging: boolean;
  autoNotifyOnMessage: boolean;
  notificationDelayMinHours: number;
  notificationDelayMaxHours: number;
}

/**
 * Default relay settings.
 */
const DEFAULT_SETTINGS: RelaySettings = {
  reporterVisibilityLevel: "STANDARD",
  enableMessaging: true,
  autoNotifyOnMessage: true,
  notificationDelayMinHours: 1,
  notificationDelayMaxHours: 6,
};

/**
 * Relay settings configuration section for organization settings page.
 */
export function RelaySettingsSection() {
  const queryClient = useQueryClient();

  // Fetch current relay settings
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["relay-settings"],
    queryFn: () => apiClient.get<RelaySettings>("/organization/relay-settings"),
  });

  // Form state
  const [formData, setFormData] = useState<RelaySettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
    }
  }, [settings]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<RelaySettings>) =>
      apiClient.patch<RelaySettings>("/organization/relay-settings", data),
    onSuccess: (data) => {
      queryClient.setQueryData(["relay-settings"], data);
      setHasChanges(false);
      toast.success("Relay settings saved");
    },
    onError: (error) => {
      console.error("Failed to save relay settings:", error);
      toast.error("Failed to save settings. Please try again.");
    },
  });

  /**
   * Handle form field change.
   */
  const handleChange = <K extends keyof RelaySettings>(
    key: K,
    value: RelaySettings[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  /**
   * Handle form submission.
   */
  const handleSave = () => {
    // Validate delay range
    if (
      formData.notificationDelayMinHours >= formData.notificationDelayMaxHours
    ) {
      toast.error("Minimum delay must be less than maximum delay.");
      return;
    }

    updateMutation.mutate(formData);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load relay settings.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5" />
          Anonymous Communication Relay
        </CardTitle>
        <CardDescription>
          Configure how anonymous reporters can communicate with investigators
          and what information they can see.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visibility Level */}
        <div className="space-y-2">
          <Label htmlFor="visibility">Reporter Visibility Level</Label>
          <Select
            value={formData.reporterVisibilityLevel}
            onValueChange={(value) =>
              handleChange("reporterVisibilityLevel", value)
            }
          >
            <SelectTrigger id="visibility" className="w-full max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{level.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {level.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Controls how much information reporters can see when checking their
            report status.
          </p>
        </div>

        {/* Enable Messaging */}
        <div className="flex items-center justify-between max-w-md">
          <div className="space-y-0.5">
            <Label htmlFor="messaging">Two-Way Messaging</Label>
            <p className="text-sm text-muted-foreground">
              Allow investigators and reporters to exchange messages.
            </p>
          </div>
          <Switch
            id="messaging"
            checked={formData.enableMessaging}
            onCheckedChange={(checked) =>
              handleChange("enableMessaging", checked)
            }
          />
        </div>

        {/* Auto Notify */}
        <div className="flex items-center justify-between max-w-md">
          <div className="space-y-0.5">
            <Label htmlFor="autoNotify" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Auto-Notify on New Message
            </Label>
            <p className="text-sm text-muted-foreground">
              Send email notification to reporter when investigator sends a
              message.
            </p>
          </div>
          <Switch
            id="autoNotify"
            checked={formData.autoNotifyOnMessage}
            onCheckedChange={(checked) =>
              handleChange("autoNotifyOnMessage", checked)
            }
            disabled={!formData.enableMessaging}
          />
        </div>

        {/* Notification Delay */}
        <div className="space-y-3 max-w-md">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Notification Delay Range
          </Label>
          <p className="text-sm text-muted-foreground">
            Random delay before sending notifications to reporters. Prevents
            timing correlation attacks.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label
                htmlFor="minDelay"
                className="text-xs text-muted-foreground"
              >
                Minimum (hours)
              </Label>
              <Input
                id="minDelay"
                type="number"
                min={0}
                max={24}
                value={formData.notificationDelayMinHours}
                onChange={(e) =>
                  handleChange(
                    "notificationDelayMinHours",
                    Number(e.target.value),
                  )
                }
                disabled={!formData.autoNotifyOnMessage}
              />
            </div>
            <span className="text-muted-foreground pt-5">to</span>
            <div className="flex-1">
              <Label
                htmlFor="maxDelay"
                className="text-xs text-muted-foreground"
              >
                Maximum (hours)
              </Label>
              <Input
                id="maxDelay"
                type="number"
                min={1}
                max={48}
                value={formData.notificationDelayMaxHours}
                onChange={(e) =>
                  handleChange(
                    "notificationDelayMaxHours",
                    Number(e.target.value),
                  )
                }
                disabled={!formData.autoNotifyOnMessage}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
