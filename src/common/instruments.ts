import type { TextKey } from '../i18n';
import type { BmdLink } from './boneLink';
import { PlayerAction } from './objects/enum';

/**
 * The instruments a player can take out and play. THE registry: the emote
 * wheel's instrument ring, the Instrument window, the sampler, the band
 * system, the model attach and the wire id all read this table and nothing
 * else names an instrument.
 *
 * Adding one is one row here plus its assets:
 *   - `bun run tools/instrumentSamples.ts <id>` for the notes,
 *   - a builder in `tools/instrumentModels.ts` for the model(s),
 *   - `instrument.<id>` in every language.
 *
 * The wire carries the row's index (`bandProtocol.ts`), so the table is
 * append-only: never reorder or remove a row.
 */

export type InstrumentId = 'guitar' | 'flute' | 'ocarina' | 'harp' | 'drums';

/**
 * The pose is a few frames of an existing emote, copied into a clip of its
 * own and looped there and back (`band/instrumentClip.ts`): the rig has no
 * instrument animations and its clip table is full, but the end of Again is
 * hands at the mouth and the start of Hustle is arms out in front.
 */
export type InstrumentPose = {
  /** The male clip; `genderedEmoteAction` picks the female one. */
  clip: PlayerAction;
  /** The frames copied, as fractions of the clip: 0 = first key, 1 = last. */
  from: number;
  to: number;
  /**
   * How far the upper body follows those frames, 0..1: the copy is a hold
   * with this much of the source motion left in it (`instrumentClip.ts`).
   * Every bone's position and the legs hold regardless of it.
   */
  sway: number;
};

/**
 * One model hung on one bone. Degrees and centimetres in BMD bone space
 * (`boneLink.ts`); the model's own origin is where the bone holds it.
 */
export type InstrumentPart = {
  /** The model, under `game-assets/`. */
  model: string;
  /** The bone (`weaponAttachment.ts`: 33 right hand, 42 left hand, 0 the root). */
  bone: number;
  link: BmdLink;
};

export type InstrumentDefinition = {
  id: InstrumentId;
  labelKey: TextKey;
  /** Short glyph drawn in the wedge; the label is shown in the hub on hover. */
  glyph: string;
  /**
   * Where the notes come from (`tools/instrumentSamples.ts`): a MusyngKite
   * instrument name, or `kit:<name>` for a General MIDI drum kit.
   */
  bank: string;
  /**
   * A wind: the note sounds for as long as it is held and stops on note-off.
   * Otherwise the sample carries its own decay (a plucked string, a drum)
   * and note-off only shortens the tail.
   */
  sustained: boolean;
  /**
   * A drum kit: renders MIDI channel 10, where the note is the drum and not
   * a pitch, and nothing else - a melody has no place on a snare.
   */
  percussion?: true;
  /**
   * The main model, first: the instrument itself, or for a kit the right
   * stick. `parts` are the rest: a second stick, the kit standing at the
   * feet.
   */
  model: string;
  bone: number;
  link: BmdLink;
  parts?: readonly InstrumentPart[];
  /**
   * Where the note sprites are born, in the main model's own centimetres;
   * its origin when left out. A harp's origin is on the floor under the
   * pillar, its strings a metre up.
   */
  noteOffset?: [number, number, number];
  pose: InstrumentPose;
};

const A = PlayerAction;

/** Bones by name, so a row reads (`weaponAttachment.ts`). */
const RIGHT_HAND = 33;
const LEFT_HAND = 42;
/** `Bip01`, the root: held still by every pose, so a model at the feet stands still. */
const ROOT = 0;

/** The right hand up at the mouth, held with a small sway: the middle of the Again gesture. */
const BLOW: InstrumentPose = { clip: A.PLAYER_AGAIN1, from: 0.5, to: 0.56, sway: 0.6 };

