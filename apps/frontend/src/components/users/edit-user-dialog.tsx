'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { usersApi } from '@/lib/users-api';
import { USER_ROLES, ROLE_LABELS } from '@/types/user';
import type { UpdateUserInput, User } from '@/types/user';
import type { UserRole } from '@/types/auth';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  currentUserId: string;
  onSuccess: (user: User) => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  role: UserRole;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  onSuccess,
}: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditingSelf = user?.id === currentUserId;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      role: 'EMPLOYEE',
    },
  });

  const selectedRole = watch('role');

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const input: UpdateUserInput = {
        firstName: data.firstName,
        lastName: data.lastName,
      };

      // Only update role if not editing self
      if (!isEditingSelf) {
        input.role = data.role;
      }

      const updatedUser = await usersApi.update(user.id, input);
      toast.success('User updated successfully');
      onSuccess(updatedUser);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Failed to update user:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to update user';
      toast.error('Error updating user', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details for {user.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name</Label>
              <Input
                id="edit-firstName"
                {...register('firstName', {
                  required: 'First name is required',
                  minLength: { value: 1, message: 'First name is required' },
                  maxLength: { value: 100, message: 'Max 100 characters' },
                })}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name</Label>
              <Input
                id="edit-lastName"
                {...register('lastName', {
                  required: 'Last name is required',
                  minLength: { value: 1, message: 'Last name is required' },
                  maxLength: { value: 100, message: 'Max 100 characters' },
                })}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              value={user.email}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">
              Email cannot be changed. Contact support for email updates.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue('role', value as UserRole)}
              disabled={isEditingSelf}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEditingSelf && (
              <p className="text-xs text-amber-600">
                You cannot change your own role.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
              {isEditingSelf && (
                <p className="text-xs text-gray-500">
                  Status changes must be done from the user list.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
