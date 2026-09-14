import { describe, expect, it } from 'vitest';

import { resolveLocation, normalizeLocationString } from '../src/enrichment/locationResolver.js';

describe('normalizeLocationString', () => {
  it('lowercases, trims, collapses whitespace and strips punctuation', () => {
    expect(normalizeLocationString('  Bengaluru,   India!! ')).toBe('bengaluru, india!!');
    expect(normalizeLocationString('San Francisco, CA.')).toBe('san francisco, ca');
  });

  it('strips diacritics deterministically', () => {
    expect(normalizeLocationString('São Paulo')).toBe('sao paulo');
  });
});

describe('resolveLocation', () => {
  it('RESOLVES a known city exactly', () => {
    const result = resolveLocation('Bengaluru');
    expect(result).toEqual({
      state: 'RESOLVED',
      location: { id: 'blr', city: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946 }
    });
  });

  it('RESOLVES city, country form', () => {
    const result = resolveLocation('Tokyo, Japan');
    expect(result.state).toBe('RESOLVED');
    if (result.state === 'RESOLVED') {
      expect(result.location.id).toBe('tok');
    }
  });

  it('RESOLVES supported aliases like Bangalore', () => {
    const result = resolveLocation('Bangalore');
    expect(result.state).toBe('RESOLVED');
    if (result.state === 'RESOLVED') {
      expect(result.location.id).toBe('blr');
    }
  });

  it('returns MISSING for null/undefined', () => {
    expect(resolveLocation(null)).toEqual({ state: 'MISSING' });
    expect(resolveLocation(undefined)).toEqual({ state: 'MISSING' });
  });

  it('returns INVALID for blank strings', () => {
    expect(resolveLocation('   ')).toEqual({ state: 'INVALID' });
  });

  it('returns MISSING for unknown locations — never fabricates coordinates', () => {
    const result = resolveLocation('Atlantis, Pacific Ocean');
    expect(result.state).toBe('MISSING');
    expect(result).not.toHaveProperty('location');
  });

  it('never substitutes a nearby city', () => {
    const result = resolveLocation('Mumbai');
    expect(result.state).toBe('MISSING');
  });
});
