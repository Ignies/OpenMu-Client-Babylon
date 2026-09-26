/**
 * Cards - the original's particles and per-frame sprites card for card: one
 * billboard per `CreateParticle` / `CreateSprite`, stepped on its own 25 Hz
 * `MoveParticles` rules (ZzzEffectParticle.cpp) - a velocity that decays by a
 * factor a tick, a scale that grows by a step or a factor, a light that
 * decays, fades with `LifeTime` or dies with `Alpha`, a roll that turns or is
 * re-rolled every tick, a bounce off the terrain. The sprite layer covers a
 * flash that grows and fades; this is for the skills whose look is exactly
 * those per-tick numbers.
 *
 * A card is a pooled quad (core.ts `acquireCard`) with a cached additive
 * material; a colour ramp picks among a few cached materials. The motion is
 * integrated in fractional ticks, so it does not step at 25 Hz on screen.
 *
 * Driven by: `effects.spawn('cards', ...)` from the skill table. Read by: nobody.
 */
import { Vector3, type Scene, type StandardMaterial } from '../libs/babylon/exports';
import { Store } from '../store';
import { TICK, acquireCard, additiveMaterial, clamp01, lerp, lightCardGain, releaseCard, type Card, type PointSource, type RGB } from './core';
import { DEAD_HANDLE, type EffectHandle, type EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Materials in a colour ramp: enough that a ramp reads smooth, few enough to stay cached. */
const RAMP_STEPS = 8;

/** Most cards alive at once; past it a spawn is dropped (the original's MAX_PARTICLES does the same). */
const MAX_CARDS = 1200;

// ---- 2. state + readers ----------------------------------------------------

export interface CardOptions {
  /** `Effect/...` sheet (recipes.ts `TEX`). */
  texture: string;
  /** The original's `Light` at birth; the material tint. */
  colour: RGB;
  /** `Light` reached after `colourTicks` ticks (a particle that brightens as it lives). */
  colourEnd?: RGB;
  colourTicks?: number;
  /** Card width in tiles: the sheet's width in px x `Scale` / 100. */
  size: number;
  /** Height over width, for a sheet that is not square (Shiny02 2, pin_lights 8). */
  aspect?: number;
  /** `LifeTime` in ticks. */
  ticks: number;
  /** Brightness at birth, 0..1, when the `Light` starts under the tint. */
  light?: number;
  /** `Light *= decay` every tick. */
  decay?: number;
  /** `Luminosity = LifeTime / ticks`: the light runs down with the life. */
  lifeFade?: boolean;
  /** Brightness as a function of the age in ticks, for the curves the flags above do not cover. */
  brightness?: (age: number) => number;
  /** Dies once its brightness falls under this (`if (Light[0] <= 0.05) Live = false`). */
  minLight?: number;
  /** Offset from `at` (or from the followed point), tiles. */
  offset?: readonly [number, number, number];
  /** Velocity, tiles a tick. */
  velocity?: readonly [number, number, number];
  /** Horizontal velocity multiplier a tick. */
  drag?: number;
  /** Vertical velocity multiplier a tick (default `drag`). */
  dragY?: number;
  /** Tiles a tick squared taken off the vertical velocity. */
  gravity?: number;
  /** Tiles added to the width every tick (negative shrinks; the card dies at 0). */
  grow?: number;
  /** Width multiplier every tick. */
  growMul?: number;
  /** Roll at birth, radians. */
  roll?: number;
  /** Radians a tick the roll turns. */
  spin?: number;
  /** A new random roll every tick: the per-frame `CreateSprite(..., rand() % 360)`. */
  rerollEachTick?: boolean;
  /** Ride this point (a moving effect's position); the motion is added on top. */
  follow?: PointSource;
  /** Ends the card early. */
  until?: () => boolean;
  /** Bounce off the terrain `bounce[0]` tiles above it, keeping `bounce[1]` of the fall and losing `bounce[2]` ticks of life. */
  bounce?: readonly [number, number, number];
  /** Laid flat on the ground instead of facing the camera. */
  flat?: boolean;
}

interface Live {
  card: Card;
  mats: StandardMaterial[];
  matIndex: number;
  colourTicks: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  drag: number;
  dragY: number;
  gravity: number;
  size: number;
  aspect: number;
  grow: number;
  growMul: number;
  roll: number;
  spin: number;
  reroll: boolean;
  lastTick: number;
  age: number;
  ticks: number;
  light: number;
  decay: number;
  lifeFade: boolean;
  brightness: ((age: number) => number) | undefined;
  minLight: number;
  follow: PointSource | undefined;
  until: (() => boolean) | undefined;
  bounce: readonly [number, number, number] | undefined;
  flat: boolean;
}

const live: Live[] = [];
const free: Live[] = [];
let liveScene: Scene | null = null;

/** How many cards are up (debug). */
export function cardCount(): number {
  return live.length;
}

const ramps = new Map<string, StandardMaterial[]>();
const tmp = new Vector3();

function materialsFor(scene: Scene, texture: string, from: RGB, to: RGB | undefined): StandardMaterial[] {
  if (!to) return [additiveMaterial(scene, texture, from)];
  const key = `${texture}|${from.join(',')}|${to.join(',')}|${lightCardGain(scene)}`;
  let mats = ramps.get(key);
  if (!mats) {
    mats = [];
    for (let i = 0; i < RAMP_STEPS; i++) {
      const k = i / (RAMP_STEPS - 1);
      mats.push(additiveMaterial(scene, texture, [lerp(from[0], to[0], k), lerp(from[1], to[1], k), lerp(from[2], to[2], k)]));
    }
    ramps.set(key, mats);
  }
  return mats;
}

function spawn(scene: Scene, at: Vector3, o: CardOptions): EffectHandle {
  if (live.length >= MAX_CARDS) return DEAD_HANDLE;
  liveScene = scene;
  const mats = materialsFor(scene, o.texture, o.colour, o.colourEnd);
  const card = acquireCard(scene, mats[0], !o.flat);
  if (o.flat) card.rotation.x = Math.PI / 2;
  const off = o.offset;
  const v = o.velocity;
  const s = free.pop() ?? ({} as Live);
  s.card = card;
  s.mats = mats;
  s.matIndex = 0;
  s.colourTicks = o.colourTicks ?? o.ticks;
  s.x = at.x + (off ? off[0] : 0);
  s.y = at.y + (off ? off[1] : 0);
  s.z = at.z + (off ? off[2] : 0);
  s.vx = v ? v[0] : 0;
  s.vy = v ? v[1] : 0;
  s.vz = v ? v[2] : 0;
  s.drag = o.drag ?? 1;
  s.dragY = o.dragY ?? s.drag;
  s.gravity = o.gravity ?? 0;
  s.size = o.size;
  s.aspect = o.aspect ?? 1;
  s.grow = o.grow ?? 0;
  s.growMul = o.growMul ?? 1;
  s.roll = o.roll ?? 0;
  s.spin = o.spin ?? 0;
  s.reroll = !!o.rerollEachTick;
  s.lastTick = -1;
  s.age = 0;
  s.ticks = o.ticks;
  s.light = o.light ?? 1;
  s.decay = o.decay ?? 1;
  s.lifeFade = !!o.lifeFade;
  s.brightness = o.brightness;
  s.minLight = o.minLight ?? 0;
  s.follow = o.follow;
  s.until = o.until;
  s.bounce = o.bounce;
  s.flat = !!o.flat;
  if (s.follow) {
    // The follow point is added every frame; keep only the offset.
    s.x -= at.x;
    s.y -= at.y;
    s.z -= at.z;
  }
  place(s, 0);
  live.push(s);
  return DEAD_HANDLE;
}

function place(s: Live, vis: number): void {
  const c = s.card;
  if (s.follow) {
    s.follow(tmp);
    c.position.set(tmp.x + s.x, tmp.y + s.y, tmp.z + s.z);
  } else {
    c.position.set(s.x, s.y, s.z);
  }
  c.scaling.set(s.size, s.size * s.aspect, s.size);
  if (s.flat) c.rotation.y = s.roll;
  else c.rotation.z = s.roll;
  c.visibility = vis;
}

function kill(i: number): void {
  const s = live[i];
  live[i] = live[live.length - 1];
  live.pop();
  if (liveScene) releaseCard(liveScene, s.card);
  s.follow = undefined;
  s.until = undefined;
  s.brightness = undefined;
  free.push(s);
}

function update(_map: number, dt: number): void {
  const k = dt / TICK;
  for (let i = live.length - 1; i >= 0; i--) {
    const s = live[i];
    s.age += k;
    if (s.age >= s.ticks || s.until?.()) {
      kill(i);
      continue;
    }
    s.x += s.vx * k;
    s.y += s.vy * k;
    s.z += s.vz * k;
    if (s.drag !== 1) {
      const d = s.drag ** k;
      s.vx *= d;
      s.vz *= d;
    }
    if (s.dragY !== 1) s.vy *= s.dragY ** k;
    s.vy -= s.gravity * k;
    if (s.bounce && !s.follow) {
      const ground = (Store.world?.getTerrainHeight(s.x, s.z) ?? -9999) + s.bounce[0];
      if (ground > -9000 && s.y < ground) {
        s.y = ground;
        s.vy = -s.vy * s.bounce[1];
        s.age += s.bounce[2];
      }
    }
    if (s.growMul !== 1) s.size *= s.growMul ** k;
    s.size += s.grow * k;
    if (s.size <= 0) {
      kill(i);
      continue;
    }
    const tick = Math.floor(s.age);
    if (s.reroll && tick !== s.lastTick) s.roll = Math.random() * Math.PI * 2;
    else s.roll += s.spin * k;
    s.lastTick = tick;
    let b = s.light;
    if (s.decay !== 1) b *= s.decay ** s.age;
    if (s.lifeFade) b *= 1 - s.age / s.ticks;
    if (s.brightness) b *= s.brightness(s.age);
    if (b < s.minLight) {
      kill(i);
      continue;
    }
    if (s.mats.length > 1) {
      const m = Math.min(s.mats.length - 1, Math.round(clamp01(s.age / s.colourTicks) * (s.mats.length - 1)));
      if (m !== s.matIndex) {
        s.matIndex = m;
        s.card.material = s.mats[m];
      }
    }
    // Until the sheet is in, the card would be a solid square of the tint.
    const ready = (s.card.material as StandardMaterial).diffuseTexture ? 1 : 0;
    place(s, ready * clamp01(b));
  }
}

function reset(): void {
  for (let i = live.length - 1; i >= 0; i--) kill(i);
  ramps.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const cardsLayer: EffectLayer<CardOptions, 'cards'> = {
  name: 'cards',
  update,
  reset,
  spawn,
};
