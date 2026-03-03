# Silent Failure Audit Report

**Project:** Ethico Risk Intelligence Platform
**Audit Date:** 2026-02-13
**Auditor:** Claude Opus 4 (Automated Static Analysis)
**Scope:** All TypeScript/JavaScript source code in `apps/backend/src` and `apps/frontend/src`

---

## Executive Summary

This audit identified **20 silent failure patterns** across the Ethico Risk Intelligence Platform codebase. These are code locations where errors are suppressed, swallowed, or inadequately reported, leading to failures that are invisible to users, developers, or monitoring systems.

The most dangerous finding is a **tenant data isolation vulnerability** (Finding 4) where a database failure during RLS bypass cleanup could leave a connection in an unscoped state, potentially leaking data across tenants. Several other findings involve **storage initialization failures that are logged but not thrown** (Findings 2 and 3), creating services that appear healthy but silently fail on every operation.

---

## Summary Table

| #   | Title                                                                            | Severity | File                                                                | Lines               |
| --- | -------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------- | ------------------- |
| 1   | HttpExceptionFilter silently drops non-Error exceptions without logging          | CRITICAL | `apps/backend/src/common/filters/http-exception.filter.ts`          | 70-74               |
| 2   | LocalStorageAdapter.ensureBaseDirectoryExists() catches and continues on failure | CRITICAL | `apps/backend/src/common/services/local-storage.adapter.ts`         | 192-201             |
| 3   | AzureBlobProvider.onModuleInit() silently enters non-functional state            | CRITICAL | `apps/backend/src/modules/storage/providers/azure-blob.provider.ts` | 57-81               |
| 4   | PrismaService.withBypassRLS() can leave RLS permanently disabled                 | CRITICAL | `apps/backend/src/modules/prisma/prisma.service.ts`                 | 53-60               |
| 5   | AuditService.log() swallows all errors with no alerting mechanism                | HIGH     | `apps/backend/src/modules/audit/audit.service.ts`                   | 52-83               |
| 6   | Auth context logout methods swallow all errors without logging                   | HIGH     | `apps/frontend/src/contexts/auth-context.tsx`                       | 64-96               |
| 7   | Multiple bare catch blocks in file cleanup operations                            | HIGH     | `apps/backend/src/common/services/local-storage.adapter.ts`         | 82-84, 312-314      |
| 8   | Attachment deletion proceeds after storage failure, creating orphans             | HIGH     | `apps/backend/src/modules/attachments/attachments.service.ts`       | 379-393             |
| 9   | Offline DB decryption failure silently returns empty data                        | HIGH     | `apps/frontend/src/lib/ethics-offline-db.ts`                        | 204-222             |
| 10  | Auth storage getUser() silently returns null on parse failure                    | HIGH     | `apps/frontend/src/lib/auth-storage.ts`                             | 37-41               |
| 11  | ProviderRegistryService.tryGetProvider() swallows all errors                     | HIGH     | `apps/backend/src/modules/ai/services/provider-registry.service.ts` | 111-117             |
| 12  | useAutoSaveDraft init failure silently disables offline features                 | MEDIUM   | `apps/frontend/src/hooks/useAutoSaveDraft.ts`                       | 100-123             |
| 13  | Device encryption key read failure silently regenerates key                      | MEDIUM   | `apps/frontend/src/lib/ethics-offline-db.ts`                        | 81-88               |
| 14  | Operator API uses `error: any` type, disabling type safety                       | MEDIUM   | `apps/frontend/src/services/operator-api.ts`                        | 35                  |
| 15  | Tenant branding and portal config hooks silently fall back to defaults           | MEDIUM   | `apps/frontend/src/hooks/useTenantBranding.ts`                      | 82-87               |
| 16  | localStorage draft operations only log to console on failure                     | MEDIUM   | `apps/frontend/src/hooks/use-draft.ts`                              | 25-27, 39-41, 53-55 |
| 17  | Multiple frontend components use console.error with no user feedback             | MEDIUM   | Multiple frontend component files                                   | Various             |
| 18  | CaseAuditHandler async event handlers have no error boundary                     | MEDIUM   | `apps/backend/src/modules/audit/handlers/case-audit.handler.ts`     | 34-63               |
| 19  | StorageService event emission catches sync errors but misses async               | MEDIUM   | `apps/backend/src/modules/storage/storage.service.ts`               | 150-166             |
| 20  | PrismaService.$connect() has no retry or diagnostic logging                      | MEDIUM   | `apps/backend/src/modules/prisma/prisma.service.ts`                 | 9-11                |

**Totals:** 4 CRITICAL, 7 HIGH, 9 MEDIUM

---

## Detailed Findings

---

### Finding 1: HttpExceptionFilter silently drops non-Error exceptions without logging

