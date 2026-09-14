import { describe, expect, it } from 'vitest';

import { LOCATION_CATALOG } from '../src/enrichment/locationCatalog.js';
import { normalizeLocationString, resolveLocation } from '../src/enrichment/locationResolver.js';

describe('expanded location catalog (2026-09-12 experiment)', () => {
  it('expanded the catalog from 12 to the experiment-informed set', () => {
    expect(LOCATION_CATALOG.length).toBeGreaterThan(12);
  });

  it('keeps every entry authoritative: id, city, country, finite coordinates', () => {
    const ids = new Set<string>();
    for (const loc of LOCATION_CATALOG) {
      expect(loc.id.length).toBeGreaterThan(0);
      expect(loc.city.length).toBeGreaterThan(0);
      expect(loc.country.length).toBeGreaterThan(0);
      expect(Number.isFinite(loc.latitude)).toBe(true);
      expect(Number.isFinite(loc.longitude)).toBe(true);
      expect(ids.has(loc.id)).toBe(false);
      ids.add(loc.id);
    }
  });

  it('resolves cities observed in the experiment sample', () => {
    const samples: Array<[string, string]> = [
      ['Barcelona', 'bcn'],
      ['Madrid', 'mad'],
      ['Chennai , Tamil Nadu', 'maa'],
      ['PUNE', 'pnq'],
      ['New Delhi, India', 'del'],
      ['Dhaka', 'dha'],
      ['Seoul, KR', 'sel'],
      ['Shanghai', 'sha'],
      ['Guangzhou, China', 'can'],
      ['Wuhan China', 'wuh'],
      ['Hangzhou, Zhejiang, China', 'hgh'],
      ['Taipei, Taiwan', 'tpe'],
      ['Ho Chi Minh City, Vietnam', 'sgn'],
      ['Jakarta, Indonesia', 'jkt'],
      ['Istanbul, Turkey', 'ist'],
      ['Tel Aviv, Israel', 'tlv'],
      ['Abu Dhabi , UAE', 'auh'],
      ['Cairo', 'cai'],
      ['Bucharest', 'otp'],
      ['Warsaw', 'waw'],
      ['Wrocław', 'wro'],
      ['Stockholm', 'sto'],
      ['Lisbon', 'lis'],
      ['Porto', 'opo'],
      ['Lyon - France', 'lyo'],
      ['Zürich, Switzerland', 'zrh'],
      ['Munich', 'muc'],
      ['Dortmund, Germany', 'dtm'],
      ['The Hague', 'hag'],
      ['Groningen, The Netherlands', 'gro'],
      ['Poznan, Poland', 'poz'],
      ['Seattle, WA', 'sea'],
      ['Chicago, IL', 'chi'],
      ['Atlanta, GA', 'atl'],
      ['Dallas', 'dfw'],
      ['Los Angeles, CA', 'lax'],
      ['Boston', 'bos'],
      ['Pittsburgh, PA', 'pgh'],
      ['Columbus, Ohio', 'cmh'],
      ['Charlotte, NC', 'clt'],
      ['Ottawa', 'yow'],
      ['Bristol', 'brs'],
      ['Montreal', 'yul']
    ];
    for (const [raw, expectedId] of samples) {
      const r = resolveLocation(raw);
      expect(r.state, raw).toBe('RESOLVED');
      expect(r.state === 'RESOLVED' && r.location.id, raw).toBe(expectedId);
    }
  });

  it('keeps country-only locations unresolved (never mapped to a city)', () => {
    for (const raw of ['India', 'Japan', 'Portugal', 'Canada', 'The Netherlands', 'CHINA', 'USA', 'NZ', 'Europe']) {
      const r = resolveLocation(raw);
      expect(r.state, raw).not.toBe('RESOLVED');
    }
  });

  it('keeps invalid/junk and non-geographic strings unresolved', () => {
    for (const raw of ['~', 'Cloud', 'Guam (UTC+10)', 'The Cyan hill', 'Europe, Germany']) {
      const r = resolveLocation(raw);
      expect(r.state, raw).not.toBe('RESOLVED');
    }
  });

  it('treats genuinely ambiguous multi-city strings as ambiguous, not resolved', () => {
    const r = resolveLocation('London / San Francisco');
    expect(r.state).not.toBe('RESOLVED');
  });

  it('normalization remains deterministic for diacritics and casing', () => {
    expect(normalizeLocationString('Montréal')).toBe('montreal');
    // 'ł' (U+0142) has no NFKD decomposition — stays literal, by design.
    expect(normalizeLocationString('Wrocław')).toBe('wrocław');
    expect(normalizeLocationString('Florianópolis, Santa Catarina, Brazil')).toBe(
      'florianopolis, santa catarina, brazil'
    );
  });
});
