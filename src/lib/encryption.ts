/**
 * Encryption Utilities for Managed Infrastructure
 * 
 * File: src/lib/encryption.ts
 * 
 * Provides secure encryption/decryption for sensitive data stored in the database:
 * - Supabase service keys
 * - Clerk secret keys
 * - Stripe secret keys and webhook secrets
 * - Database passwords
 * 
 * Uses AES-256-GCM encryption with random IVs for each encryption operation.
 * 
 * IMPORTANT: Set ENCRYPTION_KEY environment variable to a 32-byte hex string.
 * Generate with: openssl rand -hex 32
 */

import crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag
const ENCODING: BufferEncoding = 'hex';

// ============================================================================
// KEY MANAGEMENT
// ============================================================================

/**
 * Get the encryption key from environment variables
 * Key must be a 32-byte (64 character) hex string
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  // Validate key length (should be 64 hex characters = 32 bytes)
  if (key.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be 64 hex characters (32 bytes). ` +
      `Current length: ${key.length}. ` +
      `Generate with: openssl rand -hex 32`
    );
  }

  // Validate hex format
  if (!/^[0-9a-fA-F]+$/.test(key)) {
    throw new Error('ENCRYPTION_KEY must be a valid hex string');
  }

  return Buffer.from(key, 'hex');
}

// ============================================================================
// CORE ENCRYPTION FUNCTIONS
// ============================================================================

/**
 * Encrypt a string value
 *
 * Returns format: iv:authTag:encryptedData (all hex encoded)
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return '';
  }

  // 🎭 SIMULATION MODE - Skip encryption for simulated credentials
  if (process.env.SIMULATE_INFRASTRUCTURE === 'true') {
    return plaintext; // Just return as-is in simulation mode
  }

  try {
    const key = getEncryptionKey();

    // Generate a random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    // Get the auth tag (for GCM mode)
    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    // Format: iv:authTag:encryptedData
    return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted string
 *
 * @param encryptedData - String in format iv:authTag:ciphertext
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    return '';
  }

  // 🎭 SIMULATION MODE - Skip decryption for simulated credentials
  if (process.env.SIMULATE_INFRASTRUCTURE === 'true') {
    return encryptedData; // Just return as-is in simulation mode
  }

  try {
    const key = getEncryptionKey();

    // Split the encrypted data into components
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, ciphertext] = parts;

    // Convert from hex
    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(ciphertext, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Encrypt multiple values in an object
 * Only encrypts string values, leaves others unchanged
 */
export function encryptObject<T extends Record<string, unknown>>(
  obj: T,
  keysToEncrypt: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const key of keysToEncrypt) {
    const value = result[key];
    if (typeof value === 'string' && value.length > 0) {
      (result as Record<string, unknown>)[key as string] = encrypt(value);
    }
  }
  
  return result;
}

/**
 * Decrypt multiple values in an object
 * Only decrypts string values that look encrypted (contain colons)
 */
export function decryptObject<T extends Record<string, unknown>>(
  obj: T,
  keysToDecrypt: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const key of keysToDecrypt) {
    const value = result[key];
    if (typeof value === 'string' && value.includes(':')) {
      try {
        (result as Record<string, unknown>)[key as string] = decrypt(value);
      } catch {
        // If decryption fails, leave the value as-is
        console.warn(`Failed to decrypt field: ${String(key)}`);
      }
    }
  }
  
  return result;
}

/**
 * Check if a string appears to be encrypted (has the correct format)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  
  const parts = value.split(':');
  if (parts.length !== 3) return false;

  const [iv, authTag] = parts;

  // Check if IV and auth tag have correct lengths (hex encoded)
  return iv.length === IV_LENGTH * 2 && authTag.length === AUTH_TAG_LENGTH * 2;
}

/**
 * Safely encrypt - returns original value if already encrypted or empty
 */
export function safeEncrypt(value: string | null | undefined): string {
  if (!value) return '';
  if (isEncrypted(value)) return value;
  return encrypt(value);
}

/**
 * Safely decrypt - returns original value if not encrypted or empty
 */
export function safeDecrypt(value: string | null | undefined): string {
  if (!value) return '';
  if (!isEncrypted(value)) return value;
  return decrypt(value);
}

// ============================================================================
// HASH FUNCTIONS (For non-reversible operations)
// ============================================================================

