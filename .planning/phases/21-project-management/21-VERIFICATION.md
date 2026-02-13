---
phase: 21-project-management
verified: 2026-02-13T01:25:42Z
status: gaps_found
score: 14/18 must-haves verified
gaps:
  - truth: "Threaded replies on task updates"
    status: failed
    reason: "Frontend TaskUpdateThread exists but backend has NO endpoint. ProjectUpdate model never created."
    missing:
      - "ProjectUpdate Prisma model"
      - "Backend CRUD endpoints for task updates"
  - truth: "Subscriber/watcher system"
    status: failed
    reason: "Frontend TaskSubscriberList exists but backend has NO endpoint. Model never created."
    missing:
      - "ProjectTaskSubscriber Prisma model"
      - "Backend CRUD endpoints for subscribers"
  - truth: "WebSocket real-time updates"
    status: partial
    reason: "Backend gateway and frontend hook exist but hook is ORPHANED."
    missing:
      - "Import useProjectWebSocket in projects/[id]/page.tsx"
  - truth: "15 custom column types in backend"
    status: partial
    reason: "Frontend defines 15 types but backend enum has only 7."
    missing:
      - "Add 8 missing column types to Prisma enum"
---

# Phase 21: Project Management (Monday.com-Style) Verification Report

**Phase Goal:** Build a comprehensive Monday.com-style project management module with Kanban boards, Gantt timelines, conversation threads with @mentions, 15 custom column types, workload views, project dashboards, file attachments, subscriber notifications, and real-time WebSocket collaboration.
**Verified:** 2026-02-13T01:25:42Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                            | Status             | Evidence                                                                                                          |
| --- | ------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Projects accessible from sidebar with list page  | VERIFIED           | lib/navigation.ts line 74. projects/page.tsx (584 lines) with SavedViewProvider.                                  |
| 2   | Kanban board with drag-to-move                   | VERIFIED           | ProjectBoardView.tsx (622 lines), @dnd-kit, handleDragEnd line 182, 5 status columns.                             |
| 3   | Table view with inline editing, group management | VERIFIED           | ProjectTaskTable.tsx (637), TaskRow.tsx (517) inline editing, ProjectGroupHeader.tsx (313), AddTaskRow.tsx (140). |
| 4   | Timeline/Gantt with dependency arrows            | VERIFIED           | ProjectTimelineView.tsx (751 lines), SVG arrows lines 519-567, zoom controls, today line.                         |
| 5   | Workload view with capacity indicators           | VERIFIED           | ProjectWorkloadView.tsx (536 lines), ProjectStatsService (260 lines) at GET /projects/:id/stats.                  |
| 6   | Dashboard with KPI cards, charts, trends         | VERIFIED           | ProjectDashboardView.tsx (631 lines), useProjectStats with 60s refresh.                                           |
| 7   | Task detail panel with 4 tabs                    | VERIFIED (partial) | TaskDetailPanel.tsx (858 lines), 4 tabs at lines 415-449. Updates/Files tabs lack backend.                        |
| 8   | @mention support with autocomplete               | VERIFIED           | MentionInput.tsx (445 lines) with data-mention-id, ARIA. Backend MentionService (218 lines).                      |
| 9   | Threaded replies on task updates                 | FAILED             | TaskUpdateThread.tsx exists. No backend endpoint. ProjectUpdate model missing.                                    |
| 10  | File attachments with drag-drop                  | FAILED             | TaskFileList.tsx (488 lines) exists. No backend /tasks/:taskId/files endpoint.                                    |
| 11  | Subscriber/watcher system                        | FAILED             | TaskSubscriberList.tsx (365 lines) exists. No backend endpoint. Model missing.                                    |
| 12  | 15 custom column types                           | PARTIAL            | Frontend defines 15 (DynamicColumnCell.tsx 1132 lines). Backend enum has 7.                                       |
| 13  | Column center for adding/configuring             | VERIFIED           | ColumnCenterDialog.tsx (674 lines), ColumnConfigPanel.tsx (1323 lines).                                           |
| 14  | 5 event types dispatch notifications             | VERIFIED           | project-event.listener.ts (680 lines), 7 @OnEvent handlers, all use NotificationService.notify().                 |
| 15  | WebSocket real-time updates                      | PARTIAL            | Backend gateway (588 lines) + frontend hook (322 lines) exist. Hook never imported.                               |
| 16  | Project tasks in My Work queue                   | VERIFIED           | task-aggregator.service.ts PROJECT_TASK type, mapper, count integration.                                          |
| 17  | 6 system project templates                       | VERIFIED           | acme-phase-21.ts creates 6. project-template.service.ts (929 lines).                                              |
| 18  | Templates with pre-populated content             | VERIFIED           | POST /:id/apply endpoint. Service applies groups, columns, tasks from JSON.                                       |

