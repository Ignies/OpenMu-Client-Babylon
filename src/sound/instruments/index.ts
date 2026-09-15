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

/** Makeup gain after the compressor, so a note is as loud as a game sound effect. */
const MAKEUP_GAIN = 2.2;

/** A performer quieter than this (by distance) does not duck the music. */
const DUCK_MIN_GAIN = 0.05;

/** Seconds the music stays ducked after the last note, so it does not flap. */
const DUCK_HOLD_SEC = 1.2;

// ---- 2. state + readers ----------------------------------------------------

type PerformerState = { x: number; z: number; local: boolean; gain: number };

let ctx: AudioContext | null = null;
let sampler: Sampler | null = null;
let bus: GainNode | null = null;
let busLevel = -1;
/** Audio time of the last audible note, for the music duck's release. */
let lastAudible = 0;

const banks = new Map<InstrumentId, DecodedBank>();
const loading = new Map<InstrumentId, Promise<boolean>>();
const performers = new Map<PerformerKey, PerformerState>();

/** Causes already written to the console, as `key:cause`. */
const reported = new Set<string>();

/**
 * One console line per performer and cause saying why their notes are not
 * heard: the thing to read on a client that stays silent.
 */
function report(key: PerformerKey, cause: string, text: string): void {
  const tag = `${key}:${cause}`;
  if (reported.has(tag)) return;
  reported.add(tag);
  console.warn(`band: ${key}: ${text}`);
}

function forget(key: PerformerKey): void {
  for (const tag of Array.from(reported)) {
    if (tag.startsWith(`${key}:`)) reported.delete(tag);
  }
}

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
  compressor.threshold.value = -10;
  compressor.ratio.value = 3;
  // The compressor tames a chord's peaks; on its own it also leaves a single
  // note far quieter than a game sound effect. A makeup gain after it brings
  // the whole instrument back up to a comparable loudness.
  const makeup = c.createGain();
  makeup.gain.value = MAKEUP_GAIN;
  bus.connect(compressor);
  compressor.connect(makeup);
  makeup.connect(engine.masterGain);
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
      console.info(`band: ${id} notes ready`);
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
 * A note starts at audio time `when`. Nothing when the bank is not in, the
 * context is locked, or the player has turned other performers off - each
 * said once on the console.
 */
export function noteOn(
  key: PerformerKey,
  instrument: InstrumentId,
  channel: number,
  note: number,
  velocity: number,
  when: number
): void {
  const p = performer(key);
  const bank = banks.get(instrument);
  if (!bank) {
    const state = loading.has(instrument) ? 'still loading' : 'not loaded';
    report(key, 'bank', `notes dropped, the ${instrument} notes are ${state}`);
    return;
  }
  if (!contextReady() || !sampler) {
    report(key, 'locked', 'notes dropped, audio is locked until the page is clicked');
    return;
  }
  if (!p.local && !GameOptions.hearInstruments) {
    report(key, 'muted', "notes dropped, other players' instruments are off in the options");
    return;
  }
  if (busLevel >= 0 && busLevel <= 0.001) {
    report(key, 'bus', 'notes play into a silent bus: a volume slider at zero, or the page in the background');
  }
  // The performer's node is made on their first note, at the level their
  // distance gives right now rather than full until the next frame.
  if (p.gain < 0) p.gain = gainFor(p);
  sampler.noteOn(key, bank, channel, note, velocity, when, p.gain);
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
  forget(key);
}

/** A performer's level from where they stand; the hero is always full. */
function gainFor(p: PerformerState, hero = listenerHero()): number {
  if (p.local || !hero) return 1;
  const dx = p.x - hero.transform.pos.x;
  const dz = p.z - hero.transform.pos.z;
  return distanceGain(Math.sqrt(dx * dx + dz * dz));
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
  let audible = 0;
  for (const [key, p] of performers) {
    const g = gainFor(p, hero);
    if (Math.abs(g - p.gain) > 0.01) {
      p.gain = g;
      sampler.setPerformerGain(key, g, DISTANCE_RAMP);
    }
    audible = Math.max(audible, g);
  }

  // Duck the background music while an instrument is heard nearby, and let it
  // rise again a moment after the last note so it does not flap between notes.
  const now = audioNow();
  if (sampler.voiceCount > 0 && audible > DUCK_MIN_GAIN) lastAudible = now;
  SoundsManager.setInstrumentsActive(now - lastAudible < DUCK_HOLD_SEC);
}

/** Map change: every performer is gone; the decoded banks stay. */
function reset(): void {
  if (sampler) for (const key of Array.from(performers.keys())) sampler.dropPerformer(key);
  performers.clear();
  reported.clear();
  lastAudible = 0;
  SoundsManager.setInstrumentsActive(false);
}

// ---- 3. the layer ----------------------------------------------------------

export const instrumentsLayer: SoundLayer = {
  name: 'instruments',
  update,
  reset,
};
