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
  /** The held pose while performing; `clipSpeed` is its play rate. */
  clip: PlayerAction;
  clipSpeed: number;
  /** The per-note hit: an additive rotation on `bone` around `axis`, `degrees` at the peak. */
  twitch: { bone: number; axis: [number, number, number]; degrees: number };
};

const A = PlayerAction;

/** Bones by name, so a row reads (`weaponAttachment.ts`, `headTrackingSystem.ts`). */
const RIGHT_HAND = 33;
const LEFT_HAND = 42;
const RIGHT_FOREARM = 28;
const HEAD = 20;

export const INSTRUMENTS: readonly InstrumentDefinition[] = [
  {
    id: 'guitar',
    labelKey: 'instrument.guitar',
    glyph: 'Gtr',
    bank: 'acoustic_guitar_nylon',
    sustained: false,
    model: 'Item/Instrument_Guitar.glb',
    bone: LEFT_HAND,
    // Neck in the left hand, body down at the hip. Tune live with
    // `?instRot=` / `?instOff=` or `__bandLink`.
    link: { angle: [0, 0, -90], offset: [-25, 0, 0] },
    clip: A.PLAYER_STOP_TWO_HAND_SWORD_TWO,
    clipSpeed: 0.24,
    twitch: { bone: RIGHT_FOREARM, axis: [1, 0, 0], degrees: 12 },
  },
  {
    id: 'flute',
    labelKey: 'instrument.flute',
    glyph: 'Flt',
    bank: 'flute',
    sustained: true,
    model: 'Item/Instrument_Flute.glb',
    bone: RIGHT_HAND,
    // Across the raised hand, level; tune live like the guitar.
    link: { angle: [90, 0, 0], offset: [0, 0, 0] },
    clip: A.PLAYER_STOP_WAND,
    clipSpeed: 0.3,
    twitch: { bone: HEAD, axis: [0, 0, 1], degrees: 2 },
  },
  {
    id: 'ocarina',
    labelKey: 'instrument.ocarina',
    glyph: 'Oca',
    bank: 'ocarina',
    sustained: true,
    model: 'Item/Instrument_Ocarina.glb',
    bone: RIGHT_HAND,
    link: { angle: [0, 0, 0], offset: [0, 3, 5] },
    clip: A.PLAYER_STOP_WAND,
    clipSpeed: 0.3,
    twitch: { bone: HEAD, axis: [0, 0, 1], degrees: 2 },
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
