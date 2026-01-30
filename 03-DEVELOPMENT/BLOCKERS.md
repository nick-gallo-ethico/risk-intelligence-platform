# Active Blockers

**Purpose:** Track issues that are blocking AI or human development progress.
**Format:** Each blocker has an ID, description, and resolution status.

---

## How to Use

When blocked:
1. Add a new blocker entry with a unique ID
2. Describe what you're trying to do
3. Explain why you're blocked
4. Suggest possible resolutions if known
5. Tag with affected task IDs

When resolved:
1. Move to "Resolved Blockers" section
2. Document how it was resolved
3. Update TASK-LOG.md

---

## Active Blockers

*No active blockers at this time.*

<!--
### Blocker #1: [Short Description]

**Created:** 2026-01-XX
**Affects Tasks:** X.Y.Z
**Severity:** [CRITICAL | HIGH | MEDIUM | LOW]

**What I'm trying to do:**
[Description of the task]

**Why I'm blocked:**
[Specific issue preventing progress]

**Possible resolutions:**
1. [Option 1]
2. [Option 2]

**Needs:**
- [ ] Decision from [person/role]
- [ ] Information about [topic]
- [ ] Access to [resource]

**Notes:**
[Any additional context]
-->

---

## Resolved Blockers

### Blocker #0: Example Resolved Blocker (Template)

**Created:** 2026-01-29
**Resolved:** 2026-01-29
**Affected Tasks:** N/A (example)

**What was blocked:**
Example of a resolved blocker entry.

**Resolution:**
This is how it was resolved.

**Lessons learned:**
- Any patterns to avoid in the future

---

## Blocker Categories

For quick filtering:

| Category | Description |
|----------|-------------|
| `DECISION` | Needs product/architecture decision |
| `ACCESS` | Needs access to resource/system |
| `DEPENDENCY` | Waiting on external dependency |
| `BUG` | Blocked by a bug in existing code |
| `UNCLEAR` | Requirements unclear |
| `SECURITY` | Security review needed |

---

## Escalation Path

If a blocker is:
- **CRITICAL:** Ping immediately in Slack/Teams
- **HIGH:** Add to daily standup
- **MEDIUM:** Review in weekly planning
- **LOW:** Add to backlog

---

*End of Blockers - Add new blockers above the "Resolved Blockers" section*
