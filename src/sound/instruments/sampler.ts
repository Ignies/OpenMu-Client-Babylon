import { noteSource, type DecodedBank } from './bank';

/**
 * The voices. One `AudioBufferSourceNode` per sounding note, through its own
 * envelope gain, into the performer's gain (distance) and on to the bus the
 * layer owns. Pure Web Audio over a context and an output node handed in.
 *
 * A wind (`manifest.sustained`) plays its render until note-off, then a short
 * release; a note held past the render simply ends - the pre-rendered notes
 * have no loop points. A plucked string carries its own decay and note-off
 * only damps the tail, over the bank's longer release. Polyphony is capped
 * per performer and overall; the oldest voice gives way.
 *
 * The makeup gain that lifts the quiet renders lives in each voice's peak,
 * ahead of the performer's distance gain: a far performer is a quiet one,
 * and the limiter after the bus only meets the loud chords played nearby.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Voices one performer may hold. A guitar arpeggio with ringing tails wants a few. */
const MAX_VOICES_PER_PERFORMER = 24;

/** Voices across every performer in earshot. */
const MAX_VOICES = 96;

/** Seconds a stolen or retriggered voice takes to get out of the way. */
const STEAL_FADE = 0.01;

/** Peak gain of a full-velocity note before the makeup; leaves headroom for the polyphony above. */
const PEAK = 0.8;

/** Velocity curve: MIDI 127 is loud, 64 is a little under half. */
const VELOCITY_CURVE = 1.6;

// ---- 2. the envelope -------------------------------------------------------

export type PerformerKey = string;

/** The part of a voice's envelope known ahead: 0 at `startedAt`, `peak` from `attackEnd` on. */
export type Envelope = { startedAt: number; attackEnd: number; peak: number };

/**
 * The envelope's level at audio time `at`, from its own schedule. An
 * AudioParam's `.value` is its level *now*, and a note-off is scheduled a
 * quarter second ahead: reading it there pinned the level of a note that had
 * not started yet - the node's default, 1 - onto the start of the release.
 */
export function envelopeLevelAt(env: Envelope, at: number): number {
  if (at >= env.attackEnd) return env.peak;
  if (at <= env.startedAt) return 0;
  return (env.peak * (at - env.startedAt)) / (env.attackEnd - env.startedAt);
}

type Voice = Envelope & {
  src: AudioBufferSourceNode;
  env: GainNode;
  performer: PerformerKey;
  channel: number;
  note: number;
  release: number;
  ended: boolean;
};

// ---- 3. the sampler --------------------------------------------------------

export class Sampler {
  private readonly voices = new Set<Voice>();
  private readonly performers = new Map<PerformerKey, GainNode>();

  /** `makeup` multiplies every voice's peak: the renders' lift to a normal loudness. */
  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
    private readonly makeup = 1
  ) {}

  get voiceCount(): number {
    return this.voices.size;
  }

  /** The performer's gain node, made on first use at `initialGain`. */
  performerNode(key: PerformerKey, initialGain = 1): GainNode {
    let node = this.performers.get(key);
    if (!node) {
      node = this.ctx.createGain();
      node.gain.value = initialGain;
      node.connect(this.out);
      this.performers.set(key, node);
    }
    return node;
  }

  setPerformerGain(key: PerformerKey, gain: number, ramp = 0.05): void {
    const node = this.performers.get(key);
    if (!node) return;
    node.gain.setTargetAtTime(gain, this.ctx.currentTime, ramp);
  }

  /** `gain` is the performer's level should this be their first note. */
  noteOn(
    key: PerformerKey,
    bank: DecodedBank,
    channel: number,
    note: number,
    velocity: number,
    when: number,
    gain = 1
  ): void {
    const source = noteSource(bank, note);
    if (!source) return;

    // The same note again on this performer and channel: the old voice goes.
    for (const v of this.voices) {
      if (v.performer === key && v.channel === channel && v.note === note) this.end(v, when, STEAL_FADE);
    }
    this.makeRoom(key, when);

    const { manifest } = bank;
    const env = this.ctx.createGain();
    env.connect(this.performerNode(key, gain));

    const src = this.ctx.createBufferSource();
    src.buffer = source.buffer;
    src.playbackRate.value = source.rate;
    src.connect(env);

    const peak = this.makeup * PEAK * Math.pow(Math.max(0, Math.min(127, velocity)) / 127, VELOCITY_CURVE);
    const start = Math.max(when, this.ctx.currentTime);
    const attackEnd = start + manifest.attack;
    env.gain.value = 0;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(peak, attackEnd);

    const voice: Voice = {
      src,
      env,
      performer: key,
      channel,
      note,
      startedAt: start,
      attackEnd,
      peak,
      release: manifest.release,
      ended: false,
    };
    this.voices.add(voice);

    src.onended = () => {
      this.voices.delete(voice);
      env.disconnect();
    };
    src.start(start);
  }

  noteOff(key: PerformerKey, channel: number, note: number, when: number): void {
    for (const v of this.voices) {
      if (v.performer === key && v.channel === channel && v.note === note) this.end(v, when, v.release);
    }
  }

  /** Every voice of a performer, or every voice at all, released now. */
  allNotesOff(key?: PerformerKey, when = this.ctx.currentTime): void {
    for (const v of this.voices) {
      if (key === undefined || v.performer === key) this.end(v, when, v.release);
    }
  }

  /** The performer is gone: silence and drop its node. */
  dropPerformer(key: PerformerKey): void {
    this.allNotesOff(key);
    const node = this.performers.get(key);
    if (node) {
      node.disconnect();
      this.performers.delete(key);
    }
  }

  /**
   * Release from `when` over `release` seconds: hold the level the envelope
   * has there, then ramp to nothing. A release inside the attack waits for
   * the attack to end - cancelling the attack ramp would drop the note to
   * silence for the frames in between.
   */
  private end(v: Voice, when: number, release: number): void {
    if (v.ended) return;
    v.ended = true;
    const at = Math.max(when, this.ctx.currentTime, v.attackEnd);
    const g = v.env.gain;
    g.cancelScheduledValues(at);
    g.setValueAtTime(envelopeLevelAt(v, at), at);
    g.linearRampToValueAtTime(0, at + release);
    try {
      v.src.stop(at + release + 0.01);
    } catch {
      // Already stopped.
    }
  }

  private makeRoom(key: PerformerKey, when: number): void {
    let mine = 0;
    let oldestMine: Voice | null = null;
    let oldest: Voice | null = null;
    for (const v of this.voices) {
      if (v.ended) continue;
      if (!oldest || v.startedAt < oldest.startedAt) oldest = v;
      if (v.performer === key) {
        mine++;
        if (!oldestMine || v.startedAt < oldestMine.startedAt) oldestMine = v;
      }
    }
    if (mine >= MAX_VOICES_PER_PERFORMER && oldestMine) this.end(oldestMine, when, STEAL_FADE);
    else if (this.voices.size >= MAX_VOICES && oldest) this.end(oldest, when, STEAL_FADE);
  }
}
