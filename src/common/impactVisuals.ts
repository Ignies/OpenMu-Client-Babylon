import type { Scene, Vector3 } from '../libs/babylon/exports';
import type { Entity } from '../ecs/world';
import { effects } from '../effects';
import { entityPos, tmpA, type RGB } from '../effects/core';
import {
  BLOOD_CHIPS,
  BLOOD_MIST,
  HIT_SPARKS,
  RGBS,
  SMOKE,
  TEX,
} from '../effects/recipes';
import { animeImpacts, styleTuned } from './renderingStyle';
import { spawnCrystalShards } from './deathVisuals';
import { playSfx } from '../libs/sfx';
import { COMBAT_BUS } from './combatSounds';
import type { Sounds } from '../libs/soundsManager';

/**
 * What a landed blow draws - the consumer table for
 * `ecs/systems/impactEffectSystem.ts`, in the shape of `deathVisuals.ts`.
 *
 * A blow is `BITMAP_SPARK` chips from the struck body (the spark loop next
 * to `CreateBlood`, ZzzEffectBlurSpark.cpp:436, throws 20 of them), plus a
 * few blood flecks when health - not just shield - was taken.
 *
 * Two things in Blood Castle do not bleed and get their own blow instead:
 * the Castle Gate smokes (`SetPlayerShock`, ZzzCharacter.cpp:1434-1450) and
 * the Statue of Saint throws crystal (the attacker's swing,
 * ZzzCharacter.cpp:4868-4885).
 *
 * The **hero never raises dust**: `PlayWalkSound` (ZzzCharacter.cpp:5230)
 * only picks a sound, and no `CreateParticle` in the client is tied to a
 * footfall. The sand a Tarkan monster kicks up walking is the monster's own
 * body effect, `effects/monsterVisuals.ts`.
 */

/** Chips per landed blow: the original's CreateSpark loop throws 20 (at 1.6–2.8 cm a chip). */
const HIT_SPARK_COUNT = 20;
/** Blood flecks when health was taken, and the softer spray behind them. */
const HIT_BLOOD_COUNT = 6;
const HIT_BLOOD_MIST_COUNT = 2;
/** Tiles above the feet a blow lands (the chest; skillVisuals' IMPACT_HEIGHT). */
const HIT_HEIGHT = 0.9;

/** [NpcInfo(131, "Castle Gate")] / (132-134, "Statue of Saint"). */
const CASTLE_GATE = 131;
const STATUE_OF_SAINT: ReadonlySet<number> = new Set([132, 133, 134]);

/** `for (i < 5) if (rand_fps_check(2))`: five rolls of a coin, so 2-3 land. */
const STRUCK_PIECES = 5;
/**
 * Gate: `Position[2] + 200 + rand() % 50`. The original also jitters x by
 * `rand() % 128 - 64`; SMOKE's own launch cone covers that on its own.
 */
const GATE_SMOKE_HEIGHT = 2.2;
/** Statue: `Position[2] + 50 + rand() % 30`, no lateral jitter. */
const STATUE_SHARD_HEIGHT = 0.65;

const GATE_HIT_SOUND: Sounds = 'Sound/eHitGate';
const STATUE_HIT_SOUND: Sounds = 'Sound/eHitCristal';

/** The body's own light, for the pieces it throws. */
function lightOf(target: Entity): RGB {
  const l = target.modelObject?.Light;
  return l ? [l.x, l.y, l.z] : [1, 1, 1];
}

/**
 * Anime 2.0's Impact flash: one big short flare on the blow, growing as it
 * goes, on top of what the blow already throws. It is additive art, so it
 * lands in the effect mask and the ink pass gives it flat tones and a
 * contour like every other effect. No other style spawns it.
 */
const ANIME_FLASH_SIZE = 1.6;
const ANIME_FLASH_SECONDS = 0.22;
const ANIME_FLASH_GROW = 1.8;

function spawnAnimeFlash(scene: Scene, at: Vector3): void {
  if (!styleTuned() || !animeImpacts()) return;

  effects.spawn('sprite', scene, at, {
    texture: TEX.impact,
    colour: RGBS.white,
    size: ANIME_FLASH_SIZE,
    seconds: ANIME_FLASH_SECONDS,
    grow: ANIME_FLASH_GROW,
    growFrom: 0.4,
    fadeTail: 0.6,
  });
}

export function spawnHitImpact(
  scene: Scene,
  target: Entity,
  healthDamage: number,
  shieldDamage: number
): void {
  if (healthDamage + shieldDamage <= 0) return;

  const npcType = target.npcType;

  if (npcType === CASTLE_GATE) {
    const at = entityPos(target, GATE_SMOKE_HEIGHT, tmpA);
    effects.spawn('particles', scene, at, {
      recipe: SMOKE,
      count: STRUCK_PIECES,
    });
    playSfx(GATE_HIT_SOUND, { x: at.x, z: at.z }, { bus: COMBAT_BUS });
    return;
  }

  if (npcType !== undefined && STATUE_OF_SAINT.has(npcType)) {
    const at = entityPos(target, STATUE_SHARD_HEIGHT, tmpA);
    spawnCrystalShards(scene, at, STRUCK_PIECES, lightOf(target));
    playSfx(STATUE_HIT_SOUND, { x: at.x, z: at.z }, { bus: COMBAT_BUS });
    return;
  }

  const at = entityPos(target, HIT_HEIGHT, tmpA);
  spawnAnimeFlash(scene, at);
  effects.spawn('particles', scene, at, {
    recipe: HIT_SPARKS,
    count: HIT_SPARK_COUNT,
  });
  if (healthDamage > 0) {
    effects.spawn('particles', scene, at, {
      recipe: BLOOD_CHIPS,
      count: HIT_BLOOD_COUNT,
    });
    effects.spawn('particles', scene, at, {
      recipe: BLOOD_MIST,
      count: HIT_BLOOD_MIST_COUNT,
    });
  }
}
