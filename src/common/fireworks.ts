import type { Scene, Vector3 } from '../libs/babylon/exports';
import { delay, effects } from '../effects';
import type { ParticleRecipe, RGB } from '../effects/core';
import { BOMB_SPARKS, TEX } from '../effects/recipes';
import { playSfx } from '../libs/sfx';

/**
 * `ReceiveServerCommand` case 0 and the christmas variant (WSclient.cpp:7744,
 * ZzzEffect.cpp BITMAP_FIRECRACKER0001/0002): spark bursts staggered over the
 * tile. The christmas one is denser, with a flash card per burst.
 */

const BURST_COLOURS: readonly RGB[] = [
  [1, 0.35, 0.35],
  [0.4, 0.55, 1],
  [1, 0.9, 0.4],
  [0.45, 1, 0.5],
];

const BURST_GAP_SECONDS = 0.25;

/** Move_BITMAP_FIRECRACKER0001 fires five joints in both variants (MoveHandlers.cpp:4933-4938). */
const BURSTS = 5;

/**
 * `LoadWaveFile(SOUND_XMAS_FIRECRACKER, ...)` takes the default MAX_CHANNEL and
 * no 3D, so each burst rings at full volume wherever it is.
 */
const BURST_SOUND_CHANNELS = 4;

export function spawnFireworks(scene: Scene, at: Vector3, christmas: boolean): void {
  for (let i = 0; i < BURSTS; i++) {
    const colour = BURST_COLOURS[(Math.random() * BURST_COLOURS.length) | 0];
    const pos = at.clone();
    pos.x += Math.random() * 2 - 1;
    pos.z += Math.random() * 2 - 1;
    pos.y += 1.5 + Math.random();
    const recipe: ParticleRecipe = { ...BOMB_SPARKS, colour, gravity: -3, life: 0.8 };

    delay(i * BURST_GAP_SECONDS, () => {
      effects.spawn('particles', scene, pos, { recipe, count: christmas ? 50 : 35 });
      if (christmas) {
        effects.spawn('sprite', scene, pos, { texture: TEX.shiny, colour, size: 1.4, seconds: 0.4, grow: 2 });
      }
      // BITMAP_FIRECRACKER0002 rings once per burst in both variants
      // (ZzzEffect.cpp:2950); eFirecracker1/2 are Battle Soccer's.
      playSfx('Sound/xmas/Christmas_Fireworks01', null, {
        channels: BURST_SOUND_CHANNELS,
      });
    });
  }
}
