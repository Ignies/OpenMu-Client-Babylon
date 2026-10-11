import { describe, expect, it } from 'vitest';
import { observer } from 'mobx-react-lite';
import { registerWindows } from '@/controllers/interface/windows';
import { defineModule, installModules, setServerModulesOff } from '@/modules/module';
import { shownWindows } from './shown';

const Nothing = observer(() => null);

describe('shownWindows', () => {
  it('leaves out the windows of a module the server turned off', () => {
    installModules([defineModule({ id: 'shown_vault', install: () => {} })]);
    registerWindows([
      { id: 'shown_bag', slot: 'hud', order: 1, component: Nothing },
      { id: 'shown_vault_window', slot: 'hud', order: 2, component: Nothing, module: 'shown_vault' },
    ]);
    const ids = () => shownWindows('hud').map(w => w.id).filter(id => id.startsWith('shown_'));

    expect(ids()).toEqual(['shown_bag', 'shown_vault_window']);
    setServerModulesOff(['shown_vault']);
    expect(ids()).toEqual(['shown_bag']);
    setServerModulesOff([]);
  });
});
