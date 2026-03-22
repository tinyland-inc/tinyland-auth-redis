/**
 * Redis key pattern helpers
 *
 * All keys are namespaced under a configurable prefix (default: 'auth').
 * This module centralizes key generation to prevent typos and ensure consistency.
 */

export interface KeyGenerators {
  /** User hash: stores full AdminUser as JSON fields */
  user: (id: string) => string;
  /** Handle -> user ID lookup index */
  userHandle: (handle: string) => string;
  /** Email -> user ID lookup index */
  userEmail: (email: string) => string;
  /** Set of all user IDs */
  usersAll: () => string;

  /** Session hash: stores full Session as JSON fields */
  session: (id: string) => string;
  /** Sorted set of session IDs for a user, scored by expiry timestamp */
  sessionsByUser: (userId: string) => string;

  /** TOTP secret JSON blob */
  totp: (handle: string) => string;
  /** Backup codes JSON blob */
  backup: (userId: string) => string;

  /** Invitation hash: stores full AdminInvitation */
  invite: (token: string) => string;
  /** Invitation ID -> token lookup index */
  inviteById: (id: string) => string;
  /** Set of all invitation tokens */
  invitesAll: () => string;
  /** Set of pending (unused, unexpired) invitation tokens */
  invitesPending: () => string;

  /** Audit event hash */
  audit: (id: string) => string;
  /** Sorted set of audit event IDs, scored by timestamp */
  auditLog: () => string;
}

export const createKeys = (prefix: string): KeyGenerators => ({
  user: (id: string) => `${prefix}:user:${id}`,
  userHandle: (handle: string) => `${prefix}:user:handle:${handle}`,
  userEmail: (email: string) => `${prefix}:user:email:${email}`,
  usersAll: () => `${prefix}:users:all`,

  session: (id: string) => `${prefix}:session:${id}`,
  sessionsByUser: (userId: string) => `${prefix}:sessions:user:${userId}`,

  totp: (handle: string) => `${prefix}:totp:${handle}`,
  backup: (userId: string) => `${prefix}:backup:${userId}`,

  invite: (token: string) => `${prefix}:invite:${token}`,
  inviteById: (id: string) => `${prefix}:invite:id:${id}`,
  invitesAll: () => `${prefix}:invites:all`,
  invitesPending: () => `${prefix}:invites:pending`,

  audit: (id: string) => `${prefix}:audit:${id}`,
  auditLog: () => `${prefix}:audit:log`,
});
