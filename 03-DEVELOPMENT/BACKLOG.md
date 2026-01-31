# Feature Backlog

Future features and enhancements to be scheduled into upcoming slices.

---

## High Priority

### Per-Tenant File Storage Limits

**Added:** 2026-01-30
**Requested by:** Product (Nick)
**Business Case:** Enable tiered pricing based on storage limits. Clients pay more for higher limits.

**Requirements:**

1. **Schema Changes:**
   - Add `maxFileSize` (Int, default 10MB) to Organization model
   - Add `maxTotalStorage` (BigInt, optional) for total storage quota
   - Add `currentStorageUsed` (BigInt) to track usage
   - Add `allowedMimeTypes` (String[]) for per-tenant file type restrictions

2. **Backend Changes:**
   - Modify StorageService to check tenant limits instead of global config
   - Add storage usage tracking on upload/delete
   - Add API endpoint to check storage quota: `GET /api/v1/storage/quota`
   - Add warning when approaching limit (80%, 90%, 100%)

3. **Admin Features (Ethico Ops):**
   - UI to configure per-tenant limits
   - Dashboard showing storage usage by tenant
   - Alerts when tenants approach limits

4. **Client-Facing Features:**
   - Show storage usage in Settings
   - Clear error message when limit exceeded
   - Upgrade prompt when near limit

**Suggested Tiers:**

| Tier | Max File Size | Total Storage | Price Indicator |
|------|---------------|---------------|-----------------|
| Starter | 5 MB | 1 GB | $ |
| Standard | 10 MB | 10 GB | $$ |
| Professional | 25 MB | 50 GB | $$$ |
| Enterprise | 50 MB | Unlimited | $$$$ |

**Estimated Effort:** 1 slice (4-6 tasks)

**Dependencies:**
- Slice 1.8 (File Attachments) must be complete

---

## Medium Priority

*(Empty - add features as identified)*

---

## Low Priority

*(Empty - add features as identified)*

---

## Completed / Moved to Sprint

| Feature | Moved To | Date |
|---------|----------|------|
| *(none yet)* | | |
