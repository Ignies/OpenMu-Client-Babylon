import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Entity } from '@/ecs/world';

const seen = vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
  return { sounds: [] as string[], shards: 0 };
});
vi.mock('@/controllers/sound', async orig => ({
  ...(await orig<object>()),
  playSfx: (key: string) => seen.sounds.push(key),
}));
vi.mock('@/controllers/fx', async orig => ({
  ...(await orig<object>()),
  spawnCrystalShards: () => void seen.shards++,
}));

// Loads and registers every skill (the entry the goldens use: it keeps the import cycle in order).
import '../skillVisuals';
import { cancelledEffects } from '@/controllers/skills';

const DEFENSE = 2;
const WIZ_DEFENSE = 4;
const scene = new Scene(new NullEngine());
const body = (npcType: number | undefined, buffs: number[], player = false) =>
  ({ npcType, buffs: new Set(buffs), transform: { pos: new Vector3() }, ...(player && { playerAnimation: {} }) }) as unknown as Entity;

beforeEach(() => {
  seen.sounds.length = 0;
  seen.shards = 0;
});

// ReceiveMagicFinish's 201 / 202 (WSclient.cpp:3955-3962) run SetActionDestroy_Def first
// (GMHellas.cpp:740-755): the Soul Barrier, else the Defense, breaks off a monster with a crystal
// burst where RenderDestroy_Def draws it (MODEL_SHRIKER, MODEL_DEATH_CENTURION at SubType 9).
describe('Magic and Physical Attack Immunity cancels', () => {
  it('break the Soul Barrier off a Kalima Illusion of Kundun, then drop their own buff', () => {
    expect(cancelledEffects(201, scene, body(161, [DEFENSE, WIZ_DEFENSE]))).toEqual([WIZ_DEFENSE, DEFENSE]);
    expect(seen).toEqual({ sounds: ['Sound/eHitCristal'], shards: 1 });
  });

  it('break the Defense when there is no Soul Barrier', () => {
    expect(cancelledEffects(202, scene, body(145, [DEFENSE]))).toEqual([DEFENSE, WIZ_DEFENSE]);
    expect(cancelledEffects(201, scene, body(161, [DEFENSE]))).toEqual([DEFENSE]);
    expect(seen.shards).toBe(2);
  });

  it('drop the buffs without the burst on other bodies, and leave players alone', () => {
    expect(cancelledEffects(201, scene, body(0, [WIZ_DEFENSE]))).toEqual([WIZ_DEFENSE, DEFENSE]);
    expect(cancelledEffects(201, scene, body(undefined, [WIZ_DEFENSE], true))).toEqual([DEFENSE]);
    expect(cancelledEffects(202, scene, body(161, []))).toEqual([WIZ_DEFENSE]);
    expect(seen).toEqual({ sounds: [], shards: 0 });
  });

  it('other skills drop only their effect', () => {
    expect(cancelledEffects(27, scene, body(161, [DEFENSE, WIZ_DEFENSE]))).toEqual([DEFENSE]);
    expect(cancelledEffects(384, scene, null)).toEqual([55]);
    expect(cancelledEffects(9, scene, null)).toEqual([]);
  });
});
