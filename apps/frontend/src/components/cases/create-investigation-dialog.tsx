'use client';

import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';
import { createInvestigation } from '@/lib/investigation-api';
import type {
  Investigation,
  InvestigationType,
  InvestigationDepartment,
  CreateInvestigationInput,
} from '@/types/investigation';

interface CreateInvestigationDialogProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (investigation: Investigation) => void;
}

const INVESTIGATION_TYPES: { value: InvestigationType; label: string }[] = [
  { value: 'FULL', label: 'Full Investigation' },
  { value: 'LIMITED', label: 'Limited Investigation' },
  { value: 'INQUIRY', label: 'Inquiry' },
];

const DEPARTMENTS: { value: InvestigationDepartment; label: string }[] = [
  { value: 'HR', label: 'Human Resources' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'OTHER', label: 'Other' },
];

export function CreateInvestigationDialog({
  caseId,
  open,
  onOpenChange,
  onSuccess,
}: CreateInvestigationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateInvestigationInput>({
    investigationType: 'FULL',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setFormData({ investigationType: 'FULL' });
    setErrors({});
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.investigationType) {
      newErrors.investigationType = 'Investigation type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const investigation = await createInvestigation(caseId, formData);
      toast.success('Investigation created successfully');
      onSuccess(investigation);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create investigation:', error);
      toast.error('Failed to create investigation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Investigation</DialogTitle>
            <DialogDescription>
              Start a new investigation for this case. You can assign investigators
              after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Investigation Type (Required) */}
            <div className="grid gap-2">
              <Label htmlFor="investigationType">
                Investigation Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.investigationType}
                onValueChange={(value: InvestigationType) =>
                  setFormData((prev) => ({ ...prev, investigationType: value }))
                }
              >
                <SelectTrigger
                  id="investigationType"
                  data-testid="investigation-type-select"
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INVESTIGATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.investigationType && (
                <p className="text-sm text-red-500">{errors.investigationType}</p>
              )}
            </div>

            {/* Department (Optional) */}
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department || ''}
                onValueChange={(value: string) =>
                  setFormData((prev) => ({
                    ...prev,
                    department: value ? (value as InvestigationDepartment) : undefined,
                  }))
                }
              >
                <SelectTrigger id="department" data-testid="department-select">
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date (Optional) */}
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate?.split('T')[0] || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dueDate: e.target.value ? `${e.target.value}T00:00:00Z` : undefined,
                  }))
                }
                min={new Date().toISOString().split('T')[0]}
                data-testid="due-date-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="submit-button">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Investigation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
