"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { usersApi } from "@/lib/users-api";
import { casesApi } from "@/lib/cases-api";
import type { User, UserRole } from "@/types/user";

interface AssignModalProps {
  caseId: string;
  currentAssigneeIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}

/**
 * Roles that can be assigned to investigate cases
 */
const INVESTIGATOR_ROLES: UserRole[] = [
  "SYSTEM_ADMIN",
  "CCO",
  "COMPLIANCE_OFFICER",
  "TRIAGE_LEAD",
  "INVESTIGATOR",
  "HR_PARTNER",
  "LEGAL_COUNSEL",
];

/**
 * AssignModal - Modal for assigning investigators to a case
 *
 * Fetches available users and allows selecting one or more investigators
 * to assign to the case. Highlights currently assigned users.
 */
export function AssignModal({
  caseId,
  currentAssigneeIds,
  open,
  onOpenChange,
  onAssigned,
}: AssignModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(currentAssigneeIds);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available users when modal opens
  useEffect(() => {
    if (open) {
      setSelectedIds(currentAssigneeIds);
      setError(null);
      fetchUsers();
    }
  }, [open, currentAssigneeIds]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await usersApi.list({ isActive: true, limit: 100 });
      // Filter to only show investigator-capable roles
      const investigators = response.items.filter((user) =>
        INVESTIGATOR_ROLES.includes(user.role),
      );
      setUsers(investigators);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUser = useCallback((userId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, userId] : prev.filter((id) => id !== userId),
    );
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await casesApi.update(caseId, {
        // Backend expects the list of assigned investigator IDs
        // We'll send via a custom field or the assignedInvestigatorIds field
      });
      // Alternative: use a direct PATCH with the assignee IDs
      // For now, we'll use the update method with a workaround
      // The backend should support assignedInvestigatorIds in the update input

      // Using apiClient directly if casesApi.update doesn't support this
      const { apiClient } = await import("@/lib/api");
      await apiClient.patch(`/cases/${caseId}`, {
        assignedInvestigatorIds: selectedIds,
      });

      onAssigned();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to assign investigators:", err);
      setError("Failed to assign investigators. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (user: User) => {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Partial<Record<UserRole, string>> = {
      SYSTEM_ADMIN: "Admin",
      CCO: "CCO",
      COMPLIANCE_OFFICER: "Compliance",
      TRIAGE_LEAD: "Triage",
      INVESTIGATOR: "Investigator",
      HR_PARTNER: "HR",
      LEGAL_COUNSEL: "Legal",
    };
    return labels[role] || role;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Investigators</DialogTitle>
          <DialogDescription>
            Select one or more investigators to assign to this case.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">
                Loading users...
              </span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No investigators available
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {users.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                const wasAlreadyAssigned = currentAssigneeIds.includes(user.id);

                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => handleToggleUser(user.id, !isSelected)}
                  >
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleToggleUser(user.id, !!checked)
                      }
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`user-${user.id}`}
                          className="font-medium text-sm cursor-pointer"
                        >
                          {user.firstName} {user.lastName}
                        </Label>
                        {wasAlreadyAssigned && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getRoleLabel(user.role)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign ({selectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
