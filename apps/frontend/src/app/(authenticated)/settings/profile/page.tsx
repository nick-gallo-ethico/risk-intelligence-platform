"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Shield,
  ListChecks,
  Save,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { usersApi } from "@/services/users";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

/**
 * User Profile Page
 *
 * Personal settings page with tabs:
 * - Profile: Display name, email, phone, avatar, timezone, language
 * - Security: Change password, enable/disable MFA, active sessions
 * - Task Defaults: Default task reminders, preferred assignment mode
 */
export default function ProfilePage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams?.get("tab") || "profile";
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <ProfilePageSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Not Authenticated</h2>
        <p className="text-muted-foreground">
          Please log in to access your profile settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/settings"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
        <span>/</span>
        <span className="text-foreground">Profile</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information, security settings, and preferences
        </p>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Task Defaults
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={user} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab userId={user.id} />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskDefaultsTab userId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Profile Tab - Edit display name, email, phone, avatar, timezone, language
 */
interface ProfileTabProps {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

function ProfileTab({ user }: ProfileTabProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [title, setTitle] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [language, setLanguage] = useState("en");

  const updateMutation = useMutation({
    mutationFn: (data: {
      firstName?: string;
      lastName?: string;
      title?: string;
    }) => usersApi.update(user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", user.id] });
      toast.success("Profile updated successfully");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      firstName,
      lastName,
      title: title || undefined,
    });
  };

  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Update your personal details and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src="" alt={`${firstName} ${lastName}`} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Profile Photo</p>
            <Button variant="outline" size="sm" disabled>
              Change Photo
            </Button>
          </div>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user.email} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">
            Contact your administrator to change your email address
          </p>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Job Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Compliance Officer"
          />
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/New_York">
                Eastern Time (ET)
              </SelectItem>
              <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
              <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
              <SelectItem value="America/Los_Angeles">
                Pacific Time (PT)
              </SelectItem>
              <SelectItem value="America/Phoenix">Arizona (AZ)</SelectItem>
              <SelectItem value="America/Anchorage">Alaska (AK)</SelectItem>
              <SelectItem value="Pacific/Honolulu">Hawaii (HI)</SelectItem>
              <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
              <SelectItem value="Europe/Paris">
                Central European (CET)
              </SelectItem>
              <SelectItem value="Asia/Tokyo">Japan (JST)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="zh">Chinese</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

/**
 * Security Tab - Change password, MFA toggle, active sessions
 */
interface SecurityTabProps {
  userId: string;
}

function SecurityTab({ userId }: SecurityTabProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleMfaToggle = async (enabled: boolean) => {
    setMfaEnabled(enabled);
    if (enabled) {
      toast.info("MFA setup would open here");
    } else {
      toast.success("MFA disabled");
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleChangePassword}
              disabled={
                isChangingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {isChangingPassword ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable MFA</p>
              <p className="text-sm text-muted-foreground">
                Require a verification code when signing in
              </p>
            </div>
            <Switch checked={mfaEnabled} onCheckedChange={handleMfaToggle} />
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Manage your active login sessions across devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Current Session</p>
              <p className="text-sm text-muted-foreground">
                Windows - Chrome - Charlotte, NC
              </p>
            </div>
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
              Active Now
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            No other active sessions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Task Defaults Tab - Default reminders and assignment preferences
 */
interface TaskDefaultsTabProps {
  userId: string;
}

function TaskDefaultsTab({ userId }: TaskDefaultsTabProps) {
  const [defaultReminder, setDefaultReminder] = useState("1day");
  const [assignmentMode, setAssignmentMode] = useState("manual");
  const [autoAcceptTasks, setAutoAcceptTasks] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Task defaults saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Preferences</CardTitle>
        <CardDescription>
          Configure your default settings for tasks and assignments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Reminder */}
        <div className="space-y-2">
          <Label htmlFor="defaultReminder">Default Task Reminder</Label>
          <Select value={defaultReminder} onValueChange={setDefaultReminder}>
            <SelectTrigger>
              <SelectValue placeholder="Select reminder time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No reminder</SelectItem>
              <SelectItem value="1hour">1 hour before</SelectItem>
              <SelectItem value="4hours">4 hours before</SelectItem>
              <SelectItem value="1day">1 day before</SelectItem>
              <SelectItem value="2days">2 days before</SelectItem>
              <SelectItem value="1week">1 week before</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Get reminded before tasks are due
          </p>
        </div>

        {/* Assignment Mode */}
        <div className="space-y-2">
          <Label htmlFor="assignmentMode">Preferred Assignment Mode</Label>
          <Select value={assignmentMode} onValueChange={setAssignmentMode}>
            <SelectTrigger>
              <SelectValue placeholder="Select assignment mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">
                Manual - Review each assignment
              </SelectItem>
              <SelectItem value="auto">
                Auto-accept - Accept assignments automatically
              </SelectItem>
              <SelectItem value="queue">
                Queue - Add to my task queue
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            How you prefer to receive task assignments
          </p>
        </div>

        {/* Auto-accept toggle */}
        <div className="flex items-center justify-between py-4 border-t">
          <div>
            <p className="font-medium">Auto-accept routine tasks</p>
            <p className="text-sm text-muted-foreground">
              Automatically accept tasks with low priority
            </p>
          </div>
          <Switch
            checked={autoAcceptTasks}
            onCheckedChange={setAutoAcceptTasks}
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loading state for profile page.
 */
function ProfilePageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Skeleton className="h-5 w-32" />

      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-[400px]" />

      {/* Content */}
      <div className="border rounded-lg p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}
