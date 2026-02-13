"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Calendar,
  Clock,
  User,
  FileText,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api";

interface Interview {
  id: string;
  investigationId: string;
  intervieweeType: "PERSON" | "EXTERNAL" | "ANONYMOUS";
  intervieweeName: string | null;
  intervieweeEmail: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  duration: number | null; // minutes
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  conductedById: string | null;
  conductedBy?: {
    firstName: string;
    lastName: string;
  };
  notes: string | null;
  hasTranscript: boolean;
  createdAt: string;
}

interface InvestigationInterviewsTabProps {
  investigationId: string;
  onScheduleInterview?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

const INTERVIEWEE_TYPE_LABELS: Record<string, string> = {
  PERSON: "Person",
  EXTERNAL: "External",
  ANONYMOUS: "Anonymous",
};

export function InvestigationInterviewsTab({
  investigationId,
  onScheduleInterview,
}: InvestigationInterviewsTabProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<Interview[]>(
        `/investigations/${investigationId}/interviews`,
      );
      setInterviews(response || []);
    } catch (err) {
      console.error("Failed to fetch interviews:", err);
      // Graceful fallback - endpoint might not exist yet
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  }, [investigationId]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  if (loading) {
    return <InvestigationInterviewsTabSkeleton />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Interviews</h2>
        <Button onClick={onScheduleInterview}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Interview
        </Button>
      </div>

      {/* Interview list */}
      {interviews.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <User className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No interviews yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Schedule interviews with subjects, witnesses, or other parties.
          </p>
          <Button className="mt-4" onClick={onScheduleInterview}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule First Interview
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {interviews.map((interview) => (
            <Card key={interview.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  {/* Left: Interview info */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {interview.intervieweeName || "Unknown"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {INTERVIEWEE_TYPE_LABELS[interview.intervieweeType]}
                        </Badge>
                      </div>

                      {/* Schedule/Completion info */}
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        {interview.status === "COMPLETED" ? (
                          <>
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                              Completed{" "}
                              {new Date(
                                interview.completedAt!,
                              ).toLocaleDateString()}
                            </span>
                            {interview.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {interview.duration} min
                              </span>
                            )}
                          </>
                        ) : interview.status === "CANCELLED" ? (
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-gray-400" />
                            Cancelled
                          </span>
                        ) : (
                          interview.scheduledAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Scheduled:{" "}
                              {new Date(
                                interview.scheduledAt,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          )
                        )}
                      </div>

                      {/* Status badge */}
                      <Badge
                        className={`mt-2 ${STATUS_COLORS[interview.status]}`}
                      >
                        {interview.status}
                      </Badge>

                      {/* Conductor info */}
                      {interview.conductedBy && (
                        <p className="mt-2 text-xs text-gray-500">
                          Conducted by: {interview.conductedBy.firstName}{" "}
                          {interview.conductedBy.lastName}
                        </p>
                      )}

                      {/* Notes excerpt */}
                      {interview.notes && interview.status === "COMPLETED" && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2 italic">
                          &ldquo;{interview.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    {interview.hasTranscript && (
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        Transcript
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        {interview.status === "SCHEDULED" && (
                          <DropdownMenuItem>Reschedule</DropdownMenuItem>
                        )}
                        {interview.status === "SCHEDULED" && (
                          <DropdownMenuItem className="text-red-600">
                            Cancel
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton for loading state
 */
function InvestigationInterviewsTabSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}
