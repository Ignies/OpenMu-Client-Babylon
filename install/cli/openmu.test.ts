import { describe, expect, it } from 'vitest';
import { OPENMU_MAIN, openmuSourceKind } from './openmu';

describe('openmuSourceKind', () => {
  it('tells a release, the main branch and a fixed ref apart', () => {
    expect(openmuSourceKind({ openmuSourceRef: '' })).toBe('release');
    expect(openmuSourceKind({ openmuSourceRef: OPENMU_MAIN })).toBe('main');
    expect(openmuSourceKind({ openmuSourceRef: 'f676dd259bbf' })).toBe('source');
  });
});
