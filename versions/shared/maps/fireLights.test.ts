import { afterEach, describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '@/core/types';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { lightEmittersFor } from '@/controllers/lighting/mapObjectLights';

/** The row of a map object type that lights the ground. */
const groundOf = (world: ENUM_WORLD, type: number) => lightEmittersFor(world, type)?.find(e => e.terrain);

// A correction toward the original is never a toggle: both presets.
describe.each([
  ['Enhanced', FIDELITY_DEFAULT],
  ['Classic', FIDELITY_CLASSIC],
])('the original ground lights on %s', (_preset, choice) => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  // `CreateFire(0, o, 0.f, 0.f, 50.f)`: `AddTerrainLight(..., (L, 0.6L, 0.4L), 4)`, L 0.6-1.1 (ZzzEffectFireLeave.cpp:60-81).
  it('Devias 66 burns 50 up at range 4 (ZzzObject.cpp:3874-3876)', () => {
    setFidelityChoice(choice, {});
    const fire = groundOf(ENUM_WORLD.WD_2DEVIAS, 66);
    expect(fire?.offset).toEqual([0, 0, 50]);
    expect([fire?.terrain?.range, fire?.terrain?.color]).toEqual([4, [1, 0.6, 0.4]]);
  });

  // `L = (rand() % 4 + 3) * 0.1f`, `AddTerrainLight(x, y, (L, 0.6L, 0.2L), 3)`.
  it('Lorencia 150 lights range 3 (ZzzObject.cpp:3810-3814)', () => {
    setFidelityChoice(choice, {});
    const candle = groundOf(ENUM_WORLD.WD_0LORENCIA, 150)?.terrain;
    expect([candle?.range, candle?.color, candle?.flicker]).toEqual([3, [1, 0.6, 0.2], { min: 0.3, max: 0.6, steps: 4 }]);
  });

  // `fLumi = (sinf(WorldTime * k) + 1.0f) * 0.2f + 0.6f`, `AddTerrainLight(bone, fLumi * (0.7, 0.5, 0.2), range)`: no roll.
  it('Loren Market 30 and 35 breathe on their bones, 30 at 0.002 and 35 at 0.039 (GMUnitedMarketPlace.cpp:92-127)', () => {
    setFidelityChoice(choice, {});
    const lamp = (type: number) => groundOf(ENUM_WORLD.WD_79UNITEDMARKETPLACE, type);
    const breath = (speed: number) => ({ speed, amount: 0.2, base: 0.6 });
    expect([lamp(30)?.offset, lamp(30)?.bone, lamp(30)?.terrain]).toEqual([
      [0, 0, 304],
      true,
      { range: 3, color: [0.7, 0.5, 0.2], pulse: breath(0.002) },
    ]);
    expect([lamp(35)?.offset, lamp(35)?.bone, lamp(35)?.terrain]).toEqual([
      [-2, -24, 16],
      true,
      { range: 1, color: [0.7, 0.5, 0.2], pulse: breath(0.039) },
    ]);
  });
});
