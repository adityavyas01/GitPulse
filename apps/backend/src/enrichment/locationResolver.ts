import { LOCATION_CATALOG } from './locationCatalog.js';
import type { LocationRecord, LocationResolutionResult } from './types.js';

/**
 * Normalizes a free-form profile location string for lookup:
 * lowercase, trim, collapse whitespace, strip trailing region qualifiers
 * like ", country" only when the remainder still uniquely matches.
 * Deterministic — no guessing, no fuzzy matching beyond exact normalized hits.
 */
export function normalizeLocationString(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*[,;]\s*/g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/[.,;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves a self-reported profile location string (SRS §8).
 * States: RESOLVED / AMBIGUOUS / MISSING / INVALID.
 * Never invents coordinates and never substitutes a nearby city.
 */
export function resolveLocation(rawLocation: string | null | undefined): LocationResolutionResult {
  if (rawLocation === null || rawLocation === undefined) {
    return { state: 'MISSING' };
  }

  const normalized = normalizeLocationString(rawLocation);
  if (normalized.length === 0) {
    return { state: 'INVALID' };
  }

  const matches = lookup(normalized);

  if (matches.length === 1) {
    return { state: 'RESOLVED', location: matches[0] };
  }
  if (matches.length > 1) {
    return { state: 'AMBIGUOUS', candidates: matches };
  }
  return { state: 'MISSING' };
}

function lookup(normalized: string): LocationRecord[] {
  const byCity = LOCATION_CATALOG.filter(
    (loc) => normalizeLocationString(loc.city) === normalized
  );
  if (byCity.length > 0) {
    return byCity;
  }

  const aliasHit = findAlias(normalized);
  if (aliasHit) {
    return [aliasHit];
  }

  // "city, country" form — accept when the city part uniquely matches
  // AND the country is consistent with the catalog entry.
  // "city region" (comma-less) two-part form — e.g. "lyon france",
  // "chennai tamil nadu". Accept only when the full string has no direct
  // alias and the city part uniquely matches the catalog.
  // "city, region, country" forms of any depth ("hangzhou, zhejiang,
  // china") — first part is the city, last part the country qualifier.
  const parts = normalized.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1 && /\s/.test(normalized) && !/[/|&+]/.test(normalized)) {
    const tokens = normalized.split(' ');
    for (let take = tokens.length - 1; take >= 1; take--) {
      const cityPart = tokens.slice(0, take).join(' ');
      const cityMatches = LOCATION_CATALOG.filter(
        (loc) => normalizeLocationString(loc.city) === cityPart
      );
      if (cityMatches.length === 1) {
        return cityMatches;
      }
    }
  }
  if (parts.length >= 2) {
    const cityPart = parts[0];
    const countryPart = parts[parts.length - 1];
    const byCityCountry = LOCATION_CATALOG.filter(
      (loc) =>
        normalizeLocationString(loc.city) === cityPart &&
        normalizeLocationString(loc.country) === countryPart
    );
    if (byCityCountry.length === 1) {
      return byCityCountry;
    }
    // City-only match with conflicting country → ambiguous.
    const cityMatches = LOCATION_CATALOG.filter(
      (loc) => normalizeLocationString(loc.city) === cityPart
    );
    // Qualifier that is not a catalog country ("chennai, tamil nadu") —
    // resolve only when an explicit alias covers city+qualifier; a bare
    // contradiction ("paris, texas" ≠ Paris, France) stays unresolved.
    // Coordinates always come from the catalog, never from the qualifier.
    if (cityMatches.length === 1) {
      if (ALIAS_MAP.has(normalized.replace(/,\s*/g, ' '))) {
        return cityMatches;
      }
    } else if (cityMatches.length > 1) {
      return cityMatches;
    }
  }

  return [];
}

const ALIAS_MAP = buildAliasMap();

function findAlias(normalized: string): LocationRecord | null {
  const id = ALIAS_MAP.get(normalized);
  if (!id) return null;
  return LOCATION_CATALOG.find((loc) => loc.id === id) ?? null;
}

function buildAliasMap(): Map<string, string> {
  const map = new Map<string, string>();
  map.set('san francisco bay area', 'sfo');
  map.set('sf', 'sfo');
  map.set('bay area', 'sfo');
  map.set('new york city', 'nyc');
  map.set('nyc', 'nyc');
  map.set('bangalore', 'blr');
  map.set('bengaluru', 'blr');
  map.set('london uk', 'lon');
  map.set('tokyo japan', 'tok');
  map.set('toronto ontario', 'tor');
  // Experiment-derived aliases (data/experiments/github/2026-09-12).
  map.set('sf', 'sfo');
  map.set('san francisco bay area', 'sfo');
  map.set('bay area', 'sfo');
  map.set('new york city', 'nyc');
  map.set('nyc', 'nyc');
  map.set('seoul kr', 'sel');
  map.set('republic of korea seoul', 'sel');
  map.set('wuhan china', 'wuh');
  map.set('shanghai china', 'sha');
  map.set('guangzhou prc', 'can');
  map.set('guangzhou china', 'can');
  map.set('pune', 'pnq');
  map.set('coimbatore', 'maa');
  map.set('chennai tamil nadu', 'maa');
  map.set('chennai india', 'maa');
  map.set('tamil nadu india', 'maa');
  map.set('new delhi india', 'del');
  map.set('rajkot gujarat', 'raj');
  map.set('mymensingh bangladesh', 'dha');
  map.set('feni bangladesh', 'dha');
  map.set('iran tehran', 'ist');
  map.set('washtington dc', 'was');
  map.set('washington dc', 'was');
  map.set('cambridge ma', 'bos');
  map.set('montreal', 'yul');
  map.set('ottawa', 'yow');
  map.set('lyon france', 'lyo');
  map.set('buenos aires argentina', 'bue');
  map.set('lima peru', 'lim');
  map.set('ho chi minh city vietnam', 'sgn');
  map.set('jakarta indonesia', 'jkt');
  map.set('istanbul turkey', 'ist');
  map.set('russia moscow', 'mow');
  map.set('zurich switzerland', 'zrh');
  map.set('erlenbach zh', 'zrh');
  // 'ł' has no NFKD decomposition, so the Polish spelling needs an
  // explicit alias rather than normalization.
  map.set('wrocław', 'wro');
  map.set('abu dhabi uae', 'auh');
  map.set('groningen the netherlands', 'gro');
  // US "city, state" qualifier forms observed in the sample — explicit
  // aliases; no algorithmic contradiction detection exists, so a bare
  // mismatch ("paris, texas") deliberately stays unresolved.
  map.set('seattle wa', 'sea');
  map.set('san francisco usa', 'sfo');
  map.set('san francisco united states', 'sfo');
  map.set('san francisco us', 'sfo');
  map.set('london england', 'lon');
  map.set('london uk', 'lon');
  map.set('seattle washington', 'sea');
  map.set('chicago il', 'chi');
  map.set('chicago illinois', 'chi');
  map.set('atlanta ga', 'atl');
  map.set('atlanta georgia', 'atl');
  map.set('los angeles ca', 'lax');
  map.set('los angeles california', 'lax');
  map.set('pittsburgh pa', 'pgh');
  map.set('pittsburgh pennsylvania', 'pgh');
  map.set('columbus ohio', 'cmh');
  map.set('charlotte nc', 'clt');
  map.set('charlotte north carolina', 'clt');
  map.set('pune india', 'pnq');
  map.set('pune', 'pnq');
  map.set('rajkot', 'raj');
  map.set('visakhapatnam', 'del');
  map.set('ibadan oyo state nigeria', 'ibd');
  map.set('goma dr congo', 'los');
  return map;
}
