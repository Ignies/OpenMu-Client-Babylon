/**
 * Fetches an instrument's notes for the band system.
 *
 *   bun run tools/instrumentSamples.ts guitar flute ocarina
 *   bun run tools/instrumentSamples.ts --all
 *   bun run tools/instrumentSamples.ts --test-midi
 *
 * The source is the MusyngKite soundfont as `gleitz/midi-js-soundfonts`
 * publishes it on its gh-pages branch: one file per note per General MIDI
 * instrument, already rendered. Nothing of MIDI.js itself is used - only
 * those files, copied once, here, into the repo's own assets. The
 * `<name>-ogg.js` bundle is a JS object of base64 OGGs (`MIDI.Soundfont.<name>
 * = {"A0": "data:audio/ogg;base64,..."}`); the loose `<name>-mp3/<Note>.mp3`
 * files are the fallback (`--mp3`). Point `--source <url>` at any other host
 * laid out the same way.
 *
 * Output, per registry row (`src/common/instruments.ts`):
 *   public/game-assets/Instrument/<id>/<Note>.ogg   every note the source has (A0..C8)
 *   public/game-assets/Instrument/<id>.json         the bank manifest the sampler reads
 *   public/game-assets/Instrument/LICENSE.txt       attribution (MusyngKite is CC BY-SA 3.0)
 *
 * The client fetches one instrument's folder on first use, so a bank's size
 * is only paid by the players who hear it.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { INSTRUMENTS, type InstrumentId } from '../src/common/instruments';
import { buildTestMidi } from '../src/common/band/testMidi';
import { PROJECT_ROOT } from './shared';

const DEFAULT_SOURCE = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite';
const OUT = `${PROJECT_ROOT}public/game-assets/Instrument/`;

/** Note names as the source spells them: flats, `A0`..`C8`. */
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function noteName(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function midiOf(name: string): number | null {
  const m = /^([A-G]b?)(-?\d)$/.exec(name);
  if (!m) return null;
  const i = NAMES.indexOf(m[1]);
  if (i < 0) return null;
  return (Number(m[2]) + 1) * 12 + i;
}

export type BankManifest = {
  instrument: InstrumentId;
  /** MusyngKite instrument the notes came from. */
  bank: string;
  sustained: boolean;
  /** Seconds. */
  attack: number;
  release: number;
  /** MIDI note -> file under `Instrument/<id>/`. */
  notes: Record<number, string>;
};

const LICENSE = `Instrument samples for the band system.

Source: MusyngKite General MIDI soundfont, as rendered per note by
gleitz/midi-js-soundfonts (https://github.com/gleitz/midi-js-soundfonts,
gh-pages branch). MusyngKite is released under the Creative Commons
Attribution-ShareAlike 3.0 license (CC BY-SA 3.0,
https://creativecommons.org/licenses/by-sa/3.0/). The files in this folder
are those renders, re-encoded only where the source offered no OGG; they
stay under the same license.
`;

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string): string | null => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};

const source = (option('source') ?? DEFAULT_SOURCE).replace(/\/+$/, '');
const useMp3 = flag('mp3');

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * The `-ogg.js` bundle as `{ noteName: dataUri }`. It is a JS object literal,
 * not JSON (trailing commas and the like), so the pairs are picked out by
 * shape rather than parsed.
 */
async function fetchBundle(bank: string): Promise<Record<string, string>> {
  const text = new TextDecoder().decode(await fetchBytes(`${source}/${bank}-ogg.js`));
  const notes: Record<string, string> = {};
  const pair = /"([A-G]b?-?\d)"\s*:\s*"(data:audio\/[^"]+)"/g;
  for (let m = pair.exec(text); m; m = pair.exec(text)) notes[m[1]] = m[2];
  if (Object.keys(notes).length === 0) throw new Error(`${bank}: bundle has no notes`);
  return notes;
}

function decodeDataUri(uri: string): { ext: 'ogg' | 'mp3'; bytes: Uint8Array } {
  const m = /^data:audio\/(ogg|mp3|mpeg);base64,(.*)$/s.exec(uri);
  if (!m) throw new Error(`unexpected note payload: ${uri.slice(0, 40)}`);
  const ext = m[1] === 'ogg' ? 'ogg' : 'mp3';
  return { ext, bytes: new Uint8Array(Buffer.from(m[2], 'base64')) };
}

async function fetchInstrument(id: InstrumentId): Promise<void> {
  const def = INSTRUMENTS.find(d => d.id === id);
  if (!def) throw new Error(`no registry row for ${id}`);

  const dir = `${OUT}${id}/`;
  mkdirSync(dir, { recursive: true });
  const notes: Record<number, string> = {};
  let bytes = 0;

  if (useMp3) {
    for (let midi = 21; midi <= 108; midi++) {
      const name = noteName(midi);
      try {
        const data = await fetchBytes(`${source}/${def.bank}-mp3/${name}.mp3`);
        writeFileSync(`${dir}${name}.mp3`, data);
        notes[midi] = `${name}.mp3`;
        bytes += data.length;
      } catch {
        // The source has no such note; the sampler pitches the nearest.
      }
    }
  } else {
    const bundle = await fetchBundle(def.bank);
    for (const [name, uri] of Object.entries(bundle)) {
      const midi = midiOf(name);
      if (midi === null) continue;
      const { ext, bytes: data } = decodeDataUri(uri);
      writeFileSync(`${dir}${name}.${ext}`, data);
      notes[midi] = `${name}.${ext}`;
      bytes += data.length;
    }
  }

  const count = Object.keys(notes).length;
  if (count === 0) throw new Error(`${id}: no notes fetched from ${source}`);

  const manifest: BankManifest = {
    instrument: id,
    bank: def.bank,
    sustained: def.sustained,
    attack: def.sustained ? 0.02 : 0.005,
    // A wind stops when the breath does; a plucked string is damped, not
    // cut, so its note-off is a slower fade over the render's own decay.
    release: def.sustained ? 0.12 : 0.5,
    notes,
  };
  writeFileSync(`${OUT}${id}.json`, JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(`${OUT}LICENSE.txt`, LICENSE);
  console.log(`${id}: ${count} notes, ${(bytes / 1024).toFixed(0)} KB -> ${dir}`);
}

async function main(): Promise<void> {
  if (flag('test-midi')) {
    const dir = `${PROJECT_ROOT}public/dev/band/`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}scale.mid`, buildTestMidi());
    console.log(`wrote ${dir}scale.mid`);
  }

  const wanted = flag('all')
    ? INSTRUMENTS.map(d => d.id)
    : (args.filter(a => !a.startsWith('--') && a !== option('source')) as InstrumentId[]);

  for (const id of wanted) {
    if (!INSTRUMENTS.some(d => d.id === id)) throw new Error(`unknown instrument ${id}`);
    await fetchInstrument(id);
  }

  if (wanted.length === 0 && !flag('test-midi')) {
    console.log('nothing to do: name instruments, or --all, or --test-midi');
  }
}

await main();