**Severity:** CRITICAL

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\backend\src\common\filters\http-exception.filter.ts`, lines 70-74

**Problematic Code:**

```typescript
// Line 60: the Error branch DOES log
} else if (exception instanceof Error) {
  status = HttpStatus.INTERNAL_SERVER_ERROR;
  message = "Internal server error";
  error = "Internal Server Error";

  // Log the full error for debugging (but don't expose to client)
  this.logger.error(
    `Unhandled exception: ${exception.message}`,
    exception.stack,
  );
// Line 70: the non-Error branch does NOT log
} else {
  status = HttpStatus.INTERNAL_SERVER_ERROR;
  message = "Internal server error";
  error = "Internal Server Error";
}
```

**What errors could be hidden:**

- Thrown string literals (e.g., `throw "database timeout"`)
- Thrown plain objects (e.g., `throw { code: 'ECONNREFUSED' }`)
- Thrown numbers or booleans
- Rejected Promises with non-Error payloads
- Third-party library exceptions that do not extend the native `Error` class

**How users are affected:**

Developers see a generic "Internal server error" response in production with absolutely no corresponding log entry. The actual exception value is permanently lost. Debugging requires reproducing the issue from scratch because there is no log trail to follow.

**Recommended Fix:**

```typescript
} else {
  status = HttpStatus.INTERNAL_SERVER_ERROR;
  message = "Internal server error";
  error = "Internal Server Error";

  // CRITICAL: Log the actual exception value - without this, the error is permanently lost
  this.logger.error(
    `Unhandled non-Error exception: ${typeof exception === 'object' ? JSON.stringify(exception) : String(exception)}`,
  );
}
```

---

### Finding 2: LocalStorageAdapter.ensureBaseDirectoryExists() catches and continues on failure

**Severity:** CRITICAL

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\backend\src\common\services\local-storage.adapter.ts`, lines 192-201

**Problematic Code:**

```typescript
private ensureBaseDirectoryExists(): void {
  try {
    fsSync.mkdirSync(this.basePath, { recursive: true });
    this.logger.log(`Storage base path initialized: ${this.basePath}`);
  } catch (error) {
    this.logger.error(
      `Failed to create storage directory: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    // NOTE: Execution continues - service is "initialized" in a broken state
  }
}
```

**What errors could be hidden:**

- EACCES (permission denied on the filesystem)
- ENOSPC (disk full)
- EROFS (read-only filesystem in a containerized deployment)
- ENAMETOOLONG (basePath exceeds OS limits)

All subsequent `upload()`, `download()`, and `delete()` calls will fail with misleading errors about individual files, completely disconnected from the real problem.

**How users are affected:**

Every file upload fails in production. Developers spend hours debugging individual upload failures when the root cause was a single directory creation failure buried in startup logs. The service reports itself as healthy to health checks.

**Recommended Fix:**

```typescript
private ensureBaseDirectoryExists(): void {
  try {
    fsSync.mkdirSync(this.basePath, { recursive: true });
    this.logger.log(`Storage base path initialized: ${this.basePath}`);
  } catch (error) {
    const msg = `FATAL: Cannot create storage directory '${this.basePath}': ${error instanceof Error ? error.message : "Unknown error"}`;
    this.logger.error(msg);
    throw new Error(msg); // Fail fast - do not initialize a broken service
  }
}
```

---

### Finding 3: AzureBlobProvider.onModuleInit() silently enters non-functional state

**Severity:** CRITICAL

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\backend\src\modules\storage\providers\azure-blob.provider.ts`, lines 57-81

**Problematic Code:**

