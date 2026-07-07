import { describe, it, expect } from 'vitest';
import { cn, clamp, timeAgo } from './utils';

describe('cn', () => {
  it('joins truthy strings with spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('returns empty string when all values are falsy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});

describe('clamp', () => {
  it('returns the value when it is within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min when value is below range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max when value is above range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles min equal to max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });
});

describe('timeAgo', () => {
  it('returns empty string for an invalid date string', () => {
    expect(timeAgo('not-a-date')).toBe('');
  });

  it('returns "just now" for a timestamp less than a minute ago', () => {
    const iso = new Date(Date.now() - 10_000).toISOString();
    expect(timeAgo(iso)).toBe('just now');
  });

  it('returns minutes for a timestamp under an hour ago', () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeAgo(iso)).toBe('5m ago');
  });

  it('returns hours for a timestamp under a day ago', () => {
    const iso = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(timeAgo(iso)).toBe('3h ago');
  });

  it('returns days for a timestamp under a month ago', () => {
    const iso = new Date(Date.now() - 5 * 86_400_000).toISOString();
    expect(timeAgo(iso)).toBe('5d ago');
  });
});
