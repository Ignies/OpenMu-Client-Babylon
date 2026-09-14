import { describe, expect, it } from 'vitest';
import { parseMidi, type MidiEvent } from './midiFile';
import { Sequencer, type BatchEvent } from './sequencer';
import { TEST_LEAD_NOTES, buildTestMidi } from './testMidi';

type Scheduled = { ev: MidiEvent; when: number };
type Batch = { baseMs: number; events: BatchEvent[] };

function harness(options = {}) {
  let now = 10;
  const scheduled: Scheduled[] = [];
  const batches: Batch[] = [];
  let ended = 0;
  const seq = new Sequencer(
    { now: () => now },
    {
      schedule: (ev, when) => scheduled.push({ ev, when }),
      batch: (baseMs, events) => batches.push({ baseMs, events }),
      ended: () => ended++,
    },
    options
  );
  const advance = (ms: number) => {
    now += ms / 1000;
  };
  return { seq, scheduled, batches, advance, get now() { return now; }, get ended() { return ended; } };
}

const isOn = (e: { status: number; d2: number }) => (e.status & 0xf0) === 0x90 && e.d2 > 0;

describe('sequencer', () => {
  it('sends the first window ahead of local playback, on the audio clock', () => {
    const h = harness();
    h.seq.load(parseMidi(buildTestMidi()));
    h.seq.play();
    h.seq.tick();

    // Window: (now - origin) = -0.25 s, + 0.2 lead + 0.1 tick -> events up to
    // 50 ms: the first lead note only (the drum on the same tick is not voiced).
    const ons = h.scheduled.filter(s => isOn(s.ev));
    expect(ons).toHaveLength(1);
    expect(ons[0].ev.d1).toBe(TEST_LEAD_NOTES[0]);
    expect(ons[0].when).toBeCloseTo(h.now + 0.25, 6);

    expect(h.batches).toHaveLength(1);
    expect(h.batches[0].baseMs).toBe(250);
    expect(h.batches[0].events[0]).toMatchObject({ dt: 0, status: 0x90, d1: TEST_LEAD_NOTES[0] });
  });

  it('stamps dt relative to the batch and baseMs relative to the performance start', () => {
    const h = harness();
    h.seq.load(parseMidi(buildTestMidi()));
    h.seq.startClock();
    h.advance(2000);
    h.seq.play();
    h.seq.tick();
    expect(h.batches[0].baseMs).toBe(2250);

    h.advance(500);
    h.seq.tick();
    // Now covers 250 + 200 + 100 = 550 ms of song: the second note (500 ms)
    // arrives, timed from the performance start whatever else is in the batch.
    const second = h.batches[1];
    const on = second.events.find(e => isOn(e) && (e.status & 0x0f) === 0)!;
    expect(on.d1).toBe(TEST_LEAD_NOTES[1]);
    expect(second.baseMs + on.dt).toBe(2250 + 500);
    expect(second.baseMs).toBeGreaterThan(2250);
  });

  it('only voices its own channels locally but sends every channel', () => {
    const h = harness();
    h.seq.load(parseMidi(buildTestMidi()));
    h.seq.localMask = 1; // channel 0 only
    h.seq.play();
    for (let i = 0; i < 6; i++) {
      h.advance(100);
      h.seq.tick();
    }
    expect(h.scheduled.every(s => (s.ev.status & 0x0f) === 0)).toBe(true);
    const sent = h.batches.flatMap(b => b.events);
    expect(sent.some(e => (e.status & 0x0f) === 9)).toBe(true);
  });

  it('pauses with all notes off and resumes where it left', () => {
    const h = harness();
    h.seq.load(parseMidi(buildTestMidi()));
    h.seq.play();
    for (let i = 0; i < 10; i++) {
      h.advance(100);
      h.seq.tick();
    }
    const before = h.batches.length;
    h.seq.pause();
    const offs = h.batches[before].events;
    expect(offs.every(e => (e.status & 0xf0) === 0xb0 && e.d1 === 123)).toBe(true);
    expect(offs.map(e => e.status & 0x0f)).toEqual([0, 9]);
    expect(h.seq.paused).toBe(true);
    const at = h.seq.positionMs;
    expect(at).toBeCloseTo(1000 - 250, 0);

    h.advance(5000);
    h.seq.play();
    expect(h.seq.positionMs).toBeCloseTo(at - 250, 0);
    // The next lead note is the third of the arpeggio, at 1000 ms.
    const resumedFrom = h.batches.length;
    for (let i = 0; i < 5; i++) {
      h.seq.tick();
      h.advance(100);
    }
    const leadOns = h.batches.slice(resumedFrom).flatMap(b => b.events).filter(e => isOn(e) && (e.status & 0x0f) === 0);
    expect(leadOns[0].d1).toBe(TEST_LEAD_NOTES[2]);
  });

  it('loops with a gap and ends without loop', () => {
    const h = harness();
    const song = parseMidi(buildTestMidi());
    h.seq.load(song);
    h.seq.loop = true;
    h.seq.play();
    const total = song.durationMs + 1000;
    for (let t = 0; t < total; t += 100) {
      h.advance(100);
      h.seq.tick();
    }
    const ons = h.scheduled.filter(s => isOn(s.ev));
    expect(ons.length).toBeGreaterThan(song.channels[0].noteCount);
    expect(h.ended).toBe(0);

    const h2 = harness();
    h2.seq.load(song);
    h2.seq.play();
    for (let t = 0; t < total; t += 100) {
      h2.advance(100);
      h2.seq.tick();
    }
    expect(h2.ended).toBe(1);
    expect(h2.seq.playing).toBe(false);
    // Every lead note once; the drum channel is never voiced by a melodic instrument.
    expect(h2.scheduled.filter(s => isOn(s.ev))).toHaveLength(song.channels[0].noteCount);
  });
});