```typescript
onModuleInit(): void {
  const accountName = this.configService.get<string>("storage.azure.accountName");
  const accountKey = this.configService.get<string>("storage.azure.accountKey");

  if (!accountName || !accountKey) {
    this.logger.warn(
      "Azure Storage credentials not configured - provider will not be functional",
    );
    return; // Silent failure #1: continues with isInitialized = false
  }

  try {
    this.sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    this.blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      this.sharedKeyCredential,
    );
    this.isInitialized = true;
  } catch (error) {
    this.logger.error(
      `Failed to initialize Azure Blob Storage: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    // Silent failure #2: continues with isInitialized = false
  }
}
```

**What errors could be hidden:**

- Invalid or expired Azure credentials (credential rotation failure)
- DNS resolution failure for `blob.core.windows.net`
- Network connectivity issues to Azure
- Malformed account name or key format

**How users are affected:**

In production, if Azure credentials expire or rotate, the provider silently enters a non-functional state. All subsequent storage operations fail with `"Azure Blob Storage is not initialized. Check configuration."` -- a generic message that does not explain WHY it is not initialized or what the operator should check. The credential issue is only visible in startup logs, which may have rotated out by the time someone investigates.

**Recommended Fix:**

```typescript
onModuleInit(): void {
  const accountName = this.configService.get<string>("storage.azure.accountName");
  const accountKey = this.configService.get<string>("storage.azure.accountKey");

  if (!accountName || !accountKey) {
    const missing = !accountName ? 'storage.azure.accountName' : 'storage.azure.accountKey';
    this.logger.error(
      `FATAL: Azure Storage configuration missing: ${missing}. File storage will not work.`,
    );
    throw new Error(`Azure Storage configuration missing: ${missing}`);
  }

  try {
    this.sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    this.blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      this.sharedKeyCredential,
    );
    this.isInitialized = true;
    this.logger.log(`Azure Blob Storage provider initialized (account: ${accountName})`);
  } catch (error) {
    this.logger.error(
      `FATAL: Azure Blob Storage initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error; // Propagate - do not start with broken storage
  }
}
```

---

### Finding 4: PrismaService.withBypassRLS() can leave RLS permanently disabled

**Severity:** CRITICAL

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\backend\src\modules\prisma\prisma.service.ts`, lines 53-60

**Problematic Code:**

```typescript
async withBypassRLS<T>(callback: () => Promise<T>): Promise<T> {
  await this.enableBypassRLS();
  try {
    return await callback();
  } finally {
    await this.disableBypassRLS();
  }
}
```

**What errors could be hidden:**

- If `disableBypassRLS()` fails (database connection dropped, transaction timeout, connection pool exhaustion), the `finally` block throws, but the PostgreSQL session variable `app.bypass_rls` remains set to `'true'`.
- If the underlying database connection is returned to Prisma's connection pool while still in bypass mode, subsequent requests using that connection will bypass Row-Level Security entirely.
- The original error from the callback (if any) is masked by the error from `disableBypassRLS()`.

**How users are affected:**

This is a **multi-tenant data isolation vulnerability**. A compliance officer from Organization A could see cases, investigations, and attachments belonging to Organization B. In a healthcare compliance platform, this could constitute a HIPAA violation or breach of confidentiality.

**Recommended Fix:**

```typescript
async withBypassRLS<T>(callback: () => Promise<T>): Promise<T> {
  await this.enableBypassRLS();
  try {
    return await callback();
  } finally {
    try {
      await this.disableBypassRLS();
    } catch (disableError) {
      // SECURITY CRITICAL: RLS bypass is stuck on for this connection.
      // The connection MUST be destroyed, not returned to the pool.
      const logger = new Logger('PrismaService');
      logger.error(
        'SECURITY: Failed to disable RLS bypass. Destroying database connection to prevent cross-tenant data leakage.',
        disableError instanceof Error ? disableError.stack : String(disableError),
      );
      await this.$disconnect();
      throw disableError;
    }
  }
}
```

---

### Finding 5: AuditService.log() swallows all errors with no alerting mechanism

**Severity:** HIGH

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\backend\src\modules\audit\audit.service.ts`, lines 52-83

**Problematic Code:**

```typescript
async log(dto: CreateAuditLogDto): Promise<void> {
  try {
    await this.prisma.auditLog.create({
      data: { /* ... audit entry fields ... */ },
    });

    this.logger.debug(`Audit log created: ${dto.entityType}/${dto.entityId} - ${dto.action}`);
  } catch (error) {
    // Log error but don't throw - audit failures shouldn't break operations
    this.logger.error(
      `Failed to create audit log: ${error instanceof Error ? error.message : "Unknown error"}`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
```

**What errors could be hidden:**

- Database connection failures (silently dropping audit entries)
- Schema drift on the `auditLog` table after a migration
- Disk full conditions on the database server
- JSON serialization errors on the `changes` or `context` fields
- Prisma unique constraint violations

**How users are affected:**

For a compliance platform, audit trail completeness is a regulatory requirement. If audit logging silently fails (for example, because the database connection pool is exhausted), no one is alerted. Compliance officers rely on the audit trail being complete. Gaps in the audit trail could constitute a regulatory violation during an audit or investigation.

**Recommended Fix:**

```typescript
private auditFailureCount = 0;

async log(dto: CreateAuditLogDto): Promise<void> {
  try {
    await this.prisma.auditLog.create({
      data: { /* ... */ },
    });
    this.auditFailureCount = 0; // Reset on success
  } catch (error) {
    this.auditFailureCount++;
    this.logger.error(
      `AUDIT_WRITE_FAILURE [count=${this.auditFailureCount}] for ${dto.entityType}/${dto.entityId} action=${dto.action}: ${error instanceof Error ? error.message : "Unknown error"}`,
      error instanceof Error ? error.stack : undefined,
    );

    // Escalate if failures are sustained
    if (this.auditFailureCount >= 5) {
      this.logger.error(
        `ALERT: ${this.auditFailureCount} consecutive audit write failures. Audit trail integrity compromised.`,
      );
      // TODO: Emit metric for monitoring/alerting (e.g., Sentry, Statsig)
    }
  }
}
```

---

### Finding 6: Auth context logout methods swallow all errors without logging

**Severity:** HIGH

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\frontend\src\contexts\auth-context.tsx`, lines 64-79 (logout) and lines 81-96 (logoutAll)

**Problematic Code:**

```typescript
const logout = useCallback(async () => {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // Ignore errors - we're logging out anyway
  } finally {
    authStorage.clearAll();
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }
}, []);
```

**What errors could be hidden:**

- Server-side session NOT being invalidated (the POST to `/auth/logout` failed, so the server session token remains valid and usable by an attacker)
- CORS configuration errors on the backend
- Network failures indicating broader connectivity issues
- 500 errors indicating the auth service is down

**How users are affected:**

A user clicks "Logout" and sees the login page, believing their session is terminated. However, if the server-side logout call failed, their access token and refresh token remain valid on the server. If those tokens were intercepted (XSS, network sniffing), an attacker can continue using them indefinitely.

**Recommended Fix:**

```typescript
const logout = useCallback(async () => {
  try {
    await apiClient.post("/auth/logout");
  } catch (error) {
    // Log the failure - the user's server-side session may still be active
    console.error(
      "Failed to invalidate server session during logout. Token may still be valid:",
      error,
    );
    // In a production app, consider showing the user a warning
  } finally {
    authStorage.clearAll();
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }
}, []);
```

---

### Finding 7: Multiple bare catch blocks in file cleanup operations

**Severity:** HIGH

**Location:**

- `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\backend\src\common\services\local-storage.adapter.ts`, lines 82-84 and 312-314
- `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\backend\src\modules\storage\providers\local-storage.provider.ts`, lines 149-151 and 217-219

**Problematic Code (local-storage.adapter.ts, line 82):**

```typescript
// Clean up temp file
await fs.unlink(file.path).catch(() => {
  // Ignore errors on cleanup
});
```

**Problematic Code (local-storage.adapter.ts, line 312):**

```typescript
} catch {
  // Ignore errors during cleanup
}
```

**Problematic Code (local-storage.provider.ts, line 149):**

```typescript
await fs.unlink(`${fullPath}.meta.json`).catch(() => {
  // Ignore if metadata file doesn't exist
});
```

**Problematic Code (local-storage.provider.ts, line 217):**

```typescript
} catch {
  // Ignore errors during cleanup
}
```

**What errors could be hidden:**

- EACCES (permission denied -- indicates a security misconfiguration)
- EIO (hardware I/O failure)
- EBUSY (file locked by another process, e.g., antivirus scanner)
- EPERM (operation not permitted)
- ENOMEM (out of memory)

The comments say "ignore if file doesn't exist," but the catch block catches ALL errors, not just ENOENT (file not found).

**How users are affected:**

Temp files and orphaned directories accumulate silently until disk fills up. Permission issues that indicate security misconfigurations go undetected. Hardware failures in the storage subsystem are masked.

**Recommended Fix:**

```typescript
// Clean up temp file - only ignore "file not found" errors
await fs.unlink(file.path).catch((err) => {
  if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
    this.logger.warn(
      `Failed to clean up temp file ${file.path}: ${err.message}`,
    );
  }
});
```

```typescript
} catch (error) {
  // Only ignore "not found" or "not empty" during cleanup
  const code = (error as NodeJS.ErrnoException).code;
  if (code !== 'ENOENT' && code !== 'ENOTEMPTY') {
    this.logger.warn(`Unexpected error during directory cleanup: ${(error as Error).message}`);
  }
}
```

---

### Finding 8: Attachment deletion proceeds after storage failure, creating orphans

**Severity:** HIGH

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\backend\src\modules\attachments\attachments.service.ts`, lines 379-393

