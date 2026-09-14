import type { TextKey } from '../i18n';
import { PlayerAction } from './objects/enum';

/**
 * The instruments a player can take out and play. THE registry: the emote
 * wheel's instrument ring, the Instrument window, the sampler, the band
 * system, the model attach and the wire id all read this table and nothing
 * else names an instrument.
 *
 * Adding one is one row here plus its assets:
 *   - `bun run tools/instrumentSamples.ts <id>` for the notes,
 *   - a crop entry in `tools/instrumentModels.ts` for the model,
 *   - `instrument.<id>` in every language.
 *
 * The wire carries the row's index (`bandProtocol.ts`), so the table is
 * append-only: never reorder or remove a row.
 */

export type InstrumentId = 'guitar' | 'flute' | 'ocarina';

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
};

export type InstrumentDefinition = {
  id: InstrumentId;
  labelKey: TextKey;
  /** Short glyph drawn in the wedge; the label is shown in the hub on hover. */
  glyph: string;
  /** The MusyngKite instrument the notes come from (`tools/instrumentSamples.ts`). */
  bank: string;
  /**
   * A wind: the note sounds for as long as it is held and stops on note-off.
   * Otherwise the sample carries its own decay (a plucked string) and
   * note-off only shortens the tail.
   */
  sustained: boolean;
  /** Renders MIDI channel 10 through a drum map. No row does yet. */
  percussion?: true;
  /** The model, under `game-assets/`. */
  model: string;
  /** The hand bone the model hangs from (`weaponAttachment.ts`: 33 right, 42 left). */
  bone: number;
  /** Link on that bone - degrees and centimetres in BMD bone space (`boneLink.ts`). */
  link: { angle: [number, number, number]; offset: [number, number, number] };
  pose: InstrumentPose;
};

const A = PlayerAction;

/** Bones by name, so a row reads (`weaponAttachment.ts`). */
const RIGHT_HAND = 33;
const LEFT_HAND = 42;

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
    // The opening of the Hustle dance: arms out in front, moving.
    pose: { clip: A.PLAYER_HUSTLE, from: 0.05, to: 0.12 },
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
    // The end of the Again gesture: the right hand up at the mouth.
    pose: { clip: A.PLAYER_AGAIN1, from: 0.75, to: 1 },
  },
  {
    id: 'ocarina',
    labelKey: 'instrument.ocarina',
    glyph: 'Oca',
    bank: 'ocarina',
    sustained: true,
    model: 'Item/Instrument_Ocarina.glb',
    bone: RIGHT_HAND,
    // Mouthpiece at the lips, body out in front of the chin.
    link: { angle: [-110, 15, 58], offset: [8, 8, -6] },
    pose: { clip: A.PLAYER_AGAIN1, from: 0.75, to: 1 },
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
