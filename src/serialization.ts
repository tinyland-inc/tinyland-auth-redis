/**
 * JSON serialization helpers for Redis storage
 *
 * Handles Date <-> ISO string conversion and safe JSON parsing
 * for entities stored as Redis strings/hashes.
 */

/**
 * Serialize an entity to a JSON string for Redis storage.
 * Dates are stored as ISO strings by the auth library already,
 * so this is primarily a safe JSON.stringify wrapper.
 */
export const serialize = <T>(value: T): string => JSON.stringify(value);

/**
 * Deserialize a JSON string from Redis back to a typed entity.
 * Returns null if the input is null/undefined (Redis miss).
 */
export const deserialize = <T>(value: string | null | undefined): T | null => {
  if (value == null) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

/**
 * Convert a Record to a flat string map suitable for Redis HSET.
 * Nested objects/arrays are JSON-stringified; primitives become strings.
 */
export const toHashFields = (obj: Record<string, unknown>): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value === null) {
      result[key] = 'null';
    } else if (typeof value === 'object') {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = String(value);
    }
  }
  return result;
};

/**
 * Parse a flat string map from Redis HGETALL back to a typed object.
 * Attempts JSON.parse on each value to restore nested structures;
 * falls back to the raw string if parsing fails.
 */
export const fromHashFields = <T>(hash: Record<string, string> | null): T | null => {
  if (!hash || Object.keys(hash).length === 0) return null;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(hash)) {
    if (value === 'null') {
      result[key] = null;
    } else if (value === 'true') {
      result[key] = true;
    } else if (value === 'false') {
      result[key] = false;
    } else if (value !== '' && !isNaN(Number(value)) && !value.startsWith('0') && !value.includes('-') && !value.includes('T')) {
      // Only parse as number if it looks like a plain number (not a date, not zero-prefixed)
      result[key] = Number(value);
    } else {
      try {
        const parsed = JSON.parse(value);
        // Only use parsed result for objects/arrays; keep strings as-is
        if (typeof parsed === 'object' && parsed !== null) {
          result[key] = parsed;
        } else {
          result[key] = value;
        }
      } catch {
        result[key] = value;
      }
    }
  }
  return result as T;
};
