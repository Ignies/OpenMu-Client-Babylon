import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Entity } from '@/ecs/world';
import { ENUM_WORLD } from '@/core/types';
import { stepClock, clearTimers } from '@/controllers/fx/core';
import { LightSource } from '@/controllers/lighting/lightSource';
import { SKILL_LIGHTS, lightAreaSkill, lightTargetedSkill } from '@/controllers/lighting/skills';
import { heroCastSound, skillSound } from '@/controllers/sound/combat';
import { hasSkillClip, skillClip, type CastContext } from '@/controllers/combat/skillClips';
import { castTarget } from '@/controllers/combat/castTargets';
import { skillStepIn } from '@/controllers/combat/skillMovement';
import { SKILL_DELAY_MS } from '@/modules/skills/recipes';
import { skillDefinition } from './skillsDatabase';
import './skillVisuals';

// Characterization net for moving the per-skill tables (light, sound, clip, targeting,
// movement, delay) into the skill folders: what each skill id resolves to.

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const round = (n: number) => Math.round(n * 1000) / 1000;
function summarize(v: unknown, depth = 0): unknown {
  if (typeof v === 'number') return round(v);
  if (typeof v === 'function') return 'fn';
  if (v instanceof Vector3) return [round(v.x), round(v.y), round(v.z)];
  if (v === null || typeof v !== 'object') return v;
  if (depth > 5) return 'obj';
  if (v instanceof Set) return [...v].map(x => summarize(x, depth + 1));
  if (Array.isArray(v)) return v.map(x => summarize(x, depth + 1));
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v).sort()) out[k] = summarize((v as Record<string, unknown>)[k], depth + 1);
  return out;
}

const CONTEXTS: CastContext[] = [];
for (const mount of [null, 'uniria', 'dinorant', 'horse', 'fenrir'] as const)
  for (const isFemale of [false, true])
    for (const world of [ENUM_WORLD.WD_0LORENCIA, ENUM_WORLD.WD_7ATLANSE]) CONTEXTS.push({ mount, isFemale, world, alternate: false });

describe('skill tables golden', () => {
  let engine: NullEngine;
  let scene: Scene;
  let lights: unknown[] = [];
  const realRandom = Math.random;

  beforeAll(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
    vi.spyOn(LightSource, 'attach').mockImplementation(((_s: Scene, recipe: unknown, anchor: { travel?: { onArrive?: () => void } }) => {
      lights.push(summarize(recipe));
      anchor.travel?.onArrive?.();
      return { alive: false, stop() {}, dispose() {} };
    }) as never);
  });

  afterAll(() => {
    Math.random = realRandom;
    vi.restoreAllMocks();
    scene.dispose();
    engine.dispose();
  });

  const entity = (x: number, z: number): Entity =>
    ({ transform: { pos: new Vector3(x, 0, z), rot: new Vector3(0, 0.5, 0), scale: 1 } }) as unknown as Entity;

  function lightTrace(cast: () => void): unknown[] {
    lights = [];
    clearTimers();
    cast();
    for (let i = 0; i < 150; i++) stepClock(1 / 25);
    return lights;
  }

  for (let id = 0; id <= 700; id++) {
    it(`skill ${id}`, () => {
      Math.random = () => 0.25;
      const def = skillDefinition(id);
      const row = {
        sound: skillSound(id),
        heroSound: heroCastSound(id),
        clip: hasSkillClip(id) ? CONTEXTS.map(c => skillClip(id, c)) : null,
        target: def ? castTarget(def) : null,
        stepIn: skillStepIn(id),
        delay: SKILL_DELAY_MS[id] ?? null,
        lightRow: summarize(SKILL_LIGHTS[id]),
        lightTargeted: lightTrace(() => lightTargetedSkill(scene, id, entity(100, 100), entity(103, 104))),
        lightArea: lightTrace(() => lightAreaSkill(scene, id, entity(100, 100), { x: 103, y: 0, z: 104 })),
      };
      if (process.env.GOLDEN_FULL) return expect(row).toMatchSnapshot();
      const { lightRow, lightTargeted, lightArea, ...plain } = row;
      const lightHash = createHash('sha1').update(JSON.stringify({ lightRow, lightTargeted, lightArea })).digest('hex').slice(0, 16);
      expect({ ...plain, clip: plain.clip && [...new Set(plain.clip)], light: `${lightTargeted.length}/${lightArea.length} ${lightHash}` }).toMatchSnapshot();
    });
  }
});
