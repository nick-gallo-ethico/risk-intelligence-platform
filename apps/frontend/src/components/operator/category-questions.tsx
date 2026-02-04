'use client';

/**
 * CategoryQuestions - Category-specific Questions Component
 *
 * Loads and renders dynamic questions based on selected category.
 * Questions are fetched from the API when category changes.
 *
 * Features:
 * - Dynamic question loading per category
 * - Multiple question types: text, select, date, checkbox, radio
 * - Required field validation
 * - Category-aware prompts
 *
 * @see IntakeForm for parent component
 */

import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { apiClient } from '@/lib/api';

export interface CategoryQuestionsProps {
  /** Selected category ID */
  categoryId: string;
  /** Client organization ID */
  clientId: string;
  /** Current answer values */
  values: Record<string, unknown>;
  /** Called when answers change */
  onChange: (answers: Record<string, unknown>) => void;
  /** Whether inputs are disabled */
  disabled?: boolean;
}

/**
 * Question definition from API.
 */
export interface CategoryQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'checkbox' | 'radio';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
  order: number;
}

/**
 * Category questions component.
 *
 * @param props - Component props
 * @returns CategoryQuestions component
 */
export function CategoryQuestions({
  categoryId,
  clientId,
  values,
  onChange,
  disabled = false,
}: CategoryQuestionsProps) {
  // Fetch category-specific questions
  const { data: questions, isLoading } = useQuery({
    queryKey: ['operator', 'categoryQuestions', clientId, categoryId],
    queryFn: async () => {
      return apiClient.get<CategoryQuestion[]>(
        `/operator/clients/${clientId}/categories/${categoryId}/questions`
      );
    },
    enabled: !!categoryId && !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Handle field value change.
   */
  const handleChange = (questionId: string, value: unknown) => {
    onChange({ [questionId]: value });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
        <Skeleton className="h-4 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return null;
  }

  // Sort questions by order
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-muted">
      <p className="text-sm font-medium text-muted-foreground">
        Category-specific Questions
      </p>
      <div className="space-y-4">
        {sortedQuestions.map((question) => (
          <QuestionField
            key={question.id}
            question={question}
            value={values[question.id]}
            onChange={(value) => handleChange(question.id, value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual question field component.
 */
interface QuestionFieldProps {
  question: CategoryQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

function QuestionField({
  question,
  value,
  onChange,
  disabled,
}: QuestionFieldProps) {
  const { id, label, type, required, placeholder, helpText, options } = question;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>

      {type === 'text' && (
        <Input
          id={id}
          type="text"
          placeholder={placeholder}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}

      {type === 'textarea' && (
        <Textarea
          id={id}
          placeholder={placeholder}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="min-h-[80px]"
        />
      )}

      {type === 'select' && options && (
        <Select
          value={(value as string) || ''}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder={placeholder || 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {type === 'date' && (
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id={id}
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="pl-9"
          />
        </div>
      )}

      {type === 'checkbox' && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={!!value}
            onCheckedChange={onChange}
            disabled={disabled}
          />
          {placeholder && (
            <label htmlFor={id} className="text-sm cursor-pointer">
              {placeholder}
            </label>
          )}
        </div>
      )}

      {type === 'radio' && options && (
        <div className="space-y-2">
          {options.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <input
                type="radio"
                id={`${id}-${opt.value}`}
                name={id}
                value={opt.value}
                checked={value === opt.value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="h-4 w-4"
              />
              <label
                htmlFor={`${id}-${opt.value}`}
                className="text-sm cursor-pointer"
              >
                {opt.label}
              </label>
            </div>
          ))}
        </div>
      )}

      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
