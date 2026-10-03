import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { ENUM_WORLD } from '@/core/types';
import { lighting } from '@/controllers/lighting';
import type { Entity } from '@/ecs/world';
import { GameOptions } from '@/modules/options/gameOptions';
import { LIGHTING_QUALITY_MAX } from '@/controllers/lighting/lightingQuality';
import { combat } from '@/controllers/combat';
import {
  clearBuffVisuals,
  playAreaSkillVisual,
  playBowShotVisual,
  playTargetedSkillVisual,
  setBuffVisual,
  skillVisualCount,
} from './skillVisuals';

// Characterization net for the skill split: what every skill id spawns and lights,
// recorded headless. A change in this snapshot means a skill now looks different.

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
  // Data/ is not there under Node: a fetch never answers, so no texture or name loader rejects later.
  g.fetch = () => new Promise(() => {});
});

const round = (n: number) => Math.round(n * 1000) / 1000;
function summarize(v: unknown, depth = 0): unknown {
  if (typeof v === 'number') return round(v);
  if (typeof v === 'function') return 'fn';
  if (v instanceof Vector3) return [round(v.x), round(v.y), round(v.z)];
  if (v === null || typeof v !== 'object') return v;
  if (depth > 2) return 'obj';
  if (Array.isArray(v)) return v.slice(0, 8).map(x => summarize(x, depth + 1));
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v).sort()) out[k] = summarize((v as Record<string, unknown>)[k], depth + 1);
  return out;
}

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const absorb: unknown = new Proxy(function () {}, { get: (_t, k) => (k === 'alive' ? false : absorb), apply: () => absorb });

let trace: unknown[] = [];

describe('skill visuals golden trace', () => {
  let engine: NullEngine;
  let scene: Scene;
  const realRandom = Math.random;

  beforeAll(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
    const realSpawn = effects.spawn.bind(effects);
    vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: Scene, at: Vector3, opts: never) => {
      trace.push(['spawn', name, summarize(at), summarize(opts)]);
      return realSpawn(name, s, at, opts);
    }) as never);
    const proto = Object.getPrototypeOf(lighting) as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor' || typeof proto[key] !== 'function') continue;
      vi.spyOn(lighting as never, key as never).mockImplementation(((...args: unknown[]) => {
        trace.push(['light', key, ...args.filter(a => typeof a === 'number' || typeof a === 'string')]);
        return absorb;
      }) as never);
    }
  });

  afterAll(() => {
    Math.random = realRandom;
    vi.restoreAllMocks();
    scene.dispose();
    engine.dispose();
  });

  const entity = (x: number, z: number, netId: number): Entity =>
    ({ netId, transform: { pos: new Vector3(x, 0, z), rot: new Vector3(0, 0.5, 0), scale: 1 } }) as unknown as Entity;

  function run(id: number, cast: () => void): unknown[] {
    trace = [];
    effects.reset();
    Math.random = seeded(id + 1);
    try {
      cast();
      for (let i = 0; i < 150; i++) effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
    } catch (e) {
      trace.push(['throw', String((e as Error).message).slice(0, 120)]);
    }
    return trace;
  }

  it('keeps the number of rows', () => {
    expect(skillVisualCount()).toMatchSnapshot();
  });

  for (let id = 0; id <= 620; id++) {
    it(`skill ${id}`, () => {
      const caster = entity(100, 100, 1);
      const target = entity(103, 104, 2);
      const targeted: unknown[] = [];
      const area: unknown[] = [];
      // Classic (0) and the top tier, where `enhanced` rows take over.
      for (const tier of [0, LIGHTING_QUALITY_MAX]) {
        GameOptions.lightingQuality = tier;
        targeted.push(...run(id, () => playTargetedSkillVisual(scene, id, caster, target)));
        area.push(...run(id, () => playAreaSkillVisual(scene, id, caster, { x: 103, y: 104 }, () => 0, target)));
      }
      const full = { targeted, area };
      if (process.env.GOLDEN_FULL) return expect(full).toMatchSnapshot();
      const count = (t: unknown[], k: string) => t.filter(e => (e as unknown[])[0] === k).length;
      const hash = createHash('sha1').update(JSON.stringify(full)).digest('hex').slice(0, 16);
      expect(`${count(targeted, 'spawn')}/${count(area, 'spawn')} spawns, ${count(targeted, 'light')}/${count(area, 'light')} lights, ${hash}`).toMatchSnapshot();
    });
  }

  const digest = (t: unknown[]) => `${t.length} calls, ${createHash('sha1').update(JSON.stringify(t)).digest('hex').slice(0, 16)}`;

  for (let effectId = 0; effectId <= 160; effectId++) {
    it(`buff look ${effectId}`, () => {
      const hero = entity(100, 100, 1);
      (hero as { buffs?: Set<number> }).buffs = new Set([effectId]);
      const on = run(effectId, () => setBuffVisual(scene, hero, effectId, true));
      const off = run(effectId, () => setBuffVisual(scene, hero, effectId, false));
      clearBuffVisuals(hero);
      expect(digest([...on, ...off])).toMatchSnapshot();
    });
  }

  for (let launcher = 0; launcher <= 30; launcher++) {
    it(`bow shot ${launcher}`, () => {
      const spy = vi.spyOn(combat, 'equippedLauncher').mockReturnValue({ num: launcher } as never);
      const t = run(launcher, () => playBowShotVisual(scene, entity(100, 100, 1), entity(103, 104, 2)));
      spy.mockRestore();
      expect(digest(t)).toMatchSnapshot();
    });
  }
});
