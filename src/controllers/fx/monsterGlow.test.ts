import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '../render/babylon/exports';
import type { Entity, World } from '../../ecs/world';
import { Ecs } from '../../ecs/current';

// Every card drawn, with the colour it was last painted.
const sprites = vi.hoisted(() => [] as { color: { r: number } }[]);

vi.mock('@/controllers/assets/mu', () => ({ downloadDataFile: async () => new Uint8Array(32) }));
vi.mock('../render/babylon/exports', () => {
  class Color4 {
    constructor(public r = 0, public g = 0, public b = 0, public a = 1) {}
    set(r: number, g: number, b: number, a: number) {
      return Object.assign(this, { r, g, b, a });
    }
  }
  class Vector3 {
    set() {
      return this;
    }
  }
  class SpriteManager {
    dispose() {}
  }
  class Sprite {
    position = { copyFrom() {} };
    color = new Color4();
    constructor() {
      sprites.push(this);
    }
    dispose() {}
  }
  return { Color4, Constants: { ALPHA_ONEONE: 1, ALPHA_SUBTRACT: 2 }, Sprite, SpriteManager, Vector3 };
});
vi.mock('./core', () => ({ boneLocalPos: () => {}, entityGone: () => false, spriteLevel: (_s: unknown, c: unknown) => c }));
vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:sheet');

const { glowMonster, monsterGlowFor, monsterGlowLayer } = await import('./monsterGlow');

/** Sets the world's clock, the original's `WorldTime`, to `ms`. */
const worldAt = (ms: number) =>
  void (Ecs.world = { gameTime: { TotalGameTime: { TotalSeconds: ms / 1000 } } } as unknown as World);

const monster = () => ({ modelObject: { OutOfView: false } }) as unknown as Entity;

describe('monster glows', () => {
  // `RenderLight` breathes `sinf(WorldTime * 0.002f) * 0.3f + 0.7f` (ZzzCharacter.cpp:8457): the world's clock
  // (ZzzAI.cpp:728), as its floor light does (`lighting/characters.ts`), not the glow's own age.
  it('breathe on the world clock, alike however far apart the monsters came', async () => {
    const scene = {} as Scene;
    const [lure] = monsterGlowFor(45) ?? [];
    worldAt(1000);
    glowMonster(scene, monster(), lure);
    // The sheets load meanwhile; the first glow takes its cards on the next frame.
    await new Promise(resolve => setTimeout(resolve, 0));
    worldAt(1700);
    monsterGlowLayer.update?.(0, 0.7);
    worldAt(9000);
    glowMonster(scene, monster(), lure);
    worldAt(9400);
    monsterGlowLayer.update?.(0, 0.4);
    const lumi = Math.sin(9400 * 0.002) * 0.3 + 0.7;
    expect(sprites.map(s => s.color.r)).toEqual(Array(4).fill(expect.closeTo(lumi)));
    monsterGlowLayer.reset?.();
  });

  // Draw_RenderObject's Christmas NPCs (ZzzObject.cpp:1910-1945): steady BITMAP_LIGHT cards on their bones.
  it('light Santa Claus on bones 4, 13 and 38 and the Snowman on 7 and 34', () => {
    const rows = (type: number) => monsterGlowFor(type)?.map(g => [g.bones, g.cards.map(c => [c.tex, c.scale]), g.colour, g.breathe]);
    expect(rows(465)).toEqual([
      [[4], [['flare', 8]], [1, 0.8, 0.2], false],
      [[13], [['flare', 5]], [1, 0.4, 0], false],
      [[38], [['flare', 2]], [1, 0.8, 0.2], false],
    ]);
    expect(rows(467)).toEqual([
      [[7], [['flare', 6], ['flare', 4]], [0.8, 0.8, 0.9], false],
      [[34], [['flare', 2]], [1, 0.8, 0.2], false],
    ]);
  });
});

describe('a swelling card', () => {
  // Kundun's bone 100 flare: `CreateSprite(BITMAP_FLARE_BLUE, p, 1.2f + sinf(WorldTime * 0.001f) * 0.3f, ...)`
  // (GMHellas.cpp:1621): its size, not its light, follows the world clock.
  it('takes its size from the world clock', async () => {
    const glow = { bones: [], spots: [{ bone: 100, tex: 'flareBlue' as const, scale: 1.2 }], cards: [], colour: [1, 1, 1] as const, breathe: false, luminosity: 1, swellSpeed: 0.001, swellAmount: 0.3 };
    worldAt(1000);
    sprites.length = 0;
    glowMonster({} as Scene, monster(), glow);
    await new Promise(resolve => setTimeout(resolve, 0));
    worldAt(2500);
    monsterGlowLayer.update?.(0, 1.5);
    const card = sprites[sprites.length - 1] as unknown as { width: number };
    expect(card.width).toBeCloseTo((64 * (1.2 + Math.sin(2500 * 0.001) * 0.3)) / 100);
    monsterGlowLayer.reset?.();
  });
});

describe('a lifted, turning card', () => {
  // Selupan's lights: `Light = base + (sinf(WorldTime * 0.004f) + 1) * 0.25f` on each channel, and a card turned
  // `WorldTime * 0.08f` degrees (GM_Raklion.cpp:2004-2023).
  it('adds the lift to its light and turns on the world clock', async () => {
    const glow = { bones: [], spots: [{ bone: 70, tex: 'flare' as const, scale: 2, spin: 0.08 }], cards: [], colour: [0.3, 0.6, 1] as const, breathe: false, luminosity: 1, liftSpeed: 0.004, liftAmount: 0.25, liftBase: 0.25 };
    worldAt(1000);
    sprites.length = 0;
    glowMonster({} as Scene, monster(), glow);
    await new Promise(resolve => setTimeout(resolve, 0));
    worldAt(2000);
    monsterGlowLayer.update?.(0, 1);
    const card = sprites[sprites.length - 1] as unknown as { color: { r: number }; angle: number };
    const lift = Math.sin(2000 * 0.004) * 0.25 + 0.25;
    expect(card.color.r).toBeCloseTo(0.3 + lift);
    expect(card.angle).toBeCloseTo(((2000 * 0.08) * Math.PI) / 180);
    monsterGlowLayer.reset?.();
  });
});
