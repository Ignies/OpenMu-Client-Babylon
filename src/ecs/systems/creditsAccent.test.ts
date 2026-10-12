import { describe, expect, it, vi } from 'vitest';
import type { Entity } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { wantsCreditsAccent } = await import('./creditsAccent');

const credited = (name: string) => name.toLowerCase() === 'ignies';
const player = (name: string | undefined, buffs: number[] = [], localPlayer = false) =>
  ({ objectNameInWorld: name, buffs: new Set(buffs), ...(localPlayer && { localPlayer: true }) }) as unknown as Entity;

describe('wantsCreditsAccent', () => {
  it('credits a character whose name is a contributor', () => {
    expect(wantsCreditsAccent(player('Ignies'), '', credited)).toBe(true);
    expect(wantsCreditsAccent(player('Someone'), '', credited)).toBe(false);
  });

  it('names the hero from the hero module when the entity has none', () => {
    expect(wantsCreditsAccent(player(undefined, [], true), 'Ignies', credited)).toBe(true);
    expect(wantsCreditsAccent(player(undefined), 'Ignies', credited)).toBe(false);
  });

  it('leaves monsters and NPCs alone', () => {
    expect(wantsCreditsAccent({ ...player('Ignies'), npcType: 1 } as Entity, '', credited)).toBe(false);
  });

  it('shows nothing while cloaked', () => {
    expect(wantsCreditsAccent(player('Ignies', [18]), '', credited)).toBe(false);
  });
});
