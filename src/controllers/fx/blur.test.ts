import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { blurLayer } from './blur';
import { TICK } from './core';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

let engine: NullEngine;
let scene: Scene;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
});
afterAll(() => {
  blurLayer.reset?.();
  scene.dispose();
  engine.dispose();
});

/** A swing whose tip walks along x, sampled for `ticks` ticks; returns the frames it stayed alive. */
function swing(ticks: number, short?: boolean): number {
  let x = 0;
  const handle = blurLayer.spawn(scene, Vector3.Zero(), {
    follow: out => out.set(x, 1, 0),
    base: out => out.set(x, 0, 0),
    tickHistory: true,
    seconds: ticks * TICK,
    short,
  });
  let frames = 0;
  while (handle.alive && frames < 200) {
    x += 0.1;
    blurLayer.update?.(0, TICK);
    frames++;
    if (!handle.alive) break;
  }
  return frames;
}

describe('blur (tickHistory)', () => {
  it('fades a light above 1 from its own tint, clamped per channel as PackABGR does (ZzzEffectBlurSpark.cpp:95-100)', () => {
    let x = 0;
    blurLayer.spawn(scene, Vector3.Zero(), {
      follow: out => out.set(x, 1, 0),
      base: out => out.set(x, 0, 0),
      colour: [1, 1.2, 2],
      tickHistory: true,
      seconds: 10 * TICK,
    });
    for (let i = 0; i < 3; i++) {
      x += 0.1;
      blurLayer.update?.(0, TICK);
    }
    const mesh = scene.meshes.find(m => m.name === 'fxBlur');
    const colours = mesh?.getVerticesData(VertexBuffer.ColorKind) ?? new Float32Array();
    const emissive = (mesh?.material as StandardMaterial).emissiveColor;
    expect(Math.max(emissive.r, emissive.g, emissive.b)).toBeLessThanOrEqual(1);
    // The newest sample is (1, 1, 1) clamped; one at a quarter is (0.25, 0.3, 0.5).
    const at = (v: number): number[] => Array.from(colours.slice(v * 4, v * 4 + 3)).map(c => +c.toFixed(3));
    expect(at(0)).toEqual([1, 1, 1]);
    const n = colours.length / 8;
    let quarter = -1;
    for (let j = 0; j < n; j++) if (colours[j * 8] > 0 && colours[j * 8] <= 0.3) quarter = j;
    const [r, g, b] = colours.slice(quarter * 8, quarter * 8 + 3);
    expect(g / r).toBeCloseTo(1.2, 3);
    expect(b / r).toBeCloseTo(2, 3);
    blurLayer.reset?.();
  });

  it('drops two samples a tick from tick 15 when Short and from tick 30 when not (CreateBlur, MoveBlurs)', () => {
    // About 27 samples when sampling stops at tick 3; the long one loses one a tick for longer.
    expect([swing(3, true), swing(3)]).toEqual([17, 20]);
  });

  // The Genocider's and the Gigantis Warrior's loop makes 18 CreateBlur calls a tick, not 10 (GM_Kanturu_1st.cpp:1765-1795).
  it('lays its samples a tick as asked', () => {
    const second = (samplesPerTick?: number): number => {
      let x = 0;
      blurLayer.spawn(scene, Vector3.Zero(), { follow: out => out.set(x, 1, 0), base: out => out.set(x, 0, 0), tickHistory: true, seconds: 1, samplesPerTick });
      x = 0.18;
      blurLayer.update?.(0, TICK);
      const mesh = scene.meshes.find(m => m.name === 'fxBlur');
      const at = mesh?.getVerticesData(VertexBuffer.PositionKind)?.[6] ?? NaN;
      blurLayer.reset?.();
      return +at.toFixed(4);
    };
    expect([second(), second(18)]).toEqual([0.162, 0.17]);
  });
});
