'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '@/lib/users-api';
import type { User } from '@/types/user';

interface DeactivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: (user: User) => void;
}

export function DeactivateUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: DeactivateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeactivate = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const updatedUser = await usersApi.deactivate(user.id);
      toast.success('User deactivated', {
        description: `${user.firstName} ${user.lastName} has been deactivated and can no longer access the platform.`,
      });
      onSuccess(updatedUser);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Failed to deactivate user:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to deactivate user';
      toast.error('Error deactivating user', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Deactivate User
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to deactivate this user?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-800">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-amber-700">{user.email}</p>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Warning:</strong> Deactivating this user will:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
              <li>Immediately revoke their access to the platform</li>
              <li>Remove them from any active assignments</li>
              <li>Preserve their historical data and activity logs</li>
            </ul>
            <p className="text-sm text-gray-500 mt-3">
              You can reactivate this user later if needed.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeactivate}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Deactivating...' : 'Deactivate User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
