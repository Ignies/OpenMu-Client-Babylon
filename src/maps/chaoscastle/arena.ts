import { TILE_CM, TW_NOGROUND } from '../../common/terrain/consts';
import { inChaosCastle } from '../../common/locomotion';
import { BloodCastleStatePacket } from '../../common/packets/ServerToClientPackets';
import { EventBus } from '../../libs/eventBus';
import { sound } from '../../sound';
import { Store } from '../../store';
import type { World } from '../../ecs/world';
import type { Mesh } from '../../libs/babylon/exports';
import {
  CHAOS_CASTLE_STAGES,
  CHAOS_CASTLE_STAGE_STATES,
  CHAOS_CASTLE_OUTER_RING,
} from './spec';

/**
 * The shrinking arena: `g_currentCastleLevel` + `SetActionObject(world, 1,
 * 40, 1)` (CSChaosCastle.cpp / NewChaosCastleSystem.cpp:83-119) as one state
 * machine for the map's ring objects.
 *
 * Driven by: the `BloodCastleState` packet, states 8/9/10 - each one closes
 * the next `TW_NOGROUND` strip, plays `SOUND_CHAOS_FALLING_STONE`
 * (`eWallFall`) and starts a 40-tick drop of the ring that just lost its
 * floor: eleven ticks of smoke and quake, then an accelerating fall
 * (`Position[2] = Start - (30 - t) * v; v += 0.4`), then hidden
 * (`MoveChaosCastleAllObject`, CSChaosCastle.cpp:226-338).
 * Read by: `ChaosCastleRingObject` (visibility, drop height, smoke tick).
 *
 * The floor under the ring falls with it. The original only stops drawing
 * those tiles (`RenderTerrainTile` skips `TW_NOGROUND`), so the floor was
 * simply gone; here the strip is copied out of the ground before it closes
 * (`world.detachGround`) and dropped with the ring. What the tiles *are* -
 * no ground, no walking - changes at once, as there.
 *
 * The original gates each state on `m_byCurrCastleLevel`, which it derives
 * from the kill count (`RenderMatchTimes`: 40 < kills <= 46 → 0, 30 < kills
 * <= 36 → 3, 20 < kills <= 26 → 6) to survive a repeated packet. Here the
 * guard is simply "this stage has not run yet", which is the same protection
 * without the client second-guessing the server's count.
 *
 * Not here: the quake (`EarthQuake = -0.1…-0.3` while the smoke runs) - the
 * clone has no camera-shake hook yet; and `RenderTerrainVisual`'s smoke on
 * the tiles of the strip about to close (one tile in eight, every frame).
 */

// ---- 1. tuning -------------------------------------------------------------

/** `SetActionObject(gMapManager.WorldActive, 1, 40, 1)`: ticks per drop. */
const DROP_TICKS = 40;
/** `kActionTriggerTime = 30`: the fall starts here; above it, smoke only. */
const FALL_START_TICK = 30;
/**
 * `g_fActionObjectVelocity` starts at 1 cm/tick and grows 0.4 every time a
 * falling object is moved - once per object in view per tick, not once per
 * tick, since every one of them adds to the same global. The more of the
 * ring on screen, the harder it plunges.
 */
const START_VELOCITY = 1;
const VELOCITY_GAIN = 0.4;
/** Reference tick, seconds. */
const TICK = 1 / 25;

// ---- 2. state + readers ----------------------------------------------------

type Drop = {
  types: ReadonlySet<number>;
  /** `g_iActionTime` for the next tick. */
  ticksLeft: number;
  velocity: number;
  /** Falling objects in view when the stage began: the velocity's gain per tick. */
  inView: number;
  /** cm below the start position. */
  offset: number;
  /** The floor strip that closed with this stage, falling with the ring. */
  floor: Mesh | null;
};

