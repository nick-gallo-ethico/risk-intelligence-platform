# Reference Implementations

This folder contains **canonical patterns** that all code in this project MUST follow.

## Purpose

When AI (Ralph Loop) or human developers write new code, they should:

1. **Read these examples first** - Understand the patterns before writing
2. **Copy the structure** - Don't reinvent patterns
3. **Follow conventions exactly** - Naming, imports, error handling

## Files

| File | Description |
|------|-------------|
| `entity-pattern.prisma` | Prisma model structure with required fields |
| `service-pattern.ts` | NestJS service with CRUD, logging, tenant isolation |
| `controller-pattern.ts` | NestJS controller with guards, validation, decorators |
| `dto-pattern.ts` | DTOs with class-validator decorators |
| `test-pattern.spec.ts` | Unit test structure with mocks |
| `e2e-test-pattern.spec.ts` | E2E test with tenant isolation verification |

## Usage in Tasks

When a task prompt says:
> "Following the pattern in `examples/service-pattern.ts`..."

The AI or developer MUST:
1. Read the referenced pattern file
2. Match the structure exactly
3. Adapt only the entity-specific parts

## Updating Patterns

These patterns are the **source of truth**. If you need to change a pattern:

1. Discuss in a PR first
2. Update all existing code to match
3. Update this README if needed