**Problematic Code:**

```typescript
// 2. Delete file from storage
try {
  await this.storageService.delete(attachment.fileKey);
} catch (error) {
  // Log but don't fail - file might already be deleted
  this.logger.warn(
    `Failed to delete file from storage: ${attachment.fileKey}`,
    error,
  );
}

// 3. Delete attachment record
await this.prisma.attachment.delete({
  where: { id },
});
```

The same pattern appears in `apps/backend/src/modules/storage/storage.service.ts` at lines 234-250.

**What errors could be hidden:**

- Azure Blob Storage permission changes (access policy revoked)
- Network timeouts to Azure
- Azure storage account throttling (429 errors)
- Storage container access policy changes

All are treated identically to "file already deleted" when they have fundamentally different implications.

**How users are affected:**

When storage deletion fails for reasons other than "file already deleted," the database record is still deleted. This creates an orphaned file in cloud storage that:

1. Is no longer tracked by the database and cannot be found or deleted via the application
2. Continues consuming storage and incurring costs
3. May contain sensitive investigation evidence that should have been deleted per data retention policies
4. Cannot be discovered by any cleanup job because the database reference is gone

**Recommended Fix:**

```typescript
// 2. Delete file from storage
try {
  await this.storageService.delete(attachment.fileKey);
} catch (error) {
  // Only proceed if the file was already missing
  if (error instanceof NotFoundException) {
    this.logger.debug(`Storage file already gone: ${attachment.fileKey}`);
  } else {
    // Do NOT delete the DB record if storage deletion actually failed
    this.logger.error(
      `Failed to delete file from storage, aborting attachment deletion: ${attachment.fileKey}`,
      error,
    );
    throw error;
  }
}

// 3. Delete attachment record (only reached if storage delete succeeded or file was already gone)
await this.prisma.attachment.delete({
  where: { id },
});
```

---

### Finding 9: Offline DB decryption failure silently returns empty data

