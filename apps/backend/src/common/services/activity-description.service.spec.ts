// =============================================================================
// ACTIVITY DESCRIPTION GENERATOR SERVICE - UNIT TESTS
// =============================================================================
//
// Tests for the ActivityDescriptionGenerator service.
// Covers all standard action types from CORE-DATA-MODEL.md.
// =============================================================================

import {
  ActivityDescriptionGenerator,
  DescriptionContext,
} from "./activity-description.service";

describe("ActivityDescriptionGenerator", () => {
  let generator: ActivityDescriptionGenerator;

  beforeEach(() => {
    generator = new ActivityDescriptionGenerator();
  });

  // -------------------------------------------------------------------------
  // BASIC ACTIONS
  // -------------------------------------------------------------------------

  describe("create action", () => {
    it("should generate description for create action", () => {
      const context: DescriptionContext = {
        action: "created",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe created Case");
    });

    it("should handle different entity types", () => {
      const context: DescriptionContext = {
        action: "created",
        entityType: "Policy",
        actorName: "Jane Smith",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("Jane Smith created Policy");
    });
  });

  describe("update action", () => {
    it("should generate description for generic update", () => {
      const context: DescriptionContext = {
        action: "updated",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe updated Case");
    });

    it("should list changed fields when provided", () => {
      const context: DescriptionContext = {
        action: "updated",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
        changedFields: ["status", "assignee"],
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe updated status, assignee on Case");
    });

    it("should handle bulk updates with count", () => {
      const context: DescriptionContext = {
        action: "updated",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
        count: 5,
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe updated 5 fields on Case");
    });
  });

  describe("delete action", () => {
    it("should generate description for delete action", () => {
      const context: DescriptionContext = {
        action: "deleted",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe deleted Case");
    });
  });

  describe("archive action", () => {
    it("should generate description for archive action", () => {
      const context: DescriptionContext = {
        action: "archived",
        entityType: "Policy",
        actorName: "Jane Smith",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("Jane Smith archived Policy");
    });
  });

  // -------------------------------------------------------------------------
  // STATUS CHANGE ACTION
  // -------------------------------------------------------------------------

  describe("status_changed action", () => {
    it("should generate description for status change with values", () => {
      const context: DescriptionContext = {
        action: "status_changed",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
        oldValue: "OPEN",
        newValue: "IN_PROGRESS",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe changed status from OPEN to IN_PROGRESS");
    });

    it("should handle status change with only new value", () => {
      const context: DescriptionContext = {
        action: "status_changed",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
        newValue: "CLOSED",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe changed status to CLOSED");
    });

    it("should handle status change without values", () => {
      const context: DescriptionContext = {
        action: "status_changed",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe changed status");
    });
  });

  // -------------------------------------------------------------------------
  // ASSIGNMENT ACTIONS
  // -------------------------------------------------------------------------

  describe("assigned action", () => {
    it("should generate description for assignment with assignee", () => {
      const context: DescriptionContext = {
        action: "assigned",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
        assigneeName: "Sarah Chen",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe assigned Case to Sarah Chen");
    });

    it("should handle assignment without assignee name", () => {
      const context: DescriptionContext = {
        action: "assigned",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe assigned Case");
    });
  });

  describe("unassigned action", () => {
    it("should generate description for unassignment with assignee", () => {
      const context: DescriptionContext = {
        action: "unassigned",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
        assigneeName: "Sarah Chen",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe unassigned Case from Sarah Chen");
    });

    it("should handle unassignment without assignee name", () => {
      const context: DescriptionContext = {
        action: "unassigned",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe unassigned Case");
    });
  });

  // -------------------------------------------------------------------------
  // ACCESS ACTIONS
  // -------------------------------------------------------------------------

  describe("commented action", () => {
    it("should generate description for comment action", () => {
      const context: DescriptionContext = {
        action: "commented",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe added comment on Case");
    });
  });

  describe("viewed action", () => {
    it("should generate description for view action", () => {
      const context: DescriptionContext = {
        action: "viewed",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe viewed Case");
    });
  });

  describe("exported action", () => {
    it("should generate description for export with format", () => {
      const context: DescriptionContext = {
        action: "exported",
        entityType: "Report",
        actorName: "John Doe",
        actorType: "USER",
        format: "PDF",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe exported Report to PDF");
    });

    it("should handle export without format", () => {
      const context: DescriptionContext = {
        action: "exported",
        entityType: "Report",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe exported Report");
    });
  });

  // -------------------------------------------------------------------------
  // APPROVAL ACTIONS
  // -------------------------------------------------------------------------

  describe("approved action", () => {
    it("should generate description for approval", () => {
      const context: DescriptionContext = {
        action: "approved",
        entityType: "Policy",
        actorName: "Jane Smith",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("Jane Smith approved Policy");
    });
  });

  describe("rejected action", () => {
    it("should generate description for rejection with reason", () => {
      const context: DescriptionContext = {
        action: "rejected",
        entityType: "Policy",
        actorName: "Jane Smith",
        actorType: "USER",
        reason: "Missing compliance section",
      };

      const result = generator.generate(context);

      expect(result).toBe(
        "Jane Smith rejected Policy: Missing compliance section",
      );
    });

    it("should handle rejection without reason", () => {
      const context: DescriptionContext = {
        action: "rejected",
        entityType: "Policy",
        actorName: "Jane Smith",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("Jane Smith rejected Policy");
    });
  });

  // -------------------------------------------------------------------------
  // AI ACTIONS
  // -------------------------------------------------------------------------

  describe("ai_generated action", () => {
    it("should generate description for AI actions", () => {
      const context: DescriptionContext = {
        action: "ai_generated",
        entityType: "Case",
        actorType: "AI",
        contentType: "summary",
      };

      const result = generator.generate(context);

      expect(result).toBe("AI generated summary for Case");
    });

    it("should handle AI generation without content type", () => {
      const context: DescriptionContext = {
        action: "ai_generated",
        entityType: "Case",
        actorType: "AI",
      };

      const result = generator.generate(context);

      expect(result).toBe("AI generated content for Case");
    });
  });

  describe("ai_edited action", () => {
    it("should generate description for editing AI content", () => {
      const context: DescriptionContext = {
        action: "ai_edited",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
        contentType: "summary",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe edited AI-generated summary");
    });

    it("should handle AI edit without content type", () => {
      const context: DescriptionContext = {
        action: "ai_edited",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe edited AI-generated content");
    });
  });

  // -------------------------------------------------------------------------
  // SYSTEM ACTIONS
  // -------------------------------------------------------------------------

  describe("system actions (no actor)", () => {
    it("should generate description for system actions (no actor)", () => {
      const context: DescriptionContext = {
        action: "updated",
        entityType: "Case",
        actorType: "SYSTEM",
      };

      const result = generator.generate(context);

      expect(result).toBe("System updated Case");
    });

    it("should generate description for synced action with count", () => {
      const context: DescriptionContext = {
        action: "synced",
        entityType: "Employee",
        actorType: "SYSTEM",
        count: 150,
      };

      const result = generator.generate(context);

      expect(result).toBe("HRIS sync updated 150 records");
    });

    it("should handle synced action without count", () => {
      const context: DescriptionContext = {
        action: "synced",
        entityType: "Employee",
        actorType: "SYSTEM",
      };

      const result = generator.generate(context);

      expect(result).toBe("HRIS sync completed");
    });
  });

  // -------------------------------------------------------------------------
  // SECURITY ACTIONS
  // -------------------------------------------------------------------------

  describe("login action", () => {
    it("should generate description for login with location", () => {
      const context: DescriptionContext = {
        action: "login",
        entityType: "User",
        actorName: "John Doe",
        actorType: "USER",
        location: "New York, US",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe logged in from New York, US");
    });

    it("should handle login without location", () => {
      const context: DescriptionContext = {
        action: "login",
        entityType: "User",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe logged in");
    });
  });

  describe("login_failed action", () => {
    it("should generate description for failed login with email", () => {
      const context: DescriptionContext = {
        action: "login_failed",
        entityType: "User",
        email: "john.doe@example.com",
      };

      const result = generator.generate(context);

      expect(result).toBe("Failed login attempt for john.doe@example.com");
    });

    it("should handle failed login without email", () => {
      const context: DescriptionContext = {
        action: "login_failed",
        entityType: "User",
      };

      const result = generator.generate(context);

      expect(result).toBe("Failed login attempt");
    });
  });

  // -------------------------------------------------------------------------
  // ANONYMOUS ACTIONS
  // -------------------------------------------------------------------------

  describe("anonymous actions", () => {
    it("should generate description for anonymous reporter", () => {
      const context: DescriptionContext = {
        action: "created",
        entityType: "Case",
        actorType: "ANONYMOUS",
      };

      const result = generator.generate(context);

      expect(result).toBe("Anonymous reporter created Case");
    });

    it("should handle anonymous comment", () => {
      const context: DescriptionContext = {
        action: "commented",
        entityType: "Case",
        actorType: "ANONYMOUS",
      };

      const result = generator.generate(context);

      expect(result).toBe("Anonymous reporter added comment on Case");
    });
  });

  // -------------------------------------------------------------------------
  // INTEGRATION ACTIONS
  // -------------------------------------------------------------------------

  describe("integration actions", () => {
    it("should use integration name when provided", () => {
      const context: DescriptionContext = {
        action: "created",
        entityType: "Employee",
        actorName: "Workday",
        actorType: "INTEGRATION",
      };

      const result = generator.generate(context);

      expect(result).toBe("Workday created Employee");
    });

    it('should fall back to "Integration" when name not provided', () => {
      const context: DescriptionContext = {
        action: "updated",
        entityType: "Employee",
        actorType: "INTEGRATION",
      };

      const result = generator.generate(context);

      expect(result).toBe("Integration updated Employee");
    });
  });

  // -------------------------------------------------------------------------
  // FALLBACK BEHAVIOR
  // -------------------------------------------------------------------------

  describe("unknown actions", () => {
    it("should handle unknown actions with fallback", () => {
      const context: DescriptionContext = {
        action: "custom_action",
        entityType: "Document",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe performed custom_action on Document");
    });

    it("should handle unknown action with system actor", () => {
      const context: DescriptionContext = {
        action: "maintenance_cleanup",
        entityType: "TempFile",
        actorType: "SYSTEM",
      };

      const result = generator.generate(context);

      expect(result).toBe("System performed maintenance_cleanup on TempFile");
    });
  });

  // -------------------------------------------------------------------------
  // EDGE CASES
  // -------------------------------------------------------------------------

  describe("edge cases", () => {
    it("should handle missing actor type with user name", () => {
      const context: DescriptionContext = {
        action: "created",
        entityType: "Case",
        actorName: "John Doe",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe created Case");
    });

    it('should fall back to "User" when no actor info provided', () => {
      const context: DescriptionContext = {
        action: "created",
        entityType: "Case",
      };

      const result = generator.generate(context);

      expect(result).toBe("User created Case");
    });

    it('should use "System" when actorType is SYSTEM even if actorName provided', () => {
      const context: DescriptionContext = {
        action: "updated",
        entityType: "Case",
        actorName: "Scheduler",
        actorType: "SYSTEM",
      };

      const result = generator.generate(context);

      expect(result).toBe("System updated Case");
    });

    it('should use "AI" when actorType is AI even if actorName provided', () => {
      const context: DescriptionContext = {
        action: "commented",
        entityType: "Case",
        actorName: "Claude",
        actorType: "AI",
      };

      const result = generator.generate(context);

      expect(result).toBe("AI added comment on Case");
    });
  });
});
