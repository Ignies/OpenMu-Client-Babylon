import { TW_NOGROUND } from '../../common/terrain/consts';
import { sound } from '../../sound';
import { bloodCastleTimer } from '../../events/bloodCastle';
import type { World } from '../../ecs/world';
import { BLOOD_CASTLE_GATE_PIT } from './spec';

/**
 * The Blood Castle gate's state, shared by the gate (type 36) and its two
 * debris halves (9/10). This is `g_iActionObjectType / g_iActionTime /
 * g_fActionObjectVelocity` (ZzzObject.cpp:50-58) narrowed to the one object
 * that uses them on this map.
 *
 * Driven by: `BloodCastleGateObject.Update` (the tick) and two triggers —
 *  - the match state `BloodCastleGateDestroyed` (the `BloodCastleState`
 *    packet, read through `events/bloodCastle`), which is the animated fall:
 *    `SetActionObject(world, 36, 20, 1)` — twenty ticks, pitch from 35° up to
 *    90° at a velocity that grows 1.5°/tick, a smoke burst as it passes 80°,
 *    `SOUND_DOWN_GATE` on the first tick (ZzzObject.cpp:96-131);
 *  - the server clearing `TW_NOGROUND` on the pit (`ReceiveSetAttribute`,
 *    WSclient.cpp:8333: `SetActionObject(world, 36, 0, 1)`), which is the
 *    instant version: gate hidden, pit open, debris shown.
 * Read by: the three object classes in this folder.
 */

// ---- 1. tuning -------------------------------------------------------------

/** `SetActionObject(…, 36, 20, 1.f)`: ticks the fall takes. */
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

/** True once the gate is gone and the pit is open. */
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
}

function open(world: World): void {
  phase = 'down';
  const p = BLOOD_CASTLE_GATE_PIT;
  world.setTerrainFlags(p.x, p.y, p.w, p.h, TW_NOGROUND, false);
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
 * Advance by `dt` seconds. Both triggers are polled here rather than wired to
 * the packet bus: the gate is the only consumer, the poll is one flag read,
 * and it keeps this file free of a listener that would outlive the map.
 */
export function updateBloodCastleGate(world: World, dt: number): void {
  if (phase === 'down') return;

  if (phase === 'up') {
    const p = BLOOD_CASTLE_GATE_PIT;
    if (!(world.getTerrainFlag(p.x + 1, p.y + 2) & TW_NOGROUND)) {
      // The server already opened the pit: the instant `SetActionObject(36, 0)`.
      open(world);
      return;
    }
    if (bloodCastleTimer().gateDestroyed) startFall();
    return;
  }

  accumulator += dt;
  while (accumulator >= TICK && phase === 'falling') {
    accumulator -= TICK;
    pitch = Math.min(END_PITCH_DEG, pitch + velocity);
    velocity += VELOCITY_GAIN;
    if (--ticksLeft <= 0) open(world);
  }
}