**Severity:** HIGH

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\frontend\src\lib\ethics-offline-db.ts`, lines 204-222

**Problematic Code:**

```typescript
decryptDraft(draft: ReportDraft): ReportDraft {
  if (!this.encryptionKey) {
    throw new Error('Encryption not initialized. Call initEncryption() first.');
  }

  try {
    return {
      ...draft,
      content: JSON.parse(
        decryptValue(draft.content as unknown as string, this.encryptionKey)
      ),
      attachments: JSON.parse(
        decryptValue(draft.attachments as unknown as string, this.encryptionKey)
      ),
    };
  } catch {
    // If decryption fails, return empty content (key may have changed)
    return {
      ...draft,
      content: {},
      attachments: [],
    };
  }
}
```

**What errors could be hidden:**

- Device encryption key was regenerated (due to localStorage corruption, Finding 13)
- Encrypted data was corrupted in IndexedDB
- Base64 decode failures on corrupted ciphertext
- JSON parse failures on corrupted decrypted text

**How users are affected:**

A reporter spends time filling out an ethics/whistleblower complaint, closes the browser, and returns later. Their entire report content is silently replaced with an empty object `{}` and empty attachments array `[]`. No error is shown. No indication of data loss. The reporter may assume they never started a draft, or worse, may give up and not re-file.

**Recommended Fix:**

```typescript
} catch (decryptError) {
  console.error(
    'Draft decryption failed. The device encryption key may have changed. Draft data is unrecoverable:',
    decryptError,
  );
  return {
    ...draft,
    content: { _decryptionFailed: true, _error: 'Unable to decrypt saved draft. Your previous data could not be recovered.' },
    attachments: [],
  };
}
```

The consuming component should check for `_decryptionFailed` and display an appropriate message to the user.

---

### Finding 10: Auth storage getUser() silently returns null on parse failure

**Severity:** HIGH

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\frontend\src\lib\auth-storage.ts`, lines 37-41

**Problematic Code:**

```typescript
getUser<T>(): T | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(TOKEN_KEYS.USER);
  if (!user) return null;
  try {
    return JSON.parse(user) as T;
  } catch {
    return null;
  }
},
```

**What errors could be hidden:**

- Corrupted localStorage data (browser extension interference, storage quota issues)
- Malicious data injected via XSS into localStorage
- Encoding issues from concurrent tab writes

**How users are affected:**

The caller in `auth-context.tsx` (line 30) treats `null` as "user not authenticated" and does not set `isAuthenticated: true`. The user is silently logged out with no error message and no explanation. If this happens sporadically due to a browser extension corrupting localStorage, the user experiences random logouts they cannot explain or report.

**Recommended Fix:**

```typescript
getUser<T>(): T | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(TOKEN_KEYS.USER);
  if (!user) return null;
  try {
    return JSON.parse(user) as T;
  } catch (error) {
    console.error(
      'Corrupted user data in localStorage. Clearing invalid value:',
      error,
    );
    localStorage.removeItem(TOKEN_KEYS.USER);
    return null;
  }
},
```

---

### Finding 11: ProviderRegistryService.tryGetProvider() swallows all errors

