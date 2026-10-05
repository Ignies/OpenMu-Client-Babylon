import { describe, expect, it } from 'vitest';
import { autorun } from 'mobx';
import { observer } from 'mobx-react-lite';
import { registerWindows, unregisterWindow, windowsIn } from './windows';

const Nothing = observer(() => null);

describe('the window registry', () => {
  it('drops a window, and a reader of the slot sees it come and go', () => {
    const seen: string[][] = [];
    const stop = autorun(() => seen.push(windowsIn('hud').map(w => w.id).filter(id => id.startsWith('reg_'))));
    registerWindows([{ id: 'reg_a', slot: 'hud', order: 1, component: Nothing }]);
    unregisterWindow('reg_a');
    stop();
    expect(seen).toEqual([[], ['reg_a'], []]);
  });

  it('keeps the component it was given', () => {
    registerWindows([{ id: 'reg_b', slot: 'world', order: 1, component: Nothing }]);
    expect(windowsIn('world').find(w => w.id === 'reg_b')?.component).toBe(Nothing);
    unregisterWindow('reg_b');
  });
});