/**
 * Create a SHA-256 hash of a string
 * Useful for creating deterministic IDs or checking data integrity
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create a HMAC-SHA-256 signature
 * Useful for webhook signature verification
 */
export function hmacSign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify a HMAC-SHA-256 signature
 */
export function hmacVerify(data: string, secret: string, signature: string): boolean {
  const expectedSignature = hmacSign(data, secret);
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

// ============================================================================
// KEY GENERATION
// ============================================================================

/**
 * Generate a random encryption key (32 bytes = 64 hex chars)
 * Use this to generate an ENCRYPTION_KEY value
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a random secret key for various purposes
 */
export function generateSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a URL-safe random string (for tokens, IDs, etc.)
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate a random API key in a standard format
 * Format: prefix_base64urlrandom (e.g., af_sk_xxxxxxxxxxxx)
 */
export function generateApiKey(prefix: string = 'af_sk'): string {
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return `${prefix}_${randomPart}`;
}

// ============================================================================
// ENVIRONMENT VARIABLE HELPERS
// ============================================================================

/**
 * Build encrypted environment variables for a managed project
 */
export function encryptEnvVars(envVars: Record<string, string>): Record<string, string> {
  const sensitiveKeys = [
    'SECRET_KEY',
    'API_KEY',
    'WEBHOOK_SECRET',
    'PASSWORD',
    'SERVICE_KEY',
    'SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'DIRECT_URL',
  ];
  
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(envVars)) {
    // Check if key contains any sensitive patterns
    const isSensitive = sensitiveKeys.some(
      pattern => key.toUpperCase().includes(pattern)
    );
    
    result[key] = isSensitive ? encrypt(value) : value;
  }
  
  return result;
}

/**
 * Decrypt environment variables for deployment
 */
export function decryptEnvVars(envVars: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(envVars)) {
    result[key] = isEncrypted(value) ? decrypt(value) : value;
  }
  
  return result;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that the encryption system is properly configured
 */
export function validateEncryptionSetup(): { valid: boolean; error?: string } {
  try {
    // Try to get the key (will throw if not configured)
    getEncryptionKey();
    
    // Try a round-trip encryption/decryption
    const testValue = 'test_encryption_validation';
    const encrypted = encrypt(testValue);
    const decrypted = decrypt(encrypted);
    
    if (decrypted !== testValue) {
      return {
        valid: false,
        error: 'Encryption round-trip validation failed',
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown encryption error',
    };
  }
}

/**
 * Check if encryption key is set (without throwing)
 */
export function isEncryptionConfigured(): boolean {
  const key = process.env.ENCRYPTION_KEY;
  return !!key && key.length === 64 && /^[0-9a-fA-F]+$/.test(key);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export interface EncryptedCredentials {
  supabaseServiceKey?: string;
  supabaseDbPassword?: string;
  clerkSecretKey?: string;
  stripeTestSecret?: string;
  stripeTestWebhookSecret?: string;
  stripeLiveSecret?: string;
  stripeLiveWebhookSecret?: string;
  [key: string]: string | undefined;
}

export interface DecryptedCredentials {
  supabaseServiceKey?: string;
  supabaseDbPassword?: string;
  clerkSecretKey?: string;
  stripeTestSecret?: string;
  stripeTestWebhookSecret?: string;
  stripeLiveSecret?: string;
  stripeLiveWebhookSecret?: string;
  [key: string]: string | undefined;
}

/**
 * Encrypt all credentials for storage
 */
export function encryptCredentials(creds: DecryptedCredentials): EncryptedCredentials {
  return encryptObject(creds, [
    'supabaseServiceKey',
    'supabaseDbPassword',
    'clerkSecretKey',
    'stripeTestSecret',
    'stripeTestWebhookSecret',
    'stripeLiveSecret',
    'stripeLiveWebhookSecret',
  ] as (keyof DecryptedCredentials)[]);
}

/**
 * Decrypt all credentials for use
 */
export function decryptCredentials(creds: EncryptedCredentials): DecryptedCredentials {
  return decryptObject(creds, [
    'supabaseServiceKey',
    'supabaseDbPassword',
    'clerkSecretKey',
    'stripeTestSecret',
    'stripeTestWebhookSecret',
    'stripeLiveSecret',
    'stripeLiveWebhookSecret',
  ] as (keyof EncryptedCredentials)[]);
}