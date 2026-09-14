import { describe, expect, it } from 'vitest';

import { normalizeLanguage, isKnownLanguage } from '../src/enrichment/language.js';

describe('normalizeLanguage', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeLanguage('  Python  ')).toBe('python');
    expect(normalizeLanguage('TypeScript')).toBe('typescript');
  });

  it('returns null for missing metadata — never fabricates', () => {
    expect(normalizeLanguage(null)).toBeNull();
    expect(normalizeLanguage(undefined)).toBeNull();
    expect(normalizeLanguage('')).toBeNull();
    expect(normalizeLanguage('   ')).toBeNull();
  });

  it('passes through unknown-but-present languages normalized', () => {
    expect(normalizeLanguage('Brainfuck')).toBe('brainfuck');
  });
});

describe('isKnownLanguage', () => {
  it('recognizes documented languages', () => {
    expect(isKnownLanguage('python')).toBe(true);
    expect(isKnownLanguage('c++')).toBe(true);
  });

  it('rejects null and unknown values', () => {
    expect(isKnownLanguage(null)).toBe(false);
    expect(isKnownLanguage('brainfuck')).toBe(false);
  });
});
