'use client';

/**
 * SubjectSelector - Subject Search and Entry Component
 *
 * Allows operators to search for subjects via HRIS or enter manually.
 *
 * Features:
 * - HRIS search mode with typeahead
 * - Manual entry mode with form fields
 * - Toggle between modes
 * - "Subject Unknown" option
 * - Org chart context on selection
 *
 * @see IntakeForm for parent component
 * @see useHrisSearch for search functionality
 */

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  User,
  Building2,
  UserPlus,
  X,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHrisSearch } from '@/hooks/useHrisSearch';
import type { HrisResult } from '@/types/operator.types';
import type { IntakeSubject } from '@/hooks/useIntake';

export interface SubjectSelectorProps {
  /** Client organization ID */
  clientId: string;
  /** Currently selected subject */
  selectedSubject?: IntakeSubject;
  /** Called when subject is selected from HRIS */
  onSelect: (employee: HrisResult) => void;
  /** Called when subject is entered manually */
  onManualEntry: (subject: Omit<IntakeSubject, 'type'>) => void;
  /** Whether inputs are disabled */
  disabled?: boolean;
}

/**
 * Relationship options for manual entry.
 */
const relationshipOptions = [
  { value: 'employee', label: 'Employee' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'customer', label: 'Customer' },
  { value: 'former_employee', label: 'Former Employee' },
  { value: 'other', label: 'Other' },
];

/**
 * Subject selector component with HRIS search and manual entry modes.
 *
 * @param props - Component props
 * @returns SubjectSelector component
 */
