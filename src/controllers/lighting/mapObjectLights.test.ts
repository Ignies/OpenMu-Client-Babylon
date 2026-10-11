import { describe, expect, it } from 'vitest';
import { recipeFromEmitter } from './mapObjectLights';

describe('a map object row\'s ground light', () => {
  // Loren Market's street lamp: `fLumi = (sinf(WorldTime * 0.002f) + 1.0f) * 0.2f + 0.6f` (GMUnitedMarketPlace.cpp:103).
  it('breathes on its own pulse', () => {
    const pulse = { speed: 0.002, amount: 0.2, base: 0.6 };
    const recipe = recipeFromEmitter({ terrain: { range: 3, color: [0.7, 0.5, 0.2], pulse } });
    expect([recipe?.pulse, recipe?.flicker]).toEqual([pulse, undefined]);
  });

  it('breathes with its flare when it has neither a pulse nor a flicker', () => {
    const pulse = { speed: 0.04, amount: 0.3, base: 0.4 };
    const recipe = recipeFromEmitter({ sprite: { scale: 8, color: [0.1, 0.1, 0.5], pulse }, terrain: { range: 2, color: [0.1, 0.1, 0.5] } });
    expect(recipe?.pulse).toEqual(pulse);
  });

  it('rolls its flicker and nothing else when it has one', () => {
    const flicker = { min: 0.3, max: 0.6, steps: 4 };
    const pulse = { speed: 0.002, amount: 0.2, base: 0.6 };
    const recipe = recipeFromEmitter({ sprite: { scale: 1.5, color: [1, 1, 1], pulse }, terrain: { range: 3, color: [1, 0.6, 0.2], flicker } });
    expect([recipe?.flicker, recipe?.pulse]).toEqual([flicker, undefined]);
  });
});
