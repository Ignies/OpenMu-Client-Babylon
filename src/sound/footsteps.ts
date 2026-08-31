import { ENUM_WORLD } from '../common/types';
import { PlayerAction } from '../common/objects/enum';
import { Rand } from '../common/rand';
import { KALIMA_WORLDS, onWorlds } from '../common/worldAssets';
import { SoundsManager } from '../libs/soundsManager';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { listenerHero, listenerWorld } from './listener';

/**
 * The hero's footsteps: `PlayWalkSound` picked by map + tile under the foot
 * (soil, grass, snow, swim), fired at the two foot-down frames of every walk
 * / run clip.
 *
 * Driven by: the hero's current animation frame each frame.
 * Read by: nothing — it only plays.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Clip frames at which the left / right foot lands. */
const FOOT_DOWN_FRAMES: readonly [number, number] = [1.0, 9.0];

/** Pitch jitter so a run does not sound like a loop. */
const PITCH_MIN = 0.95;
const PITCH_MAX = 1.05;

/** Devias tiles that are *not* snow (interior floor): 3 and 10+. */
const DEVIAS_SNOW = (tile: number) => tile !== 3 && tile < 10;
/** Grass tile on the outdoor maps. */
const GRASS_TILE = 0;
const onGrass = (tile: number) => tile === GRASS_TILE;

/**
 * One `PlayWalkSound` branch: the step a world plays when `on` (the tile
 * under the hero) and `outsideSafeZone` (the swim rule) both hold. The
 * first matching row wins; no row falls through to `DEFAULT_STEP`.
 */
type StepRule = {
  readonly sound: Sounds;
  /** Tile predicate; omit for every tile. */
  readonly on?: (tile: number) => boolean;
  /** `!inSafeZone`: swimming only outside the dock. */
  readonly outsideSafeZone?: boolean;
};

const SNOW: StepRule = { sound: 'Sound/pWalk(Snow)' };
const GRASS: StepRule = { sound: 'Sound/pWalk(Grass)', on: onGrass };
const SWIM: StepRule = { sound: 'Sound/pSwim', outsideSafeZone: true };

/** `PlayWalkSound`'s `else` branch. */
const DEFAULT_STEP: Sounds = 'Sound/pWalk(Soil)';

/** `PlayWalkSound` (ZzzCharacter.cpp), one row per world it tests. */
const STEP_BY_WORLD: Partial<Record<ENUM_WORLD, readonly StepRule[]>> = {
  // `HeroTile != 3 && HeroTile < 10`: the interior floors are boards.
  [ENUM_WORLD.WD_2DEVIAS]: [{ ...SNOW, on: DEVIAS_SNOW }],
  [ENUM_WORLD.WD_0LORENCIA]: [GRASS],
  [ENUM_WORLD.WD_3NORIA]: [GRASS],
  // Atlans, the Kalima floors and Doppelganger 3 are underwater / awash:
  // `SOUND_HUMAN_SWIM` wherever the hero is not in the safe zone.
  [ENUM_WORLD.WD_7ATLANSE]: [SWIM],
  ...onWorlds(KALIMA_WORLDS, [SWIM] as readonly StepRule[]),
  [ENUM_WORLD.WD_67DOPPLEGANGER3]: [SWIM],
  // `else if (isIceCity) PlayBuffer(SOUND_HUMAN_WALK_SNOW)`, and the same
  // for Santa Town: snow on every tile.
  [ENUM_WORLD.WD_57ICECITY]: [SNOW],
  [ENUM_WORLD.WD_58ICECITY_BOSS]: [SNOW],
  [ENUM_WORLD.WD_62SANTA_TOWN]: [SNOW],
};

// ---- 2. state + readers ----------------------------------------------------

let foot0 = false;
let foot1 = false;
let lastCurrentFrame = 0;

/** `PlayWalkSound`: the step for the tile under the hero right now. */
export function footstepSound(): Sounds | null {
  const world = listenerWorld();
  const hero = listenerHero();
  if (!world || !hero) return null;

  // `if (o->CurrentAction == PLAYER_FLY || PLAYER_FLY_CROSSBOW) {}` — the
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
  const rules = STEP_BY_WORLD[map];
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
  const sfx = footstepSound();
  if (!sfx) return;
  const sound = SoundsManager.loadAndPlaySoundEffect(sfx);
  if (sound) sound.setPlaybackRate(Rand.nextFloat(PITCH_MIN, PITCH_MAX));
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
  const hero = listenerHero();
  if (!hero) return;

  const modelObject = hero.modelObject;
  if (!modelObject) return;

  const animationGroups = modelObject.gltf?.animationGroups;
  if (!animationGroups) return;

  const playerAction = hero.playerAnimation.action;

  const animationGroup = animationGroups[playerAction];
  if (!animationGroup) return;

  const animatable = animationGroup.animatables[0];
  if (!animatable) return;

  const anim = animatable.getAnimations()[0];
  if (!anim) return;

  const currentFrame = anim.currentFrame;

  if (!isWalkClip(playerAction)) {
    foot0 = false;
    foot1 = false;
    lastCurrentFrame = 0;
    return;
  }

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
