import { describe, expect, it } from 'vitest';
import { Receiver, receiverDelay } from './receiver';
import type { BatchEvent } from './sequencer';

const on = (note: number, dt = 0): BatchEvent => ({ dt, status: 0x90, d1: note, d2: 100 });
const off = (note: number, dt = 0): BatchEvent => ({ dt, status: 0x80, d1: note, d2: 0 });

function harness(delaySec = 0.5) {
  let now = 100;
  const scheduled: { ev: BatchEvent; when: number }[] = [];
  let offs = 0;
  const rx = new Receiver(
    { now: () => now },
    { schedule: (ev, when) => scheduled.push({ ev, when }), allOff: () => offs++ },
    { delaySec }
  );
  return { rx, scheduled, advance: (ms: number) => (now += ms / 1000), get now() { return now; }, get offs() { return offs; } };
}

describe('receiver', () => {
  it('fixes the offset on the first batch and keeps the performer\'s spacing', () => {
    const h = harness(0.5);
    h.rx.onBatch(1, 1000, [on(60), on(62, 100)]);
    expect(h.scheduled[0].when).toBeCloseTo(h.now + 0.5, 6);
    expect(h.scheduled[1].when).toBeCloseTo(h.now + 0.6, 6);

    h.advance(100);
    h.rx.onBatch(2, 1100, [on(64)]);
    expect(h.scheduled[2].when).toBeCloseTo(h.now - 0.1 + 0.5 + 0.1, 6);
  });

  it('moves the offset when a batch arrives late and plays it on the new timeline', () => {
    const h = harness(0.2);
    h.rx.onBatch(1, 0, [on(60)]);
    // The next batch arrives a full second late: its notes are 0.7 s overdue.
    h.advance(1000);
    h.rx.onBatch(2, 100, [on(62), off(60, 10)]);
    const late = h.scheduled.slice(1);
    // Nothing is thrown away; the stream is shifted so the batch starts just after now.
    expect(late.map(s => s.ev.status)).toEqual([0x90, 0x80]);
    expect(late[0].when).toBeCloseTo(h.now + 0.05, 6);
    expect(late[1].when).toBeCloseTo(h.now + 0.06, 6);
    expect(h.rx.resyncCount).toBe(1);

    // After the resync the stream is on time again and keeps its spacing.
    h.rx.onBatch(3, 200, [on(64)]);
    expect(h.scheduled[h.scheduled.length - 1].when).toBeCloseTo(h.now + 0.15, 6);
    expect(h.rx.resyncCount).toBe(1);
  });

  it('silences on a sequence gap and after going quiet', () => {
    const h = harness();
    h.rx.onBatch(1, 0, [on(60)]);
    h.rx.onBatch(3, 200, [on(62)]);
    expect(h.offs).toBe(1);

    h.advance(3500);
    h.rx.tick();
    expect(h.offs).toBe(2);
    h.rx.tick();
    expect(h.offs).toBe(2);
  });

  it('wraps the sequence number at 65536', () => {
    const h = harness();
    h.rx.onBatch(65535, 0, [on(60)]);
    h.rx.onBatch(0, 100, [on(62)]);
    expect(h.offs).toBe(0);
  });

  it('scales the delay with the ping and clamps it', () => {
    expect(receiverDelay(null)).toBeCloseTo(0.2 + Math.sqrt(0.15), 6);
    expect(receiverDelay(0)).toBe(0.3);
    expect(receiverDelay(10000)).toBe(1);
  });
});
