"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Briefcase, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { TIMEZONES, DATE_FORMATS } from "@/types/organization";

/**
 * Account Defaults Page
 *
 * Organization-wide default settings for operational behavior:
 * - Case Defaults: Default pipeline, assignment strategy, auto-close, SLA defaults
 * - Communication Defaults: Sender name, reply-to address, email footer
 * - Date/Time: Organization timezone, fiscal year start, work week days
 */
export default function AccountDefaultsPage() {
  // Case Defaults state
  const [defaultPipeline, setDefaultPipeline] = useState("standard");
  const [assignmentStrategy, setAssignmentStrategy] = useState("round_robin");
  const [autoCloseDays, setAutoCloseDays] = useState("90");
  const [slaCritical, setSlaCritical] = useState("24");
  const [slaHigh, setSlaHigh] = useState("48");
  const [slaMedium, setSlaMedium] = useState("72");
  const [slaLow, setSlaLow] = useState("120");

  // Communication Defaults state
  const [senderName, setSenderName] = useState("Ethico Compliance");
  const [replyToAddress, setReplyToAddress] = useState(
    "compliance@company.com",
  );
  const [emailFooter, setEmailFooter] = useState(
    "This message contains confidential information. If you received this in error, please delete immediately.",
  );

  // Date/Time state
  const [timezone, setTimezone] = useState("America/New_York");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [fiscalYearStart, setFiscalYearStart] = useState("january");
  const [workWeekDays, setWorkWeekDays] = useState<string[]>([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ]);

  // Saving states
  const [savingCase, setSavingCase] = useState(false);
  const [savingComm, setSavingComm] = useState(false);
  const [savingDateTime, setSavingDateTime] = useState(false);

  const handleSaveCaseDefaults = async () => {
    setSavingCase(true);
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Case defaults saved");
    } catch {
      toast.error("Failed to save case defaults");
    } finally {
      setSavingCase(false);
    }
  };

  const handleSaveCommunicationDefaults = async () => {
    setSavingComm(true);
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Communication defaults saved");
    } catch {
      toast.error("Failed to save communication defaults");
    } finally {
      setSavingComm(false);
    }
  };

  const handleSaveDateTimeDefaults = async () => {
    setSavingDateTime(true);
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Date/time settings saved");
    } catch {
      toast.error("Failed to save date/time settings");
    } finally {
      setSavingDateTime(false);
    }
  };

  const toggleWorkDay = (day: string) => {
    setWorkWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const weekDays = [
    { value: "sunday", label: "Sun" },
    { value: "monday", label: "Mon" },
    { value: "tuesday", label: "Tue" },
    { value: "wednesday", label: "Wed" },
    { value: "thursday", label: "Thu" },
    { value: "friday", label: "Fri" },
    { value: "saturday", label: "Sat" },
  ];

  const months = [
    { value: "january", label: "January" },
    { value: "february", label: "February" },
    { value: "march", label: "March" },
    { value: "april", label: "April" },
    { value: "may", label: "May" },
    { value: "june", label: "June" },
    { value: "july", label: "July" },
    { value: "august", label: "August" },
    { value: "september", label: "September" },
    { value: "october", label: "October" },
    { value: "november", label: "November" },
    { value: "december", label: "December" },
  ];

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
        <span className="text-foreground">Account Defaults</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Account Defaults</h1>
        <p className="text-muted-foreground">
          Configure organization-wide defaults for cases, communications, and
          date/time settings
        </p>
      </div>

      {/* Case Defaults */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle>Case Defaults</CardTitle>
          </div>
          <CardDescription>
            Default settings for new cases and investigations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defaultPipeline">Default Pipeline</Label>
              <Select
                value={defaultPipeline}
                onValueChange={setDefaultPipeline}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    Standard Investigation
                  </SelectItem>
                  <SelectItem value="hr">HR Investigation</SelectItem>
                  <SelectItem value="legal">Legal Review</SelectItem>
                  <SelectItem value="quick">Quick Resolution</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignmentStrategy">Assignment Strategy</Label>
              <Select
                value={assignmentStrategy}
                onValueChange={setAssignmentStrategy}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                  <SelectItem value="least_loaded">Least Loaded</SelectItem>
                  <SelectItem value="manual">Manual Assignment</SelectItem>
                  <SelectItem value="category_based">Category-Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="autoCloseDays">Auto-close after (days)</Label>
            <Input
              id="autoCloseDays"
              type="number"
              value={autoCloseDays}
              onChange={(e) => setAutoCloseDays(e.target.value)}
              placeholder="90"
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Cases with no activity will be automatically closed after this
              many days. Set to 0 to disable.
            </p>
          </div>

          <div className="space-y-4">
            <Label>SLA Defaults by Severity (hours)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slaCritical" className="text-xs text-red-600">
                  Critical
                </Label>
                <Input
                  id="slaCritical"
                  type="number"
                  value={slaCritical}
                  onChange={(e) => setSlaCritical(e.target.value)}
                  className="border-red-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slaHigh" className="text-xs text-orange-600">
                  High
                </Label>
                <Input
                  id="slaHigh"
                  type="number"
                  value={slaHigh}
                  onChange={(e) => setSlaHigh(e.target.value)}
                  className="border-orange-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slaMedium" className="text-xs text-yellow-600">
                  Medium
                </Label>
                <Input
                  id="slaMedium"
                  type="number"
                  value={slaMedium}
                  onChange={(e) => setSlaMedium(e.target.value)}
                  className="border-yellow-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slaLow" className="text-xs text-blue-600">
                  Low
                </Label>
                <Input
                  id="slaLow"
                  type="number"
                  value={slaLow}
                  onChange={(e) => setSlaLow(e.target.value)}
                  className="border-blue-200"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveCaseDefaults} disabled={savingCase}>
              {savingCase ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Case Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Communication Defaults */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Communication Defaults</CardTitle>
          </div>
          <CardDescription>
            Default sender information and email settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="senderName">Default Sender Name</Label>
              <Input
                id="senderName"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Ethico Compliance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="replyToAddress">Reply-To Address</Label>
              <Input
                id="replyToAddress"
                type="email"
                value={replyToAddress}
                onChange={(e) => setReplyToAddress(e.target.value)}
                placeholder="compliance@company.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailFooter">Email Footer</Label>
            <textarea
              id="emailFooter"
              value={emailFooter}
              onChange={(e) => setEmailFooter(e.target.value)}
              placeholder="Enter default email footer text..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This footer will be appended to all outgoing emails
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveCommunicationDefaults}
              disabled={savingComm}
            >
              {savingComm ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Communication Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Date/Time Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Date & Time Settings</CardTitle>
          </div>
          <CardDescription>
            Organization timezone, fiscal year, and work week configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Organization Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((df) => (
                    <SelectItem key={df.value} value={df.value}>
                      {df.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscalYearStart">Fiscal Year Start</Label>
            <Select value={fiscalYearStart} onValueChange={setFiscalYearStart}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used for fiscal year reporting and analytics
            </p>
          </div>

          <div className="space-y-3">
            <Label>Work Week Days</Label>
            <div className="flex flex-wrap gap-2">
              {weekDays.map((day) => (
                <div
                  key={day.value}
                  className="flex items-center space-x-2 bg-muted/50 rounded-lg px-3 py-2"
                >
                  <Checkbox
                    id={day.value}
                    checked={workWeekDays.includes(day.value)}
                    onCheckedChange={() => toggleWorkDay(day.value)}
                  />
                  <label
                    htmlFor={day.value}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Used for SLA calculations and business day computations
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveDateTimeDefaults}
              disabled={savingDateTime}
            >
              {savingDateTime ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Date/Time Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
