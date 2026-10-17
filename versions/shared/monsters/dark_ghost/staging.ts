import type { BodyFxEmitter } from '@/controllers/monsters';
import { effects } from '@/controllers/fx';
import { TICK, entityPos, entityYaw } from '@/controllers/fx/core';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';

// The Dark Ghost's death staging, loaded on its first death (`bodyFx.ts` `call` rows).

type Call = Extract<BodyFxEmitter, { kind: 'call' }>['run'];

/**
 * Die to frame 3, a tick: MODEL_SKILL_INFERNO SubType 9 at its feet (GMEmpireGuardian2.cpp:954): Inferno01 at Scale 0.45
 * in (0.1, 1, 0.2), LT 13, every mesh bright at BlendMeshLight LT / 80, rising 2 cm a tick (ZzzEffect.cpp:1440-1447,
 * MoveHandlers.cpp:2687-2693).
 */
export const inferno: Call = (scene, e) => {
  effects.spawn('model', scene, entityPos(e, 0, new Vector3()), {
    model: MODEL.inferno,
    seconds: 13 * TICK,
    scale: 0.45,
    colour: [0.1, 1, 0.2],
    yaw: -entityYaw(e),
    keysPerTick: 0.5,
    rise: 0.02 / TICK,
    life: p => (13 * (1 - p)) / 80,
  });
};

/**
 * Die to frame 0.2: MODEL_TWINTAIL_EFFECT SubType 1 and 2 in (0.4, 1, 0.6) (GMEmpireGuardian2.cpp:956-960): clouds.jpg on
 * the terrain, additive, Scale 3.5 losing 0.02 a tick, its light / 1.04 a tick, for 50 ticks, turned
 * `-WorldTime * 0.3` and `* 0.1` degrees (ZzzEffect.cpp:4453-4462, :9072-9077, MoveHandlers.cpp:6867-6884).
 */
export const twinTail: Call = (scene, e) => {
  const at = entityPos(e, 0, new Vector3());
  for (const turn of [0.3, 0.1]) {
    effects.spawn('ring', scene, at, {
      texture: TEX.cloud,
      colour: [0.4, 1, 0.6],
      seconds: 50 * TICK,
      scaleAt: t => 3.5 - (0.02 * t) / TICK,
      spin: -turn * 1000,
      spinFrom: -turn * performance.now(),
      alphaAt: () => 1,
      decay: 1 / 1.04,
    });
  }
};
