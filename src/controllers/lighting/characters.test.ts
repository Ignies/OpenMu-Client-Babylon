import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { characterLightFor } from './characters';
import { GameOptions } from '@/modules/options/gameOptions';

const was = GameOptions.lightingQuality;
afterEach(() => {
  GameOptions.lightingQuality = was;
});

describe('character lights', () => {
  it("keeps the Poison Shadow's glow steady: its sprites are drawn at Luminosity 1 (ZzzCharacter.cpp:11308-11318)", () => {
    GameOptions.lightingQuality = 1;
    expect(characterLightFor(39)?.pulse).toBeUndefined();
  });

  it("lets a RenderLight carrier breathe with its card (ZzzCharacter.cpp:8249)", () => {
    GameOptions.lightingQuality = 1;
    expect(characterLightFor(45)?.pulse).toBeDefined();
  });
});