export const INSTRUMENTS: readonly InstrumentDefinition[] = [
  {
    id: 'guitar',
    labelKey: 'instrument.guitar',
    glyph: 'Gtr',
    bank: 'acoustic_guitar_nylon',
    sustained: false,
    model: 'Item/Instrument_Guitar.glb',
    bone: LEFT_HAND,
    // Across the chest, strings out, neck up to the left. Solved from the
    // hand bones (tools/screenshot/_probe_bandsolve.mjs); tune live with
    // `?instRot=` / `?instOff=` or `__bandLink`.
    link: { angle: [-84, -35, -90], offset: [-11, -1, -1] },
    // The very first frames of Hustle, where the guitar sits up across the
    // chest; a narrow window and a small sway so it is a strum held in
    // place, not the dance - its hip step is what the frames mostly carry.
    pose: { clip: A.PLAYER_HUSTLE, from: 0, to: 0.04, sway: 0.35 },
  },
  {
    id: 'flute',
    labelKey: 'instrument.flute',
    glyph: 'Flt',
    bank: 'flute',
    sustained: true,
    model: 'Item/Instrument_Flute.glb',
    bone: RIGHT_HAND,
    // At the mouth, out to the right and a little down.
    link: { angle: [-59, 15, 160], offset: [9, -18, 3] },
    pose: BLOW,
  },
  {
    id: 'ocarina',
    labelKey: 'instrument.ocarina',
    glyph: 'Oca',
    bank: 'ocarina',
    sustained: true,
    model: 'Item/Instrument_Ocarina.glb',
    bone: RIGHT_HAND,
    // Mouthpiece at the lips, the body angled down and out in front of the
    // chin with its face - the holes - turned to the camera. Re-solved when
    // the model became the photo's own outline, whose mouthpiece lies in the
    // body's plane rather than standing out of it
    // (tools/screenshot/_probe_ocarinalink.mjs).
    link: { angle: [-94, 26, 41], offset: [17, 10, -10] },
    pose: BLOW,
  },
  {
    id: 'harp',
    labelKey: 'instrument.harp',
    glyph: 'Hrp',
    bank: 'orchestral_harp',
    sustained: false,
    model: 'Item/Instrument_Harp.glb',
    bone: ROOT,
    // A floor harp standing in front, its soundbox leaning back to the
    // chest, strung along the way the player faces; solved from the root
    // bone (tools/screenshot/_instsolve.mjs).
    link: { angle: [0, 0, -173], offset: [75, 35, -107] },
    noteOffset: [40, 0, 130],
    // Clap, whose hands come together and apart at chest height: at the
    // strings, plucking.
    pose: { clip: A.PLAYER_CLAP1, from: 0, to: 0.2, sway: 1 },
  },
  {
    id: 'drums',
    labelKey: 'instrument.drums',
    glyph: 'Drm',
    bank: 'kit:standard',
    sustained: false,
    percussion: true,
    model: 'Item/Instrument_Drumstick.glb',
    bone: RIGHT_HAND,
    // A stick in each hand, the kit standing in front at the feet.
    link: { angle: [-145, 4, 53], offset: [0, 0, 0] },
    parts: [
      { model: 'Item/Instrument_Drumstick.glb', bone: LEFT_HAND, link: { angle: [-148, 4, -61], offset: [0, 0, 0] } },
      { model: 'Item/Instrument_DrumKit.glb', bone: ROOT, link: { angle: [-1, -5, 7], offset: [14, 4, -99] } },
    ],
    // Hustle where both hands are low in front, the beat carried by its
    // small forward-and-back.
    pose: { clip: A.PLAYER_HUSTLE, from: 0.3, to: 0.4, sway: 0.8 },
  },
];

const byId = new Map(INSTRUMENTS.map(def => [def.id, def]));

export function instrumentById(id: InstrumentId): InstrumentDefinition {
  const def = byId.get(id);
  if (!def) throw new Error(`no instrument row for ${id}`);
  return def;
}

/** The row behind a wire id, or null for one this client does not know. */
export function instrumentByIndex(index: number): InstrumentDefinition | null {
  return INSTRUMENTS[index] ?? null;
}

/** The wire id of a row. */
export function instrumentIndex(id: InstrumentId): number {
  return INSTRUMENTS.findIndex(def => def.id === id);
}

export function isInstrumentId(value: string): value is InstrumentId {
  return byId.has(value as InstrumentId);
}

/** Every model a row hangs on the player: the main one first, then `parts`. */
export function instrumentParts(def: InstrumentDefinition): InstrumentPart[] {
  return [{ model: def.model, bone: def.bone, link: def.link }, ...(def.parts ?? [])];
}
