import { PropertyType, FilterOperator } from "./types";

export interface OperatorOption {
  value: FilterOperator;
  label: string;
  requiresValue: boolean;
  requiresSecondaryValue?: boolean;
  requiresUnit?: boolean;
}

export const OPERATORS_BY_TYPE: Record<PropertyType, OperatorOption[]> = {
  text: [
    { value: "is", label: "is", requiresValue: true },
    { value: "is_not", label: "is not", requiresValue: true },
    { value: "contains", label: "contains", requiresValue: true },
    {
      value: "does_not_contain",
      label: "does not contain",
      requiresValue: true,
    },
    { value: "starts_with", label: "starts with", requiresValue: true },
    { value: "ends_with", label: "ends with", requiresValue: true },
    { value: "is_known", label: "is known", requiresValue: false },
    { value: "is_unknown", label: "is unknown", requiresValue: false },
  ],
  number: [
    { value: "is_equal_to", label: "is equal to", requiresValue: true },
    { value: "is_not_equal_to", label: "is not equal to", requiresValue: true },
    { value: "is_greater_than", label: "is greater than", requiresValue: true },
    {
      value: "is_greater_than_or_equal_to",
      label: "is greater than or equal to",
      requiresValue: true,
    },
    { value: "is_less_than", label: "is less than", requiresValue: true },
    {
      value: "is_less_than_or_equal_to",
      label: "is less than or equal to",
      requiresValue: true,
    },
    {
      value: "is_between",
      label: "is between",
      requiresValue: true,
      requiresSecondaryValue: true,
    },
    { value: "is_known", label: "is known", requiresValue: false },
    { value: "is_unknown", label: "is unknown", requiresValue: false },
  ],
  date: [
    { value: "is", label: "is", requiresValue: true },
    { value: "is_before", label: "is before", requiresValue: true },
    { value: "is_after", label: "is after", requiresValue: true },
    {
      value: "is_between",
      label: "is between",
      requiresValue: true,
      requiresSecondaryValue: true,
    },
    {
      value: "is_less_than_n_ago",
      label: "is less than",
      requiresValue: true,
      requiresUnit: true,
    },
    {
      value: "is_more_than_n_ago",
      label: "is more than",
      requiresValue: true,
      requiresUnit: true,
    },
    { value: "is_known", label: "is known", requiresValue: false },
    { value: "is_unknown", label: "is unknown", requiresValue: false },
  ],
  boolean: [
    { value: "is_true", label: "is true", requiresValue: false },
    { value: "is_false", label: "is false", requiresValue: false },
    { value: "is_known", label: "is known", requiresValue: false },
    { value: "is_unknown", label: "is unknown", requiresValue: false },
  ],
  enum: [
    { value: "is_any_of", label: "is any of", requiresValue: true },
    { value: "is_none_of", label: "is none of", requiresValue: true },
    { value: "is_known", label: "is known", requiresValue: false },
    { value: "is_unknown", label: "is unknown", requiresValue: false },
  ],
  user: [
    { value: "is_any_of", label: "is any of", requiresValue: true },
    { value: "is_none_of", label: "is none of", requiresValue: true },
    { value: "is_known", label: "is known", requiresValue: false },
    { value: "is_unknown", label: "is unknown", requiresValue: false },
  ],
  status: [
    { value: "is_any_of", label: "is any of", requiresValue: true },
    { value: "is_none_of", label: "is none of", requiresValue: true },
    { value: "is_known", label: "is known", requiresValue: false },
    { value: "is_unknown", label: "is unknown", requiresValue: false },
  ],
  severity: [
    { value: "is_any_of", label: "is any of", requiresValue: true },
    { value: "is_none_of", label: "is none of", requiresValue: true },
    { value: "is_known", label: "is known", requiresValue: false },
    { value: "is_unknown", label: "is unknown", requiresValue: false },
  ],
};

export function getOperatorsForPropertyType(
  type: PropertyType,
): OperatorOption[] {
  return OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.text;
}

export function getOperatorLabel(operator: FilterOperator): string {
  for (const ops of Object.values(OPERATORS_BY_TYPE)) {
    const found = ops.find((o) => o.value === operator);
    if (found) return found.label;
  }
  return operator;
}

export function operatorRequiresValue(operator: FilterOperator): boolean {
  for (const ops of Object.values(OPERATORS_BY_TYPE)) {
    const found = ops.find((o) => o.value === operator);
    if (found) return found.requiresValue;
  }
  return true;
}
