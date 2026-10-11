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
});
