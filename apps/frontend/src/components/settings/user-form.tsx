'use client';

import { useForm, Controller } from 'react-hook-form';

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
import type { User, UpdateUserInput } from '@/types/user';
import type { UserRole } from '@/types/auth';
import { ROLE_LABELS, USER_ROLES } from '@/types/user';

/**
 * Props for UserForm component.
 */
interface UserFormProps {
  /** User to edit (for pre-populated form) */
  user: User;
  /** Callback on form submit */
  onSubmit: (data: UpdateUserInput) => Promise<void>;
  /** Whether form is being submitted */
  isSubmitting: boolean;
  /** Whether this is the current logged-in user */
  isCurrentUser: boolean;
}

/**
 * User edit form component.
 *
 * Allows editing:
 * - First name
 * - Last name
 * - Role (cannot change own role if current user)
 * - Active status
 */
export function UserForm({
  user,
  onSubmit,
  isSubmitting,
  isCurrentUser,
}: UserFormProps) {
  const { register, handleSubmit, control, formState } =
    useForm<UpdateUserInput>({
      defaultValues: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
      },
    });

  const handleFormSubmit = async (data: UpdateUserInput) => {
    // Only include changed fields
    const updateData: UpdateUserInput = {};

    if (data.firstName !== user.firstName) {
      updateData.firstName = data.firstName;
    }
    if (data.lastName !== user.lastName) {
      updateData.lastName = data.lastName;
    }
    if (!isCurrentUser && data.role !== user.role) {
      updateData.role = data.role;
    }
    if (!isCurrentUser && data.isActive !== user.isActive) {
      updateData.isActive = data.isActive;
    }

    // Don't submit if nothing changed
    if (Object.keys(updateData).length === 0) {
      return;
    }

    await onSubmit(updateData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* First Name */}
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          {...register('firstName', { required: 'First name is required' })}
          placeholder="Enter first name"
        />
        {formState.errors.firstName && (
          <p className="text-sm text-destructive">
            {formState.errors.firstName.message}
          </p>
        )}
      </div>

      {/* Last Name */}
      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          {...register('lastName', { required: 'Last name is required' })}
          placeholder="Enter last name"
        />
        {formState.errors.lastName && (
          <p className="text-sm text-destructive">
            {formState.errors.lastName.message}
          </p>
        )}
      </div>

      {/* Email (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user.email} disabled className="bg-muted" />
        <p className="text-sm text-muted-foreground">
          Email cannot be changed
        </p>
      </div>

      {/* Role */}
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isCurrentUser}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {isCurrentUser && (
          <p className="text-sm text-muted-foreground">
            You cannot change your own role
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          disabled={isSubmitting || !formState.isDirty}
          className="w-full"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