/** Stages completed so far (0..3). */
let stage = 0;
/** The ring currently on its way down, if any. */
let drop: Drop | null = null;
/** Rings that have already fallen and stay hidden. */
const fallen = new Set<number>();
/** Rings a stage has revealed. */
const shown = new Set<number>();
let accumulator = 0;
/** Wall-clock stamp of the last tick, so many objects share one advance. */
let lastNow = -1;

/** Whether a ring object of `type` should be drawn right now. */
export function chaosCastleRingVisible(type: number): boolean {
  if (fallen.has(type)) return false;
  if (CHAOS_CASTLE_OUTER_RING.includes(type)) return true;
  return shown.has(type);
}

/** cm the ring of `type` has dropped so far (0 while it stands). */
export function chaosCastleRingDrop(type: number): number {
  return drop && drop.types.has(type) ? drop.offset : 0;
}

/** True while `type` is in the smoke-and-quake lead-in of its drop. */
export function chaosCastleRingSmoking(type: number): boolean {
  return (
    drop !== null && drop.types.has(type) && drop.ticksLeft >= FALL_START_TICK
  );
}

/** Fresh arena on every warp in. Called from `createChaosCastle`. */
export function resetChaosCastleArena(): void {
  stage = 0;
  // Left over from the last visit: its floor went with that map's ground.
  drop = null;
  fallen.clear();
  shown.clear();
  accumulator = 0;
  lastNow = -1;
}

/** The ring is down: hidden for good, and its floor gone with it. */
function endDrop(): void {
  if (!drop) return;
  for (const t of drop.types) fallen.add(t);
  drop.floor?.dispose();
  drop = null;
}

function advance(world: World): void {
  const next = CHAOS_CASTLE_STAGES[stage];
  if (!next) return;
  stage++;

  // A ring still falling when the next stage lands is simply gone.
  endDrop();

  // Copied before the strip closes: closing it takes the tiles out of the
  // ground at once.
  const floor = world.detachGround(next.noGround);

  for (const [x, y, w, h] of next.noGround) {
    world.setTerrainFlags(x, y, w, h, TW_NOGROUND, true);
  }
  for (const t of next.shows) shown.add(t);

  let inView = 0;
  for (const e of world.with('modelId', 'modelObject', 'worldIndex')) {
    if (e.worldIndex !== world.mapIndex || e.modelObject.OutOfView) continue;
    if (next.falls.includes(e.modelId)) inView++;
  }

  drop = {
    types: new Set(next.falls),
    ticksLeft: DROP_TICKS,
    velocity: START_VELOCITY,
    inView,
    offset: 0,
    floor,
  };

  sound.play('Sound/eWallFall');
}

/**
 * Advance the drop by real time. Every ring object calls this from its
 * `Update`; the stamp makes the first caller in a frame do the work.
 */
export function updateChaosCastleArena(now: number, dt: number): void {
  if (now === lastNow) return;
  lastNow = now;

  if (!drop) return;

  accumulator += dt;
  while (accumulator >= TICK && drop) {
    accumulator -= TICK;
    // `MoveObjects` reads `g_iActionTime`, then counts it down.
    const t = drop.ticksLeft--;

    if (t >= FALL_START_TICK) continue;

    if (t <= 0) {
      endDrop();
      break;
    }

    drop.offset = (FALL_START_TICK - t) * drop.velocity;
    drop.velocity += VELOCITY_GAIN * drop.inView;
  }

  if (drop?.floor) drop.floor.position.y = -drop.offset / TILE_CM;
}

// ---- 3. the trigger --------------------------------------------------------

EventBus.on('BloodCastleState', packet => {
  const world = Store.world;
  if (!world || !inChaosCastle(world.mapIndex)) return;

  const p = new BloodCastleStatePacket(packet);
  const index = CHAOS_CASTLE_STAGE_STATES.indexOf(p.State as number);
  if (index < 0) return;

  // Each state maps to one stage and runs once, in order.
  if (index === stage) advance(world);
});
