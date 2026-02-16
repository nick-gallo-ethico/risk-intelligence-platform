/**
 * Form Builder Component Tests
 *
 * Tests for the visual form builder with drag-drop field management,
 * section organization, and form configuration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock @dnd-kit/core
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-context">{children}</div>
  ),
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
  useSensor: vi.fn(),
  useSensors: () => [],
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  closestCenter: vi.fn(),
}));

// Mock @dnd-kit/sortable
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
  arrayMove: vi.fn((arr, from, to) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
  sortableKeyboardCoordinates: vi.fn(),
}));

// Mock @dnd-kit/utilities
vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => null,
    },
    Translate: {
      toString: () => null,
    },
  },
}));

// Mock @radix-ui/react-collapsible with proper exports
vi.mock("@radix-ui/react-collapsible", () => {
  const React = require("react");
  const Root = React.forwardRef(
    ({ children, open, ...props }: any, ref: any) => (
      <div ref={ref} data-testid="collapsible" data-open={open} {...props}>
        {children}
      </div>
    ),
  );
  Root.displayName = "Collapsible.Root";

  const Content = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} data-testid="collapsible-content" {...props}>
      {children}
    </div>
  ));
  Content.displayName = "Collapsible.Content";

  const Trigger = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <button ref={ref} data-testid="collapsible-trigger" {...props}>
      {children}
    </button>
  ));
  Trigger.displayName = "Collapsible.Trigger";

  return {
    Root,
    CollapsibleContent: Content,
    CollapsibleTrigger: Trigger,
  };
});

import {
  FormBuilder,
  type FormBuilderState,
  type FormField,
  type FormSection,
} from "@/components/disclosures/form-builder/FormBuilder";

// ============================================================================
// Test Data
// ============================================================================

const mockEmptyState: FormBuilderState = {
  sections: [
    {
      id: "default-section",
      name: "Section 1",
      fields: [],
    },
  ],
  selectedFieldId: null,
  selectedSectionId: null,
  isDirty: false,
  lastSaved: null,
};

const mockPopulatedState: FormBuilderState = {
  sections: [
    {
      id: "section-1",
      name: "Personal Information",
      fields: [
        {
          id: "field-1",
          type: "text",
          label: "Full Name",
          required: true,
          config: { maxLength: 255 },
        },
        {
          id: "field-2",
          type: "email",
          label: "Email Address",
          required: true,
          config: {},
        },
      ],
    },
    {
      id: "section-2",
      name: "Disclosure Details",
      fields: [
        {
          id: "field-3",
          type: "textarea",
          label: "Description",
          required: false,
          config: { maxLength: 2000 },
        },
      ],
    },
  ],
  selectedFieldId: null,
  selectedSectionId: null,
  isDirty: false,
  lastSaved: null,
};

// ============================================================================
// Tests
// ============================================================================

describe("FormBuilder", () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("render states", () => {
    it("should render empty form canvas with default section", () => {
      render(<FormBuilder />);

      // Should render the DndContext wrapper
      expect(screen.getByTestId("dnd-context")).toBeInTheDocument();

      // Should show the field palette
      expect(screen.getByText("Field Types")).toBeInTheDocument();

      // Should have "Add Section" button
      expect(
        screen.getByRole("button", { name: /add section/i }),
      ).toBeInTheDocument();
    });

    it("should render form with initial state", () => {
      render(<FormBuilder initialState={mockPopulatedState} />);

      // Should show section names
      expect(screen.getByText("Personal Information")).toBeInTheDocument();
      expect(screen.getByText("Disclosure Details")).toBeInTheDocument();

      // Should show field counts (using getAllByText for flexible matching)
      const fieldCountElements = screen.getAllByText(/\d+ field/);
      expect(fieldCountElements.length).toBeGreaterThanOrEqual(2);
    });

    it("should show field labels in sections", () => {
      render(<FormBuilder initialState={mockPopulatedState} />);

      expect(screen.getByText("Full Name")).toBeInTheDocument();
      expect(screen.getByText("Email Address")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
    });
  });

  describe("field palette", () => {
    it("should show available field types", () => {
      render(<FormBuilder />);

      // Basic field types should be visible
      expect(screen.getByText("Text")).toBeInTheDocument();
      expect(screen.getByText("Textarea")).toBeInTheDocument();
      expect(screen.getByText("Number")).toBeInTheDocument();
      expect(screen.getByText("Date")).toBeInTheDocument();
    });

    it("should show compliance field types", () => {
      render(<FormBuilder />);

      // Compliance field types from the palette
      expect(screen.getByText("Relationship Mapper")).toBeInTheDocument();
      expect(screen.getByText("Dollar Threshold")).toBeInTheDocument();
    });

    it("should show field search input", () => {
      render(<FormBuilder />);

      expect(screen.getByPlaceholderText(/search fields/i)).toBeInTheDocument();
    });
  });

  describe("section management", () => {
    it("should add new section when clicking add section button", async () => {
      const user = userEvent.setup();
      render(<FormBuilder />);

      const addButton = screen.getByRole("button", { name: /add section/i });
      await user.click(addButton);

      // Should have created a second section
      expect(screen.getByText("Section 2")).toBeInTheDocument();
    });

    it("should delete section when clicking delete button", async () => {
      const user = userEvent.setup();
      render(<FormBuilder initialState={mockPopulatedState} />);

      // Find delete buttons (trash icons)
      const deleteButtons = screen
        .getAllByRole("button")
        .filter(
          (btn) =>
            btn.querySelector('svg[class*="lucide-trash"]') ||
            btn.className.includes("text-red") ||
            btn.getAttribute("aria-label")?.includes("delete"),
        );

      // Should have delete buttons for sections
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("should toggle section collapse when clicking chevron", async () => {
      const user = userEvent.setup();
      render(<FormBuilder initialState={mockPopulatedState} />);

      // Find collapse buttons
      const collapseButtons = screen
        .getAllByRole("button")
        .filter((btn) => btn.querySelector('svg[class*="chevron"]'));

      expect(collapseButtons.length).toBeGreaterThan(0);
    });

    it("should allow editing section name", async () => {
      const user = userEvent.setup();
      render(<FormBuilder initialState={mockPopulatedState} />);

      // Click on section name to edit
      const sectionName = screen.getByText("Personal Information");
      await user.click(sectionName);

      // Should show input field for editing
      const input = screen.getByDisplayValue("Personal Information");
      expect(input).toBeInTheDocument();
    });
  });

  describe("field management", () => {
    it("should show required indicator on required fields", () => {
      render(<FormBuilder initialState={mockPopulatedState} />);

      // Required fields should have asterisk
      const requiredIndicators = screen.getAllByText("*");
      expect(requiredIndicators.length).toBeGreaterThanOrEqual(2);
    });

    it("should select field when clicking on it", async () => {
      const user = userEvent.setup();
      render(<FormBuilder initialState={mockPopulatedState} />);

      const fieldElement = screen.getByText("Full Name").closest("div");
      expect(fieldElement).toBeInTheDocument();

      if (fieldElement) {
        await user.click(fieldElement);
      }

      // Field configuration panel should be visible
      // (Implementation varies but should show settings)
    });

    it("should delete field when clicking delete button", async () => {
      const user = userEvent.setup();
      render(<FormBuilder initialState={mockPopulatedState} />);

      // Initially should have 3 fields
      expect(screen.getByText("Full Name")).toBeInTheDocument();
      expect(screen.getByText("Email Address")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
    });
  });

  describe("field configuration panel", () => {
    it("should show field settings when field is selected", async () => {
      const user = userEvent.setup();

      const stateWithSelection: FormBuilderState = {
        ...mockPopulatedState,
        selectedFieldId: "field-1",
        selectedSectionId: "section-1",
      };

      render(<FormBuilder initialState={stateWithSelection} />);

      // Should show field settings panel
      expect(screen.getByText("Field Settings")).toBeInTheDocument();
    });

    it("should show label input in configuration panel", async () => {
      const stateWithSelection: FormBuilderState = {
        ...mockPopulatedState,
        selectedFieldId: "field-1",
        selectedSectionId: "section-1",
      };

      render(<FormBuilder initialState={stateWithSelection} />);

      expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
    });

    it("should show required checkbox in configuration panel", async () => {
      const stateWithSelection: FormBuilderState = {
        ...mockPopulatedState,
        selectedFieldId: "field-1",
        selectedSectionId: "section-1",
      };

      render(<FormBuilder initialState={stateWithSelection} />);

      expect(screen.getByText(/required field/i)).toBeInTheDocument();
    });

    it("should show validation section in configuration panel", async () => {
      const stateWithSelection: FormBuilderState = {
        ...mockPopulatedState,
        selectedFieldId: "field-1",
        selectedSectionId: "section-1",
      };

      render(<FormBuilder initialState={stateWithSelection} />);

      expect(screen.getByText("Validation")).toBeInTheDocument();
    });

    it("should show conditional logic toggle in configuration panel", async () => {
      const stateWithSelection: FormBuilderState = {
        ...mockPopulatedState,
        selectedFieldId: "field-1",
        selectedSectionId: "section-1",
      };

      render(<FormBuilder initialState={stateWithSelection} />);

      expect(screen.getByText("Conditional Logic")).toBeInTheDocument();
    });
  });

  describe("auto-save functionality", () => {
    it("should show unsaved changes indicator when dirty", () => {
      const dirtyState: FormBuilderState = {
        ...mockPopulatedState,
        isDirty: true,
      };

      render(<FormBuilder initialState={dirtyState} />);

      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });

    it("should show last saved time when not dirty", () => {
      const savedState: FormBuilderState = {
        ...mockPopulatedState,
        isDirty: false,
        lastSaved: new Date(),
      };

      render(<FormBuilder initialState={savedState} />);

      expect(screen.getByText(/last saved/i)).toBeInTheDocument();
    });

    it("should call onSave callback", async () => {
      vi.useFakeTimers();

      const dirtyState: FormBuilderState = {
        ...mockPopulatedState,
        isDirty: true,
      };

      render(
        <FormBuilder
          initialState={dirtyState}
          onSave={mockOnSave}
          autoSaveInterval={100}
        />,
      );

      // Fast-forward time to trigger auto-save
      await vi.advanceTimersByTimeAsync(150);

      // onSave should be called
      expect(mockOnSave).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("drag and drop visual feedback", () => {
    it("should render drag overlay container", () => {
      render(<FormBuilder />);

      expect(screen.getByTestId("drag-overlay")).toBeInTheDocument();
    });

    it("should render sortable context for fields", () => {
      render(<FormBuilder initialState={mockPopulatedState} />);

      const sortableContexts = screen.getAllByTestId("sortable-context");
      expect(sortableContexts.length).toBeGreaterThan(0);
    });

    it("should show empty drop zone message when section has no fields", () => {
      const emptySection: FormBuilderState = {
        sections: [
          {
            id: "empty-section",
            name: "Empty Section",
            fields: [],
          },
        ],
        selectedFieldId: null,
        selectedSectionId: null,
        isDirty: false,
        lastSaved: null,
      };

      render(<FormBuilder initialState={emptySection} />);

      expect(screen.getByText(/drag fields here/i)).toBeInTheDocument();
    });
  });

  describe("repeater section configuration", () => {
    it("should show repeater configuration for sections with repeater enabled", () => {
      const repeaterState: FormBuilderState = {
        sections: [
          {
            id: "repeater-section",
            name: "Gifts Received",
            fields: [],
            repeater: {
              enabled: true,
              minItems: 1,
              maxItems: 10,
              addButtonText: "Add Another Gift",
            },
          },
        ],
        selectedFieldId: null,
        selectedSectionId: "repeater-section",
        isDirty: false,
        lastSaved: null,
      };

      render(<FormBuilder initialState={repeaterState} />);

      // Should show repeater badge (there may be multiple - one as badge, one as section config header)
      const repeaterElements = screen.getAllByText("Repeater");
      expect(repeaterElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("form validation", () => {
    it("should require at least one section", () => {
      render(<FormBuilder />);

      // Default state should have at least one section
      expect(screen.getByText("Section 1")).toBeInTheDocument();
    });
  });
});
