import { ENUM_WORLD } from '../../core/types';
import { PlayerAction } from '@versions/shared/objects/enum';
import { Rand } from '../../core/rand';
import { maps } from '../maps';
import { SoundsManager } from './soundsManager';
import { busGain, type SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { listenerHero, listenerWorld } from './listener';

/**
 * The hero's footsteps: `PlayWalkSound` picked by map + tile under the foot
 * (soil, grass, snow, swim), fired at the two foot-down frames of every walk
 * / run clip.
 *
 * Driven by: the hero's current animation frame each frame.
 * Read by: nothing - it only plays.
 */

// ---- 1. tuning -------------------------------------------------------------

/** The hero's own stride, its own category (`controllers/sound/buses.ts`). */
const BUS: SoundBus = 'steps';

/** `o->AnimationFrame` (BMD keys) at which each foot lands (ZzzCharacter.cpp:6241-6249). */
export const FOOT_DOWN_FRAMES: readonly [number, number] = [1.5, 4.5];

/** Pitch jitter so a run does not sound like a loop. */
const PITCH_MIN = 0.95;
const PITCH_MAX = 1.05;

/**
 * One `PlayWalkSound` branch: the step a map plays when `on` (the tile
 * under the hero) and `outsideSafeZone` (the swim rule) both hold. The
 * first matching row wins; no row falls through to `DEFAULT_STEP`. Each map
 * writes its own (`MapSound.footsteps`).
 */
export type StepRule = {
  readonly sound: Sounds;
  /** Tile predicate; omit for every tile. */
  readonly on?: (tile: number) => boolean;
  /** `!inSafeZone`: swimming only outside the dock. */
  readonly outsideSafeZone?: boolean;
};

/** `PlayWalkSound`'s `else` branch (ZzzCharacter.cpp). */
const DEFAULT_STEP: Sounds = 'Sound/pWalk(Soil)';

// ---- 2. state + readers ----------------------------------------------------

let foot0 = false;
let foot1 = false;
let lastCurrentFrame = 0;

/** `PlayWalkSound`: the step for the tile under the hero right now. */
export function footstepSound(): Sounds | null {
  const world = listenerWorld();
  const hero = listenerHero();
  if (!world || !hero) return null;

  // `if (o->CurrentAction == PLAYER_FLY || PLAYER_FLY_CROSSBOW) {}` - the
  // original guards on the clip, not on a flying flag, so a winged
  // character still lands a footstep when it walks in a safe zone.
  const action = hero.playerAnimation?.action;
  if (
    action === PlayerAction.PLAYER_FLY ||
    action === PlayerAction.PLAYER_FLY_CROSSBOW
  ) {
    return null;
  }

  const map = hero.worldIndex ?? ENUM_WORLD.WD_0LORENCIA;
  const rules = maps.rowFor(map, l => l.sound?.footsteps);
  if (!rules) return DEFAULT_STEP;

  const heroTile = world.getTerrainTile(
    ~~hero.transform.pos.x,
    ~~hero.transform.pos.z
  );
  const inSafeZone = hero.attributeSystem.isAboveZero('inSafeZone');

  for (const rule of rules) {
    if (rule.on && !rule.on(heroTile)) continue;
    if (rule.outsideSafeZone && inSafeZone) continue;
    return rule.sound;
  }
  return DEFAULT_STEP;
}

/** Play one footstep for the tile under the hero. */
export function playFootstep(): void {
  // Not through `playSfx`: a footstep is never attenuated (it is under the
  // listener) and it needs the per-play pitch below, which `playSfx` throttle
  // aside has no way to carry.
  const gain = busGain(BUS);
  if (gain <= 0) return;

  const sfx = footstepSound();
  if (!sfx) return;
  const sound = SoundsManager.loadAndPlaySoundEffect(sfx);
  if (!sound) return;
  sound.setVolume(gain);
  sound.setPlaybackRate(Rand.nextFloat(PITCH_MIN, PITCH_MAX));
}

function isWalkClip(playerAction: PlayerAction): boolean {
  return (
    (playerAction >= PlayerAction.PLAYER_WALK_MALE &&
      playerAction <= PlayerAction.PLAYER_RUN_RIDE_WEAPON) ||
    playerAction == PlayerAction.PLAYER_WALK_TWO_HAND_SWORD_TWO ||
    playerAction == PlayerAction.PLAYER_RUN_TWO_HAND_SWORD_TWO ||
    playerAction == PlayerAction.PLAYER_RUN_RIDE_HORSE ||
    playerAction == PlayerAction.PLAYER_RAGE_UNI_RUN ||
    playerAction == PlayerAction.PLAYER_RAGE_UNI_RUN_ONE_RIGHT
  );
}

function update(_map: ENUM_WORLD, _dt: number): void {
  const modelObject = listenerHero()?.modelObject;
  if (!modelObject) return;

  // `o->CurrentAction`, the clip the body plays: a hero in a whole monster's
  // body plays monster clips, and like the original (not MODEL_PLAYER) takes
  // no steps.
  const playerAction = modelObject.CurrentAction as PlayerAction;
  if (!isWalkClip(playerAction)) {
    foot0 = false;
    foot1 = false;
    lastCurrentFrame = 0;
    return;
  }

  const currentFrame = modelObject.actionFrame();
  if (currentFrame < lastCurrentFrame) {
    foot0 = false;
    foot1 = false;
  }

  lastCurrentFrame = currentFrame;
  if (currentFrame >= FOOT_DOWN_FRAMES[0] && !foot0) {
    foot0 = true;
    playFootstep();
  }
  if (currentFrame >= FOOT_DOWN_FRAMES[1] && !foot1) {
    foot1 = true;
    playFootstep();
  }
}

function reset(): void {
  foot0 = false;
  foot1 = false;
  lastCurrentFrame = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const footstepsLayer: SoundLayer = { name: 'footsteps', update, reset };
