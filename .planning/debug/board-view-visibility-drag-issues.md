---
status: diagnosed
trigger: "Investigate the board view issues: 1. Priority badge and owner avatar not visible on cards in lanes (only visible when dragging) 2. Cards are too wide in lanes 3. Drag-and-drop doesn't persist - status doesn't change when moving card between lanes"
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:15:00Z
---

## Current Focus

hypothesis: All three issues are separate - visibility is conditional rendering, width is CSS, persistence is likely data structure mismatch
test: Verify card config fields match actual data structure and API response
expecting: Find mismatched field paths in cardConfig
next_action: Prepare root cause analysis with specific fixes

## Symptoms

expected:
- Priority badge and owner avatar should be visible on cards in lanes
- Cards should have appropriate width in lanes
- Drag-and-drop should persist status changes when moving cards between lanes

actual:
- Priority badge and owner avatar only visible when dragging
- Cards are too wide in lanes
- Drag-and-drop doesn't persist - status doesn't change when moving card between lanes

errors: None reported

reproduction:
1. View board with cards in lanes
2. Observe missing priority badge and owner avatar
3. Observe card width
4. Try dragging card to different lane
5. Observe status doesn't persist

started: Unknown - discovered during testing

## Eliminated

## Evidence

- timestamp: 2026-02-08T00:05:00Z
  checked: BoardView.tsx, BoardCard.tsx, BoardColumn.tsx
  found: |
    BoardView.tsx:
    - Lines 183-191: DragOverlay renders BoardCard when dragging (activeRecord exists)
    - Line 109: onStatusChange callback triggered on drop

    BoardCard.tsx:
    - Lines 106-113: Priority badge rendered with conditional visibility
    - Lines 136-150: Owner avatar rendered with conditional visibility
    - Line 77: isDragging adds "opacity-50" class when dragging
    - Card has "cursor-pointer" and hover effects

    BoardColumn.tsx:
    - Line 47: Column has "min-w-[300px] max-w-[300px]" - fixed 300px width
    - Lines 84-90: BoardCard rendered in column
  implication: |
    ISSUE #1 (Priority/Owner visibility): Priority badge and owner avatar ARE in the card markup (lines 106-113, 136-150 of BoardCard.tsx).
    They should always be visible. The issue is NOT in the code structure.
    Need to check if cardConfig is missing priorityField or ownerField configuration.

    ISSUE #2 (Card width): Cards inherit column width of 300px (BoardColumn line 47), which is reasonable.
    However, cards don't have explicit width constraints, so they may overflow the column.

    ISSUE #3 (Drag persistence): BoardView calls onStatusChange (line 109) but this is a callback prop.
    Need to check what's passed as onStatusChange from the parent view hook.

- timestamp: 2026-02-08T00:10:00Z
  checked: cases.config.ts (lines 462-470), useCasesView.ts (lines 312-317), cases/page.tsx (lines 149-156)
  found: |
    cases.config.ts cardConfig:
    - titleField: "summary"
    - subtitleField: "referenceNumber"
    - priorityField: "severity"  ← CORRECT
    - ownerField: "createdBy.firstName"  ← POTENTIAL ISSUE
    - dateField: "createdAt"

    useCasesView.ts Case interface (lines 20-50):
    - createdBy field is NOT defined in the interface!
    - Only has: id, caseNumber, title, status, priority, category, assignee (not createdBy)

    BoardCard.tsx rendering logic:
    - Line 106-113: priorityValue check - renders if truthy
    - Line 136-150: ownerValue check - renders if truthy
    - Lines 45-63: getValue/getStringValue reads from record[field]

    Cases page usage (line 153):
    - onStatusChange={handleStatusChange} is correctly passed
    - handleStatusChange (line 38) comes from useCasesView hook
    - useCasesView.handleStatusChange (lines 312-317) calls statusMutation with correct payload

  implication: |
    ROOT CAUSES IDENTIFIED:

    ISSUE #1 - Priority badge and owner avatar not visible:
    - cardConfig.priorityField = "severity" but Case interface uses "priority"
    - cardConfig.ownerField = "createdBy.firstName" but Case interface doesn't have createdBy
    - The data likely doesn't have these fields or uses different field names
    - When record[field] is undefined, the conditional renders nothing

    ISSUE #2 - Cards too wide:
    - BoardColumn has max-w-[300px] (line 47) which constrains the column
    - But BoardCard has NO width constraint, only "cursor-pointer" styling
    - Cards default to full column width with no internal padding/margins control
    - Need to add proper card width/padding styling

    ISSUE #3 - Drag-and-drop doesn't persist:
    - onStatusChange is passed correctly through chain
    - handleStatusChange calls statusMutation.mutate with bulk action
    - BUT: Backend endpoint is "/cases/bulk" with action: "status"
    - This is a BULK endpoint, not a single update endpoint
    - API might not be working or might need different payload structure