**Severity:** HIGH

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\backend\src\modules\ai\services\provider-registry.service.ts`, lines 111-117

**Problematic Code:**

```typescript
tryGetProvider(name?: string): AIProvider | null {
  try {
    return this.getProvider(name);
  } catch {
    return null;
  }
}
```

**What errors could be hidden:**

- Provider not found (could indicate a misconfigured `AI_DEFAULT_PROVIDER` env var)
- Provider not ready (could indicate an expired API key for Claude or Azure OpenAI)
- Runtime errors in the provider's `isReady()` method
- Configuration errors that are fixable with operator action

**How users are affected:**

All AI features (case summarization, note cleanup, translation, auto-categorization) silently degrade to "unavailable" in production. No one is alerted that the AI provider failed. The caller receives `null` with no distinction between "AI intentionally not configured" and "AI provider crashed."

**Recommended Fix:**

```typescript
tryGetProvider(name?: string): AIProvider | null {
  try {
    return this.getProvider(name);
  } catch (error) {
    this.logger.warn(
      `AI provider '${name || this.defaultProviderName}' unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return null;
  }
}
```

---

### Finding 12: useAutoSaveDraft init failure silently disables offline features

**Severity:** MEDIUM

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\frontend\src\hooks\useAutoSaveDraft.ts`, lines 100-123

**Problematic Code:**

```typescript
useEffect(() => {
  let mounted = true;

  async function init() {
    try {
      await db.initEncryption();
      await cleanupExpiredDrafts();
      if (mounted) {
        setIsReady(true);
      }
    } catch (error) {
      console.error("Failed to initialize offline database:", error);
      // NOTE: isReady remains false, but no error state is set
    }
  }

  init();

  return () => {
    mounted = false; /* ... */
  };
}, []);
```

**What errors could be hidden:**

- IndexedDB not available (private/incognito browsing mode)
- Storage quota exceeded
- IndexedDB database corrupted and needs deletion
- Browser security policy blocking IndexedDB access

**How users are affected:**

When `isReady` stays `false`, the `saveDraft` method silently rejects, `loadDraft` silently returns `null`, and all other methods (`markPending`, `markSynced`, `markFailed`) silently do nothing. The user has no visible indication that auto-save is disabled. They may navigate away from the ethics reporting form and lose their entire report.

**Recommended Fix:**

Add an `initError` state to the hook's return value and display it in the consuming component:

```typescript
const [initError, setInitError] = useState<Error | null>(null);

async function init() {
  try {
    await db.initEncryption();
    await cleanupExpiredDrafts();
    if (mounted) setIsReady(true);
  } catch (error) {
    console.error('Failed to initialize offline database:', error);
    if (mounted) {
      setInitError(error instanceof Error ? error : new Error('Offline storage unavailable'));
    }
  }
}

// Return initError in the hook result
return { /* ... existing fields ... */, initError };
```

---

### Finding 13: Device encryption key read failure silently regenerates key

**Severity:** MEDIUM

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\frontend\src\lib\ethics-offline-db.ts`, lines 81-88

**Problematic Code:**

```typescript
try {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    return new Uint8Array(JSON.parse(stored));
  }
} catch {
  // If localStorage read fails, generate new key
}
```

**What errors could be hidden:**

- Corrupted JSON in localStorage (the stored key value is not valid JSON)
- localStorage access denied by browser security policy
- Invalid array data that cannot be converted to Uint8Array

**How users are affected:**

When the read catch fires, a new encryption key is silently generated. This means ALL previously encrypted drafts in IndexedDB become permanently unrecoverable. Combined with Finding 9 (decryptDraft silently returning empty data), the user's saved ethics reports silently vanish. The bare `catch` block does not even log the failure.

**Recommended Fix:**

```typescript
try {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    return new Uint8Array(JSON.parse(stored));
  }
} catch (error) {
  console.error(
    "Failed to read device encryption key from localStorage. A new key will be generated, and existing encrypted drafts will be unrecoverable:",
    error,
  );
}
```

---

### Finding 14: Operator API uses `error: any` type, disabling type safety

**Severity:** MEDIUM

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\frontend\src\services\operator-api.ts`, line 35

**Problematic Code:**

```typescript
} catch (error: any) {
  // 404 means not found - return null instead of throwing
  if (error?.response?.status === 404) {
    return null;
  }
  throw error;
}
```

The same pattern appears in `apps/frontend/src/hooks/useTeamMembers.ts` at lines 44 and 104.

**What errors could be hidden:**

The `any` type itself does not hide errors per se, but it disables TypeScript's type checking, meaning future refactors could accidentally break the error handling without the compiler catching it. For example, if Axios is replaced with `fetch`, the error structure changes entirely (`response` becomes unavailable), and TypeScript would not flag this.

**How users are affected:**

The current code works correctly. However, the use of `any` creates fragility -- a future refactor could introduce a silent failure that TypeScript would otherwise catch at compile time.

**Recommended Fix:**

```typescript
import axios from 'axios';

} catch (error) {
  // 404 means not found - return null instead of throwing
  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return null;
  }
  throw error;
}
```

---

### Finding 15: Tenant branding and portal config hooks silently fall back to defaults

**Severity:** MEDIUM

**Location:**

- `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\frontend\src\hooks\useTenantBranding.ts`, lines 82-87
- `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\frontend\src\hooks\useEthicsPortalConfig.ts`, lines 81-86

**Problematic Code (useTenantBranding.ts):**

```typescript
} catch (err) {
  const fetchError = err instanceof Error ? err : new Error('Unknown error fetching branding');
  setError(fetchError);
  // Fall back to default branding on error
  const defaultBranding = getDefaultBranding(tenantSlug);
  setBranding(defaultBranding);
}
```

**What errors could be hidden:**

- CORS misconfiguration between frontend and backend
- Backend service outage
- DNS resolution failures
- Network connectivity issues

The error IS stored in state (which is good), but the branding is also set to a default value. If the consuming component only checks `isLoading` and `branding` (and not `error`), it will render default Ethico branding without any indication of failure.

**How users are affected:**

A paying customer who configured custom branding sees generic Ethico branding instead of their own logo and colors. They may not realize anything is wrong and may not report it. Whether this is actually surfaced depends on whether the consuming component checks the `error` state.

**Recommended Fix:**

Ensure consuming components check the `error` state. In the hook itself, add a `console.warn`:

```typescript
} catch (err) {
  const fetchError = err instanceof Error ? err : new Error('Unknown error fetching branding');
  console.warn(`Branding fetch failed for tenant '${tenantSlug}', using defaults:`, fetchError.message);
  setError(fetchError);
  const defaultBranding = getDefaultBranding(tenantSlug);
  setBranding(defaultBranding);
}
```

---

### Finding 16: localStorage draft operations only log to console on failure

**Severity:** MEDIUM

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\frontend\src\hooks\use-draft.ts`, lines 25-27, 39-41, 53-55

**Problematic Code:**

```typescript
// Load draft from localStorage on mount (line 25)
} catch (error) {
  console.warn('Failed to load draft from localStorage:', error);
}

// Save draft to localStorage (line 39)
} catch (error) {
  console.warn('Failed to save draft to localStorage:', error);
}

// Clear draft from localStorage (line 53)
} catch (error) {
  console.warn('Failed to clear draft from localStorage:', error);
}
```

