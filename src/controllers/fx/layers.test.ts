import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { EFFECT_LAYERS } = await import('./layers');

// Evil Spirit, the only skill that spawned a screen shroud, draws none (ZzzCharacter.cpp:4584-4604).
describe('the effect layers', () => {
  it('have no shroud', () => {
    expect(EFFECT_LAYERS.map(layer => layer.name)).not.toContain('shroud');
  });
});
