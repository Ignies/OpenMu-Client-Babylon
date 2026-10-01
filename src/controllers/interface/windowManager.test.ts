import { describe, expect, it } from 'vitest';
import { autorun } from 'mobx';
import { MuWindows } from './windowManager';

describe('MuWindows open state', () => {
  it('starts closed and reacts to the first open of an unseen id', () => {
    const seen: boolean[] = [];
    const stop = autorun(() => seen.push(MuWindows.isOpen('test_window')));

    MuWindows.setOpen('test_window', true);
    MuWindows.setOpen('test_window', false);
    stop();

    expect(seen).toEqual([false, true, false]);
  });
});
