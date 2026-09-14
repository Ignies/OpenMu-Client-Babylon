import type { InstrumentId } from '../../common/instruments';
import { resolveUrlToDataFolder } from '../../common/resolveUrlToDataFolder';

/**
 * An instrument's notes, as `tools/instrumentSamples.ts` wrote them: one
 * file per MIDI note under `Instrument/<id>/` and a manifest beside it.
 * Loaded once per instrument, on first use, and kept for the session - a
 * bank is a couple of megabytes and only the players who hear it pay for it.
 */

export type BankManifest = {
  instrument: InstrumentId;
  bank: string;
  sustained: boolean;
  /** Seconds. */
  attack: number;
  release: number;
  /** MIDI note (as a string key, JSON) -> file name. */
  notes: Record<string, string>;
};

export type DecodedBank = {
  manifest: BankManifest;
  /** MIDI note -> decoded sample. */
  buffers: Map<number, AudioBuffer>;
  /** The notes present, ascending. */
  keys: number[];
};

export type NoteSource = { buffer: AudioBuffer; rate: number };

/** Where a bank's files live, through the active version's asset root. */
export function bankUrl(id: InstrumentId, file?: string): string {
  return resolveUrlToDataFolder(file ? `Instrument/${id}/${file}` : `Instrument/${id}.json`);
}

/**
 * The sample for `note`: its own file when the bank has it, else the nearest
 * note pitched by the semitone distance. MusyngKite ships every semitone
 * from A0 to C8, so the second branch only carries a song's stray extremes.
 */
export function noteSource(bank: DecodedBank, note: number): NoteSource | null {
  const own = bank.buffers.get(note);
  if (own) return { buffer: own, rate: 1 };
  if (bank.keys.length === 0) return null;

  let best = bank.keys[0];
  for (const key of bank.keys) {
    if (Math.abs(key - note) < Math.abs(best - note)) best = key;
  }
  const buffer = bank.buffers.get(best);
  return buffer ? { buffer, rate: 2 ** ((note - best) / 12) } : null;
}

/** Fetches and decodes one bank. Rejects on a missing manifest or a bank with no playable note. */
export async function loadBank(ctx: AudioContext, id: InstrumentId): Promise<DecodedBank> {
  const res = await fetch(bankUrl(id));
  if (!res.ok) throw new Error(`instrument bank ${id}: ${res.status}`);
  const manifest = (await res.json()) as BankManifest;

  const entries = Object.entries(manifest.notes);
  const decoded = await Promise.all(
    entries.map(async ([key, file]) => {
      try {
        const bytes = await (await fetch(bankUrl(id, file))).arrayBuffer();
        return [Number(key), await ctx.decodeAudioData(bytes)] as const;
      } catch {
        // One bad file loses one note, not the instrument.
        return null;
      }
    })
  );

  const buffers = new Map<number, AudioBuffer>();
  for (const entry of decoded) if (entry) buffers.set(entry[0], entry[1]);
  if (buffers.size === 0) throw new Error(`instrument bank ${id}: no notes decoded`);

  return { manifest, buffers, keys: Array.from(buffers.keys()).sort((a, b) => a - b) };
}
