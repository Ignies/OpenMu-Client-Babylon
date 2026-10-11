import { afterEach, describe, expect, it, vi } from 'vitest';
import { observable, runInAction } from 'mobx';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { expireRequest, REQUEST_TIMEOUT_MS } from './requestTimeout';

/** A prompt's request field and the "no" answers it got. */
function prompt() {
  const box = observable({ request: null as { from: string } | null });
  const declined: string[] = [];
  expireRequest(
    () => box.request,
    () => {
      declined.push(box.request?.from ?? '');
      runInAction(() => (box.request = null));
    }
  );
  const ask = (from: string) => runInAction(() => (box.request = { from }));
  return { box, declined, ask };
}

describe('expireRequest (the requestTimeout improvement)', () => {
  afterEach(() => {
    vi.useRealTimers();
    setFidelityChoice(FIDELITY_DEFAULT, {});
  });

  it('answers a request left alone "no" after 20 s', () => {
    vi.useFakeTimers();
    const { declined, ask } = prompt();
    ask('Rival');
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS - 1);
    expect(declined).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(declined).toEqual(['Rival']);
  });

  it('leaves an answered request alone, and gives a new one its own 20 s', () => {
    vi.useFakeTimers();
    const { box, declined, ask } = prompt();
    ask('First');
    runInAction(() => (box.request = null));
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);
    expect(declined).toEqual([]);

    ask('Second');
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS / 2);
    ask('Third');
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS / 2);
    expect(declined).toEqual([]);
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS / 2);
    expect(declined).toEqual(['Third']);
  });

  it('keeps the prompt up until clicked on Classic, as the original', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    vi.useFakeTimers();
    const { declined, ask } = prompt();
    ask('Rival');
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS * 10);
    expect(declined).toEqual([]);
  });
});
