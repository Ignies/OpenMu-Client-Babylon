import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Events } from '@/core/eventBus/events';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { spawnsFor } = await import('.');

const hit = { entity: {}, healthDamage: 120, shieldDamage: 0, kind: 0, isDouble: false, isTriple: false } as unknown as Events['objectDamaged'];

// The original's numbers move and run out in its logic, seen or not (CreatePoint / MovePoints).
describe('damage numbers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('makes none while the page is hidden: they would all rise together when it shows', () => {
    vi.stubGlobal('document', { hidden: true });
    expect(spawnsFor(hit, false)).toEqual([]);
    vi.stubGlobal('document', { hidden: false });
    expect(spawnsFor(hit, false)).toHaveLength(1);
  });
});
