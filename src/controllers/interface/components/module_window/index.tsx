import type { CSSProperties, ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { MuWindows } from '../../windowManager';
import { actionOfKey } from '../../keyBindings';
import { useEventBus } from '../../hooks';
import { MuItemWindow } from '../mu_window';
import { MuText } from '../mu_text';

const TITLE_STYLE: CSSProperties = { position: 'absolute', left: 0, right: 0, top: 12 };

/** Whether `key` opens or closes a window with this hot key: a key a built-in action is bound to stays the action's. */
export const togglesWindow = (hotKey: string | undefined, key: string): boolean =>
  !!hotKey && key === hotKey && !actionOfKey(key);

type ModuleWindowFrameProps = { id: string; title: string; hotKey?: string; children?: ReactNode };

/** A window a module adds (`src/modules/_api`): the item window frame, its title, then what the module draws. */
export const ModuleWindowFrame = observer(({ id, title, hotKey, children }: ModuleWindowFrameProps) => {
  useEventBus('keyPressed', key => {
    if (togglesWindow(hotKey, key)) MuWindows.setOpen(id, !MuWindows.isOpen(id));
  });

  if (!MuWindows.isOpen(id)) return null;

  return (
    <MuItemWindow id={id} label={title} onClose={() => MuWindows.setOpen(id, false)}>
      <MuText face="bold" align="center" style={TITLE_STYLE} text={title} />
      {children}
    </MuItemWindow>
  );
});
