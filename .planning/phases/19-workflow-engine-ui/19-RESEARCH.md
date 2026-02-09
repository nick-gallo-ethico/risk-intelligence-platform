# Phase 19 Research: Workflow Engine UI

## 1. Existing Backend Infrastructure

### WorkflowTemplate Model (Prisma)
```
WorkflowTemplate {
  id, organizationId, name, description
  entityType: WorkflowEntityType (CASE, INVESTIGATION, DISCLOSURE, POLICY, CAMPAIGN)
  version: Int (auto-increments on publish)
  isActive: Boolean
  isDefault: Boolean (one per entityType per org)
  stages: Json (WorkflowStage[])
  transitions: Json (WorkflowTransition[])
  initialStage: String
  defaultSlaDays: Int?
  slaConfig: Json?
  sourceTemplateId: String? (clone tracking)
  tags: String[]
  createdById, createdAt, updatedAt
}
```

### WorkflowInstance Model (Prisma)
```
WorkflowInstance {
  id, organizationId, templateId, templateVersion
  entityType: WorkflowEntityType
  entityId: String (polymorphic reference)
  currentStage: String
  currentStep: String?
  status: WorkflowInstanceStatus (ACTIVE, COMPLETED, CANCELLED, PAUSED)
  stepStates: Json ({ [stageId]: { status, completedAt, completedBy } })
  dueDate, slaStatus: SlaStatus (ON_TRACK, WARNING, OVERDUE)
  slaBreachedAt, completedAt, outcome
  startedById, createdAt, updatedAt
  Unique: entityType + entityId
}
```

### WorkflowEngineService (Runtime)
Methods:
- `startWorkflow(params)` → creates instance locked to template version
- `transition(params)` → validates allowed transitions + gates, updates currentStage, emits events
- `complete(params)` → marks COMPLETED with outcome
- `cancel(instanceId, actorUserId, reason)` → marks CANCELLED
- `pause(instanceId, actorUserId, reason)` → marks PAUSED
- `resume(instanceId, actorUserId)` → reactivates PAUSED instance
- `getInstanceByEntity(orgId, entityType, entityId)` → lookup by entity
- `getInstance(instanceId)` → lookup by ID
- `getAllowedTransitions(instanceId)` → returns valid next stages
- `validateGates(gates, instance)` → placeholder (gates: required_fields, approval, condition, time)

### WorkflowService (Template CRUD)
Methods:
- `create(orgId, dto, createdById)` → validates, creates template (checks duplicate names)
- `update(orgId, templateId, dto)` → version-on-publish if active instances exist
- `findById(orgId, templateId)` → single template
- `findAll(orgId, options?)` → list with entityType/isActive filters
- `findDefault(orgId, entityType)` → default template for entity type
- `delete(orgId, templateId)` → only if no instances exist

### REST API (WorkflowController at /api/v1/workflows)
Templates:
- `POST /templates` → create (SYSTEM_ADMIN, COMPLIANCE_OFFICER)
- `GET /templates` → list (query: entityType, isActive)
- `GET /templates/:id` → get one
- `GET /templates/default/:entityType` → get default
- `PATCH /templates/:id` → update (SYSTEM_ADMIN, COMPLIANCE_OFFICER)
- `DELETE /templates/:id` → delete (SYSTEM_ADMIN)

Instances:
- `POST /instances` → start workflow
- `GET /instances/:id` → get instance
- `GET /entity/:entityType/:entityId` → get by entity
- `GET /instances/:id/transitions` → allowed transitions
- `POST /instances/:id/transition` → perform transition
- `POST /instances/:id/complete` → complete
- `POST /instances/:id/cancel` → cancel (SYSTEM_ADMIN, COMPLIANCE_OFFICER)
- `POST /instances/:id/pause` → pause
- `POST /instances/:id/resume` → resume

### Type Definitions (workflow.types.ts)
```typescript
WorkflowStage { id, name, description?, steps: WorkflowStep[], slaDays?, gates?: StageGate[], isTerminal?, display?: { color, icon, sortOrder } }
WorkflowStep { id, name, type: manual|automatic|approval|notification, config?, assigneeStrategy?, timeoutHours?, onTimeout?: pause|skip|escalate, isOptional?, description? }
StageGate { type: required_fields|approval|condition|time, config, errorMessage? }
WorkflowTransition { from, to, conditions?: TransitionCondition[], actions?: TransitionAction[], label?, allowedRoles?, requiresReason? }
TransitionCondition { type: field|approval|time|expression, config }
TransitionAction { type: notification|assignment|field_update|webhook, config }
AssigneeStrategy = specific_user|round_robin|least_loaded|manager_of|team_queue|skill_based|geographic
```

### DTOs
- CreateWorkflowTemplateDto: name, description?, entityType, stages[], transitions[], initialStage, defaultSlaDays?, tags?, isDefault?
- UpdateWorkflowTemplateDto: extends PartialType(Create) + isActive?
- StartWorkflowDto: entityType, entityId, templateId?
- TransitionDto: toStage, validateGates?, reason?

### Events Emitted
- workflow.instance.created
- workflow.transitioned
- workflow.completed
- workflow.cancelled
- workflow.paused
- workflow.resumed

## 2. Workflow Consumers

### PolicyApprovalService
- `submitForApproval()` → calls workflowEngine.startWorkflow() with entityType=POLICY
- `cancelApproval()` → calls workflowEngine.cancel()
- `getApprovalStatus()` → queries workflow instance state
- PolicyWorkflowListener syncs workflow events → policy status (PENDING_APPROVAL, APPROVED, DRAFT)

