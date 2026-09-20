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
 * A `kit:<name>` bank is General MIDI percussion, one drum per key 35..81,
 * taken from FluidR3_GM as `surikov/webaudiofontdata` renders it
 * (`--kit-source <url>` to point elsewhere).
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
import { INSTRUMENTS, type InstrumentDefinition, type InstrumentId } from '../src/common/instruments';
import { buildTestMidi } from '../src/common/band/testMidi';
import { PROJECT_ROOT } from './shared';

const DEFAULT_SOURCE = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite';
const DEFAULT_KIT_SOURCE = 'https://surikov.github.io/webaudiofontdata/sound';
const OUT = `${PROJECT_ROOT}public/game-assets/Instrument/`;

/** General MIDI percussion keys: acoustic bass drum to open triangle. */
const KIT_FIRST_KEY = 35;
const KIT_LAST_KEY = 81;
/** Fewer drums than this and the kit source is broken, not sparse. */
const KIT_MIN_DRUMS = 30;

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
  /** MusyngKite instrument the notes came from, or `kit:<name>`. */
  bank: string;
  sustained: boolean;
  /** A drum kit: each key is its own drum, never the nearest one pitched. */
  percussion?: true;
  /** Seconds. */
  attack: number;
  release: number;
  /** MIDI note -> file under `Instrument/<id>/`. */
  notes: Record<number, string>;
  /** MIDI note -> playback rate, where the render is not at pitch (a kit's drums). */
  rates?: Record<number, number>;
};

const LICENSE = `Instrument samples for the band system.

Source: MusyngKite General MIDI soundfont, as rendered per note by
gleitz/midi-js-soundfonts (https://github.com/gleitz/midi-js-soundfonts,
gh-pages branch). MusyngKite is released under the Creative Commons
Attribution-ShareAlike 3.0 license (CC BY-SA 3.0,
https://creativecommons.org/licenses/by-sa/3.0/). The files in this folder
are those renders, re-encoded only where the source offered no OGG; they
stay under the same license.

Drum kit: FluidR3_GM soundfont by Frank Wen (MIT license), as rendered per
drum by surikov/webaudiofontdata (https://github.com/surikov/webaudiofontdata,
MIT license). The files under Instrument/drums/ are those renders unchanged.
`;

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string): string | null => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};

const source = (option('source') ?? DEFAULT_SOURCE).replace(/\/+$/, '');
const kitSource = (option('kit-source') ?? DEFAULT_KIT_SOURCE).replace(/\/+$/, '');
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

/** The envelope a row's manifest gets, whatever its source. */
function envelope(def: InstrumentDefinition): Pick<BankManifest, 'sustained' | 'attack' | 'release'> {
  return {
    sustained: def.sustained,
    attack: def.sustained ? 0.02 : 0.005,
    // A wind stops when the breath does; a plucked string is damped, not
    // cut, so its note-off is a slower fade over the render's own decay.
    release: def.sustained ? 0.12 : 0.5,
  };
}

function writeManifest(manifest: BankManifest): void {
  writeFileSync(`${OUT}${manifest.instrument}.json`, JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(`${OUT}LICENSE.txt`, LICENSE);
}

/** MusyngKite: every note the source has, into the row's own folder. */
async function fetchMelodic(def: InstrumentDefinition): Promise<void> {
  const dir = `${OUT}${def.id}/`;
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
  if (count === 0) throw new Error(`${def.id}: no notes fetched from ${source}`);

  writeManifest({ instrument: def.id, bank: def.bank, ...envelope(def), notes });
  console.log(`${def.id}: ${count} notes, ${(bytes / 1024).toFixed(0)} KB -> ${dir}`);
}

/**
 * One drum of the webaudiofont render: a JS literal with one zone, whose
 * `file` is a base64 MP3. Picked out by regex, as with the bundle above.
 */
function parseDrum(text: string): { bytes: Uint8Array; rate: number } {
  const num = (field: string): number => {
    const m = new RegExp(`\\b${field}\\s*:\\s*(-?\\d+)`).exec(text);
    if (!m) throw new Error(`drum zone has no ${field}`);
    return Number(m[1]);
  };
  const file = /\bfile\s*:\s*'([^']+)'/.exec(text);
  if (!file) throw new Error('drum zone has no file');

  // webaudiofont's own playback-rate formula: cents from the key to the
  // render's pitch, tuning included.
  const pitch = num('originalPitch') - 100 * num('coarseTune') - num('fineTune');
  const key = num('keyRangeLow');
  return {
    bytes: new Uint8Array(Buffer.from(file[1], 'base64')),
    rate: 2 ** ((100 * key - pitch) / 1200),
  };
}

/** A General MIDI kit: one file per drum key, played back at its render's rate. */
async function fetchKit(def: InstrumentDefinition, kit: string): Promise<void> {
  if (kit !== 'standard') throw new Error(`${def.id}: unknown kit ${kit}`);

  const dir = `${OUT}${def.id}/`;
  mkdirSync(dir, { recursive: true });
  const notes: Record<number, string> = {};
  const rates: Record<number, number> = {};
  let bytes = 0;

  for (let key = KIT_FIRST_KEY; key <= KIT_LAST_KEY; key++) {
    const url = `${kitSource}/128${key}_0_FluidR3_GM_sf2_file.js`;
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (res.status === 404) {
      console.log(`${def.id}: no drum for key ${key} (${noteName(key)})`);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);

    const drum = parseDrum(await res.text());
    const name = noteName(key);
    writeFileSync(`${dir}${name}.mp3`, drum.bytes);
    notes[key] = `${name}.mp3`;
    if (Math.abs(drum.rate - 1) > 1e-6) rates[key] = drum.rate;
    bytes += drum.bytes.length;
  }

  const count = Object.keys(notes).length;
  if (count < KIT_MIN_DRUMS) throw new Error(`${def.id}: only ${count} drums from ${kitSource}`);

  writeManifest({
    instrument: def.id,
    bank: def.bank,
    ...envelope(def),
    percussion: true,
    notes,
    ...(Object.keys(rates).length > 0 ? { rates } : {}),
  });
  console.log(`${def.id}: ${count} drums, ${(bytes / 1024).toFixed(0)} KB -> ${dir}`);
}

async function fetchInstrument(id: InstrumentId): Promise<void> {
  const def = INSTRUMENTS.find(d => d.id === id);
  if (!def) throw new Error(`no registry row for ${id}`);

  const kit = /^kit:(.+)$/.exec(def.bank);
  if (kit) return fetchKit(def, kit[1]);

  return fetchMelodic(def);
}

async function main(): Promise<void> {
  if (flag('test-midi')) {
    const dir = `${PROJECT_ROOT}public/dev/band/`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}scale.mid`, buildTestMidi());
    console.log(`wrote ${dir}scale.mid`);
  }

  const optionValues = [option('source'), option('kit-source')];
  const wanted = flag('all')
    ? INSTRUMENTS.map(d => d.id)
    : (args.filter(a => !a.startsWith('--') && !optionValues.includes(a)) as InstrumentId[]);

  for (const id of wanted) {
    if (!INSTRUMENTS.some(d => d.id === id)) throw new Error(`unknown instrument ${id}`);
    await fetchInstrument(id);
  }

  if (wanted.length === 0 && !flag('test-midi')) {
    console.log('nothing to do: name instruments, or --all, or --test-midi');
  }
}

await main();
