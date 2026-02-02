# Technical Specification: Unified Workflow Engine

**Version:** 1.0
**Last Updated:** February 2026
**Status:** Draft
**Author:** Architecture Team

**Applies To:** All modules requiring approval, assignment, review, or remediation workflows

**Key Consumers:**
- Policy Management: Approval workflows, exception request flows
- Disclosures: Review and approval workflows, auto-clear rules
- Case Management: Case routing, escalation, remediation tracking
- Operator Console: QA workflows, release approval

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Step Types](#3-step-types)
4. [Workflow Types](#4-workflow-types)
5. [Step Configuration](#5-step-configuration)
6. [Conditional Routing](#6-conditional-routing)
7. [Rejection Flow](#7-rejection-flow)
8. [Delegation](#8-delegation)
9. [SLA and Escalation](#9-sla-and-escalation)
10. [Database Schema](#10-database-schema)
11. [API Specifications](#11-api-specifications)
12. [Service Architecture](#12-service-architecture)
13. [Event System](#13-event-system)
14. [UI Implications](#14-ui-implications)
15. [Security Considerations](#15-security-considerations)
16. [Implementation Guide](#16-implementation-guide)
17. [Deferred Scope](#17-deferred-scope)

---

## 1. Overview

### 1.1 Purpose

This document specifies a unified workflow engine that powers all approval, assignment, review, and remediation workflows across the Ethico Risk Intelligence Platform. Rather than implementing separate workflow systems per module, a single reusable engine provides consistency, maintainability, and cross-module workflow capabilities.

### 1.2 Scope

- Workflow template definition and management
- Workflow instance lifecycle (start, progress, complete, cancel)
- Sequential and parallel step execution
- Role-based and user-based assignment
- Dynamic assignee resolution
- Delegation (temporary and permanent)
- SLA tracking and escalation
- Conditional step inclusion
- Rejection and revision flows
- Real-time status notifications

### 1.3 Key Design Principles

1. **Single Engine, Multiple Uses**: One workflow engine serves all modules
2. **Template-Based**: Reusable workflow templates, instantiated per entity
3. **Tenant Isolated**: All workflow data scoped by `organization_id`
4. **Auditable**: Complete action history for every workflow instance
5. **Non-Blocking**: Async execution with real-time notifications
6. **Simple Branching**: Conditional ADD steps, not complex if-then-else paths

### 1.4 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | PostgreSQL 15+ | Workflow state, audit trail |
| Cache | Redis 7 | Active workflow state, SLA timers |
| Queue | BullMQ | Async escalation, notifications |
| Events | Socket.io | Real-time workflow updates |
| Scheduling | node-cron | SLA deadline checks |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Module Controllers                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Policy   │  │ Disclosure │  │    Case    │  │  Operator  │            │
│  │ Controller │  │ Controller │  │ Controller │  │ Controller │            │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘            │
│         │               │               │               │                   │
│         └───────────────┴───────────────┴───────────────┘                   │
│                                 │                                           │
│                                 ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      Workflow Module (NestJS)                         │  │
│  │                                                                       │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│  │  │    Template     │  │     Engine      │  │   Delegation    │       │  │
│  │  │    Service      │  │     Service     │  │    Service      │       │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│  │                                                                       │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│  │  │  Notification   │  │      SLA        │  │     Query       │       │  │
│  │  │    Service      │  │    Service      │  │    Service      │       │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                 │                                           │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌────────────┐ ┌────────────┐ ┌────────────┐
            │ PostgreSQL │ │   Redis    │ │  Socket.io │
            │ (State)    │ │  (Cache)   │ │  (Events)  │
            └────────────┘ └────────────┘ └────────────┘
```

### 2.2 Request Flow

```
1. Module initiates workflow (e.g., Policy submitted for approval)
           │
           ▼
2. WorkflowEngineService.startWorkflow(templateId, entityType, entityId)
           │
           ├── Validate template exists and is active
           ├── Evaluate conditional rules to determine active steps
           ├── Create WorkflowInstance record
           └── Create initial WorkflowStepInstance records
           │
           ▼
3. Activate first step(s)
           │
           ├── Resolve assignees (role → users, dynamic rules)
           ├── Apply delegation rules
           ├── Create pending action records
           └── Send notifications
           │
           ▼
4. Assignee completes action (approve/reject/complete)
           │
           ├── Record action in WorkflowAction
           ├── Check step completion (PARALLEL_ALL vs PARALLEL_ANY)
           ├── If step complete, advance to next step(s)
           └── If all steps complete, mark workflow complete
           │
           ▼
5. Emit events for real-time updates
           │
           └── WebSocket: workflow:step_completed, workflow:completed
```

---

## 3. Step Types

### 3.1 Step Type Definitions

```typescript
// apps/backend/src/modules/workflow/enums/workflow-step-type.enum.ts

export enum WorkflowStepType {
  /**
   * SEQUENTIAL: Must complete before next step starts.
   * Only one step instance is active at a time.
   * Classic approval chain.
   */
  SEQUENTIAL = 'SEQUENTIAL',

  /**
   * PARALLEL_ALL: All assignees must complete (AND gate).
   * All assignees are notified simultaneously.
   * Step completes only when ALL have acted.
   * Use case: "Both Legal AND Finance must approve"
   */
  PARALLEL_ALL = 'PARALLEL_ALL',

  /**
   * PARALLEL_ANY: Any one assignee can complete (OR gate).
   * All assignees are notified simultaneously.
   * Step completes when FIRST assignee acts.
   * Use case: "Any one of the three compliance officers can approve"
   */
  PARALLEL_ANY = 'PARALLEL_ANY',
}
```

### 3.2 Step Type Behavior Matrix

| Step Type | Assignees Notified | Completion Condition | Auto-Cancel Others |
|-----------|-------------------|---------------------|-------------------|
| SEQUENTIAL | One at a time | Single assignee acts | N/A |
| PARALLEL_ALL | All simultaneously | All assignees must act | No |
| PARALLEL_ANY | All simultaneously | First assignee acts | Yes |

### 3.3 Example Configurations

**Sequential (Classic Approval Chain):**
```
Step 1: Manager Review (SEQUENTIAL)
   └── Manager completes → Step 2 activates

Step 2: Legal Review (SEQUENTIAL)
   └── Legal completes → Step 3 activates

Step 3: Executive Sign-off (SEQUENTIAL)
   └── Executive completes → Workflow complete
```

**Parallel All (Joint Approval):**
```
Step 2: Joint Review (PARALLEL_ALL)
   ├── Legal Counsel must approve
   ├── Finance Director must approve
   └── HR Director must approve
   └── ALL THREE must approve → Step 3 activates
```

**Parallel Any (First Available):**
```
Step 1: Initial Triage (PARALLEL_ANY)
   ├── Triage Officer A can approve
   ├── Triage Officer B can approve
   └── Triage Officer C can approve
   └── FIRST ONE to act → Step 2 activates (others canceled)
```

---

## 4. Workflow Types

### 4.1 Workflow Type Enumeration

```typescript
// apps/backend/src/modules/workflow/enums/workflow-type.enum.ts

export enum WorkflowType {
  /**
   * APPROVAL: Policies, disclosures, case closures
   * Actions: APPROVE, REJECT, REQUEST_CHANGES
   */
  APPROVAL = 'APPROVAL',

  /**
   * ASSIGNMENT: Case routing, escalation
   * Actions: ASSIGN, REASSIGN, ACCEPT, DECLINE
   */
  ASSIGNMENT = 'ASSIGNMENT',

  /**
   * REVIEW: QA workflows, editing cycles
   * Actions: APPROVE, REJECT, REQUEST_REVISION, COMPLETE
   */
  REVIEW = 'REVIEW',

  /**
   * REMEDIATION: Action tracking, verification
   * Actions: COMPLETE, VERIFY, REJECT_COMPLETION
   */
  REMEDIATION = 'REMEDIATION',
}
```

### 4.2 Workflow Type to Module Mapping

| Workflow Type | Module | Use Case |
|--------------|--------|----------|
| APPROVAL | Policy Management | Policy version approval |
| APPROVAL | Disclosures | Disclosure approval with conditions |
| APPROVAL | Case Management | Case closure approval |
| APPROVAL | Policy Management | Exception request approval |
| ASSIGNMENT | Case Management | Case routing to investigators |
| ASSIGNMENT | Operator Console | RIU assignment to QA |
| REVIEW | Operator Console | QA review and release |
| REVIEW | Policy Management | Editorial review cycle |
| REMEDIATION | Case Management | Remediation action verification |
| REMEDIATION | Disclosures | Condition completion verification |

### 4.3 Required Actions by Workflow Type

```typescript
// apps/backend/src/modules/workflow/enums/workflow-action-type.enum.ts

export enum WorkflowActionType {
  // Approval workflows
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_CHANGES = 'REQUEST_CHANGES',

  // Assignment workflows
  ASSIGN = 'ASSIGN',
  REASSIGN = 'REASSIGN',
  ACCEPT = 'ACCEPT',
  DECLINE = 'DECLINE',

  // Review workflows
  COMPLETE = 'COMPLETE',
  REQUEST_REVISION = 'REQUEST_REVISION',

  // Remediation workflows
  VERIFY = 'VERIFY',
  REJECT_COMPLETION = 'REJECT_COMPLETION',

  // System actions
  ESCALATE = 'ESCALATE',
  TIMEOUT = 'TIMEOUT',
  DELEGATE = 'DELEGATE',
  CANCEL = 'CANCEL',
}

export const WORKFLOW_TYPE_ACTIONS: Record<WorkflowType, WorkflowActionType[]> = {
  [WorkflowType.APPROVAL]: [
    WorkflowActionType.APPROVE,
    WorkflowActionType.REJECT,
    WorkflowActionType.REQUEST_CHANGES,
  ],
  [WorkflowType.ASSIGNMENT]: [
    WorkflowActionType.ASSIGN,
    WorkflowActionType.REASSIGN,
    WorkflowActionType.ACCEPT,
    WorkflowActionType.DECLINE,
  ],
  [WorkflowType.REVIEW]: [
    WorkflowActionType.APPROVE,
    WorkflowActionType.REJECT,
    WorkflowActionType.COMPLETE,
    WorkflowActionType.REQUEST_REVISION,
  ],
  [WorkflowType.REMEDIATION]: [
    WorkflowActionType.COMPLETE,
    WorkflowActionType.VERIFY,
    WorkflowActionType.REJECT_COMPLETION,
  ],
};
```

---

## 5. Step Configuration

### 5.1 Step Interface

```typescript
// apps/backend/src/modules/workflow/interfaces/workflow-step.interface.ts

export interface WorkflowStepDefinition {
  /** Unique identifier within the template */
  id: string;

  /** Human-readable step name (e.g., "Legal Review") */
  name: string;

  /** Step execution type */
  type: WorkflowStepType;

  /** How assignees are determined */
  assigneeType: 'ROLE' | 'USER' | 'DYNAMIC';

  /**
   * Assignee identifiers:
   * - ROLE: Array of role names ['POLICY_REVIEWER', 'COMPLIANCE_OFFICER']
   * - USER: Array of user UUIDs ['user-uuid-1', 'user-uuid-2']
   * - DYNAMIC: Array of dynamic rule identifiers ['entity.owner', 'entity.assignedTo.manager']
   */
  assignees: string[];

  /**
   * Dynamic assignee resolution rule (when assigneeType = 'DYNAMIC')
   * Expression evaluated against the workflow entity
   * Examples:
   * - "entity.owner" → Policy owner
   * - "entity.createdBy" → Person who created the entity
   * - "entity.assignedTo.manager" → Manager of the assigned user
   * - "entity.businessUnit.complianceOfficer" → BU compliance officer
   */
  dynamicAssigneeRule?: string;

  /** What action is required to complete this step */
  requiredAction: 'APPROVE' | 'COMPLETE' | 'ACKNOWLEDGE' | 'ASSIGN' | 'VERIFY';

  /** Whether assignee can delegate to another user */
  allowDelegation: boolean;

  /** Optional SLA in hours (null = no timeout) */
  timeoutHours?: number;

  /**
   * What happens when timeout is reached
   * - AUTO_APPROVE: Step completes with system approval
   * - AUTO_REJECT: Step fails, workflow rejected
   * - ESCALATE: Notify escalation targets
   * - REMIND: Send reminder, no state change
   */
  escalationRule?: 'AUTO_APPROVE' | 'AUTO_REJECT' | 'ESCALATE' | 'REMIND';

  /** Escalation targets (user IDs or role names) */
  escalationTargets?: string[];

  /** Position in sequence (for ordering in UI) */
  order: number;

  /** Optional description for assignees */
  instructions?: string;

  /** Whether step is conditionally included (see Conditional Routing) */
  isConditional?: boolean;
}
```

### 5.2 Assignee Resolution

```typescript
// apps/backend/src/modules/workflow/services/assignee-resolver.service.ts

@Injectable()
export class AssigneeResolverService {
  constructor(
    private prisma: PrismaService,
    private delegationService: WorkflowDelegationService,
  ) {}

  async resolveAssignees(
    step: WorkflowStepDefinition,
    entity: any,
    organizationId: string,
  ): Promise<string[]> {
    let userIds: string[] = [];

    switch (step.assigneeType) {
      case 'USER':
        // Direct user IDs
        userIds = step.assignees;
        break;

      case 'ROLE':
        // Resolve role to active users
        userIds = await this.getUsersByRoles(step.assignees, organizationId);
        break;

      case 'DYNAMIC':
        // Evaluate dynamic rule against entity
        userIds = await this.evaluateDynamicRule(
          step.dynamicAssigneeRule,
          entity,
          organizationId,
        );
        break;
    }

    // Apply delegation overrides
    userIds = await this.applyDelegations(userIds, organizationId);

    // Filter to active users only
    userIds = await this.filterActiveUsers(userIds);

    if (userIds.length === 0) {
      throw new WorkflowAssigneeError(
        `No valid assignees found for step "${step.name}"`,
      );
    }

    return userIds;
  }

  private async getUsersByRoles(
    roles: string[],
    organizationId: string,
  ): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: roles as UserRole[] },
        isActive: true,
      },
      select: { id: true },
    });
    return users.map(u => u.id);
  }

  private async evaluateDynamicRule(
    rule: string,
    entity: any,
    organizationId: string,
  ): Promise<string[]> {
    // Parse rule like "entity.assignedTo.manager"
    const parts = rule.split('.');

    let value = entity;
    for (const part of parts.slice(1)) { // Skip 'entity'
      if (value == null) return [];
      value = value[part];
    }

    // Handle special cases
    if (typeof value === 'string') {
      return [value]; // Single user ID
    }
    if (Array.isArray(value)) {
      return value; // Array of user IDs
    }
    if (value?.id) {
      return [value.id]; // User object
    }

    return [];
  }

  private async applyDelegations(
    userIds: string[],
    organizationId: string,
  ): Promise<string[]> {
    const result: string[] = [];

    for (const userId of userIds) {
      const delegation = await this.delegationService.getActiveDelegation(
        userId,
        organizationId,
      );

      if (delegation) {
        result.push(delegation.delegateeUserId);
      } else {
        result.push(userId);
      }
    }

    return [...new Set(result)]; // Deduplicate
  }

  private async filterActiveUsers(userIds: string[]): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        isActive: true,
        isLocked: false,
      },
      select: { id: true },
    });
    return users.map(u => u.id);
  }
}
```

---

## 6. Conditional Routing

### 6.1 Design Philosophy

Conditional routing uses a simple "ADD steps if condition met" pattern rather than complex branching. This keeps workflows predictable and auditable.

**Pattern:** Base workflow + conditional additions
**NOT:** If-then-else branching paths

### 6.2 Condition Interface

```typescript
// apps/backend/src/modules/workflow/interfaces/workflow-condition.interface.ts

export interface WorkflowCondition {
  /** Unique identifier for this condition */
  id: string;

  /** Field path on the entity (e.g., "disclosure.estimatedValue") */
  field: string;

  /** Comparison operator */
  operator: 'GT' | 'LT' | 'EQ' | 'NE' | 'GTE' | 'LTE' | 'IN' | 'NOT_IN' | 'CONTAINS' | 'IS_NULL' | 'IS_NOT_NULL';

  /** Value to compare against (type depends on operator) */
  value: any;

  /** Step ID to include if condition evaluates to true */
  thenAddStep: string;

  /** Human-readable description for audit */
  description?: string;
}

export type ConditionOperator = WorkflowCondition['operator'];
```

### 6.3 Condition Evaluator

```typescript
// apps/backend/src/modules/workflow/services/condition-evaluator.service.ts

@Injectable()
export class ConditionEvaluatorService {

  evaluateCondition(condition: WorkflowCondition, entity: any): boolean {
    const fieldValue = this.getFieldValue(entity, condition.field);

    switch (condition.operator) {
      case 'GT':
        return fieldValue > condition.value;
      case 'LT':
        return fieldValue < condition.value;
      case 'GTE':
        return fieldValue >= condition.value;
      case 'LTE':
        return fieldValue <= condition.value;
      case 'EQ':
        return fieldValue === condition.value;
      case 'NE':
        return fieldValue !== condition.value;
      case 'IN':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'NOT_IN':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'CONTAINS':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
      case 'IS_NULL':
        return fieldValue == null;
      case 'IS_NOT_NULL':
        return fieldValue != null;
      default:
        return false;
    }
  }

  evaluateConditions(
    conditions: WorkflowCondition[],
    entity: any,
  ): string[] {
    const additionalStepIds: string[] = [];

    for (const condition of conditions) {
      if (this.evaluateCondition(condition, entity)) {
        additionalStepIds.push(condition.thenAddStep);
      }
    }

    return additionalStepIds;
  }

  private getFieldValue(entity: any, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value = entity;

    for (const part of parts) {
      if (value == null) return null;
      value = value[part];
    }

    return value;
  }
}
```

### 6.4 Common Condition Examples

```typescript
// Example: Disclosure workflow conditions
const disclosureConditions: WorkflowCondition[] = [
  {
    id: 'cfo-approval-high-value',
    field: 'disclosure.estimatedValue',
    operator: 'GT',
    value: 10000,
    thenAddStep: 'cfo-approval',
    description: 'Add CFO approval for gifts/entertainment over $10,000',
  },
  {
    id: 'audit-committee-executive',
    field: 'case.category',
    operator: 'IN',
    value: ['Executive Misconduct', 'Board Member', 'C-Suite'],
    thenAddStep: 'audit-committee-review',
    description: 'Add Audit Committee review for executive-level cases',
  },
  {
    id: 'legal-government-official',
    field: 'disclosure.involvesGovernmentOfficial',
    operator: 'EQ',
    value: true,
    thenAddStep: 'legal-fcpa-review',
    description: 'Add Legal FCPA review when government officials involved',
  },
  {
    id: 'international-review',
    field: 'entity.location.country',
    operator: 'NOT_IN',
    value: ['US', 'USA', 'United States'],
    thenAddStep: 'international-compliance-review',
    description: 'Add international compliance review for non-US locations',
  },
];
```

---

## 7. Rejection Flow

### 7.1 Rejection Action Interface

```typescript
// apps/backend/src/modules/workflow/interfaces/rejection-action.interface.ts

export interface RejectionAction {
  /** Required: Reason for rejection */
  reason: string;

  /** Where to route after rejection */
  targetBehavior: 'SUBMITTER' | 'PREVIOUS_STEP' | 'SPECIFIC_STEP' | 'CANCEL_WORKFLOW';

  /** Step ID if targetBehavior = 'SPECIFIC_STEP' */
  targetStepId?: string;

  /** Optional: Specific instructions for the target */
  instructions?: string;

  /** Optional: Attached files (rejection evidence, marked-up documents) */
  attachmentIds?: string[];
}

export enum RejectionTargetBehavior {
  /** Default: Return to original submitter for revision */
  SUBMITTER = 'SUBMITTER',

  /** Return to the immediately previous step */
  PREVIOUS_STEP = 'PREVIOUS_STEP',

  /** Return to a specific step by ID */
  SPECIFIC_STEP = 'SPECIFIC_STEP',

  /** Cancel the entire workflow (requires confirmation) */
  CANCEL_WORKFLOW = 'CANCEL_WORKFLOW',
}
```

### 7.2 Rejection Flow Logic

```typescript
// apps/backend/src/modules/workflow/services/workflow-engine.service.ts (partial)

async handleRejection(
  instanceId: string,
  stepInstanceId: string,
  userId: string,
  rejection: RejectionAction,
): Promise<WorkflowInstance> {
  const instance = await this.getInstanceWithSteps(instanceId);
  const stepInstance = instance.stepInstances.find(s => s.id === stepInstanceId);

  // Validate user can reject this step
  await this.validateUserCanAct(stepInstance, userId);

  // Record the rejection action
  await this.recordAction(stepInstanceId, userId, {
    actionType: WorkflowActionType.REJECT,
    reason: rejection.reason,
    metadata: {
      targetBehavior: rejection.targetBehavior,
      targetStepId: rejection.targetStepId,
    },
  });

  // Mark current step as rejected
  await this.updateStepStatus(stepInstanceId, 'REJECTED');

  // Handle based on target behavior
  switch (rejection.targetBehavior) {
    case 'SUBMITTER':
      return this.returnToSubmitter(instance, rejection);

    case 'PREVIOUS_STEP':
      return this.returnToPreviousStep(instance, stepInstance, rejection);

    case 'SPECIFIC_STEP':
      return this.returnToSpecificStep(instance, rejection.targetStepId, rejection);

    case 'CANCEL_WORKFLOW':
      return this.cancelWorkflow(instance, rejection.reason);

    default:
      return this.returnToSubmitter(instance, rejection);
  }
}

private async returnToSubmitter(
  instance: WorkflowInstance,
  rejection: RejectionAction,
): Promise<WorkflowInstance> {
  // Update workflow status to REVISION_REQUESTED
  await this.prisma.workflowInstance.update({
    where: { id: instance.id },
    data: {
      status: 'REVISION_REQUESTED',
      currentStepId: null,
      revisionReason: rejection.reason,
      revisionInstructions: rejection.instructions,
    },
  });

  // Notify submitter
  await this.notificationService.notifyRevisionRequested(
    instance,
    rejection,
  );

  // Emit event
  this.eventEmitter.emit('workflow:revision_requested', {
    instanceId: instance.id,
    entityType: instance.entityType,
    entityId: instance.entityId,
    reason: rejection.reason,
  });

  return this.getInstanceWithSteps(instance.id);
}

private async returnToPreviousStep(
  instance: WorkflowInstance,
  currentStep: WorkflowStepInstance,
  rejection: RejectionAction,
): Promise<WorkflowInstance> {
  // Find the previous completed step
  const previousStep = instance.stepInstances
    .filter(s => s.order < currentStep.order && s.status === 'COMPLETED')
    .sort((a, b) => b.order - a.order)[0];

  if (!previousStep) {
    // No previous step, fall back to submitter
    return this.returnToSubmitter(instance, rejection);
  }

  // Reset previous step to PENDING
  await this.prisma.workflowStepInstance.update({
    where: { id: previousStep.id },
    data: {
      status: 'PENDING',
      completedAt: null,
      completedById: null,
    },
  });

  // Update workflow to point to previous step
  await this.prisma.workflowInstance.update({
    where: { id: instance.id },
    data: {
      currentStepId: previousStep.id,
      status: 'IN_PROGRESS',
    },
  });

  // Re-notify previous step assignees
  await this.activateStep(previousStep, instance);

  return this.getInstanceWithSteps(instance.id);
}
```

### 7.3 Resubmission After Rejection

```typescript
async resubmitAfterRejection(
  instanceId: string,
  userId: string,
  changes?: { notes?: string },
): Promise<WorkflowInstance> {
  const instance = await this.getInstanceWithSteps(instanceId);

  // Validate workflow is in REVISION_REQUESTED status
  if (instance.status !== 'REVISION_REQUESTED') {
    throw new BadRequestException('Workflow is not awaiting revision');
  }

  // Validate submitter
  if (instance.startedById !== userId) {
    throw new ForbiddenException('Only the original submitter can resubmit');
  }

  // Record resubmission
  await this.recordAction(instance.currentStepId, userId, {
    actionType: WorkflowActionType.COMPLETE,
    notes: changes?.notes || 'Resubmitted after revision',
  });

  // Restart workflow from first step (or last rejected step, configurable)
  const firstStep = instance.stepInstances
    .filter(s => s.isActive)
    .sort((a, b) => a.order - b.order)[0];

  // Reset first step to PENDING
  await this.prisma.workflowStepInstance.update({
    where: { id: firstStep.id },
    data: {
      status: 'PENDING',
      completedAt: null,
      completedById: null,
    },
  });

  // Update workflow status
  await this.prisma.workflowInstance.update({
    where: { id: instance.id },
    data: {
      status: 'IN_PROGRESS',
      currentStepId: firstStep.id,
      revisionReason: null,
      revisionInstructions: null,
      revisionCount: { increment: 1 },
    },
  });

  // Activate first step
  await this.activateStep(firstStep, instance);

  return this.getInstanceWithSteps(instance.id);
}
```

---

## 8. Delegation

### 8.1 Delegation Interface

```typescript
// apps/backend/src/modules/workflow/interfaces/delegation.interface.ts

export interface WorkflowDelegation {
  id: string;
  organizationId: string;

  /** User granting delegation */
  delegatorUserId: string;

  /** User receiving delegation */
  delegateeUserId: string;

  /** Delegation type */
  type: 'TEMPORARY' | 'PERMANENT';

  /** For temporary: when delegation becomes active */
  startDate?: Date;

  /** For temporary: when delegation expires */
  endDate?: Date;

  /** Scope of delegation */
  scope: 'ALL' | 'WORKFLOW_TYPE' | 'SPECIFIC_ENTITY';

  /** If WORKFLOW_TYPE: which types */
  workflowTypes?: WorkflowType[];

  /** If SPECIFIC_ENTITY: entity type and ID */
  entityType?: string;
  entityId?: string;

  /** Status */
  isActive: boolean;

  /** Reason for delegation */
  reason?: string;

  /** Audit */
  createdAt: Date;
  createdById: string;
  revokedAt?: Date;
  revokedById?: string;
}
```

### 8.2 Delegation Service

```typescript
// apps/backend/src/modules/workflow/services/workflow-delegation.service.ts

@Injectable()
export class WorkflowDelegationService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationService: NotificationService,
  ) {}

  async createDelegation(
    dto: CreateDelegationDto,
    creatorId: string,
    organizationId: string,
  ): Promise<WorkflowDelegation> {
    // Validate delegator and delegatee are in same org
    const [delegator, delegatee] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: dto.delegatorUserId, organizationId },
      }),
      this.prisma.user.findFirst({
        where: { id: dto.delegateeUserId, organizationId, isActive: true },
      }),
    ]);

    if (!delegator || !delegatee) {
      throw new BadRequestException('Invalid delegator or delegatee');
    }

    // Check for existing active delegation
    const existing = await this.prisma.workflowDelegation.findFirst({
      where: {
        delegatorUserId: dto.delegatorUserId,
        organizationId,
        isActive: true,
        scope: dto.scope,
      },
    });

    if (existing) {
      throw new ConflictException('Active delegation already exists for this scope');
    }

    const delegation = await this.prisma.workflowDelegation.create({
      data: {
        organizationId,
        delegatorUserId: dto.delegatorUserId,
        delegateeUserId: dto.delegateeUserId,
        type: dto.type,
        startDate: dto.startDate || new Date(),
        endDate: dto.endDate,
        scope: dto.scope,
        workflowTypes: dto.workflowTypes,
        entityType: dto.entityType,
        entityId: dto.entityId,
        reason: dto.reason,
        isActive: true,
        createdById: creatorId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      entityType: 'WORKFLOW_DELEGATION',
      entityId: delegation.id,
      action: 'DELEGATION_CREATED',
      actionDescription: `${delegator.email} delegated workflow tasks to ${delegatee.email}`,
      actorUserId: creatorId,
      metadata: {
        type: dto.type,
        scope: dto.scope,
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
    });

    // Notify delegatee
    await this.notificationService.notifyDelegationReceived(delegation, delegator, delegatee);

    return delegation;
  }

  async getActiveDelegation(
    userId: string,
    organizationId: string,
    workflowType?: WorkflowType,
    entityType?: string,
    entityId?: string,
  ): Promise<WorkflowDelegation | null> {
    const now = new Date();

    // Find most specific matching delegation
    const delegations = await this.prisma.workflowDelegation.findMany({
      where: {
        delegatorUserId: userId,
        organizationId,
        isActive: true,
        OR: [
          { type: 'PERMANENT' },
          {
            type: 'TEMPORARY',
            startDate: { lte: now },
            endDate: { gte: now },
          },
        ],
      },
      orderBy: [
        // Most specific first
        { scope: 'desc' }, // SPECIFIC_ENTITY > WORKFLOW_TYPE > ALL
        { createdAt: 'desc' },
      ],
    });

    for (const delegation of delegations) {
      // Check scope matches
      if (delegation.scope === 'ALL') {
        return delegation;
      }

      if (delegation.scope === 'WORKFLOW_TYPE' && workflowType) {
        if (delegation.workflowTypes?.includes(workflowType)) {
          return delegation;
        }
      }

      if (delegation.scope === 'SPECIFIC_ENTITY' && entityType && entityId) {
        if (delegation.entityType === entityType && delegation.entityId === entityId) {
          return delegation;
        }
      }
    }

    return null;
  }

  async revokeDelegation(
    delegationId: string,
    revokerId: string,
    organizationId: string,
  ): Promise<void> {
    const delegation = await this.prisma.workflowDelegation.findFirst({
      where: { id: delegationId, organizationId },
    });

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    await this.prisma.workflowDelegation.update({
      where: { id: delegationId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedById: revokerId,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: 'WORKFLOW_DELEGATION',
      entityId: delegationId,
      action: 'DELEGATION_REVOKED',
      actionDescription: `Delegation revoked`,
      actorUserId: revokerId,
    });
  }

  // Scheduled job to expire temporary delegations
  @Cron(CronExpression.EVERY_HOUR)
  async expireTemporaryDelegations(): Promise<void> {
    const now = new Date();

    const expired = await this.prisma.workflowDelegation.updateMany({
      where: {
        type: 'TEMPORARY',
        isActive: true,
        endDate: { lt: now },
      },
      data: {
        isActive: false,
        revokedAt: now,
      },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} temporary delegations`);
    }
  }
}
```

---

## 9. SLA and Escalation

### 9.1 SLA Configuration

```typescript
// apps/backend/src/modules/workflow/interfaces/sla-config.interface.ts

export interface SLAConfig {
  /** SLA deadline in hours */
  timeoutHours: number;

  /** Warning threshold (percentage of SLA elapsed) */
  warningThresholdPercent?: number; // Default: 75

  /** Action when SLA is breached */
  escalationRule: 'AUTO_APPROVE' | 'AUTO_REJECT' | 'ESCALATE' | 'REMIND';

  /** Reminder intervals before deadline (hours) */
  reminderHoursBefore?: number[];

  /** Escalation targets (user IDs or role names) */
  escalationTargets?: string[];

  /** Whether to include business hours only */
  businessHoursOnly?: boolean;

  /** Business hours definition */
  businessHours?: {
    timezone: string;
    startHour: number;
    endHour: number;
    workDays: number[]; // 0=Sunday, 6=Saturday
  };
}
```

### 9.2 SLA Service

```typescript
// apps/backend/src/modules/workflow/services/workflow-sla.service.ts

@Injectable()
export class WorkflowSLAService {
  private readonly logger = new Logger(WorkflowSLAService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private redisService: RedisService,
    @InjectQueue('workflow-sla') private slaQueue: Queue,
  ) {}

  async scheduleStepSLA(
    stepInstance: WorkflowStepInstance,
    slaConfig: SLAConfig,
  ): Promise<void> {
    const deadline = this.calculateDeadline(
      stepInstance.activatedAt,
      slaConfig,
    );

    // Store SLA info in Redis for quick access
    await this.redisService.set(
      `sla:step:${stepInstance.id}`,
      JSON.stringify({
        deadline: deadline.toISOString(),
        config: slaConfig,
      }),
      slaConfig.timeoutHours * 60 * 60 + 3600, // TTL: SLA + 1 hour buffer
    );

    // Schedule reminders
    if (slaConfig.reminderHoursBefore) {
      for (const hoursBefore of slaConfig.reminderHoursBefore) {
        const reminderTime = new Date(deadline.getTime() - hoursBefore * 60 * 60 * 1000);
        if (reminderTime > new Date()) {
          await this.slaQueue.add(
            'reminder',
            {
              stepInstanceId: stepInstance.id,
              type: 'REMINDER',
              hoursBefore,
            },
            { delay: reminderTime.getTime() - Date.now() },
          );
        }
      }
    }

    // Schedule warning
    if (slaConfig.warningThresholdPercent) {
      const warningTime = new Date(
        stepInstance.activatedAt.getTime() +
        (slaConfig.timeoutHours * 60 * 60 * 1000 * slaConfig.warningThresholdPercent / 100)
      );
      if (warningTime > new Date()) {
        await this.slaQueue.add(
          'warning',
          {
            stepInstanceId: stepInstance.id,
            type: 'WARNING',
            percentElapsed: slaConfig.warningThresholdPercent,
          },
          { delay: warningTime.getTime() - Date.now() },
        );
      }
    }

    // Schedule deadline action
    await this.slaQueue.add(
      'deadline',
      {
        stepInstanceId: stepInstance.id,
        type: 'DEADLINE',
        escalationRule: slaConfig.escalationRule,
        escalationTargets: slaConfig.escalationTargets,
      },
      { delay: deadline.getTime() - Date.now() },
    );

    // Update step instance with deadline
    await this.prisma.workflowStepInstance.update({
      where: { id: stepInstance.id },
      data: { slaDeadline: deadline },
    });
  }

  async cancelStepSLA(stepInstanceId: string): Promise<void> {
    // Remove from Redis
    await this.redisService.del(`sla:step:${stepInstanceId}`);

    // Cancel scheduled jobs (BullMQ handles this via job ID patterns)
    const jobs = await this.slaQueue.getJobs(['delayed', 'waiting']);
    for (const job of jobs) {
      if (job.data.stepInstanceId === stepInstanceId) {
        await job.remove();
      }
    }
  }

  private calculateDeadline(startTime: Date, slaConfig: SLAConfig): Date {
    if (!slaConfig.businessHoursOnly || !slaConfig.businessHours) {
      return new Date(startTime.getTime() + slaConfig.timeoutHours * 60 * 60 * 1000);
    }

    // Calculate business hours deadline
    return this.addBusinessHours(
      startTime,
      slaConfig.timeoutHours,
      slaConfig.businessHours,
    );
  }

  private addBusinessHours(
    startTime: Date,
    hours: number,
    config: SLAConfig['businessHours'],
  ): Date {
    // Implementation of business hours calculation
    // (Skipped for brevity - uses timezone-aware date arithmetic)
    let current = new Date(startTime);
    let remainingHours = hours;

    while (remainingHours > 0) {
      if (this.isBusinessHour(current, config)) {
        remainingHours--;
      }
      current = new Date(current.getTime() + 60 * 60 * 1000); // Add 1 hour
    }

    return current;
  }

  private isBusinessHour(date: Date, config: SLAConfig['businessHours']): boolean {
    const hour = date.getHours();
    const day = date.getDay();

    return (
      config.workDays.includes(day) &&
      hour >= config.startHour &&
      hour < config.endHour
    );
  }
}
```

### 9.3 SLA Queue Processor

```typescript
// apps/backend/src/modules/workflow/processors/sla.processor.ts

@Processor('workflow-sla')
export class SLAProcessor {
  constructor(
    private workflowEngine: WorkflowEngineService,
    private notificationService: NotificationService,
    private prisma: PrismaService,
  ) {}

  @Process('reminder')
  async handleReminder(job: Job): Promise<void> {
    const { stepInstanceId, hoursBefore } = job.data;

    const step = await this.prisma.workflowStepInstance.findUnique({
      where: { id: stepInstanceId },
      include: { workflowInstance: true },
    });

    // Only send if step is still pending
    if (step?.status === 'PENDING') {
      await this.notificationService.sendSLAReminder(step, hoursBefore);
    }
  }

  @Process('warning')
  async handleWarning(job: Job): Promise<void> {
    const { stepInstanceId, percentElapsed } = job.data;

    const step = await this.prisma.workflowStepInstance.findUnique({
      where: { id: stepInstanceId },
      include: { workflowInstance: true },
    });

    if (step?.status === 'PENDING') {
      await this.notificationService.sendSLAWarning(step, percentElapsed);
    }
  }

  @Process('deadline')
  async handleDeadline(job: Job): Promise<void> {
    const { stepInstanceId, escalationRule, escalationTargets } = job.data;

    const step = await this.prisma.workflowStepInstance.findUnique({
      where: { id: stepInstanceId },
      include: { workflowInstance: true },
    });

    // Only act if step is still pending
    if (step?.status !== 'PENDING') {
      return;
    }

    switch (escalationRule) {
      case 'AUTO_APPROVE':
        await this.workflowEngine.autoCompleteStep(
          step.workflowInstanceId,
          stepInstanceId,
          { reason: 'SLA timeout - auto-approved' },
        );
        break;

      case 'AUTO_REJECT':
        await this.workflowEngine.autoRejectStep(
          step.workflowInstanceId,
          stepInstanceId,
          { reason: 'SLA timeout - auto-rejected' },
        );
        break;

      case 'ESCALATE':
        await this.notificationService.sendEscalation(
          step,
          escalationTargets,
          'SLA deadline exceeded',
        );
        await this.prisma.workflowStepInstance.update({
          where: { id: stepInstanceId },
          data: { isEscalated: true, escalatedAt: new Date() },
        });
        break;

      case 'REMIND':
        await this.notificationService.sendSLAReminder(step, 0);
        break;
    }
  }
}
```

---

## 10. Database Schema

### 10.1 Prisma Schema

```prisma
// apps/backend/prisma/schema.prisma (workflow models)

// ============================================
// WORKFLOW TEMPLATE (Reusable Definition)
// ============================================

model WorkflowTemplate {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  organization    Organization @relation(fields: [organizationId], references: [id])

  // Identity
  name            String                    // "Standard Policy Approval"
  description     String?
  code            String                    // Unique within org: "policy-approval-standard"

  // Configuration
  workflowType    WorkflowType              // APPROVAL, ASSIGNMENT, REVIEW, REMEDIATION
  entityTypes     String[]                  // ['Policy', 'Disclosure'] - which entities can use this

  // Step definitions (JSON array of WorkflowStepDefinition)
  steps           Json                      // See Step Configuration section

  // Conditional routing rules
  conditions      Json?                     // See Conditional Routing section

  // Default settings
  defaultSettings Json?                     // Default SLA configs, etc.

  // Status
  status          WorkflowTemplateStatus    @default(DRAFT)
  isDefault       Boolean  @default(false)  // Default template for entity type

  // Versioning
  version         Int      @default(1)
  parentTemplateId String? @map("parent_template_id")
  parentTemplate  WorkflowTemplate? @relation("TemplateVersions", fields: [parentTemplateId], references: [id])
  childVersions   WorkflowTemplate[] @relation("TemplateVersions")

  // Audit
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  createdById     String   @map("created_by_id")
  createdBy       User     @relation("TemplateCreatedBy", fields: [createdById], references: [id])
  updatedById     String?  @map("updated_by_id")
  updatedBy       User?    @relation("TemplateUpdatedBy", fields: [updatedById], references: [id])

  // Relations
  instances       WorkflowInstance[]

  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([organizationId, workflowType])
  @@index([organizationId, entityTypes])
  @@map("workflow_templates")
}

enum WorkflowType {
  APPROVAL
  ASSIGNMENT
  REVIEW
  REMEDIATION
}

enum WorkflowTemplateStatus {
  DRAFT
  ACTIVE
  DEPRECATED
  ARCHIVED
}

// ============================================
// WORKFLOW INSTANCE (Instantiated Workflow)
// ============================================

model WorkflowInstance {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  organization    Organization @relation(fields: [organizationId], references: [id])

  // Template reference
  templateId      String   @map("template_id")
  template        WorkflowTemplate @relation(fields: [templateId], references: [id])
  templateVersion Int      @map("template_version") // Snapshot of template version at start

  // Entity binding
  entityType      String   @map("entity_type")      // 'Policy', 'Disclosure', 'Case'
  entityId        String   @map("entity_id")        // UUID of the entity

  // State
  status          WorkflowInstanceStatus @default(PENDING)
  currentStepId   String?  @map("current_step_id")  // Current active step (null if waiting revision)

  // Progress tracking
  startedAt       DateTime @default(now()) @map("started_at")
  completedAt     DateTime? @map("completed_at")
  canceledAt      DateTime? @map("canceled_at")

  // Revision tracking
  revisionCount   Int      @default(0) @map("revision_count")
  revisionReason  String?  @map("revision_reason")
  revisionInstructions String? @map("revision_instructions")

  // Outcome
  outcome         WorkflowOutcome?
  outcomeReason   String?  @map("outcome_reason")

  // Actor
  startedById     String   @map("started_by_id")
  startedBy       User     @relation("InstanceStartedBy", fields: [startedById], references: [id])

  // Timestamps
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  stepInstances   WorkflowStepInstance[]
  actions         WorkflowAction[]

  @@unique([entityType, entityId, status]) // Only one active workflow per entity
  @@index([organizationId])
  @@index([organizationId, status])
  @@index([organizationId, entityType, entityId])
  @@index([templateId])
  @@map("workflow_instances")
}

enum WorkflowInstanceStatus {
  PENDING           // Created, first step not yet activated
  IN_PROGRESS       // Active, steps being processed
  REVISION_REQUESTED // Rejected, awaiting submitter revision
  COMPLETED         // All steps completed successfully
  CANCELED          // Manually canceled
  FAILED            // Terminated due to error or rejection
}

enum WorkflowOutcome {
  APPROVED
  REJECTED
  COMPLETED
  CANCELED
  EXPIRED
}

// ============================================
// WORKFLOW STEP INSTANCE (Step Execution)
// ============================================

model WorkflowStepInstance {
  id                String   @id @default(uuid())
  organizationId    String   @map("organization_id")

  // Parent workflow
  workflowInstanceId String  @map("workflow_instance_id")
  workflowInstance   WorkflowInstance @relation(fields: [workflowInstanceId], references: [id], onDelete: Cascade)

  // Step definition snapshot
  stepDefinitionId  String   @map("step_definition_id") // ID from template steps array
  stepName          String   @map("step_name")
  stepType          WorkflowStepType @map("step_type")
  requiredAction    String   @map("required_action")
  order             Int

  // State
  status            WorkflowStepStatus @default(PENDING)
  isActive          Boolean  @default(true) @map("is_active") // False if condition excluded this step

  // Assignment
  assignedUserIds   String[] @map("assigned_user_ids")
  pendingUserIds    String[] @map("pending_user_ids")   // Users who haven't acted yet
  completedUserIds  String[] @map("completed_user_ids") // Users who have acted

  // Timing
  activatedAt       DateTime? @map("activated_at")
  completedAt       DateTime? @map("completed_at")

  // SLA
  slaDeadline       DateTime? @map("sla_deadline")
  isOverdue         Boolean  @default(false) @map("is_overdue")
  isEscalated       Boolean  @default(false) @map("is_escalated")
  escalatedAt       DateTime? @map("escalated_at")

  // Completion
  completedById     String?  @map("completed_by_id")
  completedBy       User?    @relation(fields: [completedById], references: [id])
  completionAction  String?  @map("completion_action")  // APPROVE, REJECT, etc.
  completionNotes   String?  @map("completion_notes")

  // Timestamps
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relations
  actions           WorkflowAction[]

  @@index([organizationId])
  @@index([workflowInstanceId])
  @@index([workflowInstanceId, status])
  @@index([assignedUserIds])
  @@map("workflow_step_instances")
}

enum WorkflowStepType {
  SEQUENTIAL
  PARALLEL_ALL
  PARALLEL_ANY
}

enum WorkflowStepStatus {
  PENDING           // Not yet activated
  ACTIVE            // Awaiting action
  COMPLETED         // Successfully completed
  REJECTED          // Rejected by assignee
  SKIPPED           // Skipped (condition not met or PARALLEL_ANY)
  CANCELED          // Canceled (workflow canceled)
}

// ============================================
// WORKFLOW ACTION (Audit Trail)
// ============================================

model WorkflowAction {
  id                String   @id @default(uuid())
  organizationId    String   @map("organization_id")

  // References
  workflowInstanceId String  @map("workflow_instance_id")
  workflowInstance   WorkflowInstance @relation(fields: [workflowInstanceId], references: [id], onDelete: Cascade)
  stepInstanceId    String?  @map("step_instance_id")
  stepInstance      WorkflowStepInstance? @relation(fields: [stepInstanceId], references: [id])

  // Action details
  actionType        WorkflowActionType @map("action_type")
  actionDescription String   @map("action_description") // Natural language: "John Smith approved the policy"

  // Actor
  actorUserId       String?  @map("actor_user_id")      // Null for system actions
  actorUser         User?    @relation(fields: [actorUserId], references: [id])
  actorType         ActorType @map("actor_type")        // USER, SYSTEM, DELEGATION

  // Context
  reason            String?                             // Rejection reason, notes
  metadata          Json?                               // Additional context

  // Delegation tracking
  delegatedFromUserId String? @map("delegated_from_user_id")
  delegationId      String?  @map("delegation_id")

  // Timestamp
  createdAt         DateTime @default(now()) @map("created_at")

  @@index([organizationId])
  @@index([workflowInstanceId])
  @@index([stepInstanceId])
  @@index([actorUserId])
  @@index([createdAt])
  @@map("workflow_actions")
}

enum WorkflowActionType {
  // Lifecycle
  WORKFLOW_STARTED
  WORKFLOW_COMPLETED
  WORKFLOW_CANCELED
  WORKFLOW_FAILED

  // Step actions
  STEP_ACTIVATED
  STEP_COMPLETED
  STEP_SKIPPED

  // Approval actions
  APPROVE
  REJECT
  REQUEST_CHANGES

  // Assignment actions
  ASSIGN
  REASSIGN
  ACCEPT
  DECLINE

  // Review actions
  COMPLETE
  REQUEST_REVISION

  // Remediation actions
  VERIFY
  REJECT_COMPLETION

  // System actions
  ESCALATE
  TIMEOUT
  DELEGATE
  REMINDER_SENT
  WARNING_SENT
}

enum ActorType {
  USER
  SYSTEM
  DELEGATION
}

// ============================================
// WORKFLOW DELEGATION
// ============================================

model WorkflowDelegation {
  id                String   @id @default(uuid())
  organizationId    String   @map("organization_id")
  organization      Organization @relation(fields: [organizationId], references: [id])

  // Parties
  delegatorUserId   String   @map("delegator_user_id")
  delegatorUser     User     @relation("DelegationDelegator", fields: [delegatorUserId], references: [id])
  delegateeUserId   String   @map("delegatee_user_id")
  delegateeUser     User     @relation("DelegationDelegatee", fields: [delegateeUserId], references: [id])

  // Type
  type              DelegationType
  startDate         DateTime @default(now()) @map("start_date")
  endDate           DateTime? @map("end_date")

  // Scope
  scope             DelegationScope
  workflowTypes     WorkflowType[] @map("workflow_types")
  entityType        String?  @map("entity_type")
  entityId          String?  @map("entity_id")

  // Status
  isActive          Boolean  @default(true) @map("is_active")
  reason            String?

  // Audit
  createdAt         DateTime @default(now()) @map("created_at")
  createdById       String   @map("created_by_id")
  createdBy         User     @relation("DelegationCreatedBy", fields: [createdById], references: [id])
  revokedAt         DateTime? @map("revoked_at")
  revokedById       String?  @map("revoked_by_id")
  revokedBy         User?    @relation("DelegationRevokedBy", fields: [revokedById], references: [id])

  @@index([organizationId])
  @@index([delegatorUserId, isActive])
  @@index([delegateeUserId, isActive])
  @@map("workflow_delegations")
}

enum DelegationType {
  TEMPORARY
  PERMANENT
}

enum DelegationScope {
  ALL
  WORKFLOW_TYPE
  SPECIFIC_ENTITY
}
```

### 10.2 Row-Level Security Policies

```sql
-- Enable RLS on all workflow tables
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_delegations ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant isolation
CREATE POLICY tenant_isolation_templates ON workflow_templates
  USING (organization_id = current_setting('app.current_organization')::uuid);

CREATE POLICY tenant_isolation_instances ON workflow_instances
  USING (organization_id = current_setting('app.current_organization')::uuid);

CREATE POLICY tenant_isolation_step_instances ON workflow_step_instances
  USING (organization_id = current_setting('app.current_organization')::uuid);

CREATE POLICY tenant_isolation_actions ON workflow_actions
  USING (organization_id = current_setting('app.current_organization')::uuid);

CREATE POLICY tenant_isolation_delegations ON workflow_delegations
  USING (organization_id = current_setting('app.current_organization')::uuid);
```

---

## 11. API Specifications

### 11.1 Workflow Template Endpoints

```typescript
// Template CRUD
@Controller('api/v1/workflow-templates')
export class WorkflowTemplateController {

  /**
   * List workflow templates
   * GET /api/v1/workflow-templates
   * Query params: workflowType, entityType, status, page, limit
   */
  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.COMPLIANCE_OFFICER)
  async list(@Query() query: ListTemplatesDto): Promise<PaginatedResponse<WorkflowTemplate>>;

  /**
   * Get template by ID
   * GET /api/v1/workflow-templates/:id
   */
  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.COMPLIANCE_OFFICER)
  async get(@Param('id') id: string): Promise<WorkflowTemplate>;

  /**
   * Create new template
   * POST /api/v1/workflow-templates
   */
  @Post()
  @Roles(Role.SYSTEM_ADMIN)
  async create(@Body() dto: CreateTemplateDto): Promise<WorkflowTemplate>;

  /**
   * Update template (creates new version if template has instances)
   * PUT /api/v1/workflow-templates/:id
   */
  @Put(':id')
  @Roles(Role.SYSTEM_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ): Promise<WorkflowTemplate>;

  /**
   * Delete template (soft delete, only if no instances)
   * DELETE /api/v1/workflow-templates/:id
   */
  @Delete(':id')
  @Roles(Role.SYSTEM_ADMIN)
  async delete(@Param('id') id: string): Promise<void>;

  /**
   * Set as default template for entity type
   * POST /api/v1/workflow-templates/:id/set-default
   */
  @Post(':id/set-default')
  @Roles(Role.SYSTEM_ADMIN)
  async setDefault(
    @Param('id') id: string,
    @Body() dto: SetDefaultDto,
  ): Promise<WorkflowTemplate>;
}
```

### 11.2 Workflow Instance Endpoints

```typescript
// Instance lifecycle
@Controller('api/v1/workflow-instances')
export class WorkflowInstanceController {

  /**
   * Start workflow on entity
   * POST /api/v1/workflow-instances
   */
  @Post()
  async start(@Body() dto: StartWorkflowDto): Promise<WorkflowInstance>;

  /**
   * Get instance by ID
   * GET /api/v1/workflow-instances/:id
   */
  @Get(':id')
  async get(@Param('id') id: string): Promise<WorkflowInstanceWithSteps>;

  /**
   * Get instance by entity
   * GET /api/v1/workflow-instances/by-entity/:entityType/:entityId
   */
  @Get('by-entity/:entityType/:entityId')
  async getByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<WorkflowInstance | null>;

  /**
   * Complete a step action
   * POST /api/v1/workflow-instances/:id/steps/:stepId/action
   */
  @Post(':id/steps/:stepId/action')
  async completeAction(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: CompleteActionDto,
  ): Promise<WorkflowInstance>;

  /**
   * Reject and return for revision
   * POST /api/v1/workflow-instances/:id/steps/:stepId/reject
   */
  @Post(':id/steps/:stepId/reject')
  async reject(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: RejectDto,
  ): Promise<WorkflowInstance>;

  /**
   * Resubmit after rejection
   * POST /api/v1/workflow-instances/:id/resubmit
   */
  @Post(':id/resubmit')
  async resubmit(
    @Param('id') id: string,
    @Body() dto: ResubmitDto,
  ): Promise<WorkflowInstance>;

  /**
   * Cancel workflow
   * POST /api/v1/workflow-instances/:id/cancel
   */
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelDto,
  ): Promise<WorkflowInstance>;

  /**
   * Get workflow history (actions)
   * GET /api/v1/workflow-instances/:id/history
   */
  @Get(':id/history')
  async getHistory(@Param('id') id: string): Promise<WorkflowAction[]>;
}
```

### 11.3 My Tasks / Inbox Endpoints

```typescript
// User's pending tasks
@Controller('api/v1/workflow-tasks')
export class WorkflowTaskController {

  /**
   * Get my pending tasks
   * GET /api/v1/workflow-tasks/pending
   * Query params: workflowType, entityType, sortBy, page, limit
   */
  @Get('pending')
  async getMyPendingTasks(
    @Query() query: TaskQueryDto,
  ): Promise<PaginatedResponse<WorkflowTask>>;

  /**
   * Get my completed tasks
   * GET /api/v1/workflow-tasks/completed
   */
  @Get('completed')
  async getMyCompletedTasks(
    @Query() query: TaskQueryDto,
  ): Promise<PaginatedResponse<WorkflowTask>>;

  /**
   * Get task counts by status
   * GET /api/v1/workflow-tasks/counts
   */
  @Get('counts')
  async getTaskCounts(): Promise<TaskCountsDto>;

  /**
   * Get overdue tasks (admin)
   * GET /api/v1/workflow-tasks/overdue
   */
  @Get('overdue')
  @Roles(Role.SYSTEM_ADMIN, Role.COMPLIANCE_OFFICER)
  async getOverdueTasks(@Query() query: TaskQueryDto): Promise<PaginatedResponse<WorkflowTask>>;
}

// Response types
interface WorkflowTask {
  stepInstanceId: string;
  workflowInstanceId: string;
  entityType: string;
  entityId: string;
  entityTitle: string;        // e.g., "Anti-Bribery Policy v2"
  stepName: string;           // e.g., "Legal Review"
  requiredAction: string;
  assignedAt: Date;
  dueDate: Date | null;
  isOverdue: boolean;
  workflowType: WorkflowType;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

interface TaskCountsDto {
  pending: number;
  overdue: number;
  completedToday: number;
  completedThisWeek: number;
}
```

### 11.4 Delegation Endpoints

```typescript
@Controller('api/v1/workflow-delegations')
export class WorkflowDelegationController {

  /**
   * Create delegation
   * POST /api/v1/workflow-delegations
   */
  @Post()
  async create(@Body() dto: CreateDelegationDto): Promise<WorkflowDelegation>;

  /**
   * List my delegations (as delegator)
   * GET /api/v1/workflow-delegations/outgoing
   */
  @Get('outgoing')
  async getOutgoing(): Promise<WorkflowDelegation[]>;

  /**
   * List delegations to me (as delegatee)
   * GET /api/v1/workflow-delegations/incoming
   */
  @Get('incoming')
  async getIncoming(): Promise<WorkflowDelegation[]>;

  /**
   * Revoke delegation
   * DELETE /api/v1/workflow-delegations/:id
   */
  @Delete(':id')
  async revoke(@Param('id') id: string): Promise<void>;

  /**
   * Get all active delegations (admin)
   * GET /api/v1/workflow-delegations
   */
  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.COMPLIANCE_OFFICER)
  async list(@Query() query: ListDelegationsDto): Promise<PaginatedResponse<WorkflowDelegation>>;
}
```

### 11.5 Request/Response DTOs

```typescript
// Start workflow
interface StartWorkflowDto {
  templateId?: string;        // Optional, uses default if not provided
  entityType: string;
  entityId: string;
  initialData?: Record<string, any>;  // For condition evaluation
}

// Complete action
interface CompleteActionDto {
  action: WorkflowActionType;
  notes?: string;
  metadata?: Record<string, any>;
}

// Rejection
interface RejectDto {
  reason: string;
  targetBehavior: RejectionTargetBehavior;
  targetStepId?: string;
  instructions?: string;
  attachmentIds?: string[];
}

// Resubmit
interface ResubmitDto {
  notes?: string;
}

// Cancel
interface CancelDto {
  reason: string;
}

// Create delegation
interface CreateDelegationDto {
  delegateeUserId: string;
  type: 'TEMPORARY' | 'PERMANENT';
  startDate?: Date;
  endDate?: Date;
  scope: 'ALL' | 'WORKFLOW_TYPE' | 'SPECIFIC_ENTITY';
  workflowTypes?: WorkflowType[];
  entityType?: string;
  entityId?: string;
  reason?: string;
}

// Create template
interface CreateTemplateDto {
  name: string;
  description?: string;
  code: string;
  workflowType: WorkflowType;
  entityTypes: string[];
  steps: WorkflowStepDefinition[];
  conditions?: WorkflowCondition[];
  defaultSettings?: Record<string, any>;
}
```

---

## 12. Service Architecture

### 12.1 Module Structure

```
apps/backend/src/modules/workflow/
├── workflow.module.ts
├── controllers/
│   ├── workflow-template.controller.ts
│   ├── workflow-instance.controller.ts
│   ├── workflow-task.controller.ts
│   └── workflow-delegation.controller.ts
├── services/
│   ├── workflow-template.service.ts
│   ├── workflow-engine.service.ts          # Core execution engine
│   ├── workflow-delegation.service.ts
│   ├── workflow-notification.service.ts
│   ├── workflow-sla.service.ts
│   ├── workflow-query.service.ts           # Task queries, reporting
│   ├── assignee-resolver.service.ts
│   └── condition-evaluator.service.ts
├── processors/
│   └── sla.processor.ts                    # BullMQ job processor
├── gateways/
│   └── workflow.gateway.ts                 # WebSocket events
├── dto/
│   ├── create-template.dto.ts
│   ├── start-workflow.dto.ts
│   ├── complete-action.dto.ts
│   └── ...
├── interfaces/
│   ├── workflow-step.interface.ts
│   ├── workflow-condition.interface.ts
│   ├── delegation.interface.ts
│   └── sla-config.interface.ts
├── enums/
│   ├── workflow-type.enum.ts
│   ├── workflow-step-type.enum.ts
│   └── workflow-action-type.enum.ts
└── exceptions/
    ├── workflow-not-found.exception.ts
    ├── workflow-assignee.exception.ts
    └── workflow-validation.exception.ts
```

### 12.2 WorkflowEngineService (Core)

```typescript
// apps/backend/src/modules/workflow/services/workflow-engine.service.ts

@Injectable()
export class WorkflowEngineService {
  constructor(
    private prisma: PrismaService,
    private templateService: WorkflowTemplateService,
    private assigneeResolver: AssigneeResolverService,
    private conditionEvaluator: ConditionEvaluatorService,
    private notificationService: WorkflowNotificationService,
    private slaService: WorkflowSLAService,
    private auditService: AuditService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Start a workflow instance for an entity
   */
  async startWorkflow(
    templateId: string | null,
    entityType: string,
    entityId: string,
    entity: any,
    startedById: string,
    organizationId: string,
  ): Promise<WorkflowInstance> {
    // Get template (default or specified)
    const template = templateId
      ? await this.templateService.get(templateId, organizationId)
      : await this.templateService.getDefaultForEntity(entityType, organizationId);

    if (!template || template.status !== 'ACTIVE') {
      throw new WorkflowValidationException('No active workflow template available');
    }

    // Check for existing active workflow
    const existing = await this.prisma.workflowInstance.findFirst({
      where: {
        entityType,
        entityId,
        organizationId,
        status: { in: ['PENDING', 'IN_PROGRESS', 'REVISION_REQUESTED'] },
      },
    });

    if (existing) {
      throw new ConflictException('Active workflow already exists for this entity');
    }

    // Evaluate conditions to determine active steps
    const baseSteps = template.steps as WorkflowStepDefinition[];
    const conditions = template.conditions as WorkflowCondition[] || [];
    const additionalStepIds = this.conditionEvaluator.evaluateConditions(conditions, entity);

    // Create instance
    const instance = await this.prisma.workflowInstance.create({
      data: {
        organizationId,
        templateId: template.id,
        templateVersion: template.version,
        entityType,
        entityId,
        status: 'IN_PROGRESS',
        startedById,
      },
    });

    // Create step instances
    const stepInstances = await Promise.all(
      baseSteps.map(async (step, index) => {
        const isActive = !step.isConditional || additionalStepIds.includes(step.id);

        return this.prisma.workflowStepInstance.create({
          data: {
            organizationId,
            workflowInstanceId: instance.id,
            stepDefinitionId: step.id,
            stepName: step.name,
            stepType: step.type,
            requiredAction: step.requiredAction,
            order: step.order,
            isActive,
            status: isActive ? 'PENDING' : 'SKIPPED',
          },
        });
      }),
    );

    // Record start action
    await this.recordAction(instance.id, null, {
      actionType: 'WORKFLOW_STARTED',
      actionDescription: `Workflow started for ${entityType}`,
      actorUserId: startedById,
      actorType: 'USER',
    });

    // Activate first step(s)
    await this.activateNextSteps(instance.id, organizationId, entity);

    // Emit event
    this.eventEmitter.emit('workflow:started', {
      instanceId: instance.id,
      templateId: template.id,
      entityType,
      entityId,
      organizationId,
    });

    return this.getInstanceWithSteps(instance.id);
  }

  /**
   * Complete an action on a step
   */
  async completeAction(
    instanceId: string,
    stepInstanceId: string,
    userId: string,
    action: CompleteActionDto,
    organizationId: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.getInstanceWithSteps(instanceId);
    const stepInstance = instance.stepInstances.find(s => s.id === stepInstanceId);

    // Validations
    if (!stepInstance) {
      throw new NotFoundException('Step not found');
    }

    if (stepInstance.status !== 'ACTIVE') {
      throw new BadRequestException('Step is not active');
    }

    if (!stepInstance.assignedUserIds.includes(userId)) {
      throw new ForbiddenException('User is not assigned to this step');
    }

    // Get entity for context
    const entity = await this.getEntity(instance.entityType, instance.entityId);

    // Record action
    await this.recordAction(instance.id, stepInstanceId, {
      actionType: action.action,
      actionDescription: await this.buildActionDescription(action, stepInstance, userId),
      actorUserId: userId,
      actorType: 'USER',
      reason: action.notes,
      metadata: action.metadata,
    });

    // Handle based on step type
    if (stepInstance.stepType === 'PARALLEL_ANY') {
      // First completion wins
      await this.completeStep(stepInstance, userId, action);
      await this.cancelPendingActionsForStep(stepInstance);
    } else if (stepInstance.stepType === 'PARALLEL_ALL') {
      // Update pending/completed user lists
      const pendingUsers = stepInstance.pendingUserIds.filter(id => id !== userId);
      const completedUsers = [...stepInstance.completedUserIds, userId];

      await this.prisma.workflowStepInstance.update({
        where: { id: stepInstanceId },
        data: {
          pendingUserIds: pendingUsers,
          completedUserIds: completedUsers,
        },
      });

      // Check if all have completed
      if (pendingUsers.length === 0) {
        await this.completeStep(stepInstance, userId, action);
      }
    } else {
      // SEQUENTIAL - single completion
      await this.completeStep(stepInstance, userId, action);
    }

    // Cancel SLA timers
    await this.slaService.cancelStepSLA(stepInstanceId);

    // Check if workflow is complete
    const updatedInstance = await this.getInstanceWithSteps(instanceId);
    const allStepsComplete = updatedInstance.stepInstances
      .filter(s => s.isActive)
      .every(s => s.status === 'COMPLETED' || s.status === 'SKIPPED');

    if (allStepsComplete) {
      await this.completeWorkflow(updatedInstance);
    } else {
      // Activate next steps
      await this.activateNextSteps(instanceId, organizationId, entity);
    }

    // Emit event
    this.eventEmitter.emit('workflow:step_completed', {
      instanceId,
      stepInstanceId,
      action: action.action,
      userId,
    });

    return this.getInstanceWithSteps(instanceId);
  }

  /**
   * Activate the next step(s) in sequence
   */
  private async activateNextSteps(
    instanceId: string,
    organizationId: string,
    entity: any,
  ): Promise<void> {
    const instance = await this.getInstanceWithSteps(instanceId);

    // Find the lowest order pending step(s)
    const pendingSteps = instance.stepInstances
      .filter(s => s.status === 'PENDING' && s.isActive)
      .sort((a, b) => a.order - b.order);

    if (pendingSteps.length === 0) {
      return;
    }

    const lowestOrder = pendingSteps[0].order;
    const stepsToActivate = pendingSteps.filter(s => s.order === lowestOrder);

    for (const step of stepsToActivate) {
      await this.activateStep(step, instance, entity, organizationId);
    }
  }

  /**
   * Activate a single step
   */
  private async activateStep(
    stepInstance: WorkflowStepInstance,
    instance: WorkflowInstance,
    entity: any,
    organizationId: string,
  ): Promise<void> {
    // Get step definition from template
    const template = await this.templateService.get(instance.templateId, organizationId);
    const stepDef = (template.steps as WorkflowStepDefinition[])
      .find(s => s.id === stepInstance.stepDefinitionId);

    if (!stepDef) {
      throw new Error(`Step definition not found: ${stepInstance.stepDefinitionId}`);
    }

    // Resolve assignees
    const assignees = await this.assigneeResolver.resolveAssignees(
      stepDef,
      entity,
      organizationId,
    );

    // Update step instance
    await this.prisma.workflowStepInstance.update({
      where: { id: stepInstance.id },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
        assignedUserIds: assignees,
        pendingUserIds: assignees,
        completedUserIds: [],
      },
    });

    // Update workflow current step
    await this.prisma.workflowInstance.update({
      where: { id: instance.id },
      data: { currentStepId: stepInstance.id },
    });

    // Record activation
    await this.recordAction(instance.id, stepInstance.id, {
      actionType: 'STEP_ACTIVATED',
      actionDescription: `Step "${stepInstance.stepName}" activated`,
      actorType: 'SYSTEM',
    });

    // Schedule SLA if configured
    if (stepDef.timeoutHours) {
      await this.slaService.scheduleStepSLA(
        { ...stepInstance, activatedAt: new Date() } as WorkflowStepInstance,
        {
          timeoutHours: stepDef.timeoutHours,
          escalationRule: stepDef.escalationRule || 'REMIND',
          escalationTargets: stepDef.escalationTargets,
        },
      );
    }

    // Send notifications
    await this.notificationService.notifyStepAssigned(
      stepInstance,
      assignees,
      instance,
      entity,
    );

    // Emit event
    this.eventEmitter.emit('workflow:step_pending', {
      instanceId: instance.id,
      stepInstanceId: stepInstance.id,
      assignees,
    });
  }

  private async completeStep(
    stepInstance: WorkflowStepInstance,
    completedById: string,
    action: CompleteActionDto,
  ): Promise<void> {
    await this.prisma.workflowStepInstance.update({
      where: { id: stepInstance.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById,
        completionAction: action.action,
        completionNotes: action.notes,
      },
    });
  }

  private async completeWorkflow(instance: WorkflowInstance): Promise<void> {
    // Determine outcome based on final step actions
    const lastStep = instance.stepInstances
      .filter(s => s.isActive && s.status === 'COMPLETED')
      .sort((a, b) => b.order - a.order)[0];

    const outcome: WorkflowOutcome = lastStep?.completionAction === 'REJECT'
      ? 'REJECTED'
      : lastStep?.completionAction === 'APPROVE'
        ? 'APPROVED'
        : 'COMPLETED';

    await this.prisma.workflowInstance.update({
      where: { id: instance.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        outcome,
      },
    });

    await this.recordAction(instance.id, null, {
      actionType: 'WORKFLOW_COMPLETED',
      actionDescription: `Workflow completed with outcome: ${outcome}`,
      actorType: 'SYSTEM',
    });

    this.eventEmitter.emit('workflow:completed', {
      instanceId: instance.id,
      outcome,
      entityType: instance.entityType,
      entityId: instance.entityId,
    });
  }

  // Helper methods...
  private async getInstanceWithSteps(id: string): Promise<WorkflowInstance> {
    return this.prisma.workflowInstance.findUnique({
      where: { id },
      include: {
        stepInstances: { orderBy: { order: 'asc' } },
        template: true,
      },
    });
  }

  private async recordAction(
    instanceId: string,
    stepInstanceId: string | null,
    data: Partial<WorkflowAction>,
  ): Promise<void> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    await this.prisma.workflowAction.create({
      data: {
        organizationId: instance.organizationId,
        workflowInstanceId: instanceId,
        stepInstanceId,
        ...data,
      },
    });
  }
}
```

---

## 13. Event System

### 13.1 WebSocket Gateway

```typescript
// apps/backend/src/modules/workflow/gateways/workflow.gateway.ts

@WebSocketGateway({
  namespace: '/workflow',
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class WorkflowGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private workflowQuery: WorkflowQueryService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);

      // Join organization room
      client.join(`org:${payload.organizationId}`);

      // Join user-specific room
      client.join(`user:${payload.userId}`);

      client.data.user = payload;
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    // Cleanup handled automatically
  }

  // Event handlers
  @OnEvent('workflow:started')
  handleWorkflowStarted(payload: WorkflowStartedEvent): void {
    this.server
      .to(`org:${payload.organizationId}`)
      .emit('workflow:started', payload);
  }

  @OnEvent('workflow:step_pending')
  handleStepPending(payload: StepPendingEvent): void {
    // Notify assigned users
    for (const userId of payload.assignees) {
      this.server.to(`user:${userId}`).emit('workflow:task_assigned', {
        instanceId: payload.instanceId,
        stepInstanceId: payload.stepInstanceId,
      });
    }
  }

  @OnEvent('workflow:step_completed')
  handleStepCompleted(payload: StepCompletedEvent): void {
    this.server.emit('workflow:step_completed', payload);
  }

  @OnEvent('workflow:rejected')
  handleRejected(payload: WorkflowRejectedEvent): void {
    this.server.emit('workflow:rejected', payload);
  }

  @OnEvent('workflow:escalated')
  handleEscalated(payload: WorkflowEscalatedEvent): void {
    // Notify escalation targets
    for (const userId of payload.escalationTargets) {
      this.server.to(`user:${userId}`).emit('workflow:escalated', payload);
    }
  }

  @OnEvent('workflow:completed')
  handleCompleted(payload: WorkflowCompletedEvent): void {
    this.server.emit('workflow:completed', payload);
  }

  // Subscription for task count updates
  @SubscribeMessage('subscribe:task_counts')
  async handleTaskCountSubscription(client: Socket): Promise<void> {
    const userId = client.data.user.userId;
    const counts = await this.workflowQuery.getTaskCounts(userId);
    client.emit('task_counts', counts);
  }
}
```

### 13.2 Event Types

```typescript
// apps/backend/src/modules/workflow/events/workflow.events.ts

export interface WorkflowStartedEvent {
  instanceId: string;
  templateId: string;
  entityType: string;
  entityId: string;
  organizationId: string;
}

export interface StepPendingEvent {
  instanceId: string;
  stepInstanceId: string;
  assignees: string[];
}

export interface StepCompletedEvent {
  instanceId: string;
  stepInstanceId: string;
  action: WorkflowActionType;
  userId: string;
}

export interface WorkflowRejectedEvent {
  instanceId: string;
  stepInstanceId: string;
  reason: string;
  rejectedBy: string;
  entityType: string;
  entityId: string;
}

export interface WorkflowEscalatedEvent {
  instanceId: string;
  stepInstanceId: string;
  reason: string;
  escalationTargets: string[];
}

export interface WorkflowCompletedEvent {
  instanceId: string;
  outcome: WorkflowOutcome;
  entityType: string;
  entityId: string;
}
```

---

## 14. UI Implications

### 14.1 Workflow Builder UI Pattern

The workflow builder allows administrators to create and configure workflow templates visually.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Workflow Builder: Standard Policy Approval                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐     ┌────────────────┐     ┌────────────────┐          │
│  │  1. Manager    │────▶│  2. Legal      │────▶│  3. Executive  │          │
│  │     Review     │     │     Review     │     │    Sign-off    │          │
│  │  (Sequential)  │     │  (Parallel All)│     │  (Sequential)  │          │
│  └────────────────┘     └────────────────┘     └────────────────┘          │
│         │                                                                   │
│         │ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐      │
│         │   Conditional: If value > $10,000                          │      │
│         └─│                                                          │      │
│           │  ┌────────────────┐                                      │      │
│           │  │  CFO Approval  │                                      │      │
│           │  │  (Sequential)  │                                      │      │
│           │  └────────────────┘                                      │      │
│           └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘      │
│                                                                              │
│  [+ Add Step]  [+ Add Condition]                                            │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Step Configuration                                                           │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Name: [Manager Review                    ]                              │ │
│ │ Type: (•) Sequential  ( ) Parallel All  ( ) Parallel Any               │ │
│ │ Assignee: (•) Role [Policy Reviewer ▼]  ( ) User  ( ) Dynamic          │ │
│ │ Action Required: [Approve ▼]                                           │ │
│ │ Allow Delegation: [✓]                                                   │ │
│ │ SLA: [48] hours   Escalation: [Remind ▼]                               │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [Cancel]                                    [Save Draft] [Publish]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Status Display Component

Show workflow progress inline with the entity.

```tsx
// components/workflow/WorkflowStatusBar.tsx

interface WorkflowStatusBarProps {
  instance: WorkflowInstance;
  showDetails?: boolean;
}

export function WorkflowStatusBar({ instance, showDetails = true }: WorkflowStatusBarProps) {
  const steps = instance.stepInstances.filter(s => s.isActive);

  return (
    <div className="workflow-status-bar">
      <div className="workflow-steps">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <WorkflowStepIndicator
              step={step}
              isCurrent={step.id === instance.currentStepId}
            />
            {index < steps.length - 1 && <StepConnector />}
          </React.Fragment>
        ))}
      </div>

      {showDetails && instance.status === 'REVISION_REQUESTED' && (
        <RevisionAlert
          reason={instance.revisionReason}
          instructions={instance.revisionInstructions}
        />
      )}
    </div>
  );
}

function WorkflowStepIndicator({ step, isCurrent }) {
  const statusColors = {
    PENDING: 'gray',
    ACTIVE: 'blue',
    COMPLETED: 'green',
    REJECTED: 'red',
    SKIPPED: 'gray',
  };

  return (
    <div className={`step-indicator ${statusColors[step.status]}`}>
      <div className="step-icon">
        {step.status === 'COMPLETED' && <CheckIcon />}
        {step.status === 'REJECTED' && <XIcon />}
        {step.status === 'ACTIVE' && <ClockIcon />}
        {step.status === 'PENDING' && <CircleIcon />}
      </div>
      <div className="step-name">{step.stepName}</div>
      {step.isOverdue && <Badge variant="destructive">Overdue</Badge>}
    </div>
  );
}
```

### 14.3 My Tasks / Inbox Pattern

Unified inbox for all pending workflow tasks.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ My Tasks                                                     🔔 12 pending  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Filter: [All Types ▼] [All Status ▼]                    [🔍 Search...]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ⚠️ Overdue (2)                                                              │
│ ├── Anti-Bribery Policy v3 - Legal Review          Due: Jan 28 (3 days ago)│
│ │   Policy Approval • Assigned Jan 21                              [Review] │
│ │                                                                           │
│ └── Q1 Gift Disclosure #1234 - Approval            Due: Jan 30 (1 day ago) │
│     Disclosure Review • Assigned Jan 25                            [Review] │
│                                                                              │
│ 📋 Due Today (3)                                                            │
│ ├── Data Privacy Policy - Executive Sign-off                   Due: Today  │
│ │   Policy Approval • Assigned Feb 1                              [Review] │
│ │                                                                           │
│ ├── Case #5678 Closure - Compliance Approval                   Due: Today  │
│ │   Case Closure • Assigned Jan 30                                [Review] │
│ │                                                                           │
│ └── Employee COI #9012 - Manager Review                        Due: Today  │
│     Disclosure Review • Assigned Jan 31                           [Review] │
│                                                                              │
│ 📅 Upcoming (7)                                                             │
│ └── ...                                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.4 Frontend Integration Pattern

```tsx
// hooks/useWorkflowInstance.ts

export function useWorkflowInstance(entityType: string, entityId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['workflow-instance', entityType, entityId],
    queryFn: () => workflowApi.getByEntity(entityType, entityId),
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const socket = getWorkflowSocket();

    socket.on('workflow:step_completed', (event) => {
      if (event.entityId === entityId) {
        refetch();
      }
    });

    socket.on('workflow:completed', (event) => {
      if (event.entityId === entityId) {
        refetch();
      }
    });

    return () => {
      socket.off('workflow:step_completed');
      socket.off('workflow:completed');
    };
  }, [entityId, refetch]);

  return { instance: data, isLoading, error, refetch };
}

// hooks/useMyTasks.ts

export function useMyTasks(filters?: TaskFilters) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-tasks', filters],
    queryFn: () => workflowApi.getMyPendingTasks(filters),
  });

  // Real-time task updates
  useEffect(() => {
    const socket = getWorkflowSocket();

    socket.on('workflow:task_assigned', () => {
      refetch();
    });

    socket.on('workflow:step_completed', () => {
      refetch();
    });

    return () => {
      socket.off('workflow:task_assigned');
      socket.off('workflow:step_completed');
    };
  }, [refetch]);

  return { tasks: data?.items ?? [], total: data?.total ?? 0, isLoading, refetch };
}
```

---

## 15. Security Considerations

### 15.1 Tenant Isolation

All workflow data is scoped by `organization_id` and enforced at multiple levels:

1. **Row-Level Security (RLS)**: PostgreSQL policies filter all queries
2. **Service Layer**: All queries include `organizationId` filter
3. **API Layer**: TenantGuard validates organization context
4. **Cache Keys**: All cache keys prefixed with `org:{organizationId}:`

```typescript
// Cache key pattern
const cacheKey = `org:${organizationId}:workflow:instance:${instanceId}`;

// Redis SLA key pattern
const slaKey = `org:${organizationId}:sla:step:${stepInstanceId}`;
```

### 15.2 Permission Checks

```typescript
// Permission validation for workflow actions
async validateUserCanAct(
  stepInstance: WorkflowStepInstance,
  userId: string,
): Promise<void> {
  // Check user is assigned to step
  if (!stepInstance.assignedUserIds.includes(userId)) {
    // Check for delegation
    const delegation = await this.delegationService.getActiveDelegation(
      userId,
      stepInstance.organizationId,
    );

    if (!delegation || !stepInstance.assignedUserIds.includes(delegation.delegatorUserId)) {
      throw new ForbiddenException('User is not authorized to act on this step');
    }
  }

  // Check step is active
  if (stepInstance.status !== 'ACTIVE') {
    throw new BadRequestException('Step is not awaiting action');
  }
}

// Role-based template management
@Roles(Role.SYSTEM_ADMIN)
@UseGuards(RolesGuard)
async createTemplate(dto: CreateTemplateDto): Promise<WorkflowTemplate> {
  // Only system admins can create workflow templates
}
```

### 15.3 Audit Trail Requirements

Every workflow action is logged with:

- **Who**: Actor user ID and type (USER, SYSTEM, DELEGATION)
- **What**: Action type and description in natural language
- **When**: Timestamp
- **Where**: Organization ID, workflow instance ID, step instance ID
- **Why**: Reason/notes if provided
- **How**: Delegation ID if acting via delegation

```typescript
// Audit log entry example
{
  id: "uuid",
  organizationId: "org-uuid",
  workflowInstanceId: "instance-uuid",
  stepInstanceId: "step-uuid",
  actionType: "APPROVE",
  actionDescription: "John Smith approved the Anti-Bribery Policy",
  actorUserId: "user-uuid",
  actorType: "USER",
  reason: "Policy meets all compliance requirements",
  delegatedFromUserId: null,
  delegationId: null,
  createdAt: "2026-02-01T10:30:00Z"
}
```

### 15.4 Data Protection

- Workflow actions may contain sensitive information (rejection reasons, notes)
- All data encrypted at rest (PostgreSQL TDE)
- All data encrypted in transit (TLS 1.3)
- Audit logs retained per organization retention policy
- No PII in log aggregation systems

---

## 16. Implementation Guide

### 16.1 Module Registration

```typescript
// apps/backend/src/modules/workflow/workflow.module.ts

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'workflow-sla',
    }),
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    WorkflowTemplateController,
    WorkflowInstanceController,
    WorkflowTaskController,
    WorkflowDelegationController,
  ],
  providers: [
    WorkflowTemplateService,
    WorkflowEngineService,
    WorkflowDelegationService,
    WorkflowNotificationService,
    WorkflowSLAService,
    WorkflowQueryService,
    AssigneeResolverService,
    ConditionEvaluatorService,
    SLAProcessor,
    WorkflowGateway,
  ],
  exports: [
    WorkflowEngineService,
    WorkflowQueryService,
  ],
})
export class WorkflowModule {}
```

### 16.2 Integration with Entity Modules

```typescript
// Example: Policy module integration
// apps/backend/src/modules/policies/policy.service.ts

@Injectable()
export class PolicyService {
  constructor(
    private prisma: PrismaService,
    private workflowEngine: WorkflowEngineService,
  ) {}

  async submitForApproval(
    policyId: string,
    userId: string,
    organizationId: string,
    workflowTemplateId?: string,
  ): Promise<Policy> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy || policy.status !== 'DRAFT') {
      throw new BadRequestException('Policy is not in draft status');
    }

    // Start workflow
    const workflowInstance = await this.workflowEngine.startWorkflow(
      workflowTemplateId,
      'Policy',
      policyId,
      policy,
      userId,
      organizationId,
    );

    // Update policy status
    await this.prisma.policy.update({
      where: { id: policyId },
      data: {
        status: 'PENDING_APPROVAL',
        workflowInstanceId: workflowInstance.id,
      },
    });

    return this.getPolicy(policyId);
  }

  // Listen for workflow completion
  @OnEvent('workflow:completed')
  async handleWorkflowCompleted(event: WorkflowCompletedEvent): Promise<void> {
    if (event.entityType !== 'Policy') return;

    const policy = await this.prisma.policy.findUnique({
      where: { id: event.entityId },
    });

    if (!policy) return;

    const newStatus = event.outcome === 'APPROVED'
      ? 'APPROVED'
      : event.outcome === 'REJECTED'
        ? 'DRAFT' // Return to draft on rejection
        : policy.status;

    await this.prisma.policy.update({
      where: { id: event.entityId },
      data: { status: newStatus },
    });
  }
}
```

### 16.3 Migration Example

```sql
-- Migration: Create workflow tables
-- 20260201_create_workflow_tables.sql

CREATE TYPE workflow_type AS ENUM ('APPROVAL', 'ASSIGNMENT', 'REVIEW', 'REMEDIATION');
CREATE TYPE workflow_template_status AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED');
CREATE TYPE workflow_instance_status AS ENUM ('PENDING', 'IN_PROGRESS', 'REVISION_REQUESTED', 'COMPLETED', 'CANCELED', 'FAILED');
CREATE TYPE workflow_outcome AS ENUM ('APPROVED', 'REJECTED', 'COMPLETED', 'CANCELED', 'EXPIRED');
CREATE TYPE workflow_step_type AS ENUM ('SEQUENTIAL', 'PARALLEL_ALL', 'PARALLEL_ANY');
CREATE TYPE workflow_step_status AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'REJECTED', 'SKIPPED', 'CANCELED');
CREATE TYPE delegation_type AS ENUM ('TEMPORARY', 'PERMANENT');
CREATE TYPE delegation_scope AS ENUM ('ALL', 'WORKFLOW_TYPE', 'SPECIFIC_ENTITY');
CREATE TYPE actor_type AS ENUM ('USER', 'SYSTEM', 'DELEGATION');

-- Create tables (see Prisma schema for full definitions)
-- ...

-- Create indexes
-- ...

-- Enable RLS
-- ...
```

---

## 17. Deferred Scope

The following capabilities are explicitly **out of scope** for the initial implementation:

### 17.1 Cross-Entity Workflows

**What it is:** A single workflow that spans multiple entities (e.g., "When Policy approved, auto-create Attestation Campaign").

**Why deferred:** Adds significant complexity to the state machine. Can be achieved through event-driven integration between modules.

**Workaround:** Use module-level event handlers to trigger new workflows on entity completion.

### 17.2 Complex Branching (If-Then-Else Paths)

**What it is:** True conditional branching where different paths are mutually exclusive.

**Why deferred:** Dramatically increases workflow complexity and makes visualization/debugging difficult.

**Workaround:** Use conditional ADD steps (current design) which covers 90% of use cases. For truly exclusive paths, create separate workflow templates.

### 17.3 Sub-Workflows

**What it is:** Embedding one workflow inside another as a step.

**Why deferred:** Increases nesting complexity and makes error handling much harder.

**Workaround:** Chain workflows via events or create composite templates.

### 17.4 Workflow Versioning (In-Flight Updates)

**What it is:** When a template is updated, what happens to workflows already in progress?

**Current behavior:** In-progress workflows continue with their original template version (snapshotted at start).

**Why deferred:** Handling mid-flight template changes adds significant complexity around step mapping, assignee changes, and state management.

**Future consideration:** Could add "migration strategy" option when updating templates (continue, cancel, migrate).

### 17.5 Custom Action Types

**What it is:** Allow organizations to define their own action types beyond the built-in set.

**Why deferred:** Requires schema changes per tenant and complicates UI rendering.

**Workaround:** Use metadata field on actions to store custom data.

### 17.6 Workflow Analytics

**What it is:** Detailed metrics on workflow performance (average completion time, bottleneck detection, SLA compliance rates).

**Why deferred:** Can be built as a reporting layer on top of the action audit trail.

**Future:** Analytics module can query workflow_actions table to generate insights.

---

## Appendix A: Workflow Action Type Reference

| Action Type | Workflow Types | Description |
|------------|----------------|-------------|
| WORKFLOW_STARTED | All | Workflow instance created |
| WORKFLOW_COMPLETED | All | All steps completed successfully |
| WORKFLOW_CANCELED | All | Workflow manually canceled |
| WORKFLOW_FAILED | All | Workflow terminated due to error |
| STEP_ACTIVATED | All | Step made active, assignees notified |
| STEP_COMPLETED | All | Step completed successfully |
| STEP_SKIPPED | All | Step skipped (condition not met or PARALLEL_ANY) |
| APPROVE | APPROVAL, REVIEW | Positive approval action |
| REJECT | APPROVAL, REVIEW | Negative rejection action |
| REQUEST_CHANGES | APPROVAL | Request revisions before approval |
| ASSIGN | ASSIGNMENT | Assign to user/team |
| REASSIGN | ASSIGNMENT | Change assignment |
| ACCEPT | ASSIGNMENT | Accept assignment |
| DECLINE | ASSIGNMENT | Decline assignment |
| COMPLETE | REVIEW, REMEDIATION | Mark work as complete |
| REQUEST_REVISION | REVIEW | Request revisions |
| VERIFY | REMEDIATION | Verify completion |
| REJECT_COMPLETION | REMEDIATION | Reject completion claim |
| ESCALATE | All | SLA escalation triggered |
| TIMEOUT | All | SLA deadline reached |
| DELEGATE | All | Task delegated to another user |
| REMINDER_SENT | All | SLA reminder sent |
| WARNING_SENT | All | SLA warning sent |

---

## Appendix B: Example Workflow Templates

### B.1 Standard Policy Approval (3-Step)

```json
{
  "name": "Standard Policy Approval",
  "code": "policy-approval-standard",
  "workflowType": "APPROVAL",
  "entityTypes": ["Policy"],
  "steps": [
    {
      "id": "manager-review",
      "name": "Manager Review",
      "type": "SEQUENTIAL",
      "assigneeType": "DYNAMIC",
      "assignees": ["entity.createdBy.manager"],
      "requiredAction": "APPROVE",
      "allowDelegation": true,
      "timeoutHours": 48,
      "escalationRule": "REMIND",
      "order": 1
    },
    {
      "id": "legal-review",
      "name": "Legal Review",
      "type": "SEQUENTIAL",
      "assigneeType": "ROLE",
      "assignees": ["POLICY_REVIEWER"],
      "requiredAction": "APPROVE",
      "allowDelegation": true,
      "timeoutHours": 72,
      "escalationRule": "ESCALATE",
      "escalationTargets": ["COMPLIANCE_OFFICER"],
      "order": 2
    },
    {
      "id": "executive-signoff",
      "name": "Executive Sign-off",
      "type": "SEQUENTIAL",
      "assigneeType": "ROLE",
      "assignees": ["COMPLIANCE_OFFICER"],
      "requiredAction": "APPROVE",
      "allowDelegation": false,
      "timeoutHours": 24,
      "escalationRule": "REMIND",
      "order": 3
    }
  ],
  "conditions": [],
  "defaultSettings": {
    "onReject": "SUBMITTER"
  }
}
```

### B.2 Disclosure Review with Conditional CFO Approval

```json
{
  "name": "Gift Disclosure Review",
  "code": "disclosure-gift-review",
  "workflowType": "APPROVAL",
  "entityTypes": ["Disclosure"],
  "steps": [
    {
      "id": "manager-review",
      "name": "Manager Review",
      "type": "SEQUENTIAL",
      "assigneeType": "DYNAMIC",
      "assignees": ["entity.employee.manager"],
      "requiredAction": "APPROVE",
      "allowDelegation": true,
      "timeoutHours": 48,
      "order": 1
    },
    {
      "id": "compliance-review",
      "name": "Compliance Review",
      "type": "PARALLEL_ANY",
      "assigneeType": "ROLE",
      "assignees": ["COMPLIANCE_OFFICER"],
      "requiredAction": "APPROVE",
      "allowDelegation": true,
      "timeoutHours": 72,
      "order": 2
    },
    {
      "id": "cfo-approval",
      "name": "CFO Approval",
      "type": "SEQUENTIAL",
      "assigneeType": "ROLE",
      "assignees": ["SYSTEM_ADMIN"],
      "requiredAction": "APPROVE",
      "allowDelegation": false,
      "timeoutHours": 24,
      "order": 3,
      "isConditional": true,
      "instructions": "Review high-value gift disclosure for policy compliance"
    }
  ],
  "conditions": [
    {
      "id": "high-value-gift",
      "field": "disclosure.estimatedValue",
      "operator": "GT",
      "value": 10000,
      "thenAddStep": "cfo-approval",
      "description": "Add CFO approval for gifts over $10,000"
    }
  ]
}
```

### B.3 Case Triage and Assignment

```json
{
  "name": "Case Triage",
  "code": "case-triage-standard",
  "workflowType": "ASSIGNMENT",
  "entityTypes": ["Case"],
  "steps": [
    {
      "id": "initial-triage",
      "name": "Initial Triage",
      "type": "PARALLEL_ANY",
      "assigneeType": "ROLE",
      "assignees": ["TRIAGE_LEAD"],
      "requiredAction": "ASSIGN",
      "allowDelegation": true,
      "timeoutHours": 4,
      "escalationRule": "ESCALATE",
      "escalationTargets": ["COMPLIANCE_OFFICER"],
      "order": 1
    },
    {
      "id": "investigator-acceptance",
      "name": "Investigator Acceptance",
      "type": "SEQUENTIAL",
      "assigneeType": "DYNAMIC",
      "assignees": ["entity.assignedTo"],
      "requiredAction": "ACKNOWLEDGE",
      "allowDelegation": false,
      "timeoutHours": 24,
      "escalationRule": "ESCALATE",
      "escalationTargets": ["TRIAGE_LEAD"],
      "order": 2
    }
  ],
  "conditions": []
}
```

---

*End of Technical Specification*
