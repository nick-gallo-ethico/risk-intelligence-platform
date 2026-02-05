'use client';

import { useForm, Controller } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InviteUserDto } from '@/types/user';
import type { UserRole } from '@/types/auth';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, USER_ROLES } from '@/types/user';

/**
 * Props for InviteUserForm component.
 */
interface InviteUserFormProps {
  /** Callback on form submit */
  onSubmit: (data: InviteUserDto) => Promise<void>;
  /** Whether form is being submitted */
  isSubmitting?: boolean;
  /** Cancel callback */
  onCancel?: () => void;
}

/**
 * Invite user form component.
 *
 * Collects:
 * - Email (required)
 * - First name (required)
 * - Last name (required)
 * - Role (required with description)
 * - Personal message (optional)
 */
export function InviteUserForm({
  onSubmit,
  isSubmitting,
  onCancel,
}: InviteUserFormProps) {
  const { register, handleSubmit, control, watch, formState } =
    useForm<InviteUserDto>({
      defaultValues: {
        email: '',
        firstName: '',
        lastName: '',
        role: 'EMPLOYEE' as UserRole,
        message: '',
      },
    });

  const selectedRole = watch('role') as UserRole;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          placeholder="user@example.com"
        />
        {formState.errors.email && (
          <p className="text-sm text-destructive">
            {formState.errors.email.message}
          </p>
        )}
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            {...register('firstName', { required: 'First name is required' })}
            placeholder="John"
          />
          {formState.errors.firstName && (
            <p className="text-sm text-destructive">
              {formState.errors.firstName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lastName"
            {...register('lastName', { required: 'Last name is required' })}
            placeholder="Doe"
          />
          {formState.errors.lastName && (
            <p className="text-sm text-destructive">
              {formState.errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      {/* Role */}
      <div className="space-y-2">
        <Label htmlFor="role">
          Role <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="role"
          rules={{ required: 'Role is required' }}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="role">
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
          )}
        />
        {selectedRole && (
          <p className="text-sm text-muted-foreground">
            {ROLE_DESCRIPTIONS[selectedRole]}
          </p>
        )}
        {formState.errors.role && (
          <p className="text-sm text-destructive">
            {formState.errors.role.message}
          </p>
        )}
      </div>

      {/* Personal Message */}
      <div className="space-y-2">
        <Label htmlFor="message">Personal Message (optional)</Label>
        <Textarea
          id="message"
          {...register('message')}
          placeholder="Add a personal note to the invitation email..."
          rows={3}
        />
        <p className="text-sm text-muted-foreground">
          This message will be included in the invitation email
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Invitation'}
        </Button>
      </div>
    </form>
  );
}
