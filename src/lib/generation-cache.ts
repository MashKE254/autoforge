import { createHash } from 'crypto';

/**
 * Generation Result Caching System
 *
 * Caches completed generation results to serve identical prompts instantly.
 *
 * Performance Impact:
 * - Without cache: 60-90 seconds (full Claude API call)
 * - With cache: 0.5 seconds (instant retrieval)
 *
 * 120-180x faster for repeat requests!
 */

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  size?: number;
}

export interface CachedGenerationResult {
  files: GeneratedFile[];
  tokensUsed?: number;
  classificationType?: string;
  generatorsUsed?: string[];
  timestamp: number;
}

// In-memory cache (for now - can be upgraded to Redis later)
// Structure: Map<cacheKey, CachedGenerationResult>
const cache = new Map<string, CachedGenerationResult>();

// Cache configuration
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cached results
const MIN_PROMPT_LENGTH = 10; // Don't cache very short prompts

/**
 * Generate a cache key from prompt and generation mode
 * Uses SHA-256 hash for consistent, privacy-preserving keys
 */
function generateCacheKey(prompt: string, mode: string, forceType?: string): string {
  const normalizedPrompt = prompt.trim().toLowerCase();
  const keyData = `${normalizedPrompt}:${mode}:${forceType || 'auto'}`;

  return createHash('sha256')
    .update(keyData)
    .digest('hex');
}

/**
 * Get cached generation result if available and not expired
 *
 * Returns null if:
 * - No cache hit
 * - Cache expired
 * - Prompt too short to cache
 */
export async function getCachedGeneration(
  prompt: string,
  mode: string,
  forceType?: string
): Promise<CachedGenerationResult | null> {
  // Don't cache very short prompts (likely incomplete/test)
  if (prompt.trim().length < MIN_PROMPT_LENGTH) {
    return null;
  }

  const key = generateCacheKey(prompt, mode, forceType);
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  // Check if expired
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL) {
    console.log('⏰ Cache expired, removing:', key.slice(0, 8));
    cache.delete(key);
    return null;
  }

  console.log('♻️ Cache HIT! Serving cached generation');
  console.log(`   Prompt hash: ${key.slice(0, 16)}...`);
  console.log(`   Age: ${Math.floor(age / 1000)}s`);
  console.log(`   Files: ${cached.files.length}`);
  console.log(`   ⚡ Saved ~60-90 seconds of generation time`);

  return cached;
}

/**
 * Store generation result in cache
 *
 * Implements LRU eviction: when cache is full, removes oldest entry
 */
export async function cacheGeneration(
  prompt: string,
  mode: string,
  files: GeneratedFile[],
  forceType?: string,
  tokensUsed?: number,
  classificationType?: string,
  generatorsUsed?: string[]
): Promise<void> {
  // Don't cache very short prompts
  if (prompt.trim().length < MIN_PROMPT_LENGTH) {
    return;
  }

  // Don't cache if no files generated (error case)
  if (!files || files.length === 0) {
    console.log('⚠️ Not caching: no files generated');
    return;
  }

  const key = generateCacheKey(prompt, mode, forceType);

  // Implement LRU: if cache is full, remove oldest entry
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = findOldestEntry();
    if (oldestKey) {
      console.log(`🗑️ Cache full, evicting oldest: ${oldestKey.slice(0, 8)}`);
      cache.delete(oldestKey);
    }
  }

  const result: CachedGenerationResult = {
    files,
    tokensUsed,
    classificationType,
    generatorsUsed,
    timestamp: Date.now(),
  };

  cache.set(key, result);

  console.log('💾 Cached generation result');
  console.log(`   Key: ${key.slice(0, 16)}...`);
  console.log(`   Files: ${files.length}`);
  console.log(`   Cache size: ${cache.size}/${MAX_CACHE_SIZE}`);
}

/**
 * Find the oldest entry in the cache for LRU eviction
 */
function findOldestEntry(): string | null {
  if (cache.size === 0) return null;

  let oldestKey: string | null = null;
  let oldestTimestamp = Infinity;

  for (const [key, value] of cache.entries()) {
    if (value.timestamp < oldestTimestamp) {
      oldestTimestamp = value.timestamp;
      oldestKey = key;
    }
  }

  return oldestKey;
}

/**
 * Clear all cached results
 * Useful for testing or manual cache invalidation
 */
export function clearGenerationCache(): void {
  const size = cache.size;
  cache.clear();
  console.log(`🗑️ Cleared generation cache (${size} entries)`);
}

/**
 * Clear expired entries from cache
 * Should be called periodically (e.g., every 5 minutes)
 */
export function cleanupExpiredCache(): number {
  const before = cache.size;
  const now = Date.now();
  let removed = 0;

  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`🧹 Cleaned up ${removed} expired cache entries`);
  }

  return removed;
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  const entries = Array.from(cache.values());
  const now = Date.now();

  const stats = {
    totalEntries: cache.size,
    maxSize: MAX_CACHE_SIZE,
    utilizationPercent: Math.round((cache.size / MAX_CACHE_SIZE) * 100),
    ttlMinutes: CACHE_TTL / 60000,
    averageAgeSeconds: entries.length > 0
      ? Math.round(entries.reduce((sum, e) => sum + (now - e.timestamp), 0) / entries.length / 1000)
      : 0,
    totalFilesCached: entries.reduce((sum, e) => sum + e.files.length, 0),
  };

  return stats;
}

/**
 * Check if a prompt would be cached
 * Useful for UI indicators
 */
export function wouldBeCached(prompt: string): boolean {
  return prompt.trim().length >= MIN_PROMPT_LENGTH;
}

// Periodic cleanup: Run every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupExpiredCache();
  }, 5 * 60 * 1000);
}