The same pattern exists across `useAutoSaveDraft.ts` at lines 200-204, 231-233, 257-259, 275-277, 288-290, 301-303, and 314-316.

**What errors could be hidden:**

- localStorage quota exceeded (QuotaExceededError)
- localStorage blocked in incognito/private browsing
- SecurityError from cross-origin iframe access

**How users are affected:**

The user types investigation notes, expects them to be auto-saved, navigates away, and returns to find their work lost. The `console.warn` is invisible in production unless the user has devtools open. The `saveDraft` function updates the React state (`setDraft(content)`) even in the catch path on line 38, so the in-memory state is correct but the persistent save failed -- a particularly insidious inconsistency.

**Recommended Fix:**

Return success/failure information from save operations:

```typescript
const saveDraft = useCallback(
  (content: string): { saved: boolean; error?: string } => {
    if (storageKey && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, content);
        setDraft(content);
        return { saved: true };
      } catch (error) {
        console.warn("Failed to save draft to localStorage:", error);
        setDraft(content); // Still update in-memory state
        return {
          saved: false,
          error: error instanceof Error ? error.message : "Storage unavailable",
        };
      }
    }
    return { saved: false, error: "No storage key" };
  },
  [storageKey],
);
```

---

### Finding 17: Multiple frontend components use console.error with no user feedback

**Severity:** MEDIUM

**Location:** 30+ instances across frontend components, including but not limited to:

- `apps/frontend/src/components/campaigns/SegmentBuilder.tsx`
- `apps/frontend/src/components/campaigns/ScheduleConfig.tsx`
- `apps/frontend/src/components/cases/case-investigations-panel.tsx`
- `apps/frontend/src/components/cases/connected-documents-card.tsx`
- `apps/frontend/src/components/cases/create-task-modal.tsx`
- `apps/frontend/src/components/dashboard/my-tasks.tsx`
- `apps/frontend/src/components/cases/connected-people-card.tsx`

**Problematic Pattern:**

```typescript
try {
  const data = await apiClient.get<SomeType>("/api/endpoint");
  setState(data);
} catch (error) {
  console.error("Failed to fetch data:", error);
  // No user-visible feedback, no error state set
}
```

**What errors could be hidden:**

All API errors (network failures, 500s, timeouts) are logged only to the browser console. Users see loading spinners that never resolve, empty panels, or stale data.

**How users are affected:**

A compliance officer checking investigation tasks sees an empty task list instead of an error message. They may assume there are no tasks, when in reality the API call failed. This could delay time-sensitive investigations.

**Recommended Fix:**

Implement a consistent error handling pattern across all data-fetching components. Use an application-wide toast notification system or set component-level error state:

```typescript
const [error, setError] = useState<string | null>(null);

try {
  const data = await apiClient.get<SomeType>("/api/endpoint");
  setState(data);
  setError(null);
} catch (err) {
  console.error("Failed to fetch data:", err);
  setError("Unable to load data. Please try again.");
  // Or: toast.error('Unable to load investigation tasks');
}
```

---

### Finding 18: CaseAuditHandler async event handlers have no error boundary

