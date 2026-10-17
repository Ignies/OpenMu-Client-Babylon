import { useEffect, useState } from 'react';
import { isOn } from '@/controllers/fidelity';

/**
 * Ours (`loadBarCreep`): a load bar that never stands still. Each report sends the bar, as a
 * compositor transition, toward a point past it over `CREEP_SECONDS`; the next report retargets
 * it. Done goes straight to 1. Off (Classic), the bar shows the report as it is.
 */

/** A stalled bar stops short of this. */
export const CREEP_CAP = 0.97;

const CREEP_SECONDS = 10;
/** The share of what is left the bar creeps into: enough to keep moving, not to run ahead of the text. */
const CREEP_SHARE = 0.2;
const DONE_SECONDS = 0.25;
/** Long enough for the first paint to land (a fresh element has nothing to animate from). */
const ARM_MS = 50;

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

/** Where the bar heads from `progress`: `CREEP_SHARE` of the way to `CREEP_CAP`, never behind it. */
export function creepTarget(progress: number): number {
  const p = clamp01(progress);
  return p >= 1 ? 1 : Math.max(p, p + (CREEP_CAP - p) * CREEP_SHARE);
}

/** What a bar shows and the transition that carries it there; no transition keeps the CSS one. */
export function barMotion(progress: number, armed: boolean): { shown: number; transition?: string } {
  if (!armed || !isOn('loadBarCreep')) return { shown: clamp01(progress) };
  const done = clamp01(progress) >= 1;
  return {
    shown: creepTarget(progress),
    transition: done ? `transform ${DONE_SECONDS}s ease-out` : `transform ${CREEP_SECONDS}s cubic-bezier(0.2, 0.6, 0.35, 1)`,
  };
}

/** `barMotion` for a bar that just mounted: it starts creeping `ARM_MS` after its first paint. */
export function useBarMotion(progress: number): { shown: number; transition?: string } {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    // A timer rather than animation frames: those stop while the window is covered.
    const timer = setTimeout(() => setArmed(true), ARM_MS);
    return () => clearTimeout(timer);
  }, []);
  return barMotion(progress, armed);
}
