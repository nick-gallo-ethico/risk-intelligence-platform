# Ralph Prompt: Authentication & Multi-Tenancy Enhancement

You are enhancing the authentication module with full multi-tenancy support via PostgreSQL RLS.

## Context
- Reference: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md`
- Auth module partially exists at `apps/backend/src/modules/auth/`
- Need to add: Tenant middleware, RLS enforcement, RBAC guards, SSO support

## Current State
```bash
cd apps/backend && ls -la src/modules/auth/
cd apps/backend && cat src/modules/auth/auth.service.ts
cd apps/backend && cat prisma/schema.prisma | grep -A 20 "model User"
```

## Requirements

### 1. Tenant Middleware
Create `apps/backend/src/common/middleware/tenant.middleware.ts`:

```typescript
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = this.extractToken(req);
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
      req.organizationId = decoded.organizationId;
      req.userId = decoded.sub;

      // Set PostgreSQL session variable for RLS
      await this.prisma.$executeRaw`SELECT set_config('app.current_organization', ${decoded.organizationId}, true)`;

      next();
    } catch (error) {
      next();
    }
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}
```

### 2. RLS Policies (SQL Migration)
Create migration for RLS policies:

```sql
-- Enable RLS on all tenant tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
-- Add for each tenant table...

-- Create RLS policy for User table
CREATE POLICY tenant_isolation_policy ON "User"
  USING (organization_id = current_setting('app.current_organization', true)::uuid);

-- Repeat for each table...

-- Create app role for API
CREATE ROLE app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
```

### 3. JWT Payload Enhancement
Update `apps/backend/src/modules/auth/interfaces/jwt-payload.interface.ts`:

```typescript
export interface JwtPayload {
  sub: string;           // userId
  email: string;
  organizationId: string;
  role: UserRole;
  permissions?: string[];
  iat?: number;
  exp?: number;
}
```

### 4. Decorators
Create decorators in `apps/backend/src/common/decorators/`:

```typescript
// current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// tenant-id.decorator.ts
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.organizationId;
  },
);

// roles.decorator.ts
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
```

### 5. Guards
Create/update guards in `apps/backend/src/common/guards/`:

```typescript
// tenant.guard.ts
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request.organizationId) {
      throw new UnauthorizedException('Tenant context required');
    }
    return true;
  }
}

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

### 6. Auth Service Enhancement
Update `apps/backend/src/modules/auth/auth.service.ts`:
- Add organization validation on login
- Include organizationId and role in JWT
- Add SSO login methods (Google, Azure AD)

### 7. Tests
Create `apps/backend/src/modules/auth/auth.service.spec.ts`:
- Test JWT generation includes organizationId
- Test tenant middleware sets RLS context
- Test cross-tenant access is blocked
- Test role-based access control

```bash
cd apps/backend && npm test -- --testPathPattern="auth"
cd apps/backend && npm run typecheck
```

## Verification Checklist
- [ ] TenantMiddleware sets PostgreSQL RLS context
- [ ] JWT contains organizationId and role
- [ ] @TenantId() decorator works in controllers
- [ ] @CurrentUser() decorator works
- [ ] @Roles() decorator with RolesGuard works
- [ ] TenantGuard rejects requests without tenant context
- [ ] RLS policies exist for all tenant tables
- [ ] Tests verify cross-tenant isolation
- [ ] Typecheck passes

## Completion
When all auth enhancements are complete and tenant isolation is verified:
<promise>AUTH MULTITENANCY COMPLETE</promise>