export function SubjectSelector({
  clientId,
  selectedSubject,
  onSelect,
  onManualEntry,
  disabled = false,
}: SubjectSelectorProps) {
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [isUnknown, setIsUnknown] = useState(false);

  // Manual entry state
  const [manualData, setManualData] = useState<Omit<IntakeSubject, 'type'>>({
    firstName: '',
    lastName: '',
    jobTitle: '',
    department: '',
    relationship: '',
  });

  const { search, results, isSearching, clearResults } = useHrisSearch(clientId);

  /**
   * Handle search input change.
   */
  const handleSearchChange = useCallback(
    (query: string) => {
      if (query.length >= 2) {
        search(query);
      } else {
        clearResults();
      }
    },
    [search, clearResults]
  );

  /**
   * Handle employee selection from search results.
   */
  const handleSelectEmployee = useCallback(
    (employee: HrisResult) => {
      onSelect(employee);
      clearResults();
    },
    [onSelect, clearResults]
  );

  /**
   * Handle manual entry field change.
   */
  const handleManualChange = (
    field: keyof Omit<IntakeSubject, 'type'>,
    value: string
  ) => {
    setManualData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Save manual entry.
   */
  const handleSaveManual = () => {
    if (manualData.firstName || manualData.lastName) {
      onManualEntry(manualData);
    }
  };

  /**
   * Toggle unknown subject.
   */
  const handleToggleUnknown = () => {
    if (isUnknown) {
      setIsUnknown(false);
    } else {
      setIsUnknown(true);
      onManualEntry({});
    }
  };

  /**
   * Clear selection.
   */
  const handleClear = () => {
    setIsUnknown(false);
    setManualData({
      firstName: '',
      lastName: '',
      jobTitle: '',
      department: '',
      relationship: '',
    });
    clearResults();
  };

  return (
    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Subject of Report (Optional)</span>
        </div>

        {/* Unknown subject toggle */}
        <Button
          type="button"
          variant={isUnknown ? 'default' : 'ghost'}
          size="sm"
          onClick={handleToggleUnknown}
          disabled={disabled}
          className="text-xs"
        >
          <HelpCircle className="h-3 w-3 mr-1" />
          Subject Unknown
        </Button>
      </div>

      {/* Selected Subject Display */}
      {selectedSubject && !isUnknown && (
        <SelectedSubjectCard
          subject={selectedSubject}
          onClear={handleClear}
          disabled={disabled}
        />
      )}

      {/* Unknown Subject Message */}
      {isUnknown && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          Subject is unknown or not specified
        </div>
      )}

      {/* Mode Toggle */}
      {!selectedSubject && !isUnknown && (
        <>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'search' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('search')}
              disabled={disabled}
            >
              <Search className="h-3 w-3 mr-1" />
              Search HRIS
            </Button>
            <Button
              type="button"
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('manual')}
              disabled={disabled}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Manual Entry
            </Button>
          </div>

          {/* Search Mode */}
          {mode === 'search' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or department..."
                  onChange={(e) => handleSearchChange(e.target.value)}
                  disabled={disabled}
                  className="pl-9"
                />
              </div>

              {/* Search Results */}
              {isSearching && (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              )}

              {results && results.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {results.map((employee) => (
                    <EmployeeResultCard
                      key={employee.id}
                      employee={employee}
                      onSelect={() => handleSelectEmployee(employee)}
                      disabled={disabled}
                    />
                  ))}
                </div>
              )}

              {results && results.length === 0 && !isSearching && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No results found
                </p>
              )}
            </div>
          )}

          {/* Manual Entry Mode */}
          {mode === 'manual' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="subjectFirstName" className="text-xs">
                    First Name
                  </Label>
                  <Input
                    id="subjectFirstName"
                    placeholder="First name..."
                    value={manualData.firstName || ''}
                    onChange={(e) => handleManualChange('firstName', e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="subjectLastName" className="text-xs">
                    Last Name
                  </Label>
                  <Input
                    id="subjectLastName"
                    placeholder="Last name..."
                    value={manualData.lastName || ''}
                    onChange={(e) => handleManualChange('lastName', e.target.value)}
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="subjectTitle" className="text-xs">
                    Job Title (optional)
                  </Label>
                  <Input
                    id="subjectTitle"
                    placeholder="Job title..."
                    value={manualData.jobTitle || ''}
                    onChange={(e) => handleManualChange('jobTitle', e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="subjectDept" className="text-xs">
                    Department (optional)
                  </Label>
                  <Input
                    id="subjectDept"
                    placeholder="Department..."
                    value={manualData.department || ''}
                    onChange={(e) => handleManualChange('department', e.target.value)}
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="subjectRelation" className="text-xs">
                  Relationship to Organization
                </Label>
                <Select
                  value={manualData.relationship || ''}
                  onValueChange={(value) => handleManualChange('relationship', value)}
                  disabled={disabled}
                >
                  <SelectTrigger id="subjectRelation">
                    <SelectValue placeholder="Select relationship..." />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleSaveManual}
                disabled={disabled || (!manualData.firstName && !manualData.lastName)}
              >
                Add Subject
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Selected subject display card.
 */
interface SelectedSubjectCardProps {
  subject: IntakeSubject;
  onClear: () => void;
  disabled?: boolean;
}

function SelectedSubjectCard({
  subject,
  onClear,
  disabled,
}: SelectedSubjectCardProps) {
  const fullName =
    [subject.firstName, subject.lastName].filter(Boolean).join(' ') || 'Unknown';

  return (
    <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{fullName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {subject.jobTitle && <span>{subject.jobTitle}</span>}
            {subject.jobTitle && subject.department && <span>|</span>}
            {subject.department && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {subject.department}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {subject.type === 'hris' ? 'From HRIS' : 'Manually entered'}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClear}
        disabled={disabled}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * HRIS search result card.
 */
interface EmployeeResultCardProps {
  employee: HrisResult;
  onSelect: () => void;
  disabled?: boolean;
}

function EmployeeResultCard({
  employee,
  onSelect,
  disabled,
}: EmployeeResultCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 p-2 rounded-lg border bg-card',
        'hover:bg-muted transition-colors text-left',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <User className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {employee.firstName} {employee.lastName}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {employee.jobTitle && (
            <span className="truncate">{employee.jobTitle}</span>
          )}
          {employee.department && (
            <span className="flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              {employee.department}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}
