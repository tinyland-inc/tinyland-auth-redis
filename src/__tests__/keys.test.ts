import { describe, it, expect } from 'vitest';
import { createKeys } from '../keys.js';

describe('createKeys', () => {
  const keys = createKeys('auth');

  describe('user keys', () => {
    it('should generate user key', () => {
      expect(keys.user('abc-123')).toBe('auth:user:abc-123');
    });

    it('should generate user handle index key', () => {
      expect(keys.userHandle('jen')).toBe('auth:user:handle:jen');
    });

    it('should generate user email index key', () => {
      expect(keys.userEmail('jen@example.com')).toBe('auth:user:email:jen@example.com');
    });

    it('should generate users:all set key', () => {
      expect(keys.usersAll()).toBe('auth:users:all');
    });
  });

  describe('session keys', () => {
    it('should generate session key', () => {
      expect(keys.session('sess-1')).toBe('auth:session:sess-1');
    });

    it('should generate sessions-by-user sorted set key', () => {
      expect(keys.sessionsByUser('user-1')).toBe('auth:sessions:user:user-1');
    });
  });

  describe('totp and backup keys', () => {
    it('should generate totp key', () => {
      expect(keys.totp('jen')).toBe('auth:totp:jen');
    });

    it('should generate backup key', () => {
      expect(keys.backup('user-1')).toBe('auth:backup:user-1');
    });
  });

  describe('invitation keys', () => {
    it('should generate invite key by token', () => {
      expect(keys.invite('tok-abc')).toBe('auth:invite:tok-abc');
    });

    it('should generate invite ID lookup key', () => {
      expect(keys.inviteById('inv-1')).toBe('auth:invite:id:inv-1');
    });

    it('should generate invites:all set key', () => {
      expect(keys.invitesAll()).toBe('auth:invites:all');
    });

    it('should generate invites:pending set key', () => {
      expect(keys.invitesPending()).toBe('auth:invites:pending');
    });
  });

  describe('audit keys', () => {
    it('should generate audit event key', () => {
      expect(keys.audit('evt-1')).toBe('auth:audit:evt-1');
    });

    it('should generate audit log sorted set key', () => {
      expect(keys.auditLog()).toBe('auth:audit:log');
    });
  });

  describe('custom prefix', () => {
    it('should use a custom prefix', () => {
      const customKeys = createKeys('myapp');
      expect(customKeys.user('123')).toBe('myapp:user:123');
      expect(customKeys.session('s1')).toBe('myapp:session:s1');
      expect(customKeys.auditLog()).toBe('myapp:audit:log');
    });
  });
});
