# Phase 3: Authentication & SSO - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Enterprise authentication capabilities: SSO providers (Azure AD, Google OAuth, SAML 2.0), domain verification for tenant routing, JIT user provisioning, and MFA for additional security. This extends the existing JWT-based auth system.

</domain>

<decisions>
## Implementation Decisions

### Login Flow UX
- **Entry point:** Claude's discretion (email-first routing vs SSO buttons)
- **SSO enforcement:** Admin-configurable per organization - admins decide whether to require SSO or allow password fallback
- **Single provider:** One SSO provider per user account - no linking multiple providers
- **Session duration:** Claude's discretion for appropriate enterprise session handling
- **Branding:** Tenant-branded login pages (custom logo and colors per organization)
- **Tenant routing:** Email-first detection (user enters email, system detects org from domain and routes to SSO) - NOT subdomains
- **Remember last org:** Claude's discretion

### SSO Failure Handling (Detailed Requirements)
- Display clear, non-technical error messages - never expose internal details
- Provide "Try Again" button and support contact info
- Failure categories:
  - IdP unavailable → "Authentication service temporarily unavailable"
  - Invalid SAML assertion → "Authentication failed"
  - User not in IdP → "Account not found"
  - Attribute mapping failure → "Account configuration issue"
  - Session/token expired → Silent retry first, then redirect
  - Network timeout → Auto-retry once
- **Security:** Audit log every attempt, rate limit per IP/tenant, no automatic password fallback
- **Admin visibility:** Dashboard showing SSO health, email alerts after N consecutive failures

### JIT Provisioning
- **Auto-create:** Always auto-create users from verified domains - minimum Employee portal access
- **Existing users:** System users also see their Employee portal view (in settings)
- **Default role:** Admin-configurable, defaulting to EMPLOYEE or READ_ONLY
- **IdP group mapping:** Optional - map IdP groups to roles
- **Security guardrails:** Block SYSTEM_ADMIN and COMPLIANCE_OFFICER from JIT provisioning regardless of config
- **Unregistered domain:** Redirect to signup/trial flow
- **Employee linking:** Claude's discretion for auto-linking User to Employee records from HRIS

### MFA Setup
- **Requirement:** Org-configurable - each organization decides whether MFA is required
- **Enforcement timing:** Claude's discretion (immediate vs grace period)
- **Recovery codes:** Claude's discretion for UX (count, confirmation requirement)
- **MFA reset:** Both options - self-service via recovery codes AND admin reset as backup

### Admin SSO Configuration
- **Setup path:** Both - self-service for simple providers (Google), support-assisted for complex (SAML)
- **Domain verification:** Claude's discretion for methods (DNS TXT, file upload, etc.)
- **Testing workflow:** Claude's discretion for SSO rollout/testing requirements
- **Monitoring:** Claude's discretion for admin visibility into SSO health

### Claude's Discretion
- Login flow entry point design
- Session duration settings
- Remember last organization behavior
- Employee record auto-linking
- MFA enforcement timing and grace period
- Recovery code count and confirmation UX
- Domain verification methods
- SSO testing workflow
- Admin SSO monitoring and alerts

</decisions>

<specifics>
## Specific Ideas

- SSO failure handling should include detailed error categorization with appropriate user messages
- JIT provisioning should include security guardrails blocking dangerous roles
- IdP group-to-role mapping enables enterprise customers to manage permissions from their IdP
- MFA reset should have both self-service (recovery codes) AND admin override paths

</specifics>

<deferred>
## Deferred Ideas

- **Free tier self-service signup** - Separate capability from enterprise SSO, needs its own flow
- **Sandbox/demo access for prospects** - Being handled by Phase 2 demo tenant

</deferred>

---

*Phase: 03-authentication-sso*
*Context gathered: 2026-02-03*
