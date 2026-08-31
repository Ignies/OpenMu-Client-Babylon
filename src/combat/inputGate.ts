/**
 * The `MouseUpdateTime` / `MouseUpdateTimeMax` input gate
 * (ZzzInterface.cpp:92-93, :7510-7791): the original polls the mouse for a
 * new attack / move only every `MouseUpdateTimeMax` reference ticks, and a
 * swing that fires (`Action()`, :3341) opens the gate immediately so the
 * next click is honoured on the very next poll. Nothing else gates a basic
 * attack — the swing clip is restarted, not waited for.
 *
 * Driven by `attackSystem` (consumes / forces the gate); read by
 * `attackSystem` and `skillCastSystem` before they accept a click.
 */
import type { ENUM_WORLD } from '../common/types';
import { REFERENCE_FPS } from '../common/playSpeed';
import type { CombatLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** `MouseUpdateTimeMax = 6` reference ticks at 25 Hz: the default poll gap. */
const MOUSE_UPDATE_TICKS_MAX = 6;

/** The same gap in seconds — 0.24 s, the swing-rate floor of the todo. */
export const MOUSE_UPDATE_SECONDS_MAX = MOUSE_UPDATE_TICKS_MAX / REFERENCE_FPS;

// ---- 2. state + readers ----------------------------------------------------

/** Seconds since the gate was last consumed; starts open. */
let sinceConsumed = MOUSE_UPDATE_SECONDS_MAX;

/** `MouseUpdateTime >= MouseUpdateTimeMax`: a click may be acted on now. */
export function inputGateOpen(): boolean {
  return sinceConsumed >= MOUSE_UPDATE_SECONDS_MAX;
}

/** Seconds until the gate opens again, 0 when open. */
export function inputGateRemaining(): number {
  return Math.max(0, MOUSE_UPDATE_SECONDS_MAX - sinceConsumed);
}

/** Command: `MouseUpdateTime = 0` — a click was acted on. */
export function consumeInputGate(): void {
  sinceConsumed = 0;
}

/** Command: `MouseUpdateTime = MouseUpdateTimeMax` — a swing fired, poll again next frame. */
export function forceInputGate(): void {
  sinceConsumed = MOUSE_UPDATE_SECONDS_MAX;
}

function update(_map: ENUM_WORLD, dt: number): void {
  if (sinceConsumed < MOUSE_UPDATE_SECONDS_MAX) sinceConsumed += dt;
}

function reset(): void {
  sinceConsumed = MOUSE_UPDATE_SECONDS_MAX;
}

// ---- 3. the layer ----------------------------------------------------------

export const inputGateLayer: CombatLayer = {
  name: 'inputGate',
  update,
  reset,
};
