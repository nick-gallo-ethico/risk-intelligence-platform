# Commit, Push, and Create PR

**Trigger:** `/commit-push-pr` or when user says "commit and create PR"

## Workflow

1. **Check git status**
   ```bash
   git status
   git diff --stat
   ```

2. **Stage changes** (be selective, not `git add -A`)
   - Review what's changed
   - Stage only relevant files
   - Never stage .env or credentials

3. **Create commit**
   - Analyze changes to determine commit type
   - Write concise commit message (imperative mood)
   - Include Co-Authored-By

4. **Push to remote**
   ```bash
   git push -u origin HEAD
   ```

5. **Create PR**
   ```bash
   gh pr create --title "..." --body "..."
   ```

## Commit Message Format

```
<type>: <short description>

<optional body explaining why>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change that neither fixes bug nor adds feature
- `docs`: Documentation only
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, etc.

## PR Body Format

```markdown
## Summary
<1-3 bullet points describing what this PR does>

## Changes
- File1: <what changed>
- File2: <what changed>

## Test Plan
- [ ] Tests pass locally
- [ ] Tenant isolation verified
- [ ] Manual testing completed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Safety Checks

Before committing:
- [ ] No .env files staged
- [ ] No hardcoded credentials
- [ ] No console.log left in production code
- [ ] All tests pass
- [ ] Lint passes

## Example

```bash
# User: "commit and create a PR for the case CRUD endpoints"

git status
git add apps/backend/src/modules/cases/
git commit -m "$(cat <<'EOF'
feat: add Case entity and CRUD endpoints

Implements Case model with organization scoping and REST API.
Includes tenant isolation and activity logging.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
git push -u origin HEAD
gh pr create --title "feat: add Case entity and CRUD endpoints" --body "$(cat <<'EOF'
## Summary
- Add Case Prisma model with all PRD-005 fields
- Implement Cases module with CRUD endpoints
- Add tenant scoping via organization_id

## Test Plan
- [x] Unit tests pass
- [x] Tenant isolation test passes
- [ ] Manual API testing

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
