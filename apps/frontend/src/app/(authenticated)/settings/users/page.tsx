"use client";

import { useState, useCallback, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, ArrowLeft, Search, X, Shield } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UserList } from "@/components/settings/user-list";
import { usersApi } from "@/services/users";
import { useAuth } from "@/contexts/auth-context";
import {
  USER_ROLES,
  ROLE_LABELS,
  STATUS_LABELS,
  type UserStatus,
  type UserFilters,
} from "@/types/user";
import type { UserRole } from "@/types/auth";
import type { User } from "@/types/user";

const STATUSES: UserStatus[] = [
  "ACTIVE",
  "PENDING_INVITE",
  "INACTIVE",
  "SUSPENDED",
];

/**
 * Access denied component for non-admin users
 */
function AccessDenied() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-muted-foreground mb-4">
        Only System Administrators can access user management.
      </p>
      <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
    </div>
  );
}

/**
 * Loading skeleton for the users page
 */
function UsersPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="border rounded-lg p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Main users page content
 */
function UsersPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    user: currentUser,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  // Filter state
  const [filters, setFilters] = useState<UserFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Only SYSTEM_ADMIN can access
  const isAdmin = currentUser?.role === "SYSTEM_ADMIN";

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setSearchInput(value);
    // Debounce search filter update
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value || undefined }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: ["users", filters, page, pageSize],
    queryFn: () => usersApi.list(filters, page, pageSize),
    enabled: isAuthenticated && isAdmin,
  });

  // Mutations
  const deactivateMutation = useMutation({
    mutationFn: (user: User) => usersApi.deactivate(user.id),
    onSuccess: (_, user) => {
      toast.success(`${user.firstName} ${user.lastName} has been deactivated`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      toast.error("Failed to deactivate user");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (user: User) => usersApi.reactivate(user.id),
    onSuccess: (_, user) => {
      toast.success(`${user.firstName} ${user.lastName} has been reactivated`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      toast.error("Failed to reactivate user");
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: (user: User) => usersApi.resendInvite(user.id),
    onSuccess: (_, user) => {
      toast.success(`Invitation sent to ${user.email}`);
    },
    onError: () => {
      toast.error("Failed to send invitation");
    },
  });

  const resetMfaMutation = useMutation({
    mutationFn: (user: User) => usersApi.resetMfa(user.id),
    onSuccess: (_, user) => {
      toast.success(`MFA reset for ${user.firstName} ${user.lastName}`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      toast.error("Failed to reset MFA");
    },
  });

  // Handle filter changes
  const handleRoleChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      role: value === "all" ? undefined : (value as UserRole),
    }));
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      status: value === "all" ? undefined : (value as UserStatus),
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchInput("");
    setPage(1);
  };

  const hasFilters = filters.role || filters.status || filters.search;

  // Loading state
  if (authLoading) {
    return <UsersPageSkeleton />;
  }

  // Auth check
  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  // Admin check
  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <span>/</span>
        <span>Settings</span>
        <span>/</span>
        <span className="text-foreground">Users</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground">Manage user access and roles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/settings/roles">
              <Shield className="mr-2 h-4 w-4" />
              View Roles & Permissions
            </Link>
          </Button>
          <Button asChild>
            <Link href="/settings/users/invite">
              <UserPlus className="mr-2 h-4 w-4" />
              Invite User
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filters.role || "all"} onValueChange={handleRoleChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {USER_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || "all"}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="text-destructive p-4 bg-destructive/10 rounded-lg">
          Failed to load users. Please try again.
        </div>
      )}

      {/* User list */}
      {isLoading ? (
        <UsersPageSkeleton />
      ) : (
        <UserList
          users={data?.items || []}
          total={data?.pagination?.total || 0}
          page={page}
          pageSize={pageSize}
          currentUserId={currentUser?.id || ""}
          onPageChange={setPage}
          onEdit={(user) => router.push(`/settings/users/${user.id}`)}
          onDeactivate={(user) => deactivateMutation.mutate(user)}
          onReactivate={(user) => reactivateMutation.mutate(user)}
          onResendInvite={(user) => resendInviteMutation.mutate(user)}
          onResetMfa={(user) => resetMfaMutation.mutate(user)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

/**
 * Users page with Suspense wrapper
 */
export default function UsersPage() {
  return (
    <Suspense fallback={<UsersPageSkeleton />}>
      <UsersPageContent />
    </Suspense>
  );
}
