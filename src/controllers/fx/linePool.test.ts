import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '../render/babylon/exports';
import { disposeLine, disposeLinePools, makeLine, parkedLineCount } from './joint';

describe('the joint line pool', () => {
  let engine: NullEngine;
  let scene: Scene;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
  });

  afterEach(() => {
    disposeLinePools();
    engine.dispose();
  });

  const lines = () => [new Array<number>(9 * 3).fill(0)];

  it('takes back a released line of the same shape and look', () => {
    const first = makeLine(scene, lines(), [1, 0.5, 0], 0.25, {}, undefined, true);
    const mesh = first.mesh;
    const material = mesh.material;
    disposeLine(scene, first, lines());
    expect(parkedLineCount()).toBe(1);
    expect(mesh.isEnabled(false)).toBe(false);
    expect(mesh.isDisposed()).toBe(false);

    const again = makeLine(scene, lines(), [1, 0.5, 0], 0.25, {}, undefined, true);
    expect(again.mesh).toBe(mesh);
    expect(again.mesh.material).toBe(material);
    expect(again.mesh.isEnabled(false)).toBe(true);
    expect(parkedLineCount()).toBe(0);
  });

  it('never mixes shapes, colours of an untextured line, or callers that opt out', () => {
    const a = makeLine(scene, lines(), [1, 0, 0], 0.25, {}, undefined, true);
    disposeLine(scene, a, lines());
    expect(makeLine(scene, [new Array<number>(5 * 3).fill(0)], [1, 0, 0], 0.25, {}, undefined, true).mesh).not.toBe(a.mesh);
    expect(makeLine(scene, lines(), [0, 1, 0], 0.25, {}, undefined, true).mesh).not.toBe(a.mesh);
    expect(makeLine(scene, lines(), [1, 0, 0], 0.25, {}).mesh).not.toBe(a.mesh);
    const optedOut = makeLine(scene, lines(), [1, 0, 0], 0.25, {});
    disposeLine(scene, optedOut, lines());
    expect(optedOut.mesh.isDisposed()).toBe(true);
  });

  it('disposes the parked lines on a map change', () => {
    const a = makeLine(scene, lines(), [1, 0, 0], 0.25, {}, undefined, true);
    disposeLine(scene, a, lines());
    disposeLinePools();
    expect(a.mesh.isDisposed()).toBe(true);
    expect(parkedLineCount()).toBe(0);
  });
});
