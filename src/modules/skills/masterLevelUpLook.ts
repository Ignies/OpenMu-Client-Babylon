/**
 * The master level-up swirl (`Receive_Master_LevelUp`, WSclient.cpp:8227-8236): one BITMAP_FLARE
 * joint of subtype 45 and nineteen of 46 on the hero, which swirl out around the spot and close
 * back on the body (ZzzEffectJoint.cpp:2042-2049, :5614-5745), drawn through the fx facade. See readme.md.
 */
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { effects, MODEL, TEX, type RGB } from '@/controllers/fx';
import { CM, TICK, delay, fxNow, type PointSource } from '@/controllers/fx/core';
import { playSfx } from '@/controllers/sound/sfx';
import type { Entity } from '@/ecs/world';

type MuPoint = { x: number; y: number; z: number };

/** MU units (cm, z up) per tile. */
const MU = 100;
const FLARES = 20;
/** `LifeTime = 30 + MultiUse`, `MultiUse = rand() % 10`; `MaxTails` 15, `Scale` 30. */
const LIFE_TICKS = 30;
const MULTI_USE = 10;
const TAILS = 15;
const WIDTH = 30 * CM;
/** `Vector(0.2f, 0.2f, 1.0f, o->Light)`: the ribbons. */
const RIBBON: RGB = [0.2, 0.2, 1];
/** `vec3_t Light = { .5f, .5f, 1.0f }`: the sprites at the head. */
const SPARK: RGB = [0.5, 0.5, 1];
const SPEED = [0.048, 0.0613, 0.1113] as const;

/** `25.f * cosf((iIndex * 51231 + k * 3711 + iFrame / 10) * 0.01f)`: the body's wobble per axis. */
function wobble(index: number, axis: number, frame: number): number {
  return 25 * Math.cos((index * 51231 + axis * 3711 + Math.trunc(frame / 10)) * 0.01);
}

/**
 * The head of one flare joint in MU units (z up), as `MoveJoint` places it a tick: a point on a
 * turning unit sphere `fCircle` from `spot`, blended toward the body by `fPos` and lifted 100.
 * `lifeTime` counts down from `30 + multiUse`; `frame` is `WorldTime / 40`.
 */
export function changeUpFlarePoint(
  out: MuPoint,
  lifeTime: number,
  multiUse: number,
  index: number,
  frame: number,
  spot: MuPoint,
  body: MuPoint
): void {
  const f = (index % 2 ? frame : -frame) + index * 53731;
  const a = (f + 55555) * SPEED[0];
  const b = f * SPEED[1];
  const t0 = Math.sin(a) * Math.cos(b);
  const t1 = Math.sin(a) * Math.sin(b);
  const t2 = Math.cos(a);
  const c = (f + 11111) * SPEED[2];
  const dx = Math.cos(c) * t1 - Math.sin(c) * t2;
  const dy = Math.sin(c) * t1 + Math.cos(c) * t2;

  const life = (lifeTime * 40) / 30;
  const pos = ((life < 10 ? life * 7 : life + 60) / (LIFE_TICKS + multiUse)) * LIFE_TICKS;
  const circle = Math.min(Math.max(0, 40 - life) * 15, 150);

  out.x = (pos * (spot.x + dx * circle) + (100 - pos) * (body.x + wobble(index, 0, f))) * 0.01;
  out.y = (pos * (spot.y + dy * circle) + (100 - pos) * (body.y + wobble(index, 1, f))) * 0.01;
  out.z = (pos * (spot.z + t0 * circle) + (100 - pos) * (body.z + wobble(index, 2, f))) * 0.01 + 100;
}

/** One joint's head in tiles, following the live body. */
function flareHead(index: number, multiUse: number, born: number, spot: MuPoint, hero: Entity): PointSource {
  const head: MuPoint = { x: 0, y: 0, z: 0 };
  const body: MuPoint = { x: spot.x, y: spot.y, z: spot.z };
  const life = LIFE_TICKS + multiUse;
  return out => {
    const pos = hero.transform?.pos;
    if (pos) {
      body.x = pos.x * MU;
      body.y = pos.z * MU;
      body.z = pos.y * MU;
    }
    const now = fxNow();
    changeUpFlarePoint(head, Math.max(0, life - (now - born) / TICK), multiUse, index, Math.trunc(now / TICK), spot, body);
    return out.set(head.x / MU, head.z / MU, head.y / MU);
  };
}

/** Subtype 45's last tick: MODEL_CHANGE_UP_EFF and MODEL_CHANGE_UP_CYLINDER of subtype 1 on the hero. */
function changeUpPop(scene: Scene, hero: Entity): void {
  const pos = hero.transform?.pos;
  if (!pos) return;
  // ZzzEffect.cpp:1943-1956: 10 ticks at 0.4, 22 up, every mesh bright at 0.7 in (0.1, 0.4, 0.6) (ZzzObject.cpp:499-509).
  effects.spawn('model', scene, new Vector3(pos.x, pos.y + 22 * CM, pos.z), {
    model: MODEL.changeUp,
    scale: 0.4,
    seconds: 10 * TICK,
    colour: [0.07, 0.28, 0.42],
    holdFrame: 0,
    fadeTail: 0.01,
  });
  // ZzzEffect.cpp:1971-1983, MoveHandlers.cpp:3279-3302: 0.1 growing 0.08 a tick, BlendMeshLight 0.015 a tick of life, in (0.4, 0.5, 1).
  effects.spawn('model', scene, new Vector3(pos.x, pos.y, pos.z), {
    model: 'Effect/clinderlight.glb',
    scale: 0.1,
    grow: 9,
    seconds: 10 * TICK,
    colour: [0.06, 0.075, 0.15],
    fadeTail: 1,
  });
}

export function showMasterLevelUp(scene: Scene, hero: Entity): void {
  const pos = hero.transform?.pos;
  if (!pos) return;
  const spot: MuPoint = { x: pos.x * MU, y: pos.z * MU, z: pos.y * MU };
  const at = new Vector3(pos.x, pos.y + 1, pos.z);
  const born = fxNow();
  // The joints' slots in the pool, which set each one's phase and turn.
  const first = Math.floor(Math.random() * 1000);

  for (let i = 0; i < FLARES; i++) {
    const multiUse = Math.floor(Math.random() * MULTI_USE);
    const seconds = (LIFE_TICKS + multiUse) * TICK;
    const head = flareHead(first + i, multiUse, born, spot, hero);
    effects.spawn('joint', scene, at, { head, maxTails: TAILS, width: WIDTH, seconds, colour: RIBBON, texture: TEX.flareBig });
    // A BITMAP_SHINY+1 (32x64) and two BITMAP_LIGHT made afresh at the head every tick.
    const sparks = { colour: SPARK, seconds, follow: head, fadeTail: 0.01 };
    effects.spawn('sprite', scene, at, { ...sparks, texture: TEX.shiny2, size: 32 * CM, stretch: 2, reroll: { every: TICK, size: [0.8, 0.9] } });
    for (let n = 0; n < 2; n++) {
      effects.spawn('sprite', scene, at, { ...sparks, texture: TEX.flare, size: 64 * CM, reroll: { every: TICK, size: [1.44, 1.62] } });
    }
    // `(int)LifeTime == 30`: SOUND_METEORITE01.
    delay(multiUse * TICK, () => playSfx('Sound/eMeteorite', null, { channels: 2 }));
    if (i === 0) delay(seconds, () => changeUpPop(scene, hero));
  }
}
