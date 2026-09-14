import { describe, expect, it } from 'vitest';

import { filtersToQuery } from './globeActivity.js';

// Week 11: filters serialize to the documented /api/activity parameters
// (API_CONTRACT.md: language, activityType). 'all' means unfiltered and
// must not produce a parameter.
describe('filtersToQuery (Week 11)', () => {
  it('emits nothing for empty or all-values filters', () => {
    expect(filtersToQuery()).toBe('');
    expect(filtersToQuery({})).toBe('');
    expect(filtersToQuery({ language: 'all', activityType: 'all' })).toBe('');
  });

  it('serializes language and activityType', () => {
    const qs = filtersToQuery({ language: 'python', activityType: 'PUSH' });
    const params = new URLSearchParams(qs.replace(/^\?/, ''));
    expect(params.get('language')).toBe('python');
    expect(params.get('activityType')).toBe('PUSH');
  });

  it('combined filters keep both parameters', () => {
    const qs = filtersToQuery({ language: 'rust', activityType: 'PULL_REQUEST' });
    expect(qs).toContain('language=rust');
    expect(qs).toContain('activityType=PULL_REQUEST');
  });
});
