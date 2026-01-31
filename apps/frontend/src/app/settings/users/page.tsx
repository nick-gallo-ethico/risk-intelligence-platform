'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usersApi } from '@/lib/users-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UsersTable,
  UserFilters,
  CreateUserDialog,
  EditUserDialog,
  DeactivateUserDialog,
} from '@/components/users';
import { Pagination } from '@/components/cases/pagination';
import { toast } from 'sonner';
import { Plus, Settings, Users, ArrowLeft } from 'lucide-react';
import type { User, UserQueryParams } from '@/types/user';
import type { UserRole } from '@/types/auth';

function UsersPageContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<boolean | ''>('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Check admin access
  const isAdmin = user?.role === 'SYSTEM_ADMIN';

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) return;

    setLoading(true);
    setError(null);

    try {
      const params: UserQueryParams = {
        page: page + 1, // API uses 1-based pagination
        limit: pageSize,
        sortBy,
        sortOrder,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (roleFilter) {
        params.role = roleFilter;
      }

      if (statusFilter !== '') {
        params.isActive = statusFilter;
      }

      const response = await usersApi.list(params);
      setUsers(response.items);
      setTotal(response.pagination.total);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [
    isAuthenticated,
    isAdmin,
    page,
    pageSize,
    sortBy,
    sortOrder,
    debouncedSearch,
    roleFilter,
    statusFilter,
  ]);

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      toast.error('Access Denied', {
        description: 'Only System Administrators can access user management.',
      });
      router.push('/dashboard');
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  // Fetch users on filter changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(0);
  };

  // Handle edit
  const handleEdit = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setEditDialogOpen(true);
  };

  // Handle deactivate
  const handleDeactivate = (userToDeactivate: User) => {
    setSelectedUser(userToDeactivate);
    setDeactivateDialogOpen(true);
  };

  // Handle reactivate
  const handleReactivate = async (userToReactivate: User) => {
    try {
      await usersApi.reactivate(userToReactivate.id);
      toast.success('User reactivated', {
        description: `${userToReactivate.firstName} ${userToReactivate.lastName} can now access the platform.`,
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to reactivate user:', err);
      toast.error('Failed to reactivate user');
    }
  };

  // Handle dialog success
  const handleCreateSuccess = () => {
    fetchUsers();
  };

  const handleEditSuccess = () => {
    fetchUsers();
    setSelectedUser(null);
  };

  const handleDeactivateSuccess = () => {
    fetchUsers();
    setSelectedUser(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="font-semibold text-gray-900">
                Risk Intelligence Platform
              </span>
            </div>
            <nav className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/cases')}
              >
                Cases
              </Button>
              <Button variant="ghost" size="sm" className="font-semibold">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>

        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Filters Card */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <UserFilters
              search={search}
              role={roleFilter}
              isActive={statusFilter}
              onSearchChange={setSearch}
              onRoleChange={setRoleFilter}
              onStatusChange={setStatusFilter}
            />
          </CardContent>
        </Card>

        {/* Users Table Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Users</span>
              <span className="text-sm font-normal text-muted-foreground">
                {total} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading users...
              </div>
            ) : (
              <>
                <UsersTable
                  users={users}
                  currentUserId={user.id}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  onEdit={handleEdit}
                  onDeactivate={handleDeactivate}
                  onReactivate={handleReactivate}
                />

                {total > 0 && (
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setPage(0);
                    }}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        currentUserId={user.id}
        onSuccess={handleEditSuccess}
      />

      <DeactivateUserDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        user={selectedUser}
        onSuccess={handleDeactivateSuccess}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      }
    >
      <UsersPageContent />
    </Suspense>
  );
}
