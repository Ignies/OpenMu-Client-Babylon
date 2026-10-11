import { describe, expect, it, vi } from 'vitest';
import type { Entity } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { wantsContributorMark } = await import('./contributorMark');

const marked = (name: string) => name.toLowerCase() === 'ignies';
const player = (name: string | undefined, buffs: number[] = [], localPlayer = false) =>
  ({ objectNameInWorld: name, buffs: new Set(buffs), ...(localPlayer && { localPlayer: true }) }) as unknown as Entity;

// The credits' contributor mark: a character named like a contributor wears the halo and aura.
describe('wantsContributorMark', () => {
  it('marks a character whose name is a contributor', () => {
    expect(wantsContributorMark(player('Ignies'), '', marked)).toBe(true);
    expect(wantsContributorMark(player('Someone'), '', marked)).toBe(false);
  });

  it('names the hero from the hero module when the entity has none', () => {
    expect(wantsContributorMark(player(undefined, [], true), 'Ignies', marked)).toBe(true);
    expect(wantsContributorMark(player(undefined), 'Ignies', marked)).toBe(false);
  });

  it('leaves monsters and NPCs alone', () => {
    expect(wantsContributorMark({ ...player('Ignies'), npcType: 1 } as Entity, '', marked)).toBe(false);
  });

  it('shows nothing while cloaked', () => {
    expect(wantsContributorMark(player('Ignies', [18]), '', marked)).toBe(false);
  });
});