### Case Pipeline
- Cases use pipelineStage field (string) for stage tracking
- Workflow instances created for case lifecycle management
- entityType=CASE

### Campaign/Disclosure
- entityType=DISCLOSURE for disclosure approval flows
- entityType=CAMPAIGN for campaign lifecycle

## 3. Frontend Patterns

### Component Library
- **shadcn/ui** with Tailwind CSS
- Next.js App Router with `(authenticated)` route group
- @dnd-kit installed (core, modifiers, sortable, utilities)
- No React Flow/@xyflow installed yet
- lucide-react for icons

### Navigation
- Sidebar defined in `lib/navigation.ts` with `navigationItems[]` and `adminItems[]`
- NavItem: { title, url, icon, items?: NavSubItem[], requiredRoles? }
- Workflows would go in **adminItems** (requires SYSTEM_ADMIN or COMPLIANCE_OFFICER)
- Route: `/settings/workflows` or standalone `/workflows`

### Routing Structure
- `(authenticated)/` → cases, investigations, disclosures, policies, projects, analytics, etc.
- `(authenticated)/settings/` → users, roles, organization, audit, integrations
- New page = create directory + page.tsx under (authenticated)

### Existing Builder Pattern (FormBuilder)
- Uses @dnd-kit for drag-and-drop sections/fields
- DndContext with DragOverlay, useSortable hooks
- FieldPalette sidebar for dragging field types
- Reducer pattern for state management
- Property panels for field configuration
- This is the closest precedent for the workflow builder

### API Client Pattern
- Services in `services/` directory (e.g., policies.ts, cases.ts)
- React Query (@tanstack/react-query) for data fetching with caching
- Typical pattern: `useQuery()` hooks wrapping fetch calls

## 4. Recommended Library: @xyflow/react (React Flow)

### Why React Flow
- **Purpose-built for workflow visualization** — node-based editor with edges (transitions)
- **Rich feature set**: minimap, controls, fit-to-view, zoom/pan, custom nodes/edges
- **Production-proven**: Used by Stripe, Typeform, and many enterprise tools
- **MIT licensed (core)**: Free for commercial use
- **Excellent DX**: TypeScript-first, React 18 compatible, Next.js compatible
- **Custom nodes**: Can render any React component as a node (perfect for workflow stages)
- **Custom edges**: Can render labels, conditions, animations on connections

### Why NOT Custom @dnd-kit
- @dnd-kit handles linear lists/grids well (good for form builder)
- Workflow graphs need: connecting edges, zoom/pan, auto-layout, minimap
- Building this from scratch with @dnd-kit would be 10x the effort

### React Flow Architecture for Workflow Builder
```
WorkflowBuilder
├── ToolbarPanel (top)
│   ├── WorkflowNameInput
│   ├── EntityTypeSelector
│   ├── SaveButton
│   └── PublishButton
├── StageNodePalette (left sidebar)
│   ├── DraggableStageType
│   └── DraggableStepType
├── ReactFlowCanvas (center)
│   ├── StageNode (custom) — renders stage info, steps, gates
│   ├── TransitionEdge (custom) — renders labels, conditions
│   └── MiniMap
└── PropertyPanel (right sidebar)
    ├── StageProperties (when stage selected)
    ├── TransitionProperties (when edge selected)
    ├── StepProperties (when step within stage selected)
    └── GateProperties (when gate selected)
```

### HubSpot-Style Workflow Patterns
- **Trigger first**: Select what triggers the workflow (entity type + conditions)
- **Linear + branches**: Primary flow is top-to-bottom with optional branches
- **Stage configuration**: Click a stage to configure its steps, gates, SLA
- **Transition labels**: Each connection can have a label ("Approve", "Reject", "Escalate")
- **Condition builder**: Visual condition builder for transition/gate conditions
- **Testing mode**: Ability to test workflow with sample data
- **Version indicator**: Show current version, active instances count

## 5. UI Pages Needed

### /settings/workflows (Workflow List Page)
- Table of all workflow templates
- Columns: Name, Entity Type, Version, Status (active/inactive), Default?, Instances, Updated
- Filters: entity type, status
- Actions: Create New, Edit, Clone, Delete, Set as Default
- Shows active instance count per template

### /settings/workflows/new (Create Workflow Page)
### /settings/workflows/:id (Edit Workflow Page)
- Visual workflow builder (React Flow canvas)
- Stage palette on left
- Property panel on right
- Toolbar with save/publish/test actions
- Shows version history, active instances warning before publish

### /settings/workflows/:id/instances (Workflow Instances Page)
- Table of running instances for this template
- Columns: Entity, Current Stage, Status, SLA Status, Started, Due Date
- Click to view instance detail
- Bulk actions: pause, resume, cancel

## 6. Key Decisions Needed

1. **React Flow installation** — `@xyflow/react` package needs to be added
2. **Route placement** — `/settings/workflows` (admin area) vs `/workflows` (top-level)
3. **Auto-layout algorithm** — ELK.js (dagre replacement) for automatic node positioning
4. **Stage node design** — How much detail to show inline vs in property panel
5. **Seed workflows** — What predefined workflow templates to create for Acme Co. demo

## 7. What's Missing from Backend

The backend is comprehensive. Minor gaps for the UI:
1. **No list instances endpoint** — Need `GET /instances` with filters (template, status, entityType)
2. **No template clone endpoint** — Need `POST /templates/:id/clone`
3. **No version history endpoint** — Need `GET /templates/:id/versions`
4. **No instance count on template** — Need to include active instance count in template list response
5. **Gate validation is placeholder** — UI should reflect that gates are configurable but validation is future work
