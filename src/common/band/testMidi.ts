/**
 * A small Standard MIDI File built in code: format 1, 120 bpm, 480 ticks per
 * quarter, two tracks. "Lead" plays a C-major arpeggio in quarter notes on
 * channel 1 for eight bars; "Drums" puts a kick and a closed hat on channel
 * 10, which the band system drops until an instrument renders percussion -
 * so a test that hears the hat has found a bug.
 *
 * Feeds both `tools/instrumentSamples.ts --test-midi` (`public/dev/band/
 * scale.mid`) and the parser / sequencer unit tests, so the bytes on disk and
 * the bytes under test are the same.
 */

const DIVISION = 480;
const BARS = 8;

/** Variable-length quantity, as the format spells delta times. */
function vlq(value: number): number[] {
  const out = [value & 0x7f];
  let v = value >> 7;
  while (v > 0) {
    out.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return out;
}

function str(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function u32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function u16(value: number): number[] {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function chunk(tag: string, body: number[]): number[] {
  return [...str(tag), ...u32(body.length), ...body];
}

type Event = { delta: number; bytes: number[] };

function track(name: string, events: Event[]): number[] {
  const body: number[] = [...vlq(0), 0xff, 0x03, name.length, ...str(name)];
  for (const e of events) body.push(...vlq(e.delta), ...e.bytes);
  body.push(...vlq(0), 0xff, 0x2f, 0x00);
  return chunk('MTrk', body);
}

/** The arpeggio's notes, one bar = C4 E4 G4 C5. */
export const TEST_LEAD_NOTES = [60, 64, 67, 72] as const;

export const TEST_TEMPO_BPM = 120;

/** Milliseconds one quarter note lasts at the test tempo. */
export const TEST_QUARTER_MS = 60000 / TEST_TEMPO_BPM;

export function buildTestMidi(): Uint8Array {
  const tempo: Event[] = [
    { delta: 0, bytes: [0xff, 0x51, 0x03, ...u32(60_000_000 / TEST_TEMPO_BPM).slice(1)] },
  ];

  const lead: Event[] = [];
  for (let bar = 0; bar < BARS; bar++) {
    for (const note of TEST_LEAD_NOTES) {
      lead.push({ delta: 0, bytes: [0x90, note, 100] });
      // Note off as a note-on at velocity 0, the common running-status form.
      lead.push({ delta: DIVISION - 10, bytes: [0x90, note, 0] });
      lead.push({ delta: 10, bytes: [] });
    }
  }
  // Merge the empty spacers into the next delta.
  const leadEvents: Event[] = [];
  let carry = 0;
  for (const e of lead) {
    if (e.bytes.length === 0) {
      carry += e.delta;
      continue;
    }
    leadEvents.push({ delta: e.delta + carry, bytes: e.bytes });
    carry = 0;
  }

  const drums: Event[] = [];
  for (let beat = 0; beat < BARS * 4; beat++) {
    const kick = beat % 2 === 0;
    drums.push({ delta: 0, bytes: [0x99, kick ? 36 : 42, 90] });
    drums.push({ delta: DIVISION / 2, bytes: [0x89, kick ? 36 : 42, 0] });
    drums.push({ delta: DIVISION / 2, bytes: [] });
  }
  const drumEvents: Event[] = [];
  carry = 0;
  for (const e of drums) {
    if (e.bytes.length === 0) {
      carry += e.delta;
      continue;
    }
    drumEvents.push({ delta: e.delta + carry, bytes: e.bytes });
    carry = 0;
  }

  const header = chunk('MThd', [...u16(1), ...u16(3), ...u16(DIVISION)]);

  return new Uint8Array([
    ...header,
    ...track('Tempo', tempo),
    ...track('Lead', leadEvents),
    ...track('Drums', drumEvents),
  ]);
}
