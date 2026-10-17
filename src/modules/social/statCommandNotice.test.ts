import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const notify = vi.hoisted(() => vi.fn());
vi.mock('../chat/notify', () => ({ addNotification: notify, setNotificationSink: () => {} }));
const { watchStatCommand } = await import('./statCommandNotice');
const { Hero } = await import('../hero');

function spend(points: number): void {
  runInAction(() => {
    Hero.points -= points;
  });
}

describe('the stat command notice (statCommandNotice)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    notify.mockClear();
    runInAction(() => {
      Hero.points = 100;
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    setFidelityChoice(FIDELITY_DEFAULT, {});
  });

  it('says how many points went where once they settle', () => {
    watchStatCommand('/addstr 30');
    for (let i = 0; i < 30; i++) spend(1);
    vi.advanceTimersByTime(400);
    expect(notify).toHaveBeenCalledOnce();
    expect(notify.mock.calls[0][0]).toBe('30 points added to Strength.');
  });

  it('reads /add ene with a space and ignores other lines', () => {
    watchStatCommand('/hello 5');
    spend(5);
    vi.advanceTimersByTime(400);
    expect(notify).not.toHaveBeenCalled();
    watchStatCommand('/add ene 5');
    spend(5);
    vi.advanceTimersByTime(400);
    expect(notify.mock.calls[0][0]).toBe('5 points added to Energy.');
  });

  it('says nothing on Classic', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    watchStatCommand('/addstr 30');
    spend(30);
    vi.advanceTimersByTime(400);
    expect(notify).not.toHaveBeenCalled();
  });
});
