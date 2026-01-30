# Ralph Loop Setup

Iterative AI development based on [Geoffrey Huntley's technique](https://ghuntley.com/ralph/).

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  1. Claude receives PROMPT.md                               │
│  2. Works on task, modifies files, commits to git           │
│  3. Session ends                                            │
│  4. Loop script starts NEW session with --continue          │
│  5. Claude sees previous work via files/git (not memory)    │
│  6. Iterates until completion promise or max iterations     │
└─────────────────────────────────────────────────────────────┘
```

Each iteration is a **fresh session**. Claude maintains context through:
- Files it modified
- Git commit history
- The consistent prompt instructions

## Quick Start

### Windows (PowerShell)
```powershell
# Basic usage (uses PROMPT.md)
.\scripts\ralph-loop.ps1

# Custom prompt with max iterations
.\scripts\ralph-loop.ps1 -PromptFile scripts\ralph-prompts\case-entity.md -MaxIterations 15
```

### Unix/Git Bash
```bash
# Make executable
chmod +x scripts/ralph-loop.sh

# Basic usage
./scripts/ralph-loop.sh

# Custom prompt with max iterations
./scripts/ralph-loop.sh scripts/ralph-prompts/case-entity.md 15
```

## Available Prompts

### Infrastructure (Run First)

| Prompt | Purpose | Completion Promise |
|--------|---------|-------------------|
| `00-core-data-model.md` | User, Employee, Organization, Category, Activity | `CORE DATA MODEL COMPLETE` |
| `01-auth-multitenancy.md` | JWT, RLS, RBAC, Tenant Middleware | `AUTH MULTITENANCY COMPLETE` |
| `02-ai-integration.md` | Claude API, Provider abstraction, Logging | `AI INTEGRATION COMPLETE` |

### Phase 1 Modules

| Prompt | Purpose | Completion Promise |
|--------|---------|-------------------|
| `03-case-management-full.md` | Full case lifecycle, investigations, communications | `CASE MANAGEMENT COMPLETE` |
| `04-operator-console.md` | Hotline intake, AI note cleanup, QA workflow | `OPERATOR CONSOLE COMPLETE` |
| `05-ethics-portal.md` | Anonymous reporting, Employee self-service | `ETHICS PORTAL COMPLETE` |
| `06-web-form-builder.md` | Drag-drop form builder, versioning, translations | `WEB FORM BUILDER COMPLETE` |
| `07-disclosures.md` | COI, Gifts, Campaigns, Review workflow | `DISCLOSURES COMPLETE` |

### Phase 2 Modules

| Prompt | Purpose | Completion Promise |
|--------|---------|-------------------|
| `08-policy-management.md` | Policy CRUD, approvals, attestations, AI generation | `POLICY MANAGEMENT COMPLETE` |
| `09-analytics-reporting.md` | Dashboards, reports, scheduled delivery | `ANALYTICS REPORTING COMPLETE` |

### Phase 3 Modules

| Prompt | Purpose | Completion Promise |
|--------|---------|-------------------|
| `10-employee-chatbot.md` | AI chatbot, RAG, guided speak-up | `EMPLOYEE CHATBOT COMPLETE` |
| `11-realtime-collaboration.md` | WebSocket, Y.js, presence, comments | `REALTIME COLLABORATION COMPLETE` |
| `12-hris-integration.md` | Merge.dev, employee sync, SFTP fallback | `HRIS INTEGRATION COMPLETE` |

### Utilities

| Prompt | Purpose | Completion Promise |
|--------|---------|-------------------|
| `case-entity.md` | Quick Case entity only | `CASE ENTITY COMPLETE` |
| `investigation-entity.md` | Quick Investigation entity only | `INVESTIGATION ENTITY COMPLETE` |
| `tenant-isolation-audit.md` | Security audit for data leakage | `TENANT ISOLATION AUDIT COMPLETE` |
| `TEMPLATE.md` | Template for creating new prompts | - |

## Writing Effective Prompts

### Structure
```markdown
# Ralph Prompt: [Feature Name]

## Context
Brief background, constraints, PRD references

## Current State
Commands to check what exists already

## Requirements
Step-by-step implementation requirements

## Verification Checklist
- [ ] Tests pass
- [ ] Typecheck passes
- [ ] Tenant isolation verified

## Completion
<promise>FEATURE COMPLETE</promise>
```

### Key Principles

1. **Be Specific** - Clear success criteria
2. **Include Verification** - Test commands to run
3. **Reference Patterns** - Point to CLAUDE.md
4. **Completion Promise** - Exact phrase to detect success

## Completion Promises

Ralph detects `<promise>` tags to know when to stop:

```markdown
<promise>CASE ENTITY COMPLETE</promise>
```

Without this (or `--max-iterations`), Ralph runs forever.

## Logs

Logs are saved to `scripts/ralph-logs/` with timestamps:
```
ralph-logs/
├── ralph-20260129-143022.log
├── ralph-20260129-160455.log
└── ...
```

## Combining with Subagents

Before running Ralph, use subagents for research:

```
# In interactive Claude session:
Use the Explore agent to understand how existing entities
handle activity logging and tenant isolation.
```

Then run Ralph with the implementation prompt.

After Ralph completes:
```
# Back in interactive session:
Use the code-reviewer agent to audit the new Case module
for tenant isolation issues.
```

## Workflow Example

```powershell
# 1. Research phase (interactive Claude)
claude
> Use Explore agent to research case management patterns

# 2. Implementation phase (Ralph Loop)
.\scripts\ralph-loop.ps1 -PromptFile scripts\ralph-prompts\case-entity.md -MaxIterations 20

# 3. Review phase (interactive Claude)
claude --continue
> Use code-reviewer agent to audit the Case module
```

## Troubleshooting

### Ralph doesn't stop
- Check your completion promise matches exactly
- Use `--max-iterations` as a safety limit
- Press `Ctrl+C` to stop manually

### Claude doesn't see previous work
- Ensure changes are saved to files
- Consider committing between iterations
- Check that `--continue` flag is being passed

### Context seems lost
- This is expected! Each iteration is fresh
- Claude rebuilds context from files/git
- Make sure prompt includes "check current state" instructions
