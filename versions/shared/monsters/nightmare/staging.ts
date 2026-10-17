import type { BodyFxEmitter } from '@/controllers/monsters';
import { effects } from '@/controllers/fx';
import { TICK, boneLocalPos, entityPos, entityYaw, fxNow } from '@/controllers/fx/core';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { muAngles, rand, risingFlare, risingFlares } from '../../skills/dark_knight/_shared';

// Nightmare's MoveMonsterVisual staging, loaded on his first Attack2 or Attack3 (`bodyFx.ts` `call` rows).

const DEG = Math.PI / 180;

type Call = Extract<BodyFxEmitter, { kind: 'call' }>['run'];

/** Attack3, a tick: two BITMAP_FLARE SubType 2 joints at Scale 40 within 220 cm of him (GM_Kanturu_3rd.cpp:840-850). */
export const flares: Call = (scene, e) => {
  const at = entityPos(e, 0, new Vector3());
  const t0 = fxNow();
  const pair = [risingFlare(at.x + rand(-2.2, 2.2), at.z + rand(-2.2, 2.2)), risingFlare(at.x + rand(-2.2, 2.2), at.z + rand(-2.2, 2.2))];
  risingFlares(scene, pair, at.y, () => Math.floor((fxNow() - t0) / TICK + 1e-3), 75 * TICK);
};

/**
 * Attack2 at frames 5.2-5.8, 40-59 cm down LHand_Bone (bone 14), in (0.5, 0.7, 1) (GM_Kanturu_3rd.cpp:851-862):
 * MODEL_STORM2 SubType 0 (boswind, LT 35, Angle[0] 90, Scale 0.5-0.59, turning 40 degrees a tick on Angle[1];
 * ZzzEffect.cpp:2067-2073, MoveHandlers.cpp:3513-3523) and BITMAP_BOSS_LASER SubType 2: LT 35, 20 Fire02 cards at
 * Scale 2.5 in (0, 0.2, 1), 50 cm apart along his facing, turning 0.1 degrees a card a frame (ZzzEffect.cpp:996-1001,
 * :8982-8987).
 */
export const stormAndLaser: Call = (scene, e) => {
  const at = boneLocalPos(e, 14, new Vector3(0, -(40 + Math.floor(Math.random() * 20)) / 100, 0), new Vector3());
  const yaw = entityYaw(e);
  const t0 = fxNow();
  effects.spawn('model', scene, at, {
    model: MODEL.boswind,
    seconds: 35 * TICK,
    scale: 0.5 + Math.floor(Math.random() * 10) / 100,
    colour: [0.5, 0.7, 1],
    blendMesh: 0,
    fadeTail: 0,
    rotate: out => muAngles(out, 90 * DEG, ((fxNow() - t0) / TICK) * 40 * DEG, yaw),
  });
  const fx = Math.sin(yaw);
  const fz = -Math.cos(yaw);
  for (let k = 0; k < 20; k++) {
    const p = new Vector3(at.x + fx * 0.5 * k, at.y, at.z + fz * 0.5 * k);
    effects.spawn('sprite', scene, p, { texture: TEX.fire2, colour: [0, 0.2, 1], size: 0.64 * 2.5, seconds: 35 * TICK, fadeTail: 0, spin: -2 * 25 * DEG });
  }
};
