import { TW_NOGROUND } from '../../common/terrain/consts';
import { sound } from '../../sound';
import type { World } from '../../ecs/world';
import { BLOOD_CASTLE_MOAT } from './spec';

/**
 * The Blood Castle drawbridge's state, shared by the gate (type 36) and the
 * deck and chains it becomes (9/10). This is `g_iActionObjectType /
 * g_iActionTime / g_fActionObjectVelocity` (ZzzObject.cpp:50-58) narrowed to
 * the one object that uses them on this map.
 *
 * **The trigger is the moat.** `AddTerrainAttributeRange(13, 70, 3, 6,
 * TW_NOGROUND, false)` is what the fall ends with (:159), and it is also what
 * the server sends on its own when the players have earned the bridge - one
 * `ChangeTerrainAttributes` over the same eighteen tiles, written into the
 * terrain by `libs/mu/terrainAttributeUpdates`. So the gate watches that flag:
 *
 *  - clear already when the gate prop is built - warped in after the bridge
 *    was down - and it starts down, the instant `SetActionObject(world, 36, 0,
 *    1)` of `ReceiveSetAttribute` (WSclient.cpp:8949);
 *  - clearing while we are standing there, and it falls:
 *    `SetActionObject(world, 36, 20, 1)` (NewBloodCastleSystem.cpp:70) -
 *    twenty ticks, pitch from 35 degrees up to 90 at a velocity that grows
 *    1.5 degrees a tick, a smoke burst as it passes 80, `SOUND_DOWN_GATE` on
 *    the first tick (ZzzObject.cpp:96-131).
 *
 * The original hangs the animated version on match state 3 instead, which
 * this server does not send: its gate-destroyed state is the wire value 4,
 * the original's "already down" state, and it arrives when the Castle Gate
 * *monster* dies - a different moment, later, on the far side of the moat.
 *
 * Read by: the two object classes in this folder.
 */

// ---- 1. tuning -------------------------------------------------------------

/** `SetActionObject(..., 36, 20, 1.f)`: ticks the fall takes. */
const FALL_TICKS = 20;
/** `o->Angle[0] = 35.f` on the first tick. */
const START_PITCH_DEG = 35;
/** Where it stops and vanishes: `if (o->Angle[0] >= 90.f)`. */
const END_PITCH_DEG = 90;
/** `g_fActionObjectVelocity = 1` to start, `+= 1.5f` a tick. */
const START_VELOCITY = 1;
const VELOCITY_GAIN = 1.5;
/** The smoke burst fires as the pitch passes this. */
const SMOKE_PITCH_DEG = 80;
/** Reference tick, seconds. */
const TICK = 1 / 25;

// ---- 2. state + readers ----------------------------------------------------

type Phase = 'up' | 'falling' | 'down';

let phase: Phase = 'up';
let ticksLeft = 0;
let pitch = 0;
let velocity = 0;
let smoked = false;
let accumulator = 0;
/** Whether the first look at the moat has happened yet (see `updateBloodCastleGate`). */
let sampled = false;

/** True once the gate is gone and the bridge is there. */
export function bloodCastleGateDown(): boolean {
  return phase === 'down';
}

/** `o->Angle[0]` in MU degrees while the gate is falling, else null. */
export function bloodCastleGatePitch(): number | null {
  return phase === 'falling' ? pitch : null;
}

/** True on the one tick the smoke burst is due. */
export function bloodCastleGateSmokeDue(): boolean {
  if (phase !== 'falling' || smoked || pitch < SMOKE_PITCH_DEG) return false;
  smoked = true;
  return true;
}

/** Fresh map: the gate stands. Called from `createBloodCastle`. */
export function resetBloodCastleGate(): void {
  phase = 'up';
  ticksLeft = 0;
  pitch = 0;
  velocity = 0;
  smoked = false;
  accumulator = 0;
  sampled = false;
}

function moatOpen(world: World): boolean {
  const m = BLOOD_CASTLE_MOAT;
  return !(world.getTerrainFlag(m.x + 1, m.y + 2) & TW_NOGROUND);
}

function open(): void {
  phase = 'down';
}

function startFall(): void {
  phase = 'falling';
  ticksLeft = FALL_TICKS;
  pitch = START_PITCH_DEG;
  velocity = START_VELOCITY;
  smoked = false;
  sound.play('Sound/eDownGate');
}

/**
 * Advance by `dt` seconds. The trigger is polled here rather than wired to
 * the packet bus: the gate is the only consumer, the poll is one flag read,
 * and it keeps this file free of a listener that would outlive the map.
 */
export function updateBloodCastleGate(world: World, dt: number): void {
  if (phase === 'down') return;

  if (phase === 'up') {
    // The first poll only records where the moat stood when we arrived: open
    // then means the bridge was earned before we got here and there is
    // nothing to watch fall. Any clearing after that is the fall itself.
    if (!sampled) {
      sampled = true;
      if (moatOpen(world)) open();
      return;
    }
    if (moatOpen(world)) startFall();
    return;
  }

  accumulator += dt;
  while (accumulator >= TICK && phase === 'falling') {
    accumulator -= TICK;
    pitch = Math.min(END_PITCH_DEG, pitch + velocity);
    velocity += VELOCITY_GAIN;
    if (--ticksLeft <= 0) open();
  }
}
