import { afterEach, describe, expect, it, vi } from 'vitest';
import { createModuleHost } from './host';
import { SANDBOX_LIMITS, serveModule } from './dispatcher';
import { GUEST_TIMEOUT_MS, connectModule } from './guest';
import { PROTOCOL_VERSION, toBase64, type PortLike } from './protocol';
import { testGame } from './testGame';

/** A port the test drives by hand: what the module sends arrives at once, answers are collected. */
function handPort() {
  const answers: { id: number | null; result?: unknown; error?: string }[] = [];
  const port: PortLike = { onmessage: null, postMessage: m => void answers.push(m as (typeof answers)[number]) };
  let id = 0;
  const call = (name: string, args: unknown[]) => {
    port.onmessage?.({ data: { v: PROTOCOL_VERSION, id: id++, call: name, args } } as MessageEvent);
    return answers[answers.length - 1];
  };
  return { port, answers, call };
}

/** A sandboxed module served with the sandbox's limits and a clock the test moves. */
function sandboxed() {
  const t = testGame();
  const host = createModuleHost(t.game);
  const clock = { now: 0 };
  const hand = handPort();
  serveModule(hand.port, host.api('boxed'), { ...SANDBOX_LIMITS, now: () => clock.now });
  return { ...t, ...hand, clock };
}

describe('the sandbox limits', () => {
  it('are numbers a normal module never reaches', () => {
    expect(SANDBOX_LIMITS).toEqual({
      windows: 1,
      textEntries: 4000,
      textLine: 1000,
      calls: { perSecond: 100, burst: 200 },
      packets: { perSecond: 30, burst: 60 },
    });
    expect(GUEST_TIMEOUT_MS).toBe(10_000);
  });

  it('allow one window: its frame is the only surface it has; the same window again replaces it', () => {
    const { call } = sandboxed();
    call('registerText', ['en', { 'boxed.a': 'A', 'boxed.b': 'B' }]);
    expect(call('registerWindow', [{ id: 'main', title: 'boxed.a' }])).not.toHaveProperty('error');
    expect(call('registerWindow', [{ id: 'main', title: 'boxed.b' }])).not.toHaveProperty('error');
    expect(call('registerWindow', [{ id: 'other', title: 'boxed.a' }])).toMatchObject({ error: 'window limit: 1' });
  });

  it('cap the text it registers, by entries (language and key) and by line', () => {
    const { call, calls } = sandboxed();
    const many = (n: number, from = 0) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`boxed.k${from + i}`, 'x']));
    expect(call('registerText', ['en', many(3000)])).not.toHaveProperty('error');
    // The same keys again are not new entries.
    expect(call('registerText', ['en', many(3000)])).not.toHaveProperty('error');
    expect(call('registerText', ['de', many(1001)])).toMatchObject({ error: 'text limit: 4000 entries' });
    expect(call('registerText', ['de', many(1000)])).not.toHaveProperty('error');
    expect(call('registerText', ['en', { 'boxed.long': 'x'.repeat(1001) }])).toMatchObject({ error: 'text limit: 1000 characters a line' });
    expect(calls.filter(c => c[0] === 'registerText')).toHaveLength(3);
  });

  it('refuse calls over 100 a second (200 at once), before reading them', () => {
    const { call, answers, clock } = sandboxed();
    for (let i = 0; i < 200; i++) call('hero', []);
    expect(answers.filter(a => a.error)).toEqual([]);
    expect(call('hero', [])).toEqual({ id: 200, error: 'rate limit' });
    clock.now += 50; // 5 calls' worth
    for (let i = 0; i < 5; i++) expect(call('hero', [])).not.toHaveProperty('error');
    expect(call('hero', [])).toMatchObject({ error: 'rate limit' });
    clock.now += 10_000;
    expect(call('hero', [])).not.toHaveProperty('error');
  });

  it('refuse packets over 30 a second (60 at once)', () => {
    const { call, calls, clock } = sandboxed();
    const payload = toBase64(Uint8Array.of(1));
    for (let i = 0; i < 60; i++) expect(call('sendPacket', [payload])).not.toHaveProperty('error');
    expect(call('sendPacket', [payload])).toMatchObject({ error: 'packet rate limit' });
    expect(call('hero', [])).not.toHaveProperty('error');
    clock.now += 100; // 3 packets' worth
    for (let i = 0; i < 3; i++) expect(call('sendPacket', [payload])).not.toHaveProperty('error');
    expect(calls.filter(c => c[0] === 'sendPacket')).toHaveLength(63);
  });

  it('keep one map and one packet subscription however often it subscribes', () => {
    const { call, mapListeners } = sandboxed();
    for (let i = 0; i < 50; i++) call('onMapChange', []);
    expect(mapListeners()).toBe(1);
  });

  it('do not apply in process, nor over messages unless asked', () => {
    const t = testGame();
    const hand = handPort();
    serveModule(hand.port, createModuleHost(t.game).api('free'));
    for (let i = 0; i < 300; i++) hand.call('hero', []);
    expect(hand.answers.filter(a => a.error)).toEqual([]);
  });
});

describe('the guest\'s pending calls', () => {
  afterEach(() => void vi.useRealTimers());

  it('fail after 10 s without an answer, and a late answer is ignored', async () => {
    vi.useFakeTimers();
    const sent: { id: number }[] = [];
    const port: PortLike = { onmessage: null, postMessage: m => void sent.push(m as { id: number }) };
    const api = connectModule(port);
    const pending = api.hero();
    const caught = pending.catch((e: Error) => e.message);
    vi.advanceTimersByTime(GUEST_TIMEOUT_MS - 1);
    port.onmessage?.({ data: { id: 99, result: 1 } } as MessageEvent);
    vi.advanceTimersByTime(1);
    expect(await caught).toBe('hero: no answer in 10 s');
    port.onmessage?.({ data: { id: sent[0].id, result: 'late' } } as MessageEvent);
  });

  it('answer as usual when the answer comes in time', async () => {
    vi.useFakeTimers();
    const port: PortLike = { onmessage: null, postMessage: m => queueMicrotask(() => port.onmessage?.({ data: { id: (m as { id: number }).id, result: 'ok' } } as MessageEvent)) };
    expect(await connectModule(port).hero()).toBe('ok');
    expect(vi.getTimerCount()).toBe(0);
  });
});
