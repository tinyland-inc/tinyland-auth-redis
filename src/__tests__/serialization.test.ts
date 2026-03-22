import { describe, it, expect } from 'vitest';
import { serialize, deserialize, toHashFields, fromHashFields } from '../serialization.js';

describe('serialize', () => {
  it('should serialize objects to JSON strings', () => {
    const obj = { name: 'Jen', role: 'admin' };
    expect(serialize(obj)).toBe('{"name":"Jen","role":"admin"}');
  });

  it('should handle nested objects', () => {
    const obj = { user: { id: '1', tags: ['a', 'b'] } };
    const result = serialize(obj);
    expect(JSON.parse(result)).toEqual(obj);
  });

  it('should handle null values in objects', () => {
    const obj = { name: 'test', value: null };
    expect(serialize(obj)).toBe('{"name":"test","value":null}');
  });
});

describe('deserialize', () => {
  it('should deserialize valid JSON strings', () => {
    const json = '{"name":"Jen","role":"admin"}';
    expect(deserialize<{ name: string; role: string }>(json)).toEqual({
      name: 'Jen',
      role: 'admin',
    });
  });

  it('should return null for null input', () => {
    expect(deserialize(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(deserialize(undefined)).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    expect(deserialize('not-json{')).toBeNull();
  });
});

describe('toHashFields', () => {
  it('should convert primitives to strings', () => {
    const result = toHashFields({ name: 'Jen', age: 30, active: true });
    expect(result).toEqual({ name: 'Jen', age: '30', active: 'true' });
  });

  it('should JSON-stringify nested objects', () => {
    const result = toHashFields({ meta: { foo: 'bar' }, tags: ['a', 'b'] });
    expect(result.meta).toBe('{"foo":"bar"}');
    expect(result.tags).toBe('["a","b"]');
  });

  it('should skip undefined values', () => {
    const result = toHashFields({ name: 'Jen', missing: undefined });
    expect(result).toEqual({ name: 'Jen' });
    expect('missing' in result).toBe(false);
  });

  it('should encode null as the string "null"', () => {
    const result = toHashFields({ value: null });
    expect(result.value).toBe('null');
  });
});

describe('fromHashFields', () => {
  it('should return null for null input', () => {
    expect(fromHashFields(null)).toBeNull();
  });

  it('should return null for empty object', () => {
    expect(fromHashFields({})).toBeNull();
  });

  it('should parse booleans', () => {
    const result = fromHashFields<{ active: boolean; locked: boolean }>({
      active: 'true',
      locked: 'false',
    });
    expect(result).toEqual({ active: true, locked: false });
  });

  it('should parse null strings', () => {
    const result = fromHashFields<{ value: null }>({ value: 'null' });
    expect(result).toEqual({ value: null });
  });

  it('should parse plain numbers', () => {
    const result = fromHashFields<{ count: number }>({ count: '42' });
    expect(result).toEqual({ count: 42 });
  });

  it('should preserve ISO date strings as strings', () => {
    const dateStr = '2026-03-08T12:00:00.000Z';
    const result = fromHashFields<{ createdAt: string }>({ createdAt: dateStr });
    expect(result?.createdAt).toBe(dateStr);
  });

  it('should parse nested JSON objects', () => {
    const result = fromHashFields<{ meta: { foo: string } }>({
      meta: '{"foo":"bar"}',
    });
    expect(result?.meta).toEqual({ foo: 'bar' });
  });

  it('should keep non-JSON strings as-is', () => {
    const result = fromHashFields<{ name: string }>({ name: 'Jen' });
    expect(result?.name).toBe('Jen');
  });
});
