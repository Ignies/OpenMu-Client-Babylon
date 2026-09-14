import { GameOptions } from '../../common/gameOptions';
import type { InstrumentId } from '../../common/instruments';
import type { ENUM_WORLD } from '../../common/types';
import { Engine } from '../../libs/babylon/exports';
import { SoundsManager } from '../../libs/soundsManager';
import { busGain, masterGain } from '../buses';
import type { SoundLayer } from '../layer';
import { distanceGain, listenerHero } from '../listener';
import { loadBank, type DecodedBank } from './bank';
import { Sampler, type PerformerKey } from './sampler';

/**
 * Instruments played by players: the band system's sound.
 *
 * The first Web Audio graph in the client, on the context Babylon's engine
 * already owns: `voice -> performer gain -> instruments bus -> compressor ->
 * Engine.audioEngine.masterGain`, so the master slider and the background
 * mute reach it like everything else. The two Babylon tracks stay untouched
 * - their gain nodes are private - and the bus folds master x effects x
 * instruments itself.
 *
 * Driven by: `common/band` (the sequencer for the hero, one receiver per
 * remote performer) through the commands below. Positions come from
 * `BandSystem` once a frame. Read by nobody else.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Seconds the bus takes to follow a slider or the background mute. */
const BUS_RAMP = 0.1;

/** Seconds a performer's gain takes to follow their distance. */
const DISTANCE_RAMP = 0.05;

// ---- 2. state + readers ----------------------------------------------------

type PerformerState = { x: number; z: number; local: boolean; gain: number };

let ctx: AudioContext | null = null;
let sampler: Sampler | null = null;
let bus: GainNode | null = null;
let busLevel = -1;

const banks = new Map<InstrumentId, DecodedBank>();
const loading = new Map<InstrumentId, Promise<boolean>>();
const performers = new Map<PerformerKey, PerformerState>();

/** The context, once Babylon has made one; null before the scene exists. */
function context(): AudioContext | null {
  if (ctx) return ctx;
  const engine = Engine.audioEngine;
  const c = engine?.audioContext ?? null;
  if (!c || !engine) return null;

  ctx = c;
  bus = c.createGain();
  bus.gain.value = 0;
  const compressor = c.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.ratio.value = 4;
  bus.connect(compressor);
  compressor.connect(engine.masterGain);
  sampler = new Sampler(c, bus);
  return ctx;
}

/** Whether a note scheduled now would be heard: the context exists and the page has been touched. */
export function contextReady(): boolean {
  return SoundsManager.pageInteracted && context() !== null;
}

/** The audio clock, seconds; 0 before the context exists. */
export function audioNow(): number {
  return context()?.currentTime ?? 0;
}

export function bankReady(id: InstrumentId): boolean {
  return banks.has(id);
}

/**
 * Loads an instrument's notes if they are not in yet. Resolves to whether
 * the bank is playable; a failed load resolves false and is retried on the
 * next call.
 */
export function ensureBank(id: InstrumentId): Promise<boolean> {
  if (banks.has(id)) return Promise.resolve(true);
  const pending = loading.get(id);
  if (pending) return pending;

  const c = context();
  if (!c) return Promise.resolve(false);

  const task = loadBank(c, id)
    .then(bank => {
      banks.set(id, bank);
      return true;
    })
    .catch(err => {
      console.warn(`instrument bank ${id} failed to load:`, err);
      return false;
    })
    .finally(() => loading.delete(id));
  loading.set(id, task);
  return task;
}

function performer(key: PerformerKey): PerformerState {
  let p = performers.get(key);
  if (!p) {
    p = { x: 0, z: 0, local: false, gain: -1 };
    performers.set(key, p);
  }
  return p;
}

/** Where a performer stands, for the distance gain; `local` is the hero, always full. */
export function setPerformerPosition(key: PerformerKey, x: number, z: number, local = false): void {
  const p = performer(key);
  p.x = x;
  p.z = z;
  p.local = local;
}

/**
 * A note starts at audio time `when`. Silently nothing when the bank is not
 * in, the context is locked, or the player has turned other performers off.
 */
export function noteOn(
  key: PerformerKey,
  instrument: InstrumentId,
  channel: number,
  note: number,
  velocity: number,
  when: number
): void {
  const bank = banks.get(instrument);
  if (!bank || !contextReady() || !sampler) return;
  const p = performer(key);
  if (!p.local && !GameOptions.hearInstruments) return;
  sampler.noteOn(key, bank, channel, note, velocity, when);
}

export function noteOff(key: PerformerKey, channel: number, note: number, when: number): void {
  sampler?.noteOff(key, channel, note, when);
}

export function allNotesOff(key: PerformerKey): void {
  sampler?.allNotesOff(key);
}

/** The performer left: silence, and forget where they stood. */
export function dropPerformer(key: PerformerKey): void {
  sampler?.dropPerformer(key);
  performers.delete(key);
}

/** Voices sounding right now (debug). */
export function instrumentVoices(): number {
  return sampler?.voiceCount ?? 0;
}

function update(_map: ENUM_WORLD, _dt: number): void {
  if (!ctx || !bus || !sampler) return;

  const level =
    masterGain() *
    busGain('effects') *
    busGain('instruments') *
    (SoundsManager.backgrounded ? 0 : 1);
  if (Math.abs(level - busLevel) > 0.001) {
    busLevel = level;
    bus.gain.setTargetAtTime(level, ctx.currentTime, BUS_RAMP);
  }

  const hero = listenerHero();
  for (const [key, p] of performers) {
    let g = 1;
    if (!p.local && hero) {
      const dx = p.x - hero.transform.pos.x;
      const dz = p.z - hero.transform.pos.z;
      g = distanceGain(Math.sqrt(dx * dx + dz * dz));
    }
    if (Math.abs(g - p.gain) > 0.01) {
      p.gain = g;
      sampler.setPerformerGain(key, g, DISTANCE_RAMP);
    }
  }
}

/** Map change: every performer is gone; the decoded banks stay. */
function reset(): void {
  if (sampler) for (const key of Array.from(performers.keys())) sampler.dropPerformer(key);
  performers.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const instrumentsLayer: SoundLayer = {
  name: 'instruments',
  update,
  reset,
};
