import { describe, expect, it } from 'vitest';
import type { Item } from '../../ecs/world';
import { WING_OF_RUIN, WING_OF_STORM, WINGS_OF_DARKNESS, wingSpec } from './wings';

/** Every `light` callback a wing spec holds: its wakes, held sprites and mesh passes. */
function lightsOf(num: number) {
  const spec = wingSpec({ group: 12, num } as Item);
  const all = [...(spec?.wakes ?? []), ...(spec?.sprites ?? []), ...(spec?.passes ?? [])];
  return all.flatMap(entry => (entry.light ? [entry.light] : []));
}

// The wake, the held sprites and the passes read them every frame (wingObject.ts): kept colours.
describe('the wing lights', () => {
  it('hand back one kept colour per callback, not a fresh array a call', () => {
    for (const num of [WINGS_OF_DARKNESS, WING_OF_STORM, WING_OF_RUIN]) {
      const lights = lightsOf(num);
      expect(lights.length, `wing ${num}`).toBeGreaterThan(0);
      for (const light of lights) expect(light(100)).toBe(light(2000));
    }
  });

  // Wing of Storm's smoke, `0.5 + |sin(WorldTime * 0.0004)| * 0.4` grey (ZzzObject.cpp:9914-9926).
  it('still give each call its own time', () => {
    const smoke = lightsOf(WING_OF_STORM)[0];
    expect([...smoke(0)]).toEqual([0.5, 0.5, 0.5]);
    const l = 0.5 + Math.abs(Math.sin(1000 * 0.0004)) * 0.4;
    expect([...smoke(1000)]).toEqual([l, l, l]);
  });
});
