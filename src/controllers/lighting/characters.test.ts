import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { characterLightFor } from './characters';
import { GameOptions } from '@/controllers/settings/gameOptions';

const was = GameOptions.lightingQuality;
afterEach(() => {
  GameOptions.lightingQuality = was;
});

describe('character lights', () => {
  it("keeps the Poison Shadow's glow steady: its sprites are drawn at Luminosity 1 (ZzzCharacter.cpp:11308-11318)", () => {
    GameOptions.lightingQuality = 1;
    expect(characterLightFor(39)?.pulse).toBeUndefined();
  });

  it("rerolls the Scorpion's tail lamp every frame, `(rand() % 8 + 2) * 0.1` (ZzzCharacter.cpp:5698, :6149-6155)", () => {
    GameOptions.lightingQuality = 1;
    const lamp = characterLightFor(27);
    expect(lamp?.pulse).toBeUndefined();
    expect(lamp?.flicker).toEqual({ min: 0.2, max: 0.9, steps: 8 });
    expect(lamp?.flickerSmoothing).toBe(1);
    expect(lamp?.color).toEqual([1, 0.4, 0.2]);
  });

  it("lets a RenderLight carrier breathe with its card (ZzzCharacter.cpp:8249)", () => {
    GameOptions.lightingQuality = 1;
    expect(characterLightFor(45)?.pulse).toBeDefined();
  });
});