- timestamp: 2026-02-08T00:15:00Z
  checked: cases.controller.ts
  found: |
    No /bulk endpoint exists in cases.controller.ts
    Available endpoints:
    - POST /cases (create)
    - PUT /cases/:id (full update)
    - PATCH /cases/:id (partial update)
    - PATCH /cases/:id/status (status update with rationale)
    - POST /cases/:id/close (close with rationale)

    The status endpoint requires:
    - ChangeCaseStatusDto with status and rationale fields
    - Single case ID in URL parameter
  implication: |
    ISSUE #3 CONFIRMED: Frontend calls "/cases/bulk" which doesn't exist!
    - useCasesView sends POST to "/cases/bulk" (line 177)
    - Backend has no bulk endpoint
    - Requests fail silently (no error handling visible in UI)
    - Need to either:
      A) Create /cases/bulk endpoint in backend
      B) Change frontend to call PATCH /cases/:id/status for single updates

## Resolution

root_cause: |
  Three separate issues identified:

  1. **Priority badge and owner avatar not visible in lanes:**
     - cardConfig.priorityField = "severity" but Case interface field is "priority"
     - cardConfig.ownerField = "createdBy.firstName" but Case interface has no createdBy field
     - API response likely doesn't contain these fields with expected names
     - BoardCard conditionally renders based on field existence (lines 106, 136)
     - When record[field] is undefined, elements don't render

  2. **Cards too wide in lanes:**
     - BoardColumn constrains column width to max-w-[300px]
     - BoardCard has no explicit width constraint
     - Card stretches to fill column width without proper internal spacing
     - Need card-level width constraints

  3. **Drag-and-drop doesn't persist status changes:**
     - Frontend calls POST "/cases/bulk" (useCasesView.ts line 177)
     - Backend has NO /cases/bulk endpoint (verified in cases.controller.ts)
     - API calls fail, but no error handling/toast shown
     - Drag appears to work (visual feedback) but status never updates in database
     - QueryClient invalidation happens even on failed requests

fix: |
  **ISSUE #1 - Field name mismatches:**

  Option A (Frontend Fix - Recommended):
  File: apps/frontend/src/lib/views/configs/cases.config.ts (lines 462-470)
  Change:
    cardConfig: {
      titleField: "summary",
      subtitleField: "referenceNumber",
      priorityField: "priority",  // was "severity"
      ownerField: "assignee.name",  // was "createdBy.firstName"
      dateField: "createdAt",
    }

  Option B (Backend Fix):
  - Verify API response structure from GET /cases
  - Ensure response includes severity and createdBy fields
  - Update Case interface in useCasesView.ts to match backend schema

  **ISSUE #2 - Card width:**

  File: apps/frontend/src/components/views/BoardCard.tsx (line 72-79)
  Change:
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-full cursor-pointer transition-shadow hover:shadow-md",  // Add w-full
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
      )}
      onClick={handleClick}
    >

  **ISSUE #3 - Missing bulk endpoint:**

  Option A (Backend - Create bulk endpoint):
  File: apps/backend/src/modules/cases/cases.controller.ts
  Add:
    @Post('bulk')
    @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
    @UseGuards(RolesGuard)
    async bulkAction(
      @Body() dto: BulkActionDto,
      @CurrentUser() user: RequestUser,
      @TenantId() organizationId: string,
    ) {
      return this.casesService.bulkAction(dto, user.id, organizationId);
    }

  File: apps/backend/src/modules/cases/cases.service.ts
  Add bulkAction method to handle action: "status" operations

  Option B (Frontend - Use existing endpoint):
  File: apps/frontend/src/hooks/views/useCasesView.ts (lines 312-317)
  Change handleStatusChange to call PATCH /cases/:id/status:
    const handleStatusChange = useCallback(
      async (caseId: string, newStatus: string) => {
        try {
          await apiClient.patch(`/cases/${caseId}/status`, {
            status: newStatus,
            rationale: "Status updated via board view"  // Required by backend
          });
          toast.success("Case status updated");
          queryClient.invalidateQueries({ queryKey: ["cases"] });
        } catch (error) {
          toast.error("Failed to update case status");
        }
      },
      [queryClient],
    );

  And remove statusMutation dependency.

verification: |
  After fixes:
  1. Priority badge visible: Create test case with priority="HIGH", verify badge shows
  2. Owner avatar visible: Create test case with assignee, verify avatar shows
  3. Card width: Verify cards stay within 300px column bounds
  4. Drag persistence: Drag card to new lane, refresh page, verify status changed

files_changed: []