**Severity:** MEDIUM

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\backend\src\modules\audit\handlers\case-audit.handler.ts`, lines 34-63

**Problematic Code:**

```typescript
@OnEvent("case.created", { async: true })
async handleCaseCreated(event: CaseCreatedEvent): Promise<void> {
  this.logger.debug(`Handling case.created event for ${event.caseId}`);

  const description =
    await this.descriptionService.buildCaseCreatedDescription({ /* ... */ });

  await this.auditService.log({ /* ... */ });
}
```

The same pattern repeats for `case.updated` (line 65), `case.status_changed` (line 89), and `case.assigned` (line 118).

**What errors could be hidden:**

- The `{ async: true }` flag means these handlers run fire-and-forget. Errors do NOT propagate back to the caller.
- If `this.descriptionService.buildCaseCreatedDescription()` throws (for example, user lookup fails), the error is handled by EventEmitter2's default error handler, which may or may not be configured.
- While `this.auditService.log()` already catches its own errors (Finding 5), the description building step has no error protection.

**How users are affected:**

Audit entries are silently dropped when description building fails. This creates gaps in the compliance audit trail that are invisible to administrators.

**Recommended Fix:**

Wrap each handler body in try-catch:

```typescript
@OnEvent("case.created", { async: true })
async handleCaseCreated(event: CaseCreatedEvent): Promise<void> {
  try {
    this.logger.debug(`Handling case.created event for ${event.caseId}`);

    const description =
      await this.descriptionService.buildCaseCreatedDescription({ /* ... */ });

    await this.auditService.log({ /* ... */ });
  } catch (error) {
    this.logger.error(
      `Failed to handle case.created audit event for case ${event.caseId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
```

---

### Finding 19: StorageService event emission catches sync errors but misses async

**Severity:** MEDIUM

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\backend\src\modules\storage\storage.service.ts`, lines 150-166

**Problematic Code:**

```typescript
// Emit event for searchable documents (fire-and-forget)
if (this.documentProcessing.isExtractable(params.contentType)) {
  try {
    this.eventEmitter.emit("file.uploaded", {
      organizationId: params.organizationId,
      attachmentId: attachment.id,
      fileKey: fileKey,
      contentType: params.contentType,
      fileName: params.fileName,
    });
  } catch (error) {
    // Don't fail upload if event emission fails
    this.logger.warn(
      `Failed to emit file.uploaded event for ${attachment.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
```

**What errors could be hidden:**

- `EventEmitter2.emit()` is synchronous. The try-catch only catches synchronous errors thrown by event handlers.
- If the event handler is async (which is likely, given it processes documents), its rejection will be an unhandled promise rejection, bypassing this try-catch entirely.
- The comment says "fire-and-forget" but the error handling is only partial.

**How users are affected:**

Document text extraction for search indexing silently fails. Uploaded documents are not searchable via the platform's full-text search. Users searching for content within uploaded files get no results and have no way to know the indexing pipeline is broken.

**Recommended Fix:**

Use `emitAsync` if handlers are async, or explicitly acknowledge the fire-and-forget semantics:

```typescript
if (this.documentProcessing.isExtractable(params.contentType)) {
  // Fire-and-forget: use emitAsync and catch to prevent unhandled rejections
  this.eventEmitter
    .emitAsync("file.uploaded", {
      organizationId: params.organizationId,
      attachmentId: attachment.id,
      fileKey: fileKey,
      contentType: params.contentType,
      fileName: params.fileName,
    })
    .catch((error) => {
      this.logger.warn(
        `file.uploaded event handler failed for ${attachment.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    });
}
```

---

### Finding 20: PrismaService.$connect() has no retry or diagnostic logging

**Severity:** MEDIUM

**Location:** `C:\Users\cu0718\Documents\Claude Code Projects\Risk Intelligence Platform\apps\backend\src\modules\prisma\prisma.service.ts`, lines 9-11

**Problematic Code:**

```typescript
async onModuleInit() {
  await this.$connect();
}
```

**What errors could be hidden:**

While `$connect()` will throw on failure (which is correct -- fail fast), there is:

- No retry logic for transient connection failures (common in containerized deployments where the database may start slightly after the application)
- No logging of which database host/port is being connected to (helpful for debugging DNS/networking issues)
- No graceful error message explaining what went wrong

**How users are affected:**

In containerized deployments (Docker Compose, Kubernetes), the application and database may start concurrently. If the database takes a few extra seconds to accept connections, the application crashes immediately with an opaque Prisma connection error. The operator must restart the container manually.

**Recommended Fix:**

```typescript
private readonly logger = new Logger(PrismaService.name);

async onModuleInit() {
  const maxRetries = 3;
  const retryDelayMs = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
      return;
    } catch (error) {
      this.logger.error(
        `Database connection attempt ${attempt}/${maxRetries} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to connect to database after ${maxRetries} attempts. Check DATABASE_URL and ensure the database is running.`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
    }
  }
}
```

---

## Recommendations Summary

### Immediate Actions (CRITICAL findings)

1. **Finding 4 (RLS bypass):** Fix `withBypassRLS()` to destroy the database connection if `disableBypassRLS()` fails. This is a tenant data isolation security vulnerability.
2. **Finding 1 (exception filter):** Add logging to the non-Error `else` branch in the global exception filter.
3. **Findings 2 and 3 (storage init):** Change `ensureBaseDirectoryExists()` and `onModuleInit()` to throw on failure rather than continuing with a broken service.

### Short-Term Actions (HIGH findings)

4. **Finding 5 (audit service):** Add failure counting and alerting escalation to the audit service.
5. **Finding 6 (logout):** Add `console.error` logging to the logout catch blocks.
6. **Finding 7 (bare catch blocks):** Filter catch blocks by expected error codes (ENOENT, ENOTEMPTY).
7. **Finding 8 (orphaned files):** Only proceed with DB record deletion if storage deletion succeeded or the file was already missing.
8. **Finding 9 (decryption):** Surface decryption failures to the user interface instead of returning empty data.
9. **Finding 10 (auth storage):** Log and clean up corrupted localStorage data.
10. **Finding 11 (AI provider):** Log the reason the provider is unavailable before returning null.

### Medium-Term Actions (MEDIUM findings)

11. **Findings 12 and 13 (offline DB):** Surface initialization errors and key regeneration events to the UI.
12. **Finding 14 (`error: any`):** Replace `any` with proper typed error handling using `axios.isAxiosError()`.
13. **Finding 15 (silent fallbacks):** Ensure consuming components check the `error` state returned by hooks.
14. **Findings 16 and 17 (console-only logging):** Implement an application-wide toast notification system for user-visible error feedback.
15. **Finding 18 (event handlers):** Add try-catch to all async event handlers.
16. **Finding 19 (event emission):** Use `emitAsync` with `.catch()` for fire-and-forget async events.
17. **Finding 20 (database connection):** Add retry logic with exponential backoff.
