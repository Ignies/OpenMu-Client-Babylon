import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '@/controllers/render/babylon/exports';
import type { Entity } from '@/ecs/world';

const spawned = vi.hoisted(() => [] as [string, Record<string, unknown>][]);
vi.mock('@/controllers/fx', () => ({ effects: { spawn: (name: string, _s: unknown, _at: unknown, opts: Record<string, unknown>) => void spawned.push([name, opts]) } }));
vi.mock('@/controllers/fx/core', () => ({
  TICK: 1 / 25,
  entityPos: (_e: unknown, _h: number, out: unknown) => out,
  entityYaw: () => 0,
}));

const { inferno, twinTail } = await import('./staging');
const { MODEL, TEX } = await import('@/controllers/fx/recipes');

const ghost = {} as Entity;
const scene = {} as Scene;

// GMEmpireGuardian2.cpp:952-960: MODEL_SKILL_INFERNO SubType 9 and the two MODEL_TWINTAIL_EFFECT clouds.
describe("the Dark Ghost's death staging", () => {
  it('rises a faint green Inferno01 ring and lays two turning clouds', () => {
    inferno(scene, ghost);
    twinTail(scene, ghost);
    expect(spawned.map(([name, o]) => [name, o.model ?? o.texture])).toEqual([
      ['model', MODEL.inferno],
      ['ring', TEX.cloud],
      ['ring', TEX.cloud],
    ]);
    const [, ring] = spawned;
    const o = spawned[0][1] as { seconds: number; scale: number; life: (p: number) => number };
    expect([o.seconds, o.scale, o.life(0)]).toEqual([13 / 25, 0.45, 13 / 80]);
    const r = ring[1] as { scaleAt: (t: number) => number; seconds: number; spin: number };
    expect([r.seconds, r.scaleAt(0), r.scaleAt(1), r.spin]).toEqual([2, 3.5, 3, -300]);
    expect(spawned[2][1].spin).toBe(-100);
  });
});
