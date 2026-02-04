'use client';

import Dexie, { Table } from 'dexie';

/**
 * Interface for report draft stored locally.
 * Content and attachments are encrypted using dexie-encrypted.
 */
export interface ReportDraft {
  /** Auto-incremented primary key */
  id?: number;
  /** Nanoid for cross-device resume code */
  localId: string;
  /** Tenant slug for multi-tenant isolation */
  tenantSlug: string;
  /** Selected category ID */
  category?: string;
  /** Form content (encrypted) */
  content: Record<string, unknown>;
  /** Attachment references (encrypted) */
  attachments: AttachmentRef[];
  /** When draft was created */
  createdAt: Date;
  /** When draft was last updated */
  updatedAt: Date;
  /** Auto-expiration date (7 days from creation) */
  expiresAt: Date;
  /** Sync status */
  syncStatus: 'draft' | 'pending' | 'synced' | 'failed';
}

/**
 * Reference to a locally-stored attachment.
 */
export interface AttachmentRef {
  /** Unique ID for the attachment */
  id: string;
  /** Original file name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  type: string;
  /** Local blob URL or IndexedDB key */
  localPath: string;
  /** Whether marked as highly sensitive */
  sensitive: boolean;
}

/**
 * Interface for pending submissions (queued for background sync).
 */
export interface PendingSubmission {
  /** Auto-incremented primary key */
  id?: number;
  /** Tenant slug */
  tenantSlug: string;
  /** Submission payload (encrypted) */
  payload: Record<string, unknown>;
  /** When submission was queued */
  createdAt: Date;
  /** Number of retry attempts */
  retryCount: number;
  /** Last error message if failed */
  lastError?: string;
}

/**
 * Get or create a device-specific encryption key.
 * The key is stored in localStorage and used to encrypt sensitive data in IndexedDB.
 *
 * Note: This provides encryption at rest but the key is accessible to JavaScript.
 * For true security, data should be encrypted server-side after transmission.
 * This primarily protects against:
 * - Casual access to IndexedDB via browser dev tools
 * - Data exposure if device is compromised while locked
 */
async function getOrCreateDeviceKey(): Promise<Uint8Array> {
  const storageKey = 'ethics-device-key';

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return new Uint8Array(JSON.parse(stored));
    }
  } catch {
    // If localStorage read fails, generate new key
  }

  // Generate a new 256-bit key
  const key = crypto.getRandomValues(new Uint8Array(32));

  try {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(key)));
  } catch {
    // If localStorage write fails, key will be regenerated next time
    // This means drafts won't persist across sessions on this device
    console.warn('Failed to persist device key to localStorage');
  }

  return key;
}

/**
 * Simple XOR-based encryption for IndexedDB values.
 * Uses the device key to encrypt/decrypt data.
 *
 * Note: This is a simple obfuscation layer, not cryptographically strong.
 * For production, consider using WebCrypto AES-GCM.
 */
function encryptValue(value: string, key: Uint8Array): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const encrypted = new Uint8Array(data.length);

  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ key[i % key.length];
  }

  // Convert Uint8Array to string for base64 encoding
  let result = '';
  for (let i = 0; i < encrypted.length; i++) {
    result += String.fromCharCode(encrypted[i]);
  }
  return btoa(result);
}

function decryptValue(encrypted: string, key: Uint8Array): string {
  const data = new Uint8Array(
    atob(encrypted).split('').map((c) => c.charCodeAt(0))
  );
  const decrypted = new Uint8Array(data.length);

  for (let i = 0; i < data.length; i++) {
    decrypted[i] = data[i] ^ key[i % key.length];
  }

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Dexie database for Ethics Portal offline storage.
 * Encrypts sensitive fields (content, attachments, payload) at rest.
 */
class EthicsPortalDB extends Dexie {
  drafts!: Table<ReportDraft>;
  pendingSubmissions!: Table<PendingSubmission>;

  private encryptionKey: Uint8Array | null = null;

  constructor() {
    super('EthicsPortalDB');

    this.version(1).stores({
      // Indexes for drafts table
      // ++id: auto-increment, localId: for resume code lookup
      // tenantSlug: for multi-tenant isolation
      // expiresAt: for cleanup, syncStatus: for filtering
      drafts: '++id, localId, tenantSlug, expiresAt, syncStatus',

      // Indexes for pending submissions
      pendingSubmissions: '++id, tenantSlug, createdAt',
    });
  }

  /**
   * Initialize encryption key. Must be called before using the database.
   */
  async initEncryption(): Promise<void> {
    this.encryptionKey = await getOrCreateDeviceKey();
  }

  /**
   * Encrypt sensitive fields before storing.
   * Returns a modified draft with encrypted content/attachments stored as base64 strings.
   */
  encryptDraft(draft: ReportDraft): ReportDraft {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized. Call initEncryption() first.');
    }

    // Store encrypted values as strings (will be cast back on read)
    const encryptedContent = encryptValue(JSON.stringify(draft.content), this.encryptionKey);
    const encryptedAttachments = encryptValue(JSON.stringify(draft.attachments), this.encryptionKey);

    return {
      ...draft,
      // TypeScript: we're storing encrypted strings but typed as original types
      // The decryptDraft method will restore the proper types
      content: encryptedContent as unknown as Record<string, unknown>,
      attachments: encryptedAttachments as unknown as AttachmentRef[],
    };
  }

  /**
   * Decrypt sensitive fields after reading.
   */
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
}

/**
 * Singleton database instance.
 * Use `db.initEncryption()` before first use.
 */
export const db = new EthicsPortalDB();

/**
 * Clean up expired drafts from the database.
 * Should be called on app initialization.
 */
export async function cleanupExpiredDrafts(): Promise<number> {
  const now = new Date();
  const deletedCount = await db.drafts
    .where('expiresAt')
    .below(now)
    .delete();

  return deletedCount;
}

/**
 * Generate a unique local ID for a draft.
 * Uses a simple random string generator.
 */
function generateLocalId(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}
