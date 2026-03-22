import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisStorageAdapter } from '../adapter.js';
import type { AdminUser, Session, AdminInvitation, AuditEvent } from '@tummycrypt/tinyland-auth/types';
import { AuditEventType } from '@tummycrypt/tinyland-auth/types';

// ---------------------------------------------------------------------------
// Mock @upstash/redis
//
// @upstash/redis auto-serializes on set() and auto-deserializes on get(),
// so mocks return plain objects, not JSON strings.
// ---------------------------------------------------------------------------

const mockPipeline = {
  set: vi.fn().mockReturnThis(),
  get: vi.fn().mockReturnThis(),
  del: vi.fn().mockReturnThis(),
  sadd: vi.fn().mockReturnThis(),
  srem: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  zrem: vi.fn().mockReturnThis(),
  zremrangebyscore: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};

const mockRedis = {
  ping: vi.fn().mockResolvedValue('PONG'),
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  smembers: vi.fn().mockResolvedValue([]),
  scard: vi.fn().mockResolvedValue(0),
  sadd: vi.fn().mockResolvedValue(1),
  srem: vi.fn().mockResolvedValue(1),
  zadd: vi.fn().mockResolvedValue(1),
  zrange: vi.fn().mockResolvedValue([]),
  zrem: vi.fn().mockResolvedValue(1),
  zremrangebyscore: vi.fn().mockResolvedValue(0),
  pipeline: vi.fn().mockReturnValue(mockPipeline),
};

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => mockRedis),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeUser = (overrides?: Partial<AdminUser>): AdminUser => ({
  id: 'user-1',
  handle: 'jen',
  email: 'jen@example.com',
  displayName: 'Jen',
  passwordHash: '$2a$10$hash',
  totpEnabled: false,
  role: 'admin',
  isActive: true,
  needsOnboarding: false,
  onboardingStep: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeSession = (overrides?: Partial<Session>): Session => ({
  id: 'sess-1',
  userId: 'user-1',
  expires: new Date(Date.now() + 86400000).toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  createdAt: '2026-01-01T00:00:00.000Z',
  clientIp: '127.0.0.1',
  userAgent: 'test-agent',
  ...overrides,
});

const makeInvitation = (overrides?: Partial<AdminInvitation>): AdminInvitation => ({
  id: 'inv-1',
  token: 'tok-abc',
  email: 'new@example.com',
  role: 'editor',
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  isActive: true,
  ...overrides,
});

const makeAuditEvent = (overrides?: Partial<AuditEvent>): AuditEvent => ({
  id: 'evt_123_abc',
  timestamp: '2026-01-15T10:00:00.000Z',
  type: AuditEventType.LOGIN_SUCCESS,
  userId: 'user-1',
  details: {},
  severity: 'info',
  source: 'user',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RedisStorageAdapter', () => {
  let adapter: RedisStorageAdapter;

  beforeEach(() => {
    vi.resetAllMocks();

    // Re-establish defaults after clearAllMocks wipes them
    mockRedis.ping.mockResolvedValue('PONG');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.smembers.mockResolvedValue([]);
    mockRedis.scard.mockResolvedValue(0);
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.srem.mockResolvedValue(1);
    mockRedis.zadd.mockResolvedValue(1);
    mockRedis.zrange.mockResolvedValue([]);
    mockRedis.zrange.mockResolvedValue([]);
    mockRedis.zrem.mockResolvedValue(1);
    mockRedis.zremrangebyscore.mockResolvedValue(0);
    mockRedis.pipeline.mockReturnValue(mockPipeline);

    mockPipeline.set.mockReturnThis();
    mockPipeline.get.mockReturnThis();
    mockPipeline.del.mockReturnThis();
    mockPipeline.sadd.mockReturnThis();
    mockPipeline.srem.mockReturnThis();
    mockPipeline.zadd.mockReturnThis();
    mockPipeline.zrem.mockReturnThis();
    mockPipeline.zremrangebyscore.mockReturnThis();
    mockPipeline.exec.mockResolvedValue([]);

    adapter = new RedisStorageAdapter({ redis: mockRedis as any });
  });

  // ========================================================================
  // Constructor
  // ========================================================================

  describe('constructor', () => {
    it('should accept an existing Redis instance', () => {
      expect(() => new RedisStorageAdapter({ redis: mockRedis as any })).not.toThrow();
    });

    it('should accept url + token', () => {
      // The Redis constructor is mocked, so this won't fail
      expect(
        () => new RedisStorageAdapter({ url: 'https://redis.example.com', token: 'tok' }),
      ).not.toThrow();
    });

    it('should throw without redis or url+token', () => {
      expect(() => new RedisStorageAdapter({})).toThrow(
        'RedisStorageAdapter requires either a Redis instance or url+token',
      );
    });
  });

  // ========================================================================
  // Lifecycle
  // ========================================================================

  describe('init', () => {
    it('should ping Redis', async () => {
      await adapter.init();
      expect(mockRedis.ping).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should resolve without error', async () => {
      await expect(adapter.close()).resolves.toBeUndefined();
    });
  });

  // ========================================================================
  // User Operations
  // ========================================================================

  describe('getUser', () => {
    it('should return a user when found', async () => {
      const user = makeUser();
      mockRedis.get.mockResolvedValueOnce(user);

      const result = await adapter.getUser('user-1');
      expect(result).toEqual(user);
      expect(mockRedis.get).toHaveBeenCalledWith('auth:user:user-1');
    });

    it('should return null when not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const result = await adapter.getUser('missing');
      expect(result).toBeNull();
    });
  });

  describe('getUserByHandle', () => {
    it('should look up by handle index then fetch user', async () => {
      const user = makeUser();
      mockRedis.get
        .mockResolvedValueOnce('user-1') // handle index lookup
        .mockResolvedValueOnce(user);    // user fetch

      const result = await adapter.getUserByHandle('Jen');
      expect(mockRedis.get).toHaveBeenCalledWith('auth:user:handle:jen');
      expect(result).toEqual(user);
    });

    it('should return null when handle not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const result = await adapter.getUserByHandle('nobody');
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should look up by email index then fetch user', async () => {
      const user = makeUser();
      mockRedis.get
        .mockResolvedValueOnce('user-1') // email index lookup
        .mockResolvedValueOnce(user);    // user fetch

      const result = await adapter.getUserByEmail('Jen@Example.com');
      expect(mockRedis.get).toHaveBeenCalledWith('auth:user:email:jen@example.com');
      expect(result).toEqual(user);
    });
  });

  describe('getAllUsers', () => {
    it('should fetch all user IDs from the set then batch-get', async () => {
      const user1 = makeUser({ id: 'u1', handle: 'jen' });
      const user2 = makeUser({ id: 'u2', handle: 'jess' });

      mockRedis.smembers.mockResolvedValueOnce(['u1', 'u2']);
      mockPipeline.exec.mockResolvedValueOnce([user1, user2]);

      const result = await adapter.getAllUsers();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(user1);
      expect(result[1]).toEqual(user2);
    });

    it('should return empty array when no users exist', async () => {
      mockRedis.smembers.mockResolvedValueOnce([]);
      const result = await adapter.getAllUsers();
      expect(result).toEqual([]);
    });
  });

  describe('createUser', () => {
    it('should assign an ID and write user + indexes atomically', async () => {
      const { id, ...userData } = makeUser();

      const result = await adapter.createUser(userData);
      expect(result.id).toBeDefined();
      expect(result.handle).toBe('jen');

      // Pipeline: set(user), set(handle index), set(email index), sadd(users:all)
      expect(mockPipeline.set).toHaveBeenCalledTimes(3);
      expect(mockPipeline.sadd).toHaveBeenCalledTimes(1);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should merge updates and persist', async () => {
      const user = makeUser();
      mockRedis.get.mockResolvedValueOnce(user);

      const result = await adapter.updateUser('user-1', { displayName: 'Jennifer' });
      expect(result.displayName).toBe('Jennifer');
      expect(result.id).toBe('user-1');
      expect(mockPipeline.set).toHaveBeenCalled();
    });

    it('should update handle index when handle changes', async () => {
      const user = makeUser();
      mockRedis.get.mockResolvedValueOnce(user);

      await adapter.updateUser('user-1', { handle: 'jennifer' });
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:user:handle:jen');
      expect(mockPipeline.set).toHaveBeenCalledWith('auth:user:handle:jennifer', 'user-1');
    });

    it('should update email index when email changes', async () => {
      const user = makeUser();
      mockRedis.get.mockResolvedValueOnce(user);

      await adapter.updateUser('user-1', { email: 'new@example.com' });
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:user:email:jen@example.com');
      expect(mockPipeline.set).toHaveBeenCalledWith(
        'auth:user:email:new@example.com',
        'user-1',
      );
    });

    it('should throw when user not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      await expect(adapter.updateUser('missing', {})).rejects.toThrow('User missing not found');
    });
  });

  describe('deleteUser', () => {
    it('should remove user, indexes, and related data', async () => {
      const user = makeUser();
      mockRedis.get
        .mockResolvedValueOnce(user)  // getUser
        .mockResolvedValueOnce(null)  // deleteSession inner get (from deleteTOTPSecret's del)
        .mockResolvedValueOnce(null); // deleteBackupCodes del (returns number)
      mockRedis.zrange.mockResolvedValueOnce([]); // deleteUserSessions
      mockRedis.del.mockResolvedValue(0); // deleteTOTPSecret + deleteBackupCodes

      const result = await adapter.deleteUser('user-1');
      expect(result).toBe(true);
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:user:user-1');
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:user:handle:jen');
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:user:email:jen@example.com');
      expect(mockPipeline.srem).toHaveBeenCalledWith('auth:users:all', 'user-1');
    });

    it('should return false when user not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const result = await adapter.deleteUser('missing');
      expect(result).toBe(false);
    });
  });

  describe('hasUsers', () => {
    it('should return true when users exist', async () => {
      mockRedis.scard.mockResolvedValueOnce(2);
      expect(await adapter.hasUsers()).toBe(true);
    });

    it('should return false when no users exist', async () => {
      mockRedis.scard.mockResolvedValueOnce(0);
      expect(await adapter.hasUsers()).toBe(false);
    });
  });

  // ========================================================================
  // Session Operations
  // ========================================================================

  describe('getSession', () => {
    it('should return a valid session', async () => {
      const session = makeSession();
      mockRedis.get.mockResolvedValueOnce(session);

      const result = await adapter.getSession('sess-1');
      expect(result).toEqual(session);
    });

    it('should return null and delete expired sessions', async () => {
      const expiredSession = makeSession({
        expires: '2020-01-01T00:00:00.000Z',
        expiresAt: '2020-01-01T00:00:00.000Z',
      });
      // getSession's get, then deleteSession's get
      mockRedis.get
        .mockResolvedValueOnce(expiredSession)
        .mockResolvedValueOnce(expiredSession);

      const result = await adapter.getSession('sess-1');
      expect(result).toBeNull();
    });

    it('should return null when session not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const result = await adapter.getSession('missing');
      expect(result).toBeNull();
    });
  });

  describe('getSessionsByUser', () => {
    it('should return non-expired sessions for a user', async () => {
      const session = makeSession();
      mockRedis.zrange.mockResolvedValueOnce(['sess-1']);
      mockPipeline.exec.mockResolvedValueOnce([session]);

      const result = await adapter.getSessionsByUser('user-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(session);
    });

    it('should return empty array when no sessions', async () => {
      mockRedis.zrange.mockResolvedValueOnce([]);
      const result = await adapter.getSessionsByUser('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('createSession', () => {
    it('should create a session with defaults', async () => {
      const result = await adapter.createSession('user-1', { handle: 'jen', role: 'admin' });

      expect(result.id).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(result.user?.username).toBe('jen');
      expect(result.clientIp).toBe('unknown');

      expect(mockPipeline.set).toHaveBeenCalled();
      expect(mockPipeline.zadd).toHaveBeenCalled();
    });

    it('should include metadata when provided', async () => {
      const result = await adapter.createSession('user-1', { handle: 'jen' }, {
        clientIp: '192.168.1.1',
        userAgent: 'Firefox',
        deviceType: 'desktop',
      });

      expect(result.clientIp).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Firefox');
      expect(result.deviceType).toBe('desktop');
    });
  });

  describe('updateSession', () => {
    it('should merge updates', async () => {
      const session = makeSession();
      mockRedis.get.mockResolvedValueOnce(session);

      const result = await adapter.updateSession('sess-1', {
        clientIp: '10.0.0.1',
      });
      expect(result.clientIp).toBe('10.0.0.1');
      expect(result.id).toBe('sess-1');
    });

    it('should throw when session not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      await expect(adapter.updateSession('missing', {})).rejects.toThrow(
        'Session missing not found',
      );
    });
  });

  describe('deleteSession', () => {
    it('should delete session and remove from user sorted set', async () => {
      const session = makeSession();
      mockRedis.get.mockResolvedValueOnce(session);

      const result = await adapter.deleteSession('sess-1');
      expect(result).toBe(true);
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:session:sess-1');
      expect(mockPipeline.zrem).toHaveBeenCalledWith('auth:sessions:user:user-1', 'sess-1');
    });

    it('should return false when session not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const result = await adapter.deleteSession('missing');
      expect(result).toBe(false);
    });
  });

  describe('deleteUserSessions', () => {
    it('should delete all sessions for a user', async () => {
      mockRedis.zrange.mockResolvedValueOnce(['sess-1', 'sess-2']);

      const count = await adapter.deleteUserSessions('user-1');
      expect(count).toBe(2);
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:session:sess-1');
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:session:sess-2');
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:sessions:user:user-1');
    });

    it('should return 0 when user has no sessions', async () => {
      mockRedis.zrange.mockResolvedValueOnce([]);
      const count = await adapter.deleteUserSessions('user-1');
      expect(count).toBe(0);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions across all users', async () => {
      mockRedis.smembers.mockResolvedValueOnce(['user-1']);
      mockRedis.zrange.mockResolvedValueOnce(['sess-expired']);

      const count = await adapter.cleanupExpiredSessions();
      expect(count).toBe(1);
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:session:sess-expired');
    });

    it('should return 0 when nothing to clean', async () => {
      mockRedis.smembers.mockResolvedValueOnce(['user-1']);
      mockRedis.zrange.mockResolvedValueOnce([]);

      const count = await adapter.cleanupExpiredSessions();
      expect(count).toBe(0);
    });
  });

  // ========================================================================
  // TOTP Operations
  // ========================================================================

  describe('getTOTPSecret', () => {
    it('should return TOTP secret when found', async () => {
      const secret = {
        userId: 'user-1',
        handle: 'jen',
        encryptedSecret: 'enc',
        iv: 'iv',
        authTag: 'tag',
        salt: 'salt',
        createdAt: '2026-01-01T00:00:00.000Z',
        backupCodesGenerated: false,
        version: 1,
      };
      mockRedis.get.mockResolvedValueOnce(secret);

      const result = await adapter.getTOTPSecret('Jen');
      expect(result).toEqual(secret);
      expect(mockRedis.get).toHaveBeenCalledWith('auth:totp:jen');
    });

    it('should return null when not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      expect(await adapter.getTOTPSecret('nobody')).toBeNull();
    });
  });

  describe('saveTOTPSecret', () => {
    it('should store TOTP secret', async () => {
      const secret = {
        userId: 'user-1',
        handle: 'jen',
        encryptedSecret: 'enc',
        iv: 'iv',
        authTag: 'tag',
        salt: 'salt',
        createdAt: '2026-01-01T00:00:00.000Z',
        backupCodesGenerated: false,
        version: 1,
      };
      await adapter.saveTOTPSecret('Jen', secret);
      expect(mockRedis.set).toHaveBeenCalledWith('auth:totp:jen', secret);
    });
  });

  describe('deleteTOTPSecret', () => {
    it('should return true when deleted', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      expect(await adapter.deleteTOTPSecret('jen')).toBe(true);
    });

    it('should return false when key did not exist', async () => {
      mockRedis.del.mockResolvedValueOnce(0);
      expect(await adapter.deleteTOTPSecret('nobody')).toBe(false);
    });
  });

  // ========================================================================
  // Backup Code Operations
  // ========================================================================

  describe('getBackupCodes', () => {
    it('should return backup codes when found', async () => {
      const codes = {
        userId: 'user-1',
        codes: [{ id: 'c1', hash: 'h1', used: false }],
        generatedAt: '2026-01-01T00:00:00.000Z',
      };
      mockRedis.get.mockResolvedValueOnce(codes);

      const result = await adapter.getBackupCodes('user-1');
      expect(result).toEqual(codes);
    });

    it('should return null when not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      expect(await adapter.getBackupCodes('missing')).toBeNull();
    });
  });

  describe('saveBackupCodes', () => {
    it('should store backup codes', async () => {
      const codes = {
        userId: 'user-1',
        codes: [],
        generatedAt: '2026-01-01T00:00:00.000Z',
      };
      await adapter.saveBackupCodes('user-1', codes);
      expect(mockRedis.set).toHaveBeenCalledWith('auth:backup:user-1', codes);
    });
  });

  describe('deleteBackupCodes', () => {
    it('should return true when deleted', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      expect(await adapter.deleteBackupCodes('user-1')).toBe(true);
    });

    it('should return false when not found', async () => {
      mockRedis.del.mockResolvedValueOnce(0);
      expect(await adapter.deleteBackupCodes('missing')).toBe(false);
    });
  });

  // ========================================================================
  // Invitation Operations
  // ========================================================================

  describe('getInvitation', () => {
    it('should return a valid invitation', async () => {
      const inv = makeInvitation();
      mockRedis.get.mockResolvedValueOnce(inv);

      const result = await adapter.getInvitation('tok-abc');
      expect(result).toEqual(inv);
    });

    it('should return null for expired invitations', async () => {
      const inv = makeInvitation({ expiresAt: '2020-01-01T00:00:00.000Z' });
      mockRedis.get.mockResolvedValueOnce(inv);

      expect(await adapter.getInvitation('tok-abc')).toBeNull();
    });

    it('should return null when not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      expect(await adapter.getInvitation('missing')).toBeNull();
    });
  });

  describe('getInvitationById', () => {
    it('should look up token by ID then fetch invitation', async () => {
      const inv = makeInvitation();
      mockRedis.get
        .mockResolvedValueOnce('tok-abc') // id -> token lookup
        .mockResolvedValueOnce(inv);       // token -> invitation

      const result = await adapter.getInvitationById('inv-1');
      expect(result).toEqual(inv);
      expect(mockRedis.get).toHaveBeenCalledWith('auth:invite:id:inv-1');
    });

    it('should return null when ID not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      expect(await adapter.getInvitationById('missing')).toBeNull();
    });
  });

  describe('getAllInvitations', () => {
    it('should fetch all invitations from the set', async () => {
      const inv = makeInvitation();
      mockRedis.smembers.mockResolvedValueOnce(['tok-abc']);
      mockPipeline.exec.mockResolvedValueOnce([inv]);

      const result = await adapter.getAllInvitations();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(inv);
    });
  });

  describe('getPendingInvitations', () => {
    it('should return only non-expired, unused invitations', async () => {
      const pending = makeInvitation();
      const used = makeInvitation({ usedAt: '2026-01-02T00:00:00.000Z' });

      mockRedis.smembers.mockResolvedValueOnce(['tok-abc', 'tok-used']);
      mockPipeline.exec.mockResolvedValueOnce([pending, used]);

      const result = await adapter.getPendingInvitations();
      expect(result).toHaveLength(1);
      expect(result[0].token).toBe('tok-abc');
    });
  });

  describe('createInvitation', () => {
    it('should assign an ID and write to Redis atomically', async () => {
      const { id, ...invData } = makeInvitation();

      const result = await adapter.createInvitation(invData);
      expect(result.id).toBeDefined();
      expect(result.token).toBe('tok-abc');

      expect(mockPipeline.set).toHaveBeenCalledTimes(2); // invite + inviteById
      expect(mockPipeline.sadd).toHaveBeenCalledTimes(2); // all + pending
    });

    it('should not add used invitations to pending set', async () => {
      const { id, ...invData } = makeInvitation({ usedAt: '2026-01-01T00:00:00.000Z' });

      await adapter.createInvitation(invData);
      // Should only add to invitesAll, not invitesPending
      expect(mockPipeline.sadd).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateInvitation', () => {
    it('should merge updates and persist', async () => {
      const inv = makeInvitation();
      mockRedis.get.mockResolvedValueOnce(inv);

      const result = await adapter.updateInvitation('tok-abc', {
        usedAt: '2026-02-01T00:00:00.000Z',
        usedBy: 'user-2',
      });
      expect(result.usedAt).toBe('2026-02-01T00:00:00.000Z');
      expect(result.usedBy).toBe('user-2');
      // Should remove from pending when used
      expect(mockPipeline.srem).toHaveBeenCalledWith('auth:invites:pending', 'tok-abc');
    });

    it('should remove from pending when deactivated', async () => {
      const inv = makeInvitation();
      mockRedis.get.mockResolvedValueOnce(inv);

      await adapter.updateInvitation('tok-abc', { isActive: false });
      expect(mockPipeline.srem).toHaveBeenCalledWith('auth:invites:pending', 'tok-abc');
    });

    it('should throw when invitation not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      await expect(adapter.updateInvitation('missing', {})).rejects.toThrow(
        'Invitation not found',
      );
    });
  });

  describe('deleteInvitation', () => {
    it('should delete invitation and all indexes', async () => {
      const inv = makeInvitation();
      mockRedis.get.mockResolvedValueOnce(inv);

      const result = await adapter.deleteInvitation('tok-abc');
      expect(result).toBe(true);
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:invite:tok-abc');
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:invite:id:inv-1');
      expect(mockPipeline.srem).toHaveBeenCalledWith('auth:invites:all', 'tok-abc');
      expect(mockPipeline.srem).toHaveBeenCalledWith('auth:invites:pending', 'tok-abc');
    });

    it('should return false when not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      expect(await adapter.deleteInvitation('missing')).toBe(false);
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should delete expired and used invitations', async () => {
      const expired = makeInvitation({
        token: 'tok-exp',
        expiresAt: '2020-01-01T00:00:00.000Z',
      });
      const used = makeInvitation({
        token: 'tok-used',
        usedAt: '2026-01-02T00:00:00.000Z',
      });

      // getAllInvitations
      mockRedis.smembers.mockResolvedValueOnce(['tok-exp', 'tok-used']);
      mockPipeline.exec.mockResolvedValueOnce([expired, used]);

      // deleteInvitation calls (2 calls)
      mockRedis.get
        .mockResolvedValueOnce(expired)
        .mockResolvedValueOnce(used);

      const count = await adapter.cleanupExpiredInvitations();
      expect(count).toBe(2);
    });
  });

  // ========================================================================
  // Audit Operations
  // ========================================================================

  describe('logAuditEvent', () => {
    it('should create an event with a generated ID and store it', async () => {
      const { id, ...eventData } = makeAuditEvent();

      const result = await adapter.logAuditEvent(eventData);
      expect(result.id).toMatch(/^evt_/);
      expect(result.type).toBe(AuditEventType.LOGIN_SUCCESS);
      expect(mockPipeline.set).toHaveBeenCalled();
      expect(mockPipeline.zadd).toHaveBeenCalled();
    });
  });

  describe('getAuditEvents', () => {
    it('should filter by date range using ZRANGEBYSCORE', async () => {
      const event = makeAuditEvent();
      mockRedis.zrange.mockResolvedValueOnce([event.id]);
      mockPipeline.exec.mockResolvedValueOnce([event]);

      const start = new Date('2026-01-01');
      const end = new Date('2026-02-01');
      const result = await adapter.getAuditEvents({ startDate: start, endDate: end });

      expect(mockRedis.zrange).toHaveBeenCalledWith(
        'auth:audit:log',
        start.getTime(),
        end.getTime(),
        { byScore: true },
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by type in memory', async () => {
      const loginEvent = makeAuditEvent({ type: AuditEventType.LOGIN_SUCCESS });
      const logoutEvent = makeAuditEvent({
        id: 'evt_2',
        type: AuditEventType.LOGOUT,
      });

      mockRedis.zrange.mockResolvedValueOnce([loginEvent.id, logoutEvent.id]);
      mockPipeline.exec.mockResolvedValueOnce([loginEvent, logoutEvent]);

      const result = await adapter.getAuditEvents({
        type: AuditEventType.LOGIN_SUCCESS as string,
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(AuditEventType.LOGIN_SUCCESS);
    });

    it('should filter by userId', async () => {
      const event1 = makeAuditEvent({ userId: 'user-1' });
      const event2 = makeAuditEvent({ id: 'evt_2', userId: 'user-2' });

      mockRedis.zrange.mockResolvedValueOnce([event1.id, event2.id]);
      mockPipeline.exec.mockResolvedValueOnce([event1, event2]);

      const result = await adapter.getAuditEvents({ userId: 'user-1' });
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
    });

    it('should apply offset and limit', async () => {
      const events = Array.from({ length: 5 }, (_, i) =>
        makeAuditEvent({ id: `evt_${i}` }),
      );

      mockRedis.zrange.mockResolvedValueOnce(events.map((e) => e.id));
      mockPipeline.exec.mockResolvedValueOnce(events);

      const result = await adapter.getAuditEvents({ offset: 1, limit: 2 });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('evt_1');
      expect(result[1].id).toBe('evt_2');
    });

    it('should return empty array when no events', async () => {
      mockRedis.zrange.mockResolvedValueOnce([]);
      const result = await adapter.getAuditEvents({});
      expect(result).toEqual([]);
    });
  });

  describe('getRecentAuditEvents', () => {
    it('should return most recent events in reverse order', async () => {
      const event1 = makeAuditEvent({ id: 'evt_1' });
      const event2 = makeAuditEvent({ id: 'evt_2' });

      mockRedis.zrange.mockResolvedValueOnce(['evt_1', 'evt_2']);
      mockPipeline.exec.mockResolvedValueOnce([event1, event2]);

      const result = await adapter.getRecentAuditEvents(10);
      expect(result[0].id).toBe('evt_2');
      expect(result[1].id).toBe('evt_1');
    });

    it('should default to 100 limit', async () => {
      mockRedis.zrange.mockResolvedValueOnce([]);
      await adapter.getRecentAuditEvents();
      expect(mockRedis.zrange).toHaveBeenCalledWith('auth:audit:log', -100, -1);
    });
  });

  // ========================================================================
  // Custom prefix
  // ========================================================================

  describe('custom prefix', () => {
    it('should use custom prefix for all keys', async () => {
      const customAdapter = new RedisStorageAdapter({
        redis: mockRedis as any,
        prefix: 'myapp',
      });

      mockRedis.get.mockResolvedValueOnce(null);
      await customAdapter.getUser('123');
      expect(mockRedis.get).toHaveBeenCalledWith('myapp:user:123');
    });
  });
});
