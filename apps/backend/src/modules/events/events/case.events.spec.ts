import {
  CaseCreatedEvent,
  CaseUpdatedEvent,
  CaseStatusChangedEvent,
  CaseAssignedEvent,
} from "./case.events";

describe("Case Events", () => {
  const mockOrgId = "org-test-123";
  const mockCaseId = "case-test-123";

  describe("CaseCreatedEvent", () => {
    it("should create event with required fields", () => {
      const event = new CaseCreatedEvent({
        organizationId: mockOrgId,
        caseId: mockCaseId,
        referenceNumber: "ETH-2026-00001",
        sourceChannel: "WEB_FORM",
        severity: "MEDIUM",
      });

      expect(event.caseId).toBe(mockCaseId);
      expect(event.referenceNumber).toBe("ETH-2026-00001");
      expect(event.sourceChannel).toBe("WEB_FORM");
      expect(event.severity).toBe("MEDIUM");
      expect(event.organizationId).toBe(mockOrgId);
    });

    it("should have static eventName property", () => {
      expect(CaseCreatedEvent.eventName).toBe("case.created");
    });

    it("should throw when caseId is missing", () => {
      expect(() => {
        new CaseCreatedEvent({
          organizationId: mockOrgId,
          referenceNumber: "ETH-2026-00001",
          sourceChannel: "WEB_FORM",
          severity: "MEDIUM",
        });
      }).toThrow("CaseCreatedEvent requires caseId");
    });

    it("should throw when referenceNumber is missing", () => {
      expect(() => {
        new CaseCreatedEvent({
          organizationId: mockOrgId,
          caseId: mockCaseId,
          sourceChannel: "WEB_FORM",
          severity: "MEDIUM",
        });
      }).toThrow("CaseCreatedEvent requires referenceNumber");
    });

    it("should throw when sourceChannel is missing", () => {
      expect(() => {
        new CaseCreatedEvent({
          organizationId: mockOrgId,
          caseId: mockCaseId,
          referenceNumber: "ETH-2026-00001",
          severity: "MEDIUM",
        });
      }).toThrow("CaseCreatedEvent requires sourceChannel");
    });

    it("should throw when severity is missing", () => {
      expect(() => {
        new CaseCreatedEvent({
          organizationId: mockOrgId,
          caseId: mockCaseId,
          referenceNumber: "ETH-2026-00001",
          sourceChannel: "WEB_FORM",
        });
      }).toThrow("CaseCreatedEvent requires severity");
    });

    it("should optionally include categoryId", () => {
      const event = new CaseCreatedEvent({
        organizationId: mockOrgId,
        caseId: mockCaseId,
        referenceNumber: "ETH-2026-00001",
        sourceChannel: "WEB_FORM",
        severity: "HIGH",
        categoryId: "cat-123",
      });

      expect(event.categoryId).toBe("cat-123");
    });
  });

  describe("CaseUpdatedEvent", () => {
    it("should create event with required fields", () => {
      const changes = {
        status: { old: "NEW", new: "OPEN" },
      };

      const event = new CaseUpdatedEvent({
        organizationId: mockOrgId,
        caseId: mockCaseId,
        changes,
      });

      expect(event.caseId).toBe(mockCaseId);
      expect(event.changes).toEqual(changes);
    });

    it("should have static eventName property", () => {
      expect(CaseUpdatedEvent.eventName).toBe("case.updated");
    });

    it("should throw when caseId is missing", () => {
      expect(() => {
        new CaseUpdatedEvent({
          organizationId: mockOrgId,
          changes: {},
        });
      }).toThrow("CaseUpdatedEvent requires caseId");
    });

    it("should throw when changes is missing", () => {
      expect(() => {
        new CaseUpdatedEvent({
          organizationId: mockOrgId,
          caseId: mockCaseId,
        });
      }).toThrow("CaseUpdatedEvent requires changes");
    });
  });

  describe("CaseStatusChangedEvent", () => {
    it("should create event with required fields", () => {
      const event = new CaseStatusChangedEvent({
        organizationId: mockOrgId,
        caseId: mockCaseId,
        previousStatus: "NEW",
        newStatus: "OPEN",
        rationale: "Starting investigation",
      });

      expect(event.caseId).toBe(mockCaseId);
      expect(event.previousStatus).toBe("NEW");
      expect(event.newStatus).toBe("OPEN");
      expect(event.rationale).toBe("Starting investigation");
    });

    it("should have static eventName property", () => {
      expect(CaseStatusChangedEvent.eventName).toBe("case.status_changed");
    });

    it("should throw when previousStatus is missing", () => {
      expect(() => {
        new CaseStatusChangedEvent({
          organizationId: mockOrgId,
          caseId: mockCaseId,
          newStatus: "OPEN",
        });
      }).toThrow("CaseStatusChangedEvent requires previousStatus");
    });

    it("should allow optional rationale", () => {
      const event = new CaseStatusChangedEvent({
        organizationId: mockOrgId,
        caseId: mockCaseId,
        previousStatus: "NEW",
        newStatus: "OPEN",
      });

      expect(event.rationale).toBeUndefined();
    });
  });

  describe("CaseAssignedEvent", () => {
    it("should create event with required fields", () => {
      const event = new CaseAssignedEvent({
        organizationId: mockOrgId,
        caseId: mockCaseId,
        previousAssigneeId: "user-old",
        newAssigneeId: "user-new",
      });

      expect(event.caseId).toBe(mockCaseId);
      expect(event.previousAssigneeId).toBe("user-old");
      expect(event.newAssigneeId).toBe("user-new");
    });

    it("should have static eventName property", () => {
      expect(CaseAssignedEvent.eventName).toBe("case.assigned");
    });

    it("should throw when newAssigneeId is missing", () => {
      expect(() => {
        new CaseAssignedEvent({
          organizationId: mockOrgId,
          caseId: mockCaseId,
        });
      }).toThrow("CaseAssignedEvent requires newAssigneeId");
    });

    it("should allow null for previousAssigneeId", () => {
      const event = new CaseAssignedEvent({
        organizationId: mockOrgId,
        caseId: mockCaseId,
        previousAssigneeId: null,
        newAssigneeId: "user-new",
      });

      expect(event.previousAssigneeId).toBeNull();
    });
  });
});
