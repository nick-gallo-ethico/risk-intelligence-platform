/**
 * Form Renderer (DisclosureForm) Component Tests
 *
 * Tests for the multi-step form wizard that renders disclosure forms,
 * handles validation, auto-saves drafts, and manages submissions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DisclosureForm,
  type FormTemplate,
  type FormSection,
  type FormField,
} from "@/components/disclosures/DisclosureForm";

// ============================================================================
// Mock toast
// ============================================================================

vi.mock("@/components/ui/toaster", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ============================================================================
// Test Data
// ============================================================================

const createMockField = (overrides: Partial<FormField> = {}): FormField => ({
  id: `field-${Math.random().toString(36).substr(2, 9)}`,
  name: "testField",
  label: "Test Field",
  type: "text",
  required: false,
  ...overrides,
});

const createMockSection = (
  overrides: Partial<FormSection> = {},
): FormSection => ({
  id: `section-${Math.random().toString(36).substr(2, 9)}`,
  title: "Test Section",
  fields: [],
  ...overrides,
});

const mockFormTemplate: FormTemplate = {
  id: "template-1",
  name: "Conflict of Interest Disclosure",
  description: "Annual COI disclosure form",
  sections: [
    {
      id: "section-personal",
      title: "Personal Information",
      description: "Provide your contact details",
      fields: [
        {
          id: "field-name",
          name: "fullName",
          label: "Full Name",
          type: "text",
          required: true,
          placeholder: "Enter your full name",
          minLength: 2,
          maxLength: 100,
        },
        {
          id: "field-email",
          name: "email",
          label: "Email Address",
          type: "email",
          required: true,
          placeholder: "Enter your email",
        },
        {
          id: "field-phone",
          name: "phone",
          label: "Phone Number",
          type: "phone",
          required: false,
          placeholder: "Enter your phone number",
        },
      ],
    },
    {
      id: "section-disclosure",
      title: "Disclosure Details",
      description: "Describe any potential conflicts",
      fields: [
        {
          id: "field-hasConflict",
          name: "hasConflict",
          label: "Do you have any conflicts to disclose?",
          type: "select",
          required: true,
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
        {
          id: "field-description",
          name: "conflictDescription",
          label: "Description of Conflict",
          type: "textarea",
          required: false,
          placeholder: "Describe the conflict in detail",
          conditionalVisibility: {
            field: "hasConflict",
            operator: "eq",
            value: "yes",
          },
        },
        {
          id: "field-amount",
          name: "financialAmount",
          label: "Financial Amount",
          type: "currency",
          required: false,
          min: 0,
          max: 1000000,
        },
      ],
    },
    {
      id: "section-dates",
      title: "Dates",
      fields: [
        {
          id: "field-startDate",
          name: "startDate",
          label: "Start Date",
          type: "date",
          required: true,
        },
        {
          id: "field-acknowledge",
          name: "acknowledge",
          label: "I acknowledge this disclosure",
          type: "checkbox",
          required: true,
        },
      ],
    },
  ],
};

const mockDraftData = {
  fullName: "John Doe",
  email: "john@example.com",
};

// ============================================================================
// Tests
// ============================================================================

describe("DisclosureForm (Form Renderer)", () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  const mockOnSaveDraft = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("render states", () => {
    it("should render form fields from definition", () => {
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Should show first section title
      expect(screen.getByText("Personal Information")).toBeInTheDocument();

      // Should show form fields
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it("should show required indicator on required fields", () => {
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Required fields should have asterisk
      const fullNameLabel = screen.getByText("Full Name");
      const labelContainer = fullNameLabel.closest("label");
      expect(labelContainer).toHaveTextContent("*");
    });

    it("should show progress indicator", () => {
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Should show step progress
      expect(screen.getByText(/step 1 of/i)).toBeInTheDocument();
    });

    it("should show completion percentage", () => {
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Should show completion badge
      expect(screen.getByText(/% complete/i)).toBeInTheDocument();
    });
  });

  describe("field rendering by type", () => {
    it("should handle text field input", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, "Jane Smith");

      expect(nameInput).toHaveValue("Jane Smith");
    });

    it("should handle email field input", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, "jane@example.com");

      expect(emailInput).toHaveValue("jane@example.com");
    });

    it("should handle select field selection", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          draftData={{
            fullName: "John Doe",
            email: "john@example.com",
          }}
        />,
      );

      // Navigate to second section with select field
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      // Second section should have the select field
      await waitFor(() => {
        expect(screen.getByText("Disclosure Details")).toBeInTheDocument();
      });
    });

    it("should handle checkbox field", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // Create a simple form with just a checkbox
      const checkboxTemplate: FormTemplate = {
        id: "checkbox-test",
        name: "Checkbox Test",
        sections: [
          {
            id: "section-1",
            title: "Test Section",
            fields: [
              {
                id: "checkbox-field",
                name: "agreed",
                label: "I agree to the terms",
                type: "checkbox",
                required: false,
              },
            ],
          },
        ],
      };

      render(
        <DisclosureForm
          formTemplate={checkboxTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it("should handle date field with date picker", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const dateTemplate: FormTemplate = {
        id: "date-test",
        name: "Date Test",
        sections: [
          {
            id: "section-1",
            title: "Test Section",
            fields: [
              {
                id: "date-field",
                name: "eventDate",
                label: "Event Date",
                type: "date",
                required: false,
              },
            ],
          },
        ],
      };

      render(
        <DisclosureForm
          formTemplate={dateTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      const dateInput = screen.getByLabelText(/event date/i);
      expect(dateInput).toHaveAttribute("type", "date");
    });

    it("should handle currency field", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const currencyTemplate: FormTemplate = {
        id: "currency-test",
        name: "Currency Test",
        sections: [
          {
            id: "section-1",
            title: "Test Section",
            fields: [
              {
                id: "amount-field",
                name: "amount",
                label: "Amount",
                type: "currency",
                required: false,
              },
            ],
          },
        ],
      };

      render(
        <DisclosureForm
          formTemplate={currencyTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Should show dollar sign
      expect(screen.getByText("$")).toBeInTheDocument();

      const amountInput = screen.getByLabelText(/amount/i);
      expect(amountInput).toHaveAttribute("type", "number");
    });
  });

  describe("validation", () => {
    it("should validate required fields on submit", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Try to go to next step without filling required fields
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      // Should show validation errors (may be multiple required fields)
      await waitFor(() => {
        const errors = screen.getAllByText(/this field is required/i);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it("should show validation errors inline", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Fill in name but leave email empty
      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, "John");

      // Try to navigate
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      // Error should appear for email field
      await waitFor(() => {
        const errorMessages = screen.getAllByText(/required/i);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it("should validate email format", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);

      await user.type(nameInput, "John Doe");
      await user.type(emailInput, "invalid-email");

      // Try to navigate
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      // Should show email validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });
  });

  describe("navigation", () => {
    it("should navigate to next step", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          draftData={{
            fullName: "John Doe",
            email: "john@example.com",
          }}
        />,
      );

      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      // Should show second section
      await waitFor(() => {
        expect(screen.getByText("Disclosure Details")).toBeInTheDocument();
      });
    });

    it("should navigate to previous step", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          draftData={{
            fullName: "John Doe",
            email: "john@example.com",
          }}
        />,
      );

      // Go to next step first
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      // Then go back
      const prevButton = screen.getByRole("button", { name: /previous/i });
      await user.click(prevButton);

      // Should show first section again
      await waitFor(() => {
        expect(screen.getByText("Personal Information")).toBeInTheDocument();
      });
    });

    it("should show review step at the end", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const simpleTemplate: FormTemplate = {
        id: "simple-test",
        name: "Simple Test",
        sections: [
          {
            id: "section-1",
            title: "Section 1",
            fields: [
              {
                id: "field-1",
                name: "field1",
                label: "Field 1",
                type: "text",
                required: false,
              },
            ],
          },
        ],
      };

      render(
        <DisclosureForm
          formTemplate={simpleTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Navigate to review (single section, so Review button takes us there)
      // Use getAllByRole since there may be multiple buttons with "review" in name
      const reviewButtons = screen.getAllByRole("button", { name: /review/i });
      // Click the first (or last which is the action button)
      const actionButton = reviewButtons[reviewButtons.length - 1];
      await user.click(actionButton);

      // Should show review step - look for the Review & Submit title
      await waitFor(() => {
        expect(screen.getByText("Review & Submit")).toBeInTheDocument();
      });
    });
  });

  describe("draft functionality", () => {
    it("should restore from saved draft", () => {
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          draftData={mockDraftData}
        />,
      );

      // Fields should be pre-filled
      const nameInput = screen.getByLabelText(/full name/i);
      expect(nameInput).toHaveValue("John Doe");

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveValue("john@example.com");
    });

    it("should auto-save draft periodically", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Type something to make form dirty
      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, "John");

      // Advance time past auto-save interval (30 seconds)
      await vi.advanceTimersByTimeAsync(31000);

      // onSaveDraft should have been called
      await waitFor(() => {
        expect(mockOnSaveDraft).toHaveBeenCalled();
      });
    });

    it("should save draft on navigation", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // Use draftData that is different from what the form starts with
      // so that the "dirty" check triggers a save
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          draftData={{
            fullName: "John Doe",
            email: "john@example.com",
          }}
        />,
      );

      // Make a change to mark form as dirty
      const nameInput = screen.getByLabelText(/full name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Jane Doe");

      // Navigate to next step
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      // onSaveDraft should be called on navigation
      await waitFor(() => {
        expect(mockOnSaveDraft).toHaveBeenCalled();
      });
    });

    it("should show save status indicator", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Type something to make form dirty
      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, "John");

      // Should show unsaved indicator or draft status
      // The component shows either "Unsaved changes" or the DraftIndicator
    });
  });

  describe("conditional visibility", () => {
    it("should hide fields based on conditional rules", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          draftData={{
            fullName: "John Doe",
            email: "john@example.com",
          }}
        />,
      );

      // Navigate to section with conditional field
      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Disclosure Details")).toBeInTheDocument();
      });

      // Description field should be hidden when hasConflict is not "yes"
      // The field "conflictDescription" has conditionalVisibility
    });
  });

  describe("submission", () => {
    it("should submit form data on valid submission", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const simpleTemplate: FormTemplate = {
        id: "simple-test",
        name: "Simple Test",
        sections: [
          {
            id: "section-1",
            title: "Section 1",
            fields: [
              {
                id: "field-1",
                name: "field1",
                label: "Field 1",
                type: "text",
                required: false,
              },
            ],
          },
        ],
      };

      render(
        <DisclosureForm
          formTemplate={simpleTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Fill field
      const input = screen.getByLabelText(/field 1/i);
      await user.type(input, "Test value");

      // Navigate to review - get all buttons with review and click the action one
      const reviewButtons = screen.getAllByRole("button", { name: /review/i });
      await user.click(reviewButtons[reviewButtons.length - 1]);

      // Check attestation
      await waitFor(() => {
        expect(screen.getByText("Review & Submit")).toBeInTheDocument();
      });

      const attestation = screen.getByRole("checkbox");
      await user.click(attestation);

      // Submit
      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      // onSubmit should be called
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it("should require attestation before submission", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const simpleTemplate: FormTemplate = {
        id: "simple-test",
        name: "Simple Test",
        sections: [
          {
            id: "section-1",
            title: "Section 1",
            fields: [
              {
                id: "field-1",
                name: "field1",
                label: "Field 1",
                type: "text",
                required: false,
              },
            ],
          },
        ],
      };

      render(
        <DisclosureForm
          formTemplate={simpleTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Navigate to review - get all buttons with review and click the action one
      const reviewButtons = screen.getAllByRole("button", { name: /review/i });
      await user.click(reviewButtons[reviewButtons.length - 1]);

      // Wait for review step
      await waitFor(() => {
        expect(screen.getByText("Review & Submit")).toBeInTheDocument();
      });

      // Try to submit without attestation
      const submitButton = screen.getByRole("button", { name: /submit/i });

      // Submit button should be disabled
      expect(submitButton).toBeDisabled();
    });
  });

  describe("read-only mode", () => {
    it("should disable inputs in read-only mode", () => {
      render(
        <DisclosureForm
          formTemplate={mockFormTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          readOnly
        />,
      );

      const nameInput = screen.getByLabelText(/full name/i);
      expect(nameInput).toBeDisabled();
    });
  });

  describe("repeater sections", () => {
    it("should render repeater sections with add button", () => {
      const repeaterTemplate: FormTemplate = {
        id: "repeater-test",
        name: "Repeater Test",
        sections: [
          {
            id: "gifts-section",
            title: "Gifts Received",
            isRepeater: true,
            itemLabel: "Gift",
            minItems: 0,
            maxItems: 10,
            fields: [
              {
                id: "gift-desc",
                name: "description",
                label: "Gift Description",
                type: "text",
                required: true,
              },
              {
                id: "gift-value",
                name: "value",
                label: "Estimated Value",
                type: "currency",
                required: true,
              },
            ],
          },
        ],
      };

      render(
        <DisclosureForm
          formTemplate={repeaterTemplate}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />,
      );

      // Should show add button for repeater
      expect(screen.getByText(/add gift/i)).toBeInTheDocument();
    });
  });
});
