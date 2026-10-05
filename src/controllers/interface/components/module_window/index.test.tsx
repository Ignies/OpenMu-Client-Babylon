import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MuWindows } from '../../windowManager';
import { KeyBindings } from '../../keyBindings';
import { ModuleWindowFrame, togglesWindow } from '.';

describe('ModuleWindowFrame', () => {
  it('draws nothing while closed, and its title over what the module draws while open', () => {
    const frame = (
      <ModuleWindowFrame id="frame_test:main" title="Example">
        <b>inside</b>
      </ModuleWindowFrame>
    );
    expect(renderToStaticMarkup(frame)).toBe('');
    MuWindows.setOpen('frame_test:main', true);
    const html = renderToStaticMarkup(frame);
    MuWindows.setOpen('frame_test:main', false);
    expect(html).toContain('Example');
    expect(html).toContain('<b>inside</b>');
  });
});

describe('togglesWindow', () => {
  it('answers the window\'s own hot key, never one a built-in action is bound to', () => {
    expect(togglesWindow('F7', 'F7')).toBe(true);
    expect(togglesWindow('F7', 'F8')).toBe(false);
    expect(togglesWindow(undefined, 'F7')).toBe(false);
    expect(togglesWindow(KeyBindings.inventory, KeyBindings.inventory)).toBe(false);
  });
});
