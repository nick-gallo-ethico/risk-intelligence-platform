/**
 * E2E Test Setup
 *
 * Sets required environment variables BEFORE importing any modules.
 * This must be imported first in test files or set via Jest setupFilesAfterEnv.
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env file from backend directory
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("[E2E Setup] Loaded .env file");
}

// Set NODE_ENV to development for Azure AD http redirectUrl
process.env.NODE_ENV = "development";

// Set JWT secrets for test token generation (must be at least 32 chars)
process.env.JWT_SECRET = "test-jwt-secret-for-e2e-tests-only-minimum-32-chars";
process.env.JWT_REFRESH_SECRET =
  "test-jwt-refresh-secret-for-e2e-tests-min32ch";

// Set storage provider to local
process.env.STORAGE_PROVIDER = "local";

// Set local storage path - resolve to backend/uploads directory
const uploadsDir = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
process.env.LOCAL_STORAGE_PATH = uploadsDir;

// Log for debugging
console.log(`[E2E Setup] LOCAL_STORAGE_PATH set to: ${uploadsDir}`);

// Mock opossum circuit breaker for CommonJS/ESM interop
// The default import expects module.exports to have a default property
jest.mock("opossum", () => {
  const actualOpossum = jest.requireActual("opossum");
  return {
    __esModule: true,
    default: actualOpossum,
  };
});

// Export for explicit import
export const testUploadsDir = uploadsDir;
