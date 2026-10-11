import { describe, expect, it } from 'vitest';
import { MidiFileError, parseMidi } from './midiFile';
import { TEST_LEAD_NOTES, TEST_QUARTER_MS, buildTestMidi } from './testMidi';

const header = (format: number, tracks: number, division: number): number[] => [
  0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, format, 0, tracks, division >> 8, division & 0xff,
];

const track = (body: number[]): number[] => [
  0x4d, 0x54, 0x72, 0x6b, (body.length >>> 24) & 0xff, (body.length >>> 16) & 0xff, (body.length >>> 8) & 0xff, body.length & 0xff, ...body,
];

const END = [0, 0xff, 0x2f, 0];

describe('parseMidi', () => {
  it('reads the test song: tempo, names, channels, times', () => {
    const song = parseMidi(buildTestMidi());

    expect(song.channels[0].used).toBe(true);
    expect(song.channels[0].name).toBe('Lead');
    expect(song.channels[0].noteCount).toBe(8 * TEST_LEAD_NOTES.length);
    expect(song.channels[9].used).toBe(true);
    expect(song.channels[9].name).toBe('Drums');
    expect(song.channels[1].used).toBe(false);
    expect(song.channels[1].name).toBe('Ch 2');

    const ons = song.events.filter(e => (e.status & 0xf0) === 0x90 && e.d2 > 0 && (e.status & 0x0f) === 0);
    expect(ons.slice(0, 4).map(e => e.d1)).toEqual([...TEST_LEAD_NOTES]);
    // Quarter notes at 120 bpm: 500 ms apart.
    expect(ons[1].ms - ons[0].ms).toBeCloseTo(TEST_QUARTER_MS, 3);
    expect(ons[4].ms).toBeCloseTo(4 * TEST_QUARTER_MS, 3);
    // Eight bars of four quarters, the last note-off 10 ticks before the bar.
    expect(song.durationMs).toBeCloseTo(32 * TEST_QUARTER_MS - (10 / 480) * TEST_QUARTER_MS, 2);
  });

  it('applies a mid-song tempo change to every track', () => {
    // Track 0: tempo 120 at tick 0, 60 at tick 480. Track 1: notes at 0, 480, 960.
    const tempo = track([
      0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20, // 500 000 us
      0x83, 0x60, 0xff, 0x51, 3, 0x0f, 0x42, 0x40, // +480 ticks: 1 000 000 us
      ...END,
    ]);
    const notes = track([
      0, 0x90, 60, 100,
      0x83, 0x60, 0x90, 62, 100, // +480
      0x83, 0x60, 0x90, 64, 100, // +480
      ...END,
    ]);
    const song = parseMidi(new Uint8Array([...header(1, 2, 480), ...tempo, ...notes]));
    const ms = song.events.map(e => e.ms);
    expect(ms[0]).toBe(0);
    expect(ms[1]).toBe(500);
    expect(ms[2]).toBe(1500);
  });

  it('honours running status and keeps only notes and the off controllers', () => {
    const body = track([
      0, 0x90, 60, 100, // note on
      10, 62, 100, // running status: another note on
      10, 0xc0, 5, // program change: dropped
      10, 0xb0, 7, 64, // volume controller: dropped
      10, 0xb0, 123, 0, // all notes off: kept
      10, 0xe0, 0, 64, // pitch bend: dropped
      10, 0x80, 60, 0, // note off
      ...END,
    ]);
    const song = parseMidi(new Uint8Array([...header(0, 1, 96), ...body]));
    expect(song.events.map(e => [e.status, e.d1])).toEqual([
      [0x90, 60],
      [0x90, 62],
      [0xb0, 123],
      [0x80, 60],
    ]);
  });

  it('skips sysex and unknown meta events', () => {
    const body = track([
      0, 0xf0, 3, 1, 2, 0xf7, // sysex
      0, 0xff, 0x01, 4, 0x41, 0x42, 0x43, 0x44, // text meta
      0, 0x90, 60, 100,
      ...END,
    ]);
    const song = parseMidi(new Uint8Array([...header(0, 1, 96), ...body]));
    expect(song.events).toHaveLength(1);
  });

  it('refuses what it cannot play', () => {
    expect(() => parseMidi(new Uint8Array([1, 2, 3, 4, 0, 0, 0, 6]))).toThrow(MidiFileError);
    expect(() => parseMidi(new Uint8Array([...header(2, 1, 96), ...track(END)]))).toThrow(/format 2/);
    expect(() => parseMidi(new Uint8Array([...header(0, 1, 0xe250), ...track(END)]))).toThrow(/SMPTE/);
  });

  it('names a channel after the first track that plays on it', () => {
    const named = (name: string, body: number[]) => track([0, 0xff, 0x03, name.length, ...Array.from(new TextEncoder().encode(name)), ...body]);
    const a = named('Bass', [0, 0x91, 40, 100, ...END]);
    const b = named('Also bass', [0, 0x91, 45, 100, ...END]);
    const song = parseMidi(new Uint8Array([...header(1, 2, 96), ...a, ...b]));
    expect(song.channels[1].name).toBe('Bass');
    expect(song.channels[1].noteCount).toBe(2);
  });
});