**Score:** 14/18 truths verified (2 failed, 2 partial)

### Key Link Verification

| From                   | To                  | Via                         | Status    | Details                  |
| ---------------------- | ------------------- | --------------------------- | --------- | ------------------------ |
| projects/page.tsx      | Backend             | apiClient + useProjectsView | WIRED     | Fetches/creates          |
| projects/[id]/page.tsx | Backend             | useProjectDetail            | WIRED     | Detail with groups/tasks |
| ProjectBoardView       | Backend             | onTaskUpdate callback       | WIRED     | Drag triggers update     |
| TaskDetailPanel        | Updates API         | useTaskUpdates              | NOT_WIRED | Endpoint missing         |
| TaskDetailPanel        | Files API           | useTaskFiles                | NOT_WIRED | Endpoint missing         |
| TaskDetailPanel        | Subscribers API     | useTaskSubscribers          | NOT_WIRED | Endpoint missing         |
| TaskDependencyList     | Deps API            | useTaskDependencies         | NOT_WIRED | Endpoint missing         |
| event.listener         | NotificationService | .notify()                   | WIRED     | All 5 event types        |
| MentionService         | MentionInput        | data-mention-id             | WIRED     | Parses HTML              |
| ProjectGateway         | useProjectWebSocket | socket.io                   | NOT_WIRED | Hook orphaned            |
| Nav sidebar            | /projects           | lib/navigation.ts           | WIRED     | Line 74                  |
| My Work                | ProjectTask         | task-aggregator             | WIRED     | PROJECT_TASK type        |
| Seeder                 | seed.ts             | import/call                 | WIRED     | Lines 36, 335            |

### Anti-Patterns Found

No TODO/FIXME/stub patterns found in any project file.

### Gaps Summary

Phase 21 delivers a strong foundation for Monday.com-style project management. The core experience -- project list with saved views, 5 view modes (table, board, timeline, workload, dashboard), grouped task tables with inline editing, drag-and-drop Kanban, Gantt timelines, and project templates -- is fully implemented with substantive code (10,000+ lines of frontend components, 4,700+ lines of backend services).

**However, 3 Prisma models planned in the original 21-01-PLAN were never created:**

1. **ProjectUpdate** -- Needed for task conversation threads with @mentions and threaded replies
2. **ProjectTaskSubscriber** -- Needed for subscriber/watcher system controlling notifications
3. **ProjectTaskDependency** -- Needed for task dependency persistence

This creates a disconnection where substantial frontend components exist (TaskUpdateThread 506 lines, TaskSubscriberList 365 lines, TaskDependencyList 451 lines, TaskFileList 488 lines) but their React Query hooks call backend endpoints that do not exist. These features will show empty states or errors at runtime.

Additionally, the WebSocket infrastructure (backend gateway 588 lines + frontend hook 322 lines) is complete but the hook is never imported in any page, so real-time collaboration is not active.

The Prisma ProjectColumnType enum has 7 values while the frontend defines 15 column types. The frontend documents this as a deliberate workaround (extra types stored as custom column types with settings JSON), which is functional but architecturally incomplete.

**Root cause:** Plan 21-01 was scoped for 7 models but only 4 were created. Plans 21-06 through 21-08 built frontend components assuming all 7 models existed, resulting in frontend-backend mismatch.

---

_Verified: 2026-02-13T01:25:42Z_
_Verifier: Claude (gsd-verifier)_
